package kiro

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestStreamFinalizePartialFlushesPendingContentWithoutSuccess(t *testing.T) {
	tr := NewStreamTranslator("claude-sonnet-4.6", "msg_partial", true)
	events, err := tr.Feed(eventFrame(t, "assistantResponseEvent", `{"content":"<thi"}`))
	require.NoError(t, err)
	require.Equal(t, []string{"message_start"}, collectTypes(events))
	require.True(t, tr.Started(), "an emitted envelope must prevent replay even while the prefix is buffered")
	require.False(t, tr.SawContent())

	partial := tr.FinalizePartial()
	require.Equal(t, []string{"content_block_start", "content_block_delta", "content_block_stop"}, collectTypes(partial))
	require.Equal(t, "<thi", partial[1].Delta.Text)
	require.Positive(t, tr.Usage().OutputTokens)
	require.Empty(t, tr.Finalize(), "a failed stream cannot later acquire a successful terminal event")
}
