import { GatewayServer } from './core/GatewayServer';
import { Env } from './core/RequestContext';

const server = new GatewayServer();

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return server.fetch(request, env, ctx);
  }
};
