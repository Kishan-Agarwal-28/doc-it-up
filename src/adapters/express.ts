import { Request, Response, NextFunction } from 'express';
import { DocItUpCore, initDocsDirectory } from '../core';

export const expressMiddleware = (options: { docsDir?: string } = {}) => {
  if (options.docsDir) initDocsDirectory(options.docsDir);
  else initDocsDirectory();

  return (req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/docs')) return next();

    const originalSend = res.send;
    const originalJson = res.json;
    let responseBody: any = null;

    // Hook .json()
    res.json = function (data): Response {
      responseBody = data;
      return originalJson.call(this, data);
    };

    // Hook .send()
    res.send = function (data): Response {
      if (!responseBody) {
        try {
          responseBody = typeof data === 'string' ? JSON.parse(data) : data;
        } catch {
          responseBody = data;
        }
      }
      return originalSend.call(this, data);
    };

    res.on('finish', () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        DocItUpCore.recordRequest({
          method: req.method,
          path: req.baseUrl ? req.baseUrl + req.path : req.path,
          headers: req.headers,
          query: req.query,
          body: req.body,
          params: req.params,
          files: (req as any).files
        }, {
          statusCode: res.statusCode,
          statusMessage: res.statusMessage,
          headers: res.getHeaders(),
          body: responseBody
        });
      }
    });

    next();
  };
};

export const expressHandler = () => {
  return async (req: Request, res: Response) => {
    await DocItUpCore.loadSpecs();
    if (req.path.endsWith('/swagger.json')) {
      res.json(DocItUpCore.getSwaggerSpec());
    } else {
      res.send(DocItUpCore.getHtml());
    }
  };
};