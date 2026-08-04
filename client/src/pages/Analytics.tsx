import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../api/client';
import { formatCurrency, formatDate } from '../lib/financeFormatters';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

type AnalyticsPeriod = 'today' | 'week' | 'month' | 'year' | 'trend12' | 'range';
type GraphStyle = 'bar' | 'area' | 'line' | 'pie';

function Analytics() {
  const todayStr = new Date().toISOString().slice(0, 10);
  const monthStartStr = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

  const [period, setPeriod] = useState<AnalyticsPeriod>('month');
  const [dateRange, setDateRange] = useState({ from: monthStartStr, to: todayStr });
  const [graphStyle, setGraphStyle] = useState<GraphStyle>('bar');
  const [activeChartTab, setActiveChartTab] = useState<'profit' | 'expense' | 'sales'>('expense');

  // Compute query range dates based on selected period
  const queryRange = useMemo(() => {
    const now = new Date();
    let from: Date;
    let to: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    if (period === 'today') {
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (period === 'week') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      from = new Date(now.getFullYear(), now.getMonth(), diff);
    } else if (period === 'month') {
      from = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (period === 'year') {
      from = new Date(now.getFullYear(), 0, 1);
    } else if (period === 'range') {
      from = new Date(dateRange.from);
      to = new Date(dateRange.to + 'T23:59:59.999Z');
    } else {
      // 12 Months
      from = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    }

    return {
      from: from.toISOString(),
      to: to.toISOString(),
    };
  }, [period, dateRange]);

  // Fetch 12-Month Profit & Revenue Trend
  const { data: profitTrendData, isLoading: profitLoading } = useQuery({
    queryKey: ['profitTrend'],
    queryFn: () => analyticsApi.profitTrend(),
  });

  // Fetch Range-Matched Expense Breakdown
  const { data: breakdownData, isLoading: breakdownLoading } = useQuery({
    queryKey: ['expenseBreakdown', queryRange.from, queryRange.to],
    queryFn: () => analyticsApi.expenseBreakdown({ from: queryRange.from, to: queryRange.to }),
  });

  // Fetch Range-Matched Sales Trend
  const { data: salesTrendData, isLoading: salesLoading } = useQuery({
    queryKey: ['salesTrend', queryRange.from, queryRange.to],
    queryFn: () => analyticsApi.salesTrend({ granularity: 'day', from: queryRange.from, to: queryRange.to }),
  });

  const profitTrend = profitTrendData?.data || [];
  const breakdown = breakdownData?.data || { material: [], shop: [], misc: [] };
  const salesTrend = salesTrendData?.data || [];

  const EXPENSE_COLORS = ['#EF5A34', '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EC4899', '#6366F1', '#14B8A6'];

  // Prepared Expense Pie Slices
  const expensePieData = useMemo(() => {
    const slices: { name: string; value: number }[] = [];

    if (breakdown.material) {
      breakdown.material.forEach((m: any) => {
        const val = parseFloat(m.amount);
        if (val > 0) slices.push({ name: `Mat: ${m.category}`, value: val });
      });
    }

    if (breakdown.shop) {
      breakdown.shop.forEach((s: any) => {
        const val = parseFloat(s.amount);
        if (val > 0) slices.push({ name: `Shop: ${s.category}`, value: val });
      });
    }

    if (breakdown.misc) {
      breakdown.misc.forEach((m: any) => {
        const val = parseFloat(m.amount);
        if (val > 0) slices.push({ name: `Misc: ${m.name}`, value: val });
      });
    }

    return slices.sort((a, b) => b.value - a.value);
  }, [breakdown]);

  // Aggregate totals
  const totalMaterial = (breakdown.material || []).reduce((sum: number, i: any) => sum + parseFloat(i.amount), 0);
  const totalShop = (breakdown.shop || []).reduce((sum: number, i: any) => sum + parseFloat(i.amount), 0);
  const totalMisc = (breakdown.misc || []).reduce((sum: number, i: any) => sum + parseFloat(i.amount), 0);
  const grandTotalExpense = totalMaterial + totalShop + totalMisc;

  const categoryTotalsPie = [
    { name: 'Material Costs (COGS)', value: totalMaterial, fill: '#EF5A34' },
    { name: 'Shop Operational Exp', value: totalShop, fill: '#3B82F6' },
    { name: 'Miscellaneous Exp', value: totalMisc, fill: '#F59E0B' },
  ].filter(i => i.value > 0);

  const periodLabel = period === 'today'
    ? 'Today'
    : period === 'week'
    ? 'This Week'
    : period === 'month'
    ? 'This Month'
    : period === 'year'
    ? 'This Year'
    : period === 'range'
    ? `Range (${dateRange.from} to ${dateRange.to})`
    : 'Last 12 Months';

  return (
    <div className="page-container">
      <div className="page-header" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Analytics & Business Insights</h1>
          <p className="page-subtitle">Categorized expenses, profit trends & visual financial analytics</p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <button className={`chip ${period === 'today' ? 'chip--active' : ''}`} onClick={() => setPeriod('today')}>⚡ Today</button>
          <button className={`chip ${period === 'week' ? 'chip--active' : ''}`} onClick={() => setPeriod('week')}>This Week</button>
          <button className={`chip ${period === 'month' ? 'chip--active' : ''}`} onClick={() => setPeriod('month')}>This Month</button>
          <button className={`chip ${period === 'year' ? 'chip--active' : ''}`} onClick={() => setPeriod('year')}>This Year</button>
          <button className={`chip ${period === 'trend12' ? 'chip--active' : ''}`} onClick={() => setPeriod('trend12')}>🗓️ 12 Months Trend</button>
          <button className={`chip ${period === 'range' ? 'chip--active' : ''}`} onClick={() => setPeriod('range')}>📅 Custom Range</button>
        </div>
      </div>

      {/* Custom Date Range Selector */}
      {period === 'range' && (
        <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="input-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
              <label className="input-label" style={{ marginBottom: 0 }}>From:</label>
              <input type="date" className="input" style={{ width: 'auto' }} value={dateRange.from} onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })} />
            </div>
            <div className="input-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
              <label className="input-label" style={{ marginBottom: 0 }}>To:</label>
              <input type="date" className="input" style={{ width: 'auto' }} value={dateRange.to} onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })} />
            </div>
          </div>
        </div>
      )}

      {/* Graph Visual Customization Controller */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          {/* Active Chart Selection */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-secondary)' }}>📊 Analytics View:</span>
            <button type="button" className={`btn btn-sm ${activeChartTab === 'expense' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveChartTab('expense')}>
              🍩 Expense Breakdown ({periodLabel})
            </button>
            <button type="button" className={`btn btn-sm ${activeChartTab === 'profit' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveChartTab('profit')}>
              📈 Monthly Profit & Revenue Trend
            </button>
            <button type="button" className={`btn btn-sm ${activeChartTab === 'sales' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveChartTab('sales')}>
              💵 Daily Sales Trend
            </button>
          </div>

          {/* Graph Type Switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'var(--color-bg-secondary)', padding: '0.25rem', borderRadius: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0 0.5rem', color: 'var(--color-text-muted)' }}>Graph Type:</span>
            <button type="button" className={`btn btn-xs ${graphStyle === 'pie' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setGraphStyle('pie')} style={{ padding: '0.25rem 0.5rem' }}>🍩 Donut / Pie</button>
            <button type="button" className={`btn btn-xs ${graphStyle === 'bar' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setGraphStyle('bar')} style={{ padding: '0.25rem 0.5rem' }}>📊 Bar</button>
            <button type="button" className={`btn btn-xs ${graphStyle === 'area' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setGraphStyle('area')} style={{ padding: '0.25rem 0.5rem' }}>🌊 Area</button>
            <button type="button" className={`btn btn-xs ${graphStyle === 'line' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setGraphStyle('line')} style={{ padding: '0.25rem 0.5rem' }}>📈 Line</button>
          </div>
        </div>
      </div>

      {/* Main Interactive Graph Canvas */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>
            {activeChartTab === 'expense' && `Category Expense Share — ${periodLabel}`}
            {activeChartTab === 'profit' && `12-Month Financial Performance & Net Profit`}
            {activeChartTab === 'sales' && `Daily Sales Revenue & Mode Breakdown — ${periodLabel}`}
          </span>
          <span className="badge" style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>Total Expenses: {formatCurrency(grandTotalExpense)}</span>
        </h3>

        {/* 1. EXPENSE BREAKDOWN CHART */}
        {activeChartTab === 'expense' && (
          breakdownLoading ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}><span className="spinner" /></div>
          ) : expensePieData.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">🥧</div>
              <div className="empty-state__title">No expense data available for {periodLabel}</div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={340}>
              {graphStyle === 'pie' ? (
                <PieChart>
                  <Pie
                    data={expensePieData}
                    cx="50%" cy="50%" innerRadius={60} outerRadius={115} paddingAngle={3} dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {expensePieData.map((_, idx) => (
                      <Cell key={idx} fill={EXPENSE_COLORS[idx % EXPENSE_COLORS.length]} stroke="#FFFFFF" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: number) => formatCurrency(val)} />
                  <Legend />
                </PieChart>
              ) : graphStyle === 'bar' ? (
                <BarChart data={expensePieData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(val: number) => formatCurrency(val)} />
                  <Bar dataKey="value" name="Expense Amount" radius={[4, 4, 0, 0]}>
                    {expensePieData.map((_, idx) => (
                      <Cell key={idx} fill={EXPENSE_COLORS[idx % EXPENSE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              ) : (
                <AreaChart data={expensePieData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(val: number) => formatCurrency(val)} />
                  <Area type="monotone" dataKey="value" stroke="#EF5A34" strokeWidth={3} fill="#EF5A34" fillOpacity={0.3} name="Expense Share" />
                </AreaChart>
              )}
            </ResponsiveContainer>
          )
        )}

        {/* 2. PROFIT & REVENUE TREND CHART */}
        {activeChartTab === 'profit' && (
          profitLoading ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}><span className="spinner" /></div>
          ) : profitTrend.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">📈</div>
              <div className="empty-state__title">No trend data available</div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={340}>
              {graphStyle === 'line' ? (
                <LineChart data={profitTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(val: number) => formatCurrency(val)} />
                  <Legend />
                  <Line type="monotone" dataKey="totalSales" stroke="#0F766E" strokeWidth={3} dot={{ r: 4 }} name="Total Sales" />
                  <Line type="monotone" dataKey="grossProfit" stroke="#3B82F6" strokeWidth={2} dot={{ r: 4 }} name="Gross Profit" />
                  <Line type="monotone" dataKey="netProfit" stroke="#10B981" strokeWidth={3} dot={{ r: 5 }} name="Net Profit" />
                </LineChart>
              ) : graphStyle === 'area' ? (
                <AreaChart data={profitTrend}>
                  <defs>
                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0F766E" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#0F766E" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(val: number) => formatCurrency(val)} />
                  <Legend />
                  <Area type="monotone" dataKey="totalSales" stroke="#0F766E" strokeWidth={3} fill="url(#salesGrad)" name="Total Revenue" />
                </AreaChart>
              ) : (
                <BarChart data={profitTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(val: number) => formatCurrency(val)} />
                  <Legend />
                  <Bar dataKey="totalSales" name="Total Sales" fill="#0F766E" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="grossProfit" name="Gross Profit" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="netProfit" name="Net Profit" fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          )
        )}

        {/* 3. SALES TREND CHART */}
        {activeChartTab === 'sales' && (
          salesLoading ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}><span className="spinner" /></div>
          ) : salesTrend.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">💵</div>
              <div className="empty-state__title">No sales trend data for {periodLabel}</div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={340}>
              <BarChart data={salesTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => formatDate(d, 'short')} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(val: number) => formatCurrency(val)} />
                <Legend />
                <Bar dataKey="cashSales" name="Cash Sales" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="onlineSales" name="Online Sales" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )
        )}
      </div>

      {/* Categorized Expense Breakdown Summary Tables */}
      <div className="grid-3">
        {/* Material Expenses Card */}
        <div className="card">
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>🥛 Material Expenses (COGS)</span>
            <span style={{ fontSize: '0.85rem', color: 'var(--color-primary)', fontWeight: 700 }}>{formatCurrency(totalMaterial)}</span>
          </h3>
          {breakdownLoading ? (
            <span className="spinner" />
          ) : breakdown.material.length === 0 ? (
            <div className="text-muted text-center" style={{ padding: '1.5rem' }}>No material expense entries for period</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {breakdown.material.map((item: any) => (
                <div key={item.category} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.875rem' }}>{item.category}</span>
                  <span className="money">{formatCurrency(item.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Shop Expenses Card */}
        <div className="card">
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>🏬 Shop Operational Expenses</span>
            <span style={{ fontSize: '0.85rem', color: 'var(--color-primary)', fontWeight: 700 }}>{formatCurrency(totalShop)}</span>
          </h3>
          {breakdownLoading ? (
            <span className="spinner" />
          ) : breakdown.shop.length === 0 ? (
            <div className="text-muted text-center" style={{ padding: '1.5rem' }}>No shop expense entries for period</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {breakdown.shop.map((item: any) => (
                <div key={item.category} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.875rem' }}>{item.category}</span>
                  <span className="money">{formatCurrency(item.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Misc Expenses Card */}
        <div className="card">
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>📦 Miscellaneous Expenses</span>
            <span style={{ fontSize: '0.85rem', color: 'var(--color-primary)', fontWeight: 700 }}>{formatCurrency(totalMisc)}</span>
          </h3>
          {breakdownLoading ? (
            <span className="spinner" />
          ) : breakdown.misc.length === 0 ? (
            <div className="text-muted text-center" style={{ padding: '1.5rem' }}>No misc expense entries for period</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {breakdown.misc.map((item: any) => (
                <div key={item.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.875rem' }}>{item.name}</span>
                  <span className="money">{formatCurrency(item.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Analytics;
