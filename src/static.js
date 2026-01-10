import fs from 'fs/promises';
import path from 'path';
import { createReadStream } from 'fs';
import mime from 'mime-types';

/**
 * Static file handler for serving assets
 * Equivalent to Python heaven static file serving
 */
export class StaticFileHandler {
  constructor(assetsPath, options = {}) {
    this.assetsPath = path.resolve(assetsPath);
    this.maxAge = options.maxAge || 86400; // 1 day default
    this.etag = options.etag !== false; // Default to true
    this.lastModified = options.lastModified !== false; // Default to true
    this.index = options.index || ['index.html', 'index.htm'];
    this.dotfiles = options.dotfiles || 'ignore'; // ignore, allow, deny
    this.prefix = options.prefix || '';
    if (this.prefix && !this.prefix.startsWith('/')) {
      this.prefix = '/' + this.prefix;
    }
    if (this.prefix && this.prefix.endsWith('/')) {
      this.prefix = this.prefix.slice(0, -1);
    }
  }

  /**
   * Serve a static file
   */
  async serve(req, res) {
    try {
      let urlPath = req.url;

      // Strip prefix if present
      if (this.prefix && urlPath.startsWith(this.prefix)) {
        urlPath = urlPath.slice(this.prefix.length);
        // Ensure strictly that we are left with a path starting with / or empty
        if (!urlPath.startsWith('/')) {
          urlPath = '/' + urlPath;
        }
      }

      // Security check - prevent directory traversal
      if (urlPath.includes('..') || urlPath.includes('\0')) {
        return false;
      }

      // Remove leading slash and query string
      const cleanPath = urlPath.replace(/^\/+/, '').split('?')[0];

      // Handle dotfiles
      if (this.dotfiles === 'deny' && this.isDotfile(cleanPath)) {
        return false;
      }
      if (this.dotfiles === 'ignore' && this.isDotfile(cleanPath)) {
        return false;
      }

      const filePath = path.join(this.assetsPath, cleanPath);

      // Ensure the file is within the assets directory
      if (!filePath.startsWith(this.assetsPath)) {
        return false;
      }

      // Check if file exists
      let stats;
      try {
        stats = await fs.stat(filePath);
      } catch {
        // If it's a directory, try index files
        if (cleanPath === '' || cleanPath.endsWith('/')) {
          return await this.serveIndex(path.join(this.assetsPath, cleanPath), req, res);
        }
        return false;
      }

      // If it's a directory, try index files
      if (stats.isDirectory()) {
        return await this.serveIndex(filePath, req, res);
      }

      // Serve the file
      return await this.serveFile(filePath, stats, req, res);
    } catch (error) {
      console.error('Static file serving error:', error);
      return false;
    }
  }

  /**
   * Serve index file from directory
   */
  async serveIndex(dirPath, req, res) {
    for (const indexFile of this.index) {
      const indexPath = path.join(dirPath, indexFile);
      try {
        const stats = await fs.stat(indexPath);
        if (stats.isFile()) {
          return await this.serveFile(indexPath, stats, req, res);
        }
      } catch {
        continue;
      }
    }
    return false;
  }

  /**
   * Serve a specific file
   */
  async serveFile(filePath, stats, req, res) {
    const mtime = stats.mtime.toUTCString();
    const etag = this.etag ? `"${stats.size}-${stats.mtime.getTime()}"` : null;

    // Check if-modified-since
    if (this.lastModified && req.headers['if-modified-since']) {
      const ifModifiedSince = new Date(req.headers['if-modified-since']);
      if (stats.mtime <= ifModifiedSince) {
        res.status = 304;
        res.send();
        return true;
      }
    }

    // Check if-none-match (ETag)
    if (etag && req.headers['if-none-match'] === etag) {
      res.status = 304;
      res.send();
      return true;
    }

    // Set headers
    const contentType = mime.lookup(filePath) || 'application/octet-stream';
    res.setHeader('content-type', contentType);
    res.setHeader('content-length', stats.size);

    if (this.lastModified) {
      res.setHeader('last-modified', mtime);
    }

    if (etag) {
      res.setHeader('etag', etag);
    }

    if (this.maxAge > 0) {
      res.setHeader('cache-control', `public, max-age=${this.maxAge}`);
    }

    // Handle range requests
    const range = req.headers.range;
    if (range) {
      return this.serveRange(filePath, stats, range, req, res);
    }

    // Stream the file
    res.status = 200;

    return new Promise((resolve, reject) => {
      const stream = createReadStream(filePath);

      stream.on('error', (error) => {
        console.error('File stream error:', error);
        resolve(false);
      });

      stream.on('end', () => {
        resolve(true);
      });

      stream.pipe(res._res);
    });
  }

  /**
   * Serve partial content (range requests)
   */
  async serveRange(filePath, stats, range, req, res) {
    const ranges = this.parseRange(range, stats.size);

    if (!ranges || ranges.length === 0) {
      res.setHeader('content-range', `bytes */${stats.size}`);
      res.status = 416;
      res.send();
      return true;
    }

    // For simplicity, only handle single range requests
    const { start, end } = ranges[0];
    const contentLength = end - start + 1;

    res.status = 206;
    res.setHeader('content-range', `bytes ${start}-${end}/${stats.size}`);
    res.setHeader('content-length', contentLength);
    res.setHeader('accept-ranges', 'bytes');

    return new Promise((resolve, reject) => {
      const stream = createReadStream(filePath, { start, end });

      stream.on('error', (error) => {
        console.error('Range stream error:', error);
        resolve(false);
      });

      stream.on('end', () => {
        resolve(true);
      });

      stream.pipe(res._res);
    });
  }

  /**
   * Parse range header
   */
  parseRange(range, size) {
    if (!range.startsWith('bytes=')) {
      return null;
    }

    const ranges = [];
    const parts = range.slice(6).split(',');

    for (const part of parts) {
      const [startStr, endStr] = part.trim().split('-');

      let start = parseInt(startStr, 10);
      let end = parseInt(endStr, 10);

      if (isNaN(start) && isNaN(end)) {
        continue;
      }

      if (isNaN(start)) {
        start = size - end;
        end = size - 1;
      } else if (isNaN(end)) {
        end = size - 1;
      }

      if (start < 0 || end >= size || start > end) {
        continue;
      }

      ranges.push({ start, end });
    }

    return ranges;
  }

  /**
   * Check if path contains dotfiles
   */
  isDotfile(filePath) {
    const parts = filePath.split('/');
    return parts.some(part => part.startsWith('.') && part !== '.' && part !== '..');
  }

  /**
   * Get MIME type for file
   */
  getMimeType(filePath) {
    return mime.lookup(filePath) || 'application/octet-stream';
  }

  /**
   * Check if file should be compressed
   */
  shouldCompress(filePath) {
    const compressibleTypes = [
      'text/',
      'application/javascript',
      'application/json',
      'application/xml',
      'application/css'
    ];

    const mimeType = this.getMimeType(filePath);
    return compressibleTypes.some(type => mimeType.startsWith(type));
  }
}
