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

  const summary = dashData?.data;

  // Breakdown Numbers
  const totalSalesNum = parseFloat(summary?.totalSales || '0');
  const totalCashSalesNum = parseFloat(summary?.totalCashSales || '0');
  const totalOnlineSalesNum = parseFloat(summary?.totalOnlineSales || '0');

  const openingCashNum = parseFloat(summary?.openingCashVal || '0');
  const openingBankNum = parseFloat(summary?.openingBankVal || '0');

  const cashMatNum = parseFloat(summary?.cashMaterialExpenses || '0');
  const onlineMatNum = parseFloat(summary?.onlineMaterialExpenses || '0');

  const cashShopNum = parseFloat(summary?.cashShopExpenses || '0') + parseFloat(summary?.cashMiscExpenses || '0');
  const onlineShopNum = parseFloat(summary?.onlineShopExpenses || '0') + parseFloat(summary?.onlineMiscExpenses || '0');

  const cashWithdNum = parseFloat(summary?.cashWithdrawals || '0');
  const onlineWithdNum = parseFloat(summary?.onlineWithdrawals || '0');

  // Mode-wise Gross Profit
  const cashEffectiveSales = totalCashSalesNum + openingCashNum;
  const onlineEffectiveSales = totalOnlineSalesNum + openingBankNum;

  const cashGrossProfit = cashEffectiveSales - cashMatNum;
  const onlineGrossProfit = onlineEffectiveSales - onlineMatNum;
  const totalGrossProfitNum = parseFloat(summary?.grossProfit || '0');

  // Mode-wise Net Profit Estimates
  const cashNetProfit = cashGrossProfit - cashShopNum - cashWithdNum;
  const onlineNetProfit = onlineGrossProfit - onlineShopNum - onlineWithdNum;
  const totalNetProfitNum = parseFloat(summary?.netProfit || '0');

  // Drawer Balances
  const cashBalanceNum = parseFloat(summary?.cashBalance || '0');
  const onlineBalanceNum = parseFloat(summary?.onlineBalance || '0');
  const totalRetainedBalance = parseFloat(summary?.remainingBusinessBalance || '0');

  // Percentages
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
      <div className="page-header" style={{ marginBottom: '1.25rem' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>💳 Categorized Payment Methods Breakdown & P&L</span>
          </h1>
          <p className="page-subtitle">
            Side-by-side financial breakdown of Cash (Offline) vs Online/UPI payment streams, Gross Profit, Net Profit & Balances
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={handleDownloadPdf} disabled={downloadingPdf}>
            {downloadingPdf ? <span className="spinner" /> : '📥 Download Professional PDF Statement'}
          </button>
        </div>
      </div>

      {/* Range Controller Tabs */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '0.75rem 1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-secondary)', marginRight: '0.25rem' }}>📅 Period:</span>
            <button type="button" className={`btn btn-sm ${range === 'today' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setRange('today')}>Today</button>
            <button type="button" className={`btn btn-sm ${range === 'week' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setRange('week')}>This Week</button>
            <button type="button" className={`btn btn-sm ${range === 'month' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setRange('month')}>This Month</button>
            <button type="button" className={`btn btn-sm ${range === 'year' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setRange('year')}>This Year</button>
          </div>

          {range === 'date' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Select Date:</label>
              <input type="date" className="input" style={{ padding: '0.25rem 0.5rem', fontSize: '0.85rem' }} value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
            </div>
          )}
        </div>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '4rem' }}><span className="spinner" /></div>
      ) : (
        <>
          {/* Executive Summary Cards Bar */}
          <div className="grid-4" style={{ marginBottom: '1.5rem' }}>
            <div className="summary-card">
              <div className="summary-card__label">Recorded Sales ({currentRangeText})</div>
              <div className="summary-card__value" style={{ color: 'var(--color-brand)' }}>
                {formatCurrency(totalSalesNum)}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.4rem', fontWeight: 600 }}>
                Cash: {formatCurrency(totalCashSalesNum)} ({cashSalesPercent.toFixed(1)}%) | Online: {formatCurrency(totalOnlineSalesNum)} ({onlineSalesPercent.toFixed(1)}%)
              </div>
            </div>

            <div className="summary-card">
              <div className="summary-card__label">Total Gross Profit ({currentRangeText})</div>
              <div className="summary-card__value" style={{ color: '#10b981' }}>
                {formatCurrency(totalGrossProfitNum)}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.4rem', fontWeight: 600 }}>
                Gross Margin: {grossProfitMargin.toFixed(1)}% of Sales
              </div>
            </div>

            <div className="summary-card">
              <div className="summary-card__label">Total Net Profit ({currentRangeText})</div>
              <div className="summary-card__value" style={{ color: totalNetProfitNum >= 0 ? '#16a34a' : '#dc2626' }}>
                {formatCurrency(totalNetProfitNum)}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.4rem', fontWeight: 600 }}>
                Net Margin: {netProfitMargin.toFixed(1)}% of Sales
              </div>
            </div>

            <div className="summary-card">
              <div className="summary-card__label">Total Retained Business Balance</div>
              <div className="summary-card__value" style={{ color: 'var(--color-accent-teal)' }}>
                {formatCurrency(totalRetainedBalance)}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.4rem', fontWeight: 600 }}>
                Cash Drawer: {formatCurrency(cashBalanceNum)} | Bank: {formatCurrency(onlineBalanceNum)}
              </div>
            </div>
          </div>

          {/* Side-by-Side Payment Method Cards (Cash vs Online) */}
          <div className="grid-2" style={{ marginBottom: '1.5rem', alignItems: 'stretch' }}>
            
            {/* 💵 CASH PAYMENT STREAM CARD */}
            <div className="card" style={{ borderTop: '4px solid #16a34a', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#16a34a', margin: 0 }}>
                      💵 Cash Payment Method (Offline)
                    </h3>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                      Counter Cash Register & Drawer Inflows/Outflows
                    </span>
                  </div>
                  <span className="badge badge--cash" style={{ fontSize: '0.85rem', padding: '0.3rem 0.6rem' }}>CASH STREAM</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0.5rem', background: 'var(--color-background)', borderRadius: '6px' }}>
                    <span style={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Opening Cash Baseline:</span>
                    <strong>{formatCurrency(openingCashNum)}</strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0.5rem', background: 'var(--color-background)', borderRadius: '6px' }}>
                    <span style={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Cash Counter Sales:</span>
                    <strong style={{ color: '#16a34a' }}>+{formatCurrency(totalCashSalesNum)}</strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0.5rem', background: 'var(--color-background)', borderRadius: '6px' }}>
                    <span style={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Cash Raw Material Costs (COGS):</span>
                    <span style={{ color: '#dc2626', fontWeight: 700 }}>-{formatCurrency(cashMatNum)}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', background: 'rgba(16, 185, 129, 0.08)', borderRadius: '8px', border: '1px solid #10b981', fontWeight: 800 }}>
                    <span>Calculated Cash Gross Profit:</span>
                    <span style={{ color: '#10b981', fontSize: '1.05rem' }}>{formatCurrency(cashGrossProfit)}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0.5rem', background: 'var(--color-background)', borderRadius: '6px' }}>
                    <span style={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Cash Overheads & Misc Expenses:</span>
                    <span style={{ color: '#dc2626', fontWeight: 700 }}>-{formatCurrency(cashShopNum)}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0.5rem', background: 'var(--color-background)', borderRadius: '6px' }}>
                    <span style={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Cash Owner Drawings / Withdrawals:</span>
                    <span style={{ color: '#dc2626', fontWeight: 700 }}>-{formatCurrency(cashWithdNum)}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', background: cashNetProfit >= 0 ? 'rgba(22, 163, 74, 0.08)' : 'rgba(220, 38, 38, 0.08)', borderRadius: '8px', border: `1px solid ${cashNetProfit >= 0 ? '#16a34a' : '#dc2626'}`, fontWeight: 800 }}>
                    <span>Estimated Cash Net Profit:</span>
                    <span style={{ color: cashNetProfit >= 0 ? '#16a34a' : '#dc2626', fontSize: '1.05rem' }}>{formatCurrency(cashNetProfit)}</span>
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
                      🌐 Online / UPI Payment Method (Digital)
                    </h3>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                      GPay, PhonePe, Paytm, QR & Bank Deposits
                    </span>
                  </div>
                  <span className="badge badge--online" style={{ fontSize: '0.85rem', padding: '0.3rem 0.6rem' }}>ONLINE STREAM</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0.5rem', background: 'var(--color-background)', borderRadius: '6px' }}>
                    <span style={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Opening Bank Baseline:</span>
                    <strong>{formatCurrency(openingBankNum)}</strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0.5rem', background: 'var(--color-background)', borderRadius: '6px' }}>
                    <span style={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>UPI / Bank Sales Revenue:</span>
                    <strong style={{ color: '#2563eb' }}>+{formatCurrency(totalOnlineSalesNum)}</strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0.5rem', background: 'var(--color-background)', borderRadius: '6px' }}>
                    <span style={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Online Raw Material Costs (COGS):</span>
                    <span style={{ color: '#dc2626', fontWeight: 700 }}>-{formatCurrency(onlineMatNum)}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', background: 'rgba(37, 99, 235, 0.08)', borderRadius: '8px', border: '1px solid #2563eb', fontWeight: 800 }}>
                    <span>Calculated Online Gross Profit:</span>
                    <span style={{ color: '#2563eb', fontSize: '1.05rem' }}>{formatCurrency(onlineGrossProfit)}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0.5rem', background: 'var(--color-background)', borderRadius: '6px' }}>
                    <span style={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Online Overheads & Rent Expenses:</span>
                    <span style={{ color: '#dc2626', fontWeight: 700 }}>-{formatCurrency(onlineShopNum)}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0.5rem', background: 'var(--color-background)', borderRadius: '6px' }}>
                    <span style={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Online Owner Drawings / Withdrawals:</span>
                    <span style={{ color: '#dc2626', fontWeight: 700 }}>-{formatCurrency(onlineWithdNum)}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', background: onlineNetProfit >= 0 ? 'rgba(37, 99, 235, 0.08)' : 'rgba(220, 38, 38, 0.08)', borderRadius: '8px', border: `1px solid ${onlineNetProfit >= 0 ? '#2563eb' : '#dc2626'}`, fontWeight: 800 }}>
                    <span>Estimated Online Net Profit:</span>
                    <span style={{ color: onlineNetProfit >= 0 ? '#2563eb' : '#dc2626', fontSize: '1.05rem' }}>{formatCurrency(onlineNetProfit)}</span>
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
                📊 Payment Method Revenue Share Breakdown
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
                📈 Percentage Share Comparison
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 700 }}>
                    <span style={{ color: '#16a34a' }}>💵 Cash Sales Share</span>
                    <span>{cashSalesPercent.toFixed(1)}% ({formatCurrency(totalCashSalesNum)})</span>
                  </div>
                  <div style={{ height: 10, background: 'var(--color-border)', borderRadius: 5, overflow: 'hidden' }}>
                    <div style={{ width: `${cashSalesPercent}%`, height: '100%', background: '#16a34a', borderRadius: 5 }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 700 }}>
                    <span style={{ color: '#2563eb' }}>🌐 Online / UPI Sales Share</span>
                    <span>{onlineSalesPercent.toFixed(1)}% ({formatCurrency(totalOnlineSalesNum)})</span>
                  </div>
                  <div style={{ height: 10, background: 'var(--color-border)', borderRadius: 5, overflow: 'hidden' }}>
                    <div style={{ width: `${onlineSalesPercent}%`, height: '100%', background: '#2563eb', borderRadius: 5 }} />
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
