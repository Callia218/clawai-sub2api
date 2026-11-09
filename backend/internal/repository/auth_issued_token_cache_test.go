package repository

import (
	"context"
	"fmt"
	"sync"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/require"
)

func TestIssuedAccessConcurrentRevokeNeverOrphansLiveTokens(t *testing.T) {
	mr := miniredis.RunT(t)
	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	t.Cleanup(func() { _ = rdb.Close() })
	cache := &refreshTokenCache{rdb: rdb}
	ctx := context.Background()
	var wg sync.WaitGroup
	errs := make(chan error, 80)
	for i := 0; i < 40; i++ {
		wg.Add(2)
		go func(i int) {
			defer wg.Done()
			errs <- cache.StoreIssuedAccessToken(ctx, fmt.Sprint(i), "family", 7, time.Hour)
		}(i)
		go func() { defer wg.Done(); errs <- cache.deleteIssuedAccessTokens(ctx, issuedFamilyKey("family")) }()
	}
	wg.Wait()
	close(errs)
	for err := range errs {
		require.NoError(t, err)
	}
	for i := 0; i < 40; i++ {
		hash := fmt.Sprint(i)
		live, err := cache.IsIssuedAccessToken(ctx, hash)
		require.NoError(t, err)
		if live {
			require.True(t, rdb.SIsMember(ctx, issuedFamilyKey("family"), hash).Val())
		}
	}
	require.NoError(t, cache.deleteIssuedAccessTokens(ctx, issuedFamilyKey("family")))
	for i := 0; i < 40; i++ {
		live, err := cache.IsIssuedAccessToken(ctx, fmt.Sprint(i))
		require.NoError(t, err)
		require.False(t, live)
	}
}
