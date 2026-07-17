var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/bundle-cOVGwi/checked-fetch.js
var urls = /* @__PURE__ */ new Set();
function checkURL(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls.has(url.toString())) {
      urls.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
__name(checkURL, "checkURL");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    const [request, init] = argArray;
    checkURL(request, init);
    return Reflect.apply(target, thisArg, argArray);
  }
});

// worker.js
var DEFAULT_PASSWORD = "admin";
var COOKIE_NAME = "cf_proxy_session";
var worker_default = {
  async fetch(request, env, ctx) {
    try {
      return await handleRequest(request, env);
    } catch (e) {
      return new Response("Internal Server Error: " + e.message, { status: 500 });
    }
  }
};
var corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, HEAD, PATCH",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key, anthropic-version, x-anthropic-version, HTTP-Referer, X-Requested-With"
};
async function handleRequest(request, env) {
  const url = new URL(request.url);
  const pathStr = url.pathname;
  const search = url.search;
  const password = env && env.ACCESS_PASSWORD ? env.ACCESS_PASSWORD : DEFAULT_PASSWORD;
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  const apiRoutes = [
    { prefix: "/v1", target: "https://api.openai.com/v1" },
    { prefix: "/api/openai", target: "https://api.openai.com" },
    { prefix: "/api/anthropic", target: "https://api.anthropic.com" },
    { prefix: "/api/claude", target: "https://api.anthropic.com" },
    { prefix: "/api/gemini", target: "https://generativelanguage.googleapis.com" },
    { prefix: "/api/deepseek", target: "https://api.deepseek.com" },
    { prefix: "/api/xai", target: "https://api.x.ai" }
  ];
  for (const route of apiRoutes) {
    if (pathStr.startsWith(route.prefix)) {
      const rest = pathStr.slice(route.prefix.length);
      const targetUrl = route.target + rest + search;
      const newHeaders = new Headers(request.headers);
      newHeaders.delete("Host");
      newHeaders.delete("cf-connecting-ip");
      newHeaders.delete("x-forwarded-for");
      newHeaders.delete("x-real-ip");
      const init = { method: request.method, headers: newHeaders, redirect: "follow", duplex: "half" };
      if (request.body && !["GET", "HEAD"].includes(request.method.toUpperCase())) {
        init.body = request.body;
      }
      const proxyReq = new Request(targetUrl, init);
      const proxyRes2 = await fetch(proxyReq);
      const responseHeaders2 = new Headers(proxyRes2.headers);
      for (const [k, v] of Object.entries(corsHeaders)) {
        responseHeaders2.set(k, v);
      }
      return new Response(proxyRes2.body, {
        status: proxyRes2.status,
        statusText: proxyRes2.statusText,
        headers: responseHeaders2
      });
    }
  }
  if (pathStr.startsWith("/__auth/")) {
    const inputPwd = decodeURIComponent(pathStr.slice("/__auth/".length));
    if (inputPwd === password) {
      return new Response("Auth Success! Redirecting...", {
        status: 302,
        headers: {
          "Set-Cookie": `${COOKIE_NAME}=${password}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`,
          "Location": "/"
        }
      });
    } else {
      return new Response("Unauthorized", { status: 401 });
    }
  }
  const cookies = request.headers.get("Cookie") || "";
  const isAuthenticated = cookies.includes(`${COOKIE_NAME}=${password}`);
  if (!isAuthenticated) {
    return new Response(
      `<!DOCTYPE html>
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
        #auth-box h3 { margin-top: 0; }
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
            <h3>System Access</h3>
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
    <\/script>
</body>
</html>`,
      { status: 404, headers: { "Content-Type": "text/html;charset=UTF-8" } }
    );
  }
  if (pathStr === "/" || pathStr === "") {
    return new Response(getGatewayHtml(url.hostname), {
      headers: { "Content-Type": "text/html;charset=UTF-8" }
    });
  }
  let targetWebUrl = "";
  let decodedPath = decodeURIComponent(pathStr.slice(1));
  if (decodedPath.startsWith("proxy/")) decodedPath = decodedPath.slice(6);
  if (decodedPath.startsWith("http://") || decodedPath.startsWith("https://")) {
    targetWebUrl = decodedPath + search;
  } else {
    const referer = request.headers.get("Referer");
    if (referer) {
      try {
        const refUrl = new URL(referer);
        let refPath = decodeURIComponent(refUrl.pathname.slice(1));
        if (refPath.startsWith("proxy/")) refPath = refPath.slice(6);
        if (refPath.startsWith("http://") || refPath.startsWith("https://")) {
          const targetBaseUrl = new URL(refPath);
          targetWebUrl = targetBaseUrl.origin + pathStr + search;
        }
      } catch (e) {
      }
    }
  }
  if (!targetWebUrl) return new Response("Not Found", { status: 404 });
  const targetUrlObj = new URL(targetWebUrl);
  const proxyHeaders = new Headers(request.headers);
  proxyHeaders.delete("Host");
  proxyHeaders.delete("cf-connecting-ip");
  proxyHeaders.delete("x-forwarded-for");
  proxyHeaders.delete("x-real-ip");
  proxyHeaders.set("Host", targetUrlObj.hostname);
  proxyHeaders.set("Origin", targetUrlObj.origin);
  proxyHeaders.set("Referer", targetUrlObj.origin + "/");
  const ua = proxyHeaders.get("User-Agent") || "";
  if (!ua || ua.includes("Cloudflare")) {
    proxyHeaders.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36");
  }
  proxyHeaders.set("Accept-Encoding", "identity");
  let cookieHeader = proxyHeaders.get("Cookie");
  if (cookieHeader) {
    cookieHeader = cookieHeader.split(";").filter((c) => !c.trim().startsWith(COOKIE_NAME + "=")).join(";");
    if (cookieHeader) proxyHeaders.set("Cookie", cookieHeader);
    else proxyHeaders.delete("Cookie");
  }
  const requestInit = { method: request.method, headers: proxyHeaders, redirect: "manual", duplex: "half" };
  if (request.body && !["GET", "HEAD"].includes(request.method.toUpperCase())) requestInit.body = request.body;
  const proxyRes = await fetch(targetWebUrl, requestInit);
  const responseHeaders = new Headers(proxyRes.headers);
  responseHeaders.delete("x-frame-options");
  responseHeaders.delete("content-security-policy");
  responseHeaders.delete("content-security-policy-report-only");
  responseHeaders.delete("clear-site-data");
  responseHeaders.delete("strict-transport-security");
  if ([301, 302, 303, 307, 308].includes(proxyRes.status) && responseHeaders.has("location")) {
    let loc = responseHeaders.get("location");
    try {
      if (loc.startsWith("http")) responseHeaders.set("location", `${url.origin}/${loc}`);
      else {
        const absoluteLoc = new URL(loc, targetUrlObj.origin).toString();
        responseHeaders.set("location", `${url.origin}/${absoluteLoc}`);
      }
    } catch (e) {
    }
  }
  const contentType = responseHeaders.get("content-type") || "";
  if (contentType.includes("text/html")) {
    class AttributeRewriter {
      static {
        __name(this, "AttributeRewriter");
      }
      element(element) {
        ["href", "src", "action"].forEach((attr) => {
          const val = element.getAttribute(attr);
          if (val) {
            if (val.startsWith("http://") || val.startsWith("https://")) element.setAttribute(attr, url.origin + "/" + val);
            else if (val.startsWith("//")) element.setAttribute(attr, url.origin + "/https:" + val);
            else if (val.startsWith("/")) element.setAttribute(attr, url.origin + "/" + targetUrlObj.origin + val);
          }
        });
      }
    }
    try {
      const rewriter = new HTMLRewriter().on("a, link, img, script, iframe, form, source", new AttributeRewriter());
      return rewriter.transform(new Response(proxyRes.body, {
        status: proxyRes.status,
        statusText: proxyRes.statusText,
        headers: responseHeaders
      }));
    } catch (e) {
    }
  }
  return new Response(proxyRes.body, {
    status: proxyRes.status,
    statusText: proxyRes.statusText,
    headers: responseHeaders
  });
}
__name(handleRequest, "handleRequest");
function getGatewayHtml(hostname) {
  return `<!DOCTYPE html><html lang="en"><head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gateway Active</title>
    <style>
        body { font-family: -apple-system, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; color: #111; background: #f9f9f9; }
        h1 { font-size: 24px; color: #000; }
        .card { background: #fff; border: 1px solid #eaeaea; padding: 24px; border-radius: 10px; margin-top: 24px; }
        h3 { margin-top: 0; font-size: 16px; margin-bottom: 15px; }
        input { padding: 12px 16px; width: 60%; border: 1px solid #d1d5db; border-radius: 6px; font-size: 15px; }
        button { padding: 12px 24px; background: #2563eb; color: #fff; border: none; border-radius: 6px; font-size: 15px; cursor: pointer; }
        code { background: #f3f4f6; padding: 4px 8px; border-radius: 4px; color: #db2777; font-size: 14px; font-family: monospace; }
        ul { padding-left: 20px; color: #555; }
        li { margin-bottom: 10px; }
    </style>
</head>
<body>
    <h1>\u{1F7E2} Secure Proxy Gateway</h1>
    <p>Authentication successful.</p>
    <div class="card">
        <h3>\u{1F30D} Web Proxy</h3>
        <form onsubmit="event.preventDefault(); go();" style="display: flex; gap: 10px;">
            <input type="text" id="url" placeholder="https://www.google.com" required>
            <button type="submit">Go Surfing</button>
        </form>
        <script>
            function go() {
                let u = document.getElementById('url').value.trim();
                if (!u.startsWith('http')) u = 'https://' + u;
                window.location.href = '/' + u;
            }
        <\/script>
    </div>
    <div class="card">
        <h3>\u{1F916} AI API Endpoints (No password needed)</h3>
        <ul>
            <li>OpenAI: <code>https://${hostname}/v1</code></li>
            <li>Anthropic: <code>https://${hostname}/api/anthropic</code></li>
            <li>Gemini: <code>https://${hostname}/api/gemini</code></li>
            <li>DeepSeek: <code>https://${hostname}/api/deepseek</code></li>
            <li>xAI (Grok): <code>https://${hostname}/api/xai</code></li>
        </ul>
    </div>
</body></html>`;
}
__name(getGatewayHtml, "getGatewayHtml");

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-cOVGwi/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = worker_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-cOVGwi/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=worker.js.map
