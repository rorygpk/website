const fs = require('fs');
let code = fs.readFileSync('worker.js', 'utf8');

const regex = /return new Response\(\`<html><head><title>404 Not Found<\/title><\/head><body><center><h1>404 Not Found<\/h1><\/center><hr><center>nginx<\/center><\/body><\/html>\`,\s*\{ status: 404, headers: \{ 'Content-Type': 'text\/html;charset=UTF-8' \} \}\s*\);/g;

const newStr = `return new Response(\`<html><head><title>404 Not Found</title></head><body style="text-align:center;font-family:sans-serif;padding-top:50px;"><h1>404 Not Found</h1><hr style="max-width:600px;border-top:1px solid #ccc;border-bottom:0;"><p>nginx</p><script>document.addEventListener('keydown',function(e){if((e.ctrlKey||e.metaKey)&&e.shiftKey&&e.key.toLowerCase()==='k'){e.preventDefault();const pwd=prompt("System Access:");if(pwd)window.location.href='/__auth/'+encodeURIComponent(pwd);}});</script></body></html>\`, { status: 404, headers: { 'Content-Type': 'text/html;charset=UTF-8' } });`;

code = code.replace(regex, newStr);
fs.writeFileSync('worker.js', code);
