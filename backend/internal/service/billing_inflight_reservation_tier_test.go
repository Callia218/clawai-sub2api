//go:build unit

package service

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/Wei-Shaw/sub2api/internal/pkg/timezone"
	"github.com/stretchr/testify/require"
)

func TestInflightEstimate_ForcedServiceTierAndChannelOverrides(t *testing.T) {
	groupID := int64(31)
	in, out, fast, ultra := 1e-6, 2e-6, 4.0, 9.0
	channel := Channel{
		ID: 1, Status: StatusActive, GroupIDs: []int64{groupID},
		ModelPricing: []ChannelModelPricing{{
			Platform: PlatformOpenAI, Models: []string{"gpt-6.2-sol"},
			InputPrice: &in, OutputPrice: &out,
			FastMultiplier: &fast, UltrafastMultiplier: &ultra,
		}},
	}
	cs := newTestChannelService(makeStandardRepo(channel, map[int64]string{groupID: PlatformOpenAI}))
	svc := newInflightEstimateGateway(t, cs)
	for _, tc := range []struct {
		name, clientTier      string
		forceFast, forceUltra bool
		wantMultiplier        float64
	}{
		{"missing forced fast", "", true, false, fast},
		{"flex forced ultrafast", "flex", false, true, ultra},
		{"missing forced ultrafast", "", false, true, ultra},
		{"both group flags", "", true, true, ultra},
		{"explicit expensive tier preserved", "ultrafast", true, false, ultra},
		{"explicit ultrafast channel override", "ultrafast", false, false, ultra},
		{"unforced flex preserved", "flex", false, false, 0.5},
	} {
		t.Run(tc.name, func(t *testing.T) {
			group := &Group{ID: groupID, Platform: PlatformOpenAI, RateMultiplier: 1, ForceOpenAIFast: tc.forceFast, ForceOpenAIUltrafast: tc.forceUltra}
			key := &APIKey{User: &User{ID: 1}, GroupID: &groupID, Group: group}
			req := InflightEstimateRequest{Model: "gpt-6.2-sol", BodyBytes: 1000, MaxTokens: 100, ServiceTier: tc.clientTier}
			before := req
			cost, priced := svc.EstimateInflightReservation(context.Background(), key, req)
			require.True(t, priced)
			require.InDelta(t, (1000*in+100*out)*tc.wantMultiplier, cost, 1e-12)
			require.Equal(t, before, req, "estimation must not rewrite the forwarding request")
		})
	}
}

func TestInflightEstimate_ForcedTierUsesUpstreamMappingWithRequestedBilling(t *testing.T) {
	groupID := int64(32)
	in, out, ultra := 1e-6, 2e-6, 7.0
	channel := Channel{
		ID: 1, Status: StatusActive, GroupIDs: []int64{groupID}, BillingModelSource: BillingModelSourceRequested,
		ModelMapping: map[string]map[string]string{PlatformOpenAI: {"public-alias": "gpt-6.2-sol"}},
		ModelPricing: []ChannelModelPricing{{Platform: PlatformOpenAI, Models: []string{"public-alias"}, InputPrice: &in, OutputPrice: &out, UltrafastMultiplier: &ultra}},
	}
	svc := newInflightEstimateGateway(t, newTestChannelService(makeStandardRepo(channel, map[int64]string{groupID: PlatformOpenAI})))
	key := &APIKey{User: &User{ID: 1}, GroupID: &groupID, Group: &Group{ID: groupID, Platform: PlatformOpenAI, RateMultiplier: 1, ForceOpenAIUltrafast: true}}
	cost, priced := svc.EstimateInflightReservation(context.Background(), key, InflightEstimateRequest{Model: "public-alias", BodyBytes: 1000, MaxTokens: 100})
	require.True(t, priced)
	require.InDelta(t, (1000*in+100*out)*ultra, cost, 1e-12)
}

func TestInflightEstimate_GlobalForcePriorityUsesSettingsAndUserScope(t *testing.T) {
	groupID := int64(33)
	for _, tc := range []struct {
		name, tier, matcher string
		userID              int64
		wantMultiplier      float64
	}{
		{"missing matched", "", OpenAIFastTierMissing, 7, 2},
		{"flex matched", "flex", OpenAIFastTierFlex, 7, 2},
		{"user exception", "flex", OpenAIFastTierFlex, 8, 0.5},
		{"legacy all does not match missing", "", OpenAIFastTierAny, 7, 1},
	} {
		t.Run(tc.name, func(t *testing.T) {
			settings := &OpenAIFastPolicySettings{Rules: []OpenAIFastPolicyRule{
				{ServiceTier: tc.matcher, Action: BetaPolicyActionPass, Scope: BetaPolicyScopeAll, UserIDs: []int64{8}},
				{ServiceTier: tc.matcher, Action: OpenAIFastPolicyActionForcePriority, Scope: BetaPolicyScopeOAuth, ModelWhitelist: []string{"gpt-6.2-*"}},
			}}
			svc := newInflightEstimateGateway(t, nil)
			svc.settingService = newOpenAIGatewayServiceWithSettings(t, settings).settingService
			key := &APIKey{User: &User{ID: tc.userID}, GroupID: &groupID, Group: &Group{ID: groupID, Platform: PlatformOpenAI, RateMultiplier: 1}}
			req := InflightEstimateRequest{Model: "gpt-6.2-sol", BodyBytes: 1000, MaxTokens: 100, ServiceTier: tc.tier}
			pricing, err := svc.billingService.GetModelPricing(req.Model)
			require.NoError(t, err)
			want := (1000*pricing.InputPricePerToken + 100*pricing.OutputPricePerToken) * tc.wantMultiplier
			cost, priced := svc.EstimateInflightReservation(context.Background(), key, req)
			require.True(t, priced)
			require.InDelta(t, want, cost, 1e-12)
			openaiSvc := &OpenAIGatewayService{cfg: svc.cfg, billingService: svc.billingService, resolver: svc.resolver, settingService: svc.settingService}
			cost, priced = openaiSvc.EstimateInflightReservation(context.Background(), key, req)
			require.True(t, priced)
			require.InDelta(t, want, cost, 1e-12, "both gateway entry points must load the policy")
		})
	}
}

func TestInflightEstimate_ServiceTierPolicySnapshotAndLookupFailure(t *testing.T) {
	settings := &OpenAIFastPolicySettings{Rules: []OpenAIFastPolicyRule{{ServiceTier: OpenAIFastTierMissing, Action: OpenAIFastPolicyActionForcePriority, Scope: BetaPolicyScopeAll}}}
	key := &APIKey{User: &User{ID: 1}, Group: &Group{Platform: PlatformOpenAI}}
	req := InflightEstimateRequest{Model: "gpt-6.2-sol"}
	d := inflightEstimateDeps{fastPolicy: func(context.Context) (*OpenAIFastPolicySettings, error) {
		return nil, errors.New("settings unavailable")
	}}
	_, ok := d.inflightServiceTiers(context.Background(), key, req, req.Model)
	require.False(t, ok, "unknown policy cannot silently fall back to a cheaper tier")
	tiers, ok := d.inflightServiceTiers(withOpenAIFastPolicyContext(context.Background(), settings), key, req, req.Model)
	require.True(t, ok)
	require.Contains(t, tiers, OpenAIFastTierPriority)
	key.Group.Platform = PlatformAnthropic
	tiers, ok = d.inflightServiceTiers(context.Background(), key, req, req.Model)
	require.True(t, ok, "OpenAI policy must not affect unrelated provider groups")
	require.Equal(t, []string{""}, tiers)
}

func TestInflightEstimate_GPT62ForcedUltrafastRetainsLongContextPricing(t *testing.T) {
	svc := newInflightEstimateGateway(t, nil)
	groupID := int64(34)
	key := &APIKey{User: &User{ID: 1}, GroupID: &groupID, Group: &Group{ID: groupID, Platform: PlatformOpenAI, RateMultiplier: 1, ForceOpenAIUltrafast: true, LongContextPricingEnabled: true}}
	multiplier := 6.0
	if timezone.Now().Before(time.Date(2027, time.March, 1, 8, 0, 0, 0, time.UTC)) {
		multiplier = 3
	}
	for _, tokens := range []int{272000, 272001} {
		cost, priced := svc.EstimateInflightReservation(context.Background(), key, InflightEstimateRequest{Model: "gpt-6.2-astra", BodyBytes: tokens, MaxTokens: 100})
		require.True(t, priced)
		inputPrice, outputPrice := 8e-6, 40e-6
		if tokens > 272000 {
			inputPrice *= 2
			outputPrice *= 1.5
		}
		require.InDelta(t, (float64(tokens)*inputPrice+100*outputPrice)*multiplier, cost, 1e-10)
	}
}
