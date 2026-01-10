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

You can apply "interceptors" (wrapper middleware) to an entire group.

```javascript
const auth = (handler) => async (req, res, ctx) => {
  if (!checkAuth(req)) {
    res.status = 401;
    return;
  }
  return handler(req, res, ctx);
};

// All routes in this group require authentication
api.use(auth).GET('/protected', protectedHandler);
```

## Nested Groups

Groups can be nested arbitrarily deep.

```javascript
const v1 = app.group('/v1');
const admin = v1.group('/admin').use(adminAuth);

admin.GET('/dashboard', dashboardHandler); 
// -> /v1/admin/dashboard (with adminAuth)
```
