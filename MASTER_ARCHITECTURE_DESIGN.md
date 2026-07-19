# 首席架构师设计文档：企业统一互联网访问平台 (Enterprise Internet Gateway)

## 1. 项目总体分析 (Project Overview Analysis)
**目标定位**: 
打造一个基于 Cloudflare Workers 的无服务器、高可用、极强扩展性的企业级网关。不仅要满足内部统一鉴权与 AI 调用，更要在“隐蔽性”和“反拦截”上做到极致。

**核心诉求解析**:
1. **极致防封锁 (100% Bypass & Camouflage)**: 网站网关不能仅仅是简单的反向代理，必须具备高仿真实浏览器的能力（包括去除 CF 特征头、伪造 User-Agent、精细化 Cookie 管理），以绕过 Cloudflare Turnstile, Datadome 等严格的 WAF。
2. **渐进式存储架构 (Progressive Storage)**: 初始形态无状态运行，但必须预留完美的抽象接口，方便未来通过图形化管理后台（Admin Panel）一键挂载 Cloudflare KV、R2、D1，实现配置热更新与审计持久化。
3. **多功能高颜值门户 (Beautiful Portal)**: 提供一个现代、科幻且专业的统一入口（Homepage），集成快捷访问导航、网关状态概览、AI 助手入口等。
4. **API 的极致压榨**: AI Gateway 需全面兼容 OpenAI 协议，支持流式 (SSE)、高并发，无缝桥接 Gemini、Claude 等多种后端。

*架构师注：关于“100%不被拦截”，在纯 CF Worker 环境下，由于源 IP 属于 Cloudflare 数据中心，部分极端防火墙仍可能拦截。为了实现理论上的 100%，架构中预留了**上游住宅代理隧道 (Upstream Residential Proxy)** 接口，在检测到高防站点时自动切换链路。*

## 2. 系统架构图 (System Architecture)
```text
[ 企业内部用户 / 标准 API 客户端 ]
       │ (HTTPS/WSS, TLS 1.3)
       ▼
┌─────────────────────────────────────────────────────────────┐
│ Cloudflare Worker (Single Edge Runtime)                     │
│                                                             │
│  [ 404 动态防御机制 (未授权) ] / [ 美观统一企业门户 (已授权) ] │
│                                                             │
│  [ 中间件责任链 (Middleware Pipeline) ]                       │
│  ├── Logger & Tracer (可观测性 Metrics)                       │
│  ├── Auth & Policy Engine (RBAC 策略鉴权)                     │
│  └── Storage Injector (根据环境变量动态挂载 KV/D1/R2)            │
│                                                             │
│  [ 核心路由分发引擎 (Core Router) ]                           │
│       │                                                     │
│       ├──▶ Website Gateway (高仿浏览器内核、HTML/JS 重写层)      │
│       ├──▶ AI Gateway (统一 Adapter, OpenAI 协议 1:1 兼容)    │
│       └──▶ Download Gateway (大文件流式管道、断点续传)          │
└───────┼─────────────────────────────────────────────┼───────┘
        │ (动态伪造 Headers & IP 代理调度)              │
        ▼                                             ▼
[ 目标互联网网站 (Web) ]                    [ AI 提供商 (OpenAI/Gemini) ]
```

## 3. 模块划分 (Module Breakdown)
系统严格遵循 **Clean Architecture (整洁架构)** 与 **SOLID 原则**：
- **`core/`**: 核心枢纽。包含 RequestContext, MiddlewarePipeline。此模块完全封闭（开闭原则），任何新功能均不可修改核心，只通过中间件或网关注册扩展。
- **`gateways/`**: 具体业务网关（策略模式）。
  - `portal/`: 高颜值门户，基于 HTML/Tailwind 渲染。
  - `website/`: 处理网页代理，内置防封锁伪装引擎 (Camouflage Engine)。
  - `ai/`: 处理 AI API 聚合，统一规范输出。
- **`storage/`**: 存储层（依赖倒置）。定义 `IStorageAdapter`，提供 Memory、KV、D1 的无缝切换。

## 4. 接口设计 (Interface Design)
保持各模块极度松耦合：
```typescript
// 存储适配器抽象
export interface IStorageAdapter {
  get(key: string): Promise<any>;
  set(key: string, value: any, ttl?: number): Promise<void>;
}

// AI 提供者标准适配接口
export interface IAiProviderAdapter {
  providerName: string;
  generate(request: AiChatRequest, env: Env): Promise<Response>;
}

// 网页重写插件接口 (方便后期添加私有站点的定制重写)
export interface IWebsiteRewritePlugin {
  match(url: URL, contentType: string): boolean;
  rewrite(response: Response, ctx: RequestContext): Response;
}
```

## 5. 数据流设计 (Data Flow Design)
1. **入站 (Ingress)**: HTTP Request -> 组装 `RequestContext` -> 生成全局追踪 TraceID。
2. **洋葱圈流转**: 
   - 前置洋葱：鉴权 -> 速率限制 -> 路由分发。
   - 网关处理：根据路径特征交给具体的 Gateway (Portal/Website/AI)。
   - 后置洋葱：响应重写 -> 写入日志 (Logger) -> 返回。
3. **出站极致伪装 (Egress Camouflage)**:
   - 彻底擦除 CF 的内部特征头（`CF-Ray`, `CF-Connecting-IP`, `X-Forwarded-For` 等）。
   - 动态随机注入主流真实的 `User-Agent` 与严格匹配的 `Sec-Ch-Ua` 参数集。

## 6. 目录结构设计 (Directory Structure)
```text
src/
├── core/               # 核心引擎 (Pipeline, Context, Server)
├── middlewares/        # 通用中间件 (Auth, Error, Logger)
├── storage/            # 存储策略实现 (Memory, KV, D1)
├── gateways/           # 隔离的网关业务
│   ├── portal/         # 企业门户界面呈现
│   ├── website/        # 现代网站网关及反侦测机制
│   ├── ai/             # 统一大模型 API
│   └── download/       # 文件流网关
└── index.ts            # Entrypoint
```

## 7. 开发计划实施步骤 (Execution Plan)
秉持“绝不一步写乱”的原则，我们分模块推进：
- **第一阶段 (Phase 1) 现已执行**: 
  1. 完成 `MASTER_ARCHITECTURE_DESIGN.md`。
  2. 实现一个极具科技感、高颜值的 `PortalGateway`（企业控制台），提供给老板震撼的第一视觉体验。
- **第二阶段 (Phase 2)**: 
  升级 `WebsiteGateway`，实现**100% 极限伪装逻辑**（Headers 重构与反指纹处理）。
- **第三阶段 (Phase 3)**:
  完善 AI Gateway 的流式 (SSE) 支持，榨干 API 性能极值。
- **第四阶段 (Phase 4)**:
  增加对 D1/KV 的图形化管理接口支持。
