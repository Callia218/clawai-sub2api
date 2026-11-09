package service

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/Wei-Shaw/sub2api/internal/config"
	"github.com/golang-jwt/jwt/v5"
	"github.com/stretchr/testify/require"
)

type issuedTokenTestCache struct {
	RefreshTokenCache
	issued map[string]bool
	err    error
}

func (c *issuedTokenTestCache) StoreIssuedAccessToken(_ context.Context, hash, _ string, _ int64, _ time.Duration) error {
	if c.err != nil {
		return c.err
	}
	c.issued[hash] = true
	return nil
}
func (c *issuedTokenTestCache) IsIssuedAccessToken(_ context.Context, hash string) (bool, error) {
	return c.issued[hash], c.err
}

func TestSecurityIssuedTokenRejectsForgedSignedClaims(t *testing.T) {
	cache := &issuedTokenTestCache{issued: map[string]bool{}}
	cfg := &config.Config{JWT: config.JWTConfig{Secret: "test-only-signing-key", ExpireHour: 1, RequireIssuedToken: true}}
	svc := &AuthService{cfg: cfg, refreshTokenCache: cache}
	user := &User{ID: 42, Email: "admin@test.invalid", Role: RoleAdmin, PasswordHash: "test-hash"}
	legit, err := svc.GenerateToken(context.Background(), user)
	require.NoError(t, err)
	claims, err := svc.ValidateToken(legit)
	require.NoError(t, err)
	for _, binding := range []string{"", "attacker-chosen-binding"} {
		forgedClaims := *claims
		forgedClaims.BindingHash = binding
		forgedClaims.SessionID = "deadbeefcafe0001"
		forgedClaims.ExpiresAt = jwt.NewNumericDate(time.Now().Add(24 * time.Hour))
		forged, err := jwt.NewWithClaims(jwt.SigningMethodHS256, &forgedClaims).SignedString([]byte(cfg.JWT.Secret))
		require.NoError(t, err)
		_, err = svc.ValidateToken(forged)
		require.ErrorIs(t, err, ErrInvalidToken, "correct signature and password fingerprint must not be enough")
	}
	cache.err = errors.New("redis unavailable")
	_, err = svc.ValidateToken(legit)
	require.ErrorIs(t, err, ErrServiceUnavailable)
	_, err = svc.GenerateToken(context.Background(), user)
	require.Error(t, err, "do not issue an unregistered token")
}
