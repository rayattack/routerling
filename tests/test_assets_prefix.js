import { Router } from '../src/index.js';
import fs from 'fs';
import path from 'path';

const app = new Router();
const TEST_DIR = './tests/public';
const TEST_FILE = path.join(TEST_DIR, 'prefix_test.txt');

// Setup
if (!fs.existsSync(TEST_DIR)) fs.mkdirSync(TEST_DIR, { recursive: true });
fs.writeFileSync(TEST_FILE, 'Served via prefix!');

// Configure assets with prefix
app.ASSETS(TEST_DIR, { prefix: '/static' });

app.listen(3013, 'localhost', () => {
  console.log('Server running on port 3013');
  console.log('Run: curl http://localhost:3013/static/prefix_test.txt');
});
