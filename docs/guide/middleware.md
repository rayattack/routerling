# Middleware & Security

Routerling includes production-grade middleware out of the box.

## Security (Helmet)

Secure your app with widely recommended headers.

```javascript
import { helmet } from 'routerling';

app.use(helmet());
```

This sets:
- `Content-Security-Policy`
- `X-XSS-Protection`
- `X-Frame-Options`
- `Strict-Transport-Security`

## CORS

Handle Cross-Origin Resource Sharing effortlessly.

```javascript
import { cors } from 'routerling';

app.use(cors({
  origin: '*', // or specific domain
  methods: ['GET', 'POST'],
  credentials: true
}));
```

## Compression

Automatic Gzip and Brotli compression.

```javascript
import { compression } from 'routerling';

app.use(compression({ threshold: 1024 })); // Compress responses > 1KB
```

## Logging

Built-in request logging.

```javascript
import { logger } from 'routerling';

app.use(logger());
```
## Custom Middleware

You can write your own middleware functions to run before a request reaches your handler. Custom middleware should be an `async` function.

```javascript
app.use('/*', async (req, res, ctx) => {
  // Do something before the handler
  req.startTime = Date.now();
});

app.use('/api/*', async (req, res, ctx) => {
  if (req.headers['x-api-key'] !== 'my-secret') {
    res.abort({ error: 'Invalid API Key' });
  }
});
```

## Control Flow (Stopping the Chain)

In `routerling`, middleware functions run sequentially. Simply returning from a middleware function **does not** stop the execution chain; it just moves to the next middleware.

To stop the request pipeline immediately (e.g., for failed authentication), you must use **`res.abort()`**:

```javascript
app.use('/*', async (req, res, ctx) => {
  if (!userIsLoggedIn) {
     // This stops ALL subsequent middleware AND the route handler
     res.status = 401;
     res.abort('Unauthorized'); 
  }
});
```

Using `res.abort()` throws an internal exception that the router catches to terminate the request and send the response immediately.
