# clawAI Sub2API（二次开发版）

基于 [Wei-Shaw/sub2api v0.2.20](https://github.com/Wei-Shaw/sub2api/releases/tag/v0.2.20) 的非官方二次开发，维护者 [Callia218](https://github.com/Callia218)。本项目与 Sub2API 官方、OpenAI、Linux.SB 均无隶属或背书关系。

**当前版本：0.2.20-clawai.1。** 保留上游 LGPL-3.0 许可证及原作者署名；本仓库包含可构建的修改源码。Git 历史从脱敏后的发布快照开始，避免发布部署工作目录中的历史私密内容。上游代码的版权与来源不因本快照而改变。

## 与官方版的区别

| 范围 | 官方 v0.2.20 基线 | 本二开内容 |
| --- | --- | --- |
| 上游功能 | 管理 MCP、细粒度管理员密钥、邮箱黑名单、请求体预算、读写超时与模型修复 | 完整合并该版本；MCP 仍需显式配置，默认不开启 |
| 并发计费 | 上游准入与异步结算链路 | 订阅日/周/月、余额和 Key 在途费用预留；DB 权威复核；异步计费完成前保持续期；无定价拒绝；实际超预估时记录欠款并禁用用户 |
| 会话安全 | JWT 与刷新令牌 | 默认校验 Redis 中的精确访问令牌签发记录；原子清理撤销索引；绑定策略开启时拒绝空绑定 |
| OIDC | 通用 OIDC 登录能力 | Linux.SB 接入指南及专用图标；强制有效期和签发时间、核验 azp；收敛换码错误信息；按 issuer + sub 关联，不按未验证邮箱合并 |
| Kiro | 无本分支的定制接入 | 授权、刷新、模型与网关兼容、count_tokens 本地估算及相关迁移 |
| 兼容与计费 | 上游模型和计费规则 | DeepSeek count_tokens 回退、service tier 计费、支付配置加密相关修正 |
| 鹈鹕测智 | 无本分支定制画廊 | 管理员配置/触发，登录用户看结果；opaque-origin iframe + CSP；普通用户响应隐藏上游错误及 Key 元信息 |
| 界面 | 官方界面 | 自定义欢迎页、玻璃风格布局、接入引导和响应式体验；移除来源授权不明的参考头像与字体 |
| 依赖与构建 | 官方依赖锁定 | 修补 Go 依赖；SheetJS CE 0.20.3；升级 Vite/Vitest，移除未使用图标依赖；构建锁定 pnpm 11.20.0 |

预留金额是估算，并非所有模型实际账单的数学上界。它降低并发抢跑风险，不能保证任何上游、定价或故障条件下绝不超额。精确签发记录也不能抵御同时控制数据库和 Redis 的攻击者。见 [安全范围与验证](docs/fork/SECURITY_REVIEW.md)。

## 从源码运行

需要 Go 1.27.3、Node.js 24、pnpm 11.20.0，运行时需要 PostgreSQL 18 和 Redis 8。

```bash
git clone https://github.com/Callia218/clawai-sub2api.git
cd clawai-sub2api
corepack enable
corepack prepare pnpm@11.20.0 --activate
cd frontend
pnpm install --frozen-lockfile
pnpm run build
cd ../backend
go build -tags embed -trimpath -o sub2api ./cmd/server
```

前端构建输出到 `backend/internal/web/dist`。也可以使用多阶段镜像：

```bash
docker build --build-arg VERSION=0.2.20-clawai.1 -t clawai-sub2api:0.2.20-clawai.1 .
cp deploy/.env.example deploy/.env
# 编辑 .env，为数据库、Redis、JWT、TOTP 分别生成独立随机密钥，并设置管理员信息
chmod 600 deploy/.env
docker compose --project-directory deploy -f deploy/docker-compose.yml -f deploy/docker-compose.fork.yml up -d
```

`docker-compose.fork.yml` 将应用绑定到 127.0.0.1:8080，前面部署 HTTPS 反向代理。数据库和 Redis 不映射到宿主机。生产配置应放在应用可写目录以外并以只读方式挂载，参考 [部署安全](deploy/EDGE_SECURITY.md)。不要直接使用上游一键安装脚本覆盖二开部署。

仓库不包含生产数据库、账户/上游令牌、OAuth Client Secret、JWT 密钥、支付私钥、运行日志或私有部署备份。部署者必须填写自己的域名和凭据。源码内的示例凭据和测试夹具均不提供对运营站点的访问权限。

## Linux.SB 登录

见 [Linux.SB OIDC 配置](docs/fork/LINUXSB_OIDC.md)。每个独立部署需要创建自己的应用；不能复用运营站点的 Client Secret。用户提供的图标仅用于 Linux.SB 登录入口，其他 OIDC 提供商继续显示通用标识。

## 验证与维护

```bash
cd frontend
pnpm run build
pnpm test:run
pnpm audit
cd ../backend
go test ./internal/handler ./internal/service ./internal/repository ./internal/server/... ./internal/pelican
go install golang.org/x/vuln/cmd/govulncheck@v1.9.0
govulncheck ./...
```

数据库集成测试需隔离环境。`backend/cmd/security-verify` 仅允许名称含 `sub2api_security_test` 的测试库，验证并发预算、幂等结算、令牌伪造拦截与登出撤销；不要对生产库执行破坏性测试。

升级以本仓库构建产物为准。应用更新来源指向本二开仓库，避免自动下载官方二进制覆盖定制和安全修复。首次发布暂不提供预构建镜像，以上源码构建流程可直接使用。

上游完整说明：[中文](docs/fork/upstream-README_CN.md) / [English](docs/fork/upstream-README.md) / [日本語](docs/fork/upstream-README_JA.md)。其中的官方镜像、安装地址和赞助信息属于上游，不代表本分支的发行地址。第三方许可见 [THIRD_PARTY.md](docs/fork/THIRD_PARTY.md)。漏洞反馈见 [SECURITY.md](SECURITY.md)。

Google Gemini CLI / Antigravity OAuth 客户端 ID 与 Secret 均由部署者通过 GEMINI_CLI_OAUTH_CLIENT_ID、GEMINI_CLI_OAUTH_CLIENT_SECRET、ANTIGRAVITY_OAUTH_CLIENT_ID、ANTIGRAVITY_OAUTH_CLIENT_SECRET 提供，源码不包含可用默认值。缺失时拒绝授权/刷新；已有生产配置由运维私下迁移。
