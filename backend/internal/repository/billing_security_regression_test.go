package repository

import (
	"context"
	"errors"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/Wei-Shaw/sub2api/internal/config"
	"github.com/Wei-Shaw/sub2api/internal/service"
	"github.com/stretchr/testify/require"
)

func securityReservationConfig() *config.Config {
	cfg := &config.Config{}
	cfg.Billing.InflightReservation = config.InflightReservationConfig{Enabled: true, TTLSeconds: 60, FailClosedOnUnpriced: true}
	return cfg
}

type securitySubscriptionRepo struct {
	service.UserSubscriptionRepository
	mu    sync.Mutex
	usage float64
}

func (r *securitySubscriptionRepo) GetActiveByUserIDAndGroupID(context.Context, int64, int64) (*service.UserSubscription, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	return &service.UserSubscription{ID: 77, Status: service.SubscriptionStatusActive, DailyUsageUSD: r.usage, WeeklyUsageUSD: r.usage, MonthlyUsageUSD: r.usage, ExpiresAt: time.Now().Add(time.Hour)}, nil
}

func TestSecuritySubscriptionConcurrentBudgetAndSettlement(t *testing.T) {
	_, cache, _ := newInflightTestEnv(t, true, 60)
	for _, window := range []string{"daily", "weekly", "monthly"} {
		t.Run(window, func(t *testing.T) {
			ctx := context.Background()
			limit := 0.1
			group := &service.Group{ID: 44, SubscriptionType: service.SubscriptionTypeSubscription}
			switch window {
			case "daily":
				group.DailyLimitUSD = &limit
			case "weekly":
				group.WeeklyLimitUSD = &limit
			case "monthly":
				group.MonthlyLimitUSD = &limit
			}
			repo := &securitySubscriptionRepo{}
			// Use the real Redis/Lua reservation implementation and authoritative repository reads.
			cfg := securityReservationConfig()
			svc := service.NewBillingCacheService(cache, nil, repo, nil, nil, nil, cfg, nil)
			defer svc.Stop()
			user := &service.User{ID: 91}
			sub := &service.UserSubscription{ID: 77}
			var admitted atomic.Int32
			var wg sync.WaitGroup
			start := make(chan struct{})
			accepted := make(chan *service.InflightReservation, 20)
			for i := 0; i < 20; i++ {
				wg.Add(1)
				go func() {
					defer wg.Done()
					<-start
					r, err := svc.ReserveGatewayCharge(ctx, user, nil, group, sub, 0.078)
					if err == nil {
						admitted.Add(1)
						accepted <- r
						return
					}
					if !errors.Is(err, service.ErrDailyLimitExceeded) && !errors.Is(err, service.ErrWeeklyLimitExceeded) && !errors.Is(err, service.ErrMonthlyLimitExceeded) {
						t.Errorf("unexpected rejection: %v", err)
					}
				}()
			}
			close(start)
			wg.Wait()
			close(accepted)
			require.Equal(t, int32(1), admitted.Load(), "0.1 quota must cover only one 0.078 request")
			for r := range accepted {
				finishBilling := r.Acquire()
				r.HandlerDone()
				_, err := svc.ReserveGatewayCharge(ctx, user, nil, group, sub, 0.078)
				require.Error(t, err, "handler return must not reopen unsettled budget")
				repo.mu.Lock()
				repo.usage = 0.078
				repo.mu.Unlock()
				finishBilling()
			}
			_, err := svc.ReserveGatewayCharge(ctx, user, nil, group, sub, 0.078)
			require.Error(t, err, "committed usage must reject a serial over-budget request")
			t.Logf("%s: 20 concurrent requests, admitted=1 rejected=19; async and serial checks rejected", window)
		})
	}
}

func TestSecurityIssuedAccessTokenExpiryAndRevocation(t *testing.T) {
	mr, billing, _ := newInflightTestEnv(t, true, 60)
	cache := &refreshTokenCache{rdb: billing.rdb}
	ctx := context.Background()
	require.NoError(t, cache.StoreIssuedAccessToken(ctx, "token-a", "family-a", 12, time.Minute))
	require.NoError(t, cache.StoreIssuedAccessToken(ctx, "token-b", "family-b", 12, 2*time.Minute))
	issued, err := cache.IsIssuedAccessToken(ctx, "forged")
	require.NoError(t, err)
	require.False(t, issued)
	require.NoError(t, cache.DeleteTokenFamily(ctx, "family-a"))
	issued, err = cache.IsIssuedAccessToken(ctx, "token-a")
	require.NoError(t, err)
	require.False(t, issued)
	issued, err = cache.IsIssuedAccessToken(ctx, "token-b")
	require.NoError(t, err)
	require.True(t, issued)
	require.NoError(t, cache.DeleteUserRefreshTokens(ctx, 12))
	issued, err = cache.IsIssuedAccessToken(ctx, "token-b")
	require.NoError(t, err)
	require.False(t, issued)
	require.NoError(t, cache.StoreIssuedAccessToken(ctx, "expiring", "family-c", 12, time.Second))
	mr.FastForward(2 * time.Second)
	issued, err = cache.IsIssuedAccessToken(ctx, "expiring")
	require.NoError(t, err)
	require.False(t, issued)
}
