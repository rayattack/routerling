# Daemons & Lifecycle

Routerling allows running background tasks and hooking into server lifecycle events.

## Daemons

Daemons are long-running processes that start when the server starts.

```javascript
app.DAEMON(async (app) => {
  console.log('Daemon started');
  while (app.active) {
    await processJobQueue();
    await sleep(5000);
  }
});
```

## Lifecycle Hooks

Run code once on startup or shutdown.

```javascript
app.ONCE('STARTUP', async () => {
  await db.connect();
});

app.ONCE('SHUTDOWN', async () => {
  await db.disconnect();
});
```
