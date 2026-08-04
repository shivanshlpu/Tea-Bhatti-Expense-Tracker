import { Router, Request, Response, NextFunction } from 'express';
import { SignupSchema, LoginSchema, ForgotPasswordSchema, ResetPasswordSchema } from '@shop-finance/shared';
import * as authService from '../services/authService';
import { authRateLimiter } from '../middleware/rateLimiter';
import { env } from '../config/env';

const router = Router();

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/api/auth',
};

/**
 * POST /api/auth/signup
 */
router.post('/signup', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = SignupSchema.parse(req.body);
    const result = await authService.signup(input);

    // Set refresh token as HttpOnly cookie
    res.cookie('refreshToken', result.refreshToken, REFRESH_COOKIE_OPTIONS);

    res.status(201).json({
      success: true,
      data: {
        accessToken: result.accessToken,
        shop: result.shop,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/login
 * Rate-limited: 5 attempts per 15 minutes per mobile+IP
 */
router.post('/login', authRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = LoginSchema.parse(req.body);
    const result = await authService.login(input);

    res.cookie('refreshToken', result.refreshToken, REFRESH_COOKIE_OPTIONS);

    res.json({
      success: true,
      data: {
        accessToken: result.accessToken,
        shop: result.shop,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/refresh
 * Uses the HttpOnly refresh token cookie to issue a new access token.
 */
router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const oldRefreshToken = req.cookies?.refreshToken;
    if (!oldRefreshToken) {
      res.status(401).json({ success: false, error: 'No refresh token provided' });
      return;
    }

    const result = await authService.refreshAccessToken(oldRefreshToken);

    res.cookie('refreshToken', result.refreshToken, REFRESH_COOKIE_OPTIONS);

    res.json({
      success: true,
      data: { accessToken: result.accessToken },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/logout
 * Invalidates the refresh token and clears the cookie.
 */
router.post('/logout', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (refreshToken) {
      await authService.logout(refreshToken);
    }

    res.clearCookie('refreshToken', { path: '/api/auth' });

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/forgot-password
 */
router.post('/forgot-password', authRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = ForgotPasswordSchema.parse(req.body);
    const result = await authService.forgotPassword(input.mobile);

    res.json({
      success: true,
      message: result.message,
      // Only in development: expose reset token for testing
      ...(result.resetToken && { resetToken: result.resetToken }),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/reset-password
 */
router.post('/reset-password', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = ResetPasswordSchema.parse(req.body);
    await authService.resetPassword(input.token, input.newPassword);

    res.json({ success: true, message: 'Password reset successfully. Please log in.' });
  } catch (err) {
    next(err);
  }
});

export default router;
