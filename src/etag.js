import crypto from 'crypto';

/**
 * ETag middleware for caching support
 */
export function etag(options = {}) {
  const {
    weak = false, // Use weak ETags
    algorithm = 'md5' // Hash algorithm
  } = options;

  return (req, res, ctx) => {
    // Store original send method
    const originalSend = res.send.bind(res);

    // Override send method
    res.send = function () {
      const body = this._body;

      // Only generate ETag for successful responses with body
      if (this._status >= 200 && this._status < 300 && body) {
        // Generate ETag
        const hash = crypto
          .createHash(algorithm)
          .update(body)
          .digest('hex');

        const etagValue = weak ? `W/"${hash}"` : `"${hash}"`;

        // Set ETag header
        this.setHeader('etag', etagValue);

        // Check If-None-Match header
        const ifNoneMatch = req.headers.get('if-none-match');

        if (ifNoneMatch) {
          // Parse ETags (can be multiple)
          const clientETags = ifNoneMatch.split(',').map(tag => tag.trim());

          // Check if any match
          if (clientETags.includes(etagValue) || clientETags.includes('*')) {
            // Resource hasn't changed
            this._status = 304;
            this._body = '';
            this.removeHeader('content-type');
            this.removeHeader('content-length');
          }
        }
      }

      return originalSend();
    };
  };
}

/**
 * Generate ETag for a given content
 */
export function generateETag(content, weak = false) {
  const hash = crypto
    .createHash('md5')
    .update(content)
    .digest('hex');

  return weak ? `W/"${hash}"` : `"${hash}"`;
}

/**
 * Check if ETags match
 */
export function matchETag(etag, ifNoneMatch) {
  if (!ifNoneMatch) return false;

  const clientETags = ifNoneMatch.split(',').map(tag => tag.trim());
  return clientETags.includes(etag) || clientETags.includes('*');
}
