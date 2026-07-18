import { RequestContext } from '../../core/RequestContext';
import { IProviderAdapter, AiChatRequest } from './providers/IProviderAdapter';
import { OpenAIAdapter } from './providers/OpenAIAdapter';
import { GeminiAdapter } from './providers/GeminiAdapter';

export class AiGateway {
  private static providers: Record<string, IProviderAdapter> = {
    'openai': new OpenAIAdapter(),
    'gemini': new GeminiAdapter(),
  };

  public static async handleRequest(ctx: RequestContext): Promise<Response> {
    const url = ctx.url;
    
    // Example format: /v1/chat/completions (Default to OpenAI)
    // Or /ai/gemini/v1/chat/completions
    let providerName = 'openai';
    
    if (url.pathname.startsWith('/ai/')) {
        const parts = url.pathname.split('/');
        providerName = parts[2] || 'openai';
    }

    const provider = this.providers[providerName];
    if (!provider) {
        return new Response(JSON.stringify({ error: `Provider ${providerName} not found` }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const requestBody = await ctx.request.json() as AiChatRequest;
        return await provider.generate(requestBody, ctx.env);
    } catch (e: any) {
        return provider.normalizeError(e);
    }
  }
}
