# SCHEMA Validation & Documentation

Routerling provides a first-class `SCHEMA` API for defining request contracts. This enables automatic input validation, output guards, and future support for Swagger/OpenAPI generation.

> [!IMPORTANT]
> **Plug-and-Play Philosophy**: Routerling does **not** bundle a specific validator. This keeps the framework lightweight and allows you to use your favorite library. You must install your preferred validator separately (e.g., `npm install arktype` or `npm install zod`).

## Validator Compatibility

The `SCHEMA` API is designed to be engine-agnostic. It currently has built-in support for:

-   **Arktype**: Any function returning `{ data, problems }`.
-   **Zod**: Any object with a `.safeParse()` method.
-   **Custom**: Any function that fits the `(data) => { data, problems }` signature.

## Basic Usage

You can define a schema alongside your route:

```javascript
import { type } from 'arktype';

const UserInput = type({
  name: "string",
  age: "number >= 18"
});

app.SCHEMA.POST('/users', {
  summary: 'Created a new user',
  expects: UserInput
}, (req, res) => {
  // If we reach here, req.body is already validated
  res.json({ success: true, user: req.body });
});
```

## Sidecar Architecture (Recommended)

One of Routerling's most powerful features is the ability to define schemas separately from your handlers. This keeps your business logic clean and allows documentation to be maintained independently.

```javascript
// routes/customers.js
app.POST('/v1/customers', handleCreateCustomer);

// schemas/customers.js
app.SCHEMA.POST('/v1/customers', {
  summary: 'Create a new customer',
  expects: CustomerInSchema,
  returns: CustomerOutSchema,
  failOnInput: true
});
```

Routerling automatically "bakes" these together when you call `app.listen()`. It will match the schema to the route path and wrap the handler in a validation interceptor.

## Configuration Options

The second argument to `app.SCHEMA[METHOD]` is a configuration object:

| Key | Description | Default |
| :--- | :--- | :--- |
| `expects` | The validator schema for the request body. | `null` |
| `returns` | The validator schema for the response body. | `null` |
| `summary` | A brief description for documentation. | `''` |
| `failOnInput` | If `true`, aborts with 422 if input fails. | `true` |
| `failOnOutput` | If `true`, aborts with 500 if output fails. | `false` |
| `logError` | Array of keys to log errors for (`['input', 'output']`). | `[]` |

## Output Validation

`returns` can be a single schema or a map of status codes:

```javascript
app.SCHEMA.GET('/data', {
  returns: {
    200: ValidDataSchema,
    400: ErrorSchema
  }
});
```

## How Validation Works

When a request matches a route with a schema:
1.  **Input Guard**: The `req.body` is run through `expects`. If it fails and `failOnInput` is true, the request is aborted immediately.
2.  **Transformation**: If the validator coerces data (e.g., strings to numbers or dates), `req.body` is replaced with the clean, validated version.
3.  **Output Guard**: After your handler runs, if `returns` is set, the response body is checked. If it fails and `failOnOutput` is true, the status code is flipped to 500 and the response is aborted.

## Automatic API Documentation

Routerling can automatically generate interactive documentation (via Scalar) and an OpenAPI 3.0 specification from your schemas.

### Enabling Documentation

Simply call `DOCS()` on your app instance:

```javascript
// Serves documentation at /docs
// Serves OpenAPI JSON at /docs/openapi.json
await app.DOCS('/docs', {
  title: 'My Awesome API',
  version: '1.0.0'
});
```

### Accessing the Raw Spec

If you need the raw OpenAPI object (e.g., to save to a file or share with other tools), use `OpenApi()`:

```javascript
const spec = await app.OpenApi({
  title: 'My API'
});

console.log(JSON.stringify(spec, null, 2));
```
