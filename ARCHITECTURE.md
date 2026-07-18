# Enterprise Internet Gateway - 架构设计与模块划分

## 1. 整体系统架构 (System Architecture)

系统采用分层架构，从请求接入到最终响应，数据流依次经过以下层次：

1. **接入层 (Ingress Layer)**
   - 接收 HTTP(S) 和 WebSocket 请求。
   - 统一提取请求元数据（Client IP, Trace ID等）。
2. **安全与控制层 (Security & Control Layer)**
   - **Authentication**: 企业统一登录与 Token 验证。
   - **Session Manager**: 管理用户会话状态。
   - **Policy Engine**: 执行权限控制（鉴权）、审计和访问限制。
3. **路由层 (Routing Layer)**
   - **Traffic Router**: 根据请求特征（Host、Path前缀、Header等），将流量智能分发到对应的子网关 (Website, AI, Download)。
4. **子网关层 (Sub-Gateways Layer)**
   - **Website Gateway**: 负责现代网页的代理与重写。
   - **AI Gateway**: 负责大模型 API 的统一代理、格式转换与管控。
   - **Download Gateway**: 负责大文件、静态资源的流式传输和断点续传。
5. **数据与缓存层 (Data & Cache Layer)**
   - **Cache Layer**: 提供接口统一的内存缓存 (Memory)、持久化 KV 或 Redis。
   - **Configuration**: 动态配置中心，支持热更新。
6. **可观测性层 (Observability Layer)**
   - **Metrics & Tracing**: 收集流量统计、延迟、错误率，记录分布式链路追踪日志。

## 2. 核心模块划分 (Module Breakdown)

为了满足 **SOLID 原则**和**插件化架构**，系统将被拆分为以下核心模块：

### 2.1 核心运行时 (Core)
- `GatewayServer`: 系统的入口，绑定运行环境 (如 Node.js 或 Edge Worker)，接管底层请求。
- `RequestContext`: 封装单个请求的完整上下文，在各个中间件和网关间传递。
- `MiddlewarePipeline`: 采用责任链模式，串联日志、认证、路由等逻辑。

### 2.2 Website Gateway 模块
- `ReverseProxyEngine`: 发起对目标网站的安全请求，处理证书和连接复用。
- `RewriteManager`: 重写引擎的核心协调者。
  - `HtmlRewriterPlugin`: 替换 DOM 节点中的 URLs（`href`, `src`, `action` 等）。
  - `CssRewriterPlugin`: 提取并重写 CSS 中的 `url()` 和 `@import`。
  - `JsInterceptorPlugin`: 注入客户端 JS SDK，拦截并代理 `fetch`, `XHR`, `Worker`, `WebSocket` 以及动态 `import()`。
  - `HeaderCookieRewriter`: 处理跨域资源共享 (CORS)、Cookie 的 SameSite 和 Domain 重写。
- `WebSocketProxy`: 处理 HTTP Upgrade 请求，建立并维持 WebSocket 双向通道。

### 2.3 AI Gateway 模块
- `AiRouter`: 解析标准的 OpenAI 格式请求，路由到指定的 Provider。
- `ProviderRegistry`: **插件化容器**，用于动态注册和管理不同的 AI 提供商。
- `IProviderAdapter` (Interface): 所有 AI 插件必须实现的接口，包含 `generate` 和 `stream` 方法。
  - 内置插件: `OpenAIAdapter`, `GeminiAdapter`, `ClaudeAdapter`, `DeepSeekAdapter` 等。
- `ResilienceEngine`: 包含重试机制 (Retry)、超时控制 (Timeout) 和熔断器 (Circuit Breaker)。
- `TokenEstimator`: 提供快速的 Token 估算算法，用于成本控制和统计。

### 2.4 Download Gateway 模块
- `RangeRequestHandler`: 解析 HTTP `Range` 头，支持 `206 Partial Content`。
- `StreamPumper`: 使用 `TransformStream` API，实现高效的背压 (Backpressure) 控制，防止大文件吃满内存。
- `CompressionMiddleware`: 根据请求头的 `Accept-Encoding` 动态启用 Gzip/Brotli 压缩。

### 2.5 基础设施模块 (Infrastructure)
- `Logger`: 结构化日志模块，支持不同日志级别和输出目标。
- `ConfigManager`: 管理环境变量、动态策略，支持热加载机制，配置更改无需重启。

## 3. 设计模式与扩展机制 (Design Patterns & Extension Mechanism)

- **策略模式 (Strategy Pattern)**: AI Gateway 中的 `ProviderAdapter` 和 Website Gateway 中的具体站点适配规则。
- **工厂模式 (Factory Pattern)**: 根据配置和请求，动态生成对应的网关处理器实例。
- **装饰器/中间件模式 (Middleware Pattern)**: 易于在核心流程前后插入鉴权、限流和日志收集功能。
- **依赖倒置 (Dependency Inversion)**: 各模块依赖于接口（如 `ICache`, `ILogger`），而不是具体实现，方便编写单元测试（Mocking）。

---

**请评审以上《架构设计与模块划分》。** 
如果符合您的期望，我们将进入下一步：**接口设计与测试设计**（定义核心模块之间的通信契约以及如何保障它们的高可用）。

## 4. 可选存储扩展 (Optional Storage Extensions)

系统默认**完全无状态** (Stateless) 运行，不强依赖任何外部存储即可完成核心网关代理与动态 404 防御。
但通过接口抽象，可无缝接入 Cloudflare 免费层资源进行能力扩充：

- **IStorageProvider 抽象**: 
  - `MemoryStorage`: 内存降级方案（Worker实例存活期有效），无需配置，即刻可用。
  - `KVStorage`: 绑定 Cloudflare KV 后自动启用，用于动态路由热更新、限流计数器。
  - `D1Storage`: 绑定 Cloudflare D1 后自动启用，用于长期审计日志与权限规则持久化。
