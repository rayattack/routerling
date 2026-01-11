import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const childScript = path.join(__dirname, 'test_signals_child.js');

// Create the child script
import fs from 'fs';
const childCode = `
import { Router } from '../src/index.js';

const app = new Router();
app.ONCE('shutdown', () => {
  console.log('SHUTDOWN_HOOK_EXECUTED');
});

app.listen(3003, 'localhost', () => {
  console.log('READY');
});
`;
fs.writeFileSync(childScript, childCode);

function runTest(signal) {
  return new Promise((resolve, reject) => {
    console.log(`Testing ${signal}...`);
    const child = spawn('node', [childScript], { stdio: ['pipe', 'pipe', 'pipe'] });

    let output = '';
    let shutdownHookCalled = false;

    child.stdout.on('data', (data) => {
      const str = data.toString();
      output += str;
      if (str.includes('READY')) {
        // Send signal
        child.kill(signal);
      }
      if (str.includes('SHUTDOWN_HOOK_EXECUTED')) {
        shutdownHookCalled = true;
      }
    });

    // Check stderr too just in case
    child.stderr.on('data', (data) => {
      console.error(`[Child Stderr] ${data}`);
    });

    child.on('close', (code, signalReceived) => {
      // Note: signalReceived might be null if we exited manually in the handler
      if (shutdownHookCalled) {
        console.log(`✓ ${signal} triggered shutdown hook`);
        resolve();
      } else {
        reject(new Error(`${signal} failed to trigger shutdown hook. Output: ${output}`));
      }
    });
  });
}

(async () => {
  try {
    // Only testing signals that we can catch and handle in a child process
    await runTest('SIGUSR2');
    await runTest('SIGHUP');
    // SIGTERM/SIGINT were already supported but good to regression test if needed
    // await runTest('SIGTERM'); 
    console.log('All signal tests passed');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  } finally {
    if (fs.existsSync(childScript)) fs.unlinkSync(childScript);
  }
})();
