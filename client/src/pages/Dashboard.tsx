import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi, analyticsApi } from '../api/client';
import { formatCurrency, formatDate } from '../lib/financeFormatters';
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

type RangeTab = 'today' | 'week' | 'month' | 'year' | 'date';
type ChartStyle = 'area' | 'bar' | 'line' | 'pie';
type ChartMetric = 'sales' | 'expense' | 'split' | 'profit';

function Dashboard() {
  const navigate = useNavigate();
  const todayStr = new Date().toISOString().slice(0, 10);

  const [range, setRange] = useState<RangeTab>('today');
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Dynamic Chart Customization States
  const [chartStyle, setChartStyle] = useState<ChartStyle>('area');
  const [chartMetric, setChartMetric] = useState<ChartMetric>('sales');

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
      from: from.toISOString(),
      to: to.toISOString(),
    };
  }, [range, selectedDate]);

  const { data: dashData, isLoading } = useQuery({
    queryKey: ['dashboard', range, rangeDates.from, rangeDates.to],
    queryFn: () => {
      if (range === 'today') return dashboardApi.today();
      if (range === 'date') return dashboardApi.summary({ from: rangeDates.from, to: rangeDates.to });
      return dashboardApi.summary({ range });
    },
  });

  const { data: trendData } = useQuery({
    queryKey: ['salesTrend', range, rangeDates.from, rangeDates.to],
    queryFn: () => analyticsApi.salesTrend({ granularity: 'day', from: rangeDates.from, to: rangeDates.to }),
  });

  const { data: expenseBreakdownData } = useQuery({
    queryKey: ['expenseBreakdown', range, rangeDates.from, rangeDates.to],
    queryFn: () => analyticsApi.expenseBreakdown({ from: rangeDates.from, to: rangeDates.to }),
  });

  const summary = dashData?.data?.summary;
  const mtdSummary = dashData?.data?.mtdSummary;
  const trend = trendData?.data || [];
  const rawBreakdown = expenseBreakdownData?.data;

  const EXPENSE_COLORS = ['#EF5A34', '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EC4899', '#6366F1', '#14B8A6'];

  const expensePieData = useMemo(() => {
    if (!rawBreakdown) return [];

    const slices: { name: string; value: number }[] = [];

    if (rawBreakdown.material) {
      rawBreakdown.material.forEach((m: any) => {
        const val = parseFloat(m.amount);
        if (val > 0) slices.push({ name: `Mat: ${m.category}`, value: val });
      });
    }

    if (rawBreakdown.shop) {
      rawBreakdown.shop.forEach((s: any) => {
        const val = parseFloat(s.amount);
        if (val > 0) slices.push({ name: `Shop: ${s.category}`, value: val });
      });
    }

    if (rawBreakdown.misc) {
      rawBreakdown.misc.forEach((m: any) => {
        const val = parseFloat(m.amount);
        if (val > 0) slices.push({ name: `Misc: ${m.name}`, value: val });
      });
    }

    return slices.sort((a, b) => b.value - a.value);
  }, [rawBreakdown]);

  // Cash vs Online Mode Split Data for Chart
  const modeSplitData = useMemo(() => {
    return [
      { name: 'Cash Sales', amount: parseFloat(summary?.totalCashSales || '0'), fill: '#10B981' },
      { name: 'Online Sales', amount: parseFloat(summary?.totalOnlineSales || '0'), fill: '#3B82F6' },
      { name: 'Cash Expenses', amount: parseFloat(summary?.totalCashExpenses || '0'), fill: '#F59E0B' },
      { name: 'Online Expenses', amount: parseFloat(summary?.totalOnlineExpenses || '0'), fill: '#8B5CF6' },
    ];
  }, [summary]);

  // Profitability Trend Data for Chart
  const profitTrendData = useMemo(() => {
    if (trend.length === 0) {
      return [
        {
          name: rangeLabelText(range, selectedDate),
          Sales: parseFloat(summary?.totalSales || '0'),
          GrossProfit: parseFloat(summary?.grossProfit || '0'),
          NetProfit: parseFloat(summary?.netProfit || '0'),
          Expenses: parseFloat(summary?.totalExpenses || '0'),
        },
      ];
    }
    return trend.map((t: any) => {
      const sales = (parseFloat(t.cashSales) || 0) + (parseFloat(t.onlineSales) || 0);
      return {
        date: t.date,
        Sales: sales,
        CashSales: parseFloat(t.cashSales) || 0,
        OnlineSales: parseFloat(t.onlineSales) || 0,
      };
    });
  }, [trend, summary, range, selectedDate]);

  const rangeTabs: { key: RangeTab; label: string }[] = [
    { key: 'today', label: '⚡ Today' },
    { key: 'date', label: '📅 Specific Date' },
    { key: 'week', label: 'This Week' },
    { key: 'month', label: 'This Month' },
    { key: 'year', label: 'This Year' },
  ];

  const shortcuts = [
    { path: '/', name: 'All Overview', icon: '🍽️' },
    { path: '/sales', name: 'Sales & Income', icon: '💵' },
    { path: '/expenses/material', name: 'Material Expenses', icon: '🧱' },
    { path: '/expenses/shop', name: 'Shop Expenses', icon: '🏪' },
    { path: '/withdrawals', name: 'Withdrawals', icon: '🏧' },
    { path: '/loans', name: 'Loans Ledger', icon: '🤝' },
  ];

  if (isLoading) {
    return (
      <div className="page-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <span className="spinner" style={{ width: 40, height: 40 }} />
      </div>
    );
  }

  const totalSalesNum = parseFloat(summary?.totalSales || '0');
  const grossProfitNum = parseFloat(summary?.grossProfit || '0');
  const netProfitNum = parseFloat(summary?.netProfit || '0');
  const totalExpensesNum = parseFloat(summary?.totalExpenses || '0');

  const mtdSalesNum = parseFloat(mtdSummary?.totalSales || '0');
  const mtdGrossProfitNum = parseFloat(mtdSummary?.grossProfit || '0');
  const mtdNetProfitNum = parseFloat(mtdSummary?.netProfit || '0');
  const mtdCashSalesNum = parseFloat(mtdSummary?.totalCashSales || '0');
  const mtdOnlineSalesNum = parseFloat(mtdSummary?.totalOnlineSales || '0');

  const isNetProfitPositive = netProfitNum >= 0;
  const netProfitMargin = totalSalesNum > 0 ? (netProfitNum / totalSalesNum) * 100 : 0;
  const grossProfitMargin = totalSalesNum > 0 ? (grossProfitNum / totalSalesNum) * 100 : 0;
  const expenseRatio = totalSalesNum > 0 ? (totalExpensesNum / totalSalesNum) * 100 : 0;
  const mtdNetMargin = mtdSalesNum > 0 ? (mtdNetProfitNum / mtdSalesNum) * 100 : 0;

  const isYearView = range === 'year';
  const isWeekView = range === 'week';
  const cumulativeLabelPrefix = isYearView ? 'YTD' : isWeekView ? 'WTD' : 'MTD';
  const cumulativeFullLabel = isYearView ? 'Year-To-Date (YTD)' : isWeekView ? 'Week-To-Date (WTD)' : 'Month-To-Date (MTD)';

  const cashBalNum = parseFloat(summary?.cashBalance || '0');
  const onlineBalNum = parseFloat(summary?.onlineBalance || '0');
  const retainedBalNum = parseFloat(summary?.remainingBusinessBalance || '0');
  const periodCashNetNum = parseFloat(summary?.periodNetCashFlow || '0');
  const periodOnlineNetNum = parseFloat(summary?.periodNetOnlineFlow || '0');

  const currentRangeText = rangeLabelText(range, selectedDate);

  return (
    <div className="page-container">
      {/* Shortcut Navigation Bar */}
      <div className="category-pills-bar">
        {shortcuts.map((item) => (
          <button
            key={item.path}
            className={`cat-pill ${item.path === '/' ? 'cat-pill--active' : ''}`}
            onClick={() => navigate(item.path)}
          >
            <span>{item.icon}</span>
            <span>{item.name}</span>
          </button>
        ))}
      </div>

      {/* Page Header with Date Filter Toolbar */}
      <div className="page-header" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Financial Summary & Analytics</h1>
          <p className="page-subtitle">
            {range === 'date' ? `Viewing data for ${formatDate(selectedDate)}` : formatDate(new Date(), 'long')}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {rangeTabs.map((tab) => (
            <button
              key={tab.key}
              className={`chip ${range === tab.key ? 'chip--active' : ''}`}
              onClick={() => setRange(tab.key)}
            >
              {tab.label}
            </button>
          ))}

          {range === 'date' && (
            <input
              type="date"
              className="input"
              style={{ width: 'auto', padding: '0.35rem 0.6rem', fontSize: '0.85rem', fontWeight: 600 }}
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          )}
        </div>
      </div>

      {/* Business Health & Profitability Banner */}
      <div className="card" style={{
        marginBottom: '1.5rem',
        background: isNetProfitPositive
          ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(16, 185, 129, 0.02) 100%)'
          : 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(239, 68, 68, 0.02) 100%)',
        border: isNetProfitPositive ? '1.5px solid rgba(16, 185, 129, 0.3)' : '1.5px solid rgba(239, 68, 68, 0.3)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '2rem' }}>{isNetProfitPositive ? '📈' : '📉'}</span>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-text-secondary)' }}>
                {currentRangeText} Performance Status
              </div>
              <div style={{
                fontSize: '1.35rem',
                fontWeight: 800,
                color: isNetProfitPositive ? 'var(--color-net-profit-pos)' : 'var(--color-net-profit-neg)',
              }}>
                {isNetProfitPositive ? `Running in NET PROFIT (+${netProfitMargin.toFixed(1)}%)` : `Operating at NET LOSS (${netProfitMargin.toFixed(1)}%)`}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ background: 'var(--color-bg-surface)', padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid var(--color-border)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Sales ({currentRangeText})</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-brand)' }}>
                {formatCurrency(totalSalesNum)}
              </div>
            </div>

            <div style={{ background: 'var(--color-bg-surface)', padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid var(--color-border)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>{cumulativeFullLabel} Sales</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#2563eb' }}>
                {formatCurrency(mtdSalesNum)}
              </div>
            </div>

            <div style={{ background: 'var(--color-bg-surface)', padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid var(--color-border)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Net Margin</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: isNetProfitPositive ? 'var(--color-net-profit-pos)' : 'var(--color-net-profit-neg)' }}>
                {netProfitMargin.toFixed(1)}%
              </div>
            </div>

            <div style={{ background: 'var(--color-bg-surface)', padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid var(--color-border)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>{cumulativeLabelPrefix} Net Profit</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: mtdNetProfitNum >= 0 ? 'var(--color-net-profit-pos)' : 'var(--color-net-profit-neg)' }}>
                {formatCurrency(mtdNetProfitNum)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Metric Cards */}
      <div className="grid-5" style={{ marginBottom: '1.5rem' }}>
        <div className="summary-card">
          <div className="summary-card__label">Cash Sales ({currentRangeText})</div>
          <div className="summary-card__value" style={{ color: 'var(--color-cash)' }}>
            {formatCurrency(summary?.totalCashSales || '0')}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.5rem', fontWeight: 600, display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            <span>{cumulativeLabelPrefix} Cash Sales: {formatCurrency(mtdCashSalesNum)}</span>
            <span style={{ color: cashBalNum >= 0 ? 'var(--color-cash)' : '#ef4444', fontWeight: 700 }}>
              Total Drawer Cash: {formatCurrency(summary?.cashBalance || '0')}
            </span>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-card__label">Online Sales ({currentRangeText})</div>
          <div className="summary-card__value" style={{ color: 'var(--color-online)' }}>
            {formatCurrency(summary?.totalOnlineSales || '0')}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.5rem', fontWeight: 600, display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            <span>{cumulativeLabelPrefix} Online Sales: {formatCurrency(mtdOnlineSalesNum)}</span>
            <span style={{ color: onlineBalNum >= 0 ? 'var(--color-online)' : '#ef4444', fontWeight: 700 }}>
              Total Bank Balance: {formatCurrency(summary?.onlineBalance || '0')}
            </span>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-card__label">Total Sales Revenue ({currentRangeText})</div>
          <div className="summary-card__value" style={{ color: 'var(--color-brand)' }}>
            {formatCurrency(summary?.totalSales || '0')}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.5rem', fontWeight: 600, display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            <span>{cumulativeLabelPrefix} Revenue: {formatCurrency(mtdSalesNum)}</span>
            <span>Cash: {formatCurrency(summary?.totalCashSales || '0')} | Online: {formatCurrency(summary?.totalOnlineSales || '0')}</span>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-card__label">Gross Profit ({currentRangeText})</div>
          <div className="summary-card__value" style={{ color: 'var(--color-gross-profit)' }}>
            {formatCurrency(summary?.grossProfit || '0')}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.5rem', fontWeight: 600, display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            <span>Gross Margin: {grossProfitMargin.toFixed(1)}% of Sales</span>
            <span>{cumulativeLabelPrefix} Gross Profit: {formatCurrency(mtdGrossProfitNum)}</span>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-card__label">Net Profit ({currentRangeText})</div>
          <div className="summary-card__value" style={{
            color: isNetProfitPositive ? 'var(--color-net-profit-pos)' : 'var(--color-net-profit-neg)',
          }}>
            {formatCurrency(summary?.netProfit || '0')}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.5rem', fontWeight: 600, display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            <span>Net Margin: {netProfitMargin.toFixed(1)}% of Sales</span>
            <span style={{ color: mtdNetProfitNum >= 0 ? 'var(--color-net-profit-pos)' : 'var(--color-net-profit-neg)' }}>{cumulativeLabelPrefix} Net Profit: {formatCurrency(mtdNetProfitNum)} ({mtdNetMargin.toFixed(1)}%)</span>
          </div>
        </div>
      </div>

      {/* Loans Ledger Summary Row (Payables & Receivables) */}
      <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
        <div className="card" style={{ borderLeft: '4px solid #ef4444', background: 'var(--color-surface)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase' }}>
              💳 Loans Payable (We Owe)
            </div>
            <button className="btn btn-outline" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }} onClick={() => navigate('/loans')}>
              Manage Loans ➔
            </button>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#dc2626' }}>
            {formatCurrency(summary?.pendingLoanTaken || '0')}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', marginTop: '0.375rem', fontWeight: 600 }}>
            Total pending money borrowed by the shop from lenders
          </div>
        </div>

        <div className="card" style={{ borderLeft: '4px solid #16a34a', background: 'var(--color-surface)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#15803d', textTransform: 'uppercase' }}>
              📥 Loans Receivable (Owed to Us)
            </div>
            <button className="btn btn-outline" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }} onClick={() => navigate('/loans')}>
              Manage Loans ➔
            </button>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#16a34a' }}>
            {formatCurrency(summary?.pendingLoanGiven || '0')}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', marginTop: '0.375rem', fontWeight: 600 }}>
            Total pending money lent out by the shop to borrowers
          </div>
        </div>
      </div>

      {/* Retained Business Balance & Withdrawals Row */}
      <div className="grid-3" style={{ marginBottom: '1.5rem' }}>
        <div className="card" style={{ borderLeft: '4px solid var(--color-accent-teal)' }}>
          <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', marginBottom: '0.375rem' }}>
            Total Retained Business Balance (Cash Drawer + Bank Account)
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: retainedBalNum >= 0 ? 'var(--color-accent-teal)' : '#ef4444' }}>
            {formatCurrency(summary?.remainingBusinessBalance || '0')}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.375rem', fontWeight: 600 }}>
            <span>Cash Drawer: </span>
            <span style={{ color: cashBalNum >= 0 ? '#16a34a' : '#ef4444', fontWeight: 700 }}>{formatCurrency(summary?.cashBalance || '0')}</span>
            <span> | Bank Account: </span>
            <span style={{ color: onlineBalNum >= 0 ? '#2563eb' : '#ef4444', fontWeight: 700 }}>{formatCurrency(summary?.onlineBalance || '0')}</span>
          </div>
        </div>

        <div className="card" style={{ borderLeft: '4px solid var(--color-brand)' }}>
          <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', marginBottom: '0.375rem' }}>
            Withdrawals ({currentRangeText})
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--color-brand)' }}>
            {formatCurrency(summary?.totalWithdrawals || '0')}
          </div>
          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginTop: '0.375rem' }}>
            <span>Cash: {formatCurrency(summary?.cashWithdrawals || '0')}</span>
            <span>Online: {formatCurrency(summary?.onlineWithdrawals || '0')}</span>
          </div>
        </div>

        <div className="card" style={{ borderLeft: '4px solid var(--color-accent-purple)' }}>
          <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', marginBottom: '0.375rem' }}>
            Total Expenses ({currentRangeText}) — {expenseRatio.toFixed(1)}% of Sales
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
            {formatCurrency(summary?.totalExpenses || '0')}
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginTop: '0.375rem', flexWrap: 'wrap' }}>
            <span>Material: {formatCurrency(summary?.totalMaterialExpenses || '0')}</span>
            <span>Shop: {formatCurrency(summary?.totalShopExpenses || '0')}</span>
            <span>Misc: {formatCurrency(summary?.totalMiscExpenses || '0')}</span>
          </div>
        </div>
      </div>

      {/* Categorized Payment Method Breakdown Card (Cash vs Online) */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>💳 Categorized Payment Methods Breakdown (Cash vs Online/UPI)</span>
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
          {/* Cash Payment Mode Card */}
          <div style={{ background: 'var(--color-background)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#16a34a' }}>💵 Cash Payment Method</span>
              <span className="badge badge--cash">CASH</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Opening / Starting Cash:</span>
                <strong>{formatCurrency(summary?.openingCashVal || '0')}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>(+) Cash Sales Revenue:</span>
                <strong style={{ color: '#16a34a' }}>+{formatCurrency(summary?.totalCashSales || '0')}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>(-) Cash Material Costs:</span>
                <span style={{ color: '#dc2626' }}>-{formatCurrency(summary?.cashMaterialExpenses || '0')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>(-) Cash Overheads & Misc:</span>
                <span style={{ color: '#dc2626' }}>-{formatCurrency(parseFloat(summary?.cashShopExpenses || '0') + parseFloat(summary?.cashMiscExpenses || '0'))}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>(-) Cash Owner Drawings:</span>
                <span style={{ color: '#dc2626' }}>-{formatCurrency(summary?.cashWithdrawals || '0')}</span>
              </div>
              <div style={{ borderTop: '1px dashed var(--color-border)', paddingTop: '0.35rem', marginTop: '0.2rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 700 }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Net Cash Flow ({currentRangeText}):</span>
                <span style={{ color: periodCashNetNum >= 0 ? '#16a34a' : '#dc2626' }}>
                  {periodCashNetNum >= 0 ? '+' : ''}{formatCurrency(summary?.periodNetCashFlow || '0')}
                </span>
              </div>
              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '0.4rem', marginTop: '0.2rem', display: 'flex', justifyContent: 'space-between', fontWeight: 800 }}>
                <span>Closing Drawer Cash:</span>
                <span style={{ color: cashBalNum >= 0 ? '#16a34a' : '#dc2626', fontSize: '1rem' }}>{formatCurrency(summary?.cashBalance || '0')}</span>
              </div>
            </div>
          </div>

          {/* Online / UPI Payment Mode Card */}
          <div style={{ background: 'var(--color-background)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#2563eb' }}>🌐 Online / UPI Payment Method</span>
              <span className="badge badge--online">ONLINE / UPI</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Opening / Starting Bank:</span>
                <strong>{formatCurrency(summary?.openingBankVal || '0')}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>(+) UPI / Bank Sales:</span>
                <strong style={{ color: '#2563eb' }}>+{formatCurrency(summary?.totalOnlineSales || '0')}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>(-) Online Material Costs:</span>
                <span style={{ color: '#dc2626' }}>-{formatCurrency(summary?.onlineMaterialExpenses || '0')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>(-) Online Overheads & Rent:</span>
                <span style={{ color: '#dc2626' }}>-{formatCurrency(parseFloat(summary?.onlineShopExpenses || '0') + parseFloat(summary?.onlineMiscExpenses || '0'))}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>(-) Online Owner Drawings:</span>
                <span style={{ color: '#dc2626' }}>-{formatCurrency(summary?.onlineWithdrawals || '0')}</span>
              </div>
              <div style={{ borderTop: '1px dashed var(--color-border)', paddingTop: '0.35rem', marginTop: '0.2rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 700 }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Net Online Flow ({currentRangeText}):</span>
                <span style={{ color: periodOnlineNetNum >= 0 ? '#2563eb' : '#dc2626' }}>
                  {periodOnlineNetNum >= 0 ? '+' : ''}{formatCurrency(summary?.periodNetOnlineFlow || '0')}
                </span>
              </div>
              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '0.4rem', marginTop: '0.2rem', display: 'flex', justifyContent: 'space-between', fontWeight: 800 }}>
                <span>Closing Bank Account Balance:</span>
                <span style={{ color: onlineBalNum >= 0 ? '#2563eb' : '#dc2626', fontSize: '1rem' }}>{formatCurrency(summary?.onlineBalance || '0')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── DYNAMIC GRAPH & CHART CONTROLLER BAR ─── */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          {/* Metric Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-secondary)' }}>📊 Select Graph View:</span>
            <button
              type="button"
              className={`btn btn-sm ${chartMetric === 'sales' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setChartMetric('sales')}
            >
              💵 Sales Trend (Cash vs Online)
            </button>
            <button
              type="button"
              className={`btn btn-sm ${chartMetric === 'expense' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setChartMetric('expense')}
            >
              🧱 Expense Breakdown
            </button>
            <button
              type="button"
              className={`btn btn-sm ${chartMetric === 'split' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setChartMetric('split')}
            >
              ⚖️ Cash vs Online Comparison
            </button>
            <button
              type="button"
              className={`btn btn-sm ${chartMetric === 'profit' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setChartMetric('profit')}
            >
              📈 Profitability & Margins
            </button>
          </div>

          {/* Graph Style Selector Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'var(--color-bg-secondary)', padding: '0.25rem', borderRadius: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0 0.5rem', color: 'var(--color-text-muted)' }}>Type:</span>
            <button
              type="button"
              className={`btn btn-xs ${chartStyle === 'area' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
              onClick={() => setChartStyle('area')}
              title="Area Chart"
            >
              🌊 Area
            </button>
            <button
              type="button"
              className={`btn btn-xs ${chartStyle === 'bar' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
              onClick={() => setChartStyle('bar')}
              title="Bar Chart"
            >
              📊 Bar
            </button>
            <button
              type="button"
              className={`btn btn-xs ${chartStyle === 'line' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
              onClick={() => setChartStyle('line')}
              title="Line Chart"
            >
              📈 Line
            </button>
            <button
              type="button"
              className={`btn btn-xs ${chartStyle === 'pie' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
              onClick={() => setChartStyle('pie')}
              title="Pie / Donut Chart"
            >
              🍩 Donut
            </button>
          </div>
        </div>
      </div>

      {/* ─── DYNAMIC GRAPH DISPLAY CANVAS ─── */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>
            {chartMetric === 'sales' && `Sales Revenue Trend (${currentRangeText})`}
            {chartMetric === 'expense' && `Expense Category Breakdown (${currentRangeText})`}
            {chartMetric === 'split' && `Cash vs Online Financial Comparison (${currentRangeText})`}
            {chartMetric === 'profit' && `Profitability & Margins Overview (${currentRangeText})`}
          </span>
          <span className="badge" style={{ textTransform: 'uppercase', fontSize: '0.7rem' }}>
            Graph Type: {chartStyle}
          </span>
        </h3>

        {/* 1. SALES METRIC GRAPH */}
        {chartMetric === 'sales' && (
          trend.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              {chartStyle === 'area' ? (
                <AreaChart data={trend}>
                  <defs>
                    <linearGradient id="cashGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="onlineGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EFECE6" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fontWeight: 600 }} tickFormatter={(d) => formatDate(d, 'short')} />
                  <YAxis tick={{ fontSize: 11, fontWeight: 600 }} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                  <Area type="monotone" dataKey="cashSales" stroke="#10B981" strokeWidth={3} fill="url(#cashGrad)" name="Cash Sales" />
                  <Area type="monotone" dataKey="onlineSales" stroke="#3B82F6" strokeWidth={3} fill="url(#onlineGrad)" name="Online Sales" />
                </AreaChart>
              ) : chartStyle === 'bar' ? (
                <BarChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EFECE6" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fontWeight: 600 }} tickFormatter={(d) => formatDate(d, 'short')} />
                  <YAxis tick={{ fontSize: 11, fontWeight: 600 }} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                  <Bar dataKey="cashSales" fill="#10B981" name="Cash Sales" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="onlineSales" fill="#3B82F6" name="Online Sales" radius={[4, 4, 0, 0]} />
                </BarChart>
              ) : chartStyle === 'line' ? (
                <LineChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EFECE6" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fontWeight: 600 }} tickFormatter={(d) => formatDate(d, 'short')} />
                  <YAxis tick={{ fontSize: 11, fontWeight: 600 }} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                  <Line type="monotone" dataKey="cashSales" stroke="#10B981" strokeWidth={3} dot={{ r: 4 }} name="Cash Sales" />
                  <Line type="monotone" dataKey="onlineSales" stroke="#3B82F6" strokeWidth={3} dot={{ r: 4 }} name="Online Sales" />
                </LineChart>
              ) : (
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Cash Sales', value: parseFloat(summary?.totalCashSales || '0') },
                      { name: 'Online Sales', value: parseFloat(summary?.totalOnlineSales || '0') },
                    ]}
                    cx="50%" cy="50%" innerRadius={60} outerRadius={105} paddingAngle={4} dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  >
                    <Cell fill="#10B981" stroke="#FFFFFF" strokeWidth={2} />
                    <Cell fill="#3B82F6" stroke="#FFFFFF" strokeWidth={2} />
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                </PieChart>
              )}
            </ResponsiveContainer>
          ) : (
            <div className="empty-state">
              <div className="empty-state__icon">📊</div>
              <div className="empty-state__title">No sales data for {currentRangeText}</div>
            </div>
          )
        )}

        {/* 2. EXPENSE METRIC GRAPH */}
        {chartMetric === 'expense' && (
          expensePieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              {chartStyle === 'pie' ? (
                <PieChart>
                  <Pie
                    data={expensePieData}
                    cx="50%" cy="50%" innerRadius={55} outerRadius={105} paddingAngle={3} dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {expensePieData.map((_, idx) => (
                      <Cell key={idx} fill={EXPENSE_COLORS[idx % EXPENSE_COLORS.length]} stroke="#FFFFFF" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                </PieChart>
              ) : chartStyle === 'bar' ? (
                <BarChart data={expensePieData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EFECE6" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 600 }} />
                  <YAxis tick={{ fontSize: 11, fontWeight: 600 }} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Bar dataKey="value" name="Expense Amount" radius={[4, 4, 0, 0]}>
                    {expensePieData.map((_, idx) => (
                      <Cell key={idx} fill={EXPENSE_COLORS[idx % EXPENSE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              ) : (
                <AreaChart data={expensePieData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EFECE6" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 600 }} />
                  <YAxis tick={{ fontSize: 11, fontWeight: 600 }} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Area type="monotone" dataKey="value" stroke="#EF5A34" strokeWidth={3} fill="#EF5A34" fillOpacity={0.3} name="Expense Amount" />
                </AreaChart>
              )}
            </ResponsiveContainer>
          ) : (
            <div className="empty-state">
              <div className="empty-state__icon">🥧</div>
              <div className="empty-state__title">No expenses recorded for {currentRangeText}</div>
            </div>
          )
        )}

        {/* 3. CASH VS ONLINE SPLIT GRAPH */}
        {chartMetric === 'split' && (
          <ResponsiveContainer width="100%" height={320}>
            {chartStyle === 'bar' || chartStyle === 'area' || chartStyle === 'line' ? (
              <BarChart data={modeSplitData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EFECE6" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 700 }} />
                <YAxis tick={{ fontSize: 11, fontWeight: 600 }} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="amount" name="Amount (₹)" radius={[6, 6, 0, 0]}>
                  {modeSplitData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            ) : (
              <PieChart>
                <Pie
                  data={modeSplitData}
                  cx="50%" cy="50%" innerRadius={60} outerRadius={105} paddingAngle={4} dataKey="amount"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                >
                  {modeSplitData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.fill} stroke="#FFFFFF" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
              </PieChart>
            )}
          </ResponsiveContainer>
        )}

        {/* 4. PROFITABILITY & MARGINS GRAPH */}
        {chartMetric === 'profit' && (
          <ResponsiveContainer width="100%" height={320}>
            {chartStyle === 'bar' ? (
              <BarChart data={profitTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EFECE6" />
                <XAxis dataKey={trend.length > 0 ? "date" : "name"} tick={{ fontSize: 11, fontWeight: 600 }} tickFormatter={(d) => d.includes('-') ? formatDate(d, 'short') : d} />
                <YAxis tick={{ fontSize: 11, fontWeight: 600 }} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
                <Bar dataKey="Sales" fill="#0f766e" name="Total Sales" radius={[4, 4, 0, 0]} />
                <Bar dataKey="CashSales" fill="#10B981" name="Cash Sales" radius={[4, 4, 0, 0]} />
                <Bar dataKey="OnlineSales" fill="#3B82F6" name="Online Sales" radius={[4, 4, 0, 0]} />
              </BarChart>
            ) : chartStyle === 'line' ? (
              <LineChart data={profitTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EFECE6" />
                <XAxis dataKey={trend.length > 0 ? "date" : "name"} tick={{ fontSize: 11, fontWeight: 600 }} tickFormatter={(d) => d.includes('-') ? formatDate(d, 'short') : d} />
                <YAxis tick={{ fontSize: 11, fontWeight: 600 }} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
                <Line type="monotone" dataKey="Sales" stroke="#0f766e" strokeWidth={3} dot={{ r: 5 }} name="Total Sales" />
                <Line type="monotone" dataKey="CashSales" stroke="#10B981" strokeWidth={2} dot={{ r: 4 }} name="Cash Sales" />
                <Line type="monotone" dataKey="OnlineSales" stroke="#3B82F6" strokeWidth={2} dot={{ r: 4 }} name="Online Sales" />
              </LineChart>
            ) : (
              <AreaChart data={profitTrendData}>
                <defs>
                  <linearGradient id="profitSalesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0f766e" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#0f766e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#EFECE6" />
                <XAxis dataKey={trend.length > 0 ? "date" : "name"} tick={{ fontSize: 11, fontWeight: 600 }} tickFormatter={(d) => d.includes('-') ? formatDate(d, 'short') : d} />
                <YAxis tick={{ fontSize: 11, fontWeight: 600 }} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
                <Area type="monotone" dataKey="Sales" stroke="#0f766e" strokeWidth={3} fill="url(#profitSalesGrad)" name="Total Revenue" />
              </AreaChart>
            )}
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

function rangeLabelText(range: RangeTab, selectedDate: string): string {
  switch (range) {
    case 'today':
      return 'Today';
    case 'date':
      return `Date: ${selectedDate}`;
    case 'week':
      return 'This Week';
    case 'month':
      return 'This Month';
    case 'year':
      return 'This Year';
  }
}

export default Dashboard;
