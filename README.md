---
title: Free API Proxy & Web Access
emoji: 🚀
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 3000
---

# 🚀 Hugging Face 终极部署版 (专注于 API 传输与无障碍外网访问)

本项目专为解决国内无法访问外部优质服务（如 Google, OpenAI, Anthropic, GitHub 等）而生。通过部署到 Hugging Face Spaces，您可以获得一个完全免费、拥有极高外网带宽、且在国内部分网络下可直连或通过基础 CDN 访问的超级代理。

本方案特别强化了 **API 传输机制**：彻底放开了 CORS 跨域限制，无论你是做前端开发代理请求，还是作为本地大模型客户端的接口中转，都能完美胜任！

## 🌟 核心优势
1. **纯免费无休眠**：Hugging Face 提供免费的 Docker Space 容器，分配 2vCPU + 16GB RAM，只要有持续访问就不会随意休眠。
2. **极速海外节点**：HF 服务器在海外，天然拥有最高级别的外网连通率与极低的延迟（直连 Google / API 服务）。
3. **完美跨域传输 (CORS)**：我们优化了代理服务器代码，强制注入全量跨域头 (`Access-Control-Allow-Origin: *` 等)，拦截并接管 OPTIONS 请求。它可以作为任何本地 Web 项目完美的透明代理层。
4. **一键式部署**：原生自带 Hugging Face 支持（包含本页的 YAML 配置与标准的 Dockerfile）。

---

## 🛠️ 如何在 Hugging Face 部署？(白嫖全过程)

### 第一步：导出代码到 GitHub
在您当前的 AI Studio 界面，点击右上角设置/菜单，将本仓库导出到您的私人或公开 GitHub 仓库。

### 第二步：创建 Hugging Face Space
1. 注册并登录 [Hugging Face](https://huggingface.co/).
2. 点击右上角的头像 -> **New Space**.
3. 随意填写一个 Space Name（比如 `my-api-proxy`）。
4. **License** 可以留空或选 MIT。
5. **Space SDK** 非常重要：必须选择 **Docker**，然后选择 **Blank**。
6. **Space Hardware** 选择免费的 **CPU basic - 2 vCPU · 16 GB · Free**。
7. 点击 **Create Space**。

### 第三步：关联 GitHub 或直接上传文件
- **方式 A (推荐)**：在您创建的 Space 设置页中，找到 "Link to GitHub Repository"，直接连接您刚才导出的仓库。
- **方式 B**：在 Space 页面点击 "Files"，将本项目的文件（尤其是 `Dockerfile`, `server.ts`, `package.json`, `README.md` 等）直接上传。

### 第四步：构建与自动运行
Hugging Face 会自动读取当前目录的 `README.md` 头部元数据（已经指定了 `app_port: 3000`），并根据 `Dockerfile` 执行打包。
等待状态变为 **Running**。

---

## 🌐 终极防屏蔽访问方式 (国内如何连接)

Hugging Face 默认提供的 `hf.space` 域名在国内部分地区可直连，部分地区被阻断。
为了实现**终极不被拦**，可以使用以下方法之一访问您的接口：

### 1. 直连 (适用于轻度污染地区)
在 HF 的设置里找到 "Embed this Space"，获取 Direct URL（例如 `https://你的用户名-你的项目名.hf.space`）。

### 2. 通过 Cloudflare 优选 (最稳定)
由于 HF Space 本质上运行在特定域名下，如果你在国内有访问障碍，可以将这个 Space 的直接域名作为 Cloudflare Worker 的反代目标，或者在 Cloudflare Pages 中写一个简单的 Proxy。

### 3. Vercel/Netlify 反代 (白嫖套娃)
在 Vercel 部署一个空的 `vercel.json` 纯重定向，将国内未被墙的 Vercel 域名重定向到你的 Hugging Face API 接口，从而借壳访问。

---

## 💻 API 代理使用示例

部署成功后，将你的 HF Space URL 作为基地址进行请求：

### 代理外部 API 接口
例如调用 OpenAI 的接口：
```bash
curl -X POST "https://你的空间名.hf.space/proxy/https://api.openai.com/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-YOUR_KEY" \
  -d '{"model": "gpt-3.5-turbo", "messages": [{"role": "user", "content": "Hello!"}]}'
```

### 代理 Google 搜索
直接在浏览器打开：
`https://你的空间名.hf.space/proxy/https://www.google.com`

由于我们强化了跨域头，你可以直接在自己的 Vue/React 本地前端项目中，通过 `fetch('https://你的空间名.hf.space/proxy/https://.../api')` 来无缝联调任何外部被墙的 API，再也不会出现 CORS 错误！
