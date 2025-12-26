import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs'; 
import { defineConfig } from 'rollup';

export default defineConfig({
  input: {
    index: 'src/index.ts',
    core: 'src/core.ts',
    'adapters/express': 'src/adapters/express.ts',
    'adapters/fastify': 'src/adapters/fastify.ts',
    'adapters/koa': 'src/adapters/koa.ts',
    'adapters/hono': 'src/adapters/hono.ts',
    'adapters/elysia': 'src/adapters/elysia.ts',
    'adapters/hapi': 'src/adapters/hapi.ts'
  },
  output: {
    dir: 'dist',
    format: 'esm',
    entryFileNames: '[name].js',
    chunkFileNames: 'chunks/[name]-[hash].js',
    // 3. Fix: Help Rollup handle default exports from CJS modules
    interop: 'auto' 
  },
  external: [
    'fs/promises',
    'path',
    'stream',
    'http',
    'express',
    'fastify',
    'koa',
    'hono',
    'elysia',
    '@hapi/hapi'
  ],
  plugins: [
    resolve(),  
    commonjs(), 
    typescript({
      declaration: true,
      declarationDir: 'dist',
      rootDir: 'src'
    })
  ]
});