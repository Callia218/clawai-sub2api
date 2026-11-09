package payment

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"strings"
)

// AES256KeySize is the required key length (in bytes) for AES-256-GCM.
const AES256KeySize = 32

// Encrypt encrypts plaintext using AES-256-GCM with the given 32-byte key.
// The output format is "iv:authTag:ciphertext" where each component is base64-encoded,
// matching the Node.js crypto.ts format for cross-compatibility.
//
// Deprecated: payment provider configs are now stored as plaintext JSON.
// This function is kept only for seeding legacy ciphertext in tests and for
// the transitional Decrypt fallback. Scheduled for removal after all live
// deployments complete migration by re-saving their configs.
func Encrypt(plaintext string, key []byte) (string, error) {
	if len(key) != AES256KeySize {
		return "", fmt.Errorf("encryption key must be %d bytes, got %d", AES256KeySize, len(key))
	}

	block, err := aes.NewCipher(key)
	if err != nil {
		return "", fmt.Errorf("create AES cipher: %w", err)
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", fmt.Errorf("create GCM: %w", err)
	}

	nonce := make([]byte, gcm.NonceSize()) // 12 bytes for GCM
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", fmt.Errorf("generate nonce: %w", err)
	}

	// Seal appends the ciphertext + auth tag
	sealed := gcm.Seal(nil, nonce, []byte(plaintext), nil)

	// Split sealed into ciphertext and auth tag (last 16 bytes)
	tagSize := gcm.Overhead()
	ciphertext := sealed[:len(sealed)-tagSize]
	authTag := sealed[len(sealed)-tagSize:]

	// Format: iv:authTag:ciphertext (all base64)
	return fmt.Sprintf("%s:%s:%s",
		base64.StdEncoding.EncodeToString(nonce),
		base64.StdEncoding.EncodeToString(authTag),
		base64.StdEncoding.EncodeToString(ciphertext),
	), nil
}

// Decrypt decrypts a ciphertext string produced by Encrypt.
// The input format is "iv:authTag:ciphertext" where each component is base64-encoded.
//
// Deprecated: payment provider configs are now stored as plaintext JSON.
// This function remains only as a read-path fallback for pre-migration
// ciphertext records. Scheduled for removal once all deployments re-save
// their provider configs through the admin UI.
func Decrypt(ciphertext string, key []byte) (string, error) {
	if len(key) != AES256KeySize {
		return "", fmt.Errorf("encryption key must be %d bytes, got %d", AES256KeySize, len(key))
	}

	parts := strings.SplitN(ciphertext, ":", 3)
	if len(parts) != 3 {
		return "", fmt.Errorf("invalid ciphertext format: expected iv:authTag:ciphertext")
	}

	nonce, err := base64.StdEncoding.DecodeString(parts[0])
	if err != nil {
		return "", fmt.Errorf("decode IV: %w", err)
	}

	authTag, err := base64.StdEncoding.DecodeString(parts[1])
	if err != nil {
		return "", fmt.Errorf("decode auth tag: %w", err)
	}

	encrypted, err := base64.StdEncoding.DecodeString(parts[2])
	if err != nil {
		return "", fmt.Errorf("decode ciphertext: %w", err)
	}

	block, err := aes.NewCipher(key)
	if err != nil {
		return "", fmt.Errorf("create AES cipher: %w", err)
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", fmt.Errorf("create GCM: %w", err)
	}

	// Reconstruct the sealed data: ciphertext + authTag
	sealed := append(encrypted, authTag...)

	plaintext, err := gcm.Open(nil, nonce, sealed, nil)
	if err != nil {
		return "", fmt.Errorf("decrypt: %w", err)
	}

	return string(plaintext), nil
}

// ---------------------------------------------------------------------------
// CF_PAYMENT_CONFIG_ENCRYPTION_PATCH
//
// 上游把支付渠道配置的写路径改成了明文 JSON（上面的 Encrypt 被标记 Deprecated，
// 只在读路径保留旧密文兼容）。这意味着 payment_provider_instances.config 里的
// RSA 私钥、APIv3 密钥、Stripe secret key 全部明文落库 —— 一次数据库导出、
// 一次备份外泄、一次 SQL 注入就足以让攻击者拿到商户私钥，进而伪造支付回调。
//
// 这里补回加密写路径，并做了三点加强：
//   1. 信封格式带版本前缀 enc:v1:，不再依赖「先试着按 JSON 解析」的类型嗅探；
//   2. 用 HKDF-SHA256 从主密钥派生「支付配置专用」子密钥，与 TOTP 加密、
//      resume token 签名使用的密钥分离（密钥不跨用途复用）；
//   3. AES-256-GCM 带 AAD，把密文绑定到用途上，防止把别处的密文搬到本字段解密。
//
// 读取侧同时兼容：enc:v1 信封 / 明文 JSON / 旧 iv:authTag:ciphertext 信封。
// ---------------------------------------------------------------------------

const (
	// EncryptedConfigPrefix 标记 payment provider config 的加密信封。
	EncryptedConfigPrefix = "enc:v1:"

	configSubkeySalt  = "sub2api/payment-provider-config/v1/salt"
	configSubkeyInfo  = "sub2api/payment-provider-config/v1/key"
	configEnvelopeAAD = "sub2api:payment-provider-config:v1"
)

// IsEncryptedConfig reports whether stored is a v1 config envelope.
func IsEncryptedConfig(stored string) bool {
	return strings.HasPrefix(strings.TrimSpace(stored), EncryptedConfigPrefix)
}

// hkdfSHA256 is a minimal HKDF (RFC 5869) using only the standard library.
// Extracting and expanding by hand keeps this package free of extra deps and
// makes the derivation stable across Go versions.
func hkdfSHA256(secret, salt []byte, info string, length int) []byte {
	mac := hmac.New(sha256.New, salt)
	// hash.Hash.Write always returns the full length and a nil error.
	_, _ = mac.Write(secret)
	prk := mac.Sum(nil)

	out := make([]byte, 0, length)
	var block []byte
	for counter := byte(1); len(out) < length; counter++ {
		mac = hmac.New(sha256.New, prk)
		_, _ = mac.Write(block)
		_, _ = mac.Write([]byte(info))
		_, _ = mac.Write([]byte{counter})
		block = mac.Sum(nil)
		out = append(out, block...)
	}
	return out[:length]
}

// deriveConfigSubkey derives the AES-256 key used for provider configs.
func deriveConfigSubkey(master []byte) ([]byte, error) {
	// HKDF itself accepts a secret of any length, but the deployment contract is a
	// 32-byte master key (64 hex chars). Rejecting anything else keeps this API
	// consistent with the legacy Encrypt/Decrypt pair and surfaces a misconfigured
	// TOTP_ENCRYPTION_KEY immediately instead of silently deriving a weak subkey.
	if len(master) != AES256KeySize {
		return nil, fmt.Errorf("payment config encryption key must be %d bytes, got %d", AES256KeySize, len(master))
	}
	return hkdfSHA256(master, []byte(configSubkeySalt), configSubkeyInfo, AES256KeySize), nil
}

// EncryptConfig encrypts a provider config with AES-256-GCM and returns a
// versioned envelope: "enc:v1:" + base64url(nonce || ciphertext || tag).
func EncryptConfig(plaintext string, master []byte) (string, error) {
	key, err := deriveConfigSubkey(master)
	if err != nil {
		return "", err
	}
	block, err := aes.NewCipher(key)
	if err != nil {
		return "", fmt.Errorf("create AES cipher: %w", err)
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", fmt.Errorf("create GCM: %w", err)
	}
	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", fmt.Errorf("generate nonce: %w", err)
	}
	sealed := gcm.Seal(nil, nonce, []byte(plaintext), []byte(configEnvelopeAAD))
	buf := make([]byte, 0, len(nonce)+len(sealed))
	buf = append(buf, nonce...)
	buf = append(buf, sealed...)
	return EncryptedConfigPrefix + base64.RawURLEncoding.EncodeToString(buf), nil
}

// DecryptConfig opens a v1 envelope produced by EncryptConfig.
func DecryptConfig(envelope string, master []byte) (string, error) {
	envelope = strings.TrimSpace(envelope)
	if !IsEncryptedConfig(envelope) {
		return "", fmt.Errorf("not a %s envelope", EncryptedConfigPrefix)
	}
	key, err := deriveConfigSubkey(master)
	if err != nil {
		return "", err
	}
	raw, err := base64.RawURLEncoding.DecodeString(envelope[len(EncryptedConfigPrefix):])
	if err != nil {
		return "", fmt.Errorf("decode envelope: %w", err)
	}
	block, err := aes.NewCipher(key)
	if err != nil {
		return "", fmt.Errorf("create AES cipher: %w", err)
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", fmt.Errorf("create GCM: %w", err)
	}
	if len(raw) <= gcm.NonceSize() {
		return "", fmt.Errorf("envelope too short: %d bytes", len(raw))
	}
	nonce, sealed := raw[:gcm.NonceSize()], raw[gcm.NonceSize():]
	plaintext, err := gcm.Open(nil, nonce, sealed, []byte(configEnvelopeAAD))
	if err != nil {
		return "", fmt.Errorf("decrypt envelope: %w", err)
	}
	return string(plaintext), nil
}

// ParseStoredConfig decodes a stored provider config in any supported format:
//   - ""                     → (nil, nil)
//   - "enc:v1:..."           → AES-256-GCM envelope (current write format)
//   - "{...}"                → plaintext JSON (upstream's current format)
//   - "iv:authTag:ct"        → legacy AES-256-GCM envelope
//
// An error is returned when the value cannot be decoded at all. Callers decide
// whether that is fatal: for enc:v1 envelopes it must be, otherwise a wrong
// master key silently turns every payment channel into an empty config.
func ParseStoredConfig(stored string, master []byte) (map[string]string, error) {
	stored = strings.TrimSpace(stored)
	if stored == "" {
		return nil, nil
	}

	if IsEncryptedConfig(stored) {
		plaintext, err := DecryptConfig(stored, master)
		if err != nil {
			return nil, err
		}
		var cfg map[string]string
		if err := json.Unmarshal([]byte(plaintext), &cfg); err != nil {
			return nil, fmt.Errorf("decrypted config is not a JSON object: %w", err)
		}
		return cfg, nil
	}

	var cfg map[string]string
	if err := json.Unmarshal([]byte(stored), &cfg); err == nil {
		return cfg, nil
	}

	// Deprecated: legacy iv:authTag:ciphertext envelope.
	if len(master) == AES256KeySize {
		//nolint:staticcheck // SA1019: intentional legacy read-path fallback
		if plaintext, err := Decrypt(stored, master); err == nil {
			if err := json.Unmarshal([]byte(plaintext), &cfg); err == nil {
				return cfg, nil
			}
		}
	}

	return nil, fmt.Errorf("unrecognized payment provider config format (len=%d)", len(stored))
}
