export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathStr = url.pathname.slice(1); // remove leading slash
    const search = url.search;

    // --- 1. 全局 CORS 跨域处理 (支持本地前端网页直接调用) ---
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Expose-Headers': '*',
      'Access-Control-Allow-Credentials': 'true',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    // --- 2. 预设主流 AI API 路由映射 ---
    const apiRoutes = {
      'api/openai': 'https://api.openai.com',
      'v1': 'https://api.openai.com/v1',
      'api/gemini': 'https://generativelanguage.googleapis.com',
      'api/anthropic': 'https://api.anthropic.com',
      'api/xai': 'https://api.x.ai',
      'api/deepseek': 'https://api.deepseek.com'
    };

    let targetUrl = '';
    
    // 检查是否匹配预设的 API 路由
    for (const [prefix, targetBase] of Object.entries(apiRoutes)) {
        if (pathStr === prefix || pathStr.startsWith(prefix + '/')) {
             const rest = pathStr.slice(prefix.length);
             targetUrl = targetBase + rest + search;
             break;
        }
    }

    // --- 3. 动态万能代理 (例如请求 /https://www.google.com) ---
    if (!targetUrl && pathStr) {
      let decodedPath = decodeURIComponent(pathStr);
      // 兼容旧版带 proxy/ 前缀的请求
      if (decodedPath.startsWith('proxy/')) {
         decodedPath = decodedPath.slice(6);
      }

      if (decodedPath.startsWith('http://') || decodedPath.startsWith('https://')) {
          targetUrl = decodedPath + search;
      } else if (/^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/.*)?$/.test(decodedPath)) {
          targetUrl = 'https://' + decodedPath + search;
      }
    }

    // --- 4. 根目录：返回使用说明网页 ---
    if (!targetUrl) {
        return new Response(`
            <html>
                <head>
                    <title>Cloudflare 终极代理节点</title>
                    <meta charset="utf-8">
                    <style>
                        body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; line-height: 1.6; max-width: 800px; margin: 0 auto; color: #333; }
                        h1 { color: #f6821f; }
                        code { background: #f1f1f1; padding: 4px 8px; border-radius: 4px; font-family: monospace; color: #e83e8c; }
                        .card { border: 1px solid #ddd; padding: 20px; border-radius: 8px; margin-top: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
                    </style>
                </head>
                <body>
                    <h1>🚀 Cloudflare 终极万能代理已就绪！</h1>
                    <p>这是一个运行在 Cloudflare 边缘网络的高性能代理节点。原生支持跨域 (CORS)，无需配置即可直接被前端项目或本地代码调用。</p>
                    
                    <div class="card">
                        <h3>🤖 AI API 快捷代理 (直接替换官方域名即可)</h3>
                        <ul>
                            <li><b>OpenAI:</b> <code>https://\${url.hostname}/v1/chat/completions</code></li>
                            <li><b>Anthropic:</b> <code>https://\${url.hostname}/api/anthropic/v1/messages</code></li>
                            <li><b>DeepSeek:</b> <code>https://\${url.hostname}/api/deepseek/chat/completions</code></li>
                        </ul>
                    </div>

                    <div class="card">
                        <h3>🌍 万能网页 / API 代理 (前缀拼接)</h3>
                        <p>只需在域名后拼接目标 URL 即可：</p>
                        <ul>
                            <li><b>任意 API:</b> <code>https://\${url.hostname}/https://api.github.com/users</code></li>
                            <li><b>任意网页:</b> <code>https://\${url.hostname}/https://www.google.com</code></li>
                        </ul>
                    </div>
                </body>
            </html>
        `, {
            headers: {
                'Content-Type': 'text/html;charset=UTF-8',
                ...corsHeaders
            }
        });
    }

    // --- 5. 执行代理请求 ---
    try {
        const targetUrlObj = new URL(targetUrl);
        
        // 过滤不需要的请求头
        const proxyHeaders = new Headers(request.headers);
        proxyHeaders.delete('Host');
        proxyHeaders.delete('Origin');
        proxyHeaders.delete('Referer');
        proxyHeaders.delete('cf-connecting-ip');
        proxyHeaders.delete('cf-ipcountry');
        proxyHeaders.delete('cf-ray');
        proxyHeaders.delete('cf-visitor');
        proxyHeaders.delete('x-forwarded-proto');
        proxyHeaders.delete('x-forwarded-for');
        proxyHeaders.delete('x-real-ip');
        
        // 设置目标 Host
        proxyHeaders.set('Host', targetUrlObj.hostname);
        // 为了访问一些外网网页，最好带上一个真实的 User-Agent (如果没有的话)
        if (!proxyHeaders.has('User-Agent')) {
             proxyHeaders.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        }
        
        const requestInit = {
            method: request.method,
            headers: proxyHeaders,
            redirect: 'manual' // 手动处理重定向，防止跳回原域名
        };

        if (request.method !== 'GET' && request.method !== 'HEAD') {
             requestInit.body = request.body;
        }

        const proxyRes = await fetch(targetUrl, requestInit);
        
        const responseHeaders = new Headers(proxyRes.headers);
        
        // 强制注入 CORS 响应头
        for (const [key, value] of Object.entries(corsHeaders)) {
            responseHeaders.set(key, value);
        }

        // 移除会阻止 iframe 嵌套或安全策略的响应头 (针对外网网页代理)
        responseHeaders.delete('x-frame-options');
        responseHeaders.delete('content-security-policy');
        responseHeaders.delete('content-security-policy-report-only');
        responseHeaders.delete('clear-site-data');

        // 自动重写重定向地址，让请求继续走代理
        if (responseHeaders.has('location')) {
            const loc = responseHeaders.get('location');
            if (loc.startsWith('http')) {
                responseHeaders.set('location', `/\${loc}`);
            } else if (loc.startsWith('/')) {
                responseHeaders.set('location', `/\${targetUrlObj.origin}\${loc}`);
            }
        }
        
        // 处理 Cookie 域名和路径问题
        const cookies = proxyRes.headers.getSetCookie ? proxyRes.headers.getSetCookie() : [];
        if (cookies && cookies.length > 0) {
            responseHeaders.delete('set-cookie');
            cookies.forEach(c => {
                 responseHeaders.append('set-cookie', c.replace(/domain=[^;]+/i, '').replace(/Path=[^;]+/i, 'Path=/'));
            });
        }

        return new Response(proxyRes.body, {
            status: proxyRes.status,
            statusText: proxyRes.statusText,
            headers: responseHeaders
        });

    } catch (e) {
        return new Response(JSON.stringify({ error: "代理请求失败: " + e.message, target: targetUrl }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                ...corsHeaders
            }
        });
    }
  }
};
