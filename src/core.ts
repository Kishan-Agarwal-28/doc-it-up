import fs from 'fs/promises';
import path from 'path';

// --- Interfaces ---

export interface DocRequest {
  method: string;
  path: string;
  headers: Record<string, any>;
  query: Record<string, any>;
  body: any;
  params?: Record<string, any>;
  files?: Record<string, any> | any[];
}

export interface DocResponse {
  statusCode: number;
  statusMessage?: string;
  headers: Record<string, any>;
  body: any;
}

interface RouteSpec {
  method: string;
  path: string;
  originalPath: string;
  query?: Record<string, any>;
  params?: Record<string, any>;
  body?: any;
  auth?: any;
  customHeaders?: Record<string, any>;
  response?: any;
  timestamp: string;
  lastUpdated: string;
  lastAccessed?: string;
}

// --- Configuration & State ---

let docsDir = './docs';
const routeSpecs = new Map<string, RouteSpec>();
let pkgInfo = { name: 'API', version: '1.0.0', description: '' };

const pathToUserPkg = path.resolve(process.cwd(), 'package.json');
(async () => {
  try {
    const packageJson = await fs.readFile(pathToUserPkg, 'utf-8').then(JSON.parse);
    pkgInfo = { name: packageJson.name, version: packageJson.version, description: packageJson.description || '' };
  } catch (e) {}
})();

export const initDocsDirectory = async (customDocsDir?: string) => {
  if (customDocsDir) docsDir = customDocsDir;
  try { await fs.access(docsDir); } catch { await fs.mkdir(docsDir, { recursive: true }); }
};

// --- Schema Generation Logic ---

const isValidDate = (str: string): boolean => !isNaN(Date.parse(str)) && str.includes('T');
const isValidEmail = (str: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);

const getTypeSchema = (value: any): any => {
  if (value === null || value === undefined) return { type: 'string', nullable: true };
  const type = typeof value;
  switch (type) {
    case 'string':
      if (isValidDate(value)) return { type: 'string', format: 'date-time' };
      if (isValidEmail(value)) return { type: 'string', format: 'email' };
      return { type: 'string' };
    case 'number':
      return { type: Number.isInteger(value) ? 'integer' : 'number', example: value };
    case 'boolean':
      return { type: 'boolean', example: value };
    case 'object':
      if (Array.isArray(value)) {
        return { type: 'array', items: value.length > 0 ? getTypeSchema(value[0]) : { type: 'string' } };
      }
      return generateJsonSchema(value);
    default:
      return { type: 'string' };
  }
};

const generateJsonSchema = (obj: any): any => {
  if (!obj || typeof obj !== 'object') return getTypeSchema(obj);
  if (Array.isArray(obj)) return { type: 'array', items: obj.length > 0 ? getTypeSchema(obj[0]) : { type: 'string' } };
  
  const schema: any = { type: 'object', properties: {}, required: [] };
  for (const [key, value] of Object.entries(obj)) {
    schema.properties[key] = getTypeSchema(value);
    if (value !== null && value !== undefined) schema.required.push(key);
  }
  if (schema.required.length === 0) delete schema.required;
  return schema;
};

const generateSchemaSignature = (obj: any): string => {
  if (!obj || typeof obj !== 'object') return 'primitive';
  if (Array.isArray(obj)) return obj.length === 0 ? 'array:empty' : `array:${generateSchemaSignature(obj[0])}`;
  
  const keys = Object.keys(obj).sort();
  return keys.map(key => {
    const value = obj[key];
    if (value === null) return `${key}:null`;
    if (Array.isArray(value)) return `${key}:array:${value.length > 0 ? generateSchemaSignature(value[0]) : 'empty'}`;
    if (typeof value === 'object') return `${key}:object:${generateSchemaSignature(value)}`;
    return `${key}:${typeof value}`;
  }).join('|');
};

// --- Extraction Helpers ---

const normalizePath = (path: string): string => {
  return path
    .replace(/\/\d+/g, '/{id}')
    .replace(/\/[a-f0-9]{24}/g, '/{id}')
    .replace(/\/[a-f0-9-]{36}/g, '/{id}')
    .replace(/\/[^\/]+\/\d+/g, '/{resource}/{id}')
    .replace(/\?.*$/, '');
};

const extractParams = (originalPath: string, normalizedPath: string): Record<string, string> => {
  const originalSegments = originalPath.split('/');
  const normalizedSegments = normalizedPath.split('/');
  const params: Record<string, string> = {};
  for (let i = 0; i < normalizedSegments.length; i++) {
    if (normalizedSegments[i].startsWith('{') && normalizedSegments[i].endsWith('}')) {
      const paramName = normalizedSegments[i].slice(1, -1);
      if (originalSegments[i]) params[paramName] = originalSegments[i];
    }
  }
  return params;
};

const extractAuthInfo = (req: DocRequest) => {
  const auth: any = {};
  const h = req.headers || {};
  
  if (h.authorization) {
    if (h.authorization.startsWith('Bearer ')) {
      auth.type = 'bearer';
    } else if (h.authorization.startsWith('Basic ')) {
      auth.type = 'basic';
    } else {
      auth.type = 'custom';
      auth.headerName = 'Authorization';
    }
  }
  
  const apiKeyHeaders = ['x-api-key', 'api-key', 'x-auth-token', 'x-client-id'];
  for (const header of apiKeyHeaders) {
    if (h[header]) {
      auth.type = 'apiKey';
      auth.headerName = header;
      break;
    }
  }
  return Object.keys(auth).length > 0 ? auth : undefined;
};

const analyzeBody = (req: DocRequest) => {
  if (!req.body) return undefined;
  const contentType = req.headers['content-type'] || '';
  
  if (contentType.includes('multipart/form-data')) {
     return {
         type: 'formData',
         schema: { type: 'object', properties: {} },
         example: '[Multipart Data]',
         signature: 'multipart'
     };
  }
  
  return {
    type: 'json',
    schema: generateJsonSchema(req.body),
    example: req.body,
    signature: generateSchemaSignature(req.body)
  };
};

const analyzeResponse = (res: DocResponse) => {
  const contentType = res.headers['content-type'] || '';
  let bodyInfo: any = {};

  if (res.body !== undefined) {
    if (contentType.includes('application/json') || typeof res.body === 'object') {
      bodyInfo = {
        type: 'json',
        schema: generateJsonSchema(res.body),
        example: res.body,
        signature: generateSchemaSignature(res.body)
      };
    } else {
      bodyInfo = {
        type: 'text',
        example: res.body,
        signature: 'text'
      };
    }
  }

  return {
    statusCode: res.statusCode,
    statusMessage: res.statusMessage,
    headers: res.headers,
    body: bodyInfo
  };
};

// --- Spec Management ---

const shouldUpdateSpec = (existing: RouteSpec | undefined, newSpec: RouteSpec): boolean => {
  if (!existing) return true;
  if (existing.body?.signature !== newSpec.body?.signature) return true;
  if (existing.response?.body?.signature !== newSpec.response?.body?.signature) return true;
  return false;
};

// --- Core Class ---

export class DocItUpCore {
  static async recordRequest(req: DocRequest, res: DocResponse) {
    try {
      const normalizedPath = normalizePath(req.path);
      const method = req.method.toLowerCase();
      const routeKey = `${method}:${normalizedPath}`;

      const newSpec: RouteSpec = {
        method: method.toUpperCase(),
        path: normalizedPath,
        originalPath: req.path,
        query: req.query,
        params: { ...extractParams(req.path, normalizedPath), ...req.params },
        body: analyzeBody(req),
        auth: extractAuthInfo(req),
        customHeaders: req.headers,
        response: analyzeResponse(res),
        timestamp: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      };

      const existingSpec = routeSpecs.get(routeKey);
      if (shouldUpdateSpec(existingSpec, newSpec)) {
        console.log(`[DocItUp] Updating spec for ${routeKey}`);
        routeSpecs.set(routeKey, newSpec);
        const filename = routeKey.replace(/[^a-zA-Z0-9]/g, '_') + '.json';
        await fs.writeFile(path.join(docsDir, filename), JSON.stringify(newSpec, null, 2));
      } else if (existingSpec) {
        existingSpec.lastAccessed = new Date().toISOString();
        routeSpecs.set(routeKey, existingSpec);
      }
    } catch (err) {
      console.error('[DocItUp] Error recording request:', err);
    }
  }

  static async loadSpecs() {
    try {
      const files = await fs.readdir(docsDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const content = await fs.readFile(path.join(docsDir, file), 'utf8');
          const spec = JSON.parse(content);
          routeSpecs.set(`${spec.method.toLowerCase()}:${spec.path}`, spec);
        }
      }
    } catch (e) {}
  }

  static getSwaggerSpec() {
    const spec: any = {
      openapi: '3.0.0',
      info: pkgInfo,
      paths: {}
    };

    for (const route of routeSpecs.values()) {
       if (!spec.paths[route.path]) spec.paths[route.path] = {};
       const method = route.method.toLowerCase();
       
       spec.paths[route.path][method] = {
           summary: `${route.method} ${route.path}`,
           responses: {
               [route.response?.statusCode || 200]: {
                   description: 'Response',
                   content: route.response?.body?.type === 'json' ? {
                       'application/json': { schema: route.response.body.schema, example: route.response.body.example }
                   } : {}
               }
           }
       };
       if (route.body) {
           spec.paths[route.path][method].requestBody = {
               content: {
                   'application/json': { schema: route.body.schema, example: route.body.example }
               }
           };
       }
    }
    return spec;
  }

  static getHtml() {
    return `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/png" href="https://cdn.letshost.dpdns.org/image/upload/v1751581420/__cdn/685f0e4b7d1b59a6be2a63db/img/ldyoFzE4kF/101/kjfsymvet1lvkuuyrya5.png" />
    <link rel="shortcut icon" href="https://cdn.letshost.dpdns.org/image/upload/v1751581420/__cdn/685f0e4b7d1b59a6be2a63db/img/ldyoFzE4kF/101/kjfsymvet1lvkuuyrya5.png" type="image/png" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Auto-Generated API Documentation-doc-it-up</title>
     <link rel="stylesheet" crossorigin href="https://cdn.letshost.dpdns.org/685f0e4b7d1b59a6be2a63db/css/RGdN_kKAu3/104/index-DLR5SXhN.css"/>
    <script type="module" crossorigin src="https://cdn.letshost.dpdns.org/685f0e4b7d1b59a6be2a63db/js/-fhDzkflS0/103/index-eEW-mwy-.js"></script>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`;
  }
}