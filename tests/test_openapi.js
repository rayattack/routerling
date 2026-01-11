
import { Router } from '../src/index.js';
import { Readable } from 'stream';

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

function createMockRequest(options = {}) {
  const req = new Readable();
  req._read = () => { };
  req.push(null);
  req.method = options.method || 'GET';
  req.url = options.url || '/';
  req.headers = options.headers || { host: 'localhost' };
  return req;
}

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

async function testOpenApiSpec() {
  console.log('\n--- Testing OpenAPI Spec Generation ---');
  const router = new Router();

  router.SCHEMA.POST('/v1/users', {
    summary: 'Create User',
    expects: (data) => ({ data })
  });

  router.SCHEMA.GET('/v1/users/:id', {
    summary: 'Get User'
  });

  const spec = await router.OpenApi({ title: 'Test API' });

  assert(spec.openapi === '3.0.0', 'Correct OpenAPI version');
  assert(spec.info.title === 'Test API', 'Correct title in info object');
  assert(spec.paths['/v1/users'], 'Path /v1/users exists');
  assert(spec.paths['/v1/users/{id}'], 'Path /v1/users/{id} exists (properly translated from :id)');
  assert(spec.paths['/v1/users'].post.summary === 'Create User', 'Correct summary for POST');
  assert(spec.paths['/v1/users/{id}'].get.parameters[0].name === 'id', 'Path parameter extracted');
}

async function testDocsRoutes() {
  console.log('\n--- Testing Documentation Routes ---');
  const router = new Router();

  router.SCHEMA.GET('/ping', { summary: 'Health check' });
  await router.DOCS('/docs');

  // Test JSON Spec route
  const jsonReq = createMockRequest({ method: 'GET', url: '/docs/openapi.json' });
  const jsonRes = createMockResponse();
  await router.handle(jsonReq, jsonRes);

  assert(jsonRes.statusCode === 200, 'JSON spec route returned 200');
  const spec = JSON.parse(jsonRes.body);
  assert(spec.paths['/ping'].get.summary === 'Health check', 'JSON spec contains correct route data');

  // Test UI route
  const uiReq = createMockRequest({ method: 'GET', url: '/docs' });
  const uiRes = createMockResponse();
  await router.handle(uiReq, uiRes);

  assert(uiRes.statusCode === 200, 'UI route returned 200');
  assert(uiRes.body.includes('<script'), 'UI route returns HTML with scripts');
  assert(uiRes.body.includes('data-url="/docs/openapi.json"'), 'UI points to correct JSON spec URL');
}

async function run() {
  try {
    await testOpenApiSpec();
    await testDocsRoutes();
    console.log(`\nTests finished: ${passed} passed, ${failed} failed`);
    if (failed > 0) process.exit(1);
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

run();
