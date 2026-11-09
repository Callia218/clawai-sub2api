package service

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestResolveBillingServiceTier(t *testing.T) {
	tests := []struct {
		name       string
		requested  string
		observed   string
		billing    string
		downgraded bool
	}{
		{name: "openai priority served as default", requested: "priority", observed: "default", billing: "default", downgraded: true},
		{name: "anthropic fast served as standard", requested: "fast", observed: "standard", billing: "standard", downgraded: true},
		{name: "ultrafast served as priority", requested: "ultrafast", observed: "priority", billing: "priority", downgraded: true},
		{name: "ultrafast served as default", requested: "ultrafast", observed: "default", billing: "default", downgraded: true},
		{name: "ultrafast honoured", requested: "ultrafast", observed: "ultrafast", billing: "ultrafast"},
		{name: "ultrafast missing declaration", requested: "ultrafast", billing: "ultrafast"},
		{name: "response cannot upgrade to ultrafast", requested: "priority", observed: "ultrafast", billing: "priority"},
		{name: "priority honoured", requested: "priority", observed: "priority", billing: "priority"},
		{name: "no declaration keeps request", requested: "priority", observed: "", billing: "priority"},
		{name: "no request no declaration", requested: "", observed: "", billing: ""},
		{name: "response never raises the tier", requested: "", observed: "priority", billing: ""},
		{name: "flex never raised to default", requested: "flex", observed: "default", billing: "flex"},
		{name: "default echoed for untiered request", requested: "", observed: "default", billing: ""},
		{name: "unknown response tier ignored", requested: "priority", observed: "turbo", billing: "priority"},
		{name: "case and whitespace normalised", requested: " Priority ", observed: "DEFAULT", billing: "default", downgraded: true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := ResolveBillingServiceTier(tt.requested, tt.observed)
			require.Equal(t, tt.billing, got.Billing)
			require.Equal(t, tt.downgraded, got.Downgraded)
		})
	}
}

func TestApplyServiceTierBillingResolutionOnlyRewritesDowngrades(t *testing.T) {
	t.Run("openai downgrade rewrites tier", func(t *testing.T) {
		requested := "priority"
		result := &OpenAIForwardResult{ServiceTier: &requested, UpstreamResponseServiceTier: "default"}
		resolution := ApplyOpenAIServiceTierBillingResolution(&Account{Platform: PlatformOpenAI, Type: AccountTypeAPIKey}, result)
		require.True(t, resolution.Downgraded)
		require.NotNil(t, result.ServiceTier)
		require.Equal(t, "default", *result.ServiceTier)
	})

	t.Run("openai honoured tier keeps pointer", func(t *testing.T) {
		requested := "priority"
		result := &OpenAIForwardResult{ServiceTier: &requested, UpstreamResponseServiceTier: "priority"}
		require.False(t, ApplyOpenAIServiceTierBillingResolution(&Account{Platform: PlatformOpenAI, Type: AccountTypeAPIKey}, result).Downgraded)
		require.Same(t, &requested, result.ServiceTier)
	})

	t.Run("openai untiered request stays nil", func(t *testing.T) {
		result := &OpenAIForwardResult{UpstreamResponseServiceTier: "priority"}
		require.False(t, ApplyOpenAIServiceTierBillingResolution(&Account{Platform: PlatformOpenAI, Type: AccountTypeAPIKey}, result).Downgraded)
		require.Nil(t, result.ServiceTier)
	})

	for _, accountType := range []string{AccountTypeOAuth, AccountTypeSetupToken} {
		for _, tc := range []struct {
			name       string
			requested  string
			observed   string
			billing    string
			downgraded bool
		}{
			{name: "default lowers priority", requested: "priority", observed: "default", billing: "default", downgraded: true},
			{name: "priority is honoured", requested: "priority", observed: "priority", billing: "priority"},
			{name: "missing response tier", requested: "priority", billing: "priority"},
			{name: "unknown response tier", requested: "priority", observed: "turbo", billing: "priority"},
			{name: "default lowers ultrafast", requested: "ultrafast", observed: "default", billing: "default", downgraded: true},
			{name: "priority lowers ultrafast", requested: "ultrafast", observed: "priority", billing: "priority", downgraded: true},
		} {
			t.Run("codex "+accountType+" "+tc.name, func(t *testing.T) {
				requested := tc.requested
				result := &OpenAIForwardResult{ServiceTier: &requested, UpstreamResponseServiceTier: tc.observed}
				resolution := ApplyOpenAIServiceTierBillingResolution(
					&Account{Platform: PlatformOpenAI, Type: accountType},
					result,
				)
				require.Equal(t, tc.downgraded, resolution.Downgraded)
				require.Equal(t, tc.requested, resolution.Requested)
				require.Equal(t, tc.observed, resolution.Observed)
				require.Equal(t, tc.billing, resolution.Billing)
				require.Equal(t, tc.billing, *result.ServiceTier)
				require.Equal(t, tc.observed, result.UpstreamResponseServiceTier)
				require.Equal(t, tc.requested, requested, "billing must not mutate the outbound tier value")
				if !tc.downgraded {
					require.Same(t, &requested, result.ServiceTier)
				}
			})
		}

		t.Run("codex "+accountType+" still accepts an explicit flex downgrade", func(t *testing.T) {
			requested := "priority"
			result := &OpenAIForwardResult{ServiceTier: &requested, UpstreamResponseServiceTier: "flex"}
			resolution := ApplyOpenAIServiceTierBillingResolution(
				&Account{Platform: PlatformOpenAI, Type: accountType},
				result,
			)
			require.True(t, resolution.Downgraded)
			require.Equal(t, "flex", resolution.Billing)
			require.Equal(t, "flex", *result.ServiceTier)
		})

		t.Run("codex "+accountType+" response never promotes an untiered request", func(t *testing.T) {
			result := &OpenAIForwardResult{UpstreamResponseServiceTier: "priority"}
			resolution := ApplyOpenAIServiceTierBillingResolution(
				&Account{Platform: PlatformOpenAI, Type: accountType},
				result,
			)
			require.False(t, resolution.Downgraded)
			require.Empty(t, resolution.Billing)
			require.Nil(t, result.ServiceTier)
		})
	}

	t.Run("non-openai oauth still uses the generic response contract", func(t *testing.T) {
		requested := "priority"
		result := &OpenAIForwardResult{ServiceTier: &requested, UpstreamResponseServiceTier: "default"}
		resolution := ApplyOpenAIServiceTierBillingResolution(
			&Account{Platform: PlatformGrok, Type: AccountTypeOAuth},
			result,
		)
		require.True(t, resolution.Downgraded)
		require.Equal(t, "default", resolution.Billing)
		require.Equal(t, "default", *result.ServiceTier)
	})

	t.Run("anthropic standard speed rewrites fast", func(t *testing.T) {
		requested := "fast"
		result := &ForwardResult{ServiceTier: &requested, UpstreamResponseServiceTier: "standard"}
		require.True(t, ApplyForwardServiceTierBillingResolution(result).Downgraded)
		require.Equal(t, "standard", *result.ServiceTier)
	})

	t.Run("nil results are ignored", func(t *testing.T) {
		require.False(t, ApplyOpenAIServiceTierBillingResolution(nil, nil).Downgraded)
		require.False(t, ApplyForwardServiceTierBillingResolution(nil).Downgraded)
	})
}
