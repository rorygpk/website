import { Middleware } from '../core/MiddlewarePipeline';

export const loggerMiddleware: Middleware = async (ctx, next) => {
  const start = Date.now();
  
  try {
    const response = await next();
    const duration = Date.now() - start;
    
    console.log(`[INFO] ${ctx.request.method} ${ctx.url.pathname} - ${response.status} - ${duration}ms [Ray: ${ctx.traceId}] [IP: ${ctx.clientIp}]`);
    return response;
  } catch (error: any) {
    const duration = Date.now() - start;
    console.error(`[ERROR] ${ctx.request.method} ${ctx.url.pathname} - FAILED - ${duration}ms [Ray: ${ctx.traceId}]`, error.stack || error.message);
    throw error;
  }
};
