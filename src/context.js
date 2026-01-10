/**
 * Context class for storing and retrieving typed values
 * Equivalent to Python heaven.context.Context
 */
export class Context {
  constructor(application) {
    this._application = application;
    this._data = new Map();
    this._types = new Map(); // Store type names as strings
  }

  /**
   * Store a value with its type information preserved
   */
  keep(key, value) {
    this._data.set(key, value);
    this._types.set(key, typeof value);
    return value;
  }

  /**
   * Get a value with explicit type checking and type hint preservation
   */
  getTyped(key, expectedType) {
    if (!this._data.has(key)) {
      throw new Error(`Context object has no attribute '${key}'`);
    }

    const value = this._data.get(key);
    const storedTypeName = this._types.get(key);

    // Runtime type checking
    if (storedTypeName && typeof value !== expectedType) {
      throw new TypeError(`Expected ${expectedType}, got ${storedTypeName}`);
    }

    return value;
  }

  /**
   * Get the stored type information for a key
   */
  getTypeInfo(key) {
    return this._types.get(key) || 'Unknown';
  }

  /**
   * Check if a key exists in the context
   */
  has(key) {
    return this._data.has(key);
  }

  /**
   * Get all keys in the context
   */
  keys() {
    return Array.from(this._data.keys());
  }

  /**
   * Get all values in the context
   */
  values() {
    return Array.from(this._data.values());
  }

  /**
   * Get all entries in the context
   */
  entries() {
    return Array.from(this._data.entries());
  }

  /**
   * Clear all data from the context
   */
  clear() {
    this._data.clear();
    this._types.clear();
  }

  /**
   * Delete a specific key from the context
   */
  delete(key) {
    const deleted = this._data.delete(key);
    this._types.delete(key);
    return deleted;
  }

  /**
   * Get the size of the context
   */
  get size() {
    return this._data.size;
  }

  /**
   * Create a proxy for dynamic property access
   */
  static createProxy(application) {
    const context = new Context(application);
    return new Proxy(context, {
      get(target, prop) {
        if (prop in target || prop.startsWith('_')) {
          return target[prop];
        }
        return target._data.get(prop);
      },
      set(target, prop, value) {
        if (prop.startsWith('_') || prop in target) {
          target[prop] = value;
        } else {
          target.keep(prop, value);
        }
        return true;
      },
      has(target, prop) {
        return prop in target || target._data.has(prop);
      },
      ownKeys(target) {
        return [...Object.getOwnPropertyNames(target), ...target._data.keys()];
      },
      getOwnPropertyDescriptor(target, prop) {
        if (prop in target) {
          return Object.getOwnPropertyDescriptor(target, prop);
        }
        if (target._data.has(prop)) {
          return {
            enumerable: true,
            configurable: true,
            value: target._data.get(prop)
          };
        }
        return undefined;
      }
    });
  }
}
