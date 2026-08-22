import { Decimal } from 'decimal.js';
import { checkReconciliation } from '../src/finance/financeEngine';

describe('Dynamic Opening Balance & Drawer Cash Carry-Forward Tests', () => {
  it('should accurately calculate that prior sales and expenses decrease/increase opening balance for subsequent days', () => {
    // Starting Float on Day 1
    const initialCashFloat = new Decimal('2600.00');
    const initialBankFloat = new Decimal('4531.00');

    // Day 1 Activity
    const day1CashSales = new Decimal('4880.00');
    const day1OnlineSales = new Decimal('18509.00');
    const day1CashMaterialExp = new Decimal('3500.00');
    const day1CashShopExp = new Decimal('1200.00');
    const day1CashDrawings = new Decimal('800.00');
    const day1OnlineExp = new Decimal('14000.00');

    // Day 1 Net Cash Flow = Cash Sales (4880) - Cash Mat (3500) - Cash Shop (1200) - Cash Drawings (800) = -620
    const day1NetCashFlow = day1CashSales
      .minus(day1CashMaterialExp)
      .minus(day1CashShopExp)
      .minus(day1CashDrawings);
    expect(day1NetCashFlow.toFixed(2)).toBe('-620.00');

    // Day 1 Net Online Flow = Online Sales (18509) - Online Exp (14000) = +4509
    const day1NetOnlineFlow = day1OnlineSales.minus(day1OnlineExp);
    expect(day1NetOnlineFlow.toFixed(2)).toBe('4509.00');

    // Day 2 Dynamic Opening Balance = Initial Float + Day 1 Net Flow
    const day2OpeningCash = initialCashFloat.plus(day1NetCashFlow);
    const day2OpeningBank = initialBankFloat.plus(day1NetOnlineFlow);

    // Initial 2600 - 620 = 1980
    expect(day2OpeningCash.toFixed(2)).toBe('1980.00');
    // Initial 4531 + 4509 = 9040
    expect(day2OpeningBank.toFixed(2)).toBe('9040.00');

    // Day 2 Activity (Today with 0 sales yet)
    const day2NetCashFlow = new Decimal('0.00');
    const day2NetOnlineFlow = new Decimal('0.00');

    const day2ClosingCash = day2OpeningCash.plus(day2NetCashFlow);
    const day2ClosingBank = day2OpeningBank.plus(day2NetOnlineFlow);

    expect(day2ClosingCash.toFixed(2)).toBe('1980.00');
    expect(day2ClosingBank.toFixed(2)).toBe('9040.00');

    // Summary for Day 2
    const mockDay2Summary = {
      totalCashSales: new Decimal('0.00'),
      totalOnlineSales: new Decimal('0.00'),
      totalSales: new Decimal('0.00'),
      openingCashVal: day2OpeningCash,
      openingBankVal: day2OpeningBank,
      totalOpeningVal: day2OpeningCash.plus(day2OpeningBank),
      effectiveTotalSales: day2OpeningCash.plus(day2OpeningBank),
      totalMaterialExpenses: new Decimal('0.00'),
      totalShopExpenses: new Decimal('0.00'),
      totalMiscExpenses: new Decimal('0.00'),
      totalExpenses: new Decimal('0.00'),
      fixedExpenses: new Decimal('0.00'),
      cashGrossProfit: new Decimal('0.00'),
      onlineGrossProfit: new Decimal('0.00'),
      grossProfit: new Decimal('0.00'),
      cashNetProfit: new Decimal('0.00'),
      onlineNetProfit: new Decimal('0.00'),
      netProfit: new Decimal('0.00'),
      cashWithdrawals: new Decimal('0.00'),
      onlineWithdrawals: new Decimal('0.00'),
      totalWithdrawals: new Decimal('0.00'),
      totalDrawings: new Decimal('0.00'),
      cashLoanTaken: new Decimal('0.00'),
      onlineLoanTaken: new Decimal('0.00'),
      loanTaken: new Decimal('0.00'),
      cashLoanGiven: new Decimal('0.00'),
      onlineLoanGiven: new Decimal('0.00'),
      loanGiven: new Decimal('0.00'),
      cashLoanTakenReturned: new Decimal('0.00'),
      onlineLoanTakenReturned: new Decimal('0.00'),
      loanTakenReturned: new Decimal('0.00'),
      cashLoanGivenReturned: new Decimal('0.00'),
      onlineLoanGivenReturned: new Decimal('0.00'),
      loanGivenReturned: new Decimal('0.00'),
      pendingLoanTaken: new Decimal('0.00'),
      pendingLoanGiven: new Decimal('0.00'),
      grossMarginPercent: new Decimal('0.00'),
      profitMarginPercent: new Decimal('0.00'),
      expenseRatioPercent: new Decimal('0.00'),
      remainingBusinessBalance: day2ClosingCash.plus(day2ClosingBank),
      cashBalance: day2ClosingCash,
      onlineBalance: day2ClosingBank,
      periodNetCashFlow: day2NetCashFlow,
      periodNetOnlineFlow: day2NetOnlineFlow,
      cashMaterialExpenses: new Decimal('0.00'),
      onlineMaterialExpenses: new Decimal('0.00'),
      cashShopExpenses: new Decimal('0.00'),
      onlineShopExpenses: new Decimal('0.00'),
      cashMiscExpenses: new Decimal('0.00'),
      onlineMiscExpenses: new Decimal('0.00'),
      totalCashExpenses: new Decimal('0.00'),
      totalOnlineExpenses: new Decimal('0.00'),
    };

    const reconciliation = checkReconciliation(mockDay2Summary as any);
    expect(reconciliation.passes).toBe(true);
    expect(reconciliation.difference).toBe('0.00');
    expect(reconciliation.cashPlusOnline).toBe('11020.00');
    expect(reconciliation.businessBalance).toBe('11020.00');
  });
});
