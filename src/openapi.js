/**
 * Utility for generating OpenAPI 3.0 specification from Routerling metadata.
 */

/**
 * Generates an OpenAPI 3.0 specification object.
 * 
 * @param {Map} metadata - The _metadata map from Router
 * @param {object} options - Info object (title, version, etc.)
 * @returns {object} OpenAPI specification
 */
export function generateOpenApiSpec(metadata, options = {}) {
  const spec = {
    openapi: '3.0.0',
    info: {
      title: options.title || 'Routerling API',
      version: options.version || '1.0.0',
      description: options.description || 'API Documentation'
    },
    paths: {}
  };

  for (const [key, config] of metadata.entries()) {
    const [method, subdomain, path] = key.split('|');
    const openApiMethod = method.toLowerCase();

    // Convert /path/:id to /path/{id}
    const openApiPath = path.replace(/:([a-zA-Z0-9_]+)/g, '{$1}');

    if (!spec.paths[openApiPath]) {
      spec.paths[openApiPath] = {};
    }

    const operation = {
      summary: config.summary || '',
      parameters: [],
      responses: {
        '200': { description: 'Successful response' }
      }
    };

    // Extract path parameters
    const pathParams = path.match(/:([a-zA-Z0-9_]+)/g);
    if (pathParams) {
      pathParams.forEach(param => {
        operation.parameters.push({
          name: param.substring(1),
          in: 'path',
          required: true,
          schema: { type: 'string' }
        });
      });
    }

    // Request Body
    if (config.expects) {
      operation.requestBody = {
        required: true,
        content: {
          'application/json': {
            schema: toSchema(config.expects)
          }
        }
      };
    }

    // Responses
    if (config.returns) {
      if (typeof config.returns === 'object' && !config.returns._isSchema && !config.returns.safeParse) {
        // Map of status codes
        operation.responses = {};
        for (const [status, schema] of Object.entries(config.returns)) {
          operation.responses[status] = {
            description: `Response for status ${status}`,
            content: {
              'application/json': {
                schema: toSchema(schema)
              }
            }
          };
        }
      } else {
        // Single schema
        operation.responses['200'] = {
          description: 'Successful response',
          content: {
            'application/json': {
              schema: toSchema(config.returns)
            }
          }
        };
      }
    }

    spec.paths[openApiPath][openApiMethod] = operation;
  }

  return spec;
}

/**
 * Simple translator from validator objects to JSON Schema.
 */
function toSchema(validator) {
  if (!validator) return { type: 'object' };

  // 1. Arktype support
  if (typeof validator === 'function' && validator.json) {
    return validator.json;
  }

  // 2. Common JS object/primitive fallback
  if (typeof validator === 'string') return { type: 'string' };
  if (typeof validator === 'number') return { type: 'number' };

  // 3. Fallback for unknown / generic objects
  return { type: 'object' };
}
