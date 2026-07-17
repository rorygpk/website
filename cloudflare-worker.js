/**
 * Cloudflare Proxy - Ultimate Edition (API + Web)
 * 绝对纯净代理，彻底分离 API 与 Web 网页的逻辑，杜绝互相干扰
 */
const DEFAULT_PASSWORD = "admin";
const COOKIE_NAME = "cf_proxy_session";

export default {
  async fetch(request, env, ctx) {
    try {
      return await handleRequest(request, env);
    } catch (e) {
      return new Response("Internal Server Error", { status: 500 });
    }
  }
};

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, HEAD, PATCH',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key, anthropic-version, x-anthropic-version, HTTP-Referer, X-Requested-With',
};

async function handleRequest(request, env) {
    const url = new URL(request.url);
    const pathStr = url.pathname;
    const search = url.search;
    const password = (env && env.ACCESS_PASSWORD) ? env.ACCESS_PASSWORD : DEFAULT_PASSWORD;

    // 0. 全局跨域预检处理
    if (request.method === 'OPTIONS') {
        const reqHeaders = request.headers.get('Access-Control-Request-Headers');
        const finalHeaders = { ...corsHeaders };
        if (reqHeaders) finalHeaders['Access-Control-Allow-Headers'] = reqHeaders;
        return new Response(null, { status: 204, headers: finalHeaders });
    }

    // 1. AI API 纯净无损代理 (完全不经过 Auth)
    const apiRoutes = [
      { prefix: '/v1', target: 'https://api.openai.com/v1' },
      { prefix: '/api/openai', target: 'https://api.openai.com' },
      { prefix: '/api/anthropic', target: 'https://api.anthropic.com' },
      { prefix: '/api/claude', target: 'https://api.anthropic.com' },
      { prefix: '/api/gemini', target: 'https://generativelanguage.googleapis.com' },
      { prefix: '/api/deepseek', target: 'https://api.deepseek.com' },
      { prefix: '/api/xai', target: 'https://api.x.ai' }
    ];

    for (const route of apiRoutes) {
        if (pathStr.startsWith(route.prefix)) {
            const rest = pathStr.slice(route.prefix.length);
            const targetUrl = route.target + rest + search;
            
            const newHeaders = new Headers(request.headers);
            newHeaders.delete('Host');
            newHeaders.delete('cf-connecting-ip');
            newHeaders.delete('x-forwarded-for');
            newHeaders.delete('x-real-ip');

            const init = { method: request.method, headers: newHeaders, redirect: 'follow' };
            if (request.body && !['GET', 'HEAD'].includes(request.method.toUpperCase())) {
                init.body = request.body;
            }

            const proxyReq = new Request(targetUrl, init);
            const proxyRes = await fetch(proxyReq);
            
            const responseHeaders = new Headers(proxyRes.headers);
            for (const [k, v] of Object.entries(corsHeaders)) responseHeaders.set(k, v);
            return new Response(proxyRes.body, {
                status: proxyRes.status, statusText: proxyRes.statusText, headers: responseHeaders
            });
        }
    }

    // 2. 秘密入口：认证接口 (彻底替换掉页面内的假 404)
    if (pathStr.startsWith('/__auth/')) {
        const inputPwd = decodeURIComponent(pathStr.slice('/__auth/'.length));
        if (inputPwd === password) {
            return new Response("Auth Success! Redirecting...", {
                status: 302,
                headers: {
                    'Set-Cookie': `${COOKIE_NAME}=${password}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`,
                    'Location': '/'
                }
            });
        } else {
            return new Response("Unauthorized", { status: 401 });
        }
    }

    // 3. 身份校验 & 绝对纯净 404
    const cookies = request.headers.get('Cookie') || '';
    const isAuthenticated = cookies.includes(`${COOKIE_NAME}=${password}`);

    if (!isAuthenticated) {
        return new Response(
`<html>
<head><title>404 Not Found</title></head>
<body>
<center><h1>404 Not Found</h1></center>
<hr><center>nginx</center>
</body>
</html>`, 
            { status: 404, headers: { 'Content-Type': 'text/html;charset=UTF-8' } }
        );
    }

    // 4. Web Gateway 代理主页
    if (pathStr === '/' || pathStr === '') {
        return new Response(getGatewayHtml(url.hostname), {
            headers: { 'Content-Type': 'text/html;charset=UTF-8' }
        });
    }

    // 5. Web 网页代理解析与重定向跟踪
    let targetWebUrl = '';
    let decodedPath = decodeURIComponent(pathStr.slice(1));
    if (decodedPath.startsWith('proxy/')) decodedPath = decodedPath.slice(6);
    
    if (decodedPath.startsWith('http://') || decodedPath.startsWith('https://')) {
        targetWebUrl = decodedPath + search;
    } else {
        const referer = request.headers.get('Referer');
        if (referer) {
            try {
                const refUrl = new URL(referer);
                let refPath = decodeURIComponent(refUrl.pathname.slice(1));
                if (refPath.startsWith('proxy/')) refPath = refPath.slice(6);
                if (refPath.startsWith('http://') || refPath.startsWith('https://')) {
                    const targetBaseUrl = new URL(refPath);
                    targetWebUrl = targetBaseUrl.origin + pathStr + search;
                }
            } catch(e) {}
        }
    }

    if (!targetWebUrl) return new Response("Not Found", { status: 404 });

    // 6. 执行 Web 网页智能代理
    const targetUrlObj = new URL(targetWebUrl);
    const proxyHeaders = new Headers(request.headers);
    proxyHeaders.delete('Host');
    proxyHeaders.delete('cf-connecting-ip');
    proxyHeaders.delete('x-forwarded-for');
    proxyHeaders.delete('x-real-ip');
    proxyHeaders.set('Host', targetUrlObj.hostname);
    proxyHeaders.set('Origin', targetUrlObj.origin);
    proxyHeaders.set('Referer', targetUrlObj.origin + '/');
    
    const ua = proxyHeaders.get('User-Agent') || '';
    if (!ua || ua.includes('Cloudflare')) {
         proxyHeaders.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
    }
    
    proxyHeaders.set('Accept-Encoding', 'identity');
    let cookieHeader = proxyHeaders.get('Cookie');
    if (cookieHeader) {
        cookieHeader = cookieHeader.split(';').filter(c => !c.trim().startsWith(COOKIE_NAME + '=')).join(';');
        if (cookieHeader) proxyHeaders.set('Cookie', cookieHeader);
        else proxyHeaders.delete('Cookie');
    }
    
    const requestInit = { method: request.method, headers: proxyHeaders, redirect: 'manual' };
    if (request.body && !['GET', 'HEAD'].includes(request.method.toUpperCase())) requestInit.body = request.body;

    const proxyRes = await fetch(targetWebUrl, requestInit);
    const responseHeaders = new Headers(proxyRes.headers);

    responseHeaders.delete('x-frame-options');
    responseHeaders.delete('content-security-policy');
    responseHeaders.delete('content-security-policy-report-only');
    responseHeaders.delete('clear-site-data');
    responseHeaders.delete('strict-transport-security');
    
    if ([301, 302, 303, 307, 308].includes(proxyRes.status) && responseHeaders.has('location')) {
        let loc = responseHeaders.get('location');
        try {
            if (loc.startsWith('http')) responseHeaders.set('location', `${url.origin}/${loc}`);
            else {
                const absoluteLoc = new URL(loc, targetUrlObj.origin).toString();
                responseHeaders.set('location', `${url.origin}/${absoluteLoc}`);
            }
        } catch (e) {}
    }
    
    const contentType = responseHeaders.get('content-type') || '';
    if (contentType.includes('text/html')) {
        class AttributeRewriter {
            element(element) {
                ['href', 'src', 'action'].forEach(attr => {
                    const val = element.getAttribute(attr);
                    if (val) {
                        if (val.startsWith('http://') || val.startsWith('https://')) element.setAttribute(attr, url.origin + '/' + val);
                        else if (val.startsWith('//')) element.setAttribute(attr, url.origin + '/https:' + val);
                        else if (val.startsWith('/')) element.setAttribute(attr, url.origin + '/' + targetUrlObj.origin + val);
                    }
                });
            }
        }
        try {
            const rewriter = new HTMLRewriter().on('a, link, img, script, iframe, form, source', new AttributeRewriter());
            return rewriter.transform(new Response(proxyRes.body, {
                status: proxyRes.status, statusText: proxyRes.statusText, headers: responseHeaders
            }));
        } catch(e) {}
    }

    return new Response(proxyRes.body, {
        status: proxyRes.status, statusText: proxyRes.statusText, headers: responseHeaders
    });
}

function getGatewayHtml(hostname) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gateway Active</title>
    <style>
        body { font-family: -apple-system, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; color: #111; background: #f9f9f9; }
        h1 { font-size: 24px; color: #000; }
        .card { background: #fff; border: 1px solid #eaeaea; padding: 24px; border-radius: 10px; margin-top: 24px; }
        h3 { margin-top: 0; font-size: 16px; margin-bottom: 15px; }
        input { padding: 12px 16px; width: 60%; border: 1px solid #d1d5db; border-radius: 6px; font-size: 15px; }
        button { padding: 12px 24px; background: #2563eb; color: #fff; border: none; border-radius: 6px; font-size: 15px; cursor: pointer; }
        code { background: #f3f4f6; padding: 4px 8px; border-radius: 4px; color: #db2777; font-size: 14px; font-family: monospace; }
        ul { padding-left: 20px; color: #555; }
        li { margin-bottom: 10px; }
    </style>
</head>
<body>
    <h1>🟢 Secure Proxy Gateway</h1>
    <p>Authentication successful.</p>
    <div class="card">
        <h3>🌍 Web Proxy</h3>
        <form onsubmit="event.preventDefault(); go();" style="display: flex; gap: 10px;">
            <input type="text" id="url" placeholder="https://www.google.com" required>
            <button type="submit">Go Surfing</button>
        </form>
        <script>
            function go() {
                let u = document.getElementById('url').value.trim();
                if (!u.startsWith('http')) u = 'https://' + u;
                window.location.href = '/' + u;
            }
        </script>
    </div>
    <div class="card">
        <h3>🤖 AI API Endpoints (No password needed)</h3>
        <ul>
            <li>OpenAI: <code>https://${hostname}/v1</code></li>
            <li>Anthropic: <code>https://${hostname}/api/anthropic</code></li>
            <li>Gemini: <code>https://${hostname}/api/gemini</code></li>
            <li>DeepSeek: <code>https://${hostname}/api/deepseek</code></li>
            <li>xAI (Grok): <code>https://${hostname}/api/xai</code></li>
        </ul>
    </div>
</body>
</html>`;
}
