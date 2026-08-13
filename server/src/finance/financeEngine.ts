import { Decimal } from 'decimal.js';
import prisma from '../config/prisma';

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

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
  fixedExpenses: Decimal;
  grossProfit: Decimal;
  netProfit: Decimal;
  cashWithdrawals: Decimal;
  onlineWithdrawals: Decimal;
  totalWithdrawals: Decimal;
  totalDrawings: Decimal;
  loanTaken: Decimal;
  loanGiven: Decimal;
  pendingLoanTaken: Decimal;
  pendingLoanGiven: Decimal;
  profitMarginPercent: Decimal;
  expenseRatioPercent: Decimal;
  remainingBusinessBalance: Decimal;
  cashBalance: Decimal;
  onlineBalance: Decimal;
  cashMaterialExpenses: Decimal;
  onlineMaterialExpenses: Decimal;
  cashShopExpenses: Decimal;
  onlineShopExpenses: Decimal;
  cashMiscExpenses: Decimal;
  onlineMiscExpenses: Decimal;
  totalCashExpenses: Decimal;
  totalOnlineExpenses: Decimal;
}

function sumOrZero(val: Decimal | null | undefined): Decimal {
  return val ? new Decimal(val.toString()) : new Decimal(0);
}

export async function computeFinanceSummary(
  shopId: string,
  range: DateRange
): Promise<FinanceSummary> {
  const { from, to } = range;
  const dateFilter = { gte: from, lte: to };
  const cumulativeFilter = { lte: to };
  const baseWhere = { shopId, voidedAt: null };

  // ── Period Sales ──
  const [cashSalesAgg, onlineSalesAgg, salesEntryAgg] = await Promise.all([
    prisma.sale.aggregate({
      where: { ...baseWhere, type: 'CASH', saleDate: dateFilter },
      _sum: { amount: true },
    }),
    prisma.sale.aggregate({
      where: { ...baseWhere, type: 'ONLINE', saleDate: dateFilter },
      _sum: { amount: true },
    }),
    prisma.salesEntry.aggregate({
      where: { shopId, date: dateFilter },
      _sum: { cashSales: true, upiSales: true, cardSales: true, totalSales: true },
    }),
  ]);

  const legCashSales = sumOrZero(cashSalesAgg._sum.amount);
  const legOnlineSales = sumOrZero(onlineSalesAgg._sum.amount);
  const entryCashSales = sumOrZero(salesEntryAgg._sum.cashSales);
  const entryOnlineSales = sumOrZero(salesEntryAgg._sum.upiSales).plus(sumOrZero(salesEntryAgg._sum.cardSales));

  const totalCashSales = legCashSales.plus(entryCashSales);
  const totalOnlineSales = legOnlineSales.plus(entryOnlineSales);
  const totalSales = totalCashSales.plus(totalOnlineSales);

  // ── Period Expenses ──
  const [
    cashMatExpAgg, onlineMatExpAgg,
    cashShopExpAgg, onlineShopExpAgg,
    cashMiscExpAgg, onlineMiscExpAgg,
    expenseEntryAgg
  ] = await Promise.all([
    prisma.materialExpense.aggregate({
      where: { ...baseWhere, mode: 'CASH', expDate: dateFilter },
      _sum: { amount: true },
    }),
    prisma.materialExpense.aggregate({
      where: { ...baseWhere, mode: 'ONLINE', expDate: dateFilter },
      _sum: { amount: true },
    }),
    prisma.shopExpense.aggregate({
      where: { ...baseWhere, mode: 'CASH', expDate: dateFilter },
      _sum: { amount: true },
    }),
    prisma.shopExpense.aggregate({
      where: { ...baseWhere, mode: 'ONLINE', expDate: dateFilter },
      _sum: { amount: true },
    }),
    prisma.miscExpense.aggregate({
      where: { ...baseWhere, mode: 'CASH', expDate: dateFilter },
      _sum: { amount: true },
    }),
    prisma.miscExpense.aggregate({
      where: { ...baseWhere, mode: 'ONLINE', expDate: dateFilter },
      _sum: { amount: true },
    }),
    prisma.expenseEntry.findMany({
      where: { shopId, date: dateFilter },
    }),
  ]);

  let entryCashMat = new Decimal(0);
  let entryOnlineMat = new Decimal(0);
  let entryCashShop = new Decimal(0);
  let entryOnlineShop = new Decimal(0);
  let entryCashMisc = new Decimal(0);
  let entryOnlineMisc = new Decimal(0);
  let entryFixedExp = new Decimal(0);

  for (const exp of expenseEntryAgg) {
    const amt = new Decimal(exp.amount.toString());
    const isCash = exp.paymentMode === 'Cash';
    const cat = exp.category;

    if (cat === 'Material Purchase') {
      if (isCash) entryCashMat = entryCashMat.plus(amt);
      else entryOnlineMat = entryOnlineMat.plus(amt);
    } else if (cat === 'Shop Expense' || cat === 'Fixed Expense') {
      if (isCash) entryCashShop = entryCashShop.plus(amt);
      else entryOnlineShop = entryOnlineShop.plus(amt);
      if (cat === 'Fixed Expense') entryFixedExp = entryFixedExp.plus(amt);
    } else {
      if (isCash) entryCashMisc = entryCashMisc.plus(amt);
      else entryOnlineMisc = entryOnlineMisc.plus(amt);
    }
  }

  const cashMaterialExpenses = sumOrZero(cashMatExpAgg._sum.amount).plus(entryCashMat);
  const onlineMaterialExpenses = sumOrZero(onlineMatExpAgg._sum.amount).plus(entryOnlineMat);
  const totalMaterialExpenses = cashMaterialExpenses.plus(onlineMaterialExpenses);

  const cashShopExpenses = sumOrZero(cashShopExpAgg._sum.amount).plus(entryCashShop);
  const onlineShopExpenses = sumOrZero(onlineShopExpAgg._sum.amount).plus(entryOnlineShop);
  const totalShopExpenses = cashShopExpenses.plus(onlineShopExpenses);

  const cashMiscExpenses = sumOrZero(cashMiscExpAgg._sum.amount).plus(entryCashMisc);
  const onlineMiscExpenses = sumOrZero(onlineMiscExpAgg._sum.amount).plus(entryOnlineMisc);
  const totalMiscExpenses = cashMiscExpenses.plus(onlineMiscExpenses);

  const fixedExpenses = totalShopExpenses.plus(entryFixedExp);
  const totalExpenses = totalMaterialExpenses.plus(totalShopExpenses).plus(totalMiscExpenses);

  // ── Period Withdrawals / Drawings ──
  const [cashWithdAgg, onlineWithdAgg, drawingsEntryAgg] = await Promise.all([
    prisma.withdrawal.aggregate({
      where: { ...baseWhere, mode: 'CASH', wDate: dateFilter },
      _sum: { amount: true },
    }),
    prisma.withdrawal.aggregate({
      where: { ...baseWhere, mode: 'ONLINE', wDate: dateFilter },
      _sum: { amount: true },
    }),
    prisma.drawingsEntry.findMany({
      where: { shopId, date: dateFilter },
    }),
  ]);

  let entryCashDrawings = new Decimal(0);
  let entryOnlineDrawings = new Decimal(0);
  for (const d of drawingsEntryAgg) {
    const amt = new Decimal(d.amount.toString());
    if (d.paymentMode === 'Cash') entryCashDrawings = entryCashDrawings.plus(amt);
    else entryOnlineDrawings = entryOnlineDrawings.plus(amt);
  }

  const cashWithdrawals = sumOrZero(cashWithdAgg._sum.amount).plus(entryCashDrawings);
  const onlineWithdrawals = sumOrZero(onlineWithdAgg._sum.amount).plus(entryOnlineDrawings);
  const totalWithdrawals = cashWithdrawals.plus(onlineWithdrawals);
  const totalDrawings = totalWithdrawals;

  // ── Period Loans ──
  const [loanTakenAgg, loanGivenAgg, pendingTakenAgg, pendingGivenAgg] = await Promise.all([
    prisma.loanEntry.aggregate({
      where: { shopId, type: 'TAKEN', date: dateFilter },
      _sum: { amount: true },
    }),
    prisma.loanEntry.aggregate({
      where: { shopId, type: 'GIVEN', date: dateFilter },
      _sum: { amount: true },
    }),
    prisma.loanEntry.aggregate({
      where: { shopId, type: 'TAKEN', status: 'PENDING' },
      _sum: { pendingAmount: true },
    }),
    prisma.loanEntry.aggregate({
      where: { shopId, type: 'GIVEN', status: 'PENDING' },
      _sum: { pendingAmount: true },
    }),
  ]);

  const loanTaken = sumOrZero(loanTakenAgg._sum.amount);
  const loanGiven = sumOrZero(loanGivenAgg._sum.amount);
  const pendingLoanTaken = sumOrZero(pendingTakenAgg._sum.pendingAmount);
  const pendingLoanGiven = sumOrZero(pendingGivenAgg._sum.pendingAmount);

  // ── Cumulative Balances & Live Drawer Math ──
  const latestBalance = await prisma.dailyBalance.findFirst({
    where: { shopId, date: cumulativeFilter },
    orderBy: { date: 'desc' },
  });

  let openingCashVal = new Decimal(0);
  let openingBankVal = new Decimal(0);

  if (latestBalance) {
    openingCashVal = new Decimal(latestBalance.openingCash.toString());
    openingBankVal = new Decimal(latestBalance.openingBank.toString());
  }

  const totalCashExpenses = cashMaterialExpenses.plus(cashShopExpenses).plus(cashMiscExpenses);
  const totalOnlineExpenses = onlineMaterialExpenses.plus(onlineShopExpenses).plus(onlineMiscExpenses);

  const cashBalance = openingCashVal.plus(totalCashSales).minus(totalCashExpenses).minus(cashWithdrawals);
  const onlineBalance = openingBankVal.plus(totalOnlineSales).minus(totalOnlineExpenses).minus(onlineWithdrawals);

  const grossProfit = totalSales.minus(totalMaterialExpenses);
  const netProfit = grossProfit.minus(totalShopExpenses).minus(totalMiscExpenses);

  const profitMarginPercent = totalSales.greaterThan(0)
    ? netProfit.dividedBy(totalSales).times(100)
    : new Decimal(0);

  const expenseRatioPercent = totalSales.greaterThan(0)
    ? totalExpenses.dividedBy(totalSales).times(100)
    : new Decimal(0);

  const remainingBusinessBalance = cashBalance.plus(onlineBalance);

  return {
    totalCashSales,
    totalOnlineSales,
    totalSales,
    totalMaterialExpenses,
    totalShopExpenses,
    totalMiscExpenses,
    totalExpenses,
    fixedExpenses,
    grossProfit,
    netProfit,
    cashWithdrawals,
    onlineWithdrawals,
    totalWithdrawals,
    totalDrawings,
    loanTaken,
    loanGiven,
    pendingLoanTaken,
    pendingLoanGiven,
    profitMarginPercent,
    expenseRatioPercent,
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

export async function getExpenseBreakdown(shopId: string, range: DateRange) {
  const { from, to } = range;
  const dateFilter = { gte: from, lte: to };
  const baseWhere = { shopId, voidedAt: null };

  const [materialByCategory, shopByCategory, miscByName, expenseEntries] = await Promise.all([
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
    prisma.expenseEntry.findMany({
      where: { shopId, date: dateFilter },
    }),
  ]);

  const catMap: Record<string, Decimal> = {};
  for (const item of materialByCategory) {
    catMap[item.category] = sumOrZero(item._sum.amount);
  }
  for (const exp of expenseEntries) {
    const cat = exp.category;
    const amt = new Decimal(exp.amount.toString());
    catMap[cat] = (catMap[cat] || new Decimal(0)).plus(amt);
  }

  const material = Object.entries(catMap).map(([category, amount]) => ({
    category,
    amount: amount.toFixed(2),
  }));

  const shop = shopByCategory.map((g) => ({
    category: g.category,
    amount: sumOrZero(g._sum.amount).toFixed(2),
  }));

  const misc = miscByName.map((g) => ({
    name: g.name,
    amount: sumOrZero(g._sum.amount).toFixed(2),
  }));

  return { material, shop, misc };
}

export async function getMonthlyProfitTrend(
  shopId: string,
  monthsBack: number = 12
) {
  const now = new Date();
  const monthPromises = [];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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

export async function getDailySalesTrend(
  shopId: string,
  range: DateRange
) {
  const results = [];
  const current = new Date(range.from);

  while (current <= range.to) {
    const dayStart = new Date(current.getFullYear(), current.getMonth(), current.getDate());
    const dayEnd = new Date(current.getFullYear(), current.getMonth(), current.getDate(), 23, 59, 59, 999);

    const [cashAgg, onlineAgg, entryAgg] = await Promise.all([
      prisma.sale.aggregate({
        where: { shopId, voidedAt: null, type: 'CASH', saleDate: { gte: dayStart, lte: dayEnd } },
        _sum: { amount: true },
      }),
      prisma.sale.aggregate({
        where: { shopId, voidedAt: null, type: 'ONLINE', saleDate: { gte: dayStart, lte: dayEnd } },
        _sum: { amount: true },
      }),
      prisma.salesEntry.findFirst({
        where: { shopId, date: dayStart },
      }),
    ]);

    let cash = sumOrZero(cashAgg._sum.amount);
    let online = sumOrZero(onlineAgg._sum.amount);

    if (entryAgg) {
      cash = cash.plus(new Decimal(entryAgg.cashSales.toString()));
      online = online.plus(new Decimal(entryAgg.upiSales.toString())).plus(new Decimal(entryAgg.cardSales.toString()));
    }

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

export function serializeSummary(summary: FinanceSummary): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(summary)) {
    if (value instanceof Decimal) {
      result[key] = value.toFixed(2);
    }
  }
  return result;
}
