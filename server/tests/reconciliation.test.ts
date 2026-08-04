import { computeFinanceSummary, checkReconciliation } from '../src/finance/financeEngine';
import { Decimal } from 'decimal.js';

describe('Reconciliation Invariant Unit Test (CA Accounting Rule)', () => {
  it('should strictly satisfy Cash Balance + Online Balance === Remaining Business Balance', () => {
    // Mock summary with sample financial figures
    const mockSummary = {
      totalCashSales: new Decimal('15000.00'),
      totalOnlineSales: new Decimal('25000.00'),
      totalSales: new Decimal('40000.00'),

      totalMaterialExpenses: new Decimal('12000.00'),
      totalShopExpenses: new Decimal('8000.00'),
      totalMiscExpenses: new Decimal('2000.00'),
      totalExpenses: new Decimal('22000.00'),

      grossProfit: new Decimal('28000.00'), // 40000 - 12000
      netProfit: new Decimal('18000.00'),   // 28000 - 8000 - 2000

      cashWithdrawals: new Decimal('3000.00'),
      onlineWithdrawals: new Decimal('5000.00'),
      totalWithdrawals: new Decimal('8000.00'),

      remainingBusinessBalance: new Decimal('10000.00'), // Net Profit (18000) - Withdrawals (8000)

      // Cash Expenses = Cash Mat (6000) + Cash Shop (2000) + Cash Misc (1000) = 9000
      cashMaterialExpenses: new Decimal('6000.00'),
      cashShopExpenses: new Decimal('2000.00'),
      cashMiscExpenses: new Decimal('1000.00'),
      totalCashExpenses: new Decimal('9000.00'),

      // Online Expenses = Online Mat (6000) + Online Shop (6000) + Online Misc (1000) = 13000
      onlineMaterialExpenses: new Decimal('6000.00'),
      onlineShopExpenses: new Decimal('6000.00'),
      onlineMiscExpenses: new Decimal('1000.00'),
      totalOnlineExpenses: new Decimal('13000.00'),

      // Cash Balance = Cash Sales (15000) - Cash Exp (9000) - Cash Withdrawals (3000) = 3000
      cashBalance: new Decimal('3000.00'),

      // Online Balance = Online Sales (25000) - Online Exp (13000) - Online Withdrawals (5000) = 7000
      onlineBalance: new Decimal('7000.00'),
    };

    const reconciliation = checkReconciliation(mockSummary as any);

    expect(reconciliation.passes).toBe(true);
    expect(reconciliation.difference).toBe('0.00');
    expect(
      new Decimal(reconciliation.cashPlusOnline).equals(
        new Decimal(reconciliation.businessBalance)
      )
    ).toBe(true);
  });
});
