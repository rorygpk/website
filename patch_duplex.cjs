const fs = require('fs');
let code = fs.readFileSync('worker.js', 'utf8');

// Fix API proxy
code = code.replace(
    /const init = \{ method: request.method, headers: newHeaders, redirect: 'follow' \};/g,
    "const init = { method: request.method, headers: newHeaders, redirect: 'follow', duplex: 'half' };"
);

// Fix Web proxy
code = code.replace(
    /const requestInit = \{ method: request.method, headers: proxyHeaders, redirect: 'manual' \};/g,
    "const requestInit = { method: request.method, headers: proxyHeaders, redirect: 'manual', duplex: 'half' };"
);

fs.writeFileSync('worker.js', code);
console.log("Duplex patched successfully!");
