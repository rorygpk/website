# Enterprise Internet Gateway - Software Requirements Specification (SRS)

## 1. Scope (范围)
构建一个基于 **Cloudflare Workers** 运行时的企业级统一互联网访问网关 (Enterprise Internet Gateway)。
负责接管企业内部授权用户的所有外部网络访问流量，并作为核心枢纽提供统一路由、身份认证、日志审计、监控告警和标准化的第三方服务（如 AI API）集成。

## 2. Goals (目标)
- **模块化架构 (Modular architecture)**: 所有功能必须插件化。
- **无状态请求处理 (Stateless request handling)**: 适应 Serverless (边缘计算) 环境，支持无限水平扩展。
- **基于插件的 Provider 适配器 (Plugin-based provider adapters)**: 轻松扩展新的 AI 模型及目标网站。
- **高可用性 (High availability)**: 利用 Cloudflare 边缘网络优势，结合重试和容灾策略。
- **安全设计 (Security by design)**: “零信任”原则，高强数据保护，防泄漏，所有内部流量默认阻断。

## 3. Functional Requirements (功能需求)
- **HTTP/HTTPS 智能路由 (HTTP routing & HTTPS upstream requests)**: 代理并重写现代 Web 站点的所有请求。
- **流式传输 (Streaming / SSE)**: 支持服务器推送事件 (Server-Sent Events) 和大文件流。
- **WebSocket 代理**: 建立持久化的全双工通信隧道。
- **AI Gateway Adapters**: 统一大语言模型 (LLM) API 入口，提供统一的 OpenAI 兼容格式。
- **健康检查 (Health checks)**: 实时探活上游服务。
- **动态配置 (Configuration via environment variables)**: 基于环境变量或 KV 进行热更新。
- **极难破解的 404 伪装认证界面**: 
  - 未授权访问一律返回看似普通的 404 Not Found 页面。
  - 页面内含隐藏触发机制（如特定键盘快捷键或隐蔽点击序列）。
  - 触发后弹出终端，提示动态 Challenge（如随机 Seed 或基于时间的 Token 提示）。
  - 必须输入正确的动态密码（结合 Seed 和企业内部 Secret 的 HMAC 算法，或 TOTP）才能获得 Gateway Session。

## 4. Non-functional Requirements (非功能需求)
- **性能 (Performance)**: 毫秒级延迟增加，极低内存消耗，全面采用标准 Web Stream API。
- **可靠性 (Reliability)**: 全局异常捕获，自动重试，失败回退。
- **可维护性 (Maintainability)**: TypeScript 强类型，完善的注释与 SOLID 原则。
- **扩展性 (Scalability)**: 无状态设计，随需伸缩。
- **可观测性 (Observability)**: 完整的 Metrics 埋点，Tracing ID 追踪，结构化日志输出。

## 5. Architecture (架构)
流量生命周期：
`Client` -> `Cloudflare Worker (Ingress)` -> `Router` -> `Authentication (404 动态防御)` -> `Policy Engine` -> `Adapter (Website / AI / Download)` -> `Approved Upstream Service`

## 6. Security (安全性)
- **强 TLS 加密 (TLS)**: 强制 HTTPS，禁用弱加密套件。
- **机密管理 (Secret management)**: 使用 Cloudflare Secrets 存储所有 API Key 和签名密钥。
- **输入输出校验 (Input & Output validation)**: 防范 XSS、SQLi 及响应劫持。
- **速率限制 (Rate limiting)**: 抵御 DDoS 及滥用（可结合 Cloudflare Rate Limiting）。
- **审计日志 (Audit logging)**: 记录所有高危操作和被阻断的非法访问。
- **最小权限原则 (Least privilege)**: Adapter 仅分配所需域名的访问权限。

## 7. Privacy (隐私与数据保护)
- **数据最小化 (Data minimization)**: 仅记录路由与流量元数据，禁止记录敏感的 Request/Response Body。
- **敏感 Header 脱敏 (Sensitive header redaction)**: 自动过滤 `Authorization`, `Cookie` 等敏感字段的日志输出。
- **可配置日志保留 (Configurable log retention)**: 按规章制度自动清理过期日志。
- **基于角色的访问控制 (Role-based access)**: 细粒度的 Policy 控制，不同部门访问不同等级的资源。

## 8. AI Gateway (AI 网关核心)
- **Adapter interface**: 标准化的 `IProviderAdapter` 接口。
- **Unified request/response model**: 统一转换为 OpenAI API 结构。
- **Streaming abstraction**: 统一封装 ReadableStream，隐藏不同 Provider 的 SSE 格式差异。
- **Error normalization**: 将不同平台的限流 (429)、报错统一转换为标准化的 JSON Error。

## 9. Deployment (部署策略)
- **Wrangler**: 官方 CLI 构建和部署工具。
- **GitHub Actions**: 自动化 CI/CD 流水线。
- **环境隔离 (Environment separation)**: Dev / Staging / Production 隔离。
- **回滚策略 (Rollback strategy)**: 依托 Cloudflare Workers 的版本控制与快速回滚。

## 10. Testing (测试策略)
- **单元测试 (Unit tests)**: 使用 Vitest 测试独立模块 (如 Tokenizer, Router, Auth)。
- **集成测试 (Integration tests)**: 测试 Middleware 责任链及 Request Context 流转。
- **负载测试 (Load tests)**: 并发 Streaming 压力测试。
- **安全测试 (Security tests)**: 防御性测试，验证 404 页面的防暴破及脱敏逻辑。

## 11. Future Extensions (未来扩展)
- **KV / D1 / R2 integration**: 
  - `KV`: 存储动态路由策略、黑白名单。
  - `D1`: 存储用户鉴权规则、角色、审计日志。
  - `R2`: 缓存代理下载的大文件和静态资源。
- **Plugin SDK**: 开放 SDK，允许团队快速开发私有站点的重写规则。
- **Admin dashboard**: 独立的可视化管理控制台。

## 12. Graceful Degradation & Free Tier Strategy (降级机制与免费生态)
- **零配置启动 (Zero-config Bootstrapping)**: 网关代码即使在未绑定任何 KV、D1 的情况下，也会利用 `MemoryStorageAdapter` 进行短周期的内存态缓存及限流，确保**开箱即用**。
- **Cloudflare Free Tier Extensions**:
  - 系统内置标准扩展接口。
  - 用户只需在 `wrangler.toml` 中取消注释相应的 KV 或 D1 绑定配置，系统会自动检测并切换为持久化模式。
  - 完美利用 Cloudflare 的免费配额（如 KV 日读 10万次），实现低成本、高效率的企业网关服务。
