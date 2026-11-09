//go:build unit

package service

import (
	"bytes"
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/Wei-Shaw/sub2api/internal/pkg/kiro"
	"github.com/stretchr/testify/require"
)

type kiroRefreshRegressionRepo struct {
	AccountRepository
	mu      sync.Mutex
	account *Account
}

func (r *kiroRefreshRegressionRepo) GetByID(context.Context, int64) (*Account, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	return snapshotOAuthRefreshAccount(r.account), nil
}

func (r *kiroRefreshRegressionRepo) UpdateCredentials(_ context.Context, _ int64, credentials map[string]any) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.account.Credentials = shallowCopyMap(credentials)
	return nil
}

func newKiroRejectedRefreshFixture(t *testing.T) (*KiroGatewayService, *kiroRefreshRegressionRepo, *Account, *atomic.Int32) {
	t.Helper()
	account := kiroTestOAuthAccount(11)
	account.Type = AccountTypeOAuth
	account.Status = StatusActive
	account.Credentials["refresh_token"] = "rt_old"
	account.Credentials["expires_at"] = time.Now().Add(time.Hour).Format(time.RFC3339)
	require.False(t, NewKiroTokenRefresher(nil).NeedsRefresh(account, time.Hour), "the old hour-window implementation would skip this rejected token")
	repo := &kiroRefreshRegressionRepo{account: snapshotOAuthRefreshAccount(account)}
	calls := &atomic.Int32{}
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls.Add(1)
		require.Equal(t, "/refreshToken", r.URL.Path)
		_, _ = w.Write([]byte(`{"accessToken":"at_new","refreshToken":"rt_new","expiresIn":3600}`))
	}))
	t.Cleanup(server.Close)
	oauth := newTestKiroOAuthService(t, server)
	svc := &KiroGatewayService{accountRepo: repo, kiroOAuthService: oauth, oauthRefreshAPI: NewOAuthRefreshAPI(repo, nil)}
	return svc, repo, account, calls
}

func TestKiro401RefreshesFreshButRejectedToken(t *testing.T) {
	svc, _, account, refreshCalls := newKiroRejectedRefreshFixture(t)
	var upstreamCalls int
	svc.callEndpointOverride = func(_ context.Context, current *Account, _ kiro.Endpoint, _ []byte) (*http.Response, error) {
		upstreamCalls++
		if current.KiroAccessToken() == "at_1" {
			return &http.Response{StatusCode: http.StatusUnauthorized, Body: io.NopCloser(bytes.NewBufferString(`{"message":"expired token"}`))}, nil
		}
		require.Equal(t, "at_new", current.KiroAccessToken())
		body := kiroTestConcatFrames(kiroTestEventFrame("assistantResponseEvent", `{"content":"ok"}`), kiroTestEventFrame("metadataEvent", `{"stopReason":"end_turn"}`))
		return &http.Response{StatusCode: http.StatusOK, Body: io.NopCloser(bytes.NewReader(body))}, nil
	}
	_, c := kiroTestContext()
	result, err := svc.ForwardUpstream(context.Background(), c, account, []byte(kiroTestRequestBody))
	require.NoError(t, err)
	require.NotNil(t, result)
	require.Equal(t, int32(1), refreshCalls.Load())
	require.Equal(t, 2, upstreamCalls)
	require.Equal(t, "rt_new", account.KiroRefreshToken())
}

func TestKiroRejectedRefreshReusesConcurrentReplacement(t *testing.T) {
	svc, repo, account, refreshCalls := newKiroRejectedRefreshFixture(t)
	repo.account.Credentials["access_token"] = "at_already_rotated"
	require.NoError(t, svc.refreshRejectedAccountToken(context.Background(), account))
	require.Equal(t, "at_already_rotated", account.KiroAccessToken())
	require.Zero(t, refreshCalls.Load())
}

func TestKiroConcurrentRejectedRefreshCallsRefreshOnce(t *testing.T) {
	svc, _, account, refreshCalls := newKiroRejectedRefreshFixture(t)
	const concurrency = 8
	results := make(chan error, concurrency)
	var wait sync.WaitGroup
	for i := 0; i < concurrency; i++ {
		requestAccount := snapshotOAuthRefreshAccount(account)
		wait.Add(1)
		go func() {
			defer wait.Done()
			err := svc.refreshRejectedAccountToken(context.Background(), requestAccount)
			if err == nil && requestAccount.KiroAccessToken() != "at_new" {
				err = io.ErrUnexpectedEOF
			}
			results <- err
		}()
	}
	wait.Wait()
	close(results)
	for err := range results {
		require.NoError(t, err)
	}
	require.Equal(t, int32(1), refreshCalls.Load())
}

func TestKiroOrdinaryRefreshKeepsFreshToken(t *testing.T) {
	svc, _, account, refreshCalls := newKiroRejectedRefreshFixture(t)
	require.NoError(t, svc.refreshAccountToken(context.Background(), account))
	require.Equal(t, "at_1", account.KiroAccessToken())
	require.Zero(t, refreshCalls.Load())
}
