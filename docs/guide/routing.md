# Routing Basics

## HTTP Methods

Routerling supports all standard HTTP methods clearly and explicitly.

```javascript
app.GET('/users', listUsers);
app.POST('/users', createUser);
app.PUT('/users/:id', updateUser);
app.DELETE('/users/:id', deleteUser);
```

## Route Parameters

Define dynamic segments with `:paramName`. They are accessible via `req.params`.

```javascript
app.GET('/users/:id', (req, res) => {
  const userId = req.params.id;
  res.json({ id: userId });
});
```

## The Request Object (`req`)

The request handler receives an enhanced `Request` object.

- `req.query`: Parsed query string parameters.
- `req.body`: Parsed request body (JSON, URL-encoded, etc.).
- `req.headers`: Request headers (use `req.headers.get('name')`).
- `req.ip`: Client IP address.

## The Response Object (`res`)

The response object is easy to use.

- `res.json(data)`: Send JSON response.
- `res.send(data)`: Send text/html response.
- `res.sendFile(path)`: Stream a file to the client.
- `res.render(view, data)`: Render a template (async).
- `res.status = 404`: Set status code.
- `res.setHeader('X-Custom', 'Value')`: Set headers.

## Context (`ctx`)

A request-scoped context object shared across middleware and handlers.

```javascript
app.GET('/', (req, res, ctx) => {
  ctx.user = { id: 1, role: 'admin' };
});
```
