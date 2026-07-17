const fs = require('fs');
let code = fs.readFileSync('worker.js', 'utf8');

const regex = /return new Response\([\s\S]*?`<html>[\s\S]*?<title>404 Not Found<\/title>[\s\S]*?<\/html>`,\s*\{\s*status:\s*404,\s*headers:\s*\{\s*'Content-Type':\s*'text\/html;charset=UTF-8'\s*\}\s*\}\s*\);/m;

const newStr = `return new Response(
\`<!DOCTYPE html>
<html>
<head>
    <title>404 Not Found</title>
    <style>
        body { font-family: sans-serif; background: #fff; color: #000; text-align: center; padding-top: 50px; }
        h1 { font-size: 24px; font-weight: normal; }
        hr { border: 0; border-top: 1px solid #ccc; max-width: 600px; margin: 20px auto; }
    </style>
</head>
<body>
    <h1>404 Not Found</h1>
    <hr>
    <p>nginx</p>
    <script>
        document.addEventListener('keydown', function(e) {
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                const pwd = prompt("System Access required. Enter passkey:");
                if (pwd) {
                    window.location.href = '/__auth/' + encodeURIComponent(pwd);
                }
            }
        });
    </script>
</body>
</html>\`, 
             { status: 404, headers: { 'Content-Type': 'text/html;charset=UTF-8' } }
        );`;

if (regex.test(code)) {
    code = code.replace(regex, newStr);
    fs.writeFileSync('worker.js', code);
    console.log("Patched successfully!");
} else {
    console.log("Not found.");
}
