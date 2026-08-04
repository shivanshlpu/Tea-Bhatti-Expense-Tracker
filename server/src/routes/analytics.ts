import { Router, Request, Response, NextFunction } from 'express';
import { GranularitySchema, DateRangeQuerySchema } from '@shop-finance/shared';
import {
  getDailySalesTrend,
  getExpenseBreakdown,
  getMonthlyProfitTrend,
  computeFinanceSummary,
  serializeSummary,
} from '../finance/financeEngine';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

/**
 * GET /api/analytics/sales-trend?granularity=day|week|month&from=&to=
 */
router.get('/sales-trend', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const granularity = GranularitySchema.parse(req.query.granularity || 'day');
    const { from: fromStr, to: toStr } = DateRangeQuerySchema.parse(req.query);

    const now = new Date();
    let from: Date;
    let to: Date;

    if (fromStr && toStr) {
      from = new Date(fromStr);
      to = new Date(toStr);
    } else {
      // Default: last 30 days
      to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
    }

    if (granularity === 'day') {
      const trend = await getDailySalesTrend(req.user!.shopId, { from, to });
      res.json({ success: true, data: trend });
    } else {
      // For week/month granularity, aggregate by period
      // Simplified: just return daily for now, frontend can aggregate
      const trend = await getDailySalesTrend(req.user!.shopId, { from, to });
      res.json({ success: true, data: trend });
    }
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/analytics/expense-breakdown?from=&to=
 */
router.get('/expense-breakdown', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { from: fromStr, to: toStr } = DateRangeQuerySchema.parse(req.query);

    const now = new Date();
    const from = fromStr ? new Date(fromStr) : new Date(now.getFullYear(), now.getMonth(), 1);
    const to = toStr
      ? new Date(toStr)
      : new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const breakdown = await getExpenseBreakdown(req.user!.shopId, { from, to });

    res.json({ success: true, data: breakdown });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/analytics/profit-trend?from=&to=
 */
router.get('/profit-trend', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const trend = await getMonthlyProfitTrend(req.user!.shopId, 12);

    res.json({ success: true, data: trend });
  } catch (err) {
    next(err);
  }
});

export default router;
