# 🚀 国内无阻碍访问全套白嫖部署指南

为了实现**彻底解决外网访问限制**、**国内秒开**且**完全免费（白嫖）**，我们推荐以下终极方案。

本项目已经内置了对 Docker 和 Zeabur 的支持文件 (`Dockerfile` 和 `zeabur.json`)。

## 方案一：Zeabur 容器部署（推荐，最稳定）

Zeabur 提供了极简的部署体验，且对 Docker 项目支持非常好，免除了 Vercel Serverless 函数超时的烦恼（代理网站容易因为请求过长超时）。

### 1. 导出项目到 GitHub
在当前 AI Studio 页面，点击右上角的设置/导出，将此代码库**导出到你的 GitHub**。

### 2. 部署到 Zeabur
1. 访问 [Zeabur](https://zeabur.com/)，使用 GitHub 登录。
2. 创建一个新项目 (Project)。
3. 在项目中点击 **Deploy New Service** -> 选择 **GitHub**。
4. 搜索并选中你刚刚导出的仓库。
5. Zeabur 会自动识别到项目根目录的 `zeabur.json` 和 `Dockerfile`，并自动开始构建。
6. 构建完成后，在 `Networking` 选项卡中，点击 **Generate Domain** 生成一个免费的 `.zeabur.app` 域名。

### 3. 彻底解决国内被墙（终极防屏蔽）
`.zeabur.app` 域名在国内部分地区偶尔会被 DNS 污染。要实现**绝对不被拦**的终极方案：

1. **白嫖或购买一个便宜的域名**：可以在 Namesilo 买个几块钱首年的纯数字 `.xyz`，或者去 EU.org 申请免费域名。
2. **注册 Cloudflare (CF)**：将你的域名托管到 [Cloudflare](https://dash.cloudflare.com/)。
3. **绑定自定义域名**：
   - 在 Zeabur 项目的 Networking 中，添加你的自定义域名。
   - 去 Cloudflare 的 DNS 设置中，添加一条 CNAME 记录指向 Zeabur 提供的地址。
   - **开启 Cloudflare 的小黄云 (Proxy status: Proxied)**。
4. **效果**：国内访问你的自定义域名 -> Cloudflare 国内优选节点 -> 穿透墙 -> Zeabur 服务器 -> 代理 Google。绝对稳定且不会被阻拦！

---

## 方案二：Koyeb 纯白嫖 Docker 部署

Koyeb 提供每个月免费的 Eco 实例，无需休眠，纯 Docker 运行。

1. 访问 [Koyeb](https://www.koyeb.com/) 使用 GitHub 登录。
2. 点击 **Create Service**，选择 GitHub 导入。
3. 选择你的仓库。
4. Builder 选择 **Dockerfile**。
5. 端口设置：修改为 `3000` (项目内部运行在 3000 端口)。
6. 部署后，同样推荐在 Koyeb 绑定托管在 Cloudflare 上的自定义域名，开启小黄云实现国内极速访问。

---

## 方案三：Render 免费实例

1. 访问 [Render](https://render.com/)，登录并新建一个 **Web Service**。
2. 绑定 GitHub，选择此仓库。
3. 环境选择 **Docker**。
4. 免费实例会休眠（访问时需要等几十秒唤醒），但完全免费。
5. 同样支持绑定 Cloudflare 自定义域名防墙。

---

## 核心防墙原理总结
1. **你的部署平台** (Zeabur / Koyeb) 在海外，它们访问 Google 是没有任何阻碍的，并且速度极快。
2. **你的代理服务** 将 Google 的页面内容抓取并渲染为你自己的网页。
3. **Cloudflare CDN** 保护你的前端域名，由于 Cloudflare 节点众多，国内直接通过 CF 边缘节点连接你的服务器，绕过 GFW 的 SNI 阻断。
4. **最终体验**：在国内就像访问普通国内网站一样，秒开 Google！
