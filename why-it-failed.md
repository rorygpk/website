我发现原因了！您把项目部署成了 **Cloudflare Pages**（静态网页托管），而不是 **Cloudflare Worker**（无服务器函数）。

### 为什么一直返回网页？
当您将这个项目部署到 Cloudflare Pages 时，Cloudflare 只会提取其中的静态网页文件（`index.html`），而**完全忽略了后端的代理代码**（`worker.js` 或 `server.ts`）。
对于 Cloudflare Pages 来说，当您访问 `/v1/chat/completions` 这个它找不到的路径时，它会触发“单页应用 (SPA) 路由 fallback”，默认把 `index.html` 网页返回给您！这就是为什么您永远只能收到网页！

### 🚀 终极解决办法（请务必照做）

您只需要创建一个纯粹的 **Worker**，完全不需要上传整个项目！

1. 登录 Cloudflare 控制台，点击左侧的 **Workers & Pages**。
2. 找到您之前部署的那个 Pages 项目（可能是绑定了 rorygpk.online 的那个），进入它的设置 -> Custom Domains，**把 rorygpk.online 解绑（Remove）**。
3. 回到 **Workers & Pages** 首页，点击蓝色的 **Create** 按钮。
4. **⚠️ 极其重要：在接下来的页面中，一定要选择 Create Worker（创建 Worker），绝对不要选 Pages！**
5. 随便给 Worker 起个名字，点击 **Deploy**。
6. 点击 **Edit Code** 进入代码编辑器。
7. 把本项目里那个 `worker.js` 里的代码**全部复制，粘贴覆盖掉**编辑器里原有的代码。
8. 点击右上角 **Save and Deploy**。
9. 返回这个 Worker 的主页，进入 **Settings** -> **Triggers**，在 **Custom Domains** 这里，重新添加您的域名 `rorygpk.online`。

只要部署为 Worker，这个代理就能瞬间生效，`rorygpk.online/v1/chat/completions` 将完美转发您的 API 请求，绝对不会再返回网页了！
