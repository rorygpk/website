/**
 * Cloudflare Worker Proxy - Ultimate Edition
 * 带有全局容错和 HTMLRewriter 边缘注入功能
 */

const DEFAULT_PASSWORD = "admin"; // <--- 你可以在这里修改你的安全密码
const COOKIE_NAME = "cf_proxy_session";

async function handleRequest(request, env) {
    const url = new URL(request.url);
    const pathStr = url.pathname.slice(1);
    const search = url.search;
    
    // 安全获取密码
    const password = (env && env.ACCESS_PASSWORD) ? env.ACCESS_PASSWORD : DEFAULT_PASSWORD;

    // --- 1. 全局 CORS ---
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, HEAD, PATCH',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key, x-requested-with',
      'Access-Control-Allow-Credentials': 'true',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // --- 2. 身份验证接口 ---
    if (request.method === 'POST' && url.pathname === '/__proxy_auth') {
        try {
            const body = await request.json();
            if (body.password === password) {
                return new Response(JSON.stringify({ success: true }), {
                    status: 200,
                    headers: {
                        'Content-Type': 'application/json',
                        'Set-Cookie': `${COOKIE_NAME}=${password}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`,
                        ...corsHeaders
                    }
                });
            }
            return new Response(JSON.stringify({ success: false }), {
                status: 401,
                headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
        } catch (e) {
            return new Response("Bad Request", { status: 400 });
        }
    }

    // --- 3. 预设 AI API ---
    const apiRoutes = {
      'api/openai': 'https://api.openai.com',
      'v1': 'https://api.openai.com/v1',
      'api/anthropic': 'https://api.anthropic.com',
      'api/gemini': 'https://generativelanguage.googleapis.com',
      'api/deepseek': 'https://api.deepseek.com'
    };

    let targetUrl = '';
    let isAiApi = false;
    for (const [prefix, targetBase] of Object.entries(apiRoutes)) {
        if (pathStr === prefix || pathStr.startsWith(prefix + '/')) {
             const rest = pathStr.slice(prefix.length);
             targetUrl = targetBase + rest + search;
             isAiApi = true;
             break;
        }
    }

    // --- 4. 动态万能代理 URL 解析 ---
    if (!targetUrl && pathStr) {
      let decodedPath = decodeURIComponent(pathStr);
      if (decodedPath.startsWith('proxy/')) {
          decodedPath = decodedPath.slice(6);
      }
      if (decodedPath.startsWith('http://') || decodedPath.startsWith('https://')) {
          targetUrl = decodedPath + search;
      } else if (/^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/.*)?$/.test(decodedPath)) {
          targetUrl = 'https://' + decodedPath + search;
      }
    }

    // --- 5. 身份验证检查 ---
    const cookies = request.headers.get('Cookie') || '';
    const isAuthenticated = cookies.includes(`${COOKIE_NAME}=${password}`);

    if (!isAiApi && !isAuthenticated) {
        const accept = request.headers.get('Accept') || '';
        if (!accept.includes('text/html') && request.headers.get('Sec-Fetch-Dest') !== 'document' && targetUrl) {
            return new Response("Access Denied: Authentication required.", { status: 403, headers: corsHeaders });
        }
        return new Response(getAuthHtml(), { status: 404, headers: { 'Content-Type': 'text/html;charset=UTF-8', ...corsHeaders } });
    }

    // --- 6. 根目录主站点展示 (认证后) ---
    if (!targetUrl) {
        return new Response(getGatewayHtml(url.hostname), {
            headers: { 'Content-Type': 'text/html;charset=UTF-8', ...corsHeaders }
        });
    }

    // --- 7. 执行代理请求 ---
    const targetUrlObj = new URL(targetUrl);
    const proxyHeaders = new Headers(request.headers);
    
    proxyHeaders.delete('Host');
    proxyHeaders.delete('Referer');
    proxyHeaders.delete('cf-connecting-ip');
    proxyHeaders.delete('cf-ray');
    proxyHeaders.delete('cf-visitor');
    proxyHeaders.delete('x-forwarded-proto');
    proxyHeaders.delete('x-forwarded-for');
    proxyHeaders.delete('x-real-ip');
    
    // 删除我们自己的 auth cookie
    let cookieHeader = proxyHeaders.get('Cookie');
    if (cookieHeader) {
        cookieHeader = cookieHeader.split(';')
            .filter(c => !c.trim().startsWith(COOKIE_NAME + '='))
            .join(';');
        if (cookieHeader) proxyHeaders.set('Cookie', cookieHeader);
        else proxyHeaders.delete('Cookie');
    }
    
    proxyHeaders.set('Host', targetUrlObj.hostname);
    if (!proxyHeaders.has('User-Agent')) {
         proxyHeaders.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
    }
    
    // 【关键】禁止目标服务器返回 gzip/br 压缩格式，确保 HTMLRewriter 能正常解析
    proxyHeaders.set('Accept-Encoding', 'identity');
    
    const requestInit = {
        method: request.method,
        headers: proxyHeaders,
        redirect: 'manual'
    };
    
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
        requestInit.body = request.body;
    }

    const proxyRes = await fetch(targetUrl, requestInit);
    const responseHeaders = new Headers(proxyRes.headers);

    // 清理安全头，防止被浏览器拦截 iframe 或重定向
    responseHeaders.delete('x-frame-options');
    responseHeaders.delete('content-security-policy');
    responseHeaders.delete('content-security-policy-report-only');
    responseHeaders.delete('clear-site-data');

    // 处理重定向
    if (responseHeaders.has('location')) {
        const loc = responseHeaders.get('location');
        if (loc.startsWith('http')) {
             responseHeaders.set('location', `${url.origin}/${loc}`);
        } else if (loc.startsWith('/')) {
             responseHeaders.set('location', `${url.origin}/${targetUrlObj.origin}${loc}`);
        }
    }
    
    // 强制允许跨域访问
    for (const [key, value] of Object.entries(corsHeaders)) {
        responseHeaders.set(key, value);
    }
    
    // 处理 Cookie
    const cookiesSet = proxyRes.headers.getSetCookie ? proxyRes.headers.getSetCookie() : [];
    if (cookiesSet && cookiesSet.length > 0) {
        responseHeaders.delete('set-cookie');
        cookiesSet.forEach(c => {
             responseHeaders.append('set-cookie', c.replace(/domain=[^;]+/i, '').replace(/Path=[^;]+/i, 'Path=/'));
        });
    }

    // --- 8. HTMLRewriter 重写 ---
    const contentType = responseHeaders.get('content-type') || '';
    if (contentType.includes('text/html')) {
        class BaseTagInjector {
            element(element) {
                // 注入 BASE 标签，修正页面内所有的相对路径
                element.prepend(`<base href="${url.origin}/${targetUrlObj.origin}/" />`, { html: true });
                // 拦截页面所有的点击事件，防止用户点出代理网关
                element.prepend(`<script>
                    (function(){
                        const _origin = '${url.origin}';
                        document.addEventListener('click', function(e) {
                            const a = e.target.closest('a');
                            if (a && a.href && a.href.startsWith('http') && !a.href.startsWith(_origin)) {
                                e.preventDefault();
                                window.location.href = _origin + '/' + a.href;
                            }
                        }, true);
                    })();
                </script>`, { html: true });
            }
        }
        
        try {
            const rewriter = new HTMLRewriter().on('head', new BaseTagInjector());
            return rewriter.transform(new Response(proxyRes.body, {
                status: proxyRes.status,
                statusText: proxyRes.statusText,
                headers: responseHeaders
            }));
        } catch(rewriteErr) {
            // HTMLRewriter 失效时的降级处理
        }
    }

    return new Response(proxyRes.body, {
        status: proxyRes.status,
        statusText: proxyRes.statusText,
        headers: responseHeaders
    });
}

export default {
  async fetch(request, env, ctx) {
    try {
        return await handleRequest(request, env);
    } catch (e) {
        // 如果遇到严重错误，将会以纯文本方式显示在页面上，再也不会出现黑屏或无法调试的问题
        return new Response("🔥 Global Proxy Error: \n" + e.stack, { 
            status: 500,
            headers: { 'Content-Type': 'text/plain;charset=UTF-8' }
        });
    }
  }
};

// ======================= HTML UI 组件 =======================

function getAuthHtml() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>404 Not Found</title>
    <style>
        body { font-family: system-ui, -apple-system, sans-serif; text-align: center; margin-top: 15vh; color: #333; background: #fff; }
        h1 { font-size: 4rem; margin-bottom: 10px; font-weight: 300; }
        p { color: #666; font-size: 1.2rem; }
        .footer { font-size: 0.8rem; color: #aaa; margin-top: 50px; }
        #auth-modal { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(255,255,255,0.9); backdrop-filter: blur(10px); justify-content: center; align-items: center; z-index: 1000; }
        .modal-content { background: #fff; padding: 40px; border-radius: 16px; box-shadow: 0 20px 40px rgba(0,0,0,0.1); width: 100%; max-width: 320px; text-align: center; border: 1px solid #eaeaea; transform: scale(0.95); opacity: 0; transition: all 0.2s ease-out; }
        .modal-content.show { transform: scale(1); opacity: 1; }
        h2 { margin: 0 0 24px 0; color: #000; font-size: 1.2rem; font-weight: 600; letter-spacing: 1px; }
        input[type="password"] { width: 100%; box-sizing: border-box; padding: 14px 16px; margin-bottom: 20px; border: 1px solid #ddd; border-radius: 8px; background: #fafafa; color: #000; font-size: 16px; outline: none; transition: border-color 0.2s; text-align: center; letter-spacing: 2px; }
        input[type="password"]:focus { border-color: #000; background: #fff; }
        button { width: 100%; padding: 14px; border: none; border-radius: 8px; background: #000; color: #fff; font-size: 16px; font-weight: 500; cursor: pointer; transition: transform 0.1s, background 0.2s; }
        button:hover { background: #333; }
        button:active { transform: scale(0.98); }
        #error-msg { color: #dc2626; font-size: 14px; margin-top: 16px; min-height: 20px; font-weight: 500; }
    </style>
</head>
<body>
    <h1>404</h1>
    <p>The requested URL was not found on this server.</p>
    <div class="footer">nginx/1.18.0 (Ubuntu)</div>

    <div id="auth-modal">
        <div class="modal-content" id="modal-box">
            <h2>RESTRICTED AREA</h2>
            <form id="auth-form">
                <input type="password" id="pwd" placeholder="••••••••" autocomplete="off">
                <button type="submit">UNLOCK</button>
            </form>
            <div id="error-msg"></div>
        </div>
    </div>

    <script>
        const modal = document.getElementById('auth-modal');
        const box = document.getElementById('modal-box');
        
        // 快捷键触发：Ctrl + Shift + K 或 Cmd + Shift + K
        document.addEventListener('keydown', function(e) {
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                modal.style.display = 'flex';
                void box.offsetWidth; 
                box.classList.add('show');
                setTimeout(() => document.getElementById('pwd').focus(), 100);
            }
            if (e.key === 'Escape') {
                box.classList.remove('show');
                setTimeout(() => modal.style.display = 'none', 200);
            }
        });

        document.getElementById('auth-form').addEventListener('submit', async function(e) {
            e.preventDefault();
            const pwd = document.getElementById('pwd').value;
            const errorMsg = document.getElementById('error-msg');
            const btn = this.querySelector('button');
            
            errorMsg.textContent = '';
            btn.textContent = 'VERIFYING...';
            btn.disabled = true;

            try {
                const res = await fetch('/__proxy_auth', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password: pwd })
                });
                
                const data = await res.json();
                if (data.success) {
                    btn.textContent = 'ACCESS GRANTED';
                    btn.style.background = '#16a34a';
                    setTimeout(() => window.location.reload(), 500);
                } else {
                    errorMsg.textContent = 'Invalid credential.';
                    btn.textContent = 'UNLOCK';
                    btn.disabled = false;
                    document.getElementById('pwd').value = '';
                    document.getElementById('pwd').focus();
                }
            } catch (err) {
                errorMsg.textContent = 'Network Error.';
                btn.textContent = 'UNLOCK';
                btn.disabled = false;
            }
        });
    </script>
</body>
</html>`;
}

function getGatewayHtml(hostname) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Secure Proxy Gateway</title>
    <style>
        body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; line-height: 1.6; max-width: 800px; margin: 0 auto; color: #333; background: #fafafa; }
        h1 { color: #16a34a; font-weight: 600; display: flex; align-items: center; gap: 10px; }
        code { background: #e5e7eb; padding: 4px 8px; border-radius: 6px; font-family: monospace; color: #db2777; word-break: break-all; }
        .card { background: white; border: 1px solid #e5e7eb; padding: 24px; border-radius: 12px; margin-top: 24px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
        h3 { margin-top: 0; color: #111827; }
        ul { padding-left: 20px; }
        li { margin-bottom: 12px; }
        .search-box { display: flex; gap: 10px; margin-top: 20px; }
        input { flex: 1; padding: 12px 16px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 16px; outline: none; transition: border-color 0.2s; }
        input:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }
        button { padding: 12px 24px; background: #2563eb; color: white; border: none; border-radius: 8px; font-weight: 500; cursor: pointer; transition: background 0.2s; white-space: nowrap; }
        button:hover { background: #1d4ed8; }
    </style>
</head>
<body>
    <h1><span style="font-size: 1.5rem">🟢</span> Secure Proxy Gateway</h1>
    <p style="color: #4b5563;">身份验证成功！您已接入全球高速加密代理网络，自带 HTML 路径重写引擎，冲浪更顺畅。</p>
    
    <div class="card">
        <h3>🌍 极速网页冲浪</h3>
        <p>直接在此输入网址，即可丝滑访问任何受限网站 (例如 Google, Twitter)。</p>
        <form class="search-box" onsubmit="event.preventDefault(); goSurfing();">
            <input type="text" id="urlInput" placeholder="输入网址，如 https://www.google.com" required>
            <button type="submit">立即访问</button>
        </form>
        <script>
            function goSurfing() {
                let val = document.getElementById('urlInput').value.trim();
                if (!val) return;
                if (!val.startsWith('http')) {
                    if (!val.includes('.') || val.includes(' ')) {
                        val = 'https://www.google.com/search?q=' + encodeURIComponent(val);
                    } else {
                        val = 'https://' + val;
                    }
                }
                window.location.href = '/' + val;
            }
        </script>
    </div>

    <div class="card">
        <h3>🤖 AI API 快捷通道</h3>
        <p>在您的代码中，直接将官方域名替换为您的节点域名即可调用模型，后台自动绕过认证：</p>
        <ul>
            <li><b>OpenAI:</b> <code>https://${hostname}/v1/chat/completions</code></li>
            <li><b>Anthropic:</b> <code>https://${hostname}/api/anthropic/v1/messages</code></li>
            <li><b>DeepSeek:</b> <code>https://${hostname}/api/deepseek/chat/completions</code></li>
        </ul>
    </div>
</body>
</html>`;
}
