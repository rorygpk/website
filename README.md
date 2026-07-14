# Cloudflare 终极万能代理 (Worker 专版)

你完全不需要使用 Hugging Face，也无需部署复杂的 Node.js 服务。

**只需要一个纯粹的 Cloudflare Worker，即可完美解决所有外网访问、API 代理、CORS 跨域问题！**

## 🚀 一分钟部署教程 (零成本)

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)。
2. 在左侧菜单找到 **Workers & Pages** -> 点击 **Create** -> **Create Worker**。
3. 给你的 Worker 起个名字，点击 **Deploy**。
4. 部署完成后，点击 **Edit Code** 进入代码编辑器。
5. 将本项目中的 [`worker.js`](./worker.js) 里面的代码**全部复制**，粘贴覆盖掉网页上的默认代码。
6. 点击右上角的 **Save and Deploy**。
7. (可选) 在 Settings -> Triggers 中，为这个 Worker 绑定一个你自己的域名 (Custom Domains)。

## 🎯 功能与使用方法

部署完成后，你将获得一个类似于 `https://your-worker.workers.dev` 的地址（或者你绑定的自定义域名）。

### 1. 自动处理跨域 (CORS)
无论你在任何本地前端项目（如 localhost:5173）中通过 fetch 调用这个代理，**永远不会出现跨域报错**，系统已全局强行放行 OPTIONS。

### 2. AI API 极简直连
我们内置了各大厂商的路由映射，你甚至不需要拼长 URL：
- **OpenAI:** `https://你的域名/v1/chat/completions`
- **Anthropic:** `https://你的域名/api/anthropic/v1/messages`
- **Gemini:** `https://你的域名/api/gemini/v1beta/models/...`

**调用示例 (直接替换官方 Base URL 即可):**
```bash
curl -X POST "https://你的域名/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-YOUR_KEY" \
  -d '{"model": "gpt-3.5-turbo", "messages": [{"role": "user", "content": "Hello!"}]}'
```

### 3. 万能 API / 网页代理 (套娃模式)
对于任何没有内置预设的外网 API 或网页，直接在域名后面拼上完整的 URL 即可：
- 代理 Github API: `https://你的域名/https://api.github.com/users`
- 代理外网网页: `https://你的域名/https://www.google.com`

**就是这么简单、纯粹、稳定！享受你的全能边缘节点吧！**
