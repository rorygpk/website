import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { createProxyMiddleware } from "http-proxy-middleware";

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  // --- 1. Dynamic Full Web Proxy Middleware ---
  // We need to proxy everything that isn't a local static asset or API route
  // We'll use a custom middleware to handle the proxying logic before Vite

  app.use('/proxy', async (req, res, next) => {
    const pathStr = req.originalUrl.slice(7); // Remove /proxy/ prefix
    
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
          // If the referer is our own host and starts with proxy
          if (refUrl.host === req.headers.host && refUrl.pathname.startsWith('/proxy/')) {
            const refPath = refUrl.pathname.slice(7); // remove /proxy/
            if (isUrlOrDomain(refPath)) {
               const baseTarget = new URL(getFullTarget(refPath));
               targetUrl = new URL(pathStr, baseTarget.origin).toString();
            }
          }
        } catch(e) {
          // ignore
        }
      }
    }

    if (targetUrl) {
      // It's a proxy request, handle it
      try {
        const targetUrlObj = new URL(targetUrl);
        
        // Setup proxy headers
        const proxyHeaders = new Headers();
        
        // Copy most headers from original request
        for (const key in req.headers) {
          if (
            key !== 'host' && 
            key !== 'origin' && 
            key !== 'referer' &&
            !key.startsWith('cf-') &&
            !key.startsWith('x-forwarded-') &&
            key !== 'x-real-ip' &&
            key !== 'true-client-ip'
          ) {
            proxyHeaders.set(key, req.headers[key]);
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
          // For simplicity in this demo, we're not streaming the body perfectly if it's large, 
          // but express body-parser isn't enabled yet so it might be tricky. 
          // We'll skip body forwarding for the pure proxy in this simple implementation
          // If you need full body forwarding in express, you'd pipe req to the fetch call.
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
            lowerKey !== 'clear-site-data'
          ) {
            // Rewrite location header for redirects
            if (lowerKey === 'location' && value) {
                if (value.startsWith('http')) {
                    responseHeaders[key] = `/proxy/${value}`;
                } else if (value.startsWith('/')) {
                    responseHeaders[key] = `/proxy/${targetUrlObj.hostname}${value}`;
                } else {
                    responseHeaders[key] = value;
                }
            } else {
                responseHeaders[key] = value;
            }
          }
        });
        
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
              if (
                key !== 'host' && 
                key !== 'origin' && 
                key !== 'referer' &&
                !key.startsWith('cf-') &&
                !key.startsWith('x-forwarded-') &&
                key !== 'x-real-ip'
              ) {
                proxyHeaders.set(key, req.headers[key]);
              }
            }
            
            proxyHeaders.set('Host', new URL(targetBase).hostname);

            const requestInit = {
              method: req.method,
              headers: proxyHeaders,
            };
            
            if (req.method !== 'GET' && req.method !== 'HEAD') {
                // Not passing body correctly for POST yet if body-parser is not used, 
                // but since it's an AI API proxy, we need to pass the raw body. 
                // Using raw body pass-through:
                const chunks = [];
                for await (const chunk of req) {
                    chunks.push(chunk);
                }
                if (chunks.length > 0) {
                    requestInit.body = Buffer.concat(chunks);
                }
            }
            
            const proxyRes = await fetch(targetUrl, requestInit);
            
            res.status(proxyRes.status);
            proxyRes.headers.forEach((value, key) => {
                res.setHeader(key, value);
            });
            
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
            res.status(500).json({ error: `API Proxy Error: ${error.message}` });
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
