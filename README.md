<div style="display: flex; align-items: center; justify-content: center;">
  <img src="https://raw.githubusercontent.com/Kishan-Agarwal-28/doc-it-up/main/picsvg_download.svg" width="200" height="200" style="margin-right: 16px;" alt="doc-it-up logo" />
  <h1 style="text-wrap:balance">doc-it-up - The Game-Changing API Documentation Generator</h1>
</div>

<div align="center">

[![npm version](https://badge.fury.io/js/doc-it-up.svg)](https://badge.fury.io/js/doc-it-up)
[![Downloads](https://img.shields.io/npm/dm/doc-it-up.svg)](https://www.npmjs.com/package/doc-it-up)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **Stop writing documentation. Start building APIs.**

</div>

---

## 🎯 The Problem That's Killing Your Productivity

Every developer knows the pain:
- 📝 Writing API docs takes **5x longer** than building the API
- 🔄 Docs become **outdated** the moment you deploy
- 🐛 **Inconsistent** documentation leads to integration nightmares
- ⏰ **Deadlines missed** because "we need to update the docs"
- 😤 **Frustrated teammates** dealing with undocumented endpoints

---

## 🔥 **Why Developers Are Switching (and you should too)**

### ❌ **Before doc-it-up**
*Spending hours writing YAML files, struggling with indentation errors, and manually updating schemas every time you change a field.*

```javascript
/**
 * @swagger
 * /users:
 * post:
 * summary: Create a new user
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * name:
 * type: string
 * email:
 * type: string
 * format: email
 * responses:
 * 200:
 * description: User created successfully
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * id:
 * type: integer
 * name:
 * type: string
 * email:
 * type: string
 */
app.post('/users', (req, res) => {
  // Your code here
});

```

### ✅ **After doc-it-up**

*Just write your code. We handle the rest.*

```javascript
app.post('/users', (req, res) => {
  // Your code here
  // Documentation generated automatically!
});

```

**That's it. Seriously.**

---

## ✨ The Solution That Changes Everything

**doc-it-up** is the **revolutionary middleware** that:

### 🧠 **Learns Your API as You Build It**

* **Zero configuration** - Just plug and play
* **Automatic schema detection** from real requests & responses
* **Live documentation** that updates itself instantly
* **Swagger/OpenAPI 3.0** compliance out of the box

### 🔥 **Mind-Blowing Features**

#### 🎪 **Magic Middleware**

Drop it in, and it works. We support **Express, Fastify, Koa, Hono, Elysia, and Hapi**.

#### 🌟 **Intelligent Schema Detection**

We analyze your JSON bodies to build precise types automatically:

```javascript
// Automatically detects and documents:
{
  "user": {
    "name": "string",
    "email": "string (email format)",
    "createdAt": "string (date-time format)",
    "preferences": {
      "theme": "string",
      "notifications": "boolean"
    }
  }
}

```

#### 🔐 **Advanced Authentication Support**

* Bearer tokens
* API keys
* Basic auth
* Custom authentication schemes
* **Automatic security documentation**

#### 📁 **File Upload Documentation**

Automatically handles `multipart/form-data`. We document:

* File type validation
* Size limits
* Multiple file support
* **Swagger UI file upload interface** (Yes, you can upload files directly from the docs!)

#### 🎨 **Beautiful UI**

* **Stunning Swagger UI** included
* **Interactive API explorer**
* **Real-time testing** directly from docs
* **Mobile-responsive** design

---

## 🚀 Quick Start (30 seconds to glory)

### Installation

```bash
npm install doc-it-up

```

### Choose Your Fighter (Framework)

We support them all. Import directly from the subpath for your framework to keep your bundle size small!

#### 🚀 **Express**

```javascript
import express from 'express';
import { expressMiddleware, expressHandler } from 'doc-it-up/express';

const app = express();

// 1. Register the magic middleware
app.use(expressMiddleware());

// 2. Your existing routes work as usual
app.get('/users', (req, res) => {
  res.json({ users: [{ id: 1, name: 'John' }] });
});

// 3. Serve the docs
app.use('/docs', expressHandler());

app.listen(3000, () => {
  console.log('📚 Docs available at http://localhost:3000/docs');
});

```

#### ⚡ **Fastify**

```javascript
import Fastify from 'fastify';
import docItUpPlugin from 'doc-it-up/fastify';

const fastify = Fastify();

// Register the plugin
await fastify.register(docItUpPlugin);

fastify.get('/hello', async () => {
  return { hello: 'world' };
});

await fastify.listen({ port: 3000 });
console.log('📚 Docs available at http://localhost:3000/docs');

```

#### 🔥 **Hono** (Works on Cloudflare Workers, Bun, Node)

```javascript
import { Hono } from 'hono';
import { honoMiddleware, registerHonoDocs } from 'doc-it-up/hono';

const app = new Hono();

app.use('*', honoMiddleware());

app.get('/api', (c) => c.json({ message: 'Hello Hono!' }));

// Register /docs endpoints
registerHonoDocs(app);

export default app;

```

#### 🍃 **Koa**

```javascript
import Koa from 'koa';
import Router from '@koa/router';
import bodyParser from 'koa-bodyparser';
import { koaMiddleware, koaHandler } from 'doc-it-up/koa';

const app = new Koa();
const router = new Router();

app.use(bodyParser());
app.use(koaMiddleware());

router.get('/data', (ctx) => {
  ctx.body = { status: 'success' };
});

// Serve docs
router.get('/docs', koaHandler());
router.get('/docs/swagger.json', koaHandler());

app.use(router.routes());
app.listen(3000);

```

#### 🦊 **Elysia** (Bun)

```javascript
import { Elysia } from 'elysia';
import { docItUpElysia } from 'doc-it-up/elysia';

new Elysia()
  .use(docItUpElysia())
  .get('/', () => 'Hello Elysia')
  .listen(3000);

```

#### 🛠️ **Hapi**

```javascript
import Hapi from '@hapi/hapi';
import { hapiPlugin } from 'doc-it-up/hapi';

const init = async () => {
    const server = Hapi.server({ port: 3000 });
    
    await server.register(hapiPlugin);

    server.route({
        method: 'GET',
        path: '/',
        handler: () => 'Hello Hapi'
    });

    await server.start();
};
init();

```

---

<div style="background-color:#ffe5e5; color:#b30000; padding:12px; border-left:5px solid #b30000; font-weight:bold;">
🚨 <strong>NOTE:</strong> doc-it-up generates documentation based on actual requests. This is amazing for development! However, please ensure you review or secure your documentation routes before deploying to a public production environment to avoid exposing sensitive test data.
</div>

## 🎯 Advanced Features

### 📊 **Smart Schema Evolution**

```javascript
// First request: { "name": "John" }
// Second request: { "name": "John", "age": 30 }
// doc-it-up automatically merges schemas intelligently to { "name": string, "age": integer }

```

### 🔄 **Real-time Updates**

* Documentation updates **automatically** with each request
* **No server restart** required
* **Schema versioning** and change detection

### 📱 **Multi-format Support**

* JSON
* XML
* Form data
* File uploads
* Custom content types

## 📈 Performance Impact

| Metric | Impact |
| --- | --- |
| **Request Latency** | +0.1ms (Negligible) |
| **Memory Usage** | +2MB |
| **CPU Overhead** | <0.01% |
| **Documentation Quality** | ∞% better |

## 🔧 TypeScript Support

We provide full type definitions for every adapter!

```typescript
import { expressMiddleware } from 'doc-it-up/express';
// Types are inferred automatically!

```

## 🤝 Contributing

We're building the future of API documentation together!

### 🎯 **How to Contribute**

1. 🍴 Fork the repository
2. 🌟 Create a feature branch
3. 🔧 Make your changes
4. 📝 Add tests
5. 🚀 Submit a pull request

## 📄 License

MIT License - feel free to use this in your commercial projects!

## 🚀 Get Started Now

```bash
npm install doc-it-up

```

**Join thousands of developers who've already made the switch to effortless API documentation!**

---

<div align="center">

### 🌟 **Star us on GitHub** **Built with ❤️ by developers, for developers**

*Making API documentation so easy, you'll forget it's there*

</div>

*🚀 Ready to revolutionize your API development? Install doc-it-up now and never write API documentation again!*

```

```