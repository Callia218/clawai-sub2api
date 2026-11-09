package kiro

import (
	"net/url"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestKiroRegionNormalization(t *testing.T) {
	for _, tc := range []struct{ input, want string }{
		{"", "us-east-1"}, {" US-EAST-1 ", "us-east-1"},
		{"eu-central-1", "eu-central-1"}, {"us-gov-east-1", "us-gov-east-1"},
	} {
		actual, err := NormalizeRegion(tc.input)
		require.NoError(t, err)
		require.Equal(t, tc.want, actual)
	}
}

func TestKiroRegionRejectsURLAuthorityInjection(t *testing.T) {
	builders := []func(string) string{OIDCBase, SocialBase, ListModelsHostFor, ListProfilesHostFor, BuildListModelsURL, BuildListProfilesURL}
	for _, region := range []string{
		"us-east-1@attacker.invalid/", "us-east-1.attacker.invalid", "us-east-1/secret", "us-east-1\\secret",
		"us-east-1:8080", "us-east-1%40attacker.invalid", "us-east-1?secret", "us-east-1#secret", "us-east-1\nX-Test",
	} {
		t.Run(region, func(t *testing.T) {
			_, err := NormalizeRegion(region)
			require.Error(t, err)
			require.Empty(t, EndpointsFor(false, region))
			require.Empty(t, EndpointsFor(true, region))
			for _, build := range builders {
				u, err := url.Parse(build(region))
				require.NoError(t, err)
				require.Empty(t, u.Host, "an invalid region must never produce an outbound destination")
			}
		})
	}
}
