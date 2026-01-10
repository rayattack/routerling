import zlib from 'zlib';
import { promisify } from 'util';

const gzip = promisify(zlib.gzip);
const brotliCompress = promisify(zlib.brotliCompress);

/**
 * Compression middleware
 */
export function compression(options = {}) {
  const {
    threshold = 1024, // Only compress if body > 1kb
    level = 6, // Compression level (0-9)
    filter = null, // Function to determine if response should be compressed
    brotli = true // Enable brotli compression
  } = options;

  return async (req, res, ctx) => {
    // Store original send method
    const originalSend = res.send.bind(res);

    // Override send method
    res.send = async function () {
      // Check if we should compress
      const shouldCompress = filter ? filter(req, res) : true;

      if (!shouldCompress) {
        return originalSend();
      }

      // Check body size
      const body = this._body;
      if (!body || body.length < threshold) {
        return originalSend();
      }

      // Check if already compressed
      if (this.getHeader('content-encoding')) {
        return originalSend();
      }

      // Get accepted encodings
      const acceptEncoding = req.headers.get('accept-encoding') || '';

      let compressed = null;
      let encoding = null;

      // Try brotli first (better compression)
      if (brotli && acceptEncoding.includes('br')) {
        try {
          compressed = await brotliCompress(body, {
            params: {
              [zlib.constants.BROTLI_PARAM_QUALITY]: level
            }
          });
          encoding = 'br';
        } catch (err) {
          console.error('Brotli compression error:', err);
        }
      }

      // Fallback to gzip
      if (!compressed && acceptEncoding.includes('gzip')) {
        try {
          compressed = await gzip(body, { level });
          encoding = 'gzip';
        } catch (err) {
          console.error('Gzip compression error:', err);
        }
      }

      // Apply compression if successful
      if (compressed && encoding) {
        this._body = compressed;
        this.setHeader('content-encoding', encoding);
        this.setHeader('vary', 'Accept-Encoding');
        this.removeHeader('content-length'); // Will be recalculated
      }

      return originalSend();
    };
  };
}

/**
 * Helper to check if content type should be compressed
 */
export function shouldCompress(req, res) {
  const contentType = res.getHeader('content-type') || '';

  const compressibleTypes = [
    'text/',
    'application/json',
    'application/javascript',
    'application/xml',
    'application/x-javascript',
    'application/ecmascript',
    'image/svg+xml'
  ];

  return compressibleTypes.some(type => contentType.includes(type));
}
