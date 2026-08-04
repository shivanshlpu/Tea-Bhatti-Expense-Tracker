import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { AppError } from './errorHandler';

const CSRF_COOKIE_NAME = '_csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';

/**
 * Double-submit cookie pattern for CSRF protection.
 *
 * Requests authenticated via `Authorization: Bearer <token>` are inherently
 * immune to CSRF because browsers never automatically attach custom Authorization headers.
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  // Generate CSRF token if not present
  let csrfToken = req.cookies?.[CSRF_COOKIE_NAME];

  if (!csrfToken) {
    csrfToken = crypto.randomBytes(32).toString('hex');
    res.cookie(CSRF_COOKIE_NAME, csrfToken, {
      httpOnly: false, // Client JS needs to read this to send as header
      secure: process.env.NODE_ENV === 'production',
      sameSite: (process.env.NODE_ENV === 'production' ? 'none' : 'lax') as any,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }

  // Safe methods don't need CSRF validation
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    next();
    return;
  }

  // Requests with Bearer Authorization header are immune to CSRF
  if (req.headers.authorization?.startsWith('Bearer ')) {
    next();
    return;
  }

  // Auth endpoints (login, signup, refresh) & assistant queries are exempt from CSRF checks
  if (req.path.startsWith('/api/auth/') || req.path.includes('/assistant/')) {
    next();
    return;
  }

  // State-changing cookie-authenticated requests must include matching CSRF header
  const headerToken = req.headers[CSRF_HEADER_NAME] as string | undefined;

  if (!headerToken || headerToken !== csrfToken) {
    throw new AppError('Invalid or missing CSRF token', 403);
  }

  next();
}
