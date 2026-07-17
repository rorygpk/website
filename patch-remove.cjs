const fs = require('fs');
let code = fs.readFileSync('worker.js', 'utf8');

const targetStr = '<html><head><title>404 Not Found</title></head><body><center><h1>404 Not Found</h1></center><hr><center>nginx</center></body></html>';
const newStr = `<html><head><title>404 Not Found</title></head><body style="text-align:center;font-family:sans-serif;padding-top:50px;"><h1>404 Not Found</h1><hr style="max-width:600px;border-top:1px solid #ccc;border-bottom:0;"><p>nginx</p><script>document.addEventListener('keydown',function(e){if((e.ctrlKey||e.metaKey)&&e.shiftKey&&e.key.toLowerCase()==='k'){e.preventDefault();const pwd=prompt("System Access:");if(pwd)window.location.href='/__auth/'+encodeURIComponent(pwd);}});</script></body></html>`;

if (code.includes(targetStr)) {
    code = code.replace(targetStr, newStr);
    fs.writeFileSync('worker.js', code);
    console.log("Patched successfully!");
} else {
    console.log("Target string not found!");
}
