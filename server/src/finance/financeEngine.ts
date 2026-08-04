import { Decimal } from 'decimal.js';
import prisma from '../config/prisma';

// Configure Decimal.js for financial precision
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

/**
 * financeEngine.ts — THE SINGLE SOURCE OF TRUTH for all financial formulas.
 * Section 4 of prompt.md: "implement ONCE in a shared financeEngine module,
 * never recompute inline elsewhere."
 *
 * Every function is date-range parameterized so the same engine powers:
 * - "today's dashboard"
 * - "custom report"
 * - "AI assistant answers"
 * One function, many callers, zero formula drift.
 */

export interface DateRange {
  from: Date;
  to: Date;
}

export interface FinanceSummary {
  totalCashSales: Decimal;
  totalOnlineSales: Decimal;
  totalSales: Decimal;
  totalMaterialExpenses: Decimal;
  totalShopExpenses: Decimal;
  totalMiscExpenses: Decimal;
  totalExpenses: Decimal;
  grossProfit: Decimal;
  netProfit: Decimal;
  cashWithdrawals: Decimal;
  onlineWithdrawals: Decimal;
  totalWithdrawals: Decimal;
  remainingBusinessBalance: Decimal;
  cashBalance: Decimal;
  onlineBalance: Decimal;
  // Expense breakdowns by mode
  cashMaterialExpenses: Decimal;
  onlineMaterialExpenses: Decimal;
  cashShopExpenses: Decimal;
  onlineShopExpenses: Decimal;
  cashMiscExpenses: Decimal;
  onlineMiscExpenses: Decimal;
  totalCashExpenses: Decimal;
  totalOnlineExpenses: Decimal;
}

/**
 * Helper: sum Decimal values from Prisma aggregate results.
 * Prisma returns { _sum: { amount: Decimal | null } }
 */
function sumOrZero(val: Decimal | null | undefined): Decimal {
  return val ? new Decimal(val.toString()) : new Decimal(0);
}

/**
 * Core engine: computes ALL financial metrics for a shop within a date range.
 * This is THE function that dashboard, reports, analytics, and the assistant call.
 */
export async function computeFinanceSummary(
  shopId: string,
  range: DateRange
): Promise<FinanceSummary> {
  const { from, to } = range;
  const dateFilter = { gte: from, lte: to };
  const cumulativeFilter = { lte: to };
  const baseWhere = { shopId, voidedAt: null }; // Always exclude voided records

  // ── Period Sales ──
  const [cashSalesAgg, onlineSalesAgg] = await Promise.all([
    prisma.sale.aggregate({
      where: { ...baseWhere, type: 'CASH', saleDate: dateFilter },
      _sum: { amount: true },
    }),
    prisma.sale.aggregate({
      where: { ...baseWhere, type: 'ONLINE', saleDate: dateFilter },
      _sum: { amount: true },
    }),
  ]);

  const totalCashSales = sumOrZero(cashSalesAgg._sum.amount);
  const totalOnlineSales = sumOrZero(onlineSalesAgg._sum.amount);
  const totalSales = totalCashSales.plus(totalOnlineSales);

  // ── Period Material Expenses (by mode) ──
  const [cashMatExpAgg, onlineMatExpAgg] = await Promise.all([
    prisma.materialExpense.aggregate({
      where: { ...baseWhere, mode: 'CASH', expDate: dateFilter },
      _sum: { amount: true },
    }),
    prisma.materialExpense.aggregate({
      where: { ...baseWhere, mode: 'ONLINE', expDate: dateFilter },
      _sum: { amount: true },
    }),
  ]);

  const cashMaterialExpenses = sumOrZero(cashMatExpAgg._sum.amount);
  const onlineMaterialExpenses = sumOrZero(onlineMatExpAgg._sum.amount);
  const totalMaterialExpenses = cashMaterialExpenses.plus(onlineMaterialExpenses);

  // ── Period Shop Expenses (by mode) ──
  const [cashShopExpAgg, onlineShopExpAgg] = await Promise.all([
    prisma.shopExpense.aggregate({
      where: { ...baseWhere, mode: 'CASH', expDate: dateFilter },
      _sum: { amount: true },
    }),
    prisma.shopExpense.aggregate({
      where: { ...baseWhere, mode: 'ONLINE', expDate: dateFilter },
      _sum: { amount: true },
    }),
  ]);

  const cashShopExpenses = sumOrZero(cashShopExpAgg._sum.amount);
  const onlineShopExpenses = sumOrZero(onlineShopExpAgg._sum.amount);
  const totalShopExpenses = cashShopExpenses.plus(onlineShopExpenses);

  // ── Period Misc Expenses (by mode) ──
  const [cashMiscExpAgg, onlineMiscExpAgg] = await Promise.all([
    prisma.miscExpense.aggregate({
      where: { ...baseWhere, mode: 'CASH', expDate: dateFilter },
      _sum: { amount: true },
    }),
    prisma.miscExpense.aggregate({
      where: { ...baseWhere, mode: 'ONLINE', expDate: dateFilter },
      _sum: { amount: true },
    }),
  ]);

  const cashMiscExpenses = sumOrZero(cashMiscExpAgg._sum.amount);
  const onlineMiscExpenses = sumOrZero(onlineMiscExpAgg._sum.amount);
  const totalMiscExpenses = cashMiscExpenses.plus(onlineMiscExpenses);

  // ── Period Withdrawals (by mode) ──
  const [cashWithdAgg, onlineWithdAgg] = await Promise.all([
    prisma.withdrawal.aggregate({
      where: { ...baseWhere, mode: 'CASH', wDate: dateFilter },
      _sum: { amount: true },
    }),
    prisma.withdrawal.aggregate({
      where: { ...baseWhere, mode: 'ONLINE', wDate: dateFilter },
      _sum: { amount: true },
    }),
  ]);

  const cashWithdrawals = sumOrZero(cashWithdAgg._sum.amount);
  const onlineWithdrawals = sumOrZero(onlineWithdAgg._sum.amount);
  const totalWithdrawals = cashWithdrawals.plus(onlineWithdrawals);

  // ── Cumulative Account Balances (Lifetime up to 'to' date) ──
  const [
    cumCashSalesAgg,
    cumOnlineSalesAgg,
    cumCashMatAgg,
    cumOnlineMatAgg,
    cumCashShopAgg,
    cumOnlineShopAgg,
    cumCashMiscAgg,
    cumOnlineMiscAgg,
    cumCashWithdAgg,
    cumOnlineWithdAgg,
  ] = await Promise.all([
    prisma.sale.aggregate({
      where: { ...baseWhere, type: 'CASH', saleDate: cumulativeFilter },
      _sum: { amount: true },
    }),
    prisma.sale.aggregate({
      where: { ...baseWhere, type: 'ONLINE', saleDate: cumulativeFilter },
      _sum: { amount: true },
    }),
    prisma.materialExpense.aggregate({
      where: { ...baseWhere, mode: 'CASH', expDate: cumulativeFilter },
      _sum: { amount: true },
    }),
    prisma.materialExpense.aggregate({
      where: { ...baseWhere, mode: 'ONLINE', expDate: cumulativeFilter },
      _sum: { amount: true },
    }),
    prisma.shopExpense.aggregate({
      where: { ...baseWhere, mode: 'CASH', expDate: cumulativeFilter },
      _sum: { amount: true },
    }),
    prisma.shopExpense.aggregate({
      where: { ...baseWhere, mode: 'ONLINE', expDate: cumulativeFilter },
      _sum: { amount: true },
    }),
    prisma.miscExpense.aggregate({
      where: { ...baseWhere, mode: 'CASH', expDate: cumulativeFilter },
      _sum: { amount: true },
    }),
    prisma.miscExpense.aggregate({
      where: { ...baseWhere, mode: 'ONLINE', expDate: cumulativeFilter },
      _sum: { amount: true },
    }),
    prisma.withdrawal.aggregate({
      where: { ...baseWhere, mode: 'CASH', wDate: cumulativeFilter },
      _sum: { amount: true },
    }),
    prisma.withdrawal.aggregate({
      where: { ...baseWhere, mode: 'ONLINE', wDate: cumulativeFilter },
      _sum: { amount: true },
    }),
  ]);

  const cumCashSales = sumOrZero(cumCashSalesAgg._sum.amount);
  const cumOnlineSales = sumOrZero(cumOnlineSalesAgg._sum.amount);
  const cumCashExp = sumOrZero(cumCashMatAgg._sum.amount)
    .plus(sumOrZero(cumCashShopAgg._sum.amount))
    .plus(sumOrZero(cumCashMiscAgg._sum.amount));
  const cumOnlineExp = sumOrZero(cumOnlineMatAgg._sum.amount)
    .plus(sumOrZero(cumOnlineShopAgg._sum.amount))
    .plus(sumOrZero(cumOnlineMiscAgg._sum.amount));
  const cumCashWithd = sumOrZero(cumCashWithdAgg._sum.amount);
  const cumOnlineWithd = sumOrZero(cumOnlineWithdAgg._sum.amount);

  // Real-world Cash Drawer Balance and Bank Account Balance
  const cashBalance = cumCashSales.minus(cumCashExp).minus(cumCashWithd);
  const onlineBalance = cumOnlineSales.minus(cumOnlineExp).minus(cumOnlineWithd);

  // ── Derived Formulas for Period ──
  const totalExpenses = totalMaterialExpenses.plus(totalShopExpenses).plus(totalMiscExpenses);
  const grossProfit = totalSales.minus(totalMaterialExpenses);
  const netProfit = grossProfit.minus(totalShopExpenses).minus(totalMiscExpenses);
  const remainingBusinessBalance = cashBalance.plus(onlineBalance);

  const totalCashExpenses = cashMaterialExpenses.plus(cashShopExpenses).plus(cashMiscExpenses);
  const totalOnlineExpenses = onlineMaterialExpenses.plus(onlineShopExpenses).plus(onlineMiscExpenses);

  return {
    totalCashSales,
    totalOnlineSales,
    totalSales,
    totalMaterialExpenses,
    totalShopExpenses,
    totalMiscExpenses,
    totalExpenses,
    grossProfit,
    netProfit,
    cashWithdrawals,
    onlineWithdrawals,
    totalWithdrawals,
    remainingBusinessBalance,
    cashBalance,
    onlineBalance,
    cashMaterialExpenses,
    onlineMaterialExpenses,
    cashShopExpenses,
    onlineShopExpenses,
    cashMiscExpenses,
    onlineMiscExpenses,
    totalCashExpenses,
    totalOnlineExpenses,
  };
}

/**
 * Reconciliation invariant check (CA rule — Section 4):
 * Cash Balance + Online Balance === Remaining Business Balance
 *
 * If this fails, a mode (cash/online) was mis-tagged somewhere.
 * Surface as a hard error, not a silent rounding fix.
 */
export function checkReconciliation(summary: FinanceSummary): {
  passes: boolean;
  cashPlusOnline: string;
  businessBalance: string;
  difference: string;
} {
  const cashPlusOnline = summary.cashBalance.plus(summary.onlineBalance);
  const difference = cashPlusOnline.minus(summary.remainingBusinessBalance);

  return {
    passes: difference.isZero(),
    cashPlusOnline: cashPlusOnline.toFixed(2),
    businessBalance: summary.remainingBusinessBalance.toFixed(2),
    difference: difference.toFixed(2),
  };
}

/**
 * Compute per-category expense breakdown for a date range.
 * Used by analytics and the query assistant.
 */
export async function getExpenseBreakdown(shopId: string, range: DateRange) {
  const { from, to } = range;
  const dateFilter = { gte: from, lte: to };
  const baseWhere = { shopId, voidedAt: null };

  const [materialByCategory, shopByCategory, miscByName] = await Promise.all([
    prisma.materialExpense.groupBy({
      by: ['category'],
      where: { ...baseWhere, expDate: dateFilter },
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
    }),
    prisma.shopExpense.groupBy({
      by: ['category'],
      where: { ...baseWhere, expDate: dateFilter },
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
    }),
    prisma.miscExpense.groupBy({
      by: ['name'],
      where: { ...baseWhere, expDate: dateFilter },
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
    }),
  ]);

  return {
    material: materialByCategory.map((g) => ({
      category: g.category,
      amount: sumOrZero(g._sum.amount).toFixed(2),
    })),
    shop: shopByCategory.map((g) => ({
      category: g.category,
      amount: sumOrZero(g._sum.amount).toFixed(2),
    })),
    misc: miscByName.map((g) => ({
      name: g.name,
      amount: sumOrZero(g._sum.amount).toFixed(2),
    })),
  };
}

/**
 * Get monthly profit data for trend analysis and comparison.
 * Returns an array of { month, year, netProfit, grossProfit, totalSales } sorted chronologically.
 */
export async function getMonthlyProfitTrend(
  shopId: string,
  monthsBack: number = 12
): Promise<Array<{
  month: number;
  year: number;
  label: string;
  totalSales: string;
  totalMaterialExpenses: string;
  totalShopExpenses: string;
  totalMiscExpenses: string;
  grossProfit: string;
  netProfit: string;
}>> {
  const now = new Date();
  const monthPromises = [];

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  for (let i = monthsBack - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const from = new Date(date.getFullYear(), date.getMonth(), 1);
    const to = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);

    monthPromises.push(
      computeFinanceSummary(shopId, { from, to }).then((summary) => ({
        month: date.getMonth() + 1,
        year: date.getFullYear(),
        label: `${monthNames[date.getMonth()]} ${date.getFullYear()}`,
        totalSales: summary.totalSales.toFixed(2),
        totalMaterialExpenses: summary.totalMaterialExpenses.toFixed(2),
        totalShopExpenses: summary.totalShopExpenses.toFixed(2),
        totalMiscExpenses: summary.totalMiscExpenses.toFixed(2),
        grossProfit: summary.grossProfit.toFixed(2),
        netProfit: summary.netProfit.toFixed(2),
      }))
    );
  }

  return Promise.all(monthPromises);
}

/**
 * Get daily sales trend for charts.
 */
export async function getDailySalesTrend(
  shopId: string,
  range: DateRange
): Promise<Array<{ date: string; cashSales: string; onlineSales: string; totalSales: string }>> {
  const results = [];
  const current = new Date(range.from);

  while (current <= range.to) {
    const dayStart = new Date(current.getFullYear(), current.getMonth(), current.getDate());
    const dayEnd = new Date(current.getFullYear(), current.getMonth(), current.getDate(), 23, 59, 59, 999);

    const [cashAgg, onlineAgg] = await Promise.all([
      prisma.sale.aggregate({
        where: { shopId, voidedAt: null, type: 'CASH', saleDate: { gte: dayStart, lte: dayEnd } },
        _sum: { amount: true },
      }),
      prisma.sale.aggregate({
        where: { shopId, voidedAt: null, type: 'ONLINE', saleDate: { gte: dayStart, lte: dayEnd } },
        _sum: { amount: true },
      }),
    ]);

    const cash = sumOrZero(cashAgg._sum.amount);
    const online = sumOrZero(onlineAgg._sum.amount);

    results.push({
      date: dayStart.toISOString().split('T')[0],
      cashSales: cash.toFixed(2),
      onlineSales: online.toFixed(2),
      totalSales: cash.plus(online).toFixed(2),
    });

    current.setDate(current.getDate() + 1);
  }

  return results;
}

/**
 * Serialize a FinanceSummary to plain JSON (string amounts for safe transit).
 * All amounts are formatted to 2 decimal places.
 */
export function serializeSummary(summary: FinanceSummary): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(summary)) {
    result[key] = (value as Decimal).toFixed(2);
  }
  return result;
}
