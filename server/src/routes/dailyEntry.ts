import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Decimal } from 'decimal.js';
import prisma from '../config/prisma';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();
router.use(authenticate);

const expenseRowSchema = z.object({
  id: z.string().optional(),
  category: z.string().min(1, 'Category is required'),
  amount: z.number().min(0, 'Amount must be positive'),
  paymentMode: z.enum(['Cash', 'UPI', 'Card', 'Credit']),
  note: z.string().optional().nullable(),
});

const drawingRowSchema = z.object({
  id: z.string().optional(),
  amount: z.number().min(0, 'Amount must be positive'),
  paymentMode: z.enum(['Cash', 'UPI']),
  reason: z.string().optional().nullable(),
});

const saveDailyEntrySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  openingCash: z.number().min(0, 'Opening Cash must be non-negative'),
  openingBank: z.number().min(0, 'Opening Bank must be non-negative'),
  cashSales: z.number().min(0, 'Cash Sales must be non-negative'),
  upiSales: z.number().min(0, 'UPI Sales must be non-negative'),
  cardSales: z.number().min(0, 'Card Sales must be non-negative').default(0),
  note: z.string().optional().nullable(),
  expenses: z.array(expenseRowSchema).default([]),
  drawings: z.array(drawingRowSchema).default([]),
});

/**
 * GET /api/daily-entry/balance?date=YYYY-MM-DD
 * Auto-carries forward previous day's closing balance if current day balance is not set.
 */
router.get('/balance', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const shopId = req.user!.shopId;
    const dateStr = (req.query.date as string) || new Date().toISOString().split('T')[0];
    const targetDate = new Date(`${dateStr}T00:00:00.000Z`);

    // 1. Check if DailyBalance exists for target date
    const existingBalance = await prisma.dailyBalance.findFirst({
      where: { shopId, date: targetDate },
    });

    let openingCash = 0;
    let openingBank = 0;
    let autoCarried = false;

    if (existingBalance) {
      openingCash = Number(existingBalance.openingCash);
      openingBank = Number(existingBalance.openingBank);
    } else {
      // Fetch previous day's closing balance
      const prevBalance = await prisma.dailyBalance.findFirst({
        where: { shopId, date: { lt: targetDate } },
        orderBy: { date: 'desc' },
      });

      if (prevBalance) {
        openingCash = Number(prevBalance.closingCash);
        openingBank = Number(prevBalance.closingBank);
        autoCarried = true;
      }
    }

    // Fetch existing entries for date
    const [sales, expenses, drawings] = await Promise.all([
      prisma.salesEntry.findFirst({ where: { shopId, date: targetDate } }),
      prisma.expenseEntry.findMany({ where: { shopId, date: targetDate }, orderBy: { createdAt: 'asc' } }),
      prisma.drawingsEntry.findMany({ where: { shopId, date: targetDate }, orderBy: { createdAt: 'asc' } }),
    ]);

    res.json({
      success: true,
      data: {
        date: dateStr,
        autoCarried,
        openingCash,
        openingBank,
        totalOpening: openingCash + openingBank,
        sales: sales ? {
          cashSales: Number(sales.cashSales),
          upiSales: Number(sales.upiSales),
          cardSales: Number(sales.cardSales),
          totalSales: Number(sales.totalSales),
          note: sales.note,
        } : { cashSales: 0, upiSales: 0, cardSales: 0, totalSales: 0, note: '' },
        expenses: expenses.map(e => ({
          id: e.id,
          category: e.category,
          amount: Number(e.amount),
          paymentMode: e.paymentMode,
          note: e.note,
        })),
        drawings: drawings.map(d => ({
          id: d.id,
          amount: Number(d.amount),
          paymentMode: d.paymentMode,
          reason: d.reason,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/daily-entry/save
 * Atomically saves opening balance, sales, expenses, and drawings for a day.
 */
router.post('/save', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const shopId = req.user!.shopId;
    const body = saveDailyEntrySchema.parse(req.body);

    const targetDate = new Date(`${body.date}T00:00:00.000Z`);

    // Calculations
    const openingCash = new Decimal(body.openingCash);
    const openingBank = new Decimal(body.openingBank);
    const totalOpening = openingCash.plus(openingBank);

    const cashSales = new Decimal(body.cashSales);
    const upiSales = new Decimal(body.upiSales);
    const cardSales = new Decimal(body.cardSales);
    const totalSales = cashSales.plus(upiSales).plus(cardSales);

    let cashExpenses = new Decimal(0);
    let onlineExpenses = new Decimal(0);

    for (const exp of body.expenses) {
      const amt = new Decimal(exp.amount);
      if (exp.paymentMode === 'Cash') {
        cashExpenses = cashExpenses.plus(amt);
      } else {
        onlineExpenses = onlineExpenses.plus(amt);
      }
    }

    let cashDrawings = new Decimal(0);
    let onlineDrawings = new Decimal(0);

    for (const d of body.drawings) {
      const amt = new Decimal(d.amount);
      if (d.paymentMode === 'Cash') {
        cashDrawings = cashDrawings.plus(amt);
      } else {
        onlineDrawings = onlineDrawings.plus(amt);
      }
    }

    const closingCash = openingCash.plus(cashSales).minus(cashExpenses).minus(cashDrawings);
    const closingBank = openingBank.plus(upiSales).plus(cardSales).minus(onlineExpenses).minus(onlineDrawings);
    const totalClosing = closingCash.plus(closingBank);

    const now = new Date();
    const balanceId = `db_${shopId}_${body.date}`;
    const salesId = `se_${shopId}_${body.date}`;

    await prisma.$transaction(async (tx) => {
      // 1. Upsert DailyBalance
      await tx.dailyBalance.upsert({
        where: { shopId_date: { shopId, date: targetDate } },
        create: {
          id: balanceId,
          shopId,
          date: targetDate,
          openingCash,
          openingBank,
          totalOpening,
          closingCash,
          closingBank,
          totalClosing,
          updatedAt: now,
        },
        update: {
          openingCash,
          openingBank,
          totalOpening,
          closingCash,
          closingBank,
          totalClosing,
          updatedAt: now,
        },
      });

      // 2. Upsert SalesEntry
      await tx.salesEntry.upsert({
        where: { shopId_date: { shopId, date: targetDate } },
        create: {
          id: salesId,
          shopId,
          date: targetDate,
          cashSales,
          upiSales,
          cardSales,
          totalSales,
          note: body.note || null,
          updatedAt: now,
        },
        update: {
          cashSales,
          upiSales,
          cardSales,
          totalSales,
          note: body.note || null,
          updatedAt: now,
        },
      });

      // 3. Clear and recreate ExpenseEntry for date
      await tx.expenseEntry.deleteMany({ where: { shopId, date: targetDate } });
      if (body.expenses.length > 0) {
        await tx.expenseEntry.createMany({
          data: body.expenses.map((e, idx) => ({
            id: `exp_${shopId}_${body.date}_${idx}_${Date.now()}`,
            shopId,
            date: targetDate,
            category: e.category,
            amount: new Decimal(e.amount),
            paymentMode: e.paymentMode,
            note: e.note || null,
            updatedAt: now,
          })),
        });
      }

      // 4. Clear and recreate DrawingsEntry for date
      await tx.drawingsEntry.deleteMany({ where: { shopId, date: targetDate } });
      if (body.drawings.length > 0) {
        await tx.drawingsEntry.createMany({
          data: body.drawings.map((d, idx) => ({
            id: `drw_${shopId}_${body.date}_${idx}_${Date.now()}`,
            shopId,
            date: targetDate,
            amount: new Decimal(d.amount),
            paymentMode: d.paymentMode,
            reason: d.reason || null,
            updatedAt: now,
          })),
        });
      }
    });

    res.json({
      success: true,
      data: {
        date: body.date,
        openingCash: openingCash.toFixed(2),
        openingBank: openingBank.toFixed(2),
        totalOpening: totalOpening.toFixed(2),
        totalSales: totalSales.toFixed(2),
        cashExpenses: cashExpenses.toFixed(2),
        onlineExpenses: onlineExpenses.toFixed(2),
        cashDrawings: cashDrawings.toFixed(2),
        onlineDrawings: onlineDrawings.toFixed(2),
        closingCash: closingCash.toFixed(2),
        closingBank: closingBank.toFixed(2),
        totalClosing: totalClosing.toFixed(2),
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
