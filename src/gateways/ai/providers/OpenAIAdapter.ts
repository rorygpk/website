import { IProviderAdapter, AiChatRequest } from './IProviderAdapter';
import { Env } from '../../../core/RequestContext';

export class OpenAIAdapter implements IProviderAdapter {
    providerName = 'openai';

    async generate(request: AiChatRequest, env: Env): Promise<Response> {
        const apiKey = env.OPENAI_API_KEY;
        if (!apiKey) {
            throw new Error('OPENAI_API_KEY is not configured');
        }

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(request)
        });

        // Pass through the streaming response or JSON response directly
        return new Response(response.body, {
            status: response.status,
            headers: {
                'Content-Type': response.headers.get('Content-Type') || 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    }

    normalizeError(error: any): Response {
        console.error('OpenAI Adapter Error:', error);
        return new Response(JSON.stringify({
            error: {
                message: error.message || 'Internal Server Error',
                type: 'ai_gateway_error',
                provider: this.providerName
            }
        }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}
