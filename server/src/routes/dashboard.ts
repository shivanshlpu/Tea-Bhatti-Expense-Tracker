import { Router, Request, Response, NextFunction } from 'express';
import { computeFinanceSummary, serializeSummary, checkReconciliation } from '../finance/financeEngine';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

/**
 * GET /api/dashboard/today
 * Returns today's complete financial summary and MTD summary.
 */
router.get('/today', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const today = new Date();
    const from = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const to = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

    const summary = await computeFinanceSummary(req.user!.shopId, { from, to });

    const mtdFrom = new Date(today.getFullYear(), today.getMonth(), 1, 0, 0, 0, 0);
    const mtdSummary = await computeFinanceSummary(req.user!.shopId, { from: mtdFrom, to });

    const reconciliation = checkReconciliation(summary);

    res.json({
      success: true,
      data: {
        date: from.toISOString().split('T')[0],
        summary: serializeSummary(summary),
        mtdSummary: serializeSummary(mtdSummary),
        reconciliation,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/dashboard/summary?range=today|week|month|year|date&from=&to=
 * Returns financial summary & MTD summary for predefined range or custom date.
 */
router.get('/summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { range, from: fromQuery, to: toQuery } = req.query;
    const now = new Date();
    let from: Date;
    let to: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    if (fromQuery && toQuery) {
      const f = new Date(fromQuery as string);
      const t = new Date(toQuery as string);
      from = new Date(f.getFullYear(), f.getMonth(), f.getDate(), 0, 0, 0, 0);
      to = new Date(t.getFullYear(), t.getMonth(), t.getDate(), 23, 59, 59, 999);
    } else {
      switch (range) {
        case 'today':
          from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week': {
          const day = now.getDay();
          const diff = now.getDate() - day + (day === 0 ? -6 : 1);
          from = new Date(now.getFullYear(), now.getMonth(), diff);
          break;
        }
        case 'month':
          from = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'year':
          from = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      }
    }

    const summary = await computeFinanceSummary(req.user!.shopId, { from, to });

    const mtdFrom = new Date(to.getFullYear(), to.getMonth(), 1, 0, 0, 0, 0);
    const mtdSummary = await computeFinanceSummary(req.user!.shopId, { from: mtdFrom, to });

    const reconciliation = checkReconciliation(summary);

    res.json({
      success: true,
      data: {
        range: (range as string) || 'custom',
        from: from.toISOString(),
        to: to.toISOString(),
        summary: serializeSummary(summary),
        mtdSummary: serializeSummary(mtdSummary),
        reconciliation,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
