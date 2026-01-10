import formidable from 'formidable';

/**
 * Form class for handling multipart form data
 * Equivalent to Python heaven.form.Form
 */
export class Form {
  constructor(req) {
    this._data = {};
    this._files = {};
    this._parsed = false;
    this._req = req;
  }

  /**
   * Parse the form data from the request
   */
  async parse() {
    if (this._parsed) {
      return;
    }

    const form = formidable({
      multiples: true,
      keepExtensions: true
    });

    try {
      const [fields, files] = await form.parse(this._req);

      // Convert formidable format to our format
      for (const [key, value] of Object.entries(fields)) {
        this._data[key] = Array.isArray(value) && value.length === 1 ? value[0] : value;
      }

      for (const [key, value] of Object.entries(files)) {
        this._files[key] = Array.isArray(value) && value.length === 1 ? value[0] : value;
      }

      this._parsed = true;
    } catch (error) {
      throw new Error(`Failed to parse form data: ${error.message}`);
    }
  }

  /**
   * Get a form field value
   */
  get(key) {
    return this._data[key];
  }

  /**
   * Get a file from the form
   */
  getFile(key) {
    return this._files[key];
  }

  /**
   * Get all form fields
   */
  getFields() {
    return { ...this._data };
  }

  /**
   * Get all files
   */
  getFiles() {
    return { ...this._files };
  }

  /**
   * Check if a field exists
   */
  has(key) {
    return key in this._data;
  }

  /**
   * Check if a file exists
   */
  hasFile(key) {
    return key in this._files;
  }

  /**
   * Get all field keys
   */
  keys() {
    return Object.keys(this._data);
  }

  /**
   * Get all file keys
   */
  fileKeys() {
    return Object.keys(this._files);
  }

  /**
   * Create a proxy for dynamic property access
   */
  static createProxy(req) {
    const form = new Form(req);
    return new Proxy(form, {
      get(target, prop) {
        if (prop in target || prop.startsWith('_')) {
          return target[prop];
        }
        return target.get(prop);
      },
      has(target, prop) {
        return prop in target || target.has(prop);
      },
      ownKeys(target) {
        return [...Object.getOwnPropertyNames(target), ...target.keys()];
      },
      getOwnPropertyDescriptor(target, prop) {
        if (prop in target) {
          return Object.getOwnPropertyDescriptor(target, prop);
        }
        if (target.has(prop)) {
          return {
            enumerable: true,
            configurable: true,
            value: target.get(prop)
          };
        }
        return undefined;
      }
    });
  }
}

/**
 * Parse simple URL-encoded form data
 */
export function parseUrlEncoded(body) {
  const data = {};
  if (!body) {
    return data;
  }

  const pairs = body.split('&');
  for (const pair of pairs) {
    const [key, value] = pair.split('=').map(decodeURIComponent);
    if (key) {
      const existing = data[key];
      if (existing) {
        if (Array.isArray(existing)) {
          existing.push(value || '');
        } else {
          data[key] = [existing, value || ''];
        }
      } else {
        data[key] = value || '';
      }
    }
  }
  return data;
}
