/**
 * Custom error classes for HTTP errors
 */

export class HttpError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true; // Distinguish from programming errors
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      error: {
        message: this.message,
        statusCode: this.statusCode,
        ...(this.details && { details: this.details })
      }
    };
  }
}

export class BadRequestError extends HttpError {
  constructor(message = 'Bad Request', details = null) {
    super(message, 400, details);
    this.name = 'BadRequestError';
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message = 'Unauthorized', details = null) {
    super(message, 401, details);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends HttpError {
  constructor(message = 'Forbidden', details = null) {
    super(message, 403, details);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends HttpError {
  constructor(message = 'Not Found', details = null) {
    super(message, 404, details);
    this.name = 'NotFoundError';
  }
}

export class MethodNotAllowedError extends HttpError {
  constructor(message = 'Method Not Allowed', details = null) {
    super(message, 405, details);
    this.name = 'MethodNotAllowedError';
  }
}

export class ConflictError extends HttpError {
  constructor(message = 'Conflict', details = null) {
    super(message, 409, details);
    this.name = 'ConflictError';
  }
}

export class ValidationError extends HttpError {
  constructor(message = 'Validation Error', details = null) {
    super(message, 422, details);
    this.name = 'ValidationError';
  }
}

export class TooManyRequestsError extends HttpError {
  constructor(message = 'Too Many Requests', details = null) {
    super(message, 429, details);
    this.name = 'TooManyRequestsError';
  }
}

export class InternalServerError extends HttpError {
  constructor(message = 'Internal Server Error', details = null) {
    super(message, 500, details);
    this.name = 'InternalServerError';
  }
}

export class NotImplementedError extends HttpError {
  constructor(message = 'Not Implemented', details = null) {
    super(message, 501, details);
    this.name = 'NotImplementedError';
  }
}

export class ServiceUnavailableError extends HttpError {
  constructor(message = 'Service Unavailable', details = null) {
    super(message, 503, details);
    this.name = 'ServiceUnavailableError';
  }
}

/**
 * Error handler middleware factory
 */
export function errorHandler(options = {}) {
  const {
    showStack = process.env.NODE_ENV !== 'production',
    logger = console.error,
    onError = null
  } = options;

  return async (err, req, res, ctx) => {
    // Log the error
    if (logger) {
      logger('Error:', {
        message: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        statusCode: err.statusCode || 500
      });
    }

    // Call custom error handler if provided
    if (onError) {
      try {
        await onError(err, req, res, ctx);
      } catch (handlerError) {
        logger('Error in custom error handler:', handlerError);
      }
    }

    // Determine status code
    const statusCode = err.statusCode || err.status || 500;

    // Build error response
    const errorResponse = {
      error: {
        message: err.message || 'Internal Server Error',
        statusCode
      }
    };

    // Add details if available
    if (err.details) {
      errorResponse.error.details = err.details;
    }

    // Add stack trace in development
    if (showStack && err.stack) {
      errorResponse.error.stack = err.stack.split('\n');
    }

    // Send error response
    res.status = statusCode;
    res.json(errorResponse);
  };
}

/**
 * Async handler wrapper to catch errors
 */
export function asyncHandler(fn) {
  return async (req, res, ctx) => {
    try {
      await fn(req, res, ctx);
    } catch (error) {
      // Re-throw to be caught by error handling middleware
      throw error;
    }
  };
}

/**
 * Not found handler
 */
export function notFoundHandler() {
  return (req, res, ctx) => {
    throw new NotFoundError(`Cannot ${req.method} ${req.url}`);
  };
}
