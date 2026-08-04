import { Router, Request, Response, NextFunction } from 'express';
import { CreateSaleSchema, VoidReasonSchema, SalesQuerySchema } from '@shop-finance/shared';
import * as salesService from '../services/salesService';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * POST /api/sales
 * Create a new sale entry.
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = CreateSaleSchema.parse(req.body);
    const sale = await salesService.createSale(
      req.user!.shopId,
      req.user!.userId,
      input,
      req
    );

    res.status(201).json({
      success: true,
      data: { ...sale, amount: sale.amount.toString() },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/sales?from=&to=&type=
 * List sales with optional filters.
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filters = SalesQuerySchema.parse(req.query);
    const sales = await salesService.listSales(req.user!.shopId, filters);

    res.json({ success: true, data: sales });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/sales/:id/void
 * Void (soft-delete) a sale. Requires OWNER role.
 */
router.patch('/:id/void', authorize('OWNER'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = VoidReasonSchema.parse(req.body);
    const sale = await salesService.voidSale(
      req.user!.shopId,
      req.user!.userId,
      req.params.id as string,
      input,
      req
    );

    res.json({
      success: true,
      data: { ...sale, amount: sale.amount.toString() },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
