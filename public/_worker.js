export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathStr = url.pathname.slice(1);
    const search = url.search;

    // --- 1. 全局 CORS ---
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

    // --- 2. 预设 AI API ---
    const apiRoutes = {
      'api/openai': 'https://api.openai.com',
      'v1': 'https://api.openai.com/v1',
      'api/gemini': 'https://generativelanguage.googleapis.com',
      'api/anthropic': 'https://api.anthropic.com',
      'api/xai': 'https://api.x.ai',
      'api/deepseek': 'https://api.deepseek.com'
    };

    let targetUrl = '';
    
    for (const [prefix, targetBase] of Object.entries(apiRoutes)) {
        if (pathStr === prefix || pathStr.startsWith(prefix + '/')) {
             const rest = pathStr.slice(prefix.length);
             targetUrl = targetBase + rest + search;
             break;
        }
    }

    // --- 3. 动态代理 ---
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

    // --- 4. 如果没有匹配到代理目标，交给 Cloudflare Pages 处理静态网页 (index.html) ---
    if (!targetUrl) {
        try {
            // env.ASSETS.fetch 会自动返回部署在 Pages 上的前端静态资源
            return await env.ASSETS.fetch(request);
        } catch (e) {
            return new Response("Not Found", { status: 404 });
        }
    }

    // --- 5. 执行代理请求 ---
    try {
        const targetUrlObj = new URL(targetUrl);
        const proxyHeaders = new Headers(request.headers);
        proxyHeaders.delete('Host');
        proxyHeaders.delete('Origin');
        proxyHeaders.delete('Referer');
        proxyHeaders.delete('cf-connecting-ip');
        
        proxyHeaders.set('Host', targetUrlObj.hostname);
        if (!proxyHeaders.has('User-Agent')) {
             proxyHeaders.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
        }
        
        const requestInit = {
            method: request.method,
            headers: proxyHeaders,
            redirect: 'manual'
        };

        if (request.method !== 'GET' && request.method !== 'HEAD') {
             requestInit.body = request.body;
        }

        const proxyRes = await fetch(targetUrl, requestInit);
        const responseHeaders = new Headers(proxyRes.headers);
        
        for (const [key, value] of Object.entries(corsHeaders)) {
            responseHeaders.set(key, value);
        }

        responseHeaders.delete('x-frame-options');
        responseHeaders.delete('content-security-policy');

        if (responseHeaders.has('location')) {
            const loc = responseHeaders.get('location');
            if (loc.startsWith('http')) {
                responseHeaders.set('location', `/${loc}`);
            } else if (loc.startsWith('/')) {
                responseHeaders.set('location', `/${targetUrlObj.origin}${loc}`);
            }
        }
        
        return new Response(proxyRes.body, {
            status: proxyRes.status,
            statusText: proxyRes.statusText,
            headers: responseHeaders
        });

    } catch (e) {
        return new Response(JSON.stringify({ error: "Proxy Error: " + e.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
    }
  }
};
