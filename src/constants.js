// Constants for the Heaven.js framework

export const DEFAULT = 'www';

export const INITIALIZATION_MESSAGE = '\n-------------- Initializing `ONCE` Func(s) --------------';

// HTTP Methods
export const METHOD_CONNECT = 'CONNECT';
export const METHOD_DELETE = 'DELETE';
export const METHOD_GET = 'GET';
export const METHOD_HEAD = 'HEAD';
export const METHOD_OPTIONS = 'OPTIONS';
export const METHOD_PATCH = 'PATCH';
export const METHOD_POST = 'POST';
export const METHOD_PUT = 'PUT';
export const METHOD_TRACE = 'TRACE';
export const METHOD_WEBSOCKET = 'WEBSOCKET';

export const METHODS = [
  METHOD_GET,
  METHOD_HEAD,
  METHOD_POST,
  METHOD_PUT,
  METHOD_PATCH,
  METHOD_CONNECT,
  METHOD_TRACE,
  METHOD_DELETE,
  METHOD_OPTIONS
];

// Messages
export const MESSAGE_NOT_FOUND = 'Not found';

// Lifecycle events
export const SHUTDOWN = 'shutdown';
export const STARTUP = 'startup';

// Status codes
export const STATUS_OK = 200;
export const STATUS_CREATED = 201;
export const STATUS_NOT_FOUND = 404;
export const STATUS_INTERNAL_SERVER_ERROR = 500;

// Error messages
export const URL_ERROR_MESSAGE = 'Malformed route detected, all routes must start with a `/`';

// Wildcards
export const WILDCARD = '*';

// Template errors
export const NO_TEMPLATING = 'NO_TEMPLATING';
export const ASYNC_RENDER = 'ASYNC_RENDER';
