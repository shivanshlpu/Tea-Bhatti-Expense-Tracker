import { Request } from 'express';
import { Decimal } from '@prisma/client/runtime/library';
import prisma from '../config/prisma';

/**
 * Writes an immutable audit log entry.
 * Called within the same Prisma transaction as the financial write — never as an afterthought.
 * 
 * @param params.shopId     - Shop owning the record
 * @param params.entityType - "Sale" | "MaterialExpense" | "ShopExpense" | "MiscExpense" | "Withdrawal"
 * @param params.entityId   - ID of the created/voided record
 * @param params.action     - "CREATE" | "VOID"
 * @param params.amount     - The financial amount
 * @param params.performedBy- User ID of the actor
 * @param params.req        - Express request (for IP extraction)
 * @param params.tx         - Prisma transaction client (to ensure atomicity)
 */
export interface AuditLogParams {
  shopId: string;
  entityType: string;
  entityId: string;
  action: 'CREATE' | 'VOID';
  amount: Decimal | number;
  performedBy: string;
  req: Request;
  tx?: typeof prisma;
}

export async function writeAuditLog(params: AuditLogParams): Promise<void> {
  const { shopId, entityType, entityId, action, amount, performedBy, req, tx } = params;
  const client = tx || prisma;

  // Extract IP, handling proxies
  const ipAddress =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    'unknown';

  await client.auditLog.create({
    data: {
      shopId,
      entityType,
      entityId,
      action,
      amount: new Decimal(amount.toString()),
      performedBy,
      ipAddress,
    },
  });
}

/**
 * Get client IP from request, handling proxied environments.
 */
export function getClientIp(req: Request): string {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    'unknown'
  );
}
