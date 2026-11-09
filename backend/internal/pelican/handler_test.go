package pelican

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestPelicanPublicResponsesRedactHistoricalSecrets(t *testing.T) {
	views := []GroupView{{APIKeyID: 42, APIKeyName: "private-key-name", APIKeyMasked: "sk-sensitive-fragment", Results: []Result{{Error: "upstream-private-token", HTML: "<svg></svg>"}}}}
	redactPublicOverview(views)
	raw, err := json.Marshal(views)
	require.NoError(t, err)
	for _, secret := range []string{"private-key-name", "sk-sensitive-fragment", "upstream-private-token"} {
		require.NotContains(t, string(raw), secret)
	}
	require.Equal(t, "<svg></svg>", views[0].Results[0].HTML)
	report := &RunReport{Items: []RunItem{{Error: "private-db-error"}}}
	status := map[string]any{"last_report": report, "error": "private-dsn"}
	redactPublicStatus(status)
	raw, err = json.Marshal(status)
	require.NoError(t, err)
	require.NotContains(t, string(raw), "private-")
	require.Equal(t, "private-db-error", report.Items[0].Error, "public reads must not mutate shared report state")
}
