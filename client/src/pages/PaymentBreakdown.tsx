import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi, reportsApi } from '../api/client';
import { formatCurrency, formatDate } from '../lib/financeFormatters';
import { useShopStore } from '../stores/useShopStore';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

type RangeTab = 'today' | 'week' | 'month' | 'year' | 'date';

function PaymentBreakdown() {
  const addToast = useShopStore((s) => s.addToast);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const todayStr = new Date().toISOString().slice(0, 10);
  const [range, setRange] = useState<RangeTab>('today');
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  const rangeDates = useMemo(() => {
    const now = new Date();
    let from: Date;
    let to: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    if (range === 'date') {
      const parts = selectedDate.split('-');
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      from = new Date(y, m, d, 0, 0, 0, 0);
      to = new Date(y, m, d, 23, 59, 59, 999);
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
      }
    }

    return {
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
    };
  }, [range, selectedDate]);

  const handleDownloadPdf = async () => {
    try {
      setDownloadingPdf(true);
      await reportsApi.downloadPdf(rangeDates.from, rangeDates.to, 'ALL');
      addToast('success', 'Professional PDF statement downloaded successfully!');
    } catch (err: any) {
      addToast('error', err.message || 'Failed to generate PDF');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const { data: dashData, isLoading } = useQuery({
    queryKey: ['payment-breakdown', range, rangeDates.from, rangeDates.to],
    queryFn: () => {
      if (range === 'today') return dashboardApi.today();
      if (range === 'date') return dashboardApi.summary({ from: rangeDates.from, to: rangeDates.to });
      return dashboardApi.summary({ range });
    },
  });

  // Access the summary properly
  const summary = dashData?.data?.summary;
  const reconciliation = dashData?.data?.reconciliation;

  // Breakdown Numbers
  const totalSalesNum = parseFloat(summary?.totalSales || '0');
  const totalCashSalesNum = parseFloat(summary?.totalCashSales || '0');
  const totalOnlineSalesNum = parseFloat(summary?.totalOnlineSales || '0');

  const openingCashNum = parseFloat(summary?.openingCashVal || '0');
  const openingBankNum = parseFloat(summary?.openingBankVal || '0');
  const totalOpeningNum = parseFloat(summary?.totalOpeningVal || '0');

  const cashMatNum = parseFloat(summary?.cashMaterialExpenses || '0');
  const onlineMatNum = parseFloat(summary?.onlineMaterialExpenses || '0');
  const totalMatNum = parseFloat(summary?.totalMaterialExpenses || '0');

  const cashGrossProfitNum = parseFloat(summary?.cashGrossProfit || (totalCashSalesNum - cashMatNum).toFixed(2));
  const onlineGrossProfitNum = parseFloat(summary?.onlineGrossProfit || (totalOnlineSalesNum - onlineMatNum).toFixed(2));
  const totalGrossProfitNum = parseFloat(summary?.grossProfit || (totalSalesNum - totalMatNum).toFixed(2));

  const cashShopExpNum = parseFloat(summary?.cashShopExpenses || '0');
  const onlineShopExpNum = parseFloat(summary?.onlineShopExpenses || '0');
  const totalShopExpNum = parseFloat(summary?.totalShopExpenses || '0');

  const cashMiscExpNum = parseFloat(summary?.cashMiscExpenses || '0');
  const onlineMiscExpNum = parseFloat(summary?.onlineMiscExpenses || '0');
  const totalMiscExpNum = parseFloat(summary?.totalMiscExpenses || '0');

  const cashOperatingExpNum = cashShopExpNum + cashMiscExpNum;
  const onlineOperatingExpNum = onlineShopExpNum + onlineMiscExpNum;
  const totalOperatingExpNum = totalShopExpNum + totalMiscExpNum;

  const cashNetProfitNum = parseFloat(summary?.cashNetProfit || (cashGrossProfitNum - cashOperatingExpNum).toFixed(2));
  const onlineNetProfitNum = parseFloat(summary?.onlineNetProfit || (onlineGrossProfitNum - onlineOperatingExpNum).toFixed(2));
  const totalNetProfitNum = parseFloat(summary?.netProfit || (totalGrossProfitNum - totalOperatingExpNum).toFixed(2));

  const cashWithdNum = parseFloat(summary?.cashWithdrawals || '0');
  const onlineWithdNum = parseFloat(summary?.onlineWithdrawals || '0');
  const totalWithdNum = parseFloat(summary?.totalWithdrawals || '0');

  const cashLoanTakenNum = parseFloat(summary?.cashLoanTaken || '0');
  const onlineLoanTakenNum = parseFloat(summary?.onlineLoanTaken || '0');
  const totalLoanTakenNum = parseFloat(summary?.loanTaken || '0');

  const cashLoanGivenNum = parseFloat(summary?.cashLoanGiven || '0');
  const onlineLoanGivenNum = parseFloat(summary?.onlineLoanGiven || '0');
  const totalLoanGivenNum = parseFloat(summary?.loanGiven || '0');

  const cashLoanGivenRetNum = parseFloat(summary?.cashLoanGivenReturned || '0');
  const onlineLoanGivenRetNum = parseFloat(summary?.onlineLoanGivenReturned || '0');
  const totalLoanGivenRetNum = parseFloat(summary?.loanGivenReturned || '0');

  const cashLoanTakenRetNum = parseFloat(summary?.cashLoanTakenReturned || '0');
  const onlineLoanTakenRetNum = parseFloat(summary?.onlineLoanTakenReturned || '0');
  const totalLoanTakenRetNum = parseFloat(summary?.loanTakenReturned || '0');

  // Drawer Balances
  const cashBalanceNum = parseFloat(summary?.cashBalance || '0');
  const onlineBalanceNum = parseFloat(summary?.onlineBalance || '0');
  const totalRetainedBalance = parseFloat(summary?.remainingBusinessBalance || '0');

  // Margins
  const cashSalesPercent = totalSalesNum > 0 ? (totalCashSalesNum / totalSalesNum) * 100 : 0;
  const onlineSalesPercent = totalSalesNum > 0 ? (totalOnlineSalesNum / totalSalesNum) * 100 : 0;

  const grossProfitMargin = totalSalesNum > 0 ? (totalGrossProfitNum / totalSalesNum) * 100 : 0;
  const netProfitMargin = totalSalesNum > 0 ? (totalNetProfitNum / totalSalesNum) * 100 : 0;

  // Pie Chart Data
  const pieData = [
    { name: 'Cash Sales', value: totalCashSalesNum, color: '#16a34a' },
    { name: 'Online / UPI Sales', value: totalOnlineSalesNum, color: '#2563eb' },
  ];

  const currentRangeText = useMemo(() => {
    switch (range) {
      case 'today': return 'Today';
      case 'week': return 'This Week';
      case 'month': return 'This Month';
      case 'year': return 'This Year';
      case 'date': return formatDate(selectedDate, 'short');
      default: return '';
    }
  }, [range, selectedDate]);

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header" style={{ marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>💳 Complete Mode-Wise Payment Breakdown Matrix</span>
          </h1>
          <p className="page-subtitle">
            Side-by-side financial comparative matrix of Cash (Offline) vs Online/UPI (Digital) across every calculation
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={handleDownloadPdf} disabled={downloadingPdf}>
            {downloadingPdf ? <span className="spinner" /> : '📥 Export CA Financial Statement PDF'}
          </button>
        </div>
      </div>

      {/* Range Controller Tabs */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '0.75rem 1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-secondary)', marginRight: '0.25rem' }}>📅 Statement Period:</span>
            <button type="button" className={`btn btn-sm ${range === 'today' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setRange('today')}>Today</button>
            <button type="button" className={`btn btn-sm ${range === 'week' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setRange('week')}>This Week</button>
            <button type="button" className={`btn btn-sm ${range === 'month' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setRange('month')}>This Month</button>
            <button type="button" className={`btn btn-sm ${range === 'year' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setRange('year')}>This Year</button>
          </div>

          {range === 'date' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Select Specific Date:</label>
              <input type="date" className="input" style={{ padding: '0.25rem 0.5rem', fontSize: '0.85rem' }} value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
            </div>
          )}
        </div>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '4rem' }}><span className="spinner" /></div>
      ) : (
        <>
          {/* Executive Summary Metric Cards */}
          <div className="grid-4" style={{ marginBottom: '1.5rem' }}>
            <div className="summary-card">
              <div className="summary-card__label">Recorded Sales ({currentRangeText})</div>
              <div className="summary-card__value" style={{ color: 'var(--color-brand)' }}>
                {formatCurrency(totalSalesNum)}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.4rem', fontWeight: 600 }}>
                💵 Cash: {formatCurrency(totalCashSalesNum)} ({cashSalesPercent.toFixed(1)}%) | 🌐 Online: {formatCurrency(totalOnlineSalesNum)} ({onlineSalesPercent.toFixed(1)}%)
              </div>
            </div>

            <div className="summary-card">
              <div className="summary-card__label">Total Gross Trading Profit</div>
              <div className="summary-card__value" style={{ color: '#10b981' }}>
                {formatCurrency(totalGrossProfitNum)}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.4rem', fontWeight: 600 }}>
                Gross Margin: {grossProfitMargin.toFixed(1)}% of Sales Revenue
              </div>
            </div>

            <div className="summary-card">
              <div className="summary-card__label">Operating Net Business Profit</div>
              <div className="summary-card__value" style={{ color: totalNetProfitNum >= 0 ? '#16a34a' : '#dc2626' }}>
                {formatCurrency(totalNetProfitNum)}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.4rem', fontWeight: 600 }}>
                Net Margin: {netProfitMargin.toFixed(1)}% | Cash: {formatCurrency(cashNetProfitNum)} | Online: {formatCurrency(onlineNetProfitNum)}
              </div>
            </div>

            <div className="summary-card">
              <div className="summary-card__label">Total Retained Business Liquidity</div>
              <div className="summary-card__value" style={{ color: 'var(--color-accent-teal)' }}>
                {formatCurrency(totalRetainedBalance)}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.4rem', fontWeight: 600 }}>
                🔒 Drawer Cash: {formatCurrency(cashBalanceNum)} | 🏦 Bank Account: {formatCurrency(onlineBalanceNum)}
              </div>
            </div>
          </div>

          {/* MASTER MODE-WISE PAYMENT COMPARATIVE MATRIX */}
          <div className="card" style={{ marginBottom: '1.5rem', overflowX: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>
                  📊 Detailed Payment Breakdown for Every Financial Calculation
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                  Standard CA Double-Entry comparative matrix splitting Cash and Online/UPI for every line item
                </span>
              </div>
              {reconciliation && (
                <span className={`badge ${reconciliation.passes ? 'badge--cash' : 'badge--voided'}`} style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}>
                  {reconciliation.passes ? '✓ Reconciliation Verified' : '⚠️ Reconciliation Discrepancy'}
                </span>
              )}
            </div>

            <table className="table" style={{ width: '100%', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ background: 'var(--color-background)' }}>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Financial Calculation Item</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right', color: '#16a34a' }}>💵 Cash Stream (Offline)</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right', color: '#2563eb' }}>🌐 Online / UPI (Digital)</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 800 }}>Consolidated Total (₹)</th>
                </tr>
              </thead>
              <tbody>
                {/* 1. Trading Revenue */}
                <tr style={{ background: 'rgba(59, 130, 246, 0.03)' }}>
                  <td style={{ fontWeight: 700 }}>1. Gross Sales Revenue Inflow</td>
                  <td style={{ textAlign: 'right', color: '#16a34a', fontWeight: 700 }}>+{formatCurrency(totalCashSalesNum)}</td>
                  <td style={{ textAlign: 'right', color: '#2563eb', fontWeight: 700 }}>+{formatCurrency(totalOnlineSalesNum)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 800 }}>{formatCurrency(totalSalesNum)}</td>
                </tr>

                {/* 2. Direct Costs */}
                <tr>
                  <td style={{ paddingLeft: '1.5rem', color: 'var(--color-text-secondary)' }}>2. Cost of Goods Sold (Raw Material COGS)</td>
                  <td style={{ textAlign: 'right', color: '#dc2626' }}>-{formatCurrency(cashMatNum)}</td>
                  <td style={{ textAlign: 'right', color: '#dc2626' }}>-{formatCurrency(onlineMatNum)}</td>
                  <td style={{ textAlign: 'right', color: '#dc2626', fontWeight: 700 }}>-{formatCurrency(totalMatNum)}</td>
                </tr>

                {/* 3. Gross Profit */}
                <tr style={{ background: 'rgba(16, 185, 129, 0.08)', fontWeight: 800, borderTop: '1px solid #10b981', borderBottom: '1px solid #10b981' }}>
                  <td style={{ color: '#10b981' }}>3. Calculated Gross Trading Profit (1 - 2)</td>
                  <td style={{ textAlign: 'right', color: '#10b981' }}>{formatCurrency(cashGrossProfitNum)}</td>
                  <td style={{ textAlign: 'right', color: '#10b981' }}>{formatCurrency(onlineGrossProfitNum)}</td>
                  <td style={{ textAlign: 'right', color: '#10b981', fontSize: '1.05rem' }}>{formatCurrency(totalGrossProfitNum)}</td>
                </tr>

                {/* 4. Overheads */}
                <tr>
                  <td style={{ paddingLeft: '1.5rem', color: 'var(--color-text-secondary)' }}>4. Shop Operating Overheads (Rent, Electricity, Salary)</td>
                  <td style={{ textAlign: 'right', color: '#dc2626' }}>-{formatCurrency(cashShopExpNum)}</td>
                  <td style={{ textAlign: 'right', color: '#dc2626' }}>-{formatCurrency(onlineShopExpNum)}</td>
                  <td style={{ textAlign: 'right', color: '#dc2626' }}>-{formatCurrency(totalShopExpNum)}</td>
                </tr>

                <tr>
                  <td style={{ paddingLeft: '1.5rem', color: 'var(--color-text-secondary)' }}>5. Miscellaneous Expenses & Repairs</td>
                  <td style={{ textAlign: 'right', color: '#dc2626' }}>-{formatCurrency(cashMiscExpNum)}</td>
                  <td style={{ textAlign: 'right', color: '#dc2626' }}>-{formatCurrency(onlineMiscExpNum)}</td>
                  <td style={{ textAlign: 'right', color: '#dc2626' }}>-{formatCurrency(totalMiscExpNum)}</td>
                </tr>

                {/* 5. Net Profit */}
                <tr style={{ background: totalNetProfitNum >= 0 ? 'rgba(22, 163, 74, 0.1)' : 'rgba(220, 38, 38, 0.1)', fontWeight: 800, borderTop: '2px solid var(--color-border)', borderBottom: '2px solid var(--color-border)' }}>
                  <td style={{ color: totalNetProfitNum >= 0 ? '#16a34a' : '#dc2626' }}>6. Operating Net Business Profit (3 - 4 - 5)</td>
                  <td style={{ textAlign: 'right', color: cashNetProfitNum >= 0 ? '#16a34a' : '#dc2626' }}>{formatCurrency(cashNetProfitNum)}</td>
                  <td style={{ textAlign: 'right', color: onlineNetProfitNum >= 0 ? '#2563eb' : '#dc2626' }}>{formatCurrency(onlineNetProfitNum)}</td>
                  <td style={{ textAlign: 'right', color: totalNetProfitNum >= 0 ? '#16a34a' : '#dc2626', fontSize: '1.1rem' }}>{formatCurrency(totalNetProfitNum)}</td>
                </tr>

                {/* 6. Capital & Loan Flows */}
                <tr>
                  <td style={{ paddingLeft: '1.5rem', color: 'var(--color-text-secondary)' }}>7. Owner Capital Drawings / Withdrawals</td>
                  <td style={{ textAlign: 'right', color: '#dc2626' }}>-{formatCurrency(cashWithdNum)}</td>
                  <td style={{ textAlign: 'right', color: '#dc2626' }}>-{formatCurrency(onlineWithdNum)}</td>
                  <td style={{ textAlign: 'right', color: '#dc2626' }}>-{formatCurrency(totalWithdNum)}</td>
                </tr>

                <tr>
                  <td style={{ paddingLeft: '1.5rem', color: 'var(--color-text-secondary)' }}>8. Loans Borrowed / Taken (Cash Inflow)</td>
                  <td style={{ textAlign: 'right', color: '#16a34a' }}>+{formatCurrency(cashLoanTakenNum)}</td>
                  <td style={{ textAlign: 'right', color: '#2563eb' }}>+{formatCurrency(onlineLoanTakenNum)}</td>
                  <td style={{ textAlign: 'right' }}>+{formatCurrency(totalLoanTakenNum)}</td>
                </tr>

                <tr>
                  <td style={{ paddingLeft: '1.5rem', color: 'var(--color-text-secondary)' }}>9. Loans Lent / Given (Cash Outflow)</td>
                  <td style={{ textAlign: 'right', color: '#dc2626' }}>-{formatCurrency(cashLoanGivenNum)}</td>
                  <td style={{ textAlign: 'right', color: '#dc2626' }}>-{formatCurrency(onlineLoanGivenNum)}</td>
                  <td style={{ textAlign: 'right', color: '#dc2626' }}>-{formatCurrency(totalLoanGivenNum)}</td>
                </tr>

                <tr>
                  <td style={{ paddingLeft: '1.5rem', color: 'var(--color-text-secondary)' }}>10. Loan Debt Repaid (Principal Outflow)</td>
                  <td style={{ textAlign: 'right', color: '#dc2626' }}>-{formatCurrency(cashLoanTakenRetNum)}</td>
                  <td style={{ textAlign: 'right', color: '#dc2626' }}>-{formatCurrency(onlineLoanTakenRetNum)}</td>
                  <td style={{ textAlign: 'right', color: '#dc2626' }}>-{formatCurrency(totalLoanTakenRetNum)}</td>
                </tr>

                <tr>
                  <td style={{ paddingLeft: '1.5rem', color: 'var(--color-text-secondary)' }}>11. Loan Debt Recovered / Returned (Principal Inflow)</td>
                  <td style={{ textAlign: 'right', color: '#16a34a' }}>+{formatCurrency(cashLoanGivenRetNum)}</td>
                  <td style={{ textAlign: 'right', color: '#2563eb' }}>+{formatCurrency(onlineLoanGivenRetNum)}</td>
                  <td style={{ textAlign: 'right' }}>+{formatCurrency(totalLoanGivenRetNum)}</td>
                </tr>

                {/* 7. Opening & Closing Balances */}
                <tr style={{ background: 'var(--color-background)' }}>
                  <td style={{ fontWeight: 700 }}>12. Period Opening Capital Baseline</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatCurrency(openingCashNum)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatCurrency(openingBankNum)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 800 }}>{formatCurrency(totalOpeningNum)}</td>
                </tr>

                <tr style={{ background: 'rgba(59, 130, 246, 0.08)', fontWeight: 800, borderTop: '2px solid var(--color-border)' }}>
                  <td style={{ fontSize: '1rem', color: 'var(--color-text-primary)' }}>13. Net Closing Liquidity Balance (In Hand / In Bank)</td>
                  <td style={{ textAlign: 'right', color: '#16a34a', fontSize: '1.15rem', fontFamily: 'var(--font-mono)' }}>{formatCurrency(cashBalanceNum)}</td>
                  <td style={{ textAlign: 'right', color: '#2563eb', fontSize: '1.15rem', fontFamily: 'var(--font-mono)' }}>{formatCurrency(onlineBalanceNum)}</td>
                  <td style={{ textAlign: 'right', color: 'var(--color-brand)', fontSize: '1.25rem', fontFamily: 'var(--font-mono)' }}>{formatCurrency(totalRetainedBalance)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Side-by-Side Mode Cards (Cash Drawer vs Bank Ledger) */}
          <div className="grid-2" style={{ marginBottom: '1.5rem', alignItems: 'stretch' }}>
            {/* 💵 CASH PAYMENT STREAM CARD */}
            <div className="card" style={{ borderTop: '4px solid #16a34a', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#16a34a', margin: 0 }}>
                      💵 Physical Counter Cash Drawer
                    </h3>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                      Physical counter cash register, receipts & payouts
                    </span>
                  </div>
                  <span className="badge badge--cash" style={{ fontSize: '0.85rem', padding: '0.3rem 0.6rem' }}>CASH LEDGER</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.88rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0.5rem', background: 'var(--color-background)', borderRadius: '6px' }}>
                    <span style={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Opening Cash in Drawer:</span>
                    <strong>{formatCurrency(openingCashNum)}</strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0.5rem', background: 'var(--color-background)', borderRadius: '6px' }}>
                    <span style={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Cash Counter Sales:</span>
                    <strong style={{ color: '#16a34a' }}>+{formatCurrency(totalCashSalesNum)}</strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0.5rem', background: 'var(--color-background)', borderRadius: '6px' }}>
                    <span style={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Cash Raw Materials (COGS):</span>
                    <span style={{ color: '#dc2626', fontWeight: 700 }}>-{formatCurrency(cashMatNum)}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem 0.5rem', background: 'rgba(16, 185, 129, 0.08)', borderRadius: '6px', border: '1px solid #10b981', fontWeight: 800 }}>
                    <span>Cash Gross Profit:</span>
                    <span style={{ color: '#10b981' }}>{formatCurrency(cashGrossProfitNum)}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0.5rem', background: 'var(--color-background)', borderRadius: '6px' }}>
                    <span style={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Cash Operating Overheads:</span>
                    <span style={{ color: '#dc2626', fontWeight: 700 }}>-{formatCurrency(cashOperatingExpNum)}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem 0.5rem', background: cashNetProfitNum >= 0 ? 'rgba(22, 163, 74, 0.08)' : 'rgba(220, 38, 38, 0.08)', borderRadius: '6px', border: `1px solid ${cashNetProfitNum >= 0 ? '#16a34a' : '#dc2626'}`, fontWeight: 800 }}>
                    <span>Cash Operating Net Profit:</span>
                    <span style={{ color: cashNetProfitNum >= 0 ? '#16a34a' : '#dc2626' }}>{formatCurrency(cashNetProfitNum)}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0.5rem', background: 'var(--color-background)', borderRadius: '6px' }}>
                    <span style={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Cash Owner Drawings / Withdrawals:</span>
                    <span style={{ color: '#dc2626', fontWeight: 700 }}>-{formatCurrency(cashWithdNum)}</span>
                  </div>
                </div>
              </div>

              <div style={{ borderTop: '2px dashed var(--color-border)', paddingTop: '0.75rem', marginTop: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(22, 163, 74, 0.05)', padding: '0.75rem', borderRadius: '8px' }}>
                <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>🔒 Closing Cash Drawer Balance:</span>
                <span style={{ color: '#16a34a', fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>{formatCurrency(cashBalanceNum)}</span>
              </div>
            </div>

            {/* 🌐 ONLINE / UPI PAYMENT STREAM CARD */}
            <div className="card" style={{ borderTop: '4px solid #2563eb', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#2563eb', margin: 0 }}>
                      🌐 Online / UPI Digital Bank Account
                    </h3>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                      GPay, PhonePe, Paytm, QR, Cards & NetBanking
                    </span>
                  </div>
                  <span className="badge badge--online" style={{ fontSize: '0.85rem', padding: '0.3rem 0.6rem' }}>BANK LEDGER</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.88rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0.5rem', background: 'var(--color-background)', borderRadius: '6px' }}>
                    <span style={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Opening Bank Balance:</span>
                    <strong>{formatCurrency(openingBankNum)}</strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0.5rem', background: 'var(--color-background)', borderRadius: '6px' }}>
                    <span style={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>UPI / Bank Sales Revenue:</span>
                    <strong style={{ color: '#2563eb' }}>+{formatCurrency(totalOnlineSalesNum)}</strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0.5rem', background: 'var(--color-background)', borderRadius: '6px' }}>
                    <span style={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Online Raw Materials (COGS):</span>
                    <span style={{ color: '#dc2626', fontWeight: 700 }}>-{formatCurrency(onlineMatNum)}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem 0.5rem', background: 'rgba(37, 99, 235, 0.08)', borderRadius: '6px', border: '1px solid #2563eb', fontWeight: 800 }}>
                    <span>Online Gross Profit:</span>
                    <span style={{ color: '#2563eb' }}>{formatCurrency(onlineGrossProfitNum)}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0.5rem', background: 'var(--color-background)', borderRadius: '6px' }}>
                    <span style={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Online Operating Overheads:</span>
                    <span style={{ color: '#dc2626', fontWeight: 700 }}>-{formatCurrency(onlineOperatingExpNum)}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem 0.5rem', background: onlineNetProfitNum >= 0 ? 'rgba(37, 99, 235, 0.08)' : 'rgba(220, 38, 38, 0.08)', borderRadius: '6px', border: `1px solid ${onlineNetProfitNum >= 0 ? '#2563eb' : '#dc2626'}`, fontWeight: 800 }}>
                    <span>Online Operating Net Profit:</span>
                    <span style={{ color: onlineNetProfitNum >= 0 ? '#2563eb' : '#dc2626' }}>{formatCurrency(onlineNetProfitNum)}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0.5rem', background: 'var(--color-background)', borderRadius: '6px' }}>
                    <span style={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Online Owner Drawings / Withdrawals:</span>
                    <span style={{ color: '#dc2626', fontWeight: 700 }}>-{formatCurrency(onlineWithdNum)}</span>
                  </div>
                </div>
              </div>

              <div style={{ borderTop: '2px dashed var(--color-border)', paddingTop: '0.75rem', marginTop: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(37, 99, 235, 0.05)', padding: '0.75rem', borderRadius: '8px' }}>
                <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>🏦 Closing Bank Account Balance:</span>
                <span style={{ color: '#2563eb', fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>{formatCurrency(onlineBalanceNum)}</span>
              </div>
            </div>
          </div>

          {/* Visual Payment Share Progress Bars & Donut Chart */}
          <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
            <div className="card">
              <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '1rem' }}>
                📊 Revenue Channel Distribution Share
              </h3>
              
              <div style={{ height: 220, width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4}>
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '1rem' }}>
                📈 Cash vs Online Revenue Ratio
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 700 }}>
                    <span style={{ color: '#16a34a' }}>💵 Cash Sales Share</span>
                    <span>{cashSalesPercent.toFixed(1)}% ({formatCurrency(totalCashSalesNum)})</span>
                  </div>
                  <div style={{ height: 12, background: 'var(--color-border)', borderRadius: 6, overflow: 'hidden' }}>
                    <div style={{ width: `${cashSalesPercent}%`, height: '100%', background: '#16a34a', borderRadius: 6 }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 700 }}>
                    <span style={{ color: '#2563eb' }}>🌐 Online / UPI Sales Share</span>
                    <span>{onlineSalesPercent.toFixed(1)}% ({formatCurrency(totalOnlineSalesNum)})</span>
                  </div>
                  <div style={{ height: 12, background: 'var(--color-border)', borderRadius: 6, overflow: 'hidden' }}>
                    <div style={{ width: `${onlineSalesPercent}%`, height: '100%', background: '#2563eb', borderRadius: 6 }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default PaymentBreakdown;
