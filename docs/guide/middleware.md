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
