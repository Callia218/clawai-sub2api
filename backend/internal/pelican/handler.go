package pelican

import (
	"net/http"
	"strconv"

	"github.com/Wei-Shaw/sub2api/internal/pkg/response"
	"github.com/Wei-Shaw/sub2api/internal/server/middleware"
	"github.com/Wei-Shaw/sub2api/internal/service"
	"github.com/gin-gonic/gin"
)

// Handler 鹈鹕测智的 HTTP 接口。
type Handler struct {
	svc *Service
}

// NewHandler 构造 handler。
func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

// Overview GET /pelican/overview
// 按分组返回最近若干条生成结果。所有登录用户可见 —— 这是个展示性功能。
func (h *Handler) Overview(c *gin.Context) {
	perGroup := 20
	if v := c.Query("per_group"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			perGroup = n
		}
	}
	views, err := h.svc.Overview(c.Request.Context(), perGroup)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Unable to load benchmark results")
		return
	}
	if c.GetString(string(middleware.ContextKeyUserRole)) != service.RoleAdmin {
		redactPublicOverview(views)
	}
	response.Success(c, gin.H{"groups": views, "prompt": DefaultPrompt})
}

// Status GET /pelican/status
func (h *Handler) Status(c *gin.Context) {
	status := h.svc.Status(c.Request.Context())
	if c.GetString(string(middleware.ContextKeyUserRole)) != service.RoleAdmin {
		redactPublicStatus(status)
	}
	response.Success(c, status)
}

// Gallery users must never receive provider error bodies or key metadata.
// Redact historical rows too, rather than relying only on safer new writes.
func redactPublicOverview(views []GroupView) {
	for i := range views {
		views[i].APIKeyID = 0
		views[i].APIKeyName = ""
		views[i].APIKeyMasked = ""
		for j := range views[i].Results {
			if views[i].Results[j].Error != "" {
				views[i].Results[j].Error = "Generation failed; contact an administrator"
			}
		}
	}
}

func redactPublicStatus(status map[string]any) {
	if _, ok := status["error"]; ok {
		status["error"] = "Benchmark temporarily unavailable"
	}
	if report, ok := status["last_report"].(*RunReport); ok && report != nil {
		copyReport := *report
		copyReport.Items = append([]RunItem(nil), report.Items...)
		for i := range copyReport.Items {
			if copyReport.Items[i].Error != "" {
				copyReport.Items[i].Error = "Generation failed; contact an administrator"
			}
		}
		status["last_report"] = &copyReport
	}
}

// GetConfig GET /pelican/config
func (h *Handler) GetConfig(c *gin.Context) {
	cfg, err := h.svc.GetConfig(c.Request.Context())
	if err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}
	response.Success(c, cfg)
}

// SaveConfig PUT /pelican/config
func (h *Handler) SaveConfig(c *gin.Context) {
	var req Config
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "请求体格式错误: "+err.Error())
		return
	}
	cfg, err := h.svc.SaveConfig(c.Request.Context(), req)
	if err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	response.Success(c, cfg)
}

// Options GET /pelican/options
func (h *Handler) Options(c *gin.Context) {
	out, err := h.svc.Options(c.Request.Context())
	if err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}
	response.Success(c, out)
}

// Run POST /pelican/run
// 异步触发，立即返回；前端轮询 /pelican/status 与 /pelican/overview。
func (h *Handler) Run(c *gin.Context) {
	if err := h.svc.StartRun(); err != nil {
		response.Error(c, http.StatusConflict, err.Error())
		return
	}
	response.Accepted(c, gin.H{"running": true})
}
