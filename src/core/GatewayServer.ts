import { Env, RequestContext } from './RequestContext';
import { MiddlewarePipeline } from './MiddlewarePipeline';
import { loggerMiddleware } from '../middlewares/logger';
import { errorMiddleware } from '../middlewares/error';
import { authMiddleware } from '../middlewares/auth';
import { WebsiteGateway } from '../gateways/website/WebsiteGateway';
import { AiGateway } from '../gateways/ai/AiGateway';
import { DownloadGateway } from '../gateways/download/DownloadGateway';

export class GatewayServer {
  private pipeline: MiddlewarePipeline;

  constructor() {
    this.pipeline = new MiddlewarePipeline();
    this.setupMiddlewares();
  }

  private setupMiddlewares() {
    // 1. Global Error Handling
    this.pipeline.use(errorMiddleware);
    
    // 2. Logging
    this.pipeline.use(loggerMiddleware);
    
    // 3. Authentication & Dynamic 404 Defence
    this.pipeline.use(authMiddleware);

    // 4. Traffic Router (Routing to Sub-Gateways)
    this.pipeline.use(async (ctx, next) => {
      const pathname = ctx.url.pathname;
      
      // Portal Routing
      if (pathname === '/' || pathname === '') {
        return (await import('../gateways/portal/PortalGateway')).PortalGateway.handleRequest(ctx);
      }
      
      // AI Gateway Routing
      if (pathname.startsWith('/v1/chat/completions') || pathname.startsWith('/ai/')) {
        return AiGateway.handleRequest(ctx);
      }
      
      // Download Gateway Routing
      if (pathname.startsWith('/download/')) {
        return DownloadGateway.handleRequest(ctx);
      }
      
      // Default to Website Gateway
      return WebsiteGateway.handleRequest(ctx);
    });
  }

  public async fetch(request: Request, env: Env, executionCtx: ExecutionContext): Promise<Response> {
    const ctx = new RequestContext(request, env, executionCtx);
    return this.pipeline.execute(ctx);
  }
}
