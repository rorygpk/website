const worker = {
  async fetch(request, env, ctx) {
    // Paste the worker code here
    const url = new URL(request.url);
    let targetUrl = '';
    let isApi = false;
    let proxyHeaders = new Headers(request.headers);
    const apiRoutes = { '/openai': 'https://api.openai.com' };
    
    // ... skipping API logic for test ...
    if (!isApi) {
      const pathStr = url.pathname.slice(1);
      const isUrlOrDomain = (str) => {
          if (str.startsWith('http://') || str.startsWith('https://')) return true;
          return /^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/.*)?$/.test(str) && !str.includes(' ');
      };
      const getFullTarget = (str) => {
          if (str.startsWith('http://') || str.startsWith('https://')) return str;
          return 'https://' + str;
      };
      if (isUrlOrDomain(pathStr.split('?')[0])) {
        targetUrl = getFullTarget(pathStr) + url.search;
      }
    }
    
    if (!targetUrl) return new Response("Proxy active.");
    
    const targetUrlObj = new URL(targetUrl);
    proxyHeaders.set('Host', targetUrlObj.hostname);
    
    const requestInit = {
      method: request.method,
      headers: proxyHeaders,
      redirect: 'manual'
    };
    
    try {
      const response = await fetch(targetUrl, requestInit);
      return new Response(response.body, { status: response.status, headers: response.headers });
    } catch (e) {
      return new Response(e.message, { status: 500 });
    }
  }
};
