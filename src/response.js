import fs from 'fs';
import path from 'path';
import mime from 'mime-types';
import { STATUS_NOT_FOUND, MESSAGE_NOT_FOUND, NO_TEMPLATING, ASYNC_RENDER } from './constants.js';
import { AbortException } from './errors.js';

/**
 * Response class for handling HTTP responses
 * Equivalent to Python heaven.response.Response
 */
export class Response {
  constructor(app, context, request, res = null) {
    this._app = app;
    this._ctx = context;
    this._req = request;
    this._res = res;
    this._abort = false;
    this._body = MESSAGE_NOT_FOUND;
    this._deferred = [];
    this._metadata = {};
    this._headers = {};
    this._status = STATUS_NOT_FOUND;
    this._template = null;
    this._mountedFromApplication = null;
    this._sent = false;
  }

  /**
   * Abort the response with a payload
   */
  abort(payload) {
    this._abort = true;
    if (typeof payload === 'string') {
      this._body = payload;
    } else if (typeof payload === 'number') {
      this._body = payload.toString();
    } else if (typeof payload === 'object') {
      this._body = JSON.stringify(payload);
    } else {
      this._body = String(payload);
    }
    throw new AbortException('Response aborted');
  }

  /**
   * Get response body
   */
  get body() {
    return this._body;
  }

  /**
   * Set response body
   */
  set body(value) {
    if (typeof value === 'object' && value !== null) {
      this._body = JSON.stringify(value);
      this.setHeader('content-type', 'application/json');
    } else {
      this._body = String(value);
    }

    if (this._status === 404) {
      this._status = 200;
    }
  }

  /**
   * Get response status
   */
  get status() {
    return this._status;
  }

  /**
   * Set response status
   */
  set status(value) {
    this._status = value;
  }

  /**
   * Get response headers
   */
  get headers() {
    return this._headers;
  }

  /**
   * Set a response header
   */
  setHeader(name, value) {
    this._headers[name.toLowerCase()] = value;
    return this;
  }

  /**
   * Set multiple headers at once
   */
  setHeaders(headers) {
    for (const [name, value] of Object.entries(headers)) {
      this.setHeader(name, value);
    }
    return this;
  }

  /**
   * Get a response header
   */
  getHeader(name) {
    return this._headers[name.toLowerCase()];
  }

  /**
   * Remove a response header
   */
  removeHeader(name) {
    delete this._headers[name.toLowerCase()];
    return this;
  }

  /**
   * Add a deferred function to be executed after response
   */
  defer(func) {
    this._deferred.push(func);
    return this;
  }

  /**
   * Get number of deferred functions
   */
  get deferred() {
    return this._deferred.length;
  }

  /**
   * Execute all deferred functions
   */
  async executeDeferredFunctions() {
    for (const func of this._deferred) {
      try {
        if (typeof func === 'function') {
          await func(this._app);
        }
      } catch (error) {
        console.error('Error executing deferred function:', error);
      }
    }
  }

  /**
   * Render a template (synchronous)
   */
  renders(name, contexts = {}) {
    const templater = this._app._templater;
    this.setHeader('content-type', 'text/html; charset=utf-8');

    if (!templater) {
      throw new Error('You did not enable templating');
    }

    if (templater.isAsync) {
      throw new Error('Trying to use Async HTML Renderer to render HTML Sync');
    }

    const template = templater.getTemplateSync(name);
    this.body = template.render({
      ctx: this._ctx,
      res: this,
      req: this._req,
      context: this._ctx,
      response: this,
      request: this._req,
      ...contexts
    });
    return this;
  }

  /**
   * Render a template (asynchronous)
   */
  async render(name, contexts = {}) {
    const templater = this._app._templater;
    this.setHeader('content-type', 'text/html; charset=utf-8');

    if (!templater) {
      throw new Error('You did not enable templating');
    }

    if (!templater.isAsync) {
      throw new Error('Trying to use Sync HTML Renderer to render HTML Async');
    }

    const template = await templater.getTemplate(name);
    this.body = await template.renderAsync({
      ctx: this._ctx,
      res: this,
      req: this._req,
      context: this._ctx,
      response: this,
      request: this._req,
      ...contexts
    });
    return this;
  }

  /**
   * Redirect to a location
   */
  redirect(location, permanent = false) {
    this.status = permanent ? 308 : 307; // Permanent vs Temporary redirect
    this.setHeader('location', location);
    return this;
  }

  /**
   * Send JSON response
   */
  json(data, status = 200) {
    this.status = status;
    this.setHeader('content-type', 'application/json');
    this.body = JSON.stringify(data);
    return this;
  }

  /**
   * Send text response
   */
  text(data, status = 200) {
    this.status = status;
    this.setHeader('content-type', 'text/plain');
    this.body = String(data);
    return this;
  }

  /**
   * Send HTML response
   */
  html(data, status = 200) {
    this.status = status;
    this.setHeader('content-type', 'text/html; charset=utf-8');
    this.body = String(data);
    return this;
  }

  /**
   * Send response with custom status and body
   */
  out(status, body, headers = null) {
    this.status = status;
    this.body = body;
    if (headers) {
      this.setHeaders(headers);
    }
    return this;
  }

  /**
   * Set cookie
   */
  setCookie(name, value, options = {}) {
    const cookieOptions = [];

    if (options.maxAge) {
      cookieOptions.push(`Max-Age=${options.maxAge}`);
    }
    if (options.expires) {
      cookieOptions.push(`Expires=${options.expires.toUTCString()}`);
    }
    if (options.path) {
      cookieOptions.push(`Path=${options.path}`);
    }
    if (options.domain) {
      cookieOptions.push(`Domain=${options.domain}`);
    }
    if (options.secure) {
      cookieOptions.push('Secure');
    }
    if (options.httpOnly) {
      cookieOptions.push('HttpOnly');
    }
    if (options.sameSite) {
      cookieOptions.push(`SameSite=${options.sameSite}`);
    }

    const cookieValue = `${name}=${value}${cookieOptions.length ? `; ${cookieOptions.join('; ')}` : ''}`;

    const existing = this.getHeader('set-cookie');
    if (existing) {
      if (Array.isArray(existing)) {
        existing.push(cookieValue);
      } else {
        this.setHeader('set-cookie', [existing, cookieValue]);
      }
    } else {
      this.setHeader('set-cookie', cookieValue);
    }
    return this;
  }

  /**
   * Send the response to the client
   */
  send() {
    if (this._sent || !this._res) {
      return;
    }

    this._res.statusCode = this._status;

    // Set headers
    for (const [name, value] of Object.entries(this._headers)) {
      this._res.setHeader(name, value);
    }

    this._res.end(this._body);
    this._sent = true;

    // Execute deferred functions
    setImmediate(() => {
      this.executeDeferredFunctions();
    });
  }

  /**
   * Send a file as response
   * @param {string} filePath - Path to the file
   * @param {object} options - Options { root, headers, maxAge, lastModified, etag }
   */
  async sendFile(filePath, options = {}) {
    try {
      // Resolve path
      let fullPath = filePath;
      if (options.root) {
        fullPath = path.resolve(options.root, filePath);
        // Security check for root traversal
        if (!fullPath.startsWith(path.resolve(options.root))) {
          this.status = 403;
          this.body = 'Forbidden';
          return this;
        }
      } else {
        fullPath = path.resolve(filePath);
      }

      // Check existence and stats
      const stats = await fs.promises.stat(fullPath);

      if (!stats.isFile()) {
        this.body = 'Not Found';
        this.status = 404;
        return this;
      }

      // Handle caching
      const lastModified = options.lastModified !== false;
      const etag = options.etag !== false;
      const maxAge = options.maxAge || 0;

      // Generate ETag
      const fileEtag = etag ? `"${stats.size}-${stats.mtime.getTime()}"` : null;

      // Check conditional headers
      if (lastModified && this._req.headers['if-modified-since']) {
        const ifModifiedSince = new Date(this._req.headers['if-modified-since']);
        if (stats.mtime <= ifModifiedSince) {
          this.status = 304;
          this.send();
          return this;
        }
      }

      if (fileEtag && this._req.headers['if-none-match'] === fileEtag) {
        this.status = 304;
        this.send();
        return this;
      }

      // Set headers
      if (options.headers) {
        this.setHeaders(options.headers);
      }

      const contentType = mime.lookup(fullPath) || 'application/octet-stream';
      this.setHeader('content-type', contentType);
      this.setHeader('content-length', stats.size);

      if (lastModified) {
        this.setHeader('last-modified', stats.mtime.toUTCString());
      }

      if (fileEtag) {
        this.setHeader('etag', fileEtag);
      }

      if (maxAge > 0) {
        this.setHeader('cache-control', `public, max-age=${maxAge}`);
      }

      this.status = 200;

      // We need to signal that we are handling the response manually via stream
      // Since `this.send()` ends the response with `this._body`, we should avoid calling it
      // or set `this._sent = true` and pipe the stream.

      if (this._res) {
        this._res.statusCode = this._status;
        for (const [name, value] of Object.entries(this._headers)) {
          this._res.setHeader(name, value);
        }

        const stream = fs.createReadStream(fullPath);
        stream.pipe(this._res);
        this._sent = true;

        // Handle deferred functions
        stream.on('end', () => {
          setImmediate(() => {
            this.executeDeferredFunctions();
          });
        });

        // Error handling for stream
        stream.on('error', (err) => {
          console.error('Stream error:', err);
          if (!this._res.headersSent) {
            this._res.statusCode = 500;
            this._res.end('Internal Server Error');
          }
        });
      }

      return this;

    } catch (error) {
      if (error.code === 'ENOENT') {
        this.status = 404;
        this.body = 'Not Found';
      } else {
        console.error('sendFile error:', error);
        this.status = 500;
        this.body = 'Internal Server Error';
      }
      return this;
    }
  }

  /**
   * Alias for sendFile
   */
  file(filePath, options = {}) {
    return this.sendFile(filePath, options);
  }
}
