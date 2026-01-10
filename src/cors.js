/**
 * CORS middleware for handling Cross-Origin Resource Sharing
 */

export function cors(options = {}) {
  const {
    origin = '*',
    methods = ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
    allowedHeaders = ['Content-Type', 'Authorization'],
    exposedHeaders = [],
    credentials = false,
    maxAge = 86400, // 24 hours
    preflightContinue = false,
    optionsSuccessStatus = 204
  } = options;

  return (req, res, ctx) => {
    // Determine allowed origin
    let allowedOrigin = origin;

    if (typeof origin === 'function') {
      allowedOrigin = origin(req.headers.origin || req.headers.referer);
    } else if (Array.isArray(origin)) {
      const requestOrigin = req.headers.origin || req.headers.referer;
      allowedOrigin = origin.includes(requestOrigin) ? requestOrigin : origin[0];
    }

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);

    if (credentials) {
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    if (exposedHeaders.length > 0) {
      res.setHeader('Access-Control-Expose-Headers', exposedHeaders.join(', '));
    }

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Methods', methods.join(', '));
      res.setHeader('Access-Control-Allow-Headers', allowedHeaders.join(', '));
      res.setHeader('Access-Control-Max-Age', maxAge.toString());

      if (!preflightContinue) {
        res.status = optionsSuccessStatus;
        res.body = '';
        return;
      }
    }
  };
}
