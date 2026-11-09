package antigravity

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestOperatorOAuthClientRequiresBothValues(t *testing.T) {
	id, secret := ClientID, defaultClientSecret
	t.Cleanup(func() { ClientID, defaultClientSecret = id, secret })
	ClientID, defaultClientSecret = "", "test-only-secret"
	require.Error(t, ValidateOAuthClient())
	ClientID, defaultClientSecret = "operator-client", ""
	require.Error(t, ValidateOAuthClient())
	defaultClientSecret = "test-only-secret"
	require.NoError(t, ValidateOAuthClient())
}
