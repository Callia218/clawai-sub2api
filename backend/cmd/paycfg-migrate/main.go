package main

// paycfg-migrate 把 payment_provider_instances.config 里的明文记录迁移成
// enc:v1 加密信封。它刻意不连数据库：只从 stdin 读 JSON、往 stdout 写 SQL，
// 加解密直接复用 internal/payment，保证与运行时是同一套实现。
//
// 用法：
//   psql -t -A -c "select coalesce(json_agg(json_build_object('id',id,'config',config)),'[]') from payment_provider_instances" \
//     | paycfg-migrate -mode check  -key "$TOTP_ENCRYPTION_KEY"
//   psql ... | paycfg-migrate -mode encrypt -key "$TOTP_ENCRYPTION_KEY" > migrate.sql
//
// -mode check  只做往返验证（解析 → 重新加密 → 解密 → 比对），不产出 SQL
// -mode encrypt 输出 UPDATE 语句
import (
	"encoding/hex"
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"regexp"
	"strings"

	"github.com/Wei-Shaw/sub2api/internal/payment"
)

type row struct {
	ID     int64  `json:"id"`
	Config string `json:"config"`
}

// 加密信封只可能由 enc:v1: + base64url 组成，断言这一点后拼 SQL 才是安全的。
var envelopePattern = regexp.MustCompile(`^enc:v1:[A-Za-z0-9_-]+$`)

func main() {
	keyHex := flag.String("key", "", "master key, 64 hex chars (TOTP_ENCRYPTION_KEY)")
	mode := flag.String("mode", "check", "check | encrypt")
	flag.Parse()

	if err := run(*keyHex, *mode); err != nil {
		fmt.Fprintln(os.Stderr, "ERROR:", err)
		os.Exit(1)
	}
}

func run(keyHex, mode string) error {
	key, err := hex.DecodeString(strings.TrimSpace(keyHex))
	if err != nil {
		return fmt.Errorf("decode key: %w", err)
	}
	if len(key) != payment.AES256KeySize {
		return fmt.Errorf("key must be %d bytes, got %d", payment.AES256KeySize, len(key))
	}
	if mode != "check" && mode != "encrypt" {
		return fmt.Errorf("unknown mode %q", mode)
	}

	var rows []row
	dec := json.NewDecoder(os.Stdin)
	dec.UseNumber()
	if err := dec.Decode(&rows); err != nil {
		return fmt.Errorf("decode stdin json: %w", err)
	}

	var migrated, skipped, failed int
	for _, r := range rows {
		cfg, err := payment.ParseStoredConfig(r.Config, key)
		if err != nil {
			fmt.Fprintf(os.Stderr, "FAIL id=%d: %v\n", r.ID, err)
			failed++
			continue
		}
		if payment.IsEncryptedConfig(r.Config) {
			fmt.Fprintf(os.Stderr, "SKIP id=%d: already encrypted\n", r.ID)
			skipped++
			continue
		}
		if cfg == nil {
			fmt.Fprintf(os.Stderr, "SKIP id=%d: empty config\n", r.ID)
			skipped++
			continue
		}

		plain, err := json.Marshal(cfg)
		if err != nil {
			return fmt.Errorf("re-marshal config for id=%d: %w", r.ID, err)
		}
		envelope, err := payment.EncryptConfig(string(plain), key)
		if err != nil {
			return fmt.Errorf("encrypt config for id=%d: %w", r.ID, err)
		}
		if !envelopePattern.MatchString(envelope) {
			return fmt.Errorf("unexpected envelope shape for id=%d, refusing to build SQL", r.ID)
		}

		// 往返验证：解密回来必须和原文逐字节一致，否则说明派生/格式有问题。
		round, err := payment.DecryptConfig(envelope, key)
		if err != nil {
			return fmt.Errorf("roundtrip decrypt for id=%d: %w", r.ID, err)
		}
		if round != string(plain) {
			return fmt.Errorf("roundtrip mismatch for id=%d", r.ID)
		}
		var roundCfg map[string]string
		if err := json.Unmarshal([]byte(round), &roundCfg); err != nil {
			return fmt.Errorf("roundtrip json for id=%d: %w", r.ID, err)
		}
		if len(roundCfg) != len(cfg) {
			return fmt.Errorf("roundtrip field count mismatch for id=%d: %d vs %d", r.ID, len(roundCfg), len(cfg))
		}

		fmt.Fprintf(os.Stderr, "OK   id=%d provider fields=%d plaintext=%dB envelope=%dB\n",
			r.ID, len(cfg), len(plain), len(envelope))
		migrated++

		if mode == "encrypt" {
			fmt.Printf("UPDATE payment_provider_instances SET config = '%s' WHERE id = %d;\n", envelope, r.ID)
		}
	}

	fmt.Fprintf(os.Stderr, "\nSUMMARY total=%d migrated=%d skipped=%d failed=%d mode=%s\n",
		len(rows), migrated, skipped, failed, mode)
	if failed > 0 {
		return fmt.Errorf("%d record(s) failed, no SQL emitted for them", failed)
	}
	return nil
}
