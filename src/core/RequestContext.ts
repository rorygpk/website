export interface Env {
  // Bindings can be added here
  GATEWAY_SECRET?: string; // Used for auth HMAC
  KV_STORAGE?: KVNamespace;
  D1_DB?: any; // D1Database
  // API Keys
  OPENAI_API_KEY?: string;
  GEMINI_API_KEY?: string;
  CLAUDE_API_KEY?: string;
  DEEPSEEK_API_KEY?: string;
}

export interface UserSession {
  userId: string;
  role: string;
  issuedAt: number;
}

export class RequestContext {
  public readonly request: Request;
  public readonly url: URL;
  public readonly clientIp: string;
  public readonly traceId: string;
  public readonly env: Env;
  public readonly executionCtx: ExecutionContext;
  
  public session?: UserSession;
  public state: Record<string, any> = {};

  constructor(request: Request, env: Env, executionCtx: ExecutionContext) {
    this.request = request;
    this.url = new URL(request.url);
    this.clientIp = request.headers.get('CF-Connecting-IP') || '127.0.0.1';
    this.traceId = request.headers.get('CF-Ray') || crypto.randomUUID();
    this.env = env;
    this.executionCtx = executionCtx;
  }
}
