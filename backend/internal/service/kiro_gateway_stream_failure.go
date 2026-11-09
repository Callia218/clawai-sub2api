package service

import (
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"github.com/Wei-Shaw/sub2api/internal/pkg/apicompat"
	"github.com/Wei-Shaw/sub2api/internal/pkg/kiro"
	"github.com/gin-gonic/gin"
)

// This deliberately does not wrap UpstreamFailoverError: once output has begun,
// handlers must record partial usage and must never replay it on another account.
var errKiroPartialResponse = errors.New("kiro: upstream response interrupted")

const kiroInterruptedMessage = "The upstream response was interrupted."

func kiroForwardResult(translator *kiro.StreamTranslator, inbound *apicompat.AnthropicRequest, upstreamModel string, startTime time.Time, firstTokenMs *int, disconnected bool) *ForwardResult {
	usage := translator.Usage()
	cache5m, cache1h := translator.PromptCacheCreationSplit()
	return &ForwardResult{
		Model:            kiro.AnthropicModelName(inbound.Model),
		UpstreamModel:    upstreamModel,
		Stream:           inbound.Stream,
		Duration:         time.Since(startTime),
		FirstTokenMs:     firstTokenMs,
		ClientDisconnect: disconnected,
		Usage: ClaudeUsage{
			InputTokens:              usage.InputTokens,
			OutputTokens:             usage.OutputTokens,
			CacheCreationInputTokens: usage.CacheCreationInputTokens,
			CacheReadInputTokens:     usage.CacheReadInputTokens,
			CacheCreation5mTokens:    cache5m,
			CacheCreation1hTokens:    cache1h,
		},
	}
}

func kiroInterruptedErrorBody(protocol kiroOutputProtocol) gin.H {
	if protocol == kiroOutputAnthropic {
		return gin.H{"type": "error", "error": gin.H{"type": "api_error", "message": kiroInterruptedMessage}}
	}
	return gin.H{"error": gin.H{"type": "server_error", "code": "upstream_error", "message": kiroInterruptedMessage}}
}

func writeKiroNonStreamFailure(c *gin.Context, protocol kiroOutputProtocol) {
	MarkResponseCommitted(c)
	c.JSON(http.StatusBadGateway, kiroInterruptedErrorBody(protocol))
}

func (s *KiroGatewayService) writeKiroStreamFailure(c *gin.Context, cw *antigravityClientWriter, protocol kiroOutputProtocol, state *apicompat.AnthropicEventToResponsesState, translator *kiro.StreamTranslator) {
	MarkResponseCommitted(c)
	switch protocol {
	case kiroOutputResponses:
		usage := translator.Usage()
		inputTokens := usage.InputTokens + usage.CacheReadInputTokens + usage.CacheCreationInputTokens
		output := state.Outputs
		if output == nil {
			output = []apicompat.ResponsesOutput{}
		}
		event := apicompat.ResponsesStreamEvent{
			Type:           "response.failed",
			SequenceNumber: state.SequenceNumber,
			Response: &apicompat.ResponsesResponse{
				ID: state.ResponseID, Object: "response", CreatedAt: state.Created,
				Model: state.Model, Status: "failed", Output: output,
				Error: &apicompat.ResponsesError{Code: "upstream_error", Message: kiroInterruptedMessage},
				Usage: &apicompat.ResponsesUsage{
					InputTokens: inputTokens, OutputTokens: usage.OutputTokens,
					TotalTokens:              inputTokens + usage.OutputTokens,
					CacheCreationInputTokens: usage.CacheCreationInputTokens,
					InputTokensDetails:       &apicompat.ResponsesInputTokensDetails{CachedTokens: usage.CacheReadInputTokens},
				},
			},
		}
		state.SequenceNumber++
		state.CompletedSent = true
		s.writeResponsesEvents(cw, []apicompat.ResponsesStreamEvent{event})
	case kiroOutputChatCompletions:
		body, _ := json.Marshal(kiroInterruptedErrorBody(protocol))
		cw.Fprintf("data: %s\n\n", body)
		cw.Write([]byte("data: [DONE]\n\n"))
	default:
		body, _ := json.Marshal(kiroInterruptedErrorBody(protocol))
		cw.Fprintf("event: error\ndata: %s\n\n", body)
	}
}
