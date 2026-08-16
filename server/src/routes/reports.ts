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

  const [
    sales, materialExpenses, shopExpenses, miscExpenses, withdrawals, loans,
    salesEntries, expenseEntries, drawingsEntries
  ] = await Promise.all([
    prisma.sale.findMany({ where: { ...baseWhere, saleDate: dateFilter }, orderBy: [{ saleDate: 'desc' }, { createdAt: 'desc' }] }),
    prisma.materialExpense.findMany({ where: { ...baseWhere, expDate: dateFilter }, orderBy: [{ expDate: 'desc' }, { createdAt: 'desc' }] }),
    prisma.shopExpense.findMany({ where: { ...baseWhere, expDate: dateFilter }, orderBy: [{ expDate: 'desc' }, { createdAt: 'desc' }] }),
    prisma.miscExpense.findMany({ where: { ...baseWhere, expDate: dateFilter }, orderBy: [{ expDate: 'desc' }, { createdAt: 'desc' }] }),
    prisma.withdrawal.findMany({ where: { ...baseWhere, wDate: dateFilter }, orderBy: [{ wDate: 'desc' }, { createdAt: 'desc' }] }),
    prisma.loanEntry.findMany({ where: { shopId, date: dateFilter }, orderBy: [{ date: 'desc' }, { createdAt: 'desc' }] }),
    prisma.salesEntry.findMany({ where: { shopId, date: dateFilter }, orderBy: [{ date: 'desc' }, { createdAt: 'desc' }] }),
    prisma.expenseEntry.findMany({ where: { shopId, date: dateFilter }, orderBy: [{ date: 'desc' }, { createdAt: 'desc' }] }),
    prisma.drawingsEntry.findMany({ where: { shopId, date: dateFilter }, orderBy: [{ date: 'desc' }, { createdAt: 'desc' }] }),
  ]);

  const allSales = [...sales.map((s) => ({ ...s, amount: s.amount.toString() }))];
  for (const se of salesEntries) {
    const cashAmt = parseFloat(se.cashSales.toString());
    const upiAmt = parseFloat(se.upiSales.toString());
    const cardAmt = parseFloat(se.cardSales.toString());
    if (cashAmt > 0) {
      allSales.push({
        id: `${se.id}_cash`,
        shopId: se.shopId,
        type: 'CASH' as any,
        amount: se.cashSales.toString(),
        paymentMethod: 'Cash (Register)',
        note: se.note || 'Daily Register Cash',
        saleDate: se.date,
        createdAt: se.createdAt,
        createdBy: 'Daily Register',
        voidedAt: null,
        voidReason: null,
      });
    }
    if (upiAmt > 0) {
      allSales.push({
        id: `${se.id}_upi`,
        shopId: se.shopId,
        type: 'ONLINE' as any,
        amount: se.upiSales.toString(),
        paymentMethod: 'UPI (Register)',
        note: se.note || 'Daily Register UPI',
        saleDate: se.date,
        createdAt: se.createdAt,
        createdBy: 'Daily Register',
        voidedAt: null,
        voidReason: null,
      });
    }
    if (cardAmt > 0) {
      allSales.push({
        id: `${se.id}_card`,
        shopId: se.shopId,
        type: 'ONLINE' as any,
        amount: se.cardSales.toString(),
        paymentMethod: 'Card (Register)',
        note: se.note || 'Daily Register Card',
        saleDate: se.date,
        createdAt: se.createdAt,
        createdBy: 'Daily Register',
        voidedAt: null,
        voidReason: null,
      });
    }
  }

  const allMaterial = [...materialExpenses.map((e) => ({ ...e, amount: e.amount.toString() }))];
  const allShop = [...shopExpenses.map((e) => ({ ...e, amount: e.amount.toString() }))];
  const allMisc = [...miscExpenses.map((e) => ({ ...e, amount: e.amount.toString() }))];

  for (const ee of expenseEntries) {
    const mode = ee.paymentMode === 'Cash' ? 'CASH' : 'ONLINE';
    if (ee.category === 'Material Purchase') {
      allMaterial.push({
        id: ee.id,
        shopId: ee.shopId,
        category: ee.category,
        amount: ee.amount.toString(),
        mode: mode as any,
        note: ee.note || 'Daily Register Material',
        expDate: ee.date,
        createdAt: ee.createdAt,
        createdBy: 'Daily Register',
        voidedAt: null,
        voidReason: null,
      });
    } else if (ee.category === 'Shop Expense' || ee.category === 'Fixed Expense') {
      allShop.push({
        id: ee.id,
        shopId: ee.shopId,
        category: ee.category,
        amount: ee.amount.toString(),
        mode: mode as any,
        note: ee.note || 'Daily Register Shop Overhead',
        expDate: ee.date,
        isRecurring: false,
        createdAt: ee.createdAt,
        createdBy: 'Daily Register',
        voidedAt: null,
        voidReason: null,
      });
    } else {
      allMisc.push({
        id: ee.id,
        shopId: ee.shopId,
        name: ee.category,
        amount: ee.amount.toString(),
        mode: mode as any,
        note: ee.note || 'Daily Register Misc',
        expDate: ee.date,
        createdAt: ee.createdAt,
        createdBy: 'Daily Register',
        voidedAt: null,
        voidReason: null,
      });
    }
  }

  const allWithdrawals = [...withdrawals.map((w) => ({ ...w, amount: w.amount.toString() }))];
  for (const de of drawingsEntries) {
    allWithdrawals.push({
      id: de.id,
      shopId: de.shopId,
      mode: (de.paymentMode === 'Cash' ? 'CASH' : 'ONLINE') as any,
      amount: de.amount.toString(),
      note: de.reason || 'Daily Register Owner Drawing',
      wDate: de.date,
      createdAt: de.createdAt,
      createdBy: 'Daily Register',
      voidedAt: null,
      voidReason: null,
    });
  }

  return {
    shopName: shop?.name || 'Shop',
    ownerName: shop?.ownerName || 'Owner',
    from,
    to,
    category: categoryFilter,
    summary,
    records: {
      sales: allSales,
      materialExpenses: allMaterial,
      shopExpenses: allShop,
      miscExpenses: allMisc,
      withdrawals: allWithdrawals,
      loans: loans.map((l) => ({
        ...l,
        amount: l.amount.toString(),
        returnedAmount: l.returnedAmount.toString(),
        pendingAmount: l.pendingAmount.toString(),
      })),
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
