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
      return new Response("🔥 System Error: " + e.stack, { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } });
    }
  }
};

function handleCORS(request) {
    const headers = new Headers();
    headers.set('Access-Control-Allow-Origin', request.headers.get('Origin') || '*');
    headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD');
    headers.set('Access-Control-Allow-Headers', request.headers.get('Access-Control-Request-Headers') || '*');
    headers.set('Access-Control-Allow-Credentials', 'true');
    return headers;
}

async function handleRequest(request, env) {
    const url = new URL(request.url);
    let pathStr = url.pathname;
    const search = url.search;
    const password = (env && env.ACCESS_PASSWORD) ? env.ACCESS_PASSWORD : DEFAULT_PASSWORD;

    if (request.method === 'OPTIONS') {
      const cors = handleCORS(request);
      return new Response(null, { status: 204, headers: cors });
    }

    // --- 1. 验证接口 ---
    if (request.method === 'POST' && pathStr === '/__proxy_auth') {
        try {
            const body = await request.json();
            if (body.password === password) {
                const cors = handleCORS(request);
                cors.set('Content-Type', 'application/json');
                cors.set('Set-Cookie', `${COOKIE_NAME}=${password}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`);
                return new Response(JSON.stringify({ success: true }), {
                    status: 200,
                    headers: cors
                });
            }
            const cors = handleCORS(request);
            cors.set('Content-Type', 'application/json');
            return new Response(JSON.stringify({ success: false }), { status: 401, headers: cors });
        } catch (e) {
            return new Response("Bad Request", { status: 400 });
        }
    }

    // --- 2. AI API 精确路由识别 ---
    const apiRoutes = [
      { prefix: '/v1', target: 'https://api.openai.com/v1' },
      { prefix: '/api/openai', target: 'https://api.openai.com' },
      { prefix: '/api/anthropic', target: 'https://api.anthropic.com' },
      { prefix: '/api/claude', target: 'https://api.anthropic.com' },
      { prefix: '/api/gemini', target: 'https://generativelanguage.googleapis.com' },
      { prefix: '/api/deepseek', target: 'https://api.deepseek.com' }
    ];

    let targetUrl = '';
    let isAiApi = false;

    for (const route of apiRoutes) {
        if (pathStr.startsWith(route.prefix)) {
             const rest = pathStr.slice(route.prefix.length);
             targetUrl = route.target + rest + search;
             isAiApi = true;
             break;
        }
    }

    // --- 3. Web 网页代理解析 ---
    if (!targetUrl && pathStr !== '/') {
      let decodedPath = decodeURIComponent(pathStr.slice(1));
      if (decodedPath.startsWith('proxy/')) {
          decodedPath = decodedPath.slice(6);
      }
      
      if (decodedPath.startsWith('http://') || decodedPath.startsWith('https://')) {
          targetUrl = decodedPath + search;
      } else {
          // 核心修复：处理网站由于 <base> 标签失效导致的相对路径资源 404 (CSS, JS, 图片)
          const referer = request.headers.get('Referer');
          if (referer) {
              try {
                  const refUrl = new URL(referer);
                  let refPath = decodeURIComponent(refUrl.pathname.slice(1));
                  if (refPath.startsWith('http://') || refPath.startsWith('https://')) {
                      const targetBaseUrl = new URL(refPath);
                      targetUrl = targetBaseUrl.origin + pathStr + search;
                  }
              } catch(e) {}
          }
      }
    }

    // --- 4. 身份校验 ---
    const cookies = request.headers.get('Cookie') || '';
    const isAuthenticated = cookies.includes(`${COOKIE_NAME}=${password}`);

    if (!isAiApi && !isAuthenticated) {
        // 未认证时返回极度逼真的 404
        return new Response(get404Html(), { 
            status: 404, 
            headers: { 'Content-Type': 'text/html;charset=UTF-8' } 
        });
    }

    // --- 5. 代理主页 ---
    if (!targetUrl && (pathStr === '/' || pathStr === '')) {
        return new Response(getGatewayHtml(url.hostname), {
            headers: { 'Content-Type': 'text/html;charset=UTF-8' }
        });
    }

    if (!targetUrl) {
      return new Response("Not Found", { status: 404 });
    }

    // ==========================================
    // 6. 执行 API 纯净无损代理 (100% 还原)
    // ==========================================
    if (isAiApi) {
        const proxyHeaders = new Headers(request.headers);
        proxyHeaders.delete('Host');
        proxyHeaders.delete('cf-connecting-ip');
        proxyHeaders.delete('x-forwarded-for');
        proxyHeaders.delete('x-real-ip');
        
        const targetUrlObj = new URL(targetUrl);
        proxyHeaders.set('Host', targetUrlObj.hostname);

        const requestInit = {
            method: request.method,
            headers: proxyHeaders,
            redirect: 'follow'
        };
        if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method) && request.body) {
            requestInit.body = request.body;
        }

        const proxyRes = await fetch(targetUrl, requestInit);
        const responseHeaders = new Headers(proxyRes.headers);
        
        const cors = handleCORS(request);
        cors.forEach((value, key) => responseHeaders.set(key, value));
        
        return new Response(proxyRes.body, {
            status: proxyRes.status,
            statusText: proxyRes.statusText,
            headers: responseHeaders
        });
    }

    // ==========================================
    // 7. 执行 Web 网页智能代理 (防止跨域被拦)
    // ==========================================
    const targetUrlObj = new URL(targetUrl);
    const proxyHeaders = new Headers(request.headers);
    
    proxyHeaders.delete('Host');
    proxyHeaders.delete('cf-connecting-ip');
    proxyHeaders.delete('x-forwarded-for');
    proxyHeaders.delete('x-real-ip');
    
    proxyHeaders.set('Host', targetUrlObj.hostname);
    proxyHeaders.set('Origin', targetUrlObj.origin);
    proxyHeaders.set('Referer', targetUrlObj.href);
    
    if (!proxyHeaders.has('User-Agent') || proxyHeaders.get('User-Agent').includes('Cloudflare')) {
         proxyHeaders.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
    }
    
    // 取消gzip，以便能够重写HTML内容
    proxyHeaders.set('Accept-Encoding', 'identity');
    
    let cookieHeader = proxyHeaders.get('Cookie');
    if (cookieHeader) {
        cookieHeader = cookieHeader.split(';').filter(c => !c.trim().startsWith(COOKIE_NAME + '=')).join(';');
        if (cookieHeader) proxyHeaders.set('Cookie', cookieHeader);
        else proxyHeaders.delete('Cookie');
    }
    
    const requestInit = {
        method: request.method,
        headers: proxyHeaders,
        redirect: 'manual'
    };
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method) && request.body) {
        requestInit.body = request.body;
    }

    const proxyRes = await fetch(targetUrl, requestInit);
    const responseHeaders = new Headers(proxyRes.headers);

    responseHeaders.delete('x-frame-options');
    responseHeaders.delete('content-security-policy');
    responseHeaders.delete('content-security-policy-report-only');
    responseHeaders.delete('clear-site-data');
    
    const cors = handleCORS(request);
    cors.forEach((value, key) => responseHeaders.set(key, value));

    if (responseHeaders.has('location')) {
        const loc = responseHeaders.get('location');
        if (loc.startsWith('http')) {
             responseHeaders.set('location', `${url.origin}/${loc}`);
        } else if (loc.startsWith('/')) {
             responseHeaders.set('location', `${url.origin}/${targetUrlObj.origin}${loc}`);
        }
    }
    
    const contentType = responseHeaders.get('content-type') || '';
    if (contentType.includes('text/html')) {
        class AttributeRewriter {
            element(element) {
                ['href', 'src', 'action'].forEach(attr => {
                    const val = element.getAttribute(attr);
                    if (val) {
                        if (val.startsWith('http://') || val.startsWith('https://')) {
                            element.setAttribute(attr, url.origin + '/' + val);
                        } else if (val.startsWith('//')) {
                            element.setAttribute(attr, url.origin + '/https:' + val);
                        } else if (val.startsWith('/')) {
                            element.setAttribute(attr, url.origin + '/' + targetUrlObj.origin + val);
                        }
                    }
                });
            }
        }
        class ScriptInjector {
            element(element) {
                element.prepend(`<script>
                    (function(){
                        const _origFetch = window.fetch;
                        window.fetch = function(req, init) {
                            let u = typeof req === 'string' ? req : (req instanceof Request ? req.url : req);
                            if (typeof u === 'string') {
                                if (u.startsWith('http')) {
                                    if (!u.startsWith('${url.origin}')) u = '${url.origin}/' + u;
                                } else if (u.startsWith('/')) {
                                    u = '${url.origin}/${targetUrlObj.origin}' + u;
                                }
                            }
                            if (typeof req === 'string') return _origFetch.call(this, u, init);
                            else return _origFetch.call(this, new Request(u, req), init);
                        };
                        const _origOpen = XMLHttpRequest.prototype.open;
                        XMLHttpRequest.prototype.open = function(method, u, ...args) {
                            if (typeof u === 'string') {
                                if (u.startsWith('http')) {
                                    if (!u.startsWith('${url.origin}')) u = '${url.origin}/' + u;
                                } else if (u.startsWith('/')) {
                                    u = '${url.origin}/${targetUrlObj.origin}' + u;
                                }
                            }
                            return _origOpen.call(this, method, u, ...args);
                        };
                    })();
                </script>`, { html: true });
            }
        }
        
        try {
            const rewriter = new HTMLRewriter()
                .on('a, link, img, script, iframe, form, source', new AttributeRewriter())
                .on('head', new ScriptInjector());
            return rewriter.transform(new Response(proxyRes.body, {
                status: proxyRes.status,
                statusText: proxyRes.statusText,
                headers: responseHeaders
            }));
        } catch(e) {}
    }

    return new Response(proxyRes.body, {
        status: proxyRes.status,
        statusText: proxyRes.statusText,
        headers: responseHeaders
    });
}

// ---------------- HTML UI ----------------

function get404Html() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>404 Not Found</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; text-align: center; padding-top: 10%; color: #333; background-color: #fff; margin: 0; }
        h1 { font-size: 50px; font-weight: normal; margin-bottom: 20px; }
        p { font-size: 20px; font-weight: 300; color: #555; }
        hr { border: 0; border-top: 1px solid #eee; margin: 30px auto; width: 50%; }
        .footer { font-size: 12px; color: #999; }
        
        #auth-overlay { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(255,255,255,0.95); z-index: 9999; align-items: center; justify-content: center; }
        .auth-box { width: 300px; padding: 30px; border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); background: #fff; border: 1px solid #eee; }
        .auth-box h2 { margin-top: 0; font-size: 18px; font-weight: 600; color: #000; text-align: left; }
        .auth-box input { width: 100%; box-sizing: border-box; padding: 12px; margin: 15px 0; border: 1px solid #ccc; border-radius: 6px; font-size: 14px; outline: none; }
        .auth-box input:focus { border-color: #000; }
        .auth-box button { width: 100%; padding: 12px; background: #000; color: #fff; border: none; border-radius: 6px; font-size: 14px; cursor: pointer; font-weight: 600; }
        .auth-box button:hover { background: #333; }
        #error-msg { color: #d93025; font-size: 13px; text-align: left; min-height: 18px; margin-top: 5px; }
    </style>
</head>
<body>
    <h1>404 Not Found</h1>
    <p>The requested resource could not be found on this server.</p>
    <hr>
    <div class="footer">nginx</div>

    <div id="auth-overlay">
        <div class="auth-box">
            <h2>System Authentication</h2>
            <form id="auth-form">
                <input type="password" id="pwd" placeholder="Enter password" autocomplete="off">
                <button type="submit">Verify</button>
            </form>
            <div id="error-msg"></div>
        </div>
    </div>

    <script>
        document.addEventListener('keydown', function(e) {
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                document.getElementById('auth-overlay').style.display = 'flex';
                document.getElementById('pwd').focus();
            }
            if (e.key === 'Escape') {
                document.getElementById('auth-overlay').style.display = 'none';
            }
        });

        document.getElementById('auth-form').addEventListener('submit', async function(e) {
            e.preventDefault();
            const pwd = document.getElementById('pwd').value;
            const errorMsg = document.getElementById('error-msg');
            const btn = this.querySelector('button');
            
            btn.textContent = 'Verifying...';
            try {
                const res = await fetch('/__proxy_auth', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password: pwd })
                });
                if ((await res.json()).success) {
                    btn.style.background = '#0f9d58';
                    btn.textContent = 'Success';
                    setTimeout(() => window.location.reload(), 500);
                } else {
                    errorMsg.textContent = 'Invalid credentials';
                    btn.textContent = 'Verify';
                    document.getElementById('pwd').value = '';
                }
            } catch (err) {
                errorMsg.textContent = 'Network error';
                btn.textContent = 'Verify';
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
    <title>Gateway Active</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; color: #111; background: #f9f9f9; }
        h1 { font-size: 24px; display: flex; align-items: center; gap: 10px; }
        .card { background: #fff; border: 1px solid #eaeaea; padding: 24px; border-radius: 10px; margin-top: 24px; box-shadow: 0 4px 15px rgba(0,0,0,0.02); }
        h3 { margin-top: 0; font-size: 16px; color: #333; margin-bottom: 15px; }
        input { padding: 12px 16px; width: 60%; border: 1px solid #d1d5db; border-radius: 6px; font-size: 15px; outline: none; }
        input:focus { border-color: #2563eb; }
        button { padding: 12px 24px; background: #2563eb; color: #fff; border: none; border-radius: 6px; font-size: 15px; cursor: pointer; font-weight: 500; transition: background 0.2s; }
        button:hover { background: #1d4ed8; }
        code { background: #f3f4f6; padding: 4px 8px; border-radius: 4px; color: #db2777; font-size: 14px; font-family: monospace; }
        ul { padding-left: 20px; color: #555; }
        li { margin-bottom: 10px; }
    </style>
</head>
<body>
    <h1>🟢 Secure Proxy Gateway</h1>
    <p style="color: #666; font-size: 15px;">Authentication successful. Core proxy engine is active.</p>
    
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
        <h3>🤖 AI API Endpoints (No password needed for APIs)</h3>
        <ul>
            <li>OpenAI: <code>https://${hostname}/v1/chat/completions</code></li>
            <li>Anthropic: <code>https://${hostname}/api/anthropic/v1/messages</code></li>
            <li>Gemini: <code>https://${hostname}/api/gemini/v1beta/models/...</code></li>
            <li>DeepSeek: <code>https://${hostname}/api/deepseek/chat/completions</code></li>
        </ul>
    </div>
</body>
</html>`;
}
