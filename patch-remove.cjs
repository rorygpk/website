const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

code = code.replace(/\/\/ --- API TRANSPORT OPTIMIZATION[\s\S]*?if \(req\.method === 'OPTIONS'[^}]*\}[\s\S]*?\}/g, '');

fs.writeFileSync('server.ts', code);
console.log("Removed redundant local CORS logic.");
