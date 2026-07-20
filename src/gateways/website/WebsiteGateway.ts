import { RequestContext } from '../../core/RequestContext';

export class WebsiteGateway {
  public static async handleRequest(ctx: RequestContext): Promise<Response> {
    const url = ctx.url;
    
    // Extract target URL from path. E.g., /https://google.com/...
    let targetUrlStr = url.pathname.substring(1) + url.search;
    
    if (!targetUrlStr.startsWith('http://') && !targetUrlStr.startsWith('https://')) {
        // Handle relative paths by checking Referer
        const referer = ctx.request.headers.get('Referer');
        if (referer) {
            try {
                const refUrl = new URL(referer);
                const match = refUrl.pathname.match(/\/(https?:\/\/[^/]+)/);
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
            return new Response('Invalid Gateway URL. Format: /https://example.com', { status: 400 });
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
          'host', 'cookie', 'cf-connecting-ip', 'cf-ray', 'cf-ipcountry', 
          'cf-visitor', 'x-forwarded-for', 'x-forwarded-proto', 'x-real-ip', 
          'true-client-ip', 'connection'
      ];
      headersToRemove.forEach(h => proxyHeaders.delete(h));
      
      // 2. Fix Referer and Origin for target site
      if (proxyHeaders.has('referer')) {
          proxyHeaders.set('referer', targetUrl.toString());
      } else {
          proxyHeaders.set('referer', targetUrl.origin + '/');
      }
      
      if (proxyHeaders.has('origin')) {
          proxyHeaders.set('origin', targetUrl.origin);
      }

      // 3. Ensure Accept-Encoding handles modern compression natively
      proxyHeaders.set('accept-encoding', 'gzip, deflate, br');

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
      responseHeaders.set('Access-Control-Allow-Origin', '*');
      responseHeaders.delete('Content-Security-Policy'); // Relax CSP for proxying
      responseHeaders.delete('X-Frame-Options');
      responseHeaders.delete('Report-To');
      responseHeaders.delete('NEL');

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

      // We rely on standard proxying. Complex HTMLRewriting is avoided as it breaks subresource integrity.
      // Modern CF challenges (Turnstile) use relative paths which we now handle correctly via the Referer logic above!
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

