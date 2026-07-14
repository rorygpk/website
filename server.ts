import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { createProxyMiddleware } from "http-proxy-middleware";

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;


  // --- GLOBAL CORS HANDLING ---
  app.use((req, res, next) => {
    res.set({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Expose-Headers': '*',
        'Access-Control-Allow-Credentials': 'true'
    });
    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }
    next();
  });

  // --- 1. Dynamic Full Web Proxy Middleware ---
  // We need to proxy everything that isn't a local static asset or API route
  // We'll use a custom middleware to handle the proxying logic before Vite

  app.use(async (req, res, next) => {
    // 1. Skip our own API proxies
    if (req.url.startsWith('/api/') || req.url.startsWith('/v1/')) return next();

    let isExplicitProxy = req.url.startsWith('/proxy/');
    let pathStr = isExplicitProxy ? req.url.slice(7) : req.url.slice(1);
    
    // Check if it's a URL or Domain
    const isUrlOrDomain = (str) => {
        if (str.startsWith('http://') || str.startsWith('https://')) return true;
        // Basic domain regex
        return /^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/.*)?$/.test(str) && !str.includes(' ');
    };
    
    const getFullTarget = (str) => {
        if (str.startsWith('http://') || str.startsWith('https://')) return str;
        return 'https://' + str;
    };

    let targetUrl = '';
    
    // Check if the path itself is a URL
    if (isUrlOrDomain(pathStr.split('?')[0])) {
        targetUrl = getFullTarget(pathStr);
    } else {
      // Fallback: check referer if we're loading assets for a proxied page
      const referer = req.headers.referer;
      if (referer) {
        try {
          const refUrl = new URL(referer);
          // If the referer is our own host and starts with /proxy/
          if (refUrl.host === req.headers.host && refUrl.pathname.startsWith('/proxy/')) {
            const refPath = refUrl.pathname.slice(7); // remove /proxy/
            if (isUrlOrDomain(refPath)) {
               const baseTarget = new URL(getFullTarget(refPath));
               // Construct the URL using the base target and the original request URL
               targetUrl = new URL(req.url, baseTarget.origin).toString();
            }
          }
        } catch(e) {
          // ignore
        }
      }
    }

    if (targetUrl) {
      // If we derived the target from referer but the request didn't explicitly have /proxy/,
      // and it is a document navigation, we should redirect the browser to the /proxy/ path.
      // This ensures the iframe's URL updates to /proxy/... so subsequent clicks keep working.
      if (!isExplicitProxy) {
          const isDoc = req.headers['sec-fetch-dest'] === 'document' || req.headers['sec-fetch-dest'] === 'iframe' || (req.headers.accept && req.headers.accept.includes('text/html'));
          if (isDoc) {
              res.redirect(302, `/proxy/${targetUrl}`);
              return;
          }
      }

      // It's a proxy request, handle it
      try {
        const targetUrlObj = new URL(targetUrl);
        
        // Setup proxy headers
        const proxyHeaders = new Headers();
        
        // Copy most headers from original request
        for (const key in req.headers) {
          const lowerKey = key.toLowerCase();
          const val = req.headers[key];
          if (
            val !== undefined &&
            lowerKey !== 'host' && 
            lowerKey !== 'origin' && 
            lowerKey !== 'referer' &&
            lowerKey !== 'connection' &&
            lowerKey !== 'keep-alive' &&
            lowerKey !== 'upgrade' &&
            lowerKey !== 'content-length' &&
            lowerKey !== 'transfer-encoding' &&
            !lowerKey.startsWith('cf-') &&
            !lowerKey.startsWith('x-forwarded-') &&
            lowerKey !== 'x-real-ip' &&
            lowerKey !== 'true-client-ip'
          ) {
            proxyHeaders.set(key, Array.isArray(val) ? val.join(', ') : val);
          }
        }
        
        proxyHeaders.set('Host', targetUrlObj.hostname);
        
        if (!proxyHeaders.has('accept-encoding')) {
            proxyHeaders.set('accept-encoding', 'gzip, deflate, br');
        }

        const requestInit = {
          method: req.method,
          headers: proxyHeaders,
          redirect: 'manual' // Handle redirects manually
        };
        
        if (req.method !== 'GET' && req.method !== 'HEAD') {
            const chunks = [];
            for await (const chunk of req) {
                chunks.push(chunk);
            }
            if (chunks.length > 0) {
                requestInit.body = Buffer.concat(chunks);
            }
        }

        const proxyRes = await fetch(targetUrl, requestInit);
        
        // Copy response headers back
        const responseHeaders = {};
        proxyRes.headers.forEach((value, key) => {
          // Strip security headers that block framing
          const lowerKey = key.toLowerCase();
          if (
            lowerKey !== 'x-frame-options' &&
            lowerKey !== 'content-security-policy' &&
            lowerKey !== 'content-security-policy-report-only' &&
            lowerKey !== 'clear-site-data' &&
            lowerKey !== 'content-encoding' &&
            lowerKey !== 'content-length' &&
            lowerKey !== 'set-cookie'
          ) {
            // Rewrite location header for redirects
            if (lowerKey === 'location' && value) {
                if (value.startsWith('http')) {
                    responseHeaders[key] = `/proxy/${value}`;
                } else if (value.startsWith('//')) {
                    responseHeaders[key] = `/proxy/https:${value}`;
                } else if (value.startsWith('/')) {
                    responseHeaders[key] = `/proxy/${targetUrlObj.origin}${value}`;
                } else {
                    responseHeaders[key] = value;
                }
            } else {
                responseHeaders[key] = value;
            }
          }
        });
        
        if (proxyRes.headers.getSetCookie) {
            const cookies = proxyRes.headers.getSetCookie();
            if (cookies && cookies.length > 0) {
                // Rewrite domain and path for cookies so they are accepted by the browser
                responseHeaders['set-cookie'] = cookies.map(c => {
                    return c.replace(/domain=[^;]+/i, '').replace(/Path=[^;]+/i, 'Path=/');
                });
            }
        }
        
        

        if (isHtml && proxyRes.body) {
            const chunks = [];
            const reader = proxyRes.body.getReader();
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                chunks.push(value);
            }
            let html = Buffer.concat(chunks).toString('utf8');
            
            // Rewrite absolute URLs
            html = html.replace(/(src|href|action)=["'](https?:\/\/[^"']+)["']/gi, (match, attr, url) => {
                return `${attr}="/proxy/${url}"`;
            });
            // Rewrite protocol-relative URLs
            html = html.replace(/(src|href|action)=["'](\/\/[^"']+)["']/gi, (match, attr, url) => {
                return `${attr}="/proxy/https:${url}"`;
            });
            // Rewrite srcset
            html = html.replace(/srcset=["']([^"']+)["']/gi, (match, content) => {
                const rewritten = content.split(',').map(part => {
                    let [url, size] = part.trim().split(/\s+/);
                    if (url && url.startsWith('http')) {
                        url = '/proxy/' + url;
                    } else if (url && url.startsWith('//')) {
                        url = '/proxy/https:' + url;
                    }
                    return size ? `${url} ${size}` : url;
                }).join(', ');
                return `srcset="${rewritten}"`;
            });

            // Inject client-side interception script
            const script = `<script>
               document.addEventListener('click', function(e) {
                   const a = e.target.closest('a');
                   if (a && a.href && a.href.startsWith('http') && !a.href.startsWith(location.origin + '/proxy/')) {
                       e.preventDefault();
                       location.href = '/proxy/' + a.href;
                   }
               }, true);
               document.addEventListener('submit', function(e) {
                   if (e.target && e.target.action && e.target.action.startsWith('http') && !e.target.action.startsWith(location.origin + '/proxy/')) {
                       e.preventDefault();
                       const form = e.target;
                       const method = (form.method || 'GET').toUpperCase();
                       if (method === 'GET') {
                           const url = new URL(form.action);
                           const formData = new FormData(form);
                           const params = new URLSearchParams(formData);
                           location.href = '/proxy/' + url.origin + url.pathname + '?' + params.toString();
                       } else {
                           form.action = '/proxy/' + form.action;
                           form.submit();
                       }
                   }
               }, true);
            </script>`;
            
            if (html.match(/<head[^>]*>/i)) {
                html = html.replace(/(<head[^>]*>)/i, `$1${script}`);
            } else {
                html = script + html;
            }

            delete responseHeaders['content-length'];
            res.set(responseHeaders);
            res.status(proxyRes.status);
            res.send(html);
        } else {
            // Set headers and status
            res.set(responseHeaders);
            res.status(proxyRes.status);
            
            // Stream response back
            if (proxyRes.body) {
               const reader = proxyRes.body.getReader();
               while (true) {
                 const { done, value } = await reader.read();
                 if (done) break;
                 res.write(value);
               }
               res.end();
            } else {
               res.end();
            }
        }

      } catch (error) {
        console.error("Proxy Error:", error);
        res.status(500).send(`Proxy Error: ${error.message}`);
      }
    } else {
      // Not a proxy request, pass to Vite/static handler
      next();
    }
  });


  // --- API Proxies ---
  // Proxy for deep AI traffic management
  const apiRoutes = {
    '/api/openai': 'https://api.openai.com',
    '/v1': 'https://api.openai.com/v1',
    '/api/gemini': 'https://generativelanguage.googleapis.com',
    '/api/anthropic': 'https://api.anthropic.com',
    '/api/xai': 'https://api.x.ai',
    '/api/deepseek': 'https://api.deepseek.com'
  };

  Object.entries(apiRoutes).forEach(([prefix, targetBase]) => {
    app.use(prefix, async (req, res) => {
        try {
            const targetUrl = targetBase + req.url;
            
            const proxyHeaders = new Headers();
            for (const key in req.headers) {
              const lowerKey = key.toLowerCase();
              const val = req.headers[key];
              if (
                val !== undefined &&
                lowerKey !== 'host' && 
                lowerKey !== 'origin' && 
                lowerKey !== 'referer' &&
                lowerKey !== 'connection' &&
                lowerKey !== 'keep-alive' &&
                lowerKey !== 'upgrade' &&
                lowerKey !== 'content-length' &&
                lowerKey !== 'transfer-encoding' &&
                !lowerKey.startsWith('cf-') &&
                !lowerKey.startsWith('x-forwarded-') &&
                lowerKey !== 'x-real-ip'
              ) {
                proxyHeaders.set(key, Array.isArray(val) ? val.join(', ') : val);
              }
            }
            
            proxyHeaders.set('Host', new URL(targetBase).hostname);
            const requestInit = {
              method: req.method,
              headers: proxyHeaders,
            };
            
            if (req.method !== 'GET' && req.method !== 'HEAD') {
                const chunks = [];
                for await (const chunk of req) {
                    chunks.push(chunk);
                }
                if (chunks.length > 0) {
                    requestInit.body = Buffer.concat(chunks);
                }
            }
            
            const proxyRes = await fetch(targetUrl, requestInit);
            
            // Set headers and status
            const responseHeaders = {};
            proxyRes.headers.forEach((value, key) => {
                if (key.toLowerCase() !== 'content-encoding' && key.toLowerCase() !== 'content-length') {
                    responseHeaders[key] = value;
                }
            });
            res.set(responseHeaders);
            res.status(proxyRes.status);
            
            if (proxyRes.body) {
                const reader = proxyRes.body.getReader();
                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;
                  res.write(value);
                }
                res.end();
            } else {
                res.end();
            }
            
        } catch (error) {
            console.error("API Proxy Error:", error);
            res.status(500).json({ error: { message: "API Proxy Error: " + error.message } });
        }
    });
  });

  // Vite middleware for development (handles frontend UI)
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
