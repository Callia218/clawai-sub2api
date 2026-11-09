package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

func issuedAccessKey(hash string) string { return "issued_access:" + hash }
func issuedFamilyKey(id string) string   { return "issued_family:" + id }
func issuedUserKey(id int64) string      { return fmt.Sprintf("issued_user:%d", id) }

// Token records and their revocation indexes are committed atomically.
var storeIssuedAccessScript = redis.NewScript(`
redis.call('SET', KEYS[1], '1', 'PX', ARGV[2])
for i = 2, 3 do
  redis.call('SADD', KEYS[i], ARGV[1])
  if redis.call('PTTL', KEYS[i]) < tonumber(ARGV[2]) then
    redis.call('PEXPIRE', KEYS[i], ARGV[2])
  end
end
return 1
`)

func (c *refreshTokenCache) StoreIssuedAccessToken(ctx context.Context, hash, familyID string, userID int64, ttl time.Duration) error {
	return storeIssuedAccessScript.Run(ctx, c.rdb, []string{issuedAccessKey(hash), issuedFamilyKey(familyID), issuedUserKey(userID)}, hash, ttl.Milliseconds()).Err()
}

func (c *refreshTokenCache) IsIssuedAccessToken(ctx context.Context, hash string) (bool, error) {
	n, err := c.rdb.Exists(ctx, issuedAccessKey(hash)).Result()
	return n == 1, err
}

// Read and delete the index in one atomic operation. A concurrent issuance
// must not lose its index entry between SMEMBERS and DEL and evade revocation.
var deleteIssuedAccessScript = redis.NewScript(`
local hashes = redis.call('SMEMBERS', KEYS[1])
for _, hash in ipairs(hashes) do
  redis.call('DEL', 'issued_access:' .. hash)
end
redis.call('DEL', KEYS[1])
return #hashes
`)

func (c *refreshTokenCache) deleteIssuedAccessTokens(ctx context.Context, index string) error {
	return deleteIssuedAccessScript.Run(ctx, c.rdb, []string{index}).Err()
}
