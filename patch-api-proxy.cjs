const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

code = code.replace(/console\.error\('Proxy error:', error\);\s+next\(\);/g, 
`console.error('Proxy error:', error);
            res.status(500).json({ error: { message: "Proxy Error: " + error.message } });`);

fs.writeFileSync('server.ts', code);
console.log("Patched api proxy catch block.");
