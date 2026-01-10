# Error Handling

Routerling has a dedicated error handling mechanism that catches both synchronous and asynchronous errors.

## Global Error Handler

Define a central error handler using `router.ERROR()`.

```javascript
app.ERROR((err, req, res, ctx) => {
  console.error(err);
  
  res.status = err.statusCode || 500;
  res.json({
    error: true,
    message: err.message
  });
});
```

## Built-in Errors

Use provided error classes for standard HTTP errors.

```javascript
import { BadRequestError, NotFoundError, UnauthorizedError } from 'routerling';

app.GET('/restricted', (req, res) => {
  throw new UnauthorizedError('You are not logged in');
});
```

## Async Support

Async errors are automatically caught and passed to the global handler. No need for `try/catch` in every route or `next(err)`.

```javascript
app.GET('/db', async (req, res) => {
  const data = await db.query(); // If this throws, app.ERROR catches it
  res.json(data);
});
```
