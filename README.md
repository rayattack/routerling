# Routerling

[![Documentation](https://img.shields.io/badge/Documentation-View_Site-green)](https://rayattack.github.io/routerling/)

A simple, fast, and powerful web framework for Node.js with built-in WebSocket support, lifecycle hooks, and daemon processes.

**[📚 Read the Documentation](https://rayattack.github.io/routerling/)**

## Features

- 🚀 **Fast HTTP Routing** - Efficient route matching and handling
- 🔌 **WebSocket Support** - Built-in WebSocket server with route-based handlers
- 🎯 **Lifecycle Hooks** - STARTUP and SHUTDOWN hooks for initialization and cleanup
- ⚙️ **Daemon Processes** - Register background tasks that run on server startup
- 📦 **Context Object** - Store and share values across request handlers and middleware
- 🌐 **Subdomain Routing** - Route requests based on subdomains
- 📦 **Router Mounting** - Compose applications from multiple routers
- 🎨 **Template Rendering** - Built-in Nunjucks template support
- 📁 **Static Files** - Serve static assets with automatic MIME type detection
- 🍪 **Cookie Parsing** - Built-in cookie support
- 📤 **File Uploads** - Handle multipart form data and file uploads

## Installation

```bash
npm install routerling
```

## Quick Start

```javascript
import { Router, STARTUP, SHUTDOWN } from 'routerling';

const app = new Router();

// Startup hook - runs when server starts
app.ONCE(STARTUP, async () => {
  console.log('Server initializing...');
  // Connect to database, load config, etc.
});

// Shutdown hook - runs when server stops
app.ONCE(SHUTDOWN, async () => {
  console.log('Cleaning up...');
  // Close connections, save state, etc.
});

// HTTP routes - handlers receive (req, res, ctx)
app.GET('/', (req, res, ctx) => {
  res.json({ message: 'Hello from Routerling!' });
});

app.POST('/api/users', (req, res, ctx) => {
  const user = req.body;
  res.status = 201;
  res.json({ id: 1, ...user });
});

// WebSocket endpoint
app.WS('/chat', (ws, request) => {
  ws.on('message', (data) => {
    ws.send(`Echo: ${data}`);
  });
});

// Start server
app.listen(3000, 'localhost', () => {
  console.log('Server running on http://localhost:3000');
});
```

## API Reference

### Router Methods

#### HTTP Methods
- `GET(route, handler, subdomain?)` - Handle GET requests
- `POST(route, handler, subdomain?)` - Handle POST requests
- `PUT(route, handler, subdomain?)` - Handle PUT requests
- `PATCH(route, handler, subdomain?)` - Handle PATCH requests
- `DELETE(route, handler, subdomain?)` - Handle DELETE requests
- `HEAD(route, handler, subdomain?)` - Handle HEAD requests
- `OPTIONS(route, handler, subdomain?)` - Handle OPTIONS requests
- `HTTP(route, handler, subdomain?)` - Handle all HTTP methods

**Route Parameters with Type Coercion:**
- `:id` - String parameter (default)
- `:id:int` - Integer parameter (auto-converted to number)
- `:price:float` - Float parameter (auto-converted to number)
- `:active:bool` - Boolean parameter (auto-converted to boolean)

**Examples:**
```javascript
app.GET('/users/:id:int', (req, res, ctx) => {
  // req.params.id is a number, not a string
  console.log(typeof req.params.id); // 'number'
});

app.GET('/products/:id:int/reviews/:rating:float', (req, res, ctx) => {
  // Both params are auto-converted to numbers
});
```

#### WebSocket
- `WS(route, handler, subdomain?)` - Handle WebSocket connections

#### Lifecycle
- `ONCE(event, handler)` - Register startup/shutdown hooks
  - `STARTUP` - Runs when server starts
  - `SHUTDOWN` - Runs when server stops

#### Daemons
- `DAEMON(handler)` - Register background process

#### Middleware
- `BEFORE(route, handler, subdomain?)` - Add before middleware
- `AFTER(route, handler, subdomain?)` - Add after middleware

**Wildcard Middleware:**
Middleware supports wildcard patterns to match multiple routes:
```javascript
// Matches /api/users, /api/products, etc.
app.BEFORE('/api/*', (req, res, ctx) => {
  ctx.startTime = Date.now();
});

app.AFTER('/api/*', (req, res, ctx) => {
  console.log(`Request took ${Date.now() - ctx.startTime}ms`);
});
```

#### Routing
- `subdomain(name)` - Register a subdomain
- `mount(router, isolated?)` - Mount another router

#### Static Assets & Templates
- `ASSETS(path)` - Serve static files from directory
- `TEMPLATES(path, options?)` - Enable template rendering

#### State Management
- `keep(key, value)` - Store value in global state
- `peek(key)` - Retrieve value from global state
- `unkeep(key)` - Remove and return value from global state

#### Server
- `listen(port, hostname, callback?)` - Start HTTP server
- `close()` - Stop server gracefully

### Request Object

```javascript
app.GET('/user/:id', (req, res, ctx) => {
  req.params.id      // Route parameters
  req.query          // Query string parameters
  req.body           // Parsed request body
  req.headers        // Request headers
  req.cookies        // Parsed cookies
  req.files          // Uploaded files
  req.method         // HTTP method
  req.url            // Request URL
  req.path           // URL path
});
```

### Response Object

```javascript
app.GET('/example', (req, res, ctx) => {
  res.status = 200;                    // Set status code
  res.body = 'Hello';                  // Set response body
  res.json({ key: 'value' });          // Send JSON
  res.html('<h1>Hello</h1>');          // Send HTML
  res.redirect('/other');              // Redirect
  res.cookie('name', 'value', opts);   // Set cookie
  res.header('X-Custom', 'value');     // Set header
});
```

### Context Object

The context object allows you to store and retrieve values across request handlers, middleware, and the request lifecycle.

```javascript
// Store values in context
app.BEFORE('/api/*', (req, res, ctx) => {
  ctx.keep('startTime', Date.now());
  ctx.user = { id: 1, name: 'John' };  // Proxy syntax
});

app.GET('/api/data', (req, res, ctx) => {
  // Retrieve values from context
  const user = ctx.user;                // Proxy syntax
  const startTime = ctx._data.get('startTime');
  
  res.json({ user, processingTime: Date.now() - startTime });
});

// Context methods
ctx.keep(key, value)       // Store a value
ctx.has(key)               // Check if key exists
ctx.delete(key)            // Remove a key
ctx.keys()                 // Get all keys
ctx.values()               // Get all values
ctx.entries()              // Get all entries
ctx.clear()                // Clear all data
ctx.size                   // Number of stored values
```

## Examples

### Daemon Process

```javascript
app.DAEMON(async (router) => {
  // Background task that runs on startup
  setInterval(() => {
    console.log('Health check...');
  }, 60000);
});
```

### Subdomain Routing

```javascript
app.subdomain('api');

const handler = (req, res, ctx) => {
  res.json({ subdomain: 'api' });
};

app.GET('/users', handler, 'api');  // api.example.com/users
app.GET('/users', handler);         // www.example.com/users
```

### Router Mounting

```javascript
const apiRouter = new Router();

const getUsers = (req, res, ctx) => res.json({ users: [] });
const createUser = (req, res, ctx) => res.json({ created: true });

apiRouter.GET('/users', getUsers);
apiRouter.POST('/users', createUser);

app.mount(apiRouter);
```

### Template Rendering

```javascript
await app.TEMPLATES('./views');

app.GET('/page', (req, res, ctx) => {
  res.render('template.html', { data: 'value' });
});
```

### Static Files

```javascript
await app.ASSETS('./public');
// Serves files from ./public directory
```

## Testing

```bash
npm test
```

## License

MIT

## Author

Tersoo Ortserga
