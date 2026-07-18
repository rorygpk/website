import { Env } from '../../core/RequestContext';

export interface AiChatRequest {
  model: string;
  messages: Array<{ role: string; content: string }>;
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
}

export interface IProviderAdapter {
  providerName: string;
  generate(request: AiChatRequest, env: Env): Promise<Response>;
  normalizeError(error: any): Response;
}
