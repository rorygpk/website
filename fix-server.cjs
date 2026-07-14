const fs = require('fs');
const code = fs.readFileSync('server.ts', 'utf-8');

const regex = /app\.use\(prefix, async \(req, res\) => \{[\s\S]*?res\.status\(500\)\.json\([^)]*\);\s*\}\s*\}\);/g;

const replacement = `app.use(prefix, async (req, res) => {
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
    });`;

fs.writeFileSync('server.ts', code.replace(regex, replacement));
console.log("Fixed second proxy!");
