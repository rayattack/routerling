# WebSockets

Routerling has native WebSocket support.

## Usage

Use the `WS` HTTP method helper to define a WebSocket route.

```javascript
app.WS('/socket', (ws, req) => {
  console.log('Client connected');

  ws.on('message', (msg) => {
    ws.send('Echo: ' + msg);
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});
```

The handler receives a standard `ws` WebSocket instance and the upgrade `req`.
