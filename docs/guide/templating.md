# Templating & Assets

## Static Assets

Serve files from a directory (like `./public`) automatically.

```javascript
// Serve files from the 'public' folder at the root
// Serve files from the 'public' folder at the root (Default)
app.ASSETS('./public');
// -> GET /style.css maps to ./public/style.css

// Or with a prefix
app.ASSETS('./public', { prefix: '/static' });
// -> GET /static/style.css maps to ./public/style.css
// -> GET /style.css maps to ./public/style.css

// Or with a prefix
app.ASSETS('./public', { prefix: '/static' });
// -> GET /static/style.css maps to ./public/style.css
```

This feature handles:
- Mime Types
- Caching (ETag, Last-Modified)
- Compression
- Range Requests (video streaming support)

## Sending Files Manually

You can send a specific file from any route handler.

```javascript
app.GET('/download/report', async (req, res) => {
  await res.sendFile('./data/report.pdf', {
    maxAge: 3600, // 1 hour cache
    headers: { 'Content-Disposition': 'attachment' }
  });
});
```

## Templating (Nunjucks)

Routerling integrates [Nunjucks](https://mozilla.github.io/nunjucks/) for server-side rendering.

### Setup

```javascript
app.TEMPLATES('./views', {
  autoescape: true,
  noCache: process.env.NODE_ENV !== 'production'
});
```

### Rendering

Use `res.render` (async) or `res.renders` (sync).

```javascript
app.GET('/home', async (req, res) => {
  await res.render('home.html', {
    title: 'Welcome',
    user: 'John Doe'
  });
});
```

### Template Context

Templates automatically receive:
- `req`: The request object
- `res`: The response object
- `ctx`: The context object
- `ctx.flash`: Flash messages (if used)

## Using Flash Messages

Routerling provides a `flash` middleware to store ephemeral messages between requests (e.g. for redirects).

### Setup

```javascript
import { flash } from 'routerling';

app.use(flash());
```

### Usage in Handlers

Use `res.flash(type, message)` to set a message for the *next* request.

```javascript
app.POST('/login', async (req, res) => {
  // ... login logic ...
  res.flash('success', 'Successfully logged in!');
  res.redirect('/dashboard');
});
```

### Usage in Templates

Flash messages are available in `ctx.flash`.

```html
<!-- Nunjucks example -->
{% if ctx.flash.success %}
  <div class="alert alert-success">
    {% for msg in ctx.flash.success %}
      <p>{{ msg }}</p>
    {% endfor %}
  </div>
{% endif %}
```
