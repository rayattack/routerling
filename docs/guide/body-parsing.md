# Body Parsing

Routerling provides robust body parsing capabilities.

## JSON Parsing

Automatically parses `application/json` requests.

```javascript
import { json } from 'routerling';

app.use(json({ limit: '1mb' }));
```

## URL-Encoded

Parses `application/x-www-form-urlencoded`.

```javascript
import { urlEncoded } from 'routerling';

app.use(urlEncoded({ extended: true }));
```

## Raw / Text

Access raw buffer or string bodies.

```javascript
import { text, raw } from 'routerling';

app.use(text());
```

## Accessing Body Data

Parsed data is available on `req.body`.

```javascript
app.POST('/api/data', (req, res) => {
  console.log(req.body); // { name: "value" }
  res.json({ received: req.body });
});
```
