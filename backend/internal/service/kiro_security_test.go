package service

import (
	"bytes"
	"context"
	"log/slog"
	"net/http"
	"strings"
	"testing"

	"github.com/Wei-Shaw/sub2api/internal/pkg/kiro"
	"github.com/stretchr/testify/require"
)

func TestKiroInvalidRegionFailsBeforeCredentialRequest(t *testing.T) {
	svc := NewKiroOAuthService(nil)
	t.Cleanup(svc.Stop)
	resolve := func(string) string {
		t.Fatal("invalid region reached an outbound credential endpoint")
		return ""
	}
	svc.WithBaseURLs(resolve, resolve)
	region := "us-east-1@attacker.invalid/"
	ctx := context.Background()
	_, err := svc.GenerateAuthURL(ctx, &KiroAuthURLInput{IssuerURL: "https://example.awsapps.com/start", Region: region})
	require.ErrorContains(t, err, "region")
	_, err = svc.StartDeviceAuth(ctx, nil, region)
	require.ErrorContains(t, err, "region")
	for _, method := range []string{"social", "idc", "builder_id"} {
		account := &Account{Platform: PlatformKiro, Credentials: map[string]any{
			"auth_method": method, "region": region, "refresh_token": "private-refresh-token", "client_secret": "private-client-secret",
		}}
		_, err = svc.RefreshAccountToken(ctx, account)
		require.ErrorContains(t, err, "region")
	}

	account := &Account{Platform: PlatformKiro, Credentials: map[string]any{"region": region, "access_token": "private-access-token"}}
	quota := &KiroQuotaFetcher{qHostFor: func(*Account) string { t.Fatal("invalid quota destination"); return "" }}
	_, err = quota.FetchQuota(ctx, account, "")
	require.ErrorContains(t, err, "region")
	gateway := &KiroGatewayService{listModelsURLOverride: resolve}
	_, err = gateway.listAvailableModels(ctx, account)
	require.ErrorContains(t, err, "region")
	_, err = gateway.ForwardUpstream(ctx, nil, account, []byte(`{"model":"claude-sonnet-4.6"}`))
	require.ErrorContains(t, err, "region")
}

func TestKiroUpstreamLogOmitsUntrustedResponseBody(t *testing.T) {
	var output bytes.Buffer
	previous := slog.Default()
	slog.SetDefault(slog.New(slog.NewJSONHandler(&output, nil)))
	t.Cleanup(func() { slog.SetDefault(previous) })
	svc := &KiroGatewayService{}
	svc.logUpstreamError(&Account{ID: 3}, "claude-sonnet-4.6", kiro.SignalBadRequest, http.StatusBadRequest, 2,
		[]byte(`{"client_secret":"private-client-secret","refresh_token":"private-refresh-token","message":"private-prompt"}`))
	for _, secret := range []string{"private-client-secret", "private-refresh-token", "private-prompt", "response_body"} {
		require.NotContains(t, output.String(), secret)
	}
	require.Contains(t, output.String(), "response_bytes")
	require.Contains(t, output.String(), "kiro_upstream_error")
}

func TestKiroCredentialRegionValidation(t *testing.T) {
	require.NoError(t, validateKiroRegionCredentials(nil))
	require.NoError(t, validateKiroRegionCredentials(map[string]any{"region": "us-east-1"}))
	for _, value := range []any{7, nil, "us-east-1@attacker.invalid/", strings.Repeat("a", 64)} {
		require.Error(t, validateKiroRegionCredentials(map[string]any{"region": value}))
	}
}
