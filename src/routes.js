import { UrlDuplicateError } from './errors.js';
import { isParam, coerceType } from './utils.js';
import { METHODS, WILDCARD } from './constants.js';

/**
 * Route node for building the routing tree
 */
class RouteNode {
  constructor() {
    this.handler = null;
    this.route = null;
    this.children = new Map();
    this.parameterized = {};
    this.wildcard = null;
  }

  /**
   * Match a URL path against this node
   */
  match(segments, request) {
    if (segments.length === 0) {
      if (this.handler) {
        return [this.route, this.handler];
      }
      return [null, null];
    }

    const segment = segments.shift();

    // Try exact match first
    const child = this.children.get(segment);
    if (child) {
      const result = child.match([...segments], request);
      if (result[1]) {
        return result;
      }
    }

    // Try parameterized routes
    const paramChild = this.children.get(':');
    if (paramChild) {
      // Set the parameter value for any parameter name in this node
      for (const [route, paramInfo] of Object.entries(paramChild.parameterized)) {
        const paramName = typeof paramInfo === 'string' ? paramInfo : paramInfo.name;
        const typeHint = typeof paramInfo === 'object' ? paramInfo.type : null;

        // Apply type coercion if type hint is present
        const value = coerceType(segment, typeHint);
        request.setParam(paramName, value);
      }
      const result = paramChild.match([...segments], request);
      if (result[1]) {
        return result;
      }
    }

    // Try wildcard match
    if (this.wildcard) {
      return [this.wildcard.route, this.wildcard.handler];
    }

    return [null, null];
  }

  /**
   * Check if a path matches a parameterized route pattern
   */
  matchesParameterizedRoute(pattern, path) {
    const patternParts = pattern.split('/').filter(p => p);
    const pathParts = path.split('/').filter(p => p);

    if (patternParts.length !== pathParts.length) {
      return false;
    }

    for (let i = 0; i < patternParts.length; i++) {
      const patternPart = patternParts[i];
      const pathPart = pathParts[i];

      if (!patternPart.startsWith(':') && patternPart !== pathPart) {
        return false;
      }
    }

    return true;
  }
}

/**
 * Routes class for managing HTTP routes
 * Equivalent to Python heaven.router.Routes
 */
export class Routes {
  constructor() {
    this.routes = new Map();
    this.cache = new Map();
    this.befores = new Map();
    this.afters = new Map();

    // Initialize route trees for each HTTP method
    for (const method of METHODS) {
      this.routes.set(method, new RouteNode());
      this.cache.set(method, new Map());
    }
  }

  /**
   * Add a route to the routing tree
   */
  add(method, route, handler, router) {
    // Check for duplicate routes
    const cacheKey = `${method}:${route}`;
    if (this.cache.get(method).has(route)) {
      throw new UrlDuplicateError(`Route ${method} ${route} already exists`);
    }

    const segments = route.split('/').filter(segment => segment);
    let currentNode = this.routes.get(method);

    // Handle root route
    if (segments.length === 0) {
      currentNode.handler = handler;
      currentNode.route = route;
      this.cache.get(method).set(route, { handler, route });
      return;
    }

    // Build the route tree
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const isLast = i === segments.length - 1;

      if (segment === '*') {
        // Wildcard route
        currentNode.wildcard = { handler, route };
        this.cache.get(method).set(route, { handler, route });
        return;
      }

      const [segmentKey, paramName, typeHint] = isParam(segment);
      const nodeKey = paramName ? ':' : segment;

      if (!currentNode.children.has(nodeKey)) {
        currentNode.children.set(nodeKey, new RouteNode());
      }

      currentNode = currentNode.children.get(nodeKey);

      if (paramName) {
        // Store both param name and type hint
        currentNode.parameterized[route] = { name: paramName, type: typeHint };
      }

      if (isLast) {
        currentNode.handler = handler;
        currentNode.route = route;
        this.cache.get(method).set(route, { handler, route });
      }
    }
  }

  /**
   * Update the handler for an existing route.
   * Useful for the "baking" phase where we wrap original handlers with validation.
   */
  updateHandler(method, route, newHandler) {
    const segments = route.split('/').filter(segment => segment);
    let currentNode = this.routes.get(method);

    if (!currentNode) return false;

    if (segments.length === 0) {
      currentNode.handler = newHandler;
      if (this.cache.get(method).has(route)) {
        this.cache.get(method).get(route).handler = newHandler;
      }
      return true;
    }

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const isLast = i === segments.length - 1;

      if (segment === '*') {
        if (currentNode.wildcard) {
          currentNode.wildcard.handler = newHandler;
          if (this.cache.get(method).has(route)) {
            this.cache.get(method).get(route).handler = newHandler;
          }
          return true;
        }
        return false;
      }

      const nodeKey = segment.startsWith(':') ? ':' : segment;
      if (!currentNode.children.has(nodeKey)) return false;
      currentNode = currentNode.children.get(nodeKey);

      if (isLast) {
        currentNode.handler = newHandler;
        if (this.cache.get(method).has(route)) {
          this.cache.get(method).get(route).handler = newHandler;
        }
        return true;
      }
    }
    return false;
  }

  /**
   * Remove a route from the routing tree
   */
  remove(method, route) {
    const cached = this.cache.get(method).get(route);
    if (cached) {
      this.cache.get(method).delete(route);
      // Note: We don't actually remove from the tree structure for simplicity
      // In a production implementation, you'd want to clean up the tree
    }
  }

  /**
   * Find a matching route for the given method and path
   */
  match(method, path, request) {
    const rootNode = this.routes.get(method);
    if (!rootNode) {
      return [null, null];
    }

    const segments = path.split('/').filter(segment => segment);
    return rootNode.match(segments, request);
  }

  /**
   * Handle an HTTP request
   */
  async handle(req, res, metadata, router, context) {
    const method = req.method;
    const path = req.url;

    try {
      // Execute before middleware
      await this.executeBefores(path, req, res, context);

      // Find matching route
      const [route, handler] = this.match(method, path, req);

      if (!handler) {
        res.status = 404;
        res.body = 'Not Found';
        return res;
      }

      // Execute the route handler
      await handler(req, res, context);

      // Execute after middleware
      await this.executeAfters(path, req, res, context);

    } catch (error) {
      if (error.name === 'AbortException') {
        // Handle abort - response is already set
      } else {
        // Propagate error to router level for error handling
        throw error;
      }
    }

    return res;
  }

  /**
   * Add before middleware for a route
   */
  addBefore(route, handler) {
    if (!this.befores.has(route)) {
      this.befores.set(route, []);
    }
    this.befores.get(route).push(handler);
  }

  /**
   * Add after middleware for a route
   */
  addAfter(route, handler) {
    if (!this.afters.has(route)) {
      this.afters.set(route, []);
    }
    this.afters.get(route).push(handler);
  }

  /**
   * Check if a path matches a pattern (supports wildcards)
   */
  matchesPattern(pattern, path) {
    // Exact match
    if (pattern === path) {
      return true;
    }

    // Wildcard match: /api/* matches /api/users, /api/profile, etc.
    if (pattern.endsWith('/*')) {
      const prefix = pattern.slice(0, -2); // Remove /*
      return path.startsWith(prefix + '/') || path === prefix;
    }

    // Parameterized route match
    const patternParts = pattern.split('/').filter(p => p);
    const pathParts = path.split('/').filter(p => p);

    if (patternParts.length !== pathParts.length) {
      return false;
    }

    for (let i = 0; i < patternParts.length; i++) {
      const patternPart = patternParts[i];
      const pathPart = pathParts[i];

      // Skip parameter segments
      if (patternPart.startsWith(':')) {
        continue;
      }

      if (patternPart !== pathPart) {
        return false;
      }
    }

    return true;
  }

  /**
   * Execute before middleware
   */
  async executeBefores(route, req, res, ctx) {
    for (const [pattern, handlers] of this.befores.entries()) {
      if (this.matchesPattern(pattern, route)) {
        for (const handler of handlers) {
          await handler(req, res, ctx);
        }
      }
    }
  }

  /**
   * Execute after middleware
   */
  async executeAfters(route, req, res, ctx) {
    for (const [pattern, handlers] of this.afters.entries()) {
      if (this.matchesPattern(pattern, route)) {
        for (const handler of handlers) {
          await handler(req, res, ctx);
        }
      }
    }
  }
}
