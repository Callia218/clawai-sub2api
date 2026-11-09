//go:build unit

package service

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"github.com/Wei-Shaw/sub2api/internal/pkg/apicompat"
	"github.com/Wei-Shaw/sub2api/internal/pkg/kiro"
	"github.com/stretchr/testify/require"
)

// A reader may return valid bytes and an error in the same call. Both must be
// observed: returning early on either loses content or disguises the failure.
type kiroPartialFailureReader struct {
	data []byte
	err  error
}

func (r *kiroPartialFailureReader) Read(p []byte) (int, error) {
	n := copy(p, r.data)
	r.data = r.data[n:]
	if len(r.data) == 0 {
		return n, r.err
	}
	return n, nil
}

func kiroPartialFailureFrames() []byte {
	return kiroTestConcatFrames(
		kiroTestEventFrame("assistantResponseEvent", `{"content":"partial output retained"}`),
		kiroTestEventFrame("meteringEvent", `{"unit":"credit","usage":1.5,"cacheReadInputTokens":4,"cacheCreationInputTokens":2}`),
	)
}

func TestKiroPartialFailuresKeepUsageAndTerminateWithoutReplay(t *testing.T) {
	protocols := []struct {
		name     string
		protocol kiroOutputProtocol
		model    string
	}{
		{"anthropic", kiroOutputAnthropic, "claude-sonnet-4-5-20250929"},
		{"responses", kiroOutputResponses, "gpt-5.6-sol"},
		{"chat_completions", kiroOutputChatCompletions, "claude-sonnet-4-5-20250929"},
	}
	for _, protocol := range protocols {
		for _, stream := range []bool{true, false} {
			for _, failure := range []string{"exception", "read_error_with_bytes", "read_error_after_bytes", "decoder_error"} {
				t.Run(fmt.Sprintf("%s/stream_%t/%s", protocol.name, stream, failure), func(t *testing.T) {
					frames := kiroPartialFailureFrames()
					var reader io.Reader
					switch failure {
					case "exception":
						reader = bytes.NewReader(append(frames, kiroTestExceptionFrame("ThrottlingException", "private upstream detail")...))
					case "read_error_with_bytes":
						reader = &kiroPartialFailureReader{data: frames, err: io.ErrUnexpectedEOF}
					case "read_error_after_bytes":
						reader = io.MultiReader(bytes.NewReader(frames), &kiroPartialFailureReader{err: errors.New("private upstream detail")})
					case "decoder_error":
						corrupt := kiroTestEventFrame("metadataEvent", `{"stopReason":"end_turn"}`)
						corrupt[len(corrupt)-1] ^= 0xff
						reader = bytes.NewReader(append(frames, corrupt...))
					}
					calls := 0
					repo := &kiroRateLimitRecorder{}
					svc := &KiroGatewayService{accountRepo: repo}
					svc.callEndpointOverride = func(context.Context, *Account, kiro.Endpoint, []byte) (*http.Response, error) {
						calls++
						return &http.Response{StatusCode: http.StatusOK, Body: io.NopCloser(reader)}, nil
					}
					body := fmt.Sprintf(`{"model":%q,"max_tokens":100,"messages":[{"role":"user","content":"Please explain a small example clearly."}],"stream":%t}`, protocol.model, stream)
					recorder, c := kiroTestContext()
					result, err := svc.forwardUpstream(context.Background(), c, kiroTestOAuthAccount(801), []byte(body), false, protocol.protocol)

					require.Error(t, err)
					require.NotNil(t, result, "partial usage must reach gateway billing even when the request fails")
					var failover *UpstreamFailoverError
					require.False(t, errors.As(err, &failover), "emitted content must never enter the handler's account failover path")
					require.Equal(t, 1, calls, "partial output must not be replayed")
					require.Positive(t, result.Usage.InputTokens)
					require.Positive(t, result.Usage.OutputTokens)
					require.Equal(t, 4, result.Usage.CacheReadInputTokens)
					require.Equal(t, 2, result.Usage.CacheCreationInputTokens)
					require.Equal(t, stream, result.Stream)
					require.True(t, IsResponseCommitted(c), "outer handlers must not append a second error response")
					require.NotContains(t, err.Error(), "private upstream detail")
					out := recorder.Body.String()
					require.NotContains(t, out, "private upstream detail")
					if failure == "exception" {
						require.Len(t, repo.calls, 1, "a partial rate-limit failure must still cool down its account")
						require.Equal(t, kiroCreditsExhaustedKey, repo.calls[0].scope)
					}
					if stream {
						require.Equal(t, http.StatusOK, recorder.Code)
						require.Contains(t, out, "partial output retained")
						kiroRequireFailureTermination(t, protocol.protocol, out, result)
					} else {
						require.Equal(t, http.StatusBadGateway, recorder.Code)
						require.NotContains(t, out, "partial output retained", "nonstream must not return truncated content as a successful response")
						var payload map[string]json.RawMessage
						require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &payload))
						require.NotEmpty(t, payload["error"])
						if protocol.protocol == kiroOutputAnthropic {
							require.JSONEq(t, `"error"`, string(payload["type"]))
						}
					}
				})
			}
		}
	}
}

func kiroRequireFailureTermination(t *testing.T, protocol kiroOutputProtocol, out string, result *ForwardResult) {
	t.Helper()
	switch protocol {
	case kiroOutputResponses:
		require.Contains(t, out, "event: response.failed\n")
		require.NotContains(t, out, "event: response.completed")
		var created, failed *apicompat.ResponsesStreamEvent
		lastSequence := -1
		for _, line := range strings.Split(out, "\n") {
			if !strings.HasPrefix(line, "data: ") {
				continue
			}
			var event apicompat.ResponsesStreamEvent
			require.NoError(t, json.Unmarshal([]byte(strings.TrimPrefix(line, "data: ")), &event))
			require.Greater(t, event.SequenceNumber, lastSequence)
			lastSequence = event.SequenceNumber
			switch event.Type {
			case "response.created":
				created = &event
			case "response.failed":
				failed = &event
			}
		}
		require.NotNil(t, created)
		require.NotNil(t, failed)
		require.Equal(t, created.Response.ID, failed.Response.ID)
		require.Equal(t, "failed", failed.Response.Status)
		require.NotNil(t, failed.Response.Error)
		require.NotNil(t, failed.Response.Usage)
		require.Equal(t, result.Usage.OutputTokens, failed.Response.Usage.OutputTokens)
	case kiroOutputChatCompletions:
		require.Contains(t, out, `"error":`)
		require.True(t, strings.HasSuffix(out, "data: [DONE]\n\n"))
		require.NotContains(t, out, `"finish_reason":"stop"`)
		require.NotContains(t, out, `"finish_reason":"tool_calls"`)
		require.Less(t, strings.LastIndex(out, `"error":`), strings.LastIndex(out, "data: [DONE]"))
	default:
		require.Contains(t, out, "event: error\n")
		require.NotContains(t, out, "event: message_stop")
		require.NotContains(t, out, "event: message_delta")
		require.Contains(t, out, `"type":"error"`)
	}
}

func TestKiroPartialExceptionStillCoolsSuspendedAndExhaustedAccounts(t *testing.T) {
	for _, kind := range []string{"suspended", "credits"} {
		for _, stream := range []bool{true, false} {
			t.Run(fmt.Sprintf("%s/stream_%t", kind, stream), func(t *testing.T) {
				repo := &kiroRateLimitRecorder{}
				svc := &KiroGatewayService{accountRepo: repo}
				message := "account is suspended"
				wantReset := time.Now().Add(kiroSuspendedCooldown)
				var quotaCalls *int32
				if kind == "credits" {
					message = "credits exhausted"
					wantReset = time.Now().Add(3 * time.Hour).Truncate(time.Second)
					quotaServer, hits := kiroTestCreditsFakeUpstream(t, wantReset, 0)
					quotaCalls = hits
					svc.creditsQuotaFetcherOverride = &KiroQuotaFetcher{qHostFor: func(*Account) string { return quotaServer.URL }}
				}
				frames := append(kiroPartialFailureFrames(), kiroTestExceptionFrame("AccessDeniedException", message)...)
				calls := 0
				svc.callEndpointOverride = func(context.Context, *Account, kiro.Endpoint, []byte) (*http.Response, error) {
					calls++
					return &http.Response{StatusCode: http.StatusOK, Body: io.NopCloser(bytes.NewReader(frames))}, nil
				}
				body := strings.Replace(kiroTestRequestBody, `"stream":true`, fmt.Sprintf(`"stream":%t`, stream), 1)
				_, c := kiroTestContext()
				result, err := svc.ForwardUpstream(context.Background(), c, kiroTestOAuthAccount(802), []byte(body))
				require.Error(t, err)
				require.NotNil(t, result)
				var failover *UpstreamFailoverError
				require.False(t, errors.As(err, &failover))
				require.Equal(t, 1, calls)
				require.Len(t, repo.calls, 1)
				require.Equal(t, kiroCreditsExhaustedKey, repo.calls[0].scope)
				require.EqualValues(t, 802, repo.calls[0].accountID)
				require.WithinDuration(t, wantReset, repo.calls[0].resetAt, 5*time.Second)
				if quotaCalls != nil {
					require.EqualValues(t, 1, atomic.LoadInt32(quotaCalls))
				}
			})
		}
	}
}
