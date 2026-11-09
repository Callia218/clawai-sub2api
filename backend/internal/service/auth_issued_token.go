package service

import (
	"context"
	"time"
)

// IssuedAccessTokenCache proves that an exact token was issued by this service.
// Knowing the signing key alone cannot register a forged access token.
type IssuedAccessTokenCache interface {
	StoreIssuedAccessToken(context.Context, string, string, int64, time.Duration) error
	IsIssuedAccessToken(context.Context, string) (bool, error)
}

func (s *AuthService) registerIssuedToken(token, sessionID string, userID int64, expiresAt time.Time) error {
	if !s.cfg.JWT.RequireIssuedToken {
		return nil
	}
	cache, ok := s.refreshTokenCache.(IssuedAccessTokenCache)
	if !ok || cache == nil || sessionID == "" {
		return ErrServiceUnavailable
	}
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	// Keep the record through the legacy access-token refresh window.
	ttl := time.Until(expiresAt) + time.Duration(s.cfg.JWT.RefreshWindowMinutes)*time.Minute
	if ttl <= 0 {
		return ErrInvalidToken
	}
	return cache.StoreIssuedAccessToken(ctx, hashToken(token), sessionID, userID, ttl)
}

func (s *AuthService) verifyIssuedToken(token string, claims *JWTClaims) error {
	if !s.cfg.JWT.RequireIssuedToken {
		return nil
	}
	if claims == nil || claims.UserID <= 0 || claims.SessionID == "" || claims.ExpiresAt == nil {
		return ErrInvalidToken
	}
	cache, ok := s.refreshTokenCache.(IssuedAccessTokenCache)
	if !ok || cache == nil {
		return ErrServiceUnavailable
	}
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	issued, err := cache.IsIssuedAccessToken(ctx, hashToken(token))
	if err != nil {
		return ErrServiceUnavailable
	}
	if !issued {
		return ErrInvalidToken
	}
	return nil
}
