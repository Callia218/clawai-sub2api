package pelican

import (
	"github.com/Wei-Shaw/sub2api/internal/server/middleware"
	"github.com/gin-gonic/gin"
)

// RegisterRoutes 注册鹈鹕测智路由。
//
// 挂在 /api/v1 下，独立成组而不是塞进 routes.RegisterUserRoutes：
// 这个功能横跨「用户可看」和「管理员可配」两种权限，自己管更清楚，
// 也避免为了一个附加功能去改 handler.Handlers 和 wire 依赖注入链。
func RegisterRoutes(
	v1 *gin.RouterGroup,
	svc *Service,
	jwtAuth middleware.JWTAuthMiddleware,
	adminAuth middleware.AdminAuthMiddleware,
) {
	h := NewHandler(svc)

	// 已登录用户可读
	authed := v1.Group("/pelican")
	authed.Use(gin.HandlerFunc(jwtAuth))
	{
		authed.GET("/overview", h.Overview)
		authed.GET("/status", h.Status)
	}

	// 仅管理员可配置与触发
	admin := v1.Group("/pelican")
	admin.Use(gin.HandlerFunc(adminAuth))
	{
		admin.GET("/config", h.GetConfig)
		admin.PUT("/config", h.SaveConfig)
		admin.GET("/options", h.Options)
		admin.POST("/run", h.Run)
	}
}
