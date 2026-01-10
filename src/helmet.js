/**
 * Security headers middleware (Helmet-style)
 */

export function helmet(options = {}) {
  const {
    contentSecurityPolicy = true,
    xssFilter = true,
    noSniff = true,
    frameguard = true,
    hsts = true,
    ieNoOpen = true,
    referrerPolicy = true
  } = options;

  return (req, res, ctx) => {
    // X-XSS-Protection
    if (xssFilter) {
      res.setHeader('X-XSS-Protection', '1; mode=block');
    }

    // X-Content-Type-Options
    if (noSniff) {
      res.setHeader('X-Content-Type-Options', 'nosniff');
    }

    // X-Frame-Options
    if (frameguard) {
      const frameOption = typeof frameguard === 'string' ? frameguard : 'SAMEORIGIN';
      res.setHeader('X-Frame-Options', frameOption);
    }

    // Strict-Transport-Security
    if (hsts) {
      const hstsOptions = typeof hsts === 'object' ? hsts : {};
      const maxAge = hstsOptions.maxAge || 15552000; // 180 days
      const includeSubDomains = hstsOptions.includeSubDomains !== false;
      const preload = hstsOptions.preload || false;

      let hstsHeader = `max-age=${maxAge}`;
      if (includeSubDomains) hstsHeader += '; includeSubDomains';
      if (preload) hstsHeader += '; preload';

      res.setHeader('Strict-Transport-Security', hstsHeader);
    }

    // X-Download-Options
    if (ieNoOpen) {
      res.setHeader('X-Download-Options', 'noopen');
    }

    // Referrer-Policy
    if (referrerPolicy) {
      const policy = typeof referrerPolicy === 'string' ? referrerPolicy : 'no-referrer';
      res.setHeader('Referrer-Policy', policy);
    }

    // Content-Security-Policy
    if (contentSecurityPolicy) {
      const cspOptions = typeof contentSecurityPolicy === 'object' ? contentSecurityPolicy : {};
      const directives = cspOptions.directives || {
        'default-src': ["'self'"],
        'base-uri': ["'self'"],
        'font-src': ["'self'", 'https:', 'data:'],
        'form-action': ["'self'"],
        'frame-ancestors': ["'self'"],
        'img-src': ["'self'", 'data:'],
        'object-src': ["'none'"],
        'script-src': ["'self'"],
        'script-src-attr': ["'none'"],
        'style-src': ["'self'", 'https:', "'unsafe-inline'"],
        'upgrade-insecure-requests': []
      };

      const cspString = Object.entries(directives)
        .map(([key, values]) => {
          if (Array.isArray(values) && values.length === 0) {
            return key;
          }
          return `${key} ${values.join(' ')}`;
        })
        .join('; ');

      res.setHeader('Content-Security-Policy', cspString);
    }

    // X-Permitted-Cross-Domain-Policies
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  };
}
