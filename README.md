# API 代理终极指南
## ⚠️ 为什么你的 Cloudflare Worker 一直返回网页？

如果你发现所有 API 请求都返回了 HTML 网页，**100% 是以下两个原因之一**：

### 原因 1：Cloudflare Worker 代码写错了（没有透传路径）
如果你的 Worker 代码里写死了 `fetch("https://xxx.hf.space")`，那么不管你请求 `/v1/chat` 还是 `/google`，Worker 永远只会去请求服务器的根目录 `/`，服务器当然只会把首页的网页（index.html）返回给你！

**✅ 必须使用以下正确的 Worker 代码，保留原有的路径和 Body：**
```javascript
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // ⚠️ 在这里填入你真实的 Hugging Face Space 域名
    url.hostname = '你的用户名-你的项目名.hf.space';
    
    // 核心：使用 url.toString() 把完整的路径 (例如 /v1/chat/completions) 带过去
    // 使用 request 把原本的 POST body 和 Headers 带过去
    const newRequest = new Request(url.toString(), request);
    
    return fetch(newRequest);
  }
};
```

### 原因 2：你没有把最新的代码更新到 Hugging Face！
我们刚刚在后台为你**全新升级了底层代理逻辑**：
1. **全面支持了 `/v1` 简写路径**（以前必须写 `/api/openai/v1`，现在直接写 `/v1` 就能自动代理到 OpenAI）。
2. **终极修复了 CORS 跨域**（强制接管 OPTIONS 预检请求）。

**⚠️ 解决办法：**
请点击右下角的 **Share** 按钮，或者重新将最新的代码 **Sync/部署到 Hugging Face**。
如果你还在用旧版的代码，服务器遇到不认识的 `/v1` 路径，就会默认把它当成普通的网页路由，从而给你返回 `index.html` 网页。
