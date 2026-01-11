
import { Router } from '../src/index.js';
import { DEFAULT } from '../src/constants.js';
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
  req.headers = options.headers || { host: 'localhost', 'content-type': 'application/json' };
  req.body = options.body || {};
  return req;
}

// Mock Response object
function createMockResponse() {
  let res = {
    setHeader: (k, v) => { res.headers[k] = v; },
    headers: {},
    end: (body) => { res.body = body; res.sent = true; },
    headersSent: false,
    statusCode: 200
  };
  return res;
}

async function testSchemaValidation() {
  console.log('\n--- Testing SCHEMA Validation ---');
  const router = new Router();

  // Bridge mock body to routerling request
  router.use('/*', async (req, res, ctx) => {
    if (req._req.body) req.body = req._req.body;
  });

  // 1. Define Route
  router.POST('/users', (req, res) => {
    res.body = { success: true, user: req.body };
  });

  // 2. Define Schema (Sidecar/Late-binding)
  const UserSchema = (data) => {
    if (!data.name) return { problems: 'Name is required' };
    return { data: { ...data, baked: true } };
  };

  router.SCHEMA.POST('/users', {
    expects: UserSchema,
    failOnInput: true
  });

  // 3. Manually trigger baking (simulating listen)
  await router._bakeSchemas();

  // Test Valid Request
  const validReq = createMockRequest({ method: 'POST', url: '/users', body: { name: 'Tersoo' } });
  const validRes = createMockResponse();
  await router.handle(validReq, validRes);

  const body = JSON.parse(validRes.body);
  assert(body.user && body.user.baked === true, 'Validator successfully coerced/modified data and it reached the handler');
  assert(validRes.statusCode === 200, 'Valid request passed with 200');

  // Test Invalid Request
  const invalidReq = createMockRequest({ method: 'POST', url: '/users', body: { age: 25 } });
  const invalidRes = createMockResponse();
  await router.handle(invalidReq, invalidRes);

  assert(invalidRes.statusCode === 422, 'Invalid request failed with 422');
  assert(JSON.parse(invalidRes.body).error === 'Validation Failed', 'Correct error message returned');
}

async function testSchemaOutputValidation() {
  console.log('\n--- Testing SCHEMA Output Validation ---');
  const router = new Router();

  router.GET('/data', (req, res) => {
    res.body = { secret: '12345' };
  });

  const DataSchema = (data) => {
    if (data.secret) return { problems: 'Privacy leak detected' };
    return { data };
  };

  router.SCHEMA.GET('/data', {
    returns: DataSchema,
    failOnOutput: true
  });

  await router._bakeSchemas();

  const mockReq = createMockRequest({ method: 'GET', url: '/data' });
  const mockRes = createMockResponse();
  await router.handle(mockReq, mockRes);

  assert(mockRes.statusCode === 500, 'Output leak correctly triggered 500 status');
  assert(JSON.parse(mockRes.body).error === 'Internal Server Error', 'Output validation stopped the response');
}

async function run() {
  try {
    await testSchemaValidation();
    await testSchemaOutputValidation();
    console.log(`\nTests finished: ${passed} passed, ${failed} failed`);
    if (failed > 0) process.exit(1);
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

run();
