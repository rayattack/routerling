import { Form, parseUrlEncoded } from './form.js';
import { parseQueryString } from './utils.js';
import { parse as parseCookies } from 'cookie';

/**
 * Request class for handling HTTP requests
 * Equivalent to Python heaven.request.Request
 */
export class Request {
  constructor(req, metadata = null, application = null) {
    this._application = application;
    this._req = req;
    this._body = null;
    this._cookies = null;
    this._form = null;
    this._route = null;
    this._subdomain = metadata ? metadata[0] : null;
    this._headers = metadata ? metadata[1] : req.headers;
    this._params = {};
    this._queries = null;
    this._dirty = false;
    this._queried = false;
    this._mountedFromApplication = null;
    this._bodyParsed = false;
  }

  /**
   * Get the application instance
   */
  get app() {
    return this._application;
  }

  /**
   * Get the request body
   */
  get body() {
    return this._body;
  }

  /**
   * Set the request body
   */
  set body(value) {
    this._body = value;
    this._bodyParsed = true;
  }

  /**
   * Parse the request body
   */
  async parseBody() {
    if (this._bodyParsed) {
      return this._body;
    }

    // For multipart forms, we don't want to consume the stream
    // because formidable needs it
    if (this.contentType.startsWith('multipart/form-data')) {
      return null;
    }

    return new Promise((resolve, reject) => {
      let body = '';
      this._req.on('data', chunk => {
        body += chunk.toString();
      });
      this._req.on('end', () => {
        this._body = body;
        this._bodyParsed = true;
        resolve(body);
      });
      this._req.on('error', reject);
    });
  }

  /**
   * Get parsed cookies
   */
  get cookies() {
    if (!this._cookies) {
      const cookieHeader = this._headers.cookie || this._headers.Cookie;
      this._cookies = cookieHeader ? parseCookies(cookieHeader) : {};
    }
    return this._cookies;
  }

  /**
   * Get form data (lazy loaded)
   */
  get form() {
    if (!this._form) {
      this._form = Form.createProxy(this._req);
    }
    return this._form;
  }

  /**
   * Get request headers with get() method
   */
  get headers() {
    if (!this._headersProxy) {
      this._headersProxy = new Proxy(this._headers, {
        get(target, prop) {
          // Support headers.get('Content-Type')
          if (prop === 'get') {
            return (name) => {
              const lowerName = name.toLowerCase();
              return target[lowerName] || target[name] || null;
            };
          }
          // Support headers.content_type or headers['content-type']
          const lowerProp = String(prop).toLowerCase().replace(/_/g, '-');
          return target[lowerProp] || target[prop];
        }
      });
    }
    return this._headersProxy;
  }

  /**
   * Get client IP address
   */
  get ip() {
    return this._req.connection?.remoteAddress ||
      this._req.socket?.remoteAddress ||
      this._headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      this._headers['x-real-ip'] ||
      '127.0.0.1';
  }

  /**
   * Get request method
   */
  get method() {
    return this._req.method;
  }

  /**
   * Get mounted application
   */
  get mounted() {
    return this._mountedFromApplication;
  }

  /**
   * Set mounted application
   */
  set mounted(value) {
    this._mountedFromApplication = value;
  }

  /**
   * Get route parameters
   */
  get params() {
    if (!this._dirty) {
      this._params = { ...this._params };
      this._dirty = true;
    }
    return this._params;
  }

  /**
   * Set a route parameter
   */
  setParam(key, value) {
    this._params[key] = value;
  }

  /**
   * Get query parameters
   */
  get queries() {
    if (!this._queried) {
      const url = new URL(this._req.url, `http://${this._req.headers.host}`);
      this._queries = parseQueryString(url.search.slice(1));
      this._queried = true;
    }
    return this._queries;
  }

  /**
   * Set a query parameter
   */
  setQuery(key, value) {
    if (!this._queries) {
      this._queries = {};
    }
    this._queries[key] = value;
  }

  /**
   * Get query string
   */
  get querystring() {
    const url = new URL(this._req.url, `http://${this._req.headers.host}`);
    return url.search.slice(1);
  }

  /**
   * Get request scheme
   */
  get scheme() {
    return this._req.connection?.encrypted ? 'https' : 'http';
  }

  /**
   * Get subdomain
   */
  get subdomain() {
    return this._subdomain;
  }

  /**
   * Get request URL path
   */
  get url() {
    const url = new URL(this._req.url, `http://${this._req.headers.host}`);
    return url.pathname;
  }

  /**
   * Get full URL
   */
  get fullUrl() {
    return `${this.scheme}://${this._req.headers.host}${this._req.url}`;
  }

  /**
   * Get server information
   */
  get server() {
    const address = this._req.socket?.address();
    return address ? `${address.address}:${address.port}` : 'unknown';
  }

  /**
   * Get user agent
   */
  get userAgent() {
    return this._headers['user-agent'] || '';
  }

  /**
   * Check if request is AJAX
   */
  get isAjax() {
    return this._headers['x-requested-with'] === 'XMLHttpRequest';
  }

  /**
   * Check if request is secure (HTTPS)
   */
  get isSecure() {
    return this.scheme === 'https';
  }

  /**
   * Get content type
   */
  get contentType() {
    return this._headers['content-type'] || '';
  }

  /**
   * Get content length
   */
  get contentLength() {
    const length = this._headers['content-length'];
    return length ? parseInt(length, 10) : 0;
  }

  /**
   * Check if content type matches
   */
  is(type) {
    return this.contentType.includes(type);
  }

  /**
   * Get accept header
   */
  get accept() {
    return this._headers.accept || '';
  }

  /**
   * Check if client accepts content type
   */
  accepts(type) {
    return this.accept.includes(type);
  }
}
