import { Router } from '../src/index.js';

const app = new Router();

console.log('=== Testing Advanced Routing Features ===\n');

// Test 1: Wildcard middleware
app.BEFORE('/api/*', (req, res, ctx) => {
  ctx.apiCallTime = Date.now();
  console.log(`✓ BEFORE middleware matched for ${req.url}`);
});

app.AFTER('/api/*', (req, res, ctx) => {
  const duration = Date.now() - ctx.apiCallTime;
  console.log(`✓ AFTER middleware matched for ${req.url} (${duration}ms)`);
});

// Test 2: Type coercion - :id:int
app.GET('/customers/:id:int', (req, res, ctx) => {
  console.log(`✓ Route matched: /customers/:id:int`);
  console.log(`  id value: ${req.params.id} (type: ${typeof req.params.id})`);

  res.json({
    customerId: req.params.id,
    type: typeof req.params.id,
    isNumber: typeof req.params.id === 'number'
  });
});

// Test 3: Nested parameterized routes
app.GET('/customers/:id:int/orders', (req, res, ctx) => {
  console.log(`✓ Route matched: /customers/:id:int/orders`);
  console.log(`  customer id: ${req.params.id} (type: ${typeof req.params.id})`);

  res.json({
    customerId: req.params.id,
    orders: ['order1', 'order2']
  });
});

app.GET('/customers/:id:int/payment-methods', (req, res, ctx) => {
  console.log(`✓ Route matched: /customers/:id:int/payment-methods`);

  res.json({
    customerId: req.params.id,
    paymentMethods: ['card', 'paypal']
  });
});

// Test 4: Multiple parameters with different types
app.GET('/customers/:id:int/:names', (req, res, ctx) => {
  console.log(`✓ Route matched: /customers/:id:int/:names`);
  console.log(`  id: ${req.params.id} (type: ${typeof req.params.id})`);
  console.log(`  names: ${req.params.names} (type: ${typeof req.params.names})`);

  res.json({
    customerId: req.params.id,
    names: req.params.names,
    types: {
      id: typeof req.params.id,
      names: typeof req.params.names
    }
  });
});

// Test 5: Query strings with req.queries
app.GET('/api/search', (req, res, ctx) => {
  console.log(`✓ Route matched: /api/search`);
  console.log(`  Query params:`, req.queries);

  res.json({
    query: req.queries,
    name: req.queries.name,
    age: req.queries.age
  });
});

// Test 6: Wildcard BEFORE/AFTER with different prefix
app.BEFORE('/v1/*', (req, res, ctx) => {
  ctx.v1CallTime = Date.now();
  console.log(`✓ BEFORE middleware matched for v1 route: ${req.url}`);
});

app.AFTER('/v1/*', (req, res, ctx) => {
  const duration = Date.now() - ctx.v1CallTime;
  console.log(`✓ AFTER middleware matched for v1 route: ${req.url} (${duration}ms)`);
});

app.GET('/v1/users/:id:int', (req, res, ctx) => {
  console.log(`✓ Route matched: /v1/users/:id:int`);

  res.json({
    version: 'v1',
    userId: req.params.id,
    type: typeof req.params.id
  });
});

// Root route
app.GET('/', (req, res, ctx) => {
  res.json({
    message: 'Advanced Routing Test Server',
    features: [
      'Wildcard middleware (/api/*, /v1/*)',
      'Type coercion (:id:int)',
      'Nested routes (/customers/:id/orders)',
      'Multiple params (/customers/:id/:names)',
      'Query strings (req.queries)'
    ],
    testRoutes: {
      typeCoercion: '/customers/123',
      nestedOrders: '/customers/456/orders',
      nestedPayments: '/customers/789/payment-methods',
      multipleParams: '/customers/100/john-doe',
      queryStrings: '/api/search?name=Mary&age=25',
      v1Route: '/v1/users/42'
    }
  });
});

app.listen(3006, 'localhost', () => {
  console.log('✓ Server running on http://localhost:3006\n');
  console.log('Test the following routes:');
  console.log('  curl http://localhost:3006/customers/123');
  console.log('  curl http://localhost:3006/customers/456/orders');
  console.log('  curl http://localhost:3006/customers/789/payment-methods');
  console.log('  curl http://localhost:3006/customers/100/john-doe');
  console.log('  curl "http://localhost:3006/api/search?name=Mary&age=25"');
  console.log('  curl http://localhost:3006/v1/users/42\n');
});
