import { RequestContext } from '../../core/RequestContext';

export class WebsiteGateway {
  public static async handleRequest(ctx: RequestContext): Promise<Response> {
    const url = ctx.url;
    let targetUrlStr = url.pathname.substring(1) + url.search;
    
    // Quick handle for preflight
    if (ctx.request.method === 'OPTIONS') {
        return new Response(null, {
            status: 204,
            headers: {
                'Access-Control-Allow-Origin': ctx.request.headers.get('Origin') || '*',
                'Access-Control-Allow-Credentials': 'true',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
                'Access-Control-Allow-Headers': ctx.request.headers.get('Access-Control-Request-Headers') || '*',
                'Access-Control-Max-Age': '86400',
            }
        });
    }

    if (!targetUrlStr.startsWith('http://') && !targetUrlStr.startsWith('https://')) {
        // Handle relative paths by checking Referer
        const referer = ctx.request.headers.get('Referer');
        if (referer) {
            try {
                const refUrl = new URL(referer);
                const match = refUrl.pathname.match(/\/(https?:\/\/[^/]+)(.*)/);
                if (match) {
                    const targetOrigin = match[1];
                    targetUrlStr = targetOrigin + url.pathname + url.search;
                } else {
                    return new Response('Invalid Gateway URL', { status: 400 });
                }
            } catch (e) {
                return new Response('Invalid Gateway URL', { status: 400 });
            }
        } else {
             return new Response('Invalid Gateway URL', { status: 400 });
        }
    }

    try {
      const targetUrl = new URL(targetUrlStr);
      
      // ==========================================
      // ADVANCED CAMOUFLAGE ENGINE (反封锁引擎)
      // ==========================================
      // Copy all headers from the client to maintain perfect browser consistency (Sec-Fetch, Accept, etc.)
      const proxyHeaders = new Headers(ctx.request.headers);
      
      // 1. Strip structural headers and identifiers
      const headersToRemove = [
          'host', 'cf-connecting-ip', 'cf-ray', 'cf-ipcountry', 
          'cf-visitor', 'x-forwarded-for', 'x-forwarded-proto', 'x-real-ip', 
          'true-client-ip', 'connection'
      ];
      headersToRemove.forEach(h => proxyHeaders.delete(h));
      
      // 2. Fix Referer and Origin for target site
      const clientReferer = ctx.request.headers.get('referer');
      if (clientReferer) {
          try {
              const clientRefUrl = new URL(clientReferer);
              const match = clientRefUrl.pathname.match(/\/(https?:\/\/[^/]+)(.*)/);
              if (match) {
                  proxyHeaders.set('referer', match[1] + match[2] + clientRefUrl.search);
              } else {
                  proxyHeaders.set('referer', targetUrl.origin + '/');
              }
          } catch (e) {
              proxyHeaders.set('referer', targetUrl.origin + '/');
          }
      } else {
          proxyHeaders.set('referer', targetUrl.origin + '/');
      }
      
      if (proxyHeaders.has('origin')) {
          const clientOrigin = proxyHeaders.get('origin')!;
          const match = clientOrigin.match(/\/(https?:\/\/[^/]+)/);
          if (match) {
              proxyHeaders.set('origin', match[1]);
          } else {
              proxyHeaders.set('origin', targetUrl.origin);
          }
      }

      // 3. Keep upstream cookies, but strip gateway ones
      const rawCookie = ctx.request.headers.get('cookie');
      if (rawCookie) {
          const cleanCookies = rawCookie.split(';')
              .map(c => c.trim())
              .filter(c => !c.startsWith('gateway_session=') && !c.startsWith('cf_proxy_session='))
              .join('; ');
          if (cleanCookies) {
              proxyHeaders.set('cookie', cleanCookies);
          } else {
              proxyHeaders.delete('cookie');
          }
      }

      // Initialize upstream request
      const proxyRequest = new Request(targetUrl.toString(), {
        method: ctx.request.method,
        headers: proxyHeaders,
        body: ctx.request.method !== 'GET' && ctx.request.method !== 'HEAD' ? ctx.request.body : null,
        redirect: 'manual'
      });

      const response = await fetch(proxyRequest);
      
      // Rewrite response headers
      const responseHeaders = new Headers(response.headers);
      
      const clientOriginHeader = ctx.request.headers.get('Origin') || '*';
      responseHeaders.set('Access-Control-Allow-Origin', clientOriginHeader);
      responseHeaders.set('Access-Control-Allow-Credentials', 'true');
      responseHeaders.delete('Content-Security-Policy'); // Relax CSP for proxying
      responseHeaders.delete('X-Frame-Options');
      responseHeaders.delete('Report-To');
      responseHeaders.delete('NEL');

      // 4. Rewrite Set-Cookie headers to apply to the gateway domain
      if (responseHeaders.has('Set-Cookie')) {
          let setCookies: string[] = [];
          if (typeof responseHeaders.getSetCookie === 'function') {
              setCookies = responseHeaders.getSetCookie();
          } else {
              // Fallback if getSetCookie is missing
              const cookieStr = responseHeaders.get('Set-Cookie');
              if (cookieStr) {
                  setCookies = cookieStr.split(/,(?=\s*[A-Za-z0-9_-]+\=)/);
              }
          }
          
          responseHeaders.delete('Set-Cookie');
          for (let cookie of setCookies) {
              // Remove Domain so it binds to our proxy domain
              cookie = cookie.replace(/;\s*domain=[^;]+/i, '');
              responseHeaders.append('Set-Cookie', cookie);
          }
      }

      // Handle redirects
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = responseHeaders.get('Location');
        if (location) {
           let newLocation = location;
           if (location.startsWith('/')) {
               newLocation = targetUrl.origin + location;
           } else if (!location.startsWith('http')) {
               // Relative path like "page.html"
               newLocation = targetUrl.toString().replace(/\/[^\/]*$/, '/') + location;
           }
           responseHeaders.set('Location', `/${newLocation}`);
        }
      }

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders
      });

    } catch (e: any) {
        console.error('Website Gateway Error:', e);
        return new Response('Gateway Proxy Error: ' + e.message, { status: 502 });
    }
  }
}

