//go:build unit

package service

import (
	"context"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestSecurityInflightEstimateIncludesServiceTierAndLongContext(t *testing.T) {
	svc := newInflightEstimateGateway(t, nil)
	key := &APIKey{User: &User{ID: 1}}
	for _, tier := range []string{"", "priority", "fast", "ultrafast"} {
		req := InflightEstimateRequest{Model: "gpt-5", BodyBytes: 300000, MaxTokens: 20000, ServiceTier: tier}
		estimate, priced := svc.EstimateInflightReservation(context.Background(), key, req)
		require.True(t, priced)
		actual, err := svc.billingService.CalculateCostWithServiceTier(req.Model, UsageTokens{InputTokens: req.BodyBytes, OutputTokens: req.MaxTokens}, 1, tier)
		require.NoError(t, err)
		require.GreaterOrEqual(t, estimate+1e-9, actual.ActualCost, "estimate must cover %s billing", tier)
	}
}
