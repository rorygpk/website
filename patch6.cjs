const fs = require('fs');
let code = fs.readFileSync('worker.js', 'utf8');

const regex = /return new Response\(`<!DOCTYPE html>[\s\S]*?<\/html>`, \s*\{\s*status:\s*404,\s*headers:\s*\{\s*'Content-Type':\s*'text\/html;charset=UTF-8'\s*\}\s*\}\s*\);/m;

const newStr = `return new Response(
\`<!DOCTYPE html>
<html>
<head>
    <title>404 Not Found</title>
    <style>
        body { font-family: sans-serif; background: #fff; color: #000; text-align: center; padding-top: 50px; margin: 0; }
        h1 { font-size: 24px; font-weight: normal; }
        hr { border: 0; border-top: 1px solid #ccc; max-width: 600px; margin: 20px auto; }
        #secret-trigger { cursor: default; user-select: none; }
        #auth-overlay {
            display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.8); align-items: center; justify-content: center; z-index: 9999;
        }
        #auth-box { background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); text-align: left; }
        #auth-box input { padding: 8px; width: 200px; margin-right: 10px; border: 1px solid #ccc; border-radius: 4px; }
        #auth-box button { padding: 8px 16px; background: #333; color: #fff; border: none; border-radius: 4px; cursor: pointer; }
    </style>
</head>
<body>
    <h1>404 Not Found</h1>
    <hr>
    <p id="secret-trigger">nginx</p>

    <div id="auth-overlay">
        <div id="auth-box">
            <h3 style="margin-top: 0">System Access</h3>
            <input type="password" id="auth-pwd" placeholder="Enter passkey">
            <button id="auth-btn">Login</button>
        </div>
    </div>

    <script>
        function showAuth() {
            document.getElementById('auth-overlay').style.display = 'flex';
            const input = document.getElementById('auth-pwd');
            input.focus();
            
            const submit = () => {
                const pwd = input.value;
                if (pwd) window.location.href = '/__auth/' + encodeURIComponent(pwd);
            };
            
            document.getElementById('auth-btn').onclick = submit;
            input.onkeydown = (e) => { if (e.key === 'Enter') submit(); };
        }

        document.addEventListener('keydown', function(e) {
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                showAuth();
            }
        });

        let clickCount = 0;
        let clickTimer;
        document.getElementById('secret-trigger').addEventListener('click', function() {
            clickCount++;
            clearTimeout(clickTimer);
            if (clickCount >= 3) {
                clickCount = 0;
                showAuth();
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
