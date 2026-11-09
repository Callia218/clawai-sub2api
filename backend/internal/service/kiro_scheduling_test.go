package service

import (
	"context"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestKiroSchedulingResolvesCanonicalModelBeforeWhitelist(t *testing.T) {
	svc := &GatewayService{}
	account := &Account{Platform: PlatformKiro, Credentials: map[string]any{
		"model_mapping": map[string]any{"claude-sonnet-4.6": "claude-opus-4.6"},
	}}
	require.True(t, svc.isModelSupportedByAccountWithContext(context.Background(), account, "claude-sonnet-4-6"))
	require.True(t, svc.isModelSupportedByAccountWithContext(context.Background(), account, "claude-sonnet-4.6"))
	require.False(t, svc.isModelSupportedByAccountWithContext(context.Background(), account, "claude-haiku-4.5"))
	account.Credentials = map[string]any{"model_mapping": map[string]any{"claude-sonnet-4.6": "unsupported-model"}}
	require.False(t, svc.isModelSupportedByAccountWithContext(context.Background(), account, "claude-sonnet-4-6"))
}

func TestKiroStickyAccountCannotJoinGeminiMixedScheduling(t *testing.T) {
	svc := &GatewayService{}
	account := &Account{Platform: PlatformKiro, Extra: map[string]any{"mixed_scheduling": true}}
	require.True(t, svc.isAccountAllowedForPlatform(account, PlatformAnthropic, true))
	require.False(t, svc.isAccountAllowedForPlatform(account, PlatformGemini, true))
	require.False(t, svc.isAccountAllowedForPlatform(account, PlatformOpenAI, true))
}
