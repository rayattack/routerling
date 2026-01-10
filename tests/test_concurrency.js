import { Router } from '../src/index.js';
import http from 'http';

const app = new Router();

// Endpoint for large file (simulates long running I/O)
app.GET('/large', async (req, res) => {
  await res.sendFile('./tests/public/large.bin');
});

// Endpoint for quick check
app.GET('/ping', (req, res) => {
  res.json({ message: 'pong' });
});

const PORT = 3012;

app.listen(PORT, 'localhost', () => {
  console.log(`Server running on port ${PORT}`);
  runTest();
});

async function runTest() {
  console.log('Starting concurrency test...');

  const start = Date.now();

  // 1. Start downloading large file (don't await yet)
  console.log('[Client] Requesting /large (50MB)...');
  const largeReqPromise = new Promise((resolve) => {
    http.get(`http://localhost:${PORT}/large`, (res) => {
      res.on('data', () => { }); // Consume stream
      res.on('end', () => resolve(Date.now() - start));
    });
  });

  // 2. Immediately request /ping
  console.log('[Client] Requesting /ping...');
  const pingStart = Date.now();
  const pingReqPromise = new Promise((resolve) => {
    http.get(`http://localhost:${PORT}/ping`, (res) => {
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => {
        const time = Date.now() - pingStart;
        console.log(`[Client] /ping responded in ${time}ms`);
        resolve(time);
      });
    });
  });

  // 3. Wait for both
  const [largeTime, pingTime] = await Promise.all([largeReqPromise, pingReqPromise]);

  console.log(`[Client] /large finished in ${largeTime}ms`);

  if (pingTime < largeTime && pingTime < 100) {
    console.log('✓ SUCCESS: /ping responded quickly while /large was streaming.');
  } else {
    console.log('✗ FAILURE: /ping was blocked or slow.');
  }

  process.exit(0);
}
