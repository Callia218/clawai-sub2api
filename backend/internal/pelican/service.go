// Package pelican 实现「鹈鹕测智」：用固定提示词让各分组的模型画一只骑自行车的鹈鹕，
// 把模型返回的 HTML 存库，前端用 sandbox iframe 渲染，直观比较不同模型的「智商」。
//
// 设计要点：
//   - 提示词写死。改动会让不同时间点的结果失去可比性，这是这个功能的全部意义。
//   - 走自家网关（127.0.0.1:<port>/v1/chat/completions）+ 分组绑定的 API Key，
//     和真实用户同一条链路，结果才有参考价值；代价是会计费，所以默认关闭、由管理员显式开启。
//   - 只用原生 SQL，不新增 ent schema —— 这个功能是独立的，没必要为它跑一遍 codegen。
package pelican

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/Wei-Shaw/sub2api/internal/config"

	_ "github.com/lib/pq"
)

// DefaultPrompt 固定提示词。
const DefaultPrompt = "创建一个HTML,内容是SVG绘制一个鹈鹕骑自行车的2D动画，你不需要任何测试"

const (
	configRowID      = 1
	maxResponseBytes = 8 << 20 // 单次响应上限 8MB，防止模型吐出巨量文本把内存打爆
	maxHTMLBytes     = 2 << 20 // 单条 HTML 入库上限 2MB
)

// GroupConfig 一个分组的测试配置。
type GroupConfig struct {
	GroupID         int64  `json:"group_id"`
	APIKeyID        int64  `json:"api_key_id"`
	Model           string `json:"model"`
	ReasoningEffort string `json:"reasoning_effort,omitempty"`
}

// Config 全局配置，存在 pelican_config 表里。
type Config struct {
	Enabled         bool          `json:"enabled"`
	IntervalMinutes int           `json:"interval_minutes"`
	MaxTokens       int           `json:"max_tokens"`
	KeepPerGroup    int           `json:"keep_per_group"`
	RetentionDays   int           `json:"retention_days"`
	Groups          []GroupConfig `json:"groups"`
}

// DefaultConfig 默认关闭：开启后每次运行都会真实计费。
func DefaultConfig() Config {
	return Config{
		Enabled:         false,
		IntervalMinutes: 60,
		MaxTokens:       4096,
		KeepPerGroup:    100,
		RetentionDays:   7,
		Groups:          []GroupConfig{},
	}
}

func (c *Config) normalize() {
	if c.IntervalMinutes < 5 {
		c.IntervalMinutes = 5
	}
	if c.IntervalMinutes > 1440 {
		c.IntervalMinutes = 1440
	}
	if c.MaxTokens < 256 {
		c.MaxTokens = 256
	}
	if c.MaxTokens > 32000 {
		c.MaxTokens = 32000
	}
	if c.KeepPerGroup < 1 {
		c.KeepPerGroup = 100
	}
	if c.KeepPerGroup > 500 {
		c.KeepPerGroup = 500
	}
	if c.RetentionDays < 1 {
		c.RetentionDays = 7
	}
	if c.RetentionDays > 90 {
		c.RetentionDays = 90
	}
	if c.Groups == nil {
		c.Groups = []GroupConfig{}
	}
	for i := range c.Groups {
		c.Groups[i].Model = strings.TrimSpace(c.Groups[i].Model)
		c.Groups[i].ReasoningEffort = strings.TrimSpace(c.Groups[i].ReasoningEffort)
	}
}

// Result 一条生成结果。
type Result struct {
	ID              int64     `json:"id"`
	GroupID         int64     `json:"group_id"`
	Model           string    `json:"model"`
	ReasoningEffort string    `json:"reasoning_effort"`
	Status          string    `json:"status"`
	HTML            string    `json:"html"`
	Error           string    `json:"error"`
	DurationMs      int       `json:"duration_ms"`
	InputTokens     int       `json:"input_tokens"`
	OutputTokens    int       `json:"output_tokens"`
	CreatedAt       time.Time `json:"created_at"`
}

// GroupView 前端一个分组区块所需的全部数据。
type GroupView struct {
	GroupID       int64      `json:"group_id"`
	GroupName     string     `json:"group_name"`
	Platform      string     `json:"platform"`
	Model         string     `json:"model"`
	APIKeyID      int64      `json:"api_key_id"`
	APIKeyName    string     `json:"api_key_name"`
	APIKeyMasked  string     `json:"api_key_masked"`
	Total         int        `json:"total"`
	LastCreatedAt *time.Time `json:"last_created_at"`
	Results       []Result   `json:"results"`
}

// RunItem 单次运行的单个分组结果。
type RunItem struct {
	GroupID    int64  `json:"group_id"`
	Model      string `json:"model"`
	Status     string `json:"status"`
	Error      string `json:"error,omitempty"`
	DurationMs int    `json:"duration_ms"`
}

// RunReport 一次运行的汇总。
type RunReport struct {
	StartedAt  time.Time `json:"started_at"`
	FinishedAt time.Time `json:"finished_at"`
	Items      []RunItem `json:"items"`
}

// Service 鹈鹕测智服务。
type Service struct {
	cfg    *config.Config
	client *http.Client

	initOnce sync.Once
	initErr  error
	db       *sql.DB

	runMu      sync.Mutex
	running    bool
	lastReport *RunReport

	schedOnce sync.Once
}

// New 构造服务。DB 连接在首次使用时惰性建立，避免影响进程启动。
func New(cfg *config.Config) *Service {
	return &Service{
		cfg: cfg,
		client: &http.Client{
			// 大模型画动画经常要一两分钟，给足余量
			Timeout: 5 * time.Minute,
		},
	}
}

func (s *Service) database() (*sql.DB, error) {
	s.initOnce.Do(func() {
		if s.cfg == nil {
			s.initErr = errors.New("配置未初始化")
			return
		}
		dsn := s.cfg.Database.DSN()
		db, err := sql.Open("postgres", dsn)
		if err != nil {
			s.initErr = err
			return
		}
		// 独立的小连接池：这个功能是低频后台任务，不该占用主业务连接池
		db.SetMaxOpenConns(4)
		db.SetMaxIdleConns(2)
		db.SetConnMaxLifetime(30 * time.Minute)
		if err := db.Ping(); err != nil {
			_ = db.Close()
			s.initErr = fmt.Errorf("连接数据库失败: %w", err)
			return
		}
		s.db = db
		if err := ensureSchema(context.Background(), db); err != nil {
			s.initErr = fmt.Errorf("初始化表结构失败: %w", err)
		}
	})
	return s.db, s.initErr
}

func ensureSchema(ctx context.Context, db *sql.DB) error {
	stmts := []string{
		`CREATE TABLE IF NOT EXISTS pelican_results (
			id BIGSERIAL PRIMARY KEY,
			group_id BIGINT NOT NULL,
			model TEXT NOT NULL DEFAULT '',
			reasoning_effort TEXT NOT NULL DEFAULT '',
			status TEXT NOT NULL DEFAULT 'ok',
			html TEXT NOT NULL DEFAULT '',
			error TEXT NOT NULL DEFAULT '',
			duration_ms INTEGER NOT NULL DEFAULT 0,
			input_tokens INTEGER NOT NULL DEFAULT 0,
			output_tokens INTEGER NOT NULL DEFAULT 0,
			created_at TIMESTAMPTZ NOT NULL DEFAULT now()
		)`,
		`CREATE INDEX IF NOT EXISTS idx_pelican_results_group_created
			ON pelican_results (group_id, created_at DESC)`,
		`CREATE TABLE IF NOT EXISTS pelican_config (
			id INTEGER PRIMARY KEY,
			data JSONB NOT NULL DEFAULT '{}'::jsonb,
			updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
		)`,
	}
	for _, q := range stmts {
		if _, err := db.ExecContext(ctx, q); err != nil {
			return err
		}
	}
	return nil
}

// GetConfig 读取配置，未初始化时返回默认值。
func (s *Service) GetConfig(ctx context.Context) (Config, error) {
	cfg := DefaultConfig()
	db, err := s.database()
	if err != nil {
		return cfg, err
	}
	var raw []byte
	err = db.QueryRowContext(ctx, `SELECT data FROM pelican_config WHERE id = $1`, configRowID).Scan(&raw)
	if errors.Is(err, sql.ErrNoRows) {
		return cfg, nil
	}
	if err != nil {
		return cfg, err
	}
	if len(raw) > 0 {
		if err := json.Unmarshal(raw, &cfg); err != nil {
			return DefaultConfig(), fmt.Errorf("配置解析失败: %w", err)
		}
	}
	cfg.normalize()
	return cfg, nil
}

// SaveConfig 保存配置。会校验每个分组绑定的 API Key 确实属于该分组且可用，
// 避免「配了 A 分组却用 B 分组的 Key 去测」这种静默错误。
func (s *Service) SaveConfig(ctx context.Context, cfg Config) (Config, error) {
	cfg.normalize()
	db, err := s.database()
	if err != nil {
		return cfg, err
	}
	seen := map[int64]bool{}
	for i := range cfg.Groups {
		g := &cfg.Groups[i]
		if g.GroupID <= 0 {
			return cfg, errors.New("分组 ID 无效")
		}
		if seen[g.GroupID] {
			return cfg, fmt.Errorf("分组 %d 重复配置", g.GroupID)
		}
		seen[g.GroupID] = true
		if g.APIKeyID <= 0 || g.Model == "" {
			continue
		}
		var keyGroupID int64
		var status, userStatus string
		var balance float64
		err := db.QueryRowContext(ctx, `
			SELECT COALESCE(k.group_id, 0), k.status, u.status, u.balance
			FROM api_keys k JOIN users u ON u.id = k.user_id
			WHERE k.id = $1 AND k.deleted_at IS NULL`, g.APIKeyID).
			Scan(&keyGroupID, &status, &userStatus, &balance)
		if errors.Is(err, sql.ErrNoRows) {
			return cfg, fmt.Errorf("API Key #%d 不存在", g.APIKeyID)
		}
		if err != nil {
			return cfg, err
		}
		if keyGroupID != g.GroupID {
			return cfg, fmt.Errorf("API Key #%d 属于分组 %d，与配置的分组 %d 不一致", g.APIKeyID, keyGroupID, g.GroupID)
		}
		if status != "active" {
			return cfg, fmt.Errorf("API Key #%d 状态为 %s，不可用", g.APIKeyID, status)
		}
		if userStatus != "active" {
			return cfg, fmt.Errorf("API Key #%d 的所属用户已被禁用", g.APIKeyID)
		}
		if balance <= 0 {
			return cfg, fmt.Errorf("API Key #%d 的所属用户余额为 0，调用会被网关拒绝", g.APIKeyID)
		}
	}
	raw, err := json.Marshal(cfg)
	if err != nil {
		return cfg, err
	}
	_, err = db.ExecContext(ctx,
		`INSERT INTO pelican_config (id, data, updated_at) VALUES ($1, $2, now())
		 ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
		configRowID, raw)
	if err != nil {
		return cfg, err
	}
	return cfg, nil
}

func (s *Service) gatewayPort() int {
	if s.cfg != nil && s.cfg.Server.Port > 0 {
		return s.cfg.Server.Port
	}
	return 8080
}

func (s *Service) acquire() error {
	s.runMu.Lock()
	defer s.runMu.Unlock()
	if s.running {
		return errors.New("鹈鹕测智正在运行中，请稍后再试")
	}
	s.running = true
	return nil
}

func (s *Service) release() {
	s.runMu.Lock()
	s.running = false
	s.runMu.Unlock()
}

// Run 同步跑一轮。调度器和内部调用用它。
func (s *Service) Run(ctx context.Context) (*RunReport, error) {
	if err := s.acquire(); err != nil {
		return nil, err
	}
	defer s.release()
	return s.runInner(ctx)
}

// StartRun 异步跑一轮，立即返回。
// 一次完整运行要逐个分组等模型画完，轻松超过 nginx/CF 的 100 秒上限，
// 所以 HTTP 接口只能做成「踢一脚就走」，前端靠轮询 status 看进度。
// 注意必须用脱离请求的 context —— 用请求的 ctx 会在响应返回时立刻被取消。
func (s *Service) StartRun() error {
	if err := s.acquire(); err != nil {
		return err
	}
	go func() {
		defer s.release()
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Minute)
		defer cancel()
		if _, err := s.runInner(ctx); err != nil {
			log.Printf("[pelican] 手动运行失败: %v", err)
		}
	}()
	return nil
}

func (s *Service) runInner(ctx context.Context) (*RunReport, error) {
	cfg, err := s.GetConfig(ctx)
	if err != nil {
		return nil, err
	}
	db, err := s.database()
	if err != nil {
		return nil, err
	}
	if len(cfg.Groups) == 0 {
		return nil, errors.New("还没有配置任何分组")
	}

	report := &RunReport{StartedAt: time.Now(), Items: []RunItem{}}
	for _, g := range cfg.Groups {
		if g.APIKeyID <= 0 || g.Model == "" {
			continue
		}
		report.Items = append(report.Items, s.runOne(ctx, db, cfg, g))
	}
	s.cleanup(ctx, db, cfg)
	report.FinishedAt = time.Now()

	s.runMu.Lock()
	s.lastReport = report
	s.runMu.Unlock()
	return report, nil
}

func (s *Service) runOne(ctx context.Context, db *sql.DB, cfg Config, g GroupConfig) RunItem {
	item := RunItem{GroupID: g.GroupID, Model: g.Model, Status: "error"}
	start := time.Now()

	var key string
	err := db.QueryRowContext(ctx,
		`SELECT key FROM api_keys WHERE id = $1 AND deleted_at IS NULL`, g.APIKeyID).Scan(&key)
	if err != nil {
		item.Error = "读取 API Key 失败"
		item.DurationMs = int(time.Since(start).Milliseconds())
		s.insertResult(ctx, db, g, "error", "", item.Error, item.DurationMs, 0, 0)
		return item
	}

	payload := map[string]any{
		"model":      g.Model,
		"max_tokens": cfg.MaxTokens,
		"stream":     false,
		"messages": []map[string]string{
			{"role": "user", "content": DefaultPrompt},
		},
	}
	if g.ReasoningEffort != "" {
		payload["reasoning_effort"] = g.ReasoningEffort
	}
	body, err := json.Marshal(payload)
	if err != nil {
		item.Error = "构造请求失败"
		return item
	}

	url := fmt.Sprintf("http://127.0.0.1:%d/v1/chat/completions", s.gatewayPort())
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		item.Error = "构造请求失败"
		return item
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+key)

	resp, err := s.client.Do(req)
	item.DurationMs = int(time.Since(start).Milliseconds())
	if err != nil {
		item.Error = "调用网关失败: " + err.Error()
		s.insertResult(ctx, db, g, "error", "", item.Error, item.DurationMs, 0, 0)
		return item
	}
	defer func() { _ = resp.Body.Close() }()

	raw, _ := io.ReadAll(io.LimitReader(resp.Body, maxResponseBytes))
	if resp.StatusCode != http.StatusOK {
		item.Error = fmt.Sprintf("网关返回 HTTP %d", resp.StatusCode)
		s.insertResult(ctx, db, g, "error", "", item.Error, item.DurationMs, 0, 0)
		return item
	}

	var parsed struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
		Usage struct {
			PromptTokens     int `json:"prompt_tokens"`
			CompletionTokens int `json:"completion_tokens"`
		} `json:"usage"`
		Error *struct {
			Message string `json:"message"`
		} `json:"error"`
	}
	if err := json.Unmarshal(raw, &parsed); err != nil {
		item.Error = "解析网关响应失败"
		s.insertResult(ctx, db, g, "error", "", item.Error, item.DurationMs, 0, 0)
		return item
	}
	if parsed.Error != nil && parsed.Error.Message != "" {
		item.Error = "网关返回错误，请在管理员日志中排查"
		s.insertResult(ctx, db, g, "error", "", item.Error, item.DurationMs, 0, 0)
		return item
	}
	content := ""
	if len(parsed.Choices) > 0 {
		content = parsed.Choices[0].Message.Content
	}
	html := extractHTML(content)
	if html == "" {
		item.Error = "模型没有返回可渲染的 HTML"
		s.insertResult(ctx, db, g, "error", "", item.Error, item.DurationMs,
			parsed.Usage.PromptTokens, parsed.Usage.CompletionTokens)
		return item
	}
	if len(html) > maxHTMLBytes {
		html = html[:maxHTMLBytes]
	}
	if err := s.insertResult(ctx, db, g, "ok", html, "", item.DurationMs,
		parsed.Usage.PromptTokens, parsed.Usage.CompletionTokens); err != nil {
		item.Error = "入库失败: " + err.Error()
		return item
	}
	item.Status = "ok"
	return item
}

func (s *Service) insertResult(ctx context.Context, db *sql.DB, g GroupConfig, status, html, errMsg string, durationMs, in, out int) error {
	_, err := db.ExecContext(ctx,
		`INSERT INTO pelican_results
			(group_id, model, reasoning_effort, status, html, error, duration_ms, input_tokens, output_tokens)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
		g.GroupID, g.Model, g.ReasoningEffort, status, html, errMsg, durationMs, in, out)
	if err != nil {
		log.Printf("[pelican] 写入结果失败 group=%d model=%s: %v", g.GroupID, g.Model, err)
	}
	return err
}

// cleanup 每组只保留最近 N 条，并按保留天数删除旧数据。
func (s *Service) cleanup(ctx context.Context, db *sql.DB, cfg Config) {
	for _, g := range cfg.Groups {
		if _, err := db.ExecContext(ctx,
			`DELETE FROM pelican_results
			 WHERE group_id = $1
			   AND id NOT IN (SELECT id FROM pelican_results WHERE group_id = $1 ORDER BY id DESC LIMIT $2)`,
			g.GroupID, cfg.KeepPerGroup); err != nil {
			log.Printf("[pelican] 清理分组 %d 超额结果失败: %v", g.GroupID, err)
		}
	}
	if _, err := db.ExecContext(ctx,
		`DELETE FROM pelican_results WHERE created_at < now() - ($1::int * interval '1 day')`,
		cfg.RetentionDays); err != nil {
		log.Printf("[pelican] 清理过期结果失败: %v", err)
	}
}

// Overview 返回按分组聚合的展示数据。
func (s *Service) Overview(ctx context.Context, perGroup int) ([]GroupView, error) {
	cfg, err := s.GetConfig(ctx)
	if err != nil {
		return nil, err
	}
	db, err := s.database()
	if err != nil {
		return nil, err
	}
	if perGroup <= 0 {
		perGroup = 20
	}
	if perGroup > 100 {
		perGroup = 100
	}

	views := make([]GroupView, 0, len(cfg.Groups))
	for _, g := range cfg.Groups {
		v := GroupView{
			GroupID:  g.GroupID,
			Model:    g.Model,
			APIKeyID: g.APIKeyID,
			Results:  []Result{},
		}
		_ = db.QueryRowContext(ctx, `SELECT name, platform FROM groups WHERE id = $1`, g.GroupID).
			Scan(&v.GroupName, &v.Platform)
		if g.APIKeyID > 0 {
			var key, name string
			if err := db.QueryRowContext(ctx,
				`SELECT key, name FROM api_keys WHERE id = $1 AND deleted_at IS NULL`, g.APIKeyID).
				Scan(&key, &name); err == nil {
				v.APIKeyName = name
				v.APIKeyMasked = maskKey(key)
			}
		}
		_ = db.QueryRowContext(ctx,
			`SELECT COUNT(*), MAX(created_at) FROM pelican_results WHERE group_id = $1`, g.GroupID).
			Scan(&v.Total, &v.LastCreatedAt)

		rows, err := db.QueryContext(ctx,
			`SELECT id, group_id, model, reasoning_effort, status, html, error,
			        duration_ms, input_tokens, output_tokens, created_at
			 FROM pelican_results WHERE group_id = $1 ORDER BY id DESC LIMIT $2`,
			g.GroupID, perGroup)
		if err == nil {
			for rows.Next() {
				var r Result
				if err := rows.Scan(&r.ID, &r.GroupID, &r.Model, &r.ReasoningEffort, &r.Status,
					&r.HTML, &r.Error, &r.DurationMs, &r.InputTokens, &r.OutputTokens, &r.CreatedAt); err == nil {
					v.Results = append(v.Results, r)
				}
			}
			_ = rows.Close()
		}
		views = append(views, v)
	}
	return views, nil
}

// Options 配置界面用的候选分组与 API Key。
// 分组额外带上 has_accounts / key_count，前端才能解释「为什么这个分组不能测」：
// 没有上游账号时，即使配了 Key，请求也只会返回「无可用账号」。
func (s *Service) Options(ctx context.Context) (map[string]any, error) {
	db, err := s.database()
	if err != nil {
		return nil, err
	}
	type groupOpt struct {
		ID          int64  `json:"id"`
		Name        string `json:"name"`
		Platform    string `json:"platform"`
		HasAccounts bool   `json:"has_accounts"`
		KeyCount    int    `json:"key_count"`
	}
	type keyOpt struct {
		ID      int64  `json:"id"`
		Name    string `json:"name"`
		GroupID int64  `json:"group_id"`
		Masked  string `json:"masked"`
	}
	groups := []groupOpt{}
	rows, err := db.QueryContext(ctx, `
		SELECT g.id, g.name, COALESCE(g.platform, ''),
		       EXISTS (SELECT 1 FROM account_groups ag
		               JOIN accounts a ON a.id = ag.account_id
		               WHERE ag.group_id = g.id AND a.deleted_at IS NULL
		                 AND a.status = 'active' AND a.schedulable) AS has_accounts,
		       (SELECT COUNT(*) FROM api_keys k
		        WHERE k.group_id = g.id AND k.deleted_at IS NULL AND k.status = 'active') AS key_count
		FROM groups g
		WHERE g.deleted_at IS NULL AND g.status = 'active'
		ORDER BY g.id`)
	if err == nil {
		for rows.Next() {
			var g groupOpt
			if err := rows.Scan(&g.ID, &g.Name, &g.Platform, &g.HasAccounts, &g.KeyCount); err == nil {
				groups = append(groups, g)
			}
		}
		_ = rows.Close()
	}
	keys := []keyOpt{}
	rows, err = db.QueryContext(ctx, `
		SELECT k.id, k.name, COALESCE(k.group_id, 0), k.key
		FROM api_keys k
		JOIN users u ON u.id = k.user_id
		WHERE k.deleted_at IS NULL AND k.status = 'active'
		  AND u.status = 'active' AND u.balance > 0
		ORDER BY k.group_id, k.id`)
	if err == nil {
		for rows.Next() {
			var k keyOpt
			var raw string
			if err := rows.Scan(&k.ID, &k.Name, &k.GroupID, &raw); err == nil {
				k.Masked = maskKey(raw)
				keys = append(keys, k)
			}
		}
		_ = rows.Close()
	}
	return map[string]any{"groups": groups, "keys": keys}, nil
}

// Status 供页面显示「上次运行 / 是否在跑」。
func (s *Service) Status(ctx context.Context) map[string]any {
	s.runMu.Lock()
	running := s.running
	report := s.lastReport
	s.runMu.Unlock()
	out := map[string]any{"running": running, "last_report": report}
	db, err := s.database()
	if err != nil {
		out["error"] = err.Error()
		return out
	}
	var last *time.Time
	_ = db.QueryRowContext(ctx, `SELECT MAX(created_at) FROM pelican_results`).Scan(&last)
	out["last_run_at"] = last
	return out
}

// StartScheduler 启动后台调度：每分钟检查一次是否到点。
func (s *Service) StartScheduler() {
	s.schedOnce.Do(func() {
		go func() {
			ticker := time.NewTicker(time.Minute)
			defer ticker.Stop()
			for range ticker.C {
				func() {
					ctx, cancel := context.WithTimeout(context.Background(), 15*time.Minute)
					defer cancel()
					cfg, err := s.GetConfig(ctx)
					if err != nil || !cfg.Enabled {
						return
					}
					if !s.due(ctx, cfg) {
						return
					}
					if _, err := s.Run(ctx); err != nil {
						log.Printf("[pelican] 定时运行失败: %v", err)
					}
				}()
			}
		}()
	})
}

func (s *Service) due(ctx context.Context, cfg Config) bool {
	db, err := s.database()
	if err != nil {
		return false
	}
	var last *time.Time
	if err := db.QueryRowContext(ctx, `SELECT MAX(created_at) FROM pelican_results`).Scan(&last); err != nil {
		return false
	}
	if last == nil {
		return true
	}
	return time.Since(*last) >= time.Duration(cfg.IntervalMinutes)*time.Minute
}

func maskKey(k string) string {
	if len(k) <= 12 {
		return "***"
	}
	return k[:8] + "..." + k[len(k)-4:]
}

func truncate(s string, n int) string {
	r := []rune(s)
	if len(r) <= n {
		return s
	}
	return string(r[:n]) + "…"
}

// extractHTML 从模型回复里取出可渲染的 HTML。
// 优先取 ```html 围栏；其次任意围栏；最后在没有任何围栏时，从第一个 <!DOCTYPE/<html/<svg 开始截取。
func extractHTML(content string) string {
	c := strings.TrimSpace(content)
	if c == "" {
		return ""
	}
	if h := fencedBlock(c); h != "" {
		return h
	}
	lower := strings.ToLower(c)
	for _, marker := range []string{"<!doctype", "<html", "<svg"} {
		if idx := strings.Index(lower, marker); idx >= 0 {
			return strings.TrimSpace(c[idx:])
		}
	}
	return ""
}

func fencedBlock(s string) string {
	start := strings.Index(s, "```")
	if start < 0 {
		return ""
	}
	rest := s[start+3:]
	// 跳过语言标识那一行
	if nl := strings.Index(rest, "\n"); nl >= 0 {
		rest = rest[nl+1:]
	}
	end := strings.Index(rest, "```")
	if end < 0 {
		return ""
	}
	body := strings.TrimSpace(rest[:end])
	lower := strings.ToLower(body)
	if strings.HasPrefix(lower, "<!doctype") || strings.HasPrefix(lower, "<html") || strings.HasPrefix(lower, "<svg") {
		return body
	}
	return ""
}
