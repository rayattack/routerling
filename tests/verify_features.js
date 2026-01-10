
import { Router, STARTUP, SHUTDOWN } from '../src/index.js';
import http from 'http';

const app = new Router();
const subRouter = new Router();

let startupCalled = false;
let daemonCalled = false;

// 1. Test ONCE (Startup)
app.ONCE(STARTUP, async () => {
  console.log('Startup hook called');
  startupCalled = true;
});

// 2. Test DAEMON
app.DAEMON(async (router) => {
  console.log('Daemon running');
  daemonCalled = true;
});

// 3. Test Mounting (Simulating subdomain mount)
subRouter.GET('/sub', (req, res) => {
  res.body = 'Subdirectory';
}, 'api'); // Register on 'api' subdomain
app.mount(subRouter);

// 4. Test WebSockets? 
// Current implementation just logs a warning, so we expect this to fail or do nothing useful regarding actual WS connection.
app.WS('/socket', (ws, req) => {
  console.log('WebSocket connected');
});

// Main route
app.GET('/', (req, res) => {
  res.json({
    startupCalled,
    daemonCalled,
    mountTest: 'Try curl -H "Host: api.localhost:3000" http://localhost:3000/sub'
  });
});

const server = app.listen(3001, 'localhost', () => {
  console.log('Test server running on 3001');

  // Trigger Daemon check? failing that we check if it ran on startup.
  // The framework might need to run daemons explicitly.
});

// Keep alive for a bit to test
setTimeout(() => {
  console.log('Stopping server...');
  // app.close() is not fully implemented in terms of stopping the process, but let's try
  app.close().then(() => {
    console.log('Server closed');
    process.exit(0);
  });
}, 5000);
