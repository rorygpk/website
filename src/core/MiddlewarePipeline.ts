import { RequestContext } from './RequestContext';

export type NextFunction = () => Promise<Response>;
export type Middleware = (ctx: RequestContext, next: NextFunction) => Promise<Response>;

export class MiddlewarePipeline {
  private middlewares: Middleware[] = [];

  public use(middleware: Middleware) {
    this.middlewares.push(middleware);
  }

  public async execute(ctx: RequestContext): Promise<Response> {
    let index = -1;

    const dispatch = async (i: number): Promise<Response> => {
      if (i <= index) {
        throw new Error('next() called multiple times');
      }
      index = i;
      const middleware = this.middlewares[i];
      if (middleware) {
        return middleware(ctx, () => dispatch(i + 1));
      } else {
        // Default response if no middleware handles the request
        return new Response('Not Found', { status: 404 });
      }
    };

    return dispatch(0);
  }
}
