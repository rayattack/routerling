
import { Router } from '../src/index.js';

const app = new Router();
app.ONCE('shutdown', () => {
  console.log('SHUTDOWN_HOOK_EXECUTED');
});

app.listen(3003, 'localhost', () => {
  console.log('READY');
});
