import crypto from 'crypto';

/**
 * Logging middleware with request tracking
 */

const LOG_LEVELS = {
  SILENT: 0,
  ERROR: 1,
  WARN: 2,
  INFO: 3,
  DEBUG: 4
};

export function logger(options = {}) {
  const {
    level = 'INFO',
    format = 'combined', // 'combined', 'common', 'dev', 'short', 'tiny'
    skip = null, // Function to skip logging for certain requests
    stream = process.stdout,
    generateRequestId = true
  } = options;

  const logLevel = LOG_LEVELS[level.toUpperCase()] || LOG_LEVELS.INFO;

  return (req, res, ctx) => {
    // Skip if needed
    if (skip && skip(req, res)) {
      return;
    }

    // Generate request ID
    if (generateRequestId) {
      const requestId = crypto.randomBytes(16).toString('hex');
      ctx.requestId = requestId;
      req.id = requestId;
      res.setHeader('X-Request-ID', requestId);
    }

    // Record start time
    const startTime = Date.now();
    ctx.startTime = startTime;

    // Store original send method
    const originalSend = res.send.bind(res);

    // Override send method to log after response
    res.send = function () {
      const duration = Date.now() - startTime;
      const logEntry = formatLog(format, req, res, duration, ctx);

      if (logLevel >= LOG_LEVELS.INFO) {
        stream.write(logEntry + '\n');
      }

      return originalSend();
    };
  };
}

/**
 * Format log entry based on format type
 */
function formatLog(format, req, res, duration, ctx) {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.url;
  const status = res._status;
  const contentLength = res.getHeader('content-length') || '-';
  const userAgent = req.userAgent || '-';
  const ip = req.ip;
  const requestId = ctx.requestId || '-';

  switch (format) {
    case 'combined':
      // Apache combined log format
      return `${ip} - - [${timestamp}] "${method} ${url} HTTP/1.1" ${status} ${contentLength} "-" "${userAgent}"`;

    case 'common':
      // Apache common log format
      return `${ip} - - [${timestamp}] "${method} ${url} HTTP/1.1" ${status} ${contentLength}`;

    case 'dev':
      // Colored output for development
      const statusColor = getStatusColor(status);
      return `${method} ${url} ${statusColor}${status}\x1b[0m ${duration}ms - ${contentLength}`;

    case 'short':
      return `${ip} ${method} ${url} ${status} ${contentLength} - ${duration}ms`;

    case 'tiny':
      return `${method} ${url} ${status} ${contentLength} - ${duration}ms`;

    case 'json':
      return JSON.stringify({
        timestamp,
        requestId,
        method,
        url,
        status,
        duration,
        contentLength,
        ip,
        userAgent
      });

    default:
      return `[${timestamp}] ${requestId} ${method} ${url} ${status} ${duration}ms`;
  }
}

/**
 * Get ANSI color code for status
 */
function getStatusColor(status) {
  if (status >= 500) return '\x1b[31m'; // Red
  if (status >= 400) return '\x1b[33m'; // Yellow
  if (status >= 300) return '\x1b[36m'; // Cyan
  if (status >= 200) return '\x1b[32m'; // Green
  return '\x1b[0m'; // Reset
}

/**
 * Create a custom logger instance
 */
export class Logger {
  constructor(options = {}) {
    this.level = LOG_LEVELS[options.level?.toUpperCase()] || LOG_LEVELS.INFO;
    this.stream = options.stream || process.stdout;
    this.prefix = options.prefix || '';
  }

  log(level, message, meta = {}) {
    const logLevel = LOG_LEVELS[level.toUpperCase()];

    if (logLevel > this.level) {
      return;
    }

    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...meta
    };

    if (this.prefix) {
      logEntry.prefix = this.prefix;
    }

    this.stream.write(JSON.stringify(logEntry) + '\n');
  }

  error(message, meta) {
    this.log('ERROR', message, meta);
  }

  warn(message, meta) {
    this.log('WARN', message, meta);
  }

  info(message, meta) {
    this.log('INFO', message, meta);
  }

  debug(message, meta) {
    this.log('DEBUG', message, meta);
  }
}
