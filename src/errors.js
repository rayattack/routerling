// Custom error classes for Heaven.js

export class AbortException extends Error {
  constructor(message) {
    super(message);
    this.name = 'AbortException';
  }
}

export class SubdomainError extends Error {
  constructor(message) {
    super(message);
    this.name = 'SubdomainError';
  }
}

export class UrlError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UrlError';
  }
}

export class UrlDuplicateError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UrlDuplicateError';
  }
}
