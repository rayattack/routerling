import { Router, STARTUP, SHUTDOWN } from '../src/index.js';
import WebSocket from 'ws';

const app = new Router();

// Track test results
const testResults = {
  startupSync: false,
  startupAsync: false,
  shutdownCalled: false,
  daemonSync: false,
  daemonAsync: false,
  wsConnected: false,
  wsMessageReceived: false
};

console.log('=== Starting Routerling Feature Tests ===\n');

// Test 1: ONCE with STARTUP - Synchronous
app.ONCE(STARTUP, (router) => {
  console.log('✓ STARTUP hook (sync) called');
  testResults.startupSync = true;
});

// Test 2: ONCE with STARTUP - Asynchronous
app.ONCE(STARTUP, async (router) => {
  await new Promise(resolve => setTimeout(resolve, 100));
  console.log('✓ STARTUP hook (async) called');
  testResults.startupAsync = true;
});

// Test 3: ONCE with SHUTDOWN
app.ONCE(SHUTDOWN, async (router) => {
  console.log('✓ SHUTDOWN hook called');
  testResults.shutdownCalled = true;
});

// Test 4: DAEMON - Synchronous
app.DAEMON((router) => {
  console.log('✓ DAEMON (sync) executed');
  testResults.daemonSync = true;
});

// Test 5: DAEMON - Asynchronous
app.DAEMON(async (router) => {
  await new Promise(resolve => setTimeout(resolve, 50));
  console.log('✓ DAEMON (async) executed');
  testResults.daemonAsync = true;
});

// Test 6: WebSocket route
app.WS('/ws', (ws, request, router) => {
  console.log('✓ WebSocket connected');
  testResults.wsConnected = true;

  ws.on('message', (message) => {
    const msg = message.toString();
    console.log(`✓ WebSocket received: ${msg}`);
    testResults.wsMessageReceived = true;

    // Echo back
    ws.send(`Echo: ${msg}`);
  });

  ws.on('close', () => {
    console.log('WebSocket disconnected');
  });

  // Send welcome message
  ws.send('Welcome to Routerling WebSocket!');
});

// HTTP route to check test status
app.GET('/status', (req, res) => {
  res.json({
    message: 'Routerling Test Server',
    testResults,
    allPassed: Object.values(testResults).every(v => v === true)
  });
});

app.GET('/', (req, res) => {
  res.json({
    message: 'Routerling Framework Test Server',
    endpoints: {
      status: '/status',
      websocket: 'ws://localhost:3002/ws'
    }
  });
});

// Start server
const server = app.listen(3002, 'localhost', () => {
  console.log('\n=== Server Started ===');
  console.log('HTTP: http://localhost:3002');
  console.log('WebSocket: ws://localhost:3002/ws\n');

  // Wait a bit for startup hooks to complete, then test WebSocket
  setTimeout(() => {
    testWebSocket();
  }, 500);
});

// WebSocket client test
function testWebSocket() {
  console.log('=== Testing WebSocket Connection ===');
  const ws = new WebSocket('ws://localhost:3002/ws');

  ws.on('open', () => {
    console.log('Client: Connected to WebSocket');
    ws.send('Hello from client!');
  });

  ws.on('message', (data) => {
    console.log(`Client: Received: ${data.toString()}`);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error.message);
  });

  // Close after testing
  setTimeout(() => {
    ws.close();
    setTimeout(() => {
      printResults();
    }, 500);
  }, 2000);
}

// Print final results
function printResults() {
  console.log('\n=== Test Results ===');
  console.log('STARTUP (sync):', testResults.startupSync ? '✓ PASS' : '✗ FAIL');
  console.log('STARTUP (async):', testResults.startupAsync ? '✓ PASS' : '✗ FAIL');
  console.log('DAEMON (sync):', testResults.daemonSync ? '✓ PASS' : '✗ FAIL');
  console.log('DAEMON (async):', testResults.daemonAsync ? '✓ PASS' : '✗ FAIL');
  console.log('WebSocket connect:', testResults.wsConnected ? '✓ PASS' : '✗ FAIL');
  console.log('WebSocket message:', testResults.wsMessageReceived ? '✓ PASS' : '✗ FAIL');

  // Test shutdown
  console.log('\n=== Testing Shutdown ===');
  app.close().then(() => {
    console.log('SHUTDOWN:', testResults.shutdownCalled ? '✓ PASS' : '✗ FAIL');

    // Check all tests including shutdown
    const allPassed = Object.values(testResults).every(v => v === true);
    console.log('\n=== Final Result ===');
    console.log(allPassed ? '✓ ALL TESTS PASSED' : '✗ SOME TESTS FAILED');
    console.log('\n=== Tests Complete ===');
    process.exit(allPassed ? 0 : 1);
  });
}

// Handle errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
  process.exit(1);
});
