import { Decimal } from '@prisma/client/runtime/library';
import prisma from '../config/prisma';
import { writeAuditLog } from '../middleware/audit';
import { AppError } from '../middleware/errorHandler';
import type { Request } from 'express';
import type { CreateWithdrawalInput, VoidReasonInput } from '@shop-finance/shared';

/**
 * Create a new withdrawal — within a Prisma transaction with audit log.
 */
export async function createWithdrawal(
  shopId: string,
  userId: string,
  input: CreateWithdrawalInput,
  req: Request
) {
  return prisma.$transaction(async (tx) => {
    const created = await tx.withdrawal.create({
      data: {
        shopId,
        amount: new Decimal(input.amount.toString()),
        mode: input.mode,
        note: input.note || null,
        wDate: new Date(input.wDate),
        createdBy: userId,
      },
    });

    await writeAuditLog({
      shopId,
      entityType: 'Withdrawal',
      entityId: created.id,
      action: 'CREATE',
      amount: created.amount,
      performedBy: userId,
      req,
      tx: tx as any,
    });

    return created;
  });
}

/**
 * Void a withdrawal — soft-void with mandatory reason.
 */
export async function voidWithdrawal(
  shopId: string,
  userId: string,
  withdrawalId: string,
  input: VoidReasonInput,
  req: Request
) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.withdrawal.findFirst({
      where: { id: withdrawalId, shopId },
    });

    if (!existing) throw new AppError('Withdrawal not found', 404);
    if (existing.voidedAt) throw new AppError('Withdrawal is already voided', 400);

    const voided = await tx.withdrawal.update({
      where: { id: withdrawalId },
      data: { voidedAt: new Date(), voidReason: input.reason },
    });

    await writeAuditLog({
      shopId,
      entityType: 'Withdrawal',
      entityId: withdrawalId,
      action: 'VOID',
      amount: existing.amount,
      performedBy: userId,
      req,
      tx: tx as any,
    });

    return voided;
  });
}

/**
 * List withdrawals for a shop with optional date range.
 */
export async function listWithdrawals(
  shopId: string,
  filters: { from?: string; to?: string }
) {
  const where: any = { shopId };

  if (filters.from || filters.to) {
    where.wDate = {};
    if (filters.from) {
      const f = new Date(filters.from.length === 10 ? `${filters.from}T00:00:00.000Z` : filters.from);
      where.wDate.gte = isNaN(f.getTime()) ? new Date(filters.from) : f;
    }
    if (filters.to) {
      const t = new Date(filters.to.length === 10 ? `${filters.to}T23:59:59.999Z` : filters.to);
      where.wDate.lte = isNaN(t.getTime()) ? new Date(filters.to) : t;
    }
  }

  const withdrawals = await prisma.withdrawal.findMany({
    where,
    orderBy: [{ wDate: 'desc' }, { createdAt: 'desc' }],
  });

  return withdrawals.map((w) => ({ ...w, amount: w.amount.toString() }));
}
