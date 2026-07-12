/**
 * Cloudflare Worker - AI API Reverse Proxy Jumpboard
 * 
 * This script proxies requests to OpenAI and Google Gemini APIs, 
 * helping to bypass local network restrictions and hide your server IP.
 * 
 * Usage:
 * - OpenAI: https://<your-worker-domain>/openai/v1/chat/completions
 * - Gemini: https://<your-worker-domain>/gemini/v1beta/models/gemini-2.5-flash:generateContent
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Standard CORS headers for browser compatibility
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-goog-api-key',
    };

    // Preflight request handling
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    let targetUrl = '';

    // Route: OpenAI API
    if (url.pathname.startsWith('/openai')) {
      targetUrl = `https://api.openai.com${url.pathname.replace('/openai', '')}${url.search}`;
    }
    // Route: Google Gemini API
    else if (url.pathname.startsWith('/gemini')) {
      targetUrl = `https://generativelanguage.googleapis.com${url.pathname.replace('/gemini', '')}${url.search}`;
    }
    // Default Route
    else {
      return new Response(
        'AI API Proxy Jumpboard is active.\n\nEndpoints:\n- /openai/... -> api.openai.com\n- /gemini/... -> generativelanguage.googleapis.com', 
        { 
          status: 200, 
          headers: { 'Content-Type': 'text/plain', ...corsHeaders } 
        }
      );
    }

    // Construct the proxied request
    const proxyRequest = new Request(targetUrl, {
      method: request.method,
      headers: request.headers,
      body: request.body,
      redirect: 'follow'
    });

    // Strip the proxy host header to avoid SSL/Routing mismatches at the destination
    proxyRequest.headers.set('Host', new URL(targetUrl).hostname);

    try {
      const response = await fetch(proxyRequest);
      const responseHeaders = new Headers(response.headers);

      // Inject CORS headers into the response
      Object.entries(corsHeaders).forEach(([key, value]) => {
        responseHeaders.set(key, value);
      });

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: `Proxy Error: ${error.message}` }), { 
        status: 500, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      });
    }
  }
};
