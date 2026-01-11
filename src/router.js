import http from 'http';
import { WebSocketServer } from 'ws';
import { Routes } from './routes.js';
import { Request } from './request.js';
import { Response } from './response.js';
import { Context } from './context.js';
import { RouteGroup } from './group.js';
import { Templater } from './templater.js';
import { StaticFileHandler } from './static.js';
import { Lookup, preprocessor, stringToFunctionHandler } from './utils.js';
import { UrlError, SubdomainError } from './errors.js';
import {
  DEFAULT,
  WILDCARD,
  METHODS,
  STARTUP,
  SHUTDOWN,
  INITIALIZATION_MESSAGE
} from './constants.js';

/**
 * Get configuration from configurator function or object
 */
function getConfiguration(configurator = null) {
  if (typeof configurator === 'function') {
    return configurator();
  }
  return configurator || {};
}

/**
 * Main Router class - equivalent to Python heaven.router.Router
 */
export class Router {
  constructor(configurator = null) {
    this._ws = null;
    this.finalized = false;
    this.initializers = [];
    this.deinitializers = [];
    this.subdomains = new Map();
    this.subdomains.set(DEFAULT, new Routes());
    this._buckets = {};
    this._configuration = getConfiguration(configurator);
    this._templater = null;
    this._loader = null;
    this._daemons = [];
    this._server = null;
    this._loader = null;
    this._daemons = [];
    this._server = null;
    this._errorHandler = null;
    this._staticHandler = null;
  }

  /**
   * Get the lookup proxy for global state
   */
  get _() {
    return Lookup.createProxy(this._buckets);
  }

  /**
   * Main request handler - equivalent to Python's __call__
   */
  async handle(req, res) {
    try {
      // Parse request metadata
      const metadata = preprocessor(req);
      const subdomain = metadata[0];

      // Get the appropriate routing engine
      const wildcardEngine = this.subdomains.get(WILDCARD);
      let engine = this.subdomains.get(subdomain);
      if (!engine) {
        engine = wildcardEngine || this.subdomains.get(DEFAULT);
      }

      // Create request, response, and context objects
      const request = new Request(req, metadata, this);
      const context = Context.createProxy(this);
      const response = new Response(this, context, request, res);

      // Parse request body
      await request.parseBody();

      // Handle the request
      await engine.handle(request, response, metadata, this, context);

      // Send the response
      response.send();
    } catch (error) {
      // Use custom error handler if set
      if (this._errorHandler) {
        try {
          const request = new Request(req, preprocessor(req), this);
          const context = Context.createProxy(this);
          const response = new Response(this, context, request, res);
          await this._errorHandler(error, request, response, context);
          response.send();
        } catch (handlerError) {
          console.error('Error in error handler:', handlerError);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.end('Internal Server Error');
          }
        }
      } else {
        console.error('Request handling error:', error);
        if (!res.headersSent) {
          res.statusCode = error.statusCode || 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            error: {
              message: error.message || 'Internal Server Error',
              statusCode: error.statusCode || 500
            }
          }));
        }
      }
    }
  }

  /**
   * Create HTTP server and start listening
   */
  listen(port = 3000, hostname = 'localhost', callback = null) {
    this._server = http.createServer((req, res) => {
      this.handle(req, res);
    });

    // Handle WebSocket upgrades
    this._server.on('upgrade', (request, socket, head) => {
      const metadata = preprocessor(request);
      const subdomain = metadata[0];
      const pathname = new URL(request.url, `http://${request.headers.host}`).pathname;

      // Find WS handler
      let handler = null;
      if (this._wsRoutes && this._wsRoutes.has(subdomain)) {
        handler = this._wsRoutes.get(subdomain).get(pathname);
      }

      // Fallback to wildcard/default if needed (simplified)
      if (!handler && this._wsRoutes && this._wsRoutes.has(WILDCARD)) {
        handler = this._wsRoutes.get(WILDCARD).get(pathname);
      }
      if (!handler && this._wsRoutes && this._wsRoutes.has(DEFAULT)) {
        handler = this._wsRoutes.get(DEFAULT).get(pathname);
      }

      if (handler) {
        // Initialize WSS for this connection if not exists
        // Note: For full efficiency we might want one global WSS, but per-route handling is requested via WS()
        // Ideally we use one WSS and handleUpgrade manually
        if (!this._wss) {
          this._wss = new WebSocketServer({ noServer: true });
        }

        this._wss.handleUpgrade(request, socket, head, (ws) => {
          this._wss.emit('connection', ws, request);
          handler(ws, request, this);
        });
      } else {
        socket.destroy();
      }
    });

    this._server.listen(port, hostname, async () => {
      await this._register(); // Run startup hooks
      await this.runDaemons(); // Run daemons

      if (callback) {
        callback();
      }
      console.log(`Server running at http://${hostname}:${port}/`);
    });

    // Handle graceful shutdown
    // Handle graceful shutdown
    const shutdown = async (signal) => {
      await this._unregister();
      this._server.close(() => {
        if (signal === 'SIGUSR2') {
          process.kill(process.pid, 'SIGUSR2');
        } else {
          process.exit(0);
        }
      });
    };

    process.once('SIGTERM', () => shutdown('SIGTERM'));
    process.once('SIGINT', () => shutdown('SIGINT'));
    process.once('SIGHUP', () => shutdown('SIGHUP'));
    process.once('SIGUSR2', () => shutdown('SIGUSR2'));

    return this._server;
  }

  /**
   * Stop the server
   */
  async close() {
    if (this._server) {
      await this._unregister();
      return new Promise((resolve) => {
        this._server.close(resolve);
      });
    }
  }

  /**
   * Add a route handler
   */
  abettor(method, route, handler, subdomain = DEFAULT, router = null) {
    if (!route.startsWith('/')) {
      throw new UrlError(`${route} is not a valid route - must start with /`);
    }

    handler = stringToFunctionHandler(handler);
    const engine = this.subdomains.get(subdomain);

    if (!engine) {
      throw new SubdomainError(`Subdomain ${subdomain} not registered`);
    }

    engine.add(method, route, handler, router || this);
  }

  /**
   * Call a handler function
   */
  call(handler, ...args) {
    if (typeof handler === 'string') {
      handler = stringToFunctionHandler(handler);
    }
    handler(this, ...args);
    return this;
  }

  /**
   * Get daemons list
   */
  get daemons() {
    return this._daemons;
  }

  /**
   * Run daemon processes
   */
  async runDaemons() {
    for (const daemon of this._daemons) {
      try {
        if (typeof daemon === 'function') {
          daemon(this);
        }
      } catch (error) {
        console.error('Daemon error:', error);
      }
    }
  }

  /**
   * Register startup hooks
   */
  async _register() {
    if (this.finalized) {
      return;
    }

    console.log(INITIALIZATION_MESSAGE);

    for (const initializer of this.initializers) {
      try {
        await initializer(this);
      } catch (error) {
        console.error('Initializer error:', error);
      }
    }

    this.finalized = true;
  }

  /**
   * Register shutdown hooks
   */
  async _unregister() {
    for (const deinitializer of this.deinitializers) {
      try {
        await deinitializer(this);
      } catch (error) {
        console.error('Deinitializer error:', error);
      }
    }
  }

  /**
   * Get configuration value
   */
  CONFIG(key) {
    if (!(key in this._configuration)) {
      throw new Error(`Configuration key '${key}' not found`);
    }
    return this._configuration[key];
  }

  /**
   * Store a value in the global state
   */
  keep(key, value) {
    this._buckets[key] = value;
    return this;
  }

  /**
   * Retrieve a value from the global state
   */
  peek(key) {
    return this._buckets[key] || null;
  }

  /**
   * Remove and return a value from the global state
   */
  unkeep(key) {
    if (!(key in this._buckets)) {
      throw new Error(`Key '${key}' not found in global state`);
    }
    const value = this._buckets[key];
    delete this._buckets[key];
    return value;
  }

  /**
   * Register a subdomain
   */
  subdomain(name) {
    if (!this.subdomains.has(name)) {
      this.subdomains.set(name, new Routes());
    }
    return this;
  }

  /**
   * Mount another router
   */
  mount(router, isolated = true, prefix = '') {
    if (!isolated) {
      // Merge configurations and state
      this._configuration = { ...this._configuration, ...router._configuration };
      this._buckets = { ...this._buckets, ...router._buckets };
    }

    // Mount routes from the other router
    for (const [subdomain, sourceRoutes] of router.subdomains) {
      if (!this.subdomains.has(subdomain)) {
        this.subdomains.set(subdomain, new Routes());
      }

      const targetRoutes = this.subdomains.get(subdomain);

      // Merge route trees
      // We iterate through all methods and manually register the handler to the new router
      // This ensures that the route structures are properly merged rather than overwritten
      for (const method of METHODS) {
        if (sourceRoutes.cache.has(method)) {
          for (const [route, { handler }] of sourceRoutes.cache.get(method).entries()) {
            const finalRoute = prefix ? (prefix + route).replace('//', '/') : route;
            targetRoutes.add(method, finalRoute, handler, this);
          }
        }
      }

      // Merge Befores (Middleware)
      for (const [route, handlers] of sourceRoutes.befores.entries()) {
        const finalRoute = prefix ? (prefix + route).replace('//', '/') : route;

        // We can't just set array, we must append
        if (!targetRoutes.befores.has(finalRoute)) {
          targetRoutes.befores.set(finalRoute, []);
        }
        targetRoutes.befores.get(finalRoute).push(...handlers);
      }

      // Merge Afters
      for (const [route, handlers] of sourceRoutes.afters.entries()) {
        const finalRoute = prefix ? (prefix + route).replace('//', '/') : route;

        if (!targetRoutes.afters.has(finalRoute)) {
          targetRoutes.afters.set(finalRoute, []);
        }
        targetRoutes.afters.get(finalRoute).push(...handlers);
      }
    }

    // Merge Initializers (startup hooks)
    if (router.initializers && router.initializers.length > 0) {
      this.initializers.push(...router.initializers);
    }

    // Merge Deinitializers (shutdown hooks)
    if (router.deinitializers && router.deinitializers.length > 0) {
      this.deinitializers.push(...router.deinitializers);
    }

    return this;
  }

  /**
   * Add middleware
   * This is syntactic sugar for BEFORE(path, handler)
   * We enforce explicit paths (e.g. '/*' for global) favoring "Explicit is better than implicit"
   */
  use(path, handler) {
    if (typeof path !== 'string') {
      throw new Error('Router.use() requires a path string as the first argument (e.g. "/*")');
    }

    if (typeof handler !== 'function') {
      throw new Error('Router.use() requires a handler function as the second argument');
    }

    // Ensure path handles wildcards correctly matching BEFORE logic
    if (!path.includes('*')) {
      path = path.endsWith('/') ? `${path}*` : `${path}/*`;
    }

    return this.BEFORE(path, handler);
  }

  /**
   * Add startup hook
   */
  ONCE(event, handler) {
    if (typeof event === 'function') {
      // If only one argument and it's a function, treat as startup
      this.initializers.push(event);
    } else {
      const normalizedEvent = String(event).toLowerCase();

      if (normalizedEvent === STARTUP) {
        if (typeof handler !== 'function') {
          throw new TypeError('Handler must be a function');
        }
        this.initializers.push(handler);
      } else if (normalizedEvent === SHUTDOWN) {
        if (typeof handler !== 'function') {
          throw new TypeError('Handler must be a function');
        }
        this.deinitializers.push(handler);
      } else {
        throw new Error('Event must be STARTUP or SHUTDOWN');
      }
    }
    return this;
  }

  /**
   * Add before middleware
   */
  BEFORE(route, handler, subdomain = DEFAULT) {
    const engine = this.subdomains.get(subdomain);
    if (!engine) {
      throw new SubdomainError(`Subdomain ${subdomain} not registered`);
    }
    engine.addBefore(route, stringToFunctionHandler(handler));
    return this;
  }

  /**
   * Add after middleware
   */
  AFTER(route, handler, subdomain = DEFAULT) {
    const engine = this.subdomains.get(subdomain);
    if (!engine) {
      throw new SubdomainError(`Subdomain ${subdomain} not registered`);
    }
    engine.addAfter(route, stringToFunctionHandler(handler));
    return this;
  }

  // HTTP Method handlers
  GET(route, handler, subdomain = DEFAULT) {
    this.abettor('GET', route, handler, subdomain);
    return this;
  }

  POST(route, handler, subdomain = DEFAULT) {
    this.abettor('POST', route, handler, subdomain);
    return this;
  }

  PUT(route, handler, subdomain = DEFAULT) {
    this.abettor('PUT', route, handler, subdomain);
    return this;
  }

  PATCH(route, handler, subdomain = DEFAULT) {
    this.abettor('PATCH', route, handler, subdomain);
    return this;
  }

  DELETE(route, handler, subdomain = DEFAULT) {
    this.abettor('DELETE', route, handler, subdomain);
    return this;
  }

  HEAD(route, handler, subdomain = DEFAULT) {
    this.abettor('HEAD', route, handler, subdomain);
    return this;
  }

  OPTIONS(route, handler, subdomain = DEFAULT) {
    this.abettor('OPTIONS', route, handler, subdomain);
    return this;
  }

  TRACE(route, handler, subdomain = DEFAULT) {
    this.abettor('TRACE', route, handler, subdomain);
    return this;
  }

  CONNECT(route, handler, subdomain = DEFAULT) {
    this.abettor('CONNECT', route, handler, subdomain);
    return this;
  }

  /**
   * Add route for all HTTP methods
   */
  HTTP(route, handler, subdomain = DEFAULT) {
    for (const method of METHODS) {
      this.abettor(method, route, handler, subdomain);
    }
    return this;
  }

  /**
   * WebSocket handler
   */
  WS(route, handler, subdomain = DEFAULT) {
    if (!this._wsRoutes) {
      this._wsRoutes = new Map();
    }

    // Store WS handlers separately
    // Structure: Map<subdomain, Map<route, handler>>
    if (!this._wsRoutes.has(subdomain)) {
      this._wsRoutes.set(subdomain, new Map());
    }

    this._wsRoutes.get(subdomain).set(route, handler);
    return this;
  }

  /**
   * Enable template rendering
   */
  async TEMPLATES(templatePath, options = {}) {
    const { Templater } = await import('./templater.js');
    this._templater = new Templater(templatePath, options);
    return this;
  }

  /**
   * Enable static file serving
   */
  async ASSETS(assetsPath) {
    const { StaticFileHandler } = await import('./static.js');
    this._staticHandler = new StaticFileHandler(assetsPath);

    // Add a catch-all route for static files
    this.GET('/*', async (req, res) => {
      const served = await this._staticHandler.serve(req, res);
      if (!served) {
        res.status = 404;
        res.body = 'Not Found';
      }
    });

    return this;
  }

  /**
   * Add daemon process
   */
  DAEMON(func) {
    this._daemons.push(func);
    return this;
  }

  /**
   * Set global error handler
   */
  ERROR(handler) {
    this._errorHandler = handler;
    return this;
  }

  /**
   * Create a route group
   */
  group(prefix) {
    return new RouteGroup(this, prefix);
  }

  /**
   * Configure templating engine
   */
  TEMPLATES(folderPath, options = {}) {
    this._templater = new Templater(folderPath, options);
    return this;
  }

  /**
   * Configure static asset serving
   */
  ASSETS(folderPath, options = {}) {
    this._staticHandler = new StaticFileHandler(folderPath, options);

    // Register route for static assets
    let route = '/*';
    if (options.prefix) {
      // Ensure prefix starts with / and doesn't end with /
      const prefix = options.prefix.startsWith('/') ? options.prefix : '/' + options.prefix;
      const cleanPrefix = prefix.endsWith('/') ? prefix.slice(0, -1) : prefix;
      route = `${cleanPrefix}/*`;
    }

    this.GET(route, async (req, res, ctx) => {
      const served = await this._staticHandler.serve(req, res);
      if (!served) {
        // Must perform 404 if not found
        res.status = 404;
        res.body = 'Not Found';
      }
    });

    return this;
  }
}

// Aliases for the Router class
export class Application extends Router { }
export class App extends Router { }
export class Server extends Router { }
