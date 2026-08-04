import { Router, Request, Response, NextFunction } from 'express';
import { CreateWithdrawalSchema, VoidReasonSchema, DateRangeQuerySchema } from '@shop-finance/shared';
import * as withdrawalService from '../services/withdrawalService';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

/**
 * POST /api/withdrawals
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = CreateWithdrawalSchema.parse(req.body);
    const withdrawal = await withdrawalService.createWithdrawal(
      req.user!.shopId,
      req.user!.userId,
      input,
      req
    );
    res.status(201).json({
      success: true,
      data: { ...withdrawal, amount: withdrawal.amount.toString() },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/withdrawals?from=&to=
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filters = DateRangeQuerySchema.parse(req.query);
    const withdrawals = await withdrawalService.listWithdrawals(req.user!.shopId, filters);
    res.json({ success: true, data: withdrawals });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/withdrawals/:id/void
 */
router.patch('/:id/void', authorize('OWNER'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = VoidReasonSchema.parse(req.body);
    const withdrawal = await withdrawalService.voidWithdrawal(
      req.user!.shopId,
      req.user!.userId,
      req.params.id as string,
      input,
      req
    );
    res.json({
      success: true,
      data: { ...withdrawal, amount: withdrawal.amount.toString() },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
