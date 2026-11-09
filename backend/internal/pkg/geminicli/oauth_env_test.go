package geminicli

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestOperatorOAuthClientRequiresBothValues(t *testing.T) {
	old := GeminiCLIOAuthClientID
	t.Cleanup(func() { GeminiCLIOAuthClientID = old })
	GeminiCLIOAuthClientID = ""
	t.Setenv(GeminiCLIOAuthClientSecretEnv, "test-only-secret")
	_, err := EffectiveOAuthConfig(OAuthConfig{}, "code_assist")
	require.Error(t, err)
	custom, err := EffectiveOAuthConfig(OAuthConfig{ClientID: "custom-client", ClientSecret: "custom-secret"}, "code_assist")
	require.NoError(t, err)
	require.Equal(t, "custom-client", custom.ClientID)
	GeminiCLIOAuthClientID = "operator-client"
	got, err := EffectiveOAuthConfig(OAuthConfig{}, "code_assist")
	require.NoError(t, err)
	require.Equal(t, "operator-client", got.ClientID)
	require.Equal(t, "test-only-secret", got.ClientSecret)
}
