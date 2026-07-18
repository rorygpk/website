import { Middleware } from '../core/MiddlewarePipeline';

export const errorMiddleware: Middleware = async (ctx, next) => {
  try {
    return await next();
  } catch (error: any) {
    console.error(`Unhandled Exception in Request [${ctx.traceId}]:`, error);
    
    // Return a generic 500 error to avoid leaking internal details
    return new Response(JSON.stringify({
      error: 'Internal Gateway Error',
      trace_id: ctx.traceId,
      message: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      }
    });
  }
};
