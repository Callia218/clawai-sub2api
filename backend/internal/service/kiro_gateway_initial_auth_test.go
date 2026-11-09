//go:build unit

package service

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"

	"github.com/Wei-Shaw/sub2api/internal/pkg/kiro"
	"github.com/stretchr/testify/require"
)

func kiroInitialAuthAccount(method string) *Account {
	account := kiroTestOAuthAccount(903)
	account.Type = AccountTypeOAuth
	account.Status = StatusActive
	delete(account.Credentials, "access_token")
	account.Credentials["auth_method"] = method
	account.Credentials["refresh_token"] = "initial-test-refresh"
	account.Credentials["client_id"] = "initial-test-client"
	account.Credentials["client_secret"] = "initial-test-secret"
	account.Credentials["region"] = "us-east-1"
	account.Credentials["profile_arn"] = "arn:aws:codewhisperer:us-east-1:123456789012:profile/old123456789"
	if method == "idc" {
		account.Credentials["issuer_url"] = "https://example.awsapps.com/start"
	}
	return account
}

func TestKiroInitialOIDCAuthorizationRefreshesBeforeModelAndUsesNewProfile(t *testing.T) {
	for _, method := range []string{"idc", "builder_id"} {
		t.Run(method, func(t *testing.T) {
			account := kiroInitialAuthAccount(method)
			newProfile := "arn:aws:codewhisperer:eu-west-1:123456789012:profile/new123456789"
			var refreshCalls atomic.Int32
			oidcServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				refreshCalls.Add(1)
				require.Equal(t, "/token", r.URL.Path)
				var body map[string]string
				require.NoError(t, json.NewDecoder(r.Body).Decode(&body))
				require.Equal(t, "refresh_token", body["grantType"])
				require.True(t, body["refreshToken"] == "initial-test-refresh")
				require.True(t, body["clientId"] == "initial-test-client")
				require.True(t, body["clientSecret"] == "initial-test-secret")
				_ = json.NewEncoder(w).Encode(map[string]any{
					"accessToken": "initial-test-access", "refreshToken": "initial-test-rotated",
					"expiresIn": 3600, "profileArn": newProfile,
				})
			}))
			t.Cleanup(oidcServer.Close)
			var modelCalls atomic.Int32
			modelServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				modelCalls.Add(1)
				require.Equal(t, int32(1), refreshCalls.Load(), "the first model call must follow successful refresh")
				require.True(t, r.Header.Get("Authorization") == "Bearer initial-test-access", "model request must carry the newly refreshed bearer")
				var body map[string]any
				require.NoError(t, json.NewDecoder(r.Body).Decode(&body))
				require.Equal(t, newProfile, body["profileArn"], "payload must be built from the refreshed account")
				_, _ = w.Write(kiroTestConcatFrames(
					kiroTestEventFrame("assistantResponseEvent", `{"content":"authorized"}`),
					kiroTestEventFrame("metadataEvent", `{"stopReason":"end_turn"}`),
				))
			}))
			t.Cleanup(modelServer.Close)
			repo := &kiroRefreshRegressionRepo{account: snapshotOAuthRefreshAccount(account)}
			oauth := newTestKiroOAuthService(t, oidcServer)
			// Any unexpected discovery also stays on localhost.
			oauth.WithListProfilesHost(func(string) string { return oidcServer.URL })
			svc := &KiroGatewayService{accountRepo: repo, kiroOAuthService: oauth, oauthRefreshAPI: NewOAuthRefreshAPI(repo, nil)}
			var endpointCalls int
			svc.callEndpointOverride = func(ctx context.Context, current *Account, ep kiro.Endpoint, payload []byte) (*http.Response, error) {
				endpointCalls++
				require.Equal(t, "https://q.eu-west-1.amazonaws.com/generateAssistantResponse", ep.URL, "endpoint region must be recalculated after refresh")
				require.Equal(t, newProfile, current.KiroProfileArn())
				ep.URL = modelServer.URL
				return svc.callEndpoint(ctx, current, ep, payload)
			}
			_, c := kiroTestContext()
			result, err := svc.ForwardUpstream(context.Background(), c, account, []byte(kiroTestRequestBody))
			require.NoError(t, err)
			require.NotNil(t, result)
			require.Equal(t, 1, endpointCalls)
			require.Equal(t, int32(1), refreshCalls.Load())
			require.Equal(t, int32(1), modelCalls.Load())
			require.True(t, account.KiroAccessToken() == "initial-test-access")
			require.True(t, account.KiroRefreshToken() == "initial-test-rotated")
			require.NotNil(t, account.GetCredentialAsTime("expires_at"))
			saved, readErr := repo.GetByID(context.Background(), account.ID)
			require.NoError(t, readErr)
			require.True(t, saved.KiroAccessToken() == "initial-test-access", "refresh must persist through shared OAuthRefreshAPI")
		})
	}
}

func TestKiroInitialAuthorizationRejectsMissingCredentialsBeforeModel(t *testing.T) {
	cases := []struct {
		method string
		absent string
	}{
		{"social", "refresh_token"},
		{"idc", "refresh_token"},
		{"idc", "client_id"},
		{"idc", "client_secret"},
		{"builder_id", "client_id"},
		{"builder_id", "client_secret"},
	}
	for _, tc := range cases {
		t.Run(tc.method+"/"+tc.absent, func(t *testing.T) {
			account := kiroInitialAuthAccount(tc.method)
			delete(account.Credentials, tc.absent)
			var oauthCalls atomic.Int32
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
				oauthCalls.Add(1)
				w.WriteHeader(http.StatusBadRequest)
			}))
			t.Cleanup(server.Close)
			repo := &kiroRefreshRegressionRepo{account: snapshotOAuthRefreshAccount(account)}
			oauth := newTestKiroOAuthService(t, server)
			oauth.WithListProfilesHost(func(string) string { return server.URL })
			svc := &KiroGatewayService{accountRepo: repo, kiroOAuthService: oauth, oauthRefreshAPI: NewOAuthRefreshAPI(repo, nil)}
			modelCalls := 0
			svc.callEndpointOverride = func(context.Context, *Account, kiro.Endpoint, []byte) (*http.Response, error) {
				modelCalls++
				return nil, context.Canceled
			}
			_, c := kiroTestContext()
			result, err := svc.ForwardUpstream(context.Background(), c, account, []byte(kiroTestRequestBody))
			require.Error(t, err)
			require.Contains(t, strings.ToLower(err.Error()), "authorization")
			require.Nil(t, result)
			require.Zero(t, modelCalls)
			require.Zero(t, oauthCalls.Load(), "missing local credentials should fail without an OAuth request")
			require.NotContains(t, err.Error(), "initial-test-secret")
			require.NotContains(t, err.Error(), "initial-test-refresh")
		})
	}
}

func TestKiroInitialAuthorizationRefreshFailureDoesNotCallModelOrLeakDetails(t *testing.T) {
	account := kiroInitialAuthAccount("idc")
	var refreshCalls atomic.Int32
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		refreshCalls.Add(1)
		w.WriteHeader(http.StatusBadRequest)
		_, _ = w.Write([]byte(`{"error":"invalid_grant","error_description":"private-upstream-detail initial-test-secret initial-test-refresh"}`))
	}))
	t.Cleanup(server.Close)
	repo := &kiroRefreshRegressionRepo{account: snapshotOAuthRefreshAccount(account)}
	oauth := newTestKiroOAuthService(t, server)
	oauth.WithListProfilesHost(func(string) string { return server.URL })
	svc := &KiroGatewayService{accountRepo: repo, kiroOAuthService: oauth, oauthRefreshAPI: NewOAuthRefreshAPI(repo, nil)}
	modelCalls := 0
	svc.callEndpointOverride = func(context.Context, *Account, kiro.Endpoint, []byte) (*http.Response, error) {
		modelCalls++
		return nil, context.Canceled
	}
	recorder, c := kiroTestContext()
	result, err := svc.ForwardUpstream(context.Background(), c, account, []byte(kiroTestRequestBody))
	require.Error(t, err)
	require.Contains(t, strings.ToLower(err.Error()), "authorization")
	require.Nil(t, result)
	require.Equal(t, int32(1), refreshCalls.Load())
	require.Zero(t, modelCalls)
	for _, sensitive := range []string{"private-upstream-detail", "initial-test-secret", "initial-test-refresh"} {
		require.NotContains(t, err.Error(), sensitive)
		require.NotContains(t, recorder.Body.String(), sensitive)
	}
}

func TestKiroInitialAuthorizationAPIKeySkipsOAuth(t *testing.T) {
	account := kiroTestOAuthAccount(904)
	account.Type = AccountTypeAPIKey
	account.Credentials = map[string]any{
		"auth_method": "api_key", "api_key": "initial-test-api-key",
		"region": "us-east-1", "machine_id": "stable-machine", "fake_thinking": false,
	}
	var oauthCalls atomic.Int32
	oauthServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		oauthCalls.Add(1)
		w.WriteHeader(http.StatusBadRequest)
	}))
	t.Cleanup(oauthServer.Close)
	var modelCalls atomic.Int32
	modelServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		modelCalls.Add(1)
		require.True(t, r.Header.Get("Authorization") == "Bearer initial-test-api-key")
		_, _ = w.Write(kiroTestConcatFrames(
			kiroTestEventFrame("assistantResponseEvent", `{"content":"api key accepted"}`),
			kiroTestEventFrame("metadataEvent", `{"stopReason":"end_turn"}`),
		))
	}))
	t.Cleanup(modelServer.Close)
	oauth := newTestKiroOAuthService(t, oauthServer)
	svc := &KiroGatewayService{kiroOAuthService: oauth}
	svc.callEndpointOverride = func(ctx context.Context, current *Account, ep kiro.Endpoint, payload []byte) (*http.Response, error) {
		require.Equal(t, "https://runtime.us-east-1.kiro.dev/", ep.URL)
		ep.URL = modelServer.URL
		return svc.callEndpoint(ctx, current, ep, payload)
	}
	_, c := kiroTestContext()
	result, err := svc.ForwardUpstream(context.Background(), c, account, []byte(kiroTestRequestBody))
	require.NoError(t, err)
	require.NotNil(t, result)
	require.Equal(t, int32(1), modelCalls.Load())
	require.Zero(t, oauthCalls.Load())
}

func TestKiroInitialAuthorizationEmptyRefreshResultDoesNotCallModel(t *testing.T) {
	account := kiroInitialAuthAccount("idc")
	var refreshCalls atomic.Int32
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		refreshCalls.Add(1)
		_, _ = w.Write([]byte(`{"refreshToken":"initial-test-rotated","expiresIn":3600}`))
	}))
	t.Cleanup(server.Close)
	repo := &kiroRefreshRegressionRepo{account: snapshotOAuthRefreshAccount(account)}
	oauth := newTestKiroOAuthService(t, server)
	oauth.WithListProfilesHost(func(string) string { return server.URL })
	svc := &KiroGatewayService{accountRepo: repo, kiroOAuthService: oauth, oauthRefreshAPI: NewOAuthRefreshAPI(repo, nil)}
	modelCalls := 0
	svc.callEndpointOverride = func(context.Context, *Account, kiro.Endpoint, []byte) (*http.Response, error) {
		modelCalls++
		return nil, context.Canceled
	}
	_, c := kiroTestContext()
	result, err := svc.ForwardUpstream(context.Background(), c, account, []byte(kiroTestRequestBody))
	require.Error(t, err)
	require.Contains(t, strings.ToLower(err.Error()), "authorization")
	require.Nil(t, result)
	require.Equal(t, int32(1), refreshCalls.Load())
	require.Zero(t, modelCalls)
}

func TestKiroTestConnectionReportsSafe400WithoutFailoverLabel(t *testing.T) {
	account := kiroTestOAuthAccount(905)
	svc := &KiroGatewayService{}
	modelCalls := 0
	svc.callEndpointOverride = func(context.Context, *Account, kiro.Endpoint, []byte) (*http.Response, error) {
		modelCalls++
		return &http.Response{
			StatusCode: http.StatusBadRequest,
			Body:       io.NopCloser(strings.NewReader(`{"message":"private-upstream-body initial-test-secret"}`)),
		}, nil
	}
	result, err := svc.TestConnection(context.Background(), account, "")
	require.Error(t, err)
	require.Nil(t, result)
	require.Equal(t, 1, modelCalls)
	require.Contains(t, err.Error(), "400")
	require.Contains(t, err.Error(), "bad_request")
	require.NotContains(t, strings.ToLower(err.Error()), "failover")
	require.NotContains(t, err.Error(), "private-upstream-body")
	require.NotContains(t, err.Error(), "initial-test-secret")
}
