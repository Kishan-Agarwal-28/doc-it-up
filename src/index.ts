import fs from 'fs/promises';
import path from 'path';

import { Request, Response, NextFunction } from 'express';
import { Readable } from 'stream';
const pathToUserPkg = path.resolve(process.cwd(), 'package.json');

let name: string, version: string, description: string;
;(async()=>{
  const packageJson = await fs.readFile(pathToUserPkg, 'utf-8').then(JSON.parse);
  name = packageJson.name;
  version = packageJson.version;  
  description = packageJson.description;
})();


// Type definitions
interface FileUpload {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer?: Buffer;
  destination?: string;
  filename?: string;
  path?: string;
  stream: Readable; // Remove undefined to match Express.Multer.File
  [key: string]: any;
}

interface ExtendableRequest extends Request {
  files?: 
    | Express.Multer.File[]  
    | { [fieldname: string]: Express.Multer.File[] } 
    | undefined;
  [key: string]: any; // Allow any additional properties
}

// Generic response interface that can be extended
interface ExtendableResponse extends Response {
  [key: string]: any; // Allow any additional properties
}

// Generic middleware function signature
type GenericMiddleware<TReq extends ExtendableRequest = ExtendableRequest, TRes extends ExtendableResponse = ExtendableResponse> = 
  (req: TReq, res: TRes, next: NextFunction) => void;

// Generic handler function signature  
type GenericHandler<TReq extends ExtendableRequest = ExtendableRequest, TRes extends ExtendableResponse = ExtendableResponse> = 
  (req: TReq, res: TRes) => Promise<void>;

//  AuthInfo to handle custom auth schemes
interface AuthInfo {
  type: 'bearer' | 'basic' | 'apiKey' | 'custom';
  headerName?: string;
  cookies?: boolean;
  customScheme?: string; // For custom auth types
  extractedData?: Record<string, any>; // For storing extracted auth data
}

//  RequestBodyInfo to handle custom body types
interface RequestBodyInfo {
  type: 'json' | 'formData' | 'urlencoded' | 'custom';
  schema?: JsonSchema;
  fields?: Record<string, FormDataField>;
  example?: any;
  signature: string;
  customType?: string; // For custom body types
  rawData?: any; // For storing raw body data
}

//  ResponseInfo to handle custom response data
interface ResponseInfo {
  statusCode: number;
  statusMessage: string;
  headers: Record<string, string | string[]>;
  cookies: string[];
  redirects: string[];
  body?: {
    type: 'json' | 'text' | 'binary' | 'custom';
    schema?: JsonSchema;
    example?: any;
    signature: string;
    customType?: string; // For custom response types
  };
  customData?: Record<string, any>; // For storing custom response data
}

//  RouteSpec to handle extended data
interface RouteSpec {
  method: string;
  path: string;
  originalPath: string;
  query?: Record<string, any>;
  params?: Record<string, string>;
  body?: RequestBodyInfo;
  auth?: AuthInfo;
  customHeaders?: Record<string, string | string[]>;
  response?: ResponseInfo;
  timestamp: string;
  lastUpdated: string;
  lastAccessed?: string;
  customData?: Record<string, any>; // For storing custom route data
  extensions?: Record<string, any>; // For framework-specific extensions
}

interface JsonSchema {
  type: 'object' | 'array' | 'string' | 'number' | 'integer' | 'boolean' | 'null';
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  required?: string[];
  format?: 'date-time' | 'email' | 'binary' | 'xml' | 'text' | string;
  example?: any;
  nullable?: boolean;
  maxItems?: number;
  maxLength?: number;
  contentMediaType?: string;
  description?: string;
  'x-swagger-ui-file-upload'?: boolean;
  'x-content-type'?: string;
  'x-max-size'?: number;
  'x-original-name'?: string;
}

interface FormDataField {
  type: 'string' | 'array' | 'object';
  format?: 'binary';
  items?: {
    type: 'string';
    format: 'binary';
  };
  required: boolean;
  description: string;
  example?: any;
  contentMediaType?: string;
  maxItems?: number;
  'x-swagger-ui-file-upload'?: boolean;
  'x-content-type'?: string;
  'x-max-size'?: number;
  'x-original-name'?: string;
}

interface OpenAPIParameter {
  name: string;
  in: 'path' | 'query' | 'header';
  required: boolean;
  schema: JsonSchema;
  description: string;
  example?: any;
}

interface OpenAPIRequestBody {
  required: boolean;
  content: Record<string, {
    schema: JsonSchema;
    example?: any;
    encoding?: Record<string, { contentType?: string }>;
  }>;
}

interface OpenAPIResponse {
  description: string;
  headers?: Record<string, {
    schema: JsonSchema;
    description: string;
    example?: any;
  }>;
  content?: Record<string, {
    schema: JsonSchema;
    example?: any;
  }>;
}

interface OpenAPIOperation {
  summary: string;
  description: string;
  parameters: OpenAPIParameter[];
  responses: Record<string, OpenAPIResponse>;
  tags: string[];
  requestBody?: OpenAPIRequestBody;
  security?: Record<string, string[]>[];
}

interface OpenAPISecurityScheme {
  type: 'http' | 'apiKey';
  scheme?: 'bearer' | 'basic';
  bearerFormat?: string;
  in?: 'header';
  name?: string;
  description: string;
}

interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    version: string;
    description: string;
  };
  servers: Array<{
    url: string;
    description: string;
  }>;
  paths: Record<string, Record<string, OpenAPIOperation>>;
  components: {
    securitySchemes: Record<string, OpenAPISecurityScheme>;
    schemas: Record<string, JsonSchema>;
  };
}

interface AutoDocOptions {
  docsDir?: string;
}

// Global state
const routeSpecs = new Map<string, RouteSpec>();
let docsDir = './docs';

// Initialize docs directory
const initDocsDirectory = async (customDocsDir?: string): Promise<void> => {
  if (customDocsDir) docsDir = customDocsDir;
  try {
    await fs.access(docsDir);
  } catch {
    await fs.mkdir(docsDir, { recursive: true });
  }
};

// Normalize dynamic routes
const normalizePath = (path: string): string => {
  return path
    .replace(/\/\d+/g, '/{id}')
    .replace(/\/[a-f0-9]{24}/g, '/{id}') // MongoDB ObjectId
    .replace(/\/[a-f0-9-]{36}/g, '/{id}') // UUID
    .replace(/\/[^\/]+\/\d+/g, '/{resource}/{id}')
    .replace(/\?.*$/, ''); // Remove query string
};

// Extract parameters from URL
const extractParams = (originalPath: string, normalizedPath: string): Record<string, string> => {
  const originalSegments = originalPath.split('/');
  const normalizedSegments = normalizedPath.split('/');
  const params: Record<string, string> = {};

  for (let i = 0; i < normalizedSegments.length; i++) {
    if (normalizedSegments[i].startsWith('{') && normalizedSegments[i].endsWith('}')) {
      const paramName = normalizedSegments[i].slice(1, -1);
      params[paramName] = originalSegments[i];
    }
  }

  return params;
};

// Generate schema signature based on keys only (for comparison)
const generateSchemaSignature = (obj: any): string => {
  if (!obj || typeof obj !== 'object') return 'primitive';
  
  if (Array.isArray(obj)) {
    if (obj.length === 0) return 'array:empty';
    return `array:${generateSchemaSignature(obj[0])}`;
  }

  const keys = Object.keys(obj).sort();
  const keySignatures = keys.map(key => {
    const value = obj[key];
    if (value === null) return `${key}:null`;
    if (Array.isArray(value)) {
      return `${key}:array:${value.length > 0 ? generateSchemaSignature(value[0]) : 'empty'}`;
    }
    if (typeof value === 'object') {
      return `${key}:object:${generateSchemaSignature(value)}`;
    }
    return `${key}:${typeof value}`;
  });

  return keySignatures.join('|');
};

// Extract authentication info
const extractAuthInfo = <TReq extends ExtendableRequest>(req: TReq): AuthInfo | undefined => {
  const auth: Partial<AuthInfo> = {};
  
  // Check for Authorization header
  if (req.headers.authorization) {
    const authHeader = req.headers.authorization;
    if (authHeader.startsWith('Bearer ')) {
      auth.type = 'bearer';
      auth.extractedData = { token: authHeader.substring(7) };
    } else if (authHeader.startsWith('Basic ')) {
      auth.type = 'basic';
      auth.extractedData = { credentials: authHeader.substring(6) };
    } else {
      auth.type = 'custom';
      auth.headerName = 'Authorization';
      auth.customScheme = authHeader.split(' ')[0];
      auth.extractedData = { fullHeader: authHeader };
    }
  }

  // Check for API key in headers (extended list)
  const apiKeyHeaders = [
    'x-api-key', 'api-key', 'x-auth-token', 'x-access-token', 
    'x-client-id', 'x-app-key', 'x-secret-key'
  ];
  
  for (const header of apiKeyHeaders) {
    if (req.headers[header]) {
      auth.type = 'apiKey';
      auth.headerName = header;
      auth.extractedData = { 
        [header]: req.headers[header],
        keyType: header
      };
      break;
    }
  }

  // Check for custom auth headers (any header starting with 'x-auth-' or 'x-token-')
  const customAuthHeaders = Object.keys(req.headers).filter(header => 
    header.startsWith('x-auth-') || header.startsWith('x-token-') || header.startsWith('x-jwt-')
  );
  
  if (customAuthHeaders.length > 0 && !auth.type) {
    auth.type = 'custom';
    auth.headerName = customAuthHeaders[0];
    auth.extractedData = customAuthHeaders.reduce((acc, header) => {
      acc[header] = req.headers[header];
      return acc;
    }, {} as Record<string, any>);
  }

  // Check for cookies
  if (req.headers.cookie) {
    auth.cookies = true;
    if (!auth.extractedData) auth.extractedData = {};
    auth.extractedData.cookies = req.headers.cookie;
  }

  // Check for custom auth data in extended request properties
  if ('auth' in req && req.auth) {
    if (!auth.extractedData) auth.extractedData = {};
    auth.extractedData.customAuth = req.auth;
  }

  // Check for user data in extended request properties
  if ('user' in req && req.user) {
    if (!auth.extractedData) auth.extractedData = {};
    auth.extractedData.user = req.user;
  }

  return Object.keys(auth).length > 0 ? auth as AuthInfo : undefined;
};
// Extract custom headers (exclude standard ones)
//  custom header extraction with configurable exclusions
const extractCustomHeaders = <TReq extends ExtendableRequest>(
  headers: TReq['headers'],
  additionalStandardHeaders: string[] = []
): Record<string, string | string[]> | undefined => {
  const standardHeaders = [
    'host', 'user-agent', 'accept', 'accept-encoding', 'accept-language',
    'cache-control', 'connection', 'content-length', 'content-type',
    'cookie', 'origin', 'referer', 'sec-fetch-dest', 'sec-fetch-mode',
    'sec-fetch-site', 'upgrade-insecure-requests', 'postman-token',
    'if-none-match', 'if-modified-since', 'pragma', 'expires',
    'last-modified', 'etag', 'server', 'date', 'vary',
    ...additionalStandardHeaders // Allow custom exclusions
  ];

  const customHeaders: Record<string, string | string[]> = {};
  
  for (const [key, value] of Object.entries(headers)) {
    const lowerKey = key.toLowerCase();
    
    // Skip standard headers, sec- prefixed headers, and undefined values
    if (!standardHeaders.includes(lowerKey) && 
        !lowerKey.startsWith('sec-') && 
        !lowerKey.startsWith('cf-') && // Cloudflare headers
        !lowerKey.startsWith('x-forwarded-') && // Proxy headers
        !lowerKey.startsWith('x-real-ip') && // Real IP headers
        value !== undefined) {
      customHeaders[key] = value;
    }
  }

  return Object.keys(customHeaders).length > 0 ? customHeaders : undefined;
};

// Extract response info with schema signature
//  response extraction with support for custom response data
const extractResponseInfo = <TRes extends ExtendableResponse>(
  res: TRes, 
  body: any
): ResponseInfo => {
  const responseInfo: ResponseInfo = {
    statusCode: res.statusCode,
    statusMessage: res.statusMessage || '',
    headers: {},
    cookies: [],
    redirects: [],
    customData: {}
  };

  // Extract response headers (excluding standard ones)
  const headers = res.getHeaders();
  const standardResponseHeaders = [
    'content-length', 'date', 'connection', 'keep-alive',
    'transfer-encoding', 'server', 'x-powered-by'
  ];
  
  for (const [key, value] of Object.entries(headers)) {
    if (!standardResponseHeaders.includes(key.toLowerCase())) {
      responseInfo.headers[key] = value as string | string[];
    }
  }

  // Extract set-cookie headers
  const setCookies = res.getHeader('set-cookie');
  if (setCookies) {
    responseInfo.cookies = Array.isArray(setCookies) ? setCookies : [setCookies as string];
  }

  // Check for redirects
  if (res.statusCode >= 300 && res.statusCode < 400) {
    const location = res.getHeader('location');
    if (location) {
      responseInfo.redirects.push(location as string);
    }
  }

  // Extract custom response data from extended response properties
  const customResponseKeys = ['customData', 'metadata', 'context', 'extras'];
  for (const key of customResponseKeys) {
    if (key in res && res[key]) {
      responseInfo.customData![key] = res[key];
    }
  }

  //  body parsing with custom type detection
  if (body !== undefined && body !== null) {
    const contentType = (res.getHeader('content-type') as string) || '';
    
    if (contentType.includes('application/json')) {
      try {
        const parsedBody = typeof body === 'string' ? JSON.parse(body) : body;
        responseInfo.body = {
          type: 'json',
          schema: generateJsonSchema(parsedBody),
          example: parsedBody,
          signature: generateSchemaSignature(parsedBody)
        };
      } catch {
        responseInfo.body = { 
          type: 'text', 
          example: body,
          signature: 'text'
        };
      }
    } else if (contentType.includes('application/xml') || contentType.includes('text/xml')) {
      responseInfo.body = {
        type: 'custom',
        customType: 'xml',
        example: body,
        signature: 'xml'
      };
    } else if (contentType.includes('application/octet-stream') || contentType.includes('application/pdf')) {
      responseInfo.body = {
        type: 'binary',
        customType: contentType.split('/')[1],
        example: '[Binary Data]',
        signature: 'binary'
      };
    } else if (contentType.includes('text/')) {
      responseInfo.body = { 
        type: 'text', 
        example: body,
        signature: 'text'
      };
    } else {
      // Handle custom content types
      responseInfo.body = {
        type: 'custom',
        customType: contentType,
        example: body,
        signature: contentType || 'unknown'
      };
    }
  }

  return responseInfo;
};

// Check if route spec should be updated based on schema changes
const shouldUpdateSpec = (existingSpec: RouteSpec | undefined, newSpec: RouteSpec): boolean => {
  // Always update if no existing spec
  if (!existingSpec) return true;

  // Compare request body schemas
  if (existingSpec.body?.signature !== newSpec.body?.signature) {
    return true;
  }

  // Compare response body schemas
  if (existingSpec.response?.body?.signature !== newSpec.response?.body?.signature) {
    return true;
  }

  // Compare query parameters (keys only)
  const existingQueryKeys = existingSpec.query ? Object.keys(existingSpec.query).sort() : [];
  const newQueryKeys = newSpec.query ? Object.keys(newSpec.query).sort() : [];
  if (JSON.stringify(existingQueryKeys) !== JSON.stringify(newQueryKeys)) {
    return true;
  }

  // Compare custom headers (keys only)
  const existingHeaderKeys = existingSpec.customHeaders ? Object.keys(existingSpec.customHeaders).sort() : [];
  const newHeaderKeys = newSpec.customHeaders ? Object.keys(newSpec.customHeaders).sort() : [];
  if (JSON.stringify(existingHeaderKeys) !== JSON.stringify(newHeaderKeys)) {
    return true;
  }

  // Compare auth type
  if (existingSpec.auth?.type !== newSpec.auth?.type) {
    return true;
  }

  return false;
};

// Save individual route spec to JSON file
const saveRouteSpec = async (routeKey: string, spec: RouteSpec): Promise<void> => {
  const filename = routeKey.replace(/[^a-zA-Z0-9]/g, '_') + '.json';
  const filepath = path.join(docsDir, filename);
  
  try {
    await fs.writeFile(filepath, JSON.stringify(spec, null, 2));
  } catch (error) {
    console.error('Error saving route spec:', error);
  }
};

// Load existing specs from files
const loadExistingSpecs = async (): Promise<void> => {
  try {
    const files = await fs.readdir(docsDir);
    const jsonFiles = files.filter(file => file.endsWith('.json'));

    for (const file of jsonFiles) {
      try {
        const filepath = path.join(docsDir, file);
        const content = await fs.readFile(filepath, 'utf8');
        const spec = JSON.parse(content) as RouteSpec;
        const routeKey = `${spec.method.toLowerCase()}:${spec.path}`;
        routeSpecs.set(routeKey, spec);
      } catch (error) {
        console.error(`Error loading spec from ${file}:`, error);
      }
    }
  } catch (error) {
    console.error('Error loading existing specs:', error);
  }
};

// Helper function to get tag from path
const getTagFromPath = (path: string): string => {
  const segments = path.split('/').filter(s => s && !s.startsWith('{'));
  return segments[0] || 'default';
};

// Helper function to get status description
const getStatusDescription = (statusCode: string): string => {
  const descriptions: Record<string, string> = {
    '200': 'Success',
    '201': 'Created',
    '204': 'No Content',
    '400': 'Bad Request',
    '401': 'Unauthorized',
    '403': 'Forbidden',
    '404': 'Not Found',
    '422': 'Validation Error',
    '500': 'Internal Server Error'
  };
  return descriptions[statusCode] || 'Response';
};

// Helper functions for format detection
const isValidDate = (str: string): boolean => {
  return !isNaN(Date.parse(str)) && str.includes('T');
};

const isValidEmail = (str: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);
};

//  getTypeSchema function
const getTypeSchema = (value: any): JsonSchema => {
  if (value === null || value === undefined) {
    return { type: 'string', nullable: true };
  }
  
  const type = typeof value;
  switch (type) {
    case 'string':
      // Check if it's a date string
      if (isValidDate(value)) {
        return { type: 'string', format: 'date-time' };
      }
      // Check if it's an email
      if (isValidEmail(value)) {
        return { type: 'string', format: 'email' };
      }
      return { type: 'string' };
    case 'number':
      return { 
        type: Number.isInteger(value) ? 'integer' : 'number',
        example: value
      };
    case 'boolean':
      return { type: 'boolean', example: value };
    case 'object':
      if (Array.isArray(value)) {
        return {
          type: 'array',
          items: value.length > 0 ? getTypeSchema(value[0]) : { type: 'string' }
        };
      }
      return generateJsonSchema(value);
    default:
      return { type: 'string' };
  }
};

//  generateJsonSchema function
const generateJsonSchema = (obj: any): JsonSchema => {
  if (!obj || typeof obj !== 'object') {
    return getTypeSchema(obj);
  }
  
  if (Array.isArray(obj)) {
    return {
      type: 'array',
      items: obj.length > 0 ? getTypeSchema(obj[0]) : { type: 'string' }
    };
  }

  const schema: JsonSchema = {
    type: 'object',
    properties: {},
    required: []
  };

  for (const [key, value] of Object.entries(obj)) {
    if (schema.properties) {
      schema.properties[key] = getTypeSchema(value);
    }
    if (value !== null && value !== undefined && schema.required) {
      schema.required.push(key);
    }
  }

  if (schema.required && schema.required.length === 0) {
    delete schema.required;
  }

  return schema;
};

//  form data field extraction
const ExtractFormDataFields = (
  body: Record<string, any>, 
  files: Record<string, FileUpload | FileUpload[]> | undefined
): Record<string, FormDataField> => {
  const fields: Record<string, FormDataField> = {};
  
  // Handle regular form fields
  if (body) {
    for (const [key, value] of Object.entries(body)) {
      fields[key] = {
        type: Array.isArray(value) ? 'array' : typeof value === 'string' ? 'string' : 'object',
        required: true,
        description: `Form field: ${key}`,
        example: Array.isArray(value) ? value : [value]
      };
    }
  }

  //  file handling with proper Swagger UI support
  if (files) {
    for (const [key, file] of Object.entries(files)) {
      if (Array.isArray(file)) {
        // Multiple files with same field name
        fields[key] = {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary'
          },
          required: true,
          description: `Multiple file upload field: ${key}`,
          'x-swagger-ui-file-upload': true,
          maxItems: file.length
        };
      } else {
        // Single file - this is the key fix for Swagger UI file upload
        fields[key] = {
          type: 'string',
          format: 'binary',
          required: true,
          description: `File upload field: ${key}`,
          'x-swagger-ui-file-upload': true,
          ...(file.mimetype && { 
            contentMediaType: file.mimetype,
            'x-content-type': file.mimetype 
          }),
          ...(file.size && { 
            'x-max-size': file.size 
          }),
          ...(file.originalname && { 
            'x-original-name': file.originalname 
          })
        };
      }
    }
  }

  return fields;
};

// Fixed multipart form data schema generation for Swagger UI
const generateMultipartSchema = (fields: Record<string, FormDataField>): JsonSchema => {
  const schema: JsonSchema = {
    type: 'object',
    properties: {},
    required: []
  };
  
  if (fields && schema.properties && schema.required) {
    for (const [fieldName, fieldSpec] of Object.entries(fields)) {
      // File upload fields
      if (fieldSpec.format === 'binary') {
        schema.properties[fieldName] = {
          type: 'string',
          format: 'binary',
          description: fieldSpec.description || `File upload: ${fieldName}`,
          ...(fieldSpec.contentMediaType && { contentMediaType: fieldSpec.contentMediaType })
        };
      } 
      // Multiple file upload fields
      else if (fieldSpec.type === 'array' && fieldSpec.items?.format === 'binary') {
        schema.properties[fieldName] = {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary'
          },
          description: fieldSpec.description || `Multiple file upload: ${fieldName}`,
          ...(fieldSpec.maxItems && { maxItems: fieldSpec.maxItems })
        };
      } 
      // Regular form fields
      else {
        schema.properties[fieldName] = {
          type: fieldSpec.type || 'string',
          description: fieldSpec.description || `Form field: ${fieldName}`,
          ...(fieldSpec.example && { example: fieldSpec.example })
        };
      }
      
      if (fieldSpec.required) {
        schema.required.push(fieldName);
      }
    }
  }

  // Remove empty required array
  if (schema.required && schema.required.length === 0) {
    delete schema.required;
  }

  return schema;
};

const ParseRequestBody = <TReq extends ExtendableRequest>(req: TReq): RequestBodyInfo | undefined => {
  const contentType = req.headers['content-type'] || '';
  
  // Handle standard content types
  if (contentType.includes('application/json')) {
    return {
      type: 'json',
      schema: generateJsonSchema(req.body),
      example: req.body,
      signature: generateSchemaSignature(req.body)
    };
  } 
  
  if (contentType.includes('multipart/form-data')) {
    // Type guard to check if files is an object with fieldname keys
    const isFilesObject = (files: any): files is { [fieldname: string]: Express.Multer.File[] } => {
      return files && typeof files === 'object' && !Array.isArray(files);
    };
    
    // Convert files to a consistent format for processing
    const filesForProcessing = req.files 
      ? isFilesObject(req.files) 
        ? req.files 
        : {} // If it's an array, we'll handle it differently
      : {};
    
    const fields = ExtractFormDataFields(req.body, filesForProcessing);
    
    // Create example object with file information
    let filesExample = {};
    if (req.files) {
      if (Array.isArray(req.files)) {
        // Handle array of files
        filesExample = {
          files: req.files.map(f => `[File: ${f.originalname || 'uploaded_file'}]`)
        };
      } else if (isFilesObject(req.files)) {
        // Handle object with fieldname keys - use the type-guarded variable
        const filesObj = req.files;
        filesExample = Object.keys(filesObj).reduce((acc, key) => {
          const fileArray = filesObj[key];
          acc[key] = fileArray.map(f => `[File: ${f.originalname || 'uploaded_file'}]`);
          return acc;
        }, {} as Record<string, any>);
      }
    }
    
    return {
      type: 'formData',
      fields: fields,
      schema: generateMultipartSchema(fields),
      example: {
        ...req.body,
        ...filesExample
      },
      signature: generateSchemaSignature({ 
        ...req.body, 
        files: req.files && isFilesObject(req.files) ? Object.keys(req.files) : [] 
      })
    };
  } 
  
  if (contentType.includes('application/x-www-form-urlencoded')) {
    return {
      type: 'urlencoded',
      schema: generateJsonSchema(req.body),
      example: req.body,
      signature: generateSchemaSignature(req.body)
    };
  }
  
  // Handle custom content types
  if (contentType.includes('application/xml') || contentType.includes('text/xml')) {
    return {
      type: 'custom',
      customType: 'xml',
      schema: { type: 'string', format: 'xml' },
      example: req.body,
      signature: 'xml',
      rawData: req.body
    };
  }
  
  if (contentType.includes('text/plain')) {
    return {
      type: 'custom',
      customType: 'text',
      schema: { type: 'string' },
      example: req.body,
      signature: 'text',
      rawData: req.body
    };
  }
  
  if (contentType.includes('application/octet-stream')) {
    return {
      type: 'custom',
      customType: 'binary',
      schema: { type: 'string', format: 'binary' },
      example: '[Binary Data]',
      signature: 'binary',
      rawData: req.body
    };
  }
  
  // Handle any other custom content types
  if (contentType && req.body !== undefined) {
    return {
      type: 'custom',
      customType: contentType,
      schema: { type: 'string' },
      example: req.body,
      signature: contentType.replace(/[^a-zA-Z0-9]/g, '_'),
      rawData: req.body
    };
  }
  
  // Check for custom body parsers in extended request properties
  const customBodyKeys = ['parsedBody', 'rawBody', 'customBody'];
  for (const key of customBodyKeys) {
    if (key in req && req[key]) {
      return {
        type: 'custom',
        customType: key,
        schema: generateJsonSchema(req[key]),
        example: req[key],
        signature: generateSchemaSignature(req[key]),
        rawData: req[key]
      };
    }
  }
  
  return undefined;
};
// Generate encoding for multipart form data
const generateFormDataEncoding = (fields: Record<string, FormDataField>): Record<string, { contentType?: string }> | undefined => {
  const encoding: Record<string, { contentType?: string }> = {};
  
  if (fields) {
    for (const [fieldName, fieldSpec] of Object.entries(fields)) {
      if (fieldSpec.format === 'binary' || 
          (fieldSpec.type === 'array' && fieldSpec.items?.format === 'binary')) {
        encoding[fieldName] = {
          contentType: fieldSpec.contentMediaType || 'application/octet-stream'
        };
      }
    }
  }
  
  return Object.keys(encoding).length > 0 ? encoding : undefined;
};

//  Swagger/OpenAPI spec generation
const generateSwaggerSpec = (): OpenAPISpec => {
  const spec: OpenAPISpec = {
    openapi: '3.0.0',
    info: {
      title: `${name}`,
      version: `${version}`,
      description: `Automatically generated API documentation based on actual API usage\n ${description}`,
      
    },
    servers: [
      {
        url: '/',
        description: 'Current server'
      }
    ],
    paths: {},
    components: {
      securitySchemes: {},
      schemas: {}
    }
  };

  // If no routes are captured yet, return a basic spec
  if (routeSpecs.size === 0) {
    spec.paths['/'] = {
      get: {
        summary: 'No routes documented yet',
        description: 'Make API calls to auto-generate documentation',
        parameters: [],
        responses: {
          '200': {
            description: 'Success'
          }
        },
        tags: ['default']
      }
    };
    return spec;
  }

  // Group specs by path
  const pathGroups = new Map<string, Map<string, RouteSpec>>();
  for (const [routeKey, routeSpec] of routeSpecs.entries()) {
    const path = routeSpec.path;
    if (!pathGroups.has(path)) {
      pathGroups.set(path, new Map());
    }
    pathGroups.get(path)!.set(routeSpec.method.toLowerCase(), routeSpec);
  }

  // Convert to Swagger format
  for (const [path, methods] of pathGroups.entries()) {
    // Ensure path starts with /
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    spec.paths[normalizedPath] = {};

    for (const [method, routeSpec] of methods.entries()) {
      const operation: OpenAPIOperation = {
        summary: `${method.toUpperCase()} ${normalizedPath}`,
        description: `Auto-generated documentation for ${method.toUpperCase()} ${normalizedPath}`,
        parameters: [],
        responses: {
          '200': {
            description: 'Default response'
          }
        },
        tags: [getTagFromPath(normalizedPath)]
      };

      // Add path parameters
      if (routeSpec.params && Object.keys(routeSpec.params).length > 0) {
        for (const [paramName, paramValue] of Object.entries(routeSpec.params)) {
          operation.parameters.push({
            name: paramName,
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: `Path parameter: ${paramName}`,
            example: paramValue
          });
        }
      }

      // Add query parameters
      if (routeSpec.query && Object.keys(routeSpec.query).length > 0) {
        for (const [queryName, queryValue] of Object.entries(routeSpec.query)) {
          operation.parameters.push({
            name: queryName,
            in: 'query',
            required: false,
            schema: getTypeSchema(queryValue),
            description: `Query parameter: ${queryName}`,
            example: queryValue
          });
        }
      }

      // Add custom headers
      if (routeSpec.customHeaders) {
        for (const [headerName, headerValue] of Object.entries(routeSpec.customHeaders)) {
          operation.parameters.push({
            name: headerName,
            in: 'header',
            required: false,
            schema: { type: 'string' },
            description: `Custom header: ${headerName}`,
            example: headerValue
          });
        }
      }

      //  request body handling
      if (['post', 'put', 'patch'].includes(method) && routeSpec.body) {
        operation.requestBody = {
          required: true,
          content: {}
        };

        if (routeSpec.body.type === 'json') {
          operation.requestBody.content['application/json'] = {
            schema: routeSpec.body.schema || { type: 'object' },
            example: routeSpec.body.example
          };
        } else if (routeSpec.body.type === 'formData') {
          operation.requestBody.content['multipart/form-data'] = {
            schema: routeSpec.body.schema || { type: 'object' },
            encoding: generateFormDataEncoding(routeSpec.body.fields || {})
          };
        } else if (routeSpec.body.type === 'urlencoded') {
          operation.requestBody.content['application/x-www-form-urlencoded'] = {
            schema: routeSpec.body.schema || { type: 'object' },
            example: routeSpec.body.example
          };
        }
      }

      // Add authentication
      if (routeSpec.auth) {
        operation.security = [];
        
        if (routeSpec.auth.type === 'bearer') {
          operation.security.push({ BearerAuth: [] });
          spec.components.securitySchemes.BearerAuth = {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'JWT Bearer token authentication'
          };
        } else if (routeSpec.auth.type === 'basic') {
          operation.security.push({ BasicAuth: [] });
          spec.components.securitySchemes.BasicAuth = {
            type: 'http',
            scheme: 'basic',
            description: 'Basic HTTP authentication'
          };
        } else if (routeSpec.auth.type === 'apiKey' && routeSpec.auth.headerName) {
          const schemeName = `ApiKey_${routeSpec.auth.headerName.replace(/[^a-zA-Z0-9]/g, '_')}`;
          operation.security.push({ [schemeName]: [] });
          spec.components.securitySchemes[schemeName] = {
            type: 'apiKey',
            in: 'header',
            name: routeSpec.auth.headerName,
            description: `API Key authentication via ${routeSpec.auth.headerName} header`
          };
        }
      }

      //  response handling
      if (routeSpec.response) {
        const statusCode = routeSpec.response.statusCode?.toString() || '200';
        const responseObj: OpenAPIResponse = {
          description: routeSpec.response.statusMessage || getStatusDescription(statusCode)
        };

        // Add response headers
        if (routeSpec.response.headers && Object.keys(routeSpec.response.headers).length > 0) {
          responseObj.headers = {};
          for (const [headerName, headerValue] of Object.entries(routeSpec.response.headers)) {
            responseObj.headers[headerName] = {
              schema: { type: 'string' },
              description: `Response header: ${headerName}`,
              example: Array.isArray(headerValue) ? headerValue[0] : headerValue
            };
          }
        }

        // Add response body
        if (routeSpec.response.body) {
          responseObj.content = {};
          
          if (routeSpec.response.body.type === 'json') {
            responseObj.content['application/json'] = {
              schema: routeSpec.response.body.schema || { type: 'object' },
              example: routeSpec.response.body.example
            };
          } else {
            responseObj.content['text/plain'] = {
              schema: { type: 'string' },
              example: routeSpec.response.body.example
            };
          }
        }

        operation.responses[statusCode] = responseObj;
      }

      spec.paths[normalizedPath]![method] = operation;
    }
  }

  return spec;
};

// Main middleware function
// Generic middleware function that works with extended request/response objects
const autoDocMiddleware = <TReq extends ExtendableRequest = ExtendableRequest, TRes extends ExtendableResponse = ExtendableResponse>(
  options: AutoDocOptions = {}
): GenericMiddleware<TReq, TRes> => {
  // Initialize with options
  if (options.docsDir) {
    initDocsDirectory(options.docsDir);
  } else {
    initDocsDirectory();
  }

  return (req: TReq, res: TRes, next: NextFunction): void => {
    // Skip documentation route
    if (req.path === '/docs' || req.path.startsWith('/docs/')) {
      return next();
    }

    const originalPath: string = req.path;
    const normalizedPath: string = normalizePath(originalPath);
    const method: string = req.method.toLowerCase();
    const routeKey: string = `${method}:${normalizedPath}`;

    //  request data capture with custom data extraction
    const requestData: Partial<RouteSpec> = {
      method: method.toUpperCase(),
      path: normalizedPath,
      originalPath,
      query: req.query as Record<string, any>,
      params: extractParams(originalPath, normalizedPath),
      body: ParseRequestBody(req),
      auth: extractAuthInfo(req),
      customHeaders: extractCustomHeaders(req.headers),
      timestamp: new Date().toISOString(),
      customData: {},
      extensions: {}
    };

    // Extract custom data from extended request properties
    const customRequestKeys = ['context', 'metadata', 'extras', 'customData'];
    for (const key of customRequestKeys) {
      if (key in req && req[key]) {
        requestData.customData![key] = req[key];
      }
    }

    // Extract framework-specific extensions
    const frameworkKeys = ['app', 'route', 'baseUrl', 'originalUrl', 'session'];
    for (const key of frameworkKeys) {
      if (key in req && req[key] && key !== 'app') { // Skip app to avoid circular references
        requestData.extensions![key] = req[key];
      }
    }

    //  response capturing with support for custom response methods
    const originalSend = res.send;
    const originalJson = res.json;
    const originalEnd = res.end;
    let responseBody: any = '';

    // Override send method
    res.send = function(data: any): TRes {
      responseBody = data;
      return originalSend.call(this, data) as TRes;
    };

    // Override json method
    res.json = function(data: any): TRes {
      responseBody = JSON.stringify(data);
      return originalJson.call(this, data) as TRes;
    };

    // Override end method to catch responses that bypass send/json
    res.end = function(chunk?: any, encoding?: any): TRes {
      if (chunk && !responseBody) {
        responseBody = chunk;
      }
      return originalEnd.call(this, chunk, encoding) as TRes;
    };

    // Process after response with  error handling
    res.on('finish', async (): Promise<void> => {
      try {
        // Document both successful and error responses
        if (res.statusCode >= 200 && res.statusCode < 300) { // Capture all status codes
          const responseInfo: ResponseInfo = extractResponseInfo(res, responseBody);
          
          const newApiSpec: RouteSpec = {
            ...requestData,
            response: responseInfo,
            lastUpdated: new Date().toISOString()
          } as RouteSpec;

          // Check if we should update the spec
          const existingSpec: RouteSpec | undefined = routeSpecs.get(routeKey);
          if (shouldUpdateSpec(existingSpec, newApiSpec)) {
            console.log(`Updating API spec for ${routeKey} - Schema change detected`);
            
            // Store in memory map
            routeSpecs.set(routeKey, newApiSpec);

            // Save to file
            await saveRouteSpec(routeKey, newApiSpec);
          } else {
            console.log(`Skipping update for ${routeKey} - Same schema structure`);
            
            // Update only the timestamp in existing spec
            if (existingSpec) {
              existingSpec.lastAccessed = new Date().toISOString();
              routeSpecs.set(routeKey, existingSpec);
              await saveRouteSpec(routeKey, existingSpec);
            }
          }
        }
      } catch (error) {
        console.error('Error processing route documentation:', error);
      }
    });

    next();
  };
};

// Generic docs handler that works with extended request/response objects
const docsHandler = <TReq extends ExtendableRequest = ExtendableRequest, TRes extends ExtendableResponse = ExtendableResponse>(): GenericHandler<TReq, TRes> => {
  return async (req: TReq, res: TRes): Promise<void> => {
    try {
      // Load existing specs from files
      await loadExistingSpecs();
      
      // Handle JSON endpoint
      if (req.path === '/docs/swagger.json' || req.path.endsWith('/swagger.json')) {
        const swaggerSpec: OpenAPISpec = generateSwaggerSpec();
        
        // Validate the spec before sending
        if (!swaggerSpec.openapi || !swaggerSpec.info || !swaggerSpec.paths) {
          res.status(500).json({
            error: 'Invalid OpenAPI specification generated'
          });
          return;
        }
        
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.json(swaggerSpec);
        return;
      }
const html: string = `
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
</html>

`
      
      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } catch (error) {
      console.error('Error serving docs:', error);
      res.status(500).json({
        error: 'Failed to generate documentation',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
};

// Export with generic type support
export { 
  autoDocMiddleware, 
  docsHandler, 
  initDocsDirectory,
  type ExtendableRequest,
  type ExtendableResponse,
  type GenericMiddleware,
  type GenericHandler
};

