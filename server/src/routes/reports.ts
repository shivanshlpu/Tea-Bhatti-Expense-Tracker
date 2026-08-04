import { Router, Request, Response, NextFunction } from 'express';
import { DateRangeQuerySchema } from '@shop-finance/shared';
import { computeFinanceSummary, serializeSummary, checkReconciliation } from '../finance/financeEngine';
import prisma from '../config/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { generatePdfReport } from '../export/pdfGenerator';
import { generateExcelReport } from '../export/excelGenerator';

const router = Router();

router.use(authenticate);

/**
 * Helper to fetch shop and records for exports.
 */
async function fetchReportData(shopId: string, fromStr?: string, toStr?: string, categoryFilter: string = 'ALL') {
  const now = new Date();
  let from: Date;
  if (fromStr) {
    from = new Date(fromStr.length === 10 ? `${fromStr}T00:00:00.000Z` : fromStr);
    if (isNaN(from.getTime())) from = new Date(now.getFullYear(), now.getMonth(), 1);
  } else {
    from = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  let to: Date;
  if (toStr) {
    to = new Date(toStr.length === 10 ? `${toStr}T23:59:59.999Z` : toStr);
    if (isNaN(to.getTime())) to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  } else {
    to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  }

  const shop = await prisma.shop.findUnique({ where: { id: shopId } });
  const dateFilter = { gte: from, lte: to };
  const baseWhere = { shopId, voidedAt: null };

  const summary = await computeFinanceSummary(shopId, { from, to });

  const [sales, materialExpenses, shopExpenses, miscExpenses, withdrawals] = await Promise.all([
    prisma.sale.findMany({ where: { ...baseWhere, saleDate: dateFilter }, orderBy: [{ saleDate: 'desc' }, { createdAt: 'desc' }] }),
    prisma.materialExpense.findMany({ where: { ...baseWhere, expDate: dateFilter }, orderBy: [{ expDate: 'desc' }, { createdAt: 'desc' }] }),
    prisma.shopExpense.findMany({ where: { ...baseWhere, expDate: dateFilter }, orderBy: [{ expDate: 'desc' }, { createdAt: 'desc' }] }),
    prisma.miscExpense.findMany({ where: { ...baseWhere, expDate: dateFilter }, orderBy: [{ expDate: 'desc' }, { createdAt: 'desc' }] }),
    prisma.withdrawal.findMany({ where: { ...baseWhere, wDate: dateFilter }, orderBy: [{ wDate: 'desc' }, { createdAt: 'desc' }] }),
  ]);

  return {
    shopName: shop?.name || 'Shop',
    ownerName: shop?.ownerName || 'Owner',
    from,
    to,
    category: categoryFilter,
    summary,
    records: {
      sales: sales.map((s) => ({ ...s, amount: s.amount.toString() })),
      materialExpenses: materialExpenses.map((e) => ({ ...e, amount: e.amount.toString() })),
      shopExpenses: shopExpenses.map((e) => ({ ...e, amount: e.amount.toString() })),
      miscExpenses: miscExpenses.map((e) => ({ ...e, amount: e.amount.toString() })),
      withdrawals: withdrawals.map((w) => ({ ...w, amount: w.amount.toString() })),
    },
  };
}

/**
 * GET /api/reports?from=&to=&category=
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { from: fromStr, to: toStr, category: categoryStr } = DateRangeQuerySchema.parse(req.query);
    const category = categoryStr || 'ALL';
    const data = await fetchReportData(req.user!.shopId, fromStr, toStr, category);
    const reconciliation = checkReconciliation(data.summary);

    res.json({
      success: true,
      data: {
        from: data.from.toISOString(),
        to: data.to.toISOString(),
        category,
        summary: serializeSummary(data.summary),
        reconciliation,
        records: data.records,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/reports/export/pdf?from=&to=&category=
 * Server-side PDF export via Puppeteer.
 */
router.get('/export/pdf', authorize('OWNER', 'STAFF'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { from: fromStr, to: toStr, category: categoryStr } = DateRangeQuerySchema.parse(req.query);
    const category = categoryStr || 'ALL';
    const data = await fetchReportData(req.user!.shopId, fromStr, toStr, category);

    const pdfBuffer = await generatePdfReport(data);

    const filename = `Report_${category}_${data.from.toISOString().slice(0, 10)}_to_${data.to.toISOString().slice(0, 10)}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/reports/export/xlsx?from=&to=&category=
 * Server-side Excel export via ExcelJS.
 */
router.get('/export/xlsx', authorize('OWNER', 'STAFF'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { from: fromStr, to: toStr, category: categoryStr } = DateRangeQuerySchema.parse(req.query);
    const category = categoryStr || 'ALL';
    const data = await fetchReportData(req.user!.shopId, fromStr, toStr, category);

    const excelBuffer = await generateExcelReport(data);

    const filename = `Report_${category}_${data.from.toISOString().slice(0, 10)}_to_${data.to.toISOString().slice(0, 10)}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(excelBuffer);
  } catch (err) {
    next(err);
  }
});

export default router;
