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
  openingCashVal: Decimal;
  openingBankVal: Decimal;
  totalOpeningVal: Decimal;
  effectiveTotalSales: Decimal;
  totalMaterialExpenses: Decimal;
  totalShopExpenses: Decimal;
  totalMiscExpenses: Decimal;
  totalExpenses: Decimal;
  fixedExpenses: Decimal;
  cashGrossProfit: Decimal;
  onlineGrossProfit: Decimal;
  grossProfit: Decimal;
  cashNetProfit: Decimal;
  onlineNetProfit: Decimal;
  netProfit: Decimal;
  cashWithdrawals: Decimal;
  onlineWithdrawals: Decimal;
  totalWithdrawals: Decimal;
  totalDrawings: Decimal;
  cashLoanTaken: Decimal;
  onlineLoanTaken: Decimal;
  loanTaken: Decimal;
  cashLoanGiven: Decimal;
  onlineLoanGiven: Decimal;
  loanGiven: Decimal;
  cashLoanTakenReturned: Decimal;
  onlineLoanTakenReturned: Decimal;
  loanTakenReturned: Decimal;
  cashLoanGivenReturned: Decimal;
  onlineLoanGivenReturned: Decimal;
  loanGivenReturned: Decimal;
  pendingLoanTaken: Decimal;
  pendingLoanGiven: Decimal;
  grossMarginPercent: Decimal;
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
  const [loanEntries, pendingTakenAgg, pendingGivenAgg] = await Promise.all([
    prisma.loanEntry.findMany({
      where: { shopId, date: dateFilter },
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

  let cashLoanGiven = new Decimal(0);
  let onlineLoanGiven = new Decimal(0);
  let cashLoanGivenReturned = new Decimal(0);
  let onlineLoanGivenReturned = new Decimal(0);

  let cashLoanTaken = new Decimal(0);
  let onlineLoanTaken = new Decimal(0);
  let cashLoanTakenReturned = new Decimal(0);
  let onlineLoanTakenReturned = new Decimal(0);

  for (const l of loanEntries) {
    const amt = new Decimal(l.amount.toString());
    const ret = new Decimal(l.returnedAmount.toString());
    const mode = (l.paymentMode || 'CASH').toUpperCase();

    if (l.type === 'GIVEN') {
      if (mode === 'ONLINE') {
        onlineLoanGiven = onlineLoanGiven.plus(amt);
        onlineLoanGivenReturned = onlineLoanGivenReturned.plus(ret);
      } else {
        cashLoanGiven = cashLoanGiven.plus(amt);
        cashLoanGivenReturned = cashLoanGivenReturned.plus(ret);
      }
    } else if (l.type === 'TAKEN') {
      if (mode === 'ONLINE') {
        onlineLoanTaken = onlineLoanTaken.plus(amt);
        onlineLoanTakenReturned = onlineLoanTakenReturned.plus(ret);
      } else {
        cashLoanTaken = cashLoanTaken.plus(amt);
        cashLoanTakenReturned = cashLoanTakenReturned.plus(ret);
      }
    }
  }

  const loanGiven = cashLoanGiven.plus(onlineLoanGiven);
  const loanTaken = cashLoanTaken.plus(onlineLoanTaken);
  const loanGivenReturned = cashLoanGivenReturned.plus(onlineLoanGivenReturned);
  const loanTakenReturned = cashLoanTakenReturned.plus(onlineLoanTakenReturned);

  const pendingLoanTaken = sumOrZero(pendingTakenAgg._sum.pendingAmount);
  const pendingLoanGiven = sumOrZero(pendingGivenAgg._sum.pendingAmount);

  // ── Period Opening Balances ──
  // Opening balance at the start of the period
  const startDay = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const balanceOnOrBefore = await prisma.dailyBalance.findFirst({
    where: { shopId, date: { lte: startDay } },
    orderBy: { date: 'desc' },
  });

  let openingCashVal = new Decimal(0);
  let openingBankVal = new Decimal(0);

  if (balanceOnOrBefore) {
    const isSameDay = balanceOnOrBefore.date.toISOString().slice(0, 10) === startDay.toISOString().slice(0, 10);
    if (isSameDay) {
      openingCashVal = new Decimal(balanceOnOrBefore.openingCash.toString());
      openingBankVal = new Decimal(balanceOnOrBefore.openingBank.toString());
    } else {
      openingCashVal = new Decimal(balanceOnOrBefore.closingCash.toString());
      openingBankVal = new Decimal(balanceOnOrBefore.closingBank.toString());
    }
  }

  const totalCashExpenses = cashMaterialExpenses.plus(cashShopExpenses).plus(cashMiscExpenses);
  const totalOnlineExpenses = onlineMaterialExpenses.plus(onlineShopExpenses).plus(onlineMiscExpenses);

  // ── Cash Flow & Live Drawer Math ──
  // Cash Balance: Opening + Cash Sales + Cash Loans Borrowed + Cash Loan Repayments Recv − Cash Exp − Cash Drawings − Cash Loans Issued − Cash Debt Repaid
  const cashBalance = openingCashVal
    .plus(totalCashSales)
    .plus(cashLoanTaken)
    .plus(cashLoanGivenReturned)
    .minus(totalCashExpenses)
    .minus(cashWithdrawals)
    .minus(cashLoanGiven)
    .minus(cashLoanTakenReturned);

  // Online Balance: Opening + Online Sales + Online Loans Borrowed + Online Loan Repayments Recv − Online Exp − Online Drawings − Online Loans Issued − Online Debt Repaid
  const onlineBalance = openingBankVal
    .plus(totalOnlineSales)
    .plus(onlineLoanTaken)
    .plus(onlineLoanGivenReturned)
    .minus(totalOnlineExpenses)
    .minus(onlineWithdrawals)
    .minus(onlineLoanGiven)
    .minus(onlineLoanTakenReturned);

  const totalOpeningVal = openingCashVal.plus(openingBankVal);
  const effectiveTotalSales = totalSales.plus(totalOpeningVal);

  // ── Profit & Loss (P&L Income Statement) ──
  // Gross Profit = Sales Revenue - Cost of Goods Sold (Direct Material Expenses)
  const cashGrossProfit = totalCashSales.minus(cashMaterialExpenses);
  const onlineGrossProfit = totalOnlineSales.minus(onlineMaterialExpenses);
  const grossProfit = totalSales.minus(totalMaterialExpenses);

  // Operating Net Profit = Gross Profit - Operating Overheads (Shop Expenses + Misc Expenses)
  const cashShopTotal = cashShopExpenses.plus(cashMiscExpenses);
  const onlineShopTotal = onlineShopExpenses.plus(onlineMiscExpenses);
  const cashNetProfit = cashGrossProfit.minus(cashShopTotal);
  const onlineNetProfit = onlineGrossProfit.minus(onlineShopTotal);
  const netProfit = grossProfit.minus(totalShopExpenses).minus(totalMiscExpenses);

  const grossMarginPercent = totalSales.greaterThan(0)
    ? grossProfit.dividedBy(totalSales).times(100)
    : new Decimal(0);

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
    openingCashVal,
    openingBankVal,
    totalOpeningVal,
    effectiveTotalSales,
    totalMaterialExpenses,
    totalShopExpenses,
    totalMiscExpenses,
    totalExpenses,
    fixedExpenses,
    cashGrossProfit,
    onlineGrossProfit,
    grossProfit,
    cashNetProfit,
    onlineNetProfit,
    netProfit,
    cashWithdrawals,
    onlineWithdrawals,
    totalWithdrawals,
    totalDrawings,
    cashLoanTaken,
    onlineLoanTaken,
    loanTaken,
    cashLoanGiven,
    onlineLoanGiven,
    loanGiven,
    cashLoanTakenReturned,
    onlineLoanTakenReturned,
    loanTakenReturned,
    cashLoanGivenReturned,
    onlineLoanGivenReturned,
    loanGivenReturned,
    pendingLoanTaken,
    pendingLoanGiven,
    grossMarginPercent,
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

  const shop = shopByCategory.map((g: any) => ({
    category: g.category,
    amount: sumOrZero(g._sum.amount).toFixed(2),
  }));

  const misc = miscByName.map((g: any) => ({
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
