import { Router } from '../src/index.js';
import path from 'path';
import fs from 'fs';

const app = new Router();
const TEST_FILE = './tests/public/test_file.txt';

// Create a dummy file if not exists
if (!fs.existsSync(path.dirname(TEST_FILE))) {
  fs.mkdirSync(path.dirname(TEST_FILE), { recursive: true });
}
fs.writeFileSync(TEST_FILE, 'Hello from sendFile!');

console.log('=== Testing res.sendFile ===\n');

app.GET('/send-file', async (req, res) => {
  await res.sendFile(TEST_FILE, {
    maxAge: 3600,
    headers: { 'X-Custom': 'Works' }
  });
});

app.GET('/alias-file', async (req, res) => {
  await res.file(TEST_FILE);
});

app.GET('/missing-file', async (req, res) => {
  await res.sendFile('./non-existent.txt');
});

app.GET('/root-option', async (req, res) => {
  await res.sendFile('test_file.txt', { root: './tests/public' });
});

app.listen(3011, 'localhost', () => {
  console.log('✓ Server running on http://localhost:3011\n');
  console.log('Test commands:');
  console.log('  curl -i http://localhost:3011/send-file');
  console.log('  curl -i http://localhost:3011/alias-file');
  console.log('  curl -i http://localhost:3011/root-option');
  console.log('  curl -i http://localhost:3011/missing-file');
});
