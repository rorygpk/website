import { IProviderAdapter, AiChatRequest } from './IProviderAdapter';
import { Env } from '../../../core/RequestContext';

export class GeminiAdapter implements IProviderAdapter {
    providerName = 'gemini';

    async generate(request: AiChatRequest, env: Env): Promise<Response> {
        const apiKey = env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error('GEMINI_API_KEY is not configured');
        }

        // Convert OpenAI format to Gemini format
        const geminiMessages = request.messages.map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
        }));

        const geminiReq = {
            contents: geminiMessages,
            generationConfig: {
                temperature: request.temperature,
                maxOutputTokens: request.max_tokens,
            }
        };

        const model = request.model || 'gemini-1.5-pro-latest';
        const streamStr = request.stream ? 'streamGenerateContent?alt=sse' : 'generateContent';
        
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:${streamStr}&key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(geminiReq)
        });

        // Since Gemini SSE stream is slightly different, a full Enterprise gateway would translate the SSE chunks.
        // For now, we pass it through as a demonstration of the adapter pattern.
        return new Response(response.body, {
            status: response.status,
            headers: {
                'Content-Type': response.headers.get('Content-Type') || 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    }

    normalizeError(error: any): Response {
        return new Response(JSON.stringify({
            error: {
                message: error.message || 'Internal Server Error',
                type: 'ai_gateway_error',
                provider: this.providerName
            }
        }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}
