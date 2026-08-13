import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Decimal } from 'decimal.js';
import prisma from '../config/prisma';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();
router.use(authenticate);

const createLoanSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').default(() => new Date().toISOString().split('T')[0]),
  type: z.enum(['TAKEN', 'GIVEN']),
  personName: z.string().min(1, 'Person name is required'),
  amount: z.number().positive('Amount must be positive'),
  returnedAmount: z.number().min(0).default(0),
  note: z.string().optional().nullable(),
});

const updateLoanSchema = z.object({
  returnedAmount: z.number().min(0).optional(),
  status: z.enum(['PENDING', 'CLOSED']).optional(),
  note: z.string().optional().nullable(),
});

/**
 * GET /api/loans
 * Query params: status (PENDING | CLOSED), type (TAKEN | GIVEN)
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const shopId = req.user!.shopId;
    const { status, type } = req.query;

    const where: any = { shopId };
    if (status && (status === 'PENDING' || status === 'CLOSED')) {
      where.status = status;
    }
    if (type && (type === 'TAKEN' || type === 'GIVEN')) {
      where.type = type;
    }

    const loans = await prisma.loanEntry.findMany({
      where,
      orderBy: { date: 'desc' },
    });

    const formatted = loans.map((l) => ({
      id: l.id,
      date: l.date.toISOString().split('T')[0],
      type: l.type,
      personName: l.personName,
      amount: Number(l.amount),
      returnedAmount: Number(l.returnedAmount),
      pendingAmount: Number(l.pendingAmount),
      status: l.status,
      note: l.note,
    }));

    res.json({
      success: true,
      data: formatted,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/loans
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const shopId = req.user!.shopId;
    const body = createLoanSchema.parse(req.body);

    const amountDec = new Decimal(body.amount);
    const returnedDec = new Decimal(body.returnedAmount);
    const pendingDec = amountDec.minus(returnedDec);

    const status = pendingDec.lessThanOrEqualTo(0) ? 'CLOSED' : 'PENDING';
    const targetDate = new Date(`${body.date}T00:00:00.000Z`);

    const loan = await prisma.loanEntry.create({
      data: {
        id: `ln_${shopId}_${Date.now()}`,
        shopId,
        date: targetDate,
        type: body.type,
        personName: body.personName,
        amount: amountDec,
        returnedAmount: returnedDec,
        pendingAmount: pendingDec.greaterThan(0) ? pendingDec : new Decimal(0),
        status,
        note: body.note || null,
        updatedAt: new Date(),
      },
    });

    res.status(201).json({
      success: true,
      data: {
        id: loan.id,
        date: body.date,
        type: loan.type,
        personName: loan.personName,
        amount: Number(loan.amount),
        returnedAmount: Number(loan.returnedAmount),
        pendingAmount: Number(loan.pendingAmount),
        status: loan.status,
        note: loan.note,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/loans/:id
 */
router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const shopId = req.user!.shopId;
    const loanId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const body = updateLoanSchema.parse(req.body);

    const existing = await prisma.loanEntry.findFirst({
      where: { id: loanId, shopId },
    });

    if (!existing) {
      throw new AppError('Loan record not found', 404);
    }

    const currentAmount = new Decimal(existing.amount.toString());
    let newReturned = body.returnedAmount !== undefined ? new Decimal(body.returnedAmount) : new Decimal(existing.returnedAmount.toString());

    if (newReturned.greaterThan(currentAmount)) {
      newReturned = currentAmount;
    }

    const newPending = currentAmount.minus(newReturned);
    let newStatus = body.status;
    if (!newStatus) {
      newStatus = newPending.lessThanOrEqualTo(0) ? 'CLOSED' : 'PENDING';
    }

    const updated = await prisma.loanEntry.update({
      where: { id: loanId },
      data: {
        returnedAmount: newReturned,
        pendingAmount: newPending.greaterThan(0) ? newPending : new Decimal(0),
        status: newStatus,
        note: body.note !== undefined ? body.note : existing.note,
        updatedAt: new Date(),
      },
    });

    res.json({
      success: true,
      data: {
        id: updated.id,
        date: updated.date.toISOString().split('T')[0],
        type: updated.type,
        personName: updated.personName,
        amount: Number(updated.amount),
        returnedAmount: Number(updated.returnedAmount),
        pendingAmount: Number(updated.pendingAmount),
        status: updated.status,
        note: updated.note,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/loans/:id
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const shopId = req.user!.shopId;
    const loanId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    const existing = await prisma.loanEntry.findFirst({
      where: { id: loanId, shopId },
    });

    if (!existing) {
      throw new AppError('Loan record not found', 404);
    }

    await prisma.loanEntry.delete({
      where: { id: loanId },
    });

    res.json({
      success: true,
      message: 'Loan record deleted successfully',
    });
  } catch (err) {
    next(err);
  }
});

export default router;
