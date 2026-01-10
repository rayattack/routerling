/**
 * Route Group for organizing routes with shared prefixes and interceptors
 */
export class RouteGroup {
  constructor(router, prefix = '') {
    this.router = router;
    this.prefix = prefix;
    this.interceptors = [];
  }

  /**
   * Add an interceptor (wrapper) to this group
   * Interceptors are wrappers that take a handler and return a handler
   */
  use(interceptor) {
    this.interceptors.push(interceptor);
    return this;
  }

  /**
   * Create a subgroup
   */
  group(prefix) {
    const subgroup = new RouteGroup(this.router, this.prefix + prefix);
    // Inherit interceptors from parent
    subgroup.interceptors = [...this.interceptors];
    return subgroup;
  }

  /**
   * Register a route with the router
   */
  _register(method, path, handler, subdomain) {
    // Combine prefix and path
    const fullPath = this.prefix + path;

    // Apply interceptors (right-to-left / bottom-to-top)
    // We reverse so the last added interceptor runs "first" (outermost wrapper)
    // This matches the .use().use() chaining order where first .use() is outer
    let wrappedHandler = handler;

    // Apply interceptors in reverse order (stacking them)
    // .use(A).use(B) -> A(B(handler))
    for (let i = this.interceptors.length - 1; i >= 0; i--) {
      wrappedHandler = this.interceptors[i](wrappedHandler);
    }

    // Use _register or public methods. _register is safer if available, but let's use the dynamic method call
    // to match how Router delegates.
    // However, since we are inside the framework, we can use _register if it's accessible.
    // Looking at router.js, _register is used by GET/POST/etc.
    // Let's use the public method name dynamic call which is safer if _register implementation changes
    if (this.router[method]) {
      this.router[method](fullPath, wrappedHandler, subdomain);
    } else {
      // Fallback for methods that might not be directly exposed or future methods
      // Assuming _register exists as it is the internal mechanism
      this.router._register(method, fullPath, wrappedHandler, subdomain);
    }
    return this;
  }

  // HTTP methods
  GET(path, handler, subdomain) { return this._register('GET', path, handler, subdomain); }
  POST(path, handler, subdomain) { return this._register('POST', path, handler, subdomain); }
  PUT(path, handler, subdomain) { return this._register('PUT', path, handler, subdomain); }
  PATCH(path, handler, subdomain) { return this._register('PATCH', path, handler, subdomain); }
  DELETE(path, handler, subdomain) { return this._register('DELETE', path, handler, subdomain); }
  HEAD(path, handler, subdomain) { return this._register('HEAD', path, handler, subdomain); }
  OPTIONS(path, handler, subdomain) { return this._register('OPTIONS', path, handler, subdomain); }
}
