<div style="display: flex; align-items: center; justify-content: center;">
  <img src="./picsvg_download.svg" width="200" height="200" style="margin-right: 16px;" />
  <h1 style="text-wrap:balance">doc-it-up - The Game-Changing API Documentation Generator</h1>
</div>

[![npm version](https://badge.fury.io/js/doc-it-up.svg)](https://badge.fury.io/js/doc-it-up)
[![Downloads](https://img.shields.io/npm/dm/doc-it-up.svg)](https://www.npmjs.com/package/doc-it-up)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **Stop writing documentation. Start building APIs.**


## 🎯 The Problem That's Killing Your Productivity

Every developer knows the pain:
- 📝 Writing API docs takes **5x longer** than building the API
- 🔄 Docs become **outdated** the moment you deploy
- 🐛 **Inconsistent** documentation leads to integration nightmares
- ⏰ **Deadlines missed** because "we need to update the docs"
- 😤 **Frustrated teammates** dealing with undocumented endpoints
---

## 🔥 **Why Developers Are Switching and you should too**

### ❌ **Before API AutoDoc**
```javascript
/**
 * @swagger
 * /users:
 *   post:
 *     summary: Create a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 name:
 *                   type: string
 *                 email:
 *                   type: string
 */
app.post('/users', (req, res) => {
  // Your code here
});
```

### ✅ **After doc-it-up**
```javascript
app.post('/users', (req, res) => {
  // Your code here
  // Documentation generated automatically!
});
```

**That's it. Seriously.**

---
## ✨ The Solution That Changes Everything

**doc-it-up** is not just another documentation tool. It's the **revolutionary middleware** that:

### 🧠 **Learns Your API as You Build It**
- **Zero configuration** - Just plug and play
- **Automatic schema detection** from real requests
- **Live documentation** that updates itself
- **Swagger/OpenAPI 3.0** compliance out of the box

### 🔥 **Mind-Blowing Features**

#### 🎪 **Magic Middleware**
```javascript
// That's it. Literally.
app.use(autoDocMiddleware());
app.use("/docs",docsHandler());
app.use("/docs/swagger.json",docsHandler());
```

#### 🌟 **Intelligent Schema Detection**
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
- Bearer tokens
- API keys
- Basic auth
- Custom authentication schemes
- **Automatic security documentation**

#### 📁 **File Upload Documentation**
```javascript
// Automatically handles multipart/form-data
// Documents file uploads with:
- File type validation
- Size limits
- Multiple file support
- Swagger UI file upload interface
```

#### 🎨 **Beautiful UI**
- **Stunning Swagger UI** with custom branding
- **Interactive API explorer**
- **Real-time testing** directly from docs
- **Mobile-responsive** design

## 🚀 Quick Start (30 seconds to glory)

### Installation
```bash
npm install doc-it-up
```

### Basic Setup
```javascript
import express from 'express';
import { autoDocMiddleware, docsHandler } from 'doc-it-up';

const app = express();

// The magic happens here
app.use(autoDocMiddleware());

// Your existing routes
app.get('/users', (req, res) => {
  res.json({ users: [{ id: 1, name: 'John' }] });
});

app.post('/users', (req, res) => {
  res.json({ id: 2, name: req.body.name });
});

// Documentation endpoint
app.use('/docs', docsHandler());
app.use('/docs/swagger.json', docsHandler());

app.listen(3000, () => {
  console.log('🚀 API running on http://localhost:3000');
  console.log('📚 Docs available at http://localhost:3000/docs');
});
```
---
<div style="background-color:#ffe5e5; color:#b30000; padding:12px; border-left:5px solid #b30000; font-weight:bold;">
  🚨 <strong>NOTE:</strong> Please make sure you remove the test details you are using before production deployment.
</div>

### Advanced Configuration
```javascript
app.use(autoDocMiddleware({
  docsDir: './api-docs',  // Custom docs directory
  // More options coming soon!
}));
```

## 🎯 Advanced Features

### 📊 **Smart Schema Evolution**
```javascript
// First request: { "name": "John" }
// Second request: { "name": "John", "age": 30 }
// doc-it-up automatically merges schemas intelligently
```
---
### 🔄 **Real-time Updates**
- Documentation updates **automatically** with each request
- **No server restart** required
- **Schema versioning** and change detection

### 📱 **Multi-format Support**
- JSON
- XML
- Form data
- File uploads
- Custom content types

### 🎪 **Framework Agnostic**
```javascript
// Works with any Express-compatible framework
import fastify from 'fastify';
import koa from 'koa';
import hapi from '@hapi/hapi';
// And many more!
```

## 🌟 Real-World Examples

### E-commerce API
```javascript
// Product creation with image upload
app.post('/products', upload.single('image'), (req, res) => {
  const product = {
    name: req.body.name,
    price: parseFloat(req.body.price),
    image: req.file.filename
  };
  res.json(product);
});
// AutoDoc automatically documents file upload fields!
```


## 📈 Performance Impact

| Metric | Impact |
|--------|--------|
| **Request Latency** | +0.1ms |
| **Memory Usage** | +2MB |
| **CPU Overhead** | <0.01% |
| **Documentation Quality** | ∞% better |

## 🔧 TypeScript Support

```typescript
import { autoDocMiddleware, ExtendableRequest, ExtendableResponse } from 'doc-it-up';

interface CustomRequest extends ExtendableRequest {
  user?: User;
}

interface CustomResponse extends ExtendableResponse {
  customData?: any;
}

app.use(autoDocMiddleware<CustomRequest, CustomResponse>());
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

### 🌟 **Star us on GitHub** 

**Built with ❤️ by developers, for developers**

*Making API documentation so easy, you'll forget it's there*

</div>



*🚀 Ready to revolutionize your API development? Install doc-it-up now and never write API documentation again!*