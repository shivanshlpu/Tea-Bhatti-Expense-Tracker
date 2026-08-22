import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Decimal } from 'decimal.js';
import { UpdateShopSettingsSchema } from '@shop-finance/shared';
import prisma from '../config/prisma';
import { computeOpeningBalance } from '../finance/financeEngine';
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
 * Get opening cash & bank for today or specified date (dynamically computed from initial float + prior cumulative flow)
 */
router.get('/opening-balance', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const shopId = req.user!.shopId;
    const dateStr = (req.query.date as string) || new Date().toISOString().split('T')[0];
    const targetDate = new Date(`${dateStr}T00:00:00.000Z`);

    const { openingCash, openingBank, initialCash, initialBank, initialDate } = await computeOpeningBalance(shopId, targetDate);

    res.json({
      success: true,
      data: {
        date: dateStr,
        openingCash: Number(openingCash),
        openingBank: Number(openingBank),
        totalOpening: Number(openingCash.plus(openingBank)),
        initialCash: Number(initialCash),
        initialBank: Number(initialBank),
        initialDate: initialDate ? initialDate.toISOString().split('T')[0] : null,
        autoCarried: true,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/settings/opening-balance
 * Save/update initial opening cash & bank float for the shop
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

    const updated = await prisma.dailyBalance.upsert({
      where: { shopId_date: { shopId, date: targetDate } },
      create: {
        id: balanceId,
        shopId,
        date: targetDate,
        openingCash: cashDec,
        openingBank: bankDec,
        totalOpening: totalDec,
        closingCash: cashDec,
        closingBank: bankDec,
        totalClosing: totalDec,
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
 * POST /api/settings/delete-data-range
 * Delete transaction data between start and end dates for current shop. OWNER only.
 */
router.post('/delete-data-range', authorize('OWNER'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const shopId = req.user!.shopId;
    const { from, to } = req.body;

    if (!from || !to) {
      throw new AppError('Both start date (from) and end date (to) are required', 400);
    }

    const fromDate = new Date(`${from}T00:00:00.000Z`);
    const toDate = new Date(`${to}T23:59:59.999Z`);

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      throw new AppError('Invalid date format provided', 400);
    }

    const dateFilter = { gte: fromDate, lte: toDate };

    const [
      salesDel, salesEntryDel,
      matExpDel, shopExpDel, miscExpDel, expEntryDel,
      withdDel, drwEntryDel,
      loanDel, balanceDel
    ] = await prisma.$transaction([
      prisma.sale.deleteMany({ where: { shopId, saleDate: dateFilter } }),
      prisma.salesEntry.deleteMany({ where: { shopId, date: dateFilter } }),
      prisma.materialExpense.deleteMany({ where: { shopId, expDate: dateFilter } }),
      prisma.shopExpense.deleteMany({ where: { shopId, expDate: dateFilter } }),
      prisma.miscExpense.deleteMany({ where: { shopId, expDate: dateFilter } }),
      prisma.expenseEntry.deleteMany({ where: { shopId, date: dateFilter } }),
      prisma.withdrawal.deleteMany({ where: { shopId, wDate: dateFilter } }),
      prisma.drawingsEntry.deleteMany({ where: { shopId, date: dateFilter } }),
      prisma.loanEntry.deleteMany({ where: { shopId, date: dateFilter } }),
      prisma.dailyBalance.deleteMany({ where: { shopId, date: dateFilter } }),
    ]);

    const totalDeleted =
      salesDel.count + salesEntryDel.count +
      matExpDel.count + shopExpDel.count + miscExpDel.count + expEntryDel.count +
      withdDel.count + drwEntryDel.count +
      loanDel.count + balanceDel.count;

    res.json({
      success: true,
      message: `Successfully deleted ${totalDeleted} records between ${from} and ${to}`,
      data: {
        totalDeleted,
        from,
        to,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/settings/wipe-all-data
 * Completely wipe ALL transaction records for current shop (Reset to 0). OWNER only.
 */
router.post('/wipe-all-data', authorize('OWNER'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const shopId = req.user!.shopId;
    const { confirmText } = req.body;

    if (confirmText !== 'DELETE') {
      throw new AppError('Must type "DELETE" to confirm wiping all shop data', 400);
    }

    const [
      salesDel, salesEntryDel,
      matExpDel, shopExpDel, miscExpDel, expEntryDel,
      withdDel, drwEntryDel,
      loanDel, balanceDel, auditDel
    ] = await prisma.$transaction([
      prisma.sale.deleteMany({ where: { shopId } }),
      prisma.salesEntry.deleteMany({ where: { shopId } }),
      prisma.materialExpense.deleteMany({ where: { shopId } }),
      prisma.shopExpense.deleteMany({ where: { shopId } }),
      prisma.miscExpense.deleteMany({ where: { shopId } }),
      prisma.expenseEntry.deleteMany({ where: { shopId } }),
      prisma.withdrawal.deleteMany({ where: { shopId } }),
      prisma.drawingsEntry.deleteMany({ where: { shopId } }),
      prisma.loanEntry.deleteMany({ where: { shopId } }),
      prisma.dailyBalance.deleteMany({ where: { shopId } }),
      prisma.auditLog.deleteMany({ where: { shopId } }),
    ]);

    const totalDeleted =
      salesDel.count + salesEntryDel.count +
      matExpDel.count + shopExpDel.count + miscExpDel.count + expEntryDel.count +
      withdDel.count + drwEntryDel.count +
      loanDel.count + balanceDel.count + auditDel.count;

    res.json({
      success: true,
      message: `Entire shop database successfully reset to 0. Cleared ${totalDeleted} records.`,
      data: {
        totalDeleted,
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
