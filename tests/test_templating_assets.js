import { Router } from '../src/index.js';
import path from 'path';

const app = new Router();

console.log('=== Testing Templating & Assets ===\n');

// Setup dependencies
app.TEMPLATES('./tests/templates');
app.ASSETS('./tests/public');

app.GET('/render-test', async (req, res, ctx) => {
  ctx.user = 'AdminUser';
  await res.render('index.html', { user: 'John' });
});

app.listen(3010, 'localhost', () => {
  console.log('✓ Server running on http://localhost:3010\n');
  console.log('Test commands:');
  console.log('  curl http://localhost:3010/render-test');
  console.log('  curl http://localhost:3010/style.css');
});
