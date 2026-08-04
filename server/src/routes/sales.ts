import { Router, Request, Response, NextFunction } from 'express';
import { CreateSaleSchema, VoidReasonSchema, SalesQuerySchema } from '@shop-finance/shared';
import * as salesService from '../services/salesService';
import { authenticate } from '../middleware/auth';

const router = Router();

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
 * List sales.
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
 * PUT /api/sales/:id
 * Edit/Update a sale entry.
 */
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sale = await salesService.updateSale(
      req.user!.shopId,
      req.user!.userId,
      req.params.id as string,
      req.body,
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

/**
 * DELETE /api/sales/:id or PATCH /api/sales/:id/void
 * Delete/Void a sale entry.
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sale = await salesService.voidSale(
      req.user!.shopId,
      req.user!.userId,
      req.params.id as string,
      { reason: req.body?.reason || 'User deleted sale entry' },
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

router.patch('/:id/void', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = VoidReasonSchema.partial().parse(req.body || {});
    const sale = await salesService.voidSale(
      req.user!.shopId,
      req.user!.userId,
      req.params.id as string,
      { reason: input.reason || 'User voided sale entry' },
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
