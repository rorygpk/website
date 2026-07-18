# Enterprise Internet Gateway - 接口与测试设计 (Interface & Test Design)

## 1. 核心接口契约 (Core Interfaces)

为了实现强约束与高维护性，系统的所有关键节点均基于 TypeScript Interface 进行通信。

### 1.1 Context & Middleware Pipeline (上下文与责任链)
```typescript
// 统一请求上下文
export interface RequestContext {
  readonly request: Request;
  readonly url: URL;
  readonly clientIp: string;
  readonly traceId: string;
  readonly config: GatewayConfig;
  
  session?: UserSession;      // 认证后挂载的会话信息
  state: Record<string, any>; // 跨中间件共享状态
}

// 责任链中间件
export type Middleware = (
  ctx: RequestContext, 
  next: () => Promise<Response>
) => Promise<Response>;
```

### 1.2 Authentication & 404 Dynamic Defence (认证与404动态防御)
针对极难破解的要求，实现动态 HMAC 验证。
```typescript
export interface IAuthService {
  // 生成动态 Challenge (Hint)
  generateChallenge(clientIp: string): string; 
  
  // 验证客户端提交的计算结果 (基于 Secret)
  verifyDynamicToken(challenge: string, responseToken: string): boolean;
  
  // 提取或颁发 Session
  handleSession(ctx: RequestContext): Promise<Response | null>; 
}
```

### 1.3 AI Provider Adapter (AI 网关适配器)
```typescript
export interface AiChatRequest {
  model: string;
  messages: Array<{ role: string; content: string }>;
  stream?: boolean;
  temperature?: number;
}

export interface IProviderAdapter {
  providerName: string;
  
  // 统一的生成接口
  generate(request: AiChatRequest, env: Environment): Promise<Response>;
  
  // 错误标准化规范
  normalizeError(error: any): Response; 
}
```

### 1.4 Website Rewriter (网页重写器)
```typescript
export interface IRewritePlugin {
  name: string;
  
  // 判断此插件是否应该处理当前响应类型
  shouldApply(contentType: string, targetUrl: URL): boolean;
  
  // 使用 HTMLRewriter 或直接转换 Stream
  apply(response: Response, ctx: RequestContext): Response;
}
```

---

## 2. 极难破解的 404 界面机制设计 (The "Uncrackable" 404 Interface)

该界面的目的是：将非法流量和未授权扫描者阻挡在外，同时允许合法的内部员工通过特殊方式激活网关。

### 交互流程设计：
1. **默认呈现**: 访问任何未带有效 Session Cookie 的网关路径，均返回标准的 `404 Not Found` (纯 HTML，无敏感特征，不暴露是 Gateway)。
2. **隐藏触发 (Hidden Trigger)**: 
   - 网页内有一个隐藏的 `DOM` 元素，或者监听特定的键盘组合（如 `Ctrl + Shift + F12`）。
   - 结合特殊的鼠标点击序列（如在特定坐标区域快速点击 5 次）。
3. **动态提示 (Dynamic Hint)**: 
   - 触发成功后，屏幕角落显示一个转瞬即逝的加密代码或 Console 中打印一个 `Seed`（例如 `S-1784295709`，由服务器时间戳、IP 和随机数生成，仅有效 30 秒）。
4. **动态密码 (Dynamic Password)**: 
   - 员工使用本地的Authenticator或特定脚本，将该 `Seed` 结合公司的 `MasterSecret` 计算出 HMAC-SHA256，取前 6 位数字作为密码。
   - 输入密码验证通过后，服务器种下加密的 `HttpOnly` Cookie，员工重定向进入网关控制台或获准代理。

---

## 3. 测试设计 (Test Design)

基于 Cloudflare Workers 官方测试框架 `vitest` 构建测试体系。

### 3.1 单元测试 (Unit Tests)
- **目标**: 核心纯函数与数据处理。
- **重点**:
  - `HtmlRewriterPlugin`: 传入 mock HTML 字符串，验证链接替换逻辑（相对路径转绝对路径、域名替换）。
  - `AiRouter`: 验证不同模型名是否能路由到正确的 `IProviderAdapter`。
  - `AuthService`: 验证动态 `Seed` 的生成、HMAC 校验是否准确，过期 `Seed` 是否被拒绝。

### 3.2 集成测试 (Integration Tests)
- **目标**: 验证请求在 Pipeline 中的流转。
- **重点**:
  - 使用本地 `Miniflare` 环境。
  - 构造包含非法凭证的 `Request`，验证 Pipeline 是否抛出错误并在终点返回防御性的 404 HTML。
  - 构造合法的网关代理请求，验证 `ReverseProxyEngine` 的 Header 过滤（如移除 `CF-Connecting-IP` 避免泄露源 IP）。

### 3.3 安全性与高强数据保护测试
- **日志审计测试**: 发起带有敏感 Header（如 `Authorization: Bearer sk-1234`）的测试请求，检查输出的日志流，确保 `sk-1234` 被脱敏替换为 `sk-****`。
- **404 暴力破解测试**: 模拟自动化扫描器发起 1000 次请求及错误密码提交，验证 Cloudflare 层的 Rate Limit 是否生效，以及 Worker 内存占用是否激增。

## 4. 可扩展存储与缓存接口 (Extensible Storage & Cache)

系统设计必须支持无状态运行（无依赖也能正常工作），同时提供标准接口以随时接入免费的 Cloudflare 存储生态（KV, D1, R2）。

### 4.1 抽象存储接口 (Abstract Storage Interface)
```typescript
export interface IStorageProvider {
  // 获取数据 (支持泛型)
  get<T>(key: string): Promise<T | null>;
  
  // 写入数据 (可设置过期时间，单位：秒)
  put<T>(key: string, value: T, expirationTtl?: number): Promise<void>;
  
  // 删除数据
  delete(key: string): Promise<void>;
}
```

### 4.2 零依赖降级策略 (Zero-Dependency Graceful Degradation)
网关将在启动时检测环境变量中是否绑定了 Cloudflare KV/D1：
- **已绑定 (Bound)**: 实例化 `CloudflareKVStorageAdapter`。
- **未绑定 (Unbound)**: 自动降级实例化 `MemoryStorageAdapter`（基于 JS Map，生命周期仅在 Worker 实例存活期间有效）或 `NoopStorageAdapter`（空操作，针对无需缓存的场景）。
- **优势**: 确保代码克隆后直接部署即可运行，无需复杂的预配置！

### 4.3 免费 Cloudflare 生态扩展说明 (Free Cloudflare Tier Extensions)
本网关随时可接入以下免费资源以增强能力：
1. **Cloudflare KV (键值对存储)**: 
   - *免费额度*: 每天 100,000 次读取。
   - *用途*: 存储动态网关配置（路由规则、黑白名单）、缓存频繁访问的静态资源 (Website Gateway)、Token 黑名单 (Auth)。
2. **Cloudflare D1 (Serverless SQL 数据库)**: 
   - *免费额度*: 每天 5 百万次读取。
   - *用途*: 存储复杂的审计日志 (Audit Logging)、高细粒度 RBAC 权限控制表、AI Gateway 详细调用统计与成本分析。
3. **Cloudflare R2 (对象存储)**: 
   - *免费额度*: 每月 10 GB 存储空间，无需 egress 费用。
   - *用途*: Download Gateway 的大文件持久化缓存层，减少源站回源请求。

## 4. 可扩展存储与缓存接口 (Extensible Storage & Cache)

系统设计必须支持无状态运行（无依赖也能正常工作），同时提供标准接口以随时接入免费的 Cloudflare 存储生态（KV, D1, R2）。

### 4.1 抽象存储接口 (Abstract Storage Interface)
```typescript
export interface IStorageProvider {
  // 获取数据 (支持泛型)
  get<T>(key: string): Promise<T | null>;
  
  // 写入数据 (可设置过期时间，单位：秒)
  put<T>(key: string, value: T, expirationTtl?: number): Promise<void>;
  
  // 删除数据
  delete(key: string): Promise<void>;
}
```

### 4.2 零依赖降级策略 (Zero-Dependency Graceful Degradation)
网关将在启动时检测环境变量中是否绑定了 Cloudflare KV/D1：
- **已绑定 (Bound)**: 实例化 `CloudflareKVStorageAdapter`。
- **未绑定 (Unbound)**: 自动降级实例化 `MemoryStorageAdapter`（基于 JS Map，生命周期仅在 Worker 实例存活期间有效）或 `NoopStorageAdapter`（空操作，针对无需缓存的场景）。
- **优势**: 确保代码克隆后直接部署即可运行，无需复杂的预配置！

### 4.3 免费 Cloudflare 生态扩展说明 (Free Cloudflare Tier Extensions)
本网关随时可接入以下免费资源以增强能力：
1. **Cloudflare KV (键值对存储)**: 
   - *免费额度*: 每天 100,000 次读取。
   - *用途*: 存储动态网关配置（路由规则、黑白名单）、缓存频繁访问的静态资源 (Website Gateway)、Token 黑名单 (Auth)。
2. **Cloudflare D1 (Serverless SQL 数据库)**: 
   - *免费额度*: 每天 5 百万次读取。
   - *用途*: 存储复杂的审计日志 (Audit Logging)、高细粒度 RBAC 权限控制表、AI Gateway 详细调用统计与成本分析。
3. **Cloudflare R2 (对象存储)**: 
   - *免费额度*: 每月 10 GB 存储空间，无需 egress 费用。
   - *用途*: Download Gateway 的大文件持久化缓存层，减少源站回源请求。
