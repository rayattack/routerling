import { Router } from '../src/index.js';

try {
  const router = new Router();
  console.log('Successfully imported Router from routerling!');
} catch (error) {
  console.error('Failed to import:', error);
  process.exit(1);
}
