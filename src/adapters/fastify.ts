import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { DocItUpCore, initDocsDirectory } from '../core';
import fp from 'fastify-plugin';

const fastifyDocItUp = async (fastify: FastifyInstance, options: { docsDir?: string }) => {
  if (options.docsDir) initDocsDirectory(options.docsDir);
  else initDocsDirectory();

  fastify.addHook('onSend', async (request: FastifyRequest, reply: FastifyReply, payload: any) => {
    if (request.url.startsWith('/docs')) return payload;

    if (reply.statusCode >= 200 && reply.statusCode < 300) {
      let parsedBody = payload;
      try {
        if (typeof payload === 'string') parsedBody = JSON.parse(payload);
      } catch { }

      const pathOnly = request.url.split('?')[0];

      DocItUpCore.recordRequest({
        method: request.method,
        path: pathOnly,
        headers: request.headers,
        query: request.query as Record<string, any>,
        body: request.body,
        params: request.params as Record<string, any>,
        files: (request as any).files 
      }, {
        statusCode: reply.statusCode,
        headers: reply.getHeaders(),
        body: parsedBody
      });
    }
    return payload;
  });

  fastify.get('/docs', async (req, reply) => {
    await DocItUpCore.loadSpecs();
    reply.type('text/html').send(DocItUpCore.getHtml());
  });

  fastify.get('/docs/swagger.json', async (req, reply) => {
    await DocItUpCore.loadSpecs();
    reply.send(DocItUpCore.getSwaggerSpec());
  });
};


export default fp(fastifyDocItUp, {
  name: 'doc-it-up'
});