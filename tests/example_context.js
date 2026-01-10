import { Router } from '../src/index.js';

const app = new Router();

// Simple example showing context usage
app.GET('/api/profile', (req, res, ctx) => {
  // Store values in context
  ctx.keep('user', { id: 123, name: 'Alice', role: 'admin' });
  ctx.requestId = Math.random().toString(36).substring(7);
  ctx.timestamp = new Date().toISOString();

  // Retrieve from context
  const user = ctx._data.get('user');
  const requestId = ctx.requestId; // Proxy syntax

  console.log('✓ Context working:');
  console.log(`  User: ${user.name} (${user.role})`);
  console.log(`  Request ID: ${requestId}`);
  console.log(`  Timestamp: ${ctx.timestamp}`);

  res.json({
    user,
    requestId,
    timestamp: ctx.timestamp,
    contextSize: ctx.size
  });
});

app.GET('/', (req, res, ctx) => {
  res.json({
    message: 'Context Demo - handlers receive (req, res, ctx)',
    info: 'Visit /api/profile to see context in action'
  });
});

app.listen(3005, 'localhost', () => {
  console.log('✓ Context demo running on http://localhost:3005');
  console.log('  Try: curl http://localhost:3005/api/profile\n');
});
