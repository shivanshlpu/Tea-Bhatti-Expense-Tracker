import { Decimal } from '@prisma/client/runtime/library';
import prisma from '../config/prisma';
import { writeAuditLog } from '../middleware/audit';
import { AppError } from '../middleware/errorHandler';
import type { Request } from 'express';
import type { CreateSaleInput, VoidReasonInput } from '@shop-finance/shared';

/**
 * Create a new sale — within a Prisma transaction that also writes the audit log.
 */
export async function createSale(
  shopId: string,
  userId: string,
  input: CreateSaleInput,
  req: Request
) {
  const sale = await prisma.$transaction(async (tx) => {
    const created = await tx.sale.create({
      data: {
        shopId,
        type: input.type,
        amount: new Decimal(input.amount.toString()),
        paymentMethod: input.paymentMethod || null,
        note: input.note || null,
        saleDate: new Date(input.saleDate),
        createdBy: userId,
      },
    });

    await writeAuditLog({
      shopId,
      entityType: 'Sale',
      entityId: created.id,
      action: 'CREATE',
      amount: created.amount,
      performedBy: userId,
      req,
      tx: tx as any,
    });

    return created;
  });

  return sale;
}

/**
 * Update an existing sale.
 */
export async function updateSale(
  shopId: string,
  userId: string,
  saleId: string,
  input: Partial<CreateSaleInput>,
  req: Request
) {
  const existing = await prisma.sale.findFirst({
    where: { id: saleId, shopId, voidedAt: null },
  });

  if (!existing) {
    throw new AppError('Sale record not found', 404);
  }

  const updated = await prisma.$transaction(async (tx) => {
    const data: any = {};
    if (input.type) data.type = input.type;
    if (input.amount !== undefined) data.amount = new Decimal(input.amount.toString());
    if (input.paymentMethod !== undefined) data.paymentMethod = input.paymentMethod || null;
    if (input.note !== undefined) data.note = input.note || null;
    if (input.saleDate) data.saleDate = new Date(input.saleDate);

    const sale = await tx.sale.update({
      where: { id: saleId },
      data,
    });

    await writeAuditLog({
      shopId,
      entityType: 'Sale',
      entityId: saleId,
      action: 'UPDATE',
      amount: sale.amount,
      performedBy: userId,
      req,
      tx: tx as any,
    });

    return sale;
  });

  return updated;
}

/**
 * Void/Delete a sale entry.
 */
export async function voidSale(
  shopId: string,
  userId: string,
  saleId: string,
  input: VoidReasonInput | { reason?: string },
  req: Request
) {
  const sale = await prisma.$transaction(async (tx) => {
    const existing = await tx.sale.findFirst({
      where: { id: saleId, shopId },
    });

    if (!existing) {
      throw new AppError('Sale not found', 404);
    }

    if (existing.voidedAt) {
      throw new AppError('Sale is already voided', 400);
    }

    const voided = await tx.sale.update({
      where: { id: saleId },
      data: {
        voidedAt: new Date(),
        voidReason: input.reason || 'Deleted by user',
      },
    });

    await writeAuditLog({
      shopId,
      entityType: 'Sale',
      entityId: saleId,
      action: 'VOID',
      amount: existing.amount,
      performedBy: userId,
      req,
      tx: tx as any,
    });

    return voided;
  });

  return sale;
}

/**
 * List active (non-voided) sales for a shop.
 */
export async function listSales(
  shopId: string,
  filters: {
    from?: string;
    to?: string;
    type?: 'CASH' | 'ONLINE';
  }
) {
  const where: any = { shopId, voidedAt: null };

  if (filters.from || filters.to) {
    where.saleDate = {};
    if (filters.from) {
      const f = new Date(filters.from.length === 10 ? `${filters.from}T00:00:00.000Z` : filters.from);
      where.saleDate.gte = isNaN(f.getTime()) ? new Date(filters.from) : f;
    }
    if (filters.to) {
      const t = new Date(filters.to.length === 10 ? `${filters.to}T23:59:59.999Z` : filters.to);
      where.saleDate.lte = isNaN(t.getTime()) ? new Date(filters.to) : t;
    }
  }

  if (filters.type) {
    where.type = filters.type;
  }

  const sales = await prisma.sale.findMany({
    where,
    orderBy: [{ saleDate: 'desc' }, { createdAt: 'desc' }],
  });

  return sales.map((s) => ({
    ...s,
    amount: s.amount.toString(),
  }));
}
