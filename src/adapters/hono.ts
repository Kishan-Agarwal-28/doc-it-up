import { Context, Next } from 'hono';
import { DocItUpCore, initDocsDirectory } from '../core';

export const honoMiddleware = (options: { docsDir?: string } = {}) => {
  if (options.docsDir) initDocsDirectory(options.docsDir);
  else initDocsDirectory();

  return async (c: Context, next: Next) => {
    if (c.req.path.startsWith('/docs')) return next();

    await next();

    if (c.res.status >= 200 && c.res.status < 300) {
      // Cloning response is required to read body without consuming it for the client
      const resClone = c.res.clone();
      let resBody: any;
      try { resBody = await resClone.json(); } catch { 
        try { resBody = await resClone.text(); } catch {} 
      }
      
      let reqBody: any;
      try { reqBody = await c.req.parseBody(); } catch { } 
      if (!reqBody) {
         try { reqBody = await c.req.json(); } catch {}
      }

      DocItUpCore.recordRequest({
        method: c.req.method,
        path: c.req.path,
        headers: c.req.header(),
        query: c.req.query(),
        body: reqBody,
        params: c.req.param()
      }, {
        statusCode: c.res.status,
        headers: Object.fromEntries(c.res.headers.entries()),
        body: resBody
      });
    }
  };
};

export const registerHonoDocs = (app: any) => {
    app.get('/docs', async (c: Context) => {
        await DocItUpCore.loadSpecs();
        return c.html(DocItUpCore.getHtml());
    });
    app.get('/docs/swagger.json', async (c: Context) => {
        await DocItUpCore.loadSpecs();
        return c.json(DocItUpCore.getSwaggerSpec());
    });
}