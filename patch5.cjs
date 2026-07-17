const fs = require('fs');
let code = fs.readFileSync('worker.js', 'utf8');

const regex = /return new Response\(`<!DOCTYPE html>[\s\S]*?<\/html>`, \s*\{\s*status:\s*404,\s*headers:\s*\{\s*'Content-Type':\s*'text\/html;charset=UTF-8'\s*\}\s*\}\s*\);/m;

const newStr = `return new Response(
\`<!DOCTYPE html>
<html>
<head>
    <title>404 Not Found</title>
    <style>
        body { font-family: sans-serif; background: #fff; color: #000; text-align: center; padding-top: 50px; }
        h1 { font-size: 24px; font-weight: normal; }
        hr { border: 0; border-top: 1px solid #ccc; max-width: 600px; margin: 20px auto; }
        #secret-trigger { cursor: default; user-select: none; }
    </style>
</head>
<body>
    <h1>404 Not Found</h1>
    <hr>
    <p id="secret-trigger">nginx</p>
    <script>
        function triggerAuth() {
            const pwd = prompt("System Access required. Enter passkey:");
            if (pwd) {
                window.location.href = '/__auth/' + encodeURIComponent(pwd);
            }
        }

        // Listen for Ctrl + Shift + K (or Cmd + Shift + K on Mac)
        document.addEventListener('keydown', function(e) {
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                triggerAuth();
            }
        });

        // Fallback: Triple click on "nginx" to trigger it, in case iframe focus blocks keyboard events
        let clickCount = 0;
        let clickTimer;
        document.getElementById('secret-trigger').addEventListener('click', function() {
            clickCount++;
            clearTimeout(clickTimer);
            if (clickCount >= 3) {
                clickCount = 0;
                triggerAuth();
            } else {
                clickTimer = setTimeout(() => clickCount = 0, 500);
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
