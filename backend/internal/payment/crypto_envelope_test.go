package payment

import (
	"encoding/json"
	"strings"
	"testing"
)

// CF_PAYMENT_CONFIG_ENCRYPTION_PATCH 的回归测试。
// 覆盖：信封往返、三种存储格式共存、错密钥 fail closed、空值与无密钥行为。

func testMasterKey() []byte {
	key := make([]byte, AES256KeySize)
	for i := range key {
		key[i] = byte(i*7 + 1)
	}
	return key
}

func TestConfigEnvelopeRoundtrip(t *testing.T) {
	key := testMasterKey()
	plain := `{"appId":"2021000000000000","privateKey":"-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----"}`

	env, err := EncryptConfig(plain, key)
	if err != nil {
		t.Fatalf("EncryptConfig: %v", err)
	}
	if !strings.HasPrefix(env, EncryptedConfigPrefix) {
		t.Fatalf("envelope missing prefix: %q", env[:min(20, len(env))])
	}
	if strings.Contains(env, "PRIVATE KEY") {
		t.Fatal("envelope leaks plaintext")
	}

	got, err := DecryptConfig(env, key)
	if err != nil {
		t.Fatalf("DecryptConfig: %v", err)
	}
	if got != plain {
		t.Fatalf("roundtrip mismatch:\n got=%q\nwant=%q", got, plain)
	}

	// 同一明文两次加密必须得到不同信封（nonce 随机）。
	env2, err := EncryptConfig(plain, key)
	if err != nil {
		t.Fatalf("EncryptConfig 2: %v", err)
	}
	if env == env2 {
		t.Fatal("envelope is deterministic, nonce is not random")
	}
}

func TestParseStoredConfigFormats(t *testing.T) {
	key := testMasterKey()
	cfg := map[string]string{"appId": "123", "privateKey": "secret"}

	raw, _ := json.Marshal(cfg)

	// 明文 JSON（上游当前格式）
	got, err := ParseStoredConfig(string(raw), key)
	if err != nil {
		t.Fatalf("plaintext: %v", err)
	}
	if got["privateKey"] != "secret" {
		t.Fatalf("plaintext: got %v", got)
	}

	// enc:v1 信封（本补丁的写入格式）
	env, err := EncryptConfig(string(raw), key)
	if err != nil {
		t.Fatalf("encrypt: %v", err)
	}
	got, err = ParseStoredConfig(env, key)
	if err != nil {
		t.Fatalf("envelope: %v", err)
	}
	if got["privateKey"] != "secret" {
		t.Fatalf("envelope: got %v", got)
	}

	// 旧 iv:authTag:ciphertext 信封
	//nolint:staticcheck // SA1019: 验证历史格式的读取兼容
	legacy, err := Encrypt(string(raw), key)
	if err != nil {
		t.Fatalf("legacy encrypt: %v", err)
	}
	got, err = ParseStoredConfig(legacy, key)
	if err != nil {
		t.Fatalf("legacy: %v", err)
	}
	if got["privateKey"] != "secret" {
		t.Fatalf("legacy: got %v", got)
	}

	// 空值
	got, err = ParseStoredConfig("", key)
	if err != nil || got != nil {
		t.Fatalf("empty: got=%v err=%v", got, err)
	}
}

func TestParseStoredConfigWrongKeyFailsClosed(t *testing.T) {
	key := testMasterKey()
	raw := `{"privateKey":"secret"}`
	env, err := EncryptConfig(raw, key)
	if err != nil {
		t.Fatalf("encrypt: %v", err)
	}

	wrong := make([]byte, AES256KeySize)
	for i := range wrong {
		wrong[i] = 0xAA
	}

	if _, err := ParseStoredConfig(env, wrong); err == nil {
		t.Fatal("wrong key must fail, not silently return an empty config")
	}
	if _, err := ParseStoredConfig(env, nil); err == nil {
		t.Fatal("missing key must fail for an encrypted config")
	}

	// 密文被篡改（GCM 认证失败）
	tampered := env[:len(env)-4] + "AAAA"
	if _, err := ParseStoredConfig(tampered, key); err == nil {
		t.Fatal("tampered envelope must fail authentication")
	}
}

func TestParseStoredConfigRejectsGarbage(t *testing.T) {
	key := testMasterKey()
	if _, err := ParseStoredConfig("not-json-not-envelope", key); err == nil {
		t.Fatal("garbage input must return an error")
	}
}

func TestEncryptConfigRequiresKey(t *testing.T) {
	if _, err := EncryptConfig("{}", nil); err == nil {
		t.Fatal("EncryptConfig must reject an empty key")
	}
	if _, err := EncryptConfig("{}", make([]byte, 16)); err == nil {
		t.Fatal("EncryptConfig must reject a non-32-byte key")
	}
}

func TestIsEncryptedConfig(t *testing.T) {
	if !IsEncryptedConfig("  enc:v1:abc  ") {
		t.Fatal("should detect envelope with surrounding spaces")
	}
	if IsEncryptedConfig(`{"a":"b"}`) {
		t.Fatal("plaintext must not be detected as envelope")
	}
	if IsEncryptedConfig("") {
		t.Fatal("empty must not be detected as envelope")
	}
}
