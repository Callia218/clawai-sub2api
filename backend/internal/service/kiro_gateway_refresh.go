package service

import (
	"context"
	"fmt"
	"time"
)

// Manual OAuth imports may contain only a refresh token. Obtain an access token
// before constructing the first model request, using the same lock/persistence
// path as background refresh. In particular, never probe with an empty Bearer.
func (s *KiroGatewayService) ensureKiroAccessToken(ctx context.Context, account *Account) error {
	if account.IsKiroAPIKeyAccount() || account.KiroAccessToken() != "" {
		return nil
	}
	if account.KiroRefreshToken() == "" {
		return fmt.Errorf("kiro: authorization incomplete: an access token or matching refresh token is required; complete authorization or import valid credentials")
	}
	if account.KiroAuthMethod().UsesOIDCRefresh() {
		clientID, clientSecret := account.KiroClientCredentials()
		if clientID == "" || clientSecret == "" {
			return fmt.Errorf("kiro: authorization incomplete: Builder ID/IdC refresh requires the matching Client ID and Client Secret; complete the authorization wizard")
		}
	}
	if err := s.refreshAccountToken(ctx, account); err != nil {
		// Refresh errors can contain upstream/transport details. This message is
		// shown in the account tester, so keep it independent of those details.
		return fmt.Errorf("kiro: authorization failed: could not obtain an access token; complete the authorization wizard or verify the imported refresh token, client credentials and region")
	}
	if account.KiroAccessToken() == "" {
		return fmt.Errorf("kiro: authorization failed: token refresh returned no access token; complete authorization again")
	}
	return nil
}

// A 401 is stronger evidence than expires_at. Compare the rejected token under
// the shared refresh lock so another worker's replacement is reused.
type kiroRejectedTokenRefresher struct {
	*KiroTokenRefresher
	rejectedToken string
}

func (r *kiroRejectedTokenRefresher) NeedsRefresh(account *Account, window time.Duration) bool {
	if account != nil && account.KiroAccessToken() == r.rejectedToken {
		return r.CanRefresh(account)
	}
	return r.KiroTokenRefresher.NeedsRefresh(account, window)
}

func (s *KiroGatewayService) refreshAccountToken(ctx context.Context, account *Account) error {
	if s == nil {
		return fmt.Errorf("kiro: oauth refresh api is not configured")
	}
	return s.refreshWithExecutor(ctx, account, NewKiroTokenRefresher(s.kiroOAuthService))
}

func (s *KiroGatewayService) refreshRejectedAccountToken(ctx context.Context, account *Account) error {
	if s == nil || account == nil {
		return fmt.Errorf("kiro: account and oauth refresh service are required")
	}
	return s.refreshWithExecutor(ctx, account, &kiroRejectedTokenRefresher{
		KiroTokenRefresher: NewKiroTokenRefresher(s.kiroOAuthService),
		rejectedToken:      account.KiroAccessToken(),
	})
}

func (s *KiroGatewayService) refreshWithExecutor(ctx context.Context, account *Account, executor OAuthRefreshExecutor) error {
	if s.oauthRefreshAPI == nil {
		return fmt.Errorf("kiro: oauth refresh api is not configured")
	}
	ctx, cancel := context.WithTimeout(ctx, kiroOAuthHTTPTimeout+5*time.Second)
	defer cancel()
	for {
		result, err := s.oauthRefreshAPI.RefreshIfNeeded(withOAuthRefreshRequestPath(ctx), account, executor, 0)
		if err != nil {
			return fmt.Errorf("kiro: refresh token: %w", err)
		}
		if result != nil && result.LockHeld {
			// Another process owns the refresh. Re-enter the locked read after a
			// short wait instead of retrying the same rejected token upstream.
			timer := time.NewTimer(250 * time.Millisecond)
			select {
			case <-ctx.Done():
				timer.Stop()
				return fmt.Errorf("kiro: waiting for token refresh: %w", ctx.Err())
			case <-timer.C:
				continue
			}
		}
		if result == nil || result.Account == nil {
			return fmt.Errorf("kiro: refresh did not return an account")
		}
		*account = *result.Account
		return nil
	}
}
