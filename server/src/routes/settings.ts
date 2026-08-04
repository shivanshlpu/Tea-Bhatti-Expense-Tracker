import { Router, Request, Response, NextFunction } from 'express';
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
