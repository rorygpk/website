const fs = require('fs');
const code = fs.readFileSync('server.ts', 'utf-8');

// find where isHtml is used and insert definition above it
const fixedCode = code.replace(
  'if (isHtml && proxyRes.body) {',
  `let isHtml = false;
        if (responseHeaders['content-type'] && responseHeaders['content-type'].toLowerCase().includes('text/html')) {
            isHtml = true;
        }
        if (isHtml && proxyRes.body) {`
);

fs.writeFileSync('server.ts', fixedCode);
console.log("Fixed isHtml.");
