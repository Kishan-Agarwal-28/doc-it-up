import { Server, Request, ResponseToolkit } from '@hapi/hapi';
import { DocItUpCore, initDocsDirectory } from '../core';

export const hapiPlugin = {
  name: 'doc-it-up',
  version: '1.0.0',
  register: async function (server: Server, options: { docsDir?: string }) {
    if (options.docsDir) initDocsDirectory(options.docsDir);
    else initDocsDirectory();

    server.ext('onPreResponse', (request: Request, h: ResponseToolkit) => {
      if (request.path.startsWith('/docs')) return h.continue;

      const response = request.response;
      
      // Hapi boom errors or standard responses
      if (response && !('isBoom' in response) && (response as any).statusCode >= 200 && (response as any).statusCode < 300) {
        DocItUpCore.recordRequest({
          method: request.method.toUpperCase(),
          path: request.path,
          headers: request.headers,
          query: request.query,
          body: request.payload,
          params: request.params
        }, {
          statusCode: (response as any).statusCode,
          headers: (response as any).headers,
          body: (response as any).source
        });
      }
      return h.continue;
    });

    server.route({
      method: 'GET',
      path: '/docs',
      handler: async (request, h) => {
        await DocItUpCore.loadSpecs();
        return h.response(DocItUpCore.getHtml()).type('text/html');
      }
    });

    server.route({
      method: 'GET',
      path: '/docs/swagger.json',
      handler: async (request, h) => {
        await DocItUpCore.loadSpecs();
        return DocItUpCore.getSwaggerSpec();
      }
    });
  }
};