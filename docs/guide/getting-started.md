# Getting Started

## Introduction

Routerling is a modern, lightweight, and feature-rich router for Node.js. It is designed to be familiar to users of other Python and Node.js frameworks while offering better performance and explicit control.

## Installation

```bash
npm install routerling
```

## "Hello World" Example

Create a file named `app.js`:

```javascript
import { Router } from 'routerling';

const app = new Router();

// Define a simple route
app.GET('/', (req, res) => {
  res.send('Hello from Routerling!');
});

// Start the server
app.listen(3000, 'localhost', () => {
  console.log('Server running at http://localhost:3000');
});
```

Run it with:
```bash
node app.js
```
