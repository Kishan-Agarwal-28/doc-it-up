import typescript from '@rollup/plugin-typescript';
import { defineConfig } from 'rollup';

export default defineConfig({
  // 1. Specify all your entry points here
  input: {
    index: 'src/index.ts',            // Backward compatibility
    core: 'src/core.ts',              // The logic brain
    'adapters/express': 'src/adapters/express.ts',
    'adapters/fastify': 'src/adapters/fastify.ts',
    'adapters/koa': 'src/adapters/koa.ts',
    'adapters/hono': 'src/adapters/hono.ts',
    'adapters/elysia': 'src/adapters/elysia.ts',
    'adapters/hapi': 'src/adapters/hapi.ts'
  },
  output: {
    dir: 'dist',                      // Output to directory, not single file
    format: 'esm',                    // ES Modules
    entryFileNames: '[name].js',      // Keep original names (e.g. adapters/express.js)
    chunkFileNames: 'chunks/[name]-[hash].js' // Shared code goes here
  },
  // 2. Mark Node built-ins and Frameworks as external
  external: [
    'fs/promises',
    'path',
    'stream',
    'http',
    // Frameworks (so we don't bundle the whole framework into your adapter)
    'express',
    'fastify',
    'koa',
    'hono',
    'elysia',
    '@hapi/hapi'
  ],
  plugins: [
    typescript({
      declaration: true,              // Auto-generate .d.ts files
      declarationDir: 'dist',         // Put them in dist/
      rootDir: 'src'                  // Help TS understand source structure
    })
  ]
});