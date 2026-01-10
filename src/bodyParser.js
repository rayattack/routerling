import { BadRequestError } from './errorHandler.js';

/**
 * Body parser middleware with size limits and error handling
 */

const DEFAULT_LIMIT = '100kb';
const DEFAULT_TYPE = 'application/json';

function parseSize(size) {
  if (typeof size === 'number') return size;

  const units = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024
  };

  const match = size.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)?$/);
  if (!match) return 100 * 1024; // Default 100kb

  const value = parseFloat(match[1]);
  const unit = match[2] || 'b';
  return value * units[unit];
}

/**
 * JSON body parser
 */
export function json(options = {}) {
  const {
    limit = DEFAULT_LIMIT,
    strict = true,
    reviver = null,
    verify = null
  } = options;

  const sizeLimit = parseSize(limit);

  return async (req, res, ctx) => {
    // Only parse if content-type is JSON
    if (!req.contentType.includes('application/json')) {
      return;
    }

    // Check content length
    if (req.contentLength > sizeLimit) {
      throw new BadRequestError(`Request body too large. Limit is ${limit}`);
    }

    try {
      const body = await req.parseBody();

      // Verify callback
      if (verify) {
        verify(req, res, body);
      }

      // Parse JSON
      if (body) {
        try {
          req.body = JSON.parse(body, reviver);
        } catch (parseError) {
          throw new BadRequestError('Invalid JSON', {
            error: parseError.message
          });
        }
      }
    } catch (error) {
      if (error instanceof BadRequestError) {
        throw error;
      }
      throw new BadRequestError('Failed to parse request body');
    }
  };
}

/**
 * URL-encoded body parser
 */
export function urlencoded(options = {}) {
  const {
    limit = DEFAULT_LIMIT,
    extended = true,
    parameterLimit = 1000
  } = options;

  const sizeLimit = parseSize(limit);

  return async (req, res, ctx) => {
    // Only parse if content-type is urlencoded
    if (!req.contentType.includes('application/x-www-form-urlencoded')) {
      return;
    }

    // Check content length
    if (req.contentLength > sizeLimit) {
      throw new BadRequestError(`Request body too large. Limit is ${limit}`);
    }

    try {
      const body = await req.parseBody();

      if (body) {
        const params = new URLSearchParams(body);
        const parsed = {};
        let count = 0;

        for (const [key, value] of params) {
          if (++count > parameterLimit) {
            throw new BadRequestError(`Too many parameters. Limit is ${parameterLimit}`);
          }

          if (extended && key.includes('[')) {
            // Handle nested parameters like user[name]=John
            const match = key.match(/^([^\[]+)\[([^\]]*)\]$/);
            if (match) {
              const [, baseKey, subKey] = match;
              if (!parsed[baseKey]) parsed[baseKey] = {};
              if (subKey) {
                parsed[baseKey][subKey] = value;
              } else {
                if (!Array.isArray(parsed[baseKey])) {
                  parsed[baseKey] = [];
                }
                parsed[baseKey].push(value);
              }
            } else {
              parsed[key] = value;
            }
          } else {
            parsed[key] = value;
          }
        }

        req.body = parsed;
      }
    } catch (error) {
      if (error instanceof BadRequestError) {
        throw error;
      }
      throw new BadRequestError('Failed to parse URL-encoded body');
    }
  };
}

/**
 * Raw body parser
 */
export function raw(options = {}) {
  const {
    limit = DEFAULT_LIMIT,
    type = 'application/octet-stream'
  } = options;

  const sizeLimit = parseSize(limit);

  return async (req, res, ctx) => {
    if (!req.contentType.includes(type)) {
      return;
    }

    if (req.contentLength > sizeLimit) {
      throw new BadRequestError(`Request body too large. Limit is ${limit}`);
    }

    const body = await req.parseBody();
    req.body = Buffer.from(body);
  };
}

/**
 * Text body parser
 */
export function text(options = {}) {
  const {
    limit = DEFAULT_LIMIT,
    type = 'text/plain',
    defaultCharset = 'utf-8'
  } = options;

  const sizeLimit = parseSize(limit);

  return async (req, res, ctx) => {
    if (!req.contentType.includes(type)) {
      return;
    }

    if (req.contentLength > sizeLimit) {
      throw new BadRequestError(`Request body too large. Limit is ${limit}`);
    }

    const body = await req.parseBody();
    req.body = body;
  };
}
