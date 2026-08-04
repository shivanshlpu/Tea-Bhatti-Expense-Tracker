import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '../config/prisma';
import redis from '../config/redis';
import { env } from '../config/env';
import { AppError } from '../middleware/errorHandler';
import { AuthUser } from '../middleware/auth';
import type { SignupInput, LoginInput } from '@shop-finance/shared';

const BCRYPT_COST = 12;
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY_SECONDS = 7 * 24 * 60 * 60; // 7 days
const REFRESH_TOKEN_FAMILY_PREFIX = 'rt_family:';
const RESET_TOKEN_PREFIX = 'reset:';
const RESET_TOKEN_EXPIRY = 15 * 60; // 15 minutes

/**
 * Generate JWT access token (short-lived, 15 minutes)
 */
function generateAccessToken(user: AuthUser): string {
  return jwt.sign(
    { userId: user.userId, shopId: user.shopId, role: user.role },
    env.JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
}

/**
 * Generate opaque refresh token + store in Redis with family tracking.
 * Family tracking enables reuse detection: if a refresh token is used twice,
 * the entire family is invalidated (force logout all sessions).
 */
async function generateRefreshToken(userId: string, shopId: string): Promise<string> {
  const token = crypto.randomBytes(64).toString('hex');
  const familyId = crypto.randomBytes(16).toString('hex');

  // Store: token → { userId, shopId, familyId }
  await redis.setex(
    `refresh:${token}`,
    REFRESH_TOKEN_EXPIRY_SECONDS,
    JSON.stringify({ userId, shopId, familyId })
  );

  // Store: family → token (for reuse detection)
  await redis.setex(
    `${REFRESH_TOKEN_FAMILY_PREFIX}${familyId}`,
    REFRESH_TOKEN_EXPIRY_SECONDS,
    token
  );

  return token;
}

/**
 * Sign up a new shop + owner.
 */
export async function signup(input: SignupInput) {
  // Check if mobile already exists
  const existingShop = await prisma.shop.findUnique({ where: { mobile: input.mobile } });
  if (existingShop) {
    throw new AppError('A shop with this mobile number already exists', 409);
  }

  if (input.email) {
    const existingEmail = await prisma.shop.findUnique({ where: { email: input.email } });
    if (existingEmail) {
      throw new AppError('A shop with this email already exists', 409);
    }
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST);

  // Create shop + owner user in a single transaction
  const result = await prisma.$transaction(async (tx) => {
    const shop = await tx.shop.create({
      data: {
        name: input.shopName,
        ownerName: input.ownerName,
        mobile: input.mobile,
        email: input.email || null,
        passwordHash,
      },
    });

    const user = await tx.user.create({
      data: {
        shopId: shop.id,
        role: 'OWNER',
        mobile: input.mobile,
        passwordHash,
      },
    });

    return { shop, user };
  });

  const accessToken = generateAccessToken({
    userId: result.user.id,
    shopId: result.shop.id,
    role: 'OWNER',
  });

  const refreshToken = await generateRefreshToken(result.user.id, result.shop.id);

  return {
    accessToken,
    refreshToken,
    shop: {
      id: result.shop.id,
      name: result.shop.name,
      ownerName: result.shop.ownerName,
      mobile: result.shop.mobile,
      currency: result.shop.currency,
    },
  };
}

/**
 * Log in with mobile + password.
 */
export async function login(input: LoginInput) {
  // Look up shop by mobile
  const shop = await prisma.shop.findUnique({ where: { mobile: input.mobile } });
  if (!shop) {
    throw new AppError('Invalid mobile number or password', 401);
  }

  const passwordValid = await bcrypt.compare(input.password, shop.passwordHash);
  if (!passwordValid) {
    throw new AppError('Invalid mobile number or password', 401);
  }

  // Find the owner user for this shop
  let user = await prisma.user.findFirst({
    where: { shopId: shop.id, mobile: input.mobile },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        shopId: shop.id,
        role: 'OWNER',
        mobile: input.mobile,
        passwordHash: shop.passwordHash,
        isActive: true,
      },
    });
  } else if (!user.isActive) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { isActive: true },
    });
  }

  const accessToken = generateAccessToken({
    userId: user.id,
    shopId: shop.id,
    role: user.role,
  });

  const refreshToken = await generateRefreshToken(user.id, shop.id);

  return {
    accessToken,
    refreshToken,
    shop: {
      id: shop.id,
      name: shop.name,
      ownerName: shop.ownerName,
      mobile: shop.mobile,
      currency: shop.currency,
    },
  };
}

/**
 * Refresh access token using refresh token.
 * Implements rotation + reuse detection.
 */
export async function refreshAccessToken(oldRefreshToken: string) {
  const stored = await redis.get(`refresh:${oldRefreshToken}`);
  if (!stored) {
    throw new AppError('Invalid or expired refresh token', 401);
  }

  const { userId, shopId, familyId } = JSON.parse(stored);

  // Reuse detection: check if this token is still the current one for its family
  const currentTokenForFamily = await redis.get(`${REFRESH_TOKEN_FAMILY_PREFIX}${familyId}`);
  if (currentTokenForFamily !== oldRefreshToken) {
    // This token was already used → potential token theft!
    // Invalidate the entire family (force logout)
    await redis.del(`${REFRESH_TOKEN_FAMILY_PREFIX}${familyId}`);
    await redis.del(`refresh:${currentTokenForFamily}`);
    await redis.del(`refresh:${oldRefreshToken}`);
    throw new AppError('Refresh token reuse detected — all sessions invalidated. Please log in again.', 401);
  }

  // Invalidate old refresh token
  await redis.del(`refresh:${oldRefreshToken}`);

  // Get user to verify still active
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.isActive) {
    throw new AppError('Account is deactivated', 403);
  }

  // Issue new tokens
  const accessToken = generateAccessToken({
    userId,
    shopId,
    role: user.role,
  });

  const newRefreshToken = crypto.randomBytes(64).toString('hex');

  // Store new refresh token under the same family
  await redis.setex(
    `refresh:${newRefreshToken}`,
    REFRESH_TOKEN_EXPIRY_SECONDS,
    JSON.stringify({ userId, shopId, familyId })
  );
  await redis.setex(
    `${REFRESH_TOKEN_FAMILY_PREFIX}${familyId}`,
    REFRESH_TOKEN_EXPIRY_SECONDS,
    newRefreshToken
  );

  return { accessToken, refreshToken: newRefreshToken };
}

/**
 * Logout — invalidate the refresh token.
 */
export async function logout(refreshToken: string): Promise<void> {
  const stored = await redis.get(`refresh:${refreshToken}`);
  if (stored) {
    const { familyId } = JSON.parse(stored);
    await redis.del(`refresh:${refreshToken}`);
    await redis.del(`${REFRESH_TOKEN_FAMILY_PREFIX}${familyId}`);
  }
}

/**
 * Forgot password — generates a reset token and stores in Redis.
 * In production, this would send an SMS/email. For now, returns the token.
 */
export async function forgotPassword(mobile: string): Promise<{ message: string; resetToken?: string }> {
  const shop = await prisma.shop.findUnique({ where: { mobile } });
  // Always return success message (don't reveal if mobile exists)
  if (!shop) {
    return { message: 'If this mobile number is registered, you will receive a reset link.' };
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  await redis.setex(`${RESET_TOKEN_PREFIX}${resetToken}`, RESET_TOKEN_EXPIRY, shop.id);

  // In production: send SMS/email with reset link
  // For development: return the token
  return {
    message: 'If this mobile number is registered, you will receive a reset link.',
    resetToken: env.NODE_ENV === 'development' ? resetToken : undefined,
  };
}

/**
 * Reset password using a reset token.
 */
export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const shopId = await redis.get(`${RESET_TOKEN_PREFIX}${token}`);
  if (!shopId) {
    throw new AppError('Invalid or expired reset token', 400);
  }

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_COST);

  // Update shop and all users for this shop
  await prisma.$transaction(async (tx) => {
    await tx.shop.update({
      where: { id: shopId },
      data: { passwordHash },
    });

    // Update owner user's password too
    const owner = await tx.user.findFirst({ where: { shopId, role: 'OWNER' } });
    if (owner) {
      await tx.user.update({
        where: { id: owner.id },
        data: { passwordHash },
      });
    }
  });

  // Invalidate the reset token
  await redis.del(`${RESET_TOKEN_PREFIX}${token}`);
}
