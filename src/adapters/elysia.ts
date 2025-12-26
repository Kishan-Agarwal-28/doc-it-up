import { Elysia } from 'elysia';
import { DocItUpCore, initDocsDirectory } from '../core';

export const docItUpElysia = (options: { docsDir?: string } = {}) => (app: Elysia) => {
  if (options.docsDir) initDocsDirectory(options.docsDir);
  else initDocsDirectory();

  return app
    .onAfterHandle(async ({ request, set, body, params, query, response }) => {
      const url = new URL(request.url);
      if (url.pathname.startsWith('/docs')) return;

      const statusCode = set.status || 200;

      if (typeof statusCode === 'number' && statusCode >= 200 && statusCode < 300) {
        DocItUpCore.recordRequest({
          method: request.method,
          path: url.pathname,
          headers: Object.fromEntries(request.headers.entries()),
          query: query || {},
          body: body,
          params: params || {}
        }, {
          statusCode: statusCode,
          headers: set.headers,
          body: response
        });
      }
    })
    .get('/docs', async () => {
      await DocItUpCore.loadSpecs();
      return new Response(DocItUpCore.getHtml(), { headers: { 'Content-Type': 'text/html' } });
    })
    .get('/docs/swagger.json', async () => {
      await DocItUpCore.loadSpecs();
      return DocItUpCore.getSwaggerSpec();
    });
};