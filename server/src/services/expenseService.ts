import { Decimal } from '@prisma/client/runtime/library';
import prisma from '../config/prisma';
import { writeAuditLog } from '../middleware/audit';
import { AppError } from '../middleware/errorHandler';
import type { Request } from 'express';
import type {
  CreateMaterialExpenseInput,
  CreateShopExpenseInput,
  CreateMiscExpenseInput,
  VoidReasonInput,
} from '@shop-finance/shared';

// ────────────────────────────────────────────────
// Material Expenses
// ────────────────────────────────────────────────

export async function createMaterialExpense(
  shopId: string,
  userId: string,
  input: CreateMaterialExpenseInput,
  req: Request
) {
  return prisma.$transaction(async (tx) => {
    const created = await tx.materialExpense.create({
      data: {
        shopId,
        category: input.category,
        amount: new Decimal(input.amount.toString()),
        mode: input.mode,
        note: input.note || null,
        expDate: new Date(input.expDate),
        createdBy: userId,
      },
    });

    await writeAuditLog({
      shopId,
      entityType: 'MaterialExpense',
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

export async function updateMaterialExpense(
  shopId: string,
  userId: string,
  expenseId: string,
  input: Partial<CreateMaterialExpenseInput>,
  req: Request
) {
  const existing = await prisma.materialExpense.findFirst({
    where: { id: expenseId, shopId, voidedAt: null },
  });

  if (!existing) throw new AppError('Material expense not found', 404);

  return prisma.$transaction(async (tx) => {
    const data: any = {};
    if (input.category) data.category = input.category;
    if (input.amount !== undefined) data.amount = new Decimal(input.amount.toString());
    if (input.mode) data.mode = input.mode;
    if (input.note !== undefined) data.note = input.note || null;
    if (input.expDate) data.expDate = new Date(input.expDate);

    const updated = await tx.materialExpense.update({
      where: { id: expenseId },
      data,
    });

    await writeAuditLog({
      shopId,
      entityType: 'MaterialExpense',
      entityId: expenseId,
      action: 'UPDATE',
      amount: updated.amount,
      performedBy: userId,
      req,
      tx: tx as any,
    });

    return updated;
  });
}

export async function voidMaterialExpense(
  shopId: string,
  userId: string,
  expenseId: string,
  input: VoidReasonInput | { reason?: string },
  req: Request
) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.materialExpense.findFirst({
      where: { id: expenseId, shopId },
    });

    if (!existing) throw new AppError('Material expense not found', 404);
    if (existing.voidedAt) throw new AppError('Expense is already voided', 400);

    const voided = await tx.materialExpense.update({
      where: { id: expenseId },
      data: { voidedAt: new Date(), voidReason: input.reason || 'User deleted expense' },
    });

    await writeAuditLog({
      shopId,
      entityType: 'MaterialExpense',
      entityId: expenseId,
      action: 'VOID',
      amount: existing.amount,
      performedBy: userId,
      req,
      tx: tx as any,
    });

    return voided;
  });
}

export async function listMaterialExpenses(
  shopId: string,
  filters: { from?: string; to?: string; category?: string }
) {
  const where: any = { shopId, voidedAt: null };

  if (filters.from || filters.to) {
    where.expDate = {};
    if (filters.from) {
      const f = new Date(filters.from.length === 10 ? `${filters.from}T00:00:00.000Z` : filters.from);
      where.expDate.gte = isNaN(f.getTime()) ? new Date(filters.from) : f;
    }
    if (filters.to) {
      const t = new Date(filters.to.length === 10 ? `${filters.to}T23:59:59.999Z` : filters.to);
      where.expDate.lte = isNaN(t.getTime()) ? new Date(filters.to) : t;
    }
  }

  if (filters.category) where.category = filters.category;

  const expenses = await prisma.materialExpense.findMany({
    where,
    orderBy: [{ expDate: 'desc' }, { createdAt: 'desc' }],
  });

  return expenses.map((e) => ({ ...e, amount: e.amount.toString() }));
}

// ────────────────────────────────────────────────
// Shop Expenses
// ────────────────────────────────────────────────

export async function createShopExpense(
  shopId: string,
  userId: string,
  input: CreateShopExpenseInput,
  req: Request
) {
  return prisma.$transaction(async (tx) => {
    const created = await tx.shopExpense.create({
      data: {
        shopId,
        category: input.category,
        amount: new Decimal(input.amount.toString()),
        mode: input.mode,
        note: input.note || null,
        expDate: new Date(input.expDate),
        isRecurring: input.isRecurring ?? false,
        createdBy: userId,
      },
    });

    await writeAuditLog({
      shopId,
      entityType: 'ShopExpense',
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

export async function updateShopExpense(
  shopId: string,
  userId: string,
  expenseId: string,
  input: Partial<CreateShopExpenseInput>,
  req: Request
) {
  const existing = await prisma.shopExpense.findFirst({
    where: { id: expenseId, shopId, voidedAt: null },
  });

  if (!existing) throw new AppError('Shop expense not found', 404);

  return prisma.$transaction(async (tx) => {
    const data: any = {};
    if (input.category) data.category = input.category;
    if (input.amount !== undefined) data.amount = new Decimal(input.amount.toString());
    if (input.mode) data.mode = input.mode;
    if (input.note !== undefined) data.note = input.note || null;
    if (input.expDate) data.expDate = new Date(input.expDate);
    if (input.isRecurring !== undefined) data.isRecurring = input.isRecurring;

    const updated = await tx.shopExpense.update({
      where: { id: expenseId },
      data,
    });

    await writeAuditLog({
      shopId,
      entityType: 'ShopExpense',
      entityId: expenseId,
      action: 'UPDATE',
      amount: updated.amount,
      performedBy: userId,
      req,
      tx: tx as any,
    });

    return updated;
  });
}

export async function voidShopExpense(
  shopId: string,
  userId: string,
  expenseId: string,
  input: VoidReasonInput | { reason?: string },
  req: Request
) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.shopExpense.findFirst({
      where: { id: expenseId, shopId },
    });

    if (!existing) throw new AppError('Shop expense not found', 404);
    if (existing.voidedAt) throw new AppError('Expense is already voided', 400);

    const voided = await tx.shopExpense.update({
      where: { id: expenseId },
      data: { voidedAt: new Date(), voidReason: input.reason || 'User deleted expense' },
    });

    await writeAuditLog({
      shopId,
      entityType: 'ShopExpense',
      entityId: expenseId,
      action: 'VOID',
      amount: existing.amount,
      performedBy: userId,
      req,
      tx: tx as any,
    });

    return voided;
  });
}

export async function listShopExpenses(
  shopId: string,
  filters: { from?: string; to?: string; category?: string }
) {
  const where: any = { shopId, voidedAt: null };

  if (filters.from || filters.to) {
    where.expDate = {};
    if (filters.from) {
      const f = new Date(filters.from.length === 10 ? `${filters.from}T00:00:00.000Z` : filters.from);
      where.expDate.gte = isNaN(f.getTime()) ? new Date(filters.from) : f;
    }
    if (filters.to) {
      const t = new Date(filters.to.length === 10 ? `${filters.to}T23:59:59.999Z` : filters.to);
      where.expDate.lte = isNaN(t.getTime()) ? new Date(filters.to) : t;
    }
  }

  if (filters.category) where.category = filters.category;

  const expenses = await prisma.shopExpense.findMany({
    where,
    orderBy: [{ expDate: 'desc' }, { createdAt: 'desc' }],
  });

  return expenses.map((e) => ({ ...e, amount: e.amount.toString() }));
}

// ────────────────────────────────────────────────
// Misc Expenses
// ────────────────────────────────────────────────

export async function createMiscExpense(
  shopId: string,
  userId: string,
  input: CreateMiscExpenseInput,
  req: Request
) {
  return prisma.$transaction(async (tx) => {
    const created = await tx.miscExpense.create({
      data: {
        shopId,
        name: input.name,
        amount: new Decimal(input.amount.toString()),
        mode: input.mode,
        note: input.note || null,
        expDate: new Date(input.expDate),
        createdBy: userId,
      },
    });

    await writeAuditLog({
      shopId,
      entityType: 'MiscExpense',
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

export async function updateMiscExpense(
  shopId: string,
  userId: string,
  expenseId: string,
  input: Partial<CreateMiscExpenseInput>,
  req: Request
) {
  const existing = await prisma.miscExpense.findFirst({
    where: { id: expenseId, shopId, voidedAt: null },
  });

  if (!existing) throw new AppError('Misc expense not found', 404);

  return prisma.$transaction(async (tx) => {
    const data: any = {};
    if (input.name) data.name = input.name;
    if (input.amount !== undefined) data.amount = new Decimal(input.amount.toString());
    if (input.mode) data.mode = input.mode;
    if (input.note !== undefined) data.note = input.note || null;
    if (input.expDate) data.expDate = new Date(input.expDate);

    const updated = await tx.miscExpense.update({
      where: { id: expenseId },
      data,
    });

    await writeAuditLog({
      shopId,
      entityType: 'MiscExpense',
      entityId: expenseId,
      action: 'UPDATE',
      amount: updated.amount,
      performedBy: userId,
      req,
      tx: tx as any,
    });

    return updated;
  });
}

export async function voidMiscExpense(
  shopId: string,
  userId: string,
  expenseId: string,
  input: VoidReasonInput | { reason?: string },
  req: Request
) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.miscExpense.findFirst({
      where: { id: expenseId, shopId },
    });

    if (!existing) throw new AppError('Misc expense not found', 404);
    if (existing.voidedAt) throw new AppError('Expense is already voided', 400);

    const voided = await tx.miscExpense.update({
      where: { id: expenseId },
      data: { voidedAt: new Date(), voidReason: input.reason || 'User deleted expense' },
    });

    await writeAuditLog({
      shopId,
      entityType: 'MiscExpense',
      entityId: expenseId,
      action: 'VOID',
      amount: existing.amount,
      performedBy: userId,
      req,
      tx: tx as any,
    });

    return voided;
  });
}

export async function listMiscExpenses(
  shopId: string,
  filters: { from?: string; to?: string }
) {
  const where: any = { shopId, voidedAt: null };

  if (filters.from || filters.to) {
    where.expDate = {};
    if (filters.from) {
      const f = new Date(filters.from.length === 10 ? `${filters.from}T00:00:00.000Z` : filters.from);
      where.expDate.gte = isNaN(f.getTime()) ? new Date(filters.from) : f;
    }
    if (filters.to) {
      const t = new Date(filters.to.length === 10 ? `${filters.to}T23:59:59.999Z` : filters.to);
      where.expDate.lte = isNaN(t.getTime()) ? new Date(filters.to) : t;
    }
  }

  const expenses = await prisma.miscExpense.findMany({
    where,
    orderBy: [{ expDate: 'desc' }, { createdAt: 'desc' }],
  });

  return expenses.map((e) => ({ ...e, amount: e.amount.toString() }));
}
