import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Decimal } from 'decimal.js';
import { UpdateShopSettingsSchema } from '@shop-finance/shared';
import prisma from '../config/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

router.use(authenticate);

/**
 * GET /api/settings/shop
 * Get current shop settings.
 */
router.get('/shop', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const shop = await prisma.shop.findUnique({
      where: { id: req.user!.shopId },
      select: {
        id: true,
        name: true,
        ownerName: true,
        mobile: true,
        email: true,
        currency: true,
        theme: true,
        createdAt: true,
      },
    });

    if (!shop) throw new AppError('Shop not found', 404);

    res.json({ success: true, data: shop });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/settings/shop
 * Update shop settings. OWNER only.
 */
router.patch('/shop', authorize('OWNER'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = UpdateShopSettingsSchema.parse(req.body);

    const shop = await prisma.shop.update({
      where: { id: req.user!.shopId },
      data: {
        ...(input.name && { name: input.name }),
        ...(input.ownerName && { ownerName: input.ownerName }),
        ...(input.email !== undefined && { email: input.email || null }),
        ...(input.currency && { currency: input.currency }),
        ...(input.theme && { theme: input.theme }),
      },
      select: {
        id: true,
        name: true,
        ownerName: true,
        mobile: true,
        email: true,
        currency: true,
        theme: true,
      },
    });

    res.json({ success: true, data: shop });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/settings/opening-balance
 * Get opening cash & bank for today or specified date
 */
router.get('/opening-balance', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const shopId = req.user!.shopId;
    const dateStr = (req.query.date as string) || new Date().toISOString().split('T')[0];
    const targetDate = new Date(`${dateStr}T00:00:00.000Z`);

    const existing = await prisma.dailyBalance.findFirst({
      where: { shopId, date: targetDate },
    });

    let openingCash = 0;
    let openingBank = 0;
    let autoCarried = false;

    if (existing) {
      openingCash = Number(existing.openingCash);
      openingBank = Number(existing.openingBank);
    } else {
      const prev = await prisma.dailyBalance.findFirst({
        where: { shopId, date: { lt: targetDate } },
        orderBy: { date: 'desc' },
      });
      if (prev) {
        openingCash = Number(prev.closingCash);
        openingBank = Number(prev.closingBank);
        autoCarried = true;
      }
    }

    res.json({
      success: true,
      data: {
        date: dateStr,
        openingCash,
        openingBank,
        totalOpening: openingCash + openingBank,
        autoCarried,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/settings/opening-balance
 * Save/update opening cash & bank balance
 */
router.post('/opening-balance', authorize('OWNER'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const shopId = req.user!.shopId;
    const { openingCash, openingBank, date } = req.body;

    const dateStr = date || new Date().toISOString().split('T')[0];
    const targetDate = new Date(`${dateStr}T00:00:00.000Z`);

    const cashDec = new Decimal(openingCash || 0);
    const bankDec = new Decimal(openingBank || 0);
    const totalDec = cashDec.plus(bankDec);

    const now = new Date();
    const balanceId = `db_${shopId}_${dateStr}`;

    const existing = await prisma.dailyBalance.findFirst({
      where: { shopId, date: targetDate },
    });

    const closingCash = existing ? new Decimal(existing.closingCash.toString()) : cashDec;
    const closingBank = existing ? new Decimal(existing.closingBank.toString()) : bankDec;
    const totalClosing = closingCash.plus(closingBank);

    const updated = await prisma.dailyBalance.upsert({
      where: { shopId_date: { shopId, date: targetDate } },
      create: {
        id: balanceId,
        shopId,
        date: targetDate,
        openingCash: cashDec,
        openingBank: bankDec,
        totalOpening: totalDec,
        closingCash,
        closingBank,
        totalClosing,
        updatedAt: now,
      },
      update: {
        openingCash: cashDec,
        openingBank: bankDec,
        totalOpening: totalDec,
        updatedAt: now,
      },
    });

    res.json({
      success: true,
      data: {
        date: dateStr,
        openingCash: Number(updated.openingCash),
        openingBank: Number(updated.openingBank),
        totalOpening: Number(updated.totalOpening),
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/settings/backup
 * Placeholder for backup functionality.
 */
router.post('/backup', authorize('OWNER'), async (_req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    error: 'Backup functionality will be available in a future release',
  });
});

/**
 * POST /api/settings/restore
 * Placeholder for restore functionality.
 */
router.post('/restore', authorize('OWNER'), async (_req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    error: 'Restore functionality will be available in a future release',
  });
});

export default router;
