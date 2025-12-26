import { Context, Next } from 'koa';
import { DocItUpCore, initDocsDirectory } from '../core';

export const koaMiddleware = (options: { docsDir?: string } = {}) => {
  if (options.docsDir) initDocsDirectory(options.docsDir);
  else initDocsDirectory();

  return async (ctx: Context, next: Next) => {
    if (ctx.path.startsWith('/docs')) return next();

    await next();

    if (ctx.status >= 200 && ctx.status < 300) {
      DocItUpCore.recordRequest({
        method: ctx.method,
        path: ctx.path,
        headers: ctx.headers,
        query: ctx.query,
        body: (ctx.request as any).body, // Requires koa-bodyparser
        params: (ctx as any).params || {},
        files: (ctx.request as any).files
      }, {
        statusCode: ctx.status,
        headers: ctx.response.header,
        body: ctx.body
      });
    }
  };
};

export const koaHandler = () => {
  return async (ctx: Context) => {
    await DocItUpCore.loadSpecs();
    if (ctx.path.endsWith('/swagger.json')) {
      ctx.body = DocItUpCore.getSwaggerSpec();
    } else {
      ctx.type = 'text/html';
      ctx.body = DocItUpCore.getHtml();
    }
  };
};