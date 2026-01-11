# Route Groups

Route grouping allows you to organize your application into modular sections with shared prefixes and middleware.

## Basic Grouping

```javascript
const api = app.group('/api/v1');

api.GET('/users', getUsers);
api.POST('/users', createUser);
```

These routes will be registered as `/api/v1/users`.

## Group Middleware (Interceptors)

Groups use a unique pattern called **Interceptors**. Unlike standard linear middleware, interceptors are **higher-order functions** that "wrap" the entire route handler.

### The Interceptor Signature

An interceptor takes a `handler` and returns a new `async` function:

```javascript
const myInterceptor = (handler) => async (req, res, ctx) => {
  // 1. Pre-processing logic runs here
  const result = await handler(req, res, ctx);
  // 2. Post-processing logic runs here
  return result;
};
```

### Why use Interceptors?

Interceptors give you complete control over the execution lifecycle of a route handler:

1.  **Blocking Execution**: You can choose not to call `handler(req, res, ctx)` at all. This is perfect for security guards.
2.  **Post-Processing**: You can inspect the `res.body` or `res.status` *after* the handler has finished and modify it (e.g., removing sensitive fields).
3.  **Baking**: Because interceptors wrap handlers at registration time, the resulting function is "pre-compiled," making it extremely fast during request execution.

### Example: Data Sanitization

In this example, the interceptor checks the response body and removes a private `internal_id` before it is sent to the client.

```javascript
const sanitize = (handler) => async (req, res, ctx) => {
  // Let the handler run first
  await handler(req, res, ctx);

  // Post-process the result
  if (typeof res.body === 'object' && res.body.internal_id) {
    delete res.body.internal_id;
  }
};

api.use(sanitize).GET('/profile', getProfile);
```

## Nested Groups

Groups can be nested arbitrarily deep.

```javascript
const v1 = app.group('/v1');
const admin = v1.group('/admin').use(adminAuth);

admin.GET('/dashboard', dashboardHandler); 
// -> /v1/admin/dashboard (with adminAuth)
```
