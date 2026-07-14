const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

// Insert global CORS before the first middleware
const insertPos = code.indexOf('  // --- 1. Dynamic Full Web Proxy Middleware ---');
const corsCode = `
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

`;

if (insertPos !== -1 && !code.includes('GLOBAL CORS HANDLING')) {
    code = code.substring(0, insertPos) + corsCode + code.substring(insertPos);
    fs.writeFileSync('server.ts', code);
    console.log("CORS patched.");
} else {
    console.log("Could not find insertion point or already patched.");
}
