import {
  Router,
  cors,
  helmet,
  json,
  urlencoded,
  compression,
  etag,
  logger,
  errorHandler,
  NotFoundError,
  BadRequestError
} from '../src/index.js';

const app = new Router();

console.log('=== Testing Production Features ===\n');

// 1. Logging middleware
app.BEFORE('/*', logger({
  format: 'dev',
  generateRequestId: true
}));

// 2. Security headers
app.BEFORE('/*', helmet());

// 3. CORS
app.BEFORE('/*', cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

// 4. Body parsers
app.BEFORE('/*', json({ limit: '1mb' }));
app.BEFORE('/*', urlencoded({ limit: '1mb', extended: true }));

// 5. Compression
app.BEFORE('/*', compression({ threshold: 1024 }));

// 6. ETag
app.BEFORE('/*', etag());

// Test routes
app.GET('/', (req, res, ctx) => {
  console.log('✓ Headers API test:');
  console.log(`  headers.get('user-agent'): ${req.headers.get('user-agent')}`);
  console.log(`  headers.content_type: ${req.headers.content_type}`);
  console.log(`  Request ID: ${ctx.requestId}`);

  res.json({
    message: 'Production features test',
    features: {
      cors: 'enabled',
      helmet: 'enabled',
      compression: 'enabled',
      etag: 'enabled',
      logging: 'enabled',
      bodyParsers: 'enabled'
    },
    requestId: ctx.requestId
  });
});

app.POST('/api/users', (req, res, ctx) => {
  console.log('✓ Body parser test:');
  console.log(`  Received body:`, req.body);
  console.log(`  Body type: ${typeof req.body}`);

  if (!req.body || !req.body.name) {
    throw new BadRequestError('Name is required', { field: 'name' });
  }

  res.json({
    success: true,
    user: req.body,
    requestId: ctx.requestId
  });
});

app.GET('/large', (req, res, ctx) => {
  // Generate large response to test compression
  const largeData = {
    message: 'This is a large response to test compression',
    data: Array(1000).fill('x').map((_, i) => ({
      id: i,
      name: `Item ${i}`,
      description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.'
    }))
  };

  console.log('✓ Compression test: sending large response');
  res.json(largeData);
});

app.GET('/error', (req, res, ctx) => {
  throw new Error('Test error handling');
});

app.GET('/not-found-error', (req, res, ctx) => {
  throw new NotFoundError('Resource not found');
});

// Set global error handler (replaces AFTER middleware approach)
app.ERROR(errorHandler({
  showStack: true,
  logger: (msg, data) => console.log('Error logged:', data)
}));

app.listen(3007, 'localhost', () => {
  console.log('✓ Server running on http://localhost:3007\n');
  console.log('Test commands:');
  console.log('  curl http://localhost:3007/');
  console.log('  curl -X POST http://localhost:3007/api/users -H "Content-Type: application/json" -d \'{"name":"John"}\'');
  console.log('  curl http://localhost:3007/large --compressed');
  console.log('  curl http://localhost:3007/error');
  console.log('  curl http://localhost:3007/not-found-error\n');
});
