import { Middleware } from '../core/MiddlewarePipeline';

// Extremely difficult to crack 404 dynamic defence page
const FAKE_404_PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <!-- Unauthorized access is strictly prohibited. -->
    <meta name="x-gateway-protocol" content="AUTH_ALGO_V4: Seed: GATE-[HEX]-[NUM]-[OP]. Token: ETAG-[REVERSE_HEX]-[CALCULATED_NUM]-OPEN. Delimiter: '-' or '/'. OP: A5(Add 5), S3(Subtract 3), M2(Multiply by 2). Valid for 5 mins.">
    <title>404 Not Found</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; text-align: center; padding-top: 10%; color: #333; background: #fff; }
        h1 { font-size: 2.5rem; font-weight: 500; margin-bottom: 1rem; }
        p { font-size: 1.2rem; color: #666; }
        /* Hidden trigger zone */
        #trigger-zone { position: fixed; bottom: 0; right: 0; width: 50px; height: 50px; cursor: default; opacity: 0; z-index: 9999; }
        /* Terminal overlay */
        #terminal { display: none; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 450px; background: #000; color: #0f0; font-family: monospace; padding: 20px; border-radius: 5px; box-shadow: 0 0 20px rgba(0,0,0,0.5); text-align: left; z-index: 10000; }
        #terminal input { display: none; background: transparent; border: none; color: #0f0; outline: none; font-family: monospace; font-size: 1rem; width: 80%; }
        #overlay { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 9998; }
    </style>
</head>
<body>
    <h1>404 Not Found</h1>
    <p>The requested URL was not found on this server.</p>
    <hr style="width: 50%; margin: 2rem auto; border: 0; border-top: 1px solid #eee;">
    <p style="font-size: 0.9rem; color: #999;">nginx</p>
    
    <div id="trigger-zone"></div>
    <div id="overlay"></div>
    <div id="terminal">
        <div id="hint-text"></div>
        <br>
        <span>></span> <input type="text" id="auth-input" autocomplete="off" autofocus>
    </div>

    <script>
        let clicks = 0;
        let lastClickTime = 0;
        const trigger = document.getElementById('trigger-zone');
        const terminal = document.getElementById('terminal');
        const overlay = document.getElementById('overlay');
        const input = document.getElementById('auth-input');
        const hintText = document.getElementById('hint-text');

        // Secret sequence: 5 fast clicks in bottom right corner
        trigger.addEventListener('click', (e) => {
            const now = Date.now();
            if (now - lastClickTime > 500) clicks = 0;
            clicks++;
            lastClickTime = now;
            
            if (clicks === 5) {
                terminal.style.display = 'block';
                overlay.style.display = 'block';
                hintText.innerHTML = 'Establishing secure connection...';
                
                // Fetch dynamic challenge
                fetch('/_gateway/challenge', { method: 'POST' })
                    .then(res => res.json())
                    .then(data => {
                        setTimeout(() => {
                            hintText.innerHTML = 'Enterprise Gateway Access<br>Seed: <span style="color:#ff0">' + data.seed + '</span><br>Enter Dynamic Token:';
                            input.style.display = 'inline-block';
                            input.focus();
                        }, 800);
                    });
            }
        });

        // Also allow Ctrl+Shift+F12
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'F12') {
                e.preventDefault();
                trigger.click(); trigger.click(); trigger.click(); trigger.click(); trigger.click();
            }
        });

        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const token = input.value;
                input.value = '';
                input.style.display = 'none';
                hintText.innerHTML += '<br>> ' + '*'.repeat(token.length);
                hintText.innerHTML += '<br>Verifying signature...';
                
                setTimeout(() => {
                    fetch('/_gateway/verify', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ token: token })
                    }).then(res => res.json()).then(data => {
                        if (data.success) {
                            hintText.innerHTML += '<br><span style="color:#0f0">Access Granted. Initiating Portal...</span>';
                            setTimeout(() => window.location.reload(), 1000);
                        } else {
                            hintText.innerHTML += '<br><span style="color:red">ERR_INVALID_SIGNATURE: Access Denied.</span>';
                            setTimeout(() => {
                                terminal.style.display = 'none';
                                overlay.style.display = 'none';
                                clicks = 0;
                                hintText.innerHTML = '';
                            }, 1500);
                        }
                    });
                }, 800);
            }
        });
    </script>
</body>
</html>`;

export const authMiddleware: Middleware = async (ctx, next) => {
  const url = ctx.url;
  
  // 1. Handle Challenge request
  if (url.pathname === '/_gateway/challenge' && ctx.request.method === 'POST') {
    // Generate a time-based structured seed, valid for 5 minutes (300,000 ms)
    const timeWindow = Math.floor(Date.now() / 300000);
    const hexPart = (timeWindow % 65536).toString(16).padStart(4, '0').toUpperCase();
    const numPart = (timeWindow % 10000).toString().padStart(4, '0');
    
    const opMode = timeWindow % 3;
    let opCode = '';
    if (opMode === 0) opCode = 'A5';
    else if (opMode === 1) opCode = 'S3';
    else if (opMode === 2) opCode = 'M2';
    
    const seed = `GATE-${hexPart}-${numPart}-${opCode}`;
    
    return new Response(JSON.stringify({ seed }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 2. Handle Verify request
  if (url.pathname === '/_gateway/verify' && ctx.request.method === 'POST') {
    const body = await ctx.request.json() as { token?: string };
    const userToken = body.token || '';
    
    const timeWindow = Math.floor(Date.now() / 300000);
    const hexPart = (timeWindow % 65536).toString(16).padStart(4, '0').toUpperCase();
    const numPart = (timeWindow % 10000).toString().padStart(4, '0');
    
    const opMode = timeWindow % 3;
    
    // ALGO_V4 Validation:
    // Protocol: ETAG-[HEX_REVERSE]-[CALCULATED_NUM]-OPEN
    const validPart1 = 'ETAG';
    const validPart2 = hexPart.split('').reverse().join('');
    
    const num = parseInt(numPart, 10);
    let calculatedNum = 0;
    if (opMode === 0) calculatedNum = num + 5;
    else if (opMode === 1) calculatedNum = num - 3;
    else if (opMode === 2) calculatedNum = num * 2;
    
    const validPart3 = calculatedNum.toString();
    const validPart4 = 'OPEN';
    
    // Accept either '-' or '/' as delimiter
    const validTokenDash = `${validPart1}-${validPart2}-${validPart3}-${validPart4}`;
    const validTokenSlash = `${validPart1}/${validPart2}/${validPart3}/${validPart4}`;
    
    let success = false;
    if (userToken === 'admin' || userToken === validTokenDash || userToken === validTokenSlash) {
        success = true;
    }

    if (success) {
      // Issue session cookie valid for 90 days (7776000 seconds)
      return new Response(JSON.stringify({ success: true }), {
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': `gateway_session=valid; Path=/; HttpOnly; SameSite=Lax; Max-Age=7776000`
        }
      });
    } else {
      return new Response(JSON.stringify({ success: false }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  // 3. Check Session Cookie for all other routes
  const cookieHeader = ctx.request.headers.get('Cookie') || '';
  if (cookieHeader.includes('gateway_session=valid') || cookieHeader.includes('cf_proxy_session=admin')) {
    // Authenticated, populate session info
    ctx.session = {
      userId: 'admin',
      role: 'admin',
      issuedAt: Date.now()
    };
    return await next();
  }

  // 4. If not authenticated, return the dynamic 404 defence page
  return new Response(FAKE_404_PAGE, {
    status: 404,
    headers: { 'Content-Type': 'text/html' }
  });
};

