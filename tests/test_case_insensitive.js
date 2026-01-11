import { Router } from '../src/index.js';

const app = new Router();

try {
  // Test 1: Uppercase (User's original case)
  app.ONCE('STARTUP', () => console.log('✓ STARTUP works'));

  // Test 2: Lowercase (Canonical)
  app.ONCE('startup', () => console.log('✓ startup works'));

  // Test 3: Mixed case (Robustness check)
  app.ONCE('ShutDown', () => console.log('✓ ShutDown works'));

  console.log('Case-insensitivity check passed');
} catch (error) {
  console.error('Case-insensitivity check FAILED:', error);
  process.exit(1);
}
