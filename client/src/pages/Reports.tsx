import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '../api/client';
import { formatCurrency, formatDate } from '../lib/financeFormatters';

function Reports() {
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10),
    to: new Date().toISOString().slice(0, 10),
  });

  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [downloadingFormat, setDownloadingFormat] = useState<'pdf' | 'xlsx' | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const { data: reportData, isLoading, refetch } = useQuery({
    queryKey: ['reports', dateRange.from, dateRange.to, categoryFilter],
    queryFn: () => reportsApi.get(dateRange.from, dateRange.to, categoryFilter),
  });

  const handleExportPdf = async () => {
    try {
      setExportError(null);
      setDownloadingFormat('pdf');
      await reportsApi.downloadPdf(dateRange.from, dateRange.to, categoryFilter);
    } catch (err: any) {
      setExportError(err.message || 'Failed to export PDF');
    } finally {
      setDownloadingFormat(null);
    }
  };

  const handleExportXlsx = async () => {
    try {
      setExportError(null);
      setDownloadingFormat('xlsx');
      await reportsApi.downloadXlsx(dateRange.from, dateRange.to, categoryFilter);
    } catch (err: any) {
      setExportError(err.message || 'Failed to export Excel file');
    } finally {
      setDownloadingFormat(null);
    }
  };

  const applyCyclePreset = (presetType: 'this-week' | 'last-week' | 'this-month' | 'this-cycle15' | 'last-month' | 'last-cycle15') => {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth();

    if (presetType === 'this-week') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const from = new Date(now.getFullYear(), now.getMonth(), diff);
      const to = new Date(now.getFullYear(), now.getMonth(), diff + 6);
      setDateRange({
        from: from.toISOString().slice(0, 10),
        to: to.toISOString().slice(0, 10),
      });
    } else if (presetType === 'last-week') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1) - 7;
      const from = new Date(now.getFullYear(), now.getMonth(), diff);
      const to = new Date(now.getFullYear(), now.getMonth(), diff + 6);
      setDateRange({
        from: from.toISOString().slice(0, 10),
        to: to.toISOString().slice(0, 10),
      });
    } else if (presetType === 'this-month') {
      const from = new Date(curYear, curMonth, 1);
      const to = new Date(curYear, curMonth + 1, 0);
      setDateRange({
        from: from.toISOString().slice(0, 10),
        to: to.toISOString().slice(0, 10),
      });
    } else if (presetType === 'this-cycle15') {
      let from: Date;
      let to: Date;
      if (now.getDate() >= 15) {
        from = new Date(curYear, curMonth, 15);
        to = new Date(curYear, curMonth + 1, 14);
      } else {
        from = new Date(curYear, curMonth - 1, 15);
        to = new Date(curYear, curMonth, 14);
      }
      setDateRange({
        from: from.toISOString().slice(0, 10),
        to: to.toISOString().slice(0, 10),
      });
    } else if (presetType === 'last-month') {
      const from = new Date(curYear, curMonth - 1, 1);
      const to = new Date(curYear, curMonth, 0);
      setDateRange({
        from: from.toISOString().slice(0, 10),
        to: to.toISOString().slice(0, 10),
      });
    } else if (presetType === 'last-cycle15') {
      let from: Date;
      let to: Date;
      if (now.getDate() >= 15) {
        from = new Date(curYear, curMonth - 1, 15);
        to = new Date(curYear, curMonth, 14);
      } else {
        from = new Date(curYear, curMonth - 2, 15);
        to = new Date(curYear, curMonth - 1, 14);
      }
      setDateRange({
        from: from.toISOString().slice(0, 10),
        to: to.toISOString().slice(0, 10),
      });
    }
  };

  const handleMonthChange = (monthVal: string, cycleMode: 'standard' | 'cycle15' = 'cycle15') => {
    if (!monthVal) return;
    const [y, m] = monthVal.split('-').map(Number);
    const year = y;
    const month = m - 1;

    if (cycleMode === 'standard') {
      const from = new Date(year, month, 1);
      const to = new Date(year, month + 1, 0);
      setDateRange({
        from: from.toISOString().slice(0, 10),
        to: to.toISOString().slice(0, 10),
      });
    } else {
      const from = new Date(year, month - 1, 15);
      const to = new Date(year, month, 14);
      setDateRange({
        from: from.toISOString().slice(0, 10),
        to: to.toISOString().slice(0, 10),
      });
    }
  };

  const summary = reportData?.data?.summary;
  const records = reportData?.data?.records || { sales: [], materialExpenses: [], shopExpenses: [], miscExpenses: [], withdrawals: [] };

  const showSales = categoryFilter === 'ALL' || categoryFilter === 'SALES';
  const showMaterial = categoryFilter === 'ALL' || categoryFilter === 'MATERIAL_EXPENSES';
  const showShop = categoryFilter === 'ALL' || categoryFilter === 'SHOP_EXPENSES';
  const showMisc = categoryFilter === 'ALL' || categoryFilter === 'MISC_EXPENSES';
  const showWithdrawals = categoryFilter === 'ALL' || categoryFilter === 'WITHDRAWALS';

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Financial Reports</h1>
          <p className="page-subtitle">Generate & export category-wise period reports</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary" onClick={handleExportPdf} disabled={downloadingFormat !== null}>
            {downloadingFormat === 'pdf' ? '⏳ Generating PDF...' : '📄 Export PDF'}
          </button>
          <button className="btn btn-secondary" onClick={handleExportXlsx} disabled={downloadingFormat !== null}>
            {downloadingFormat === 'xlsx' ? '⏳ Generating Excel...' : '📊 Export Excel'}
          </button>
        </div>
      </div>

      {exportError && (
        <div style={{ background: '#fee2e2', border: '1px solid #f87171', color: '#991b1b', padding: '0.75rem 1rem', borderRadius: '0.5rem', marginBottom: '1rem' }}>
          ⚠️ {exportError}
        </div>
      )}

      {/* Filter Bar */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Quick Presets Bar */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)', marginRight: '0.25rem' }}>⚡ Quick Presets:</span>
            <button type="button" className="btn btn-outline" style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem' }} onClick={() => applyCyclePreset('this-week')}>
              ⚡ This Week (Mon - Sun)
            </button>
            <button type="button" className="btn btn-outline" style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem' }} onClick={() => applyCyclePreset('last-week')}>
              ⏪ Last Week
            </button>
            <button type="button" className="btn btn-outline" style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem' }} onClick={() => applyCyclePreset('this-month')}>
              📅 This Month (1st - End)
            </button>
            <button type="button" className="btn btn-outline" style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem', borderColor: '#0f766e', color: '#0f766e', fontWeight: 600 }} onClick={() => applyCyclePreset('this-cycle15')}>
              🗓️ 15th-to-14th Cycle
            </button>
            <button type="button" className="btn btn-outline" style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem' }} onClick={() => applyCyclePreset('last-month')}>
              ⏪ Last Month
            </button>
          </div>

          {/* Category Filter + Month Selector & Date Range Inputs */}
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="input-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
              <label className="input-label" style={{ marginBottom: 0, fontWeight: 600 }}>Filter Category / Option:</label>
              <select
                className="input select"
                style={{ width: 'auto', fontWeight: 600 }}
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="ALL">📊 All Categories (Full Financial Statement)</option>
                <option value="SALES">💵 Sales Revenue Entries</option>
                <option value="MATERIAL_EXPENSES">🥛 Material Expenses (COGS)</option>
                <option value="SHOP_EXPENSES">🏬 Shop Expenses (Rent, Electricity, Salary, Loans)</option>
                <option value="MISC_EXPENSES">📦 Miscellaneous Expenses</option>
                <option value="WITHDRAWALS">🏧 Owner Drawings & Withdrawals</option>
              </select>
            </div>

            <div className="input-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
              <label className="input-label" style={{ marginBottom: 0, fontWeight: 600 }}>Select Month:</label>
              <input
                type="month"
                className="input"
                style={{ width: 'auto' }}
                onChange={(e) => handleMonthChange(e.target.value, 'cycle15')}
              />
            </div>

            <div className="input-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
              <label className="input-label" style={{ marginBottom: 0 }}>From:</label>
              <input
                type="date"
                className="input"
                style={{ width: 'auto' }}
                value={dateRange.from}
                onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
              />
            </div>

            <div className="input-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
              <label className="input-label" style={{ marginBottom: 0 }}>To:</label>
              <input
                type="date"
                className="input"
                style={{ width: 'auto' }}
                value={dateRange.to}
                onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
              />
            </div>

            <button className="btn btn-primary" onClick={() => refetch()}>Filter Report</button>
          </div>
        </div>
      </div>

      {/* Report Content */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}><span className="spinner" /></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Executive Summary Cards */}
          <div className="grid-5">
            <div className="card">
              <div style={{ fontSize: '0.75rem', color: 'var(--color-neutral-muted)' }}>Total Sales</div>
              <div className="money" style={{ fontSize: '1.25rem' }}>{formatCurrency(summary?.totalSales || '0')}</div>
            </div>
            <div className="card">
              <div style={{ fontSize: '0.75rem', color: 'var(--color-neutral-muted)' }}>Material Costs</div>
              <div className="money" style={{ fontSize: '1.25rem' }}>{formatCurrency(summary?.totalMaterialExpenses || '0')}</div>
            </div>
            <div className="card">
              <div style={{ fontSize: '0.75rem', color: 'var(--color-neutral-muted)' }}>Gross Profit</div>
              <div className="money" style={{ fontSize: '1.25rem', color: 'var(--color-gross-profit)' }}>{formatCurrency(summary?.grossProfit || '0')}</div>
            </div>
            <div className="card">
              <div style={{ fontSize: '0.75rem', color: 'var(--color-neutral-muted)' }}>Shop + Misc Exp</div>
              <div className="money" style={{ fontSize: '1.25rem' }}>{formatCurrency(parseFloat(summary?.totalShopExpenses || '0') + parseFloat(summary?.totalMiscExpenses || '0'))}</div>
            </div>
            <div className="card">
              <div style={{ fontSize: '0.75rem', color: 'var(--color-neutral-muted)' }}>Net Profit</div>
              <div className="money" style={{ fontSize: '1.25rem', color: parseFloat(summary?.netProfit || '0') >= 0 ? 'var(--color-net-profit-pos)' : 'var(--color-net-profit-neg)' }}>
                {formatCurrency(summary?.netProfit || '0')}
              </div>
            </div>
          </div>

          {/* 1. Sales Breakdown Table */}
          {showSales && (
            <div className="card">
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>💵 Sales Revenue Log ({records.sales.length})</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--color-primary)' }}>Total: {formatCurrency(records.sales.reduce((sum: number, s: any) => sum + parseFloat(s.amount), 0))}</span>
              </h3>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Method</th>
                      <th>Note</th>
                      <th data-type="money">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.sales.length === 0 ? (
                      <tr><td colSpan={5} className="text-center text-muted">No sales entries in selected period</td></tr>
                    ) : (
                      records.sales.map((s: any) => (
                        <tr key={s.id}>
                          <td>{formatDate(s.saleDate)}</td>
                          <td><span className={`badge ${s.type === 'CASH' ? 'badge--cash' : 'badge--online'}`}>{s.type}</span></td>
                          <td>{s.paymentMethod || 'Cash'}</td>
                          <td>{s.note || '—'}</td>
                          <td data-type="money">{formatCurrency(s.amount)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 2. Material Expenses Table */}
          {showMaterial && (
            <div className="card">
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>🥛 Raw Material Expenses ({records.materialExpenses.length})</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--color-primary)' }}>Total: {formatCurrency(records.materialExpenses.reduce((sum: number, e: any) => sum + parseFloat(e.amount), 0))}</span>
              </h3>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Category</th>
                      <th>Mode</th>
                      <th>Note / Item</th>
                      <th data-type="money">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.materialExpenses.length === 0 ? (
                      <tr><td colSpan={5} className="text-center text-muted">No material expense entries in selected period</td></tr>
                    ) : (
                      records.materialExpenses.map((e: any) => (
                        <tr key={e.id}>
                          <td>{formatDate(e.expDate)}</td>
                          <td><strong>{e.category}</strong></td>
                          <td><span className={`badge ${e.mode === 'CASH' ? 'badge--cash' : 'badge--online'}`}>{e.mode}</span></td>
                          <td>{e.note || '—'}</td>
                          <td data-type="money">{formatCurrency(e.amount)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 3. Shop Expenses Table */}
          {showShop && (
            <div className="card">
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>🏬 Shop Operational Expenses ({records.shopExpenses.length})</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--color-primary)' }}>Total: {formatCurrency(records.shopExpenses.reduce((sum: number, e: any) => sum + parseFloat(e.amount), 0))}</span>
              </h3>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Category</th>
                      <th>Mode</th>
                      <th>Recurring</th>
                      <th>Note / Payee</th>
                      <th data-type="money">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.shopExpenses.length === 0 ? (
                      <tr><td colSpan={6} className="text-center text-muted">No shop expense entries in selected period</td></tr>
                    ) : (
                      records.shopExpenses.map((e: any) => (
                        <tr key={e.id}>
                          <td>{formatDate(e.expDate)}</td>
                          <td><strong>{e.category}</strong></td>
                          <td><span className={`badge ${e.mode === 'CASH' ? 'badge--cash' : 'badge--online'}`}>{e.mode}</span></td>
                          <td>{e.isRecurring ? '🔄 Yes' : 'No'}</td>
                          <td>{e.note || '—'}</td>
                          <td data-type="money">{formatCurrency(e.amount)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 4. Misc Expenses Table */}
          {showMisc && (
            <div className="card">
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>📦 Miscellaneous Expenses ({records.miscExpenses.length})</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--color-primary)' }}>Total: {formatCurrency(records.miscExpenses.reduce((sum: number, e: any) => sum + parseFloat(e.amount), 0))}</span>
              </h3>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Expense Name</th>
                      <th>Mode</th>
                      <th>Note</th>
                      <th data-type="money">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.miscExpenses.length === 0 ? (
                      <tr><td colSpan={5} className="text-center text-muted">No misc expense entries in selected period</td></tr>
                    ) : (
                      records.miscExpenses.map((e: any) => (
                        <tr key={e.id}>
                          <td>{formatDate(e.expDate)}</td>
                          <td><strong>{e.name}</strong></td>
                          <td><span className={`badge ${e.mode === 'CASH' ? 'badge--cash' : 'badge--online'}`}>{e.mode}</span></td>
                          <td>{e.note || '—'}</td>
                          <td data-type="money">{formatCurrency(e.amount)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 5. Owner Withdrawals Table */}
          {showWithdrawals && (
            <div className="card">
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>🏧 Owner Cash & Online Drawings ({records.withdrawals.length})</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--color-primary)' }}>Total: {formatCurrency(records.withdrawals.reduce((sum: number, w: any) => sum + parseFloat(w.amount), 0))}</span>
              </h3>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Mode</th>
                      <th>Note / Reason</th>
                      <th data-type="money">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.withdrawals.length === 0 ? (
                      <tr><td colSpan={4} className="text-center text-muted">No withdrawal entries in selected period</td></tr>
                    ) : (
                      records.withdrawals.map((w: any) => (
                        <tr key={w.id}>
                          <td>{formatDate(w.wDate)}</td>
                          <td><span className={`badge ${w.mode === 'CASH' ? 'badge--cash' : 'badge--online'}`}>{w.mode}</span></td>
                          <td>{w.note || '—'}</td>
                          <td data-type="money">{formatCurrency(w.amount)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Reports;
