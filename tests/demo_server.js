import { Router, STARTUP, SHUTDOWN } from '../src/index.js';

const app = new Router();

console.log('=== Routerling Feature Demo ===\n');

// Startup hook - runs when server starts
app.ONCE(STARTUP, async () => {
  console.log('✓ Server initialization complete');
  console.log('✓ Database connections established (simulated)');
});

// Shutdown hook - runs when server stops
app.ONCE(SHUTDOWN, async () => {
  console.log('✓ Cleaning up resources...');
  console.log('✓ Closing database connections (simulated)');
});

// Daemon - background process that runs on startup
app.DAEMON(async (router) => {
  console.log('✓ Background daemon started');
  console.log('  - Monitoring system health');
  console.log('  - Processing queued tasks');
});

// WebSocket endpoint
app.WS('/chat', (ws, request) => {
  console.log('✓ New WebSocket client connected');

  ws.send(JSON.stringify({
    type: 'welcome',
    message: 'Connected to Routerling chat!'
  }));

  ws.on('message', (data) => {
    const message = data.toString();
    console.log(`  Received: ${message}`);

    // Broadcast to client
    ws.send(JSON.stringify({
      type: 'message',
      content: message,
      timestamp: new Date().toISOString()
    }));
  });

  ws.on('close', () => {
    console.log('✓ WebSocket client disconnected');
  });
});

// Regular HTTP routes
app.GET('/', (req, res) => {
  res.json({
    framework: 'Routerling',
    version: '0.0.1',
    features: {
      websockets: 'ws://localhost:3003/chat',
      startup_hooks: 'ONCE(STARTUP, handler)',
      shutdown_hooks: 'ONCE(SHUTDOWN, handler)',
      daemons: 'DAEMON(handler)'
    },
    status: 'All features operational'
  });
});

app.GET('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// Start the server
app.listen(3003, 'localhost', () => {
  console.log('\n=== Server Ready ===');
  console.log('HTTP API: http://localhost:3003');
  console.log('WebSocket: ws://localhost:3003/chat');
  console.log('\nPress Ctrl+C to shutdown gracefully\n');
});
