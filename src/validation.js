/**
 * Validation utility for the SCHEMA feature.
 */

/**
 * Creates an interceptor that validates request data against a schema.
 * Supports Arktype, Zod (via adapter), or any validator returning { data, problems } | { success, data, error }.
 * 
 * @param {object} schemaConfig - The configuration from router.SCHEMA
 * @returns {function} An interceptor function
 */
export function createValidationInterceptor(schemaConfig) {
  const {
    expects,
    returns,
    failOnInput = true,
    failOnOutput = false,
    logError = []
  } = schemaConfig;

  return (handler) => async (req, res, ctx) => {
    // 1. Input Validation (Request Body)
    if (expects) {
      const result = validate(expects, req.body);

      if (result.problems) {
        if (logError.includes('input')) {
          console.error('[Validation Error - Input]:', result.problems);
        }

        if (failOnInput) {
          res.status = 422;
          return res.abort({
            error: 'Validation Failed',
            details: result.problems
          });
        }
      } else {
        // Replace body with validated/coerced data if available
        req.body = result.data !== undefined ? result.data : req.body;
      }
    }

    // 2. Execute the handler
    await handler(req, res, ctx);

    // 3. Output Validation (Response Body)
    if (returns && res.body) {
      // Try to find schema for the current status code or use default
      const outputSchema = returns[res.status] || returns.default || (typeof returns !== 'object' || returns._isSchema ? returns : null);

      if (outputSchema) {
        let bodyToValidate = res.body;
        // Parse body if it's a string (since response.body setter stringifies)
        if (typeof res.body === 'string' && res.getHeader('content-type')?.includes('application/json')) {
          try { bodyToValidate = JSON.parse(res.body); } catch (e) { }
        }

        const result = validate(outputSchema, bodyToValidate);

        if (result.problems) {
          if (logError.includes('output')) {
            console.error('[Validation Error - Output]:', result.problems);
          }

          if (failOnOutput) {
            res.status = 500;
            return res.abort({
              error: 'Internal Server Error',
              message: 'Output validation failed'
            });
          }
        }
      }
    }
  };
}

/**
 * Generic validator adapter.
 * Attempts to extract data and problems from various library formats.
 */
function validate(schema, data) {
  // Arktype style: schema(data) -> { data, problems }
  if (typeof schema === 'function') {
    const result = schema(data);
    if (result && (result.problems || result.data !== undefined)) {
      return {
        data: result.data,
        problems: result.problems ? result.problems.summary || result.problems : null
      };
    }
  }

  // Zod style: schema.safeParse(data) -> { success, data, error }
  if (schema && typeof schema.safeParse === 'function') {
    const result = schema.safeParse(data);
    return {
      data: result.data,
      problems: !result.success ? result.error.format() : null
    };
  }

  // Fallback / Unknown
  return { data, problems: null };
}
