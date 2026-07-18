import { RequestContext } from '../../core/RequestContext';

export class WebsiteGateway {
  public static async handleRequest(ctx: RequestContext): Promise<Response> {
    const url = ctx.url;
    
    // Extract target URL from path. E.g., /https://google.com/...
    let targetUrlStr = url.pathname.substring(1) + url.search;
    
    if (!targetUrlStr.startsWith('http://') && !targetUrlStr.startsWith('https://')) {
        // Handle relative paths by checking Referer if possible, or just default behavior
        const referer = ctx.request.headers.get('Referer');
        if (referer) {
            try {
                const refUrl = new URL(referer);
                let base = refUrl.pathname.substring(1);
                if (base.startsWith('http')) {
                    // Extract origin from referer target
                    const targetOrigin = new URL(base).origin;
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
      
      // Clean up headers
      const proxyHeaders = new Headers(ctx.request.headers);
      proxyHeaders.delete('Host');
      proxyHeaders.delete('Cookie'); // Strip our gateway cookies
      
      // Pass through user-agent to avoid blocking
      const ua = proxyHeaders.get('User-Agent');
      if (!ua || ua.includes('Cloudflare') || ua.includes('curl')) {
          proxyHeaders.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
      }

      // Ensure we get uncompressed data if we need to rewrite HTML/JS
      // For now we don't fully implement HTMLRewriter, so we just proxy.
      // A full Enterprise Gateway would instantiate HtmlRewriterPlugin here.
      proxyHeaders.set('Accept-Encoding', 'identity');

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

      // Handle redirects
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = responseHeaders.get('Location');
        if (location) {
           let newLocation = location;
           if (location.startsWith('/')) {
               newLocation = targetUrl.origin + location;
           }
           responseHeaders.set('Location', `/${newLocation}`);
        }
      }

      // Basic HTML rewriting logic (Proof of Concept)
      const contentType = responseHeaders.get('Content-Type') || '';
      if (contentType.includes('text/html')) {
          // In a real CF worker, use HTMLRewriter. Here we just return as is or do basic string replace
          // Since we want to support full modern sites, we use HTMLRewriter if available.
          if (typeof HTMLRewriter !== 'undefined') {
              let rewriter = new HTMLRewriter()
                .on('a', {
                    element(element: any) {
                        const href = element.getAttribute('href');
                        if (href && !href.startsWith('javascript:')) {
                            if (href.startsWith('http')) {
                                element.setAttribute('href', `/${href}`);
                            } else if (href.startsWith('/')) {
                                element.setAttribute('href', `/${targetUrl.origin}${href}`);
                            }
                        }
                    }
                })
                .on('link', {
                    element(element: any) {
                        const href = element.getAttribute('href');
                        if (href && href.startsWith('/')) {
                            element.setAttribute('href', `/${targetUrl.origin}${href}`);
                        } else if (href && href.startsWith('http')) {
                            element.setAttribute('href', `/${href}`);
                        }
                    }
                })
                .on('script', {
                    element(element: any) {
                        const src = element.getAttribute('src');
                        if (src && src.startsWith('/')) {
                            element.setAttribute('src', `/${targetUrl.origin}${src}`);
                        } else if (src && src.startsWith('http')) {
                             element.setAttribute('src', `/${src}`);
                        }
                    }
                })
                .on('img', {
                    element(element: any) {
                        const src = element.getAttribute('src');
                        if (src && src.startsWith('/')) {
                            element.setAttribute('src', `/${targetUrl.origin}${src}`);
                        } else if (src && src.startsWith('http')) {
                            element.setAttribute('src', `/${src}`);
                        }
                    }
                });
              
              return rewriter.transform(new Response(response.body, {
                  status: response.status,
                  statusText: response.statusText,
                  headers: responseHeaders
              }));
          }
      }

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders
      });

    } catch (e: any) {
        console.error('Website Gateway Error:', e);
        return new Response('Gateway Error: ' + e.message, { status: 502 });
    }
  }
}
