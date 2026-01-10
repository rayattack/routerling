import nunjucks from 'nunjucks';
import fs from 'fs/promises';
import path from 'path';

/**
 * Template class for individual templates
 */
class Template {
  constructor(name, content, environment, isAsync = false) {
    this.name = name;
    this.content = content;
    this.environment = environment;
    this.isAsync = isAsync;
    this.compiled = null;
  }

  /**
   * Render template synchronously
   */
  render(context = {}) {
    if (this.isAsync) {
      throw new Error('Cannot render async template synchronously');
    }
    return this.environment.renderString(this.content, context);
  }

  /**
   * Render template asynchronously
   */
  async renderAsync(context = {}) {
    return new Promise((resolve, reject) => {
      this.environment.renderString(this.content, context, (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    });
  }
}

/**
 * Templater class for managing Nunjucks templates
 * Equivalent to Python heaven template system
 */
export class Templater {
  constructor(templatePath, options = {}) {
    this.templatePath = templatePath;
    this.isAsync = options.asynchronous !== false; // Default to async
    this.templates = new Map();
    this.cache = options.cache !== false; // Default to cache
    this.extension = options.extension || '.njk';

    // Initialize Nunjucks environment
    this.environment = new nunjucks.Environment(
      new nunjucks.FileSystemLoader(templatePath, {
        noCache: !this.cache,
        watch: options.watch || false
      }),
      {
        autoescape: options.autoescape !== false, // Default to true
        throwOnUndefined: options.throwOnUndefined || false,
        trimBlocks: options.trimBlocks || false,
        lstripBlocks: options.lstripBlocks || false
      }
    );

    // Add built-in filters and globals
    this._setupBuiltins();
  }

  /**
   * Setup built-in filters and globals
   */
  _setupBuiltins() {
    // Add some useful filters
    this.environment.addFilter('json', (obj) => JSON.stringify(obj));
    this.environment.addFilter('length', (obj) => obj ? obj.length : 0);
    this.environment.addFilter('keys', (obj) => obj ? Object.keys(obj) : []);
    this.environment.addFilter('values', (obj) => obj ? Object.values(obj) : []);

    // Add date filter for basic date formatting
    this.environment.addFilter('date', (date, format) => {
      const d = new Date(date);
      if (isNaN(d.getTime())) return date;

      // Simple date formatting (basic implementation)
      if (format === 'Y-m-d H:i:s') {
        return d.toISOString().replace('T', ' ').substring(0, 19);
      }
      return d.toISOString();
    });

    // Add global functions
    this.environment.addGlobal('now', () => new Date());
    this.environment.addGlobal('timestamp', () => Date.now());
  }

  /**
   * Get template by name
   */
  async getTemplate(name) {
    // Add extension if not present
    if (!name.endsWith(this.extension) && !name.includes('.')) {
      name = name + this.extension;
    }

    // Check cache first
    if (this.cache && this.templates.has(name)) {
      return this.templates.get(name);
    }

    // Load template from file
    const templatePath = path.join(this.templatePath, name);

    try {
      const content = await fs.readFile(templatePath, 'utf-8');
      const template = new Template(name, content, this.environment, this.isAsync);

      if (this.cache) {
        this.templates.set(name, template);
      }

      return template;
    } catch (error) {
      throw new Error(`Template '${name}' not found: ${error.message}`);
    }
  }

  /**
   * Get template synchronously (for sync mode)
   */
  getTemplateSync(name) {
    if (this.isAsync) {
      throw new Error('Cannot get template synchronously in async mode');
    }

    // Add extension if not present
    if (!name.endsWith(this.extension) && !name.includes('.')) {
      name = name + this.extension;
    }

    // Check cache first
    if (this.cache && this.templates.has(name)) {
      return this.templates.get(name);
    }

    // Load template from file synchronously
    const templatePath = path.join(this.templatePath, name);

    try {
      const content = require('fs').readFileSync(templatePath, 'utf-8');
      const template = new Template(name, content, this.environment, this.isAsync);

      if (this.cache) {
        this.templates.set(name, template);
      }

      return template;
    } catch (error) {
      throw new Error(`Template '${name}' not found: ${error.message}`);
    }
  }

  /**
   * Clear template cache
   */
  clearCache() {
    this.templates.clear();
  }

  /**
   * Check if template exists
   */
  async hasTemplate(name) {
    if (!name.endsWith(this.extension) && !name.includes('.')) {
      name = name + this.extension;
    }

    const templatePath = path.join(this.templatePath, name);

    try {
      await fs.access(templatePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * List all available templates
   */
  async listTemplates() {
    try {
      const files = await fs.readdir(this.templatePath);
      return files.filter(file => file.endsWith(this.extension));
    } catch (error) {
      throw new Error(`Cannot list templates: ${error.message}`);
    }
  }

  /**
   * Render template directly
   */
  async render(name, context = {}) {
    // Add extension if not present
    if (!name.endsWith(this.extension) && !name.includes('.')) {
      name = name + this.extension;
    }

    if (this.isAsync) {
      return new Promise((resolve, reject) => {
        this.environment.render(name, context, (err, result) => {
          if (err) {
            reject(err);
          } else {
            resolve(result);
          }
        });
      });
    } else {
      return this.environment.render(name, context);
    }
  }

  /**
   * Render template synchronously
   */
  renderSync(name, context = {}) {
    // Add extension if not present
    if (!name.endsWith(this.extension) && !name.includes('.')) {
      name = name + this.extension;
    }

    return this.environment.render(name, context);
  }

  /**
   * Add custom filter
   */
  addFilter(name, func) {
    this.environment.addFilter(name, func);
  }

  /**
   * Add custom global
   */
  addGlobal(name, value) {
    this.environment.addGlobal(name, value);
  }

  /**
   * Add custom extension
   */
  addExtension(name, extension) {
    this.environment.addExtension(name, extension);
  }

  /**
   * Set custom delimiters (Nunjucks uses different syntax)
   */
  setDelimiters(variableStart, variableEnd, blockStart, blockEnd) {
    // Nunjucks allows custom tag delimiters
    this.environment.opts.tags = {
      blockStart: blockStart || '{%',
      blockEnd: blockEnd || '%}',
      variableStart: variableStart || '{{',
      variableEnd: variableEnd || '}}'
    };
  }

  /**
   * Register helper functions as globals
   */
  addHelper(name, func) {
    this.environment.addGlobal(name, func);
  }
}
