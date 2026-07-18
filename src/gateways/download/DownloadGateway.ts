import { RequestContext } from '../../core/RequestContext';

export class DownloadGateway {
  public static async handleRequest(ctx: RequestContext): Promise<Response> {
    const url = ctx.url;
    // Example format: /download/https://example.com/file.zip
    const targetUrlStr = url.pathname.substring('/download/'.length) + url.search;
    
    try {
        const targetUrl = new URL(targetUrlStr);
        
        // Pass range headers for resume capability
        const headers = new Headers();
        const range = ctx.request.headers.get('Range');
        if (range) {
            headers.set('Range', range);
        }

        const proxyRequest = new Request(targetUrl.toString(), {
            method: 'GET',
            headers: headers
        });

        const response = await fetch(proxyRequest);
        
        // Return streaming response with CORS
        const responseHeaders = new Headers(response.headers);
        responseHeaders.set('Access-Control-Allow-Origin', '*');
        
        // We rely on standard Web Stream API (response.body is a ReadableStream)
        // This inherently handles backpressure and doesn't buffer the whole file in memory.
        return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: responseHeaders
        });

    } catch (e: any) {
        return new Response('Download Gateway Error: ' + e.message, { status: 502 });
    }
  }
}
