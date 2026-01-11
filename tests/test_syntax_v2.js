
import { Router } from '../src/index.js';
import { METHODS, DEFAULT } from '../src/constants.js'; // Import DEFAULT constant
import { Readable } from 'stream';

// Helper for simple testing
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✓ ${message}`);
    passed++;
  } else {
    console.error(`✗ ${message}`);
    failed++;
  }
}

// Mock Request object
function createMockRequest(options = {}) {
  const req = new Readable();
  req._read = () => { };
  req.push(null);
  req.method = options.method || 'GET';
  req.url = options.url || '/';
  req.headers = options.headers || { host: 'localhost' };
  return req;
}

// Mock Response object
function createMockResponse() {
  return {
    setHeader: () => { },
    end: () => { },
    headersSent: false
  };
}

async function testRouterUse() {
  console.log('\n--- Testing Router.use() ---');
  const router = new Router();
  let middlewareCalled = false;
  let middlewarePathCalled = false;

  // Global middleware (explicit path required)
  router.use('/*', async (req, res, ctx) => {
    middlewareCalled = true;
    // No next() needed
  });

  // Path scoped middleware
  router.use('/special', async (req, res, ctx) => {
    middlewarePathCalled = true;
  });

  router.GET('/test', (req, res) => { res.body = 'test'; });
  router.GET('/special/test', (req, res) => { res.body = 'special'; });

  // Simulate request 1
  await router.handle(createMockRequest({ method: 'GET', url: '/test' }), createMockResponse());
  assert(middlewareCalled, 'Global middleware executed');
  assert(!middlewarePathCalled, 'Path middleware NOT executed for unrelated route (correct)');

  // Simulate request 2
  middlewareCalled = false;
  middlewarePathCalled = false;
  await router.handle(createMockRequest({ method: 'GET', url: '/special/test' }), createMockResponse());
  assert(middlewareCalled, 'Global middleware executed (v2)');
  assert(middlewarePathCalled, 'Path middleware executed for matching route');
}

async function testRouterMount() {
  console.log('\n--- Testing Router.mount() Merging ---');

  // Router 1
  const r1 = new Router();
  r1.GET('/r1', () => { });

  // Router 2
  const r2 = new Router();
  r2.GET('/r2', () => { });

  // Main Router
  const main = new Router();
  main.mount(r1);
  main.mount(r2); // This used to OVERWRITE r1's routes in the default subdomain

  // Check routes exist
  // Use DEFAULT constant instead of string 'default'
  const defaultRoutes = main.subdomains.get(DEFAULT);

  if (!defaultRoutes) {
    assert(false, `Default subdomain '${String(DEFAULT)}' not found`);
    return;
  }

  const getRoutes = defaultRoutes.cache.get('GET');

  if (!getRoutes) {
    assert(false, 'GET routes cache not found');
    return;
  }

  assert(getRoutes.has('/r1'), 'Route from first mounted router exists');
  assert(getRoutes.has('/r2'), 'Route from second mounted router exists');
}

async function run() {
  try {
    await testRouterUse();
    await testRouterMount();
    console.log(`\nTests finished: ${passed} passed, ${failed} failed`);
    if (failed > 0) process.exit(1);
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

run();
