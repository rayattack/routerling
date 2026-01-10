import { DEFAULT } from './constants.js';
import { isIP } from 'net';

/**
 * Convert buffer or string to string
 */
export const bufferOrString = (x) => {
  if (Buffer.isBuffer(x)) {
    return x.toString();
  }
  return x;
};

/**
 * Process request headers and extract subdomain information
 */
export function preprocessor(req) {
  const headers = {};

  // Convert headers to lowercase and handle multiple values
  for (const [key, value] of Object.entries(req.headers)) {
    const lowerKey = key.toLowerCase();
    const existing = headers[lowerKey];
    if (existing) {
      if (Array.isArray(existing)) {
        existing.push(value);
      } else {
        headers[lowerKey] = [existing, value];
      }
    } else {
      headers[lowerKey] = value;
    }
  }

  let host = headers.host;
  if (!host) {
    return [DEFAULT, headers];
  }

  // Remove protocol if present
  if (host.startsWith('http://')) {
    host = host.replace('http://', '');
  } else if (host.startsWith('https://')) {
    host = host.replace('https://', '');
  }

  // Remove port
  host = host.split(':')[0];

  // Check if it's an IP address
  if (isIP(host)) {
    return [DEFAULT, headers];
  }

  const parts = host.split('.');
  const hasSubdomain = parts.length > 2;

  return hasSubdomain ? [parts[0], headers] : [DEFAULT, headers];
}

/**
 * Lookup class for nested object access with dot notation
 */
export class Lookup {
  constructor(data = {}) {
    this._data = data;
  }

  get(key) {
    const value = this._data[key];
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      return new Lookup(value);
    }
    return value;
  }

  set(key, value) {
    this._data[key] = value;
  }

  // Proxy handler for dynamic property access
  static createProxy(data = {}) {
    const lookup = new Lookup(data);
    return new Proxy(lookup, {
      get(target, prop) {
        if (prop in target) {
          return target[prop];
        }
        return target.get(prop);
      },
      set(target, prop, value) {
        if (prop.startsWith('_') || prop in target) {
          target[prop] = value;
        } else {
          target.set(prop, value);
        }
        return true;
      }
    });
  }
}

/**
 * Convert string handler reference to actual function
 */
export function stringToFunctionHandler(handler) {
  if (typeof handler === 'string') {
    // For now, just return a placeholder function
    // In a real implementation, you'd dynamically import the module
    return async (req, res, ctx) => {
      throw new Error(`String handler not implemented: ${handler}`);
    };
  }
  return handler;
}

/**
 * Check if a route segment is a parameter (starts with :)
 * Returns [segment, paramName, typeHint]
 * Examples:
 *   :id -> [':id', 'id', null]
 *   :id:int -> [':id:int', 'id', 'int']
 *   :name:string -> [':name:string', 'name', 'string']
 */
export function isParam(segment) {
  if (segment.startsWith(':')) {
    const parts = segment.slice(1).split(':');
    const paramName = parts[0];
    const typeHint = parts[1] || null;
    return [segment, paramName, typeHint];
  }
  return [segment, null, null];
}

/**
 * Coerce a value based on type hint
 */
export function coerceType(value, typeHint) {
  if (!typeHint || value === undefined || value === null) {
    return value;
  }

  switch (typeHint.toLowerCase()) {
    case 'int':
    case 'integer':
      const intVal = parseInt(value, 10);
      return isNaN(intVal) ? value : intVal;

    case 'float':
    case 'number':
      const floatVal = parseFloat(value);
      return isNaN(floatVal) ? value : floatVal;

    case 'bool':
    case 'boolean':
      if (value === 'true' || value === '1') return true;
      if (value === 'false' || value === '0') return false;
      return Boolean(value);

    case 'string':
    case 'str':
      return String(value);

    default:
      return value;
  }
}

/**
 * Parse query string into object
 */
export function parseQueryString(queryString) {
  const params = {};
  if (!queryString) {
    return params;
  }

  const pairs = queryString.split('&');
  for (const pair of pairs) {
    const [key, value] = pair.split('=').map(decodeURIComponent);
    if (key) {
      const existing = params[key];
      if (existing) {
        if (Array.isArray(existing)) {
          existing.push(value || '');
        } else {
          params[key] = [existing, value || ''];
        }
      } else {
        params[key] = value || '';
      }
    }
  }
  return params;
}
