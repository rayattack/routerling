import { parse as parseCookies, serialize as serializeCookie } from 'cookie';

/**
 * Flash message middleware
 * Provides a way to store ephemeral messages between requests using cookies
 * 
 * Usage:
 * app.use(flash());
 * 
 * In handler:
 * res.flash('success', 'Saved successfully');
 * 
 * In template:
 * {{ ctx.flash.success }}
 */
export const flash = (options = {}) => {
  const cookieName = options.key || 'routerling_flash';
  const maxAge = options.maxAge || 60; // Default 1 minute

  return async (req, res, ctx) => {
    // 1. Read flash from cookie
    const cookies = parseCookies(req.headers.cookie || '');
    const rawFlash = cookies[cookieName];

    let flashData = {};
    if (rawFlash) {
      try {
        flashData = JSON.parse(rawFlash);
      } catch (e) {
        // Invalid json, ignore
      }

      // Clear cookie immediately so it's only shown once
      // We set expiries to now/past to remove it
      res.setHeader('Set-Cookie', serializeCookie(cookieName, '', {
        path: '/',
        expires: new Date(0),
        httpOnly: true,
        sameSite: 'Lax'
      }));
    }

    // Expose to context (for templates)
    ctx.flash = flashData;

    // Internal pending flash for this request
    ctx._pendingFlash = {};

    // 2. Add helper to response
    res.flash = (type, message) => {
      if (!ctx._pendingFlash[type]) {
        ctx._pendingFlash[type] = [];
      }
      ctx._pendingFlash[type].push(message);

      // Serialize and set cookie
      // Note: This overwrites previous set-cookie for flash if called multiple times
      // We need to re-serialize the whole object
      const value = JSON.stringify(ctx._pendingFlash);
      const serialized = serializeCookie(cookieName, value, {
        path: '/',
        maxAge: maxAge,
        httpOnly: true,
        sameSite: 'Lax'
      });

      // We need to carefully append/update Set-Cookie header
      // The Response.setCookie helper (if exists) handles array of cookies
      // But here we are manually managing it to ensure we don't duplicate conflict

      // Use res.setCookie if available or manual
      if (typeof res.setCookie === 'function') {
        res.setCookie(cookieName, value, {
          path: '/',
          maxAge: maxAge,
          httpOnly: true,
          sameSite: 'Lax'
        });
      } else {
        // Fallback manual manipulation
        let existing = res.getHeader('set-cookie') || [];
        if (!Array.isArray(existing)) existing = [existing];

        // Filter out our flash cookie if already set in this response
        existing = existing.filter(c => !c.startsWith(`${cookieName}=`));
        existing.push(serialized);

        res.setHeader('set-cookie', existing);
      }
    };
  };
};
