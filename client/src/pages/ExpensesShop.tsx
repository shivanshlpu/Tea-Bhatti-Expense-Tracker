import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { expenseApi } from '../api/client';
import { formatCurrency, formatDate } from '../lib/financeFormatters';
import { useShopStore } from '../stores/useShopStore';

const SHOP_CATEGORIES = ['Rent', 'Electricity', 'Internet', 'Salary', 'Maintenance', 'Loan Repayment', 'Misc'];

function ExpensesShop() {
  const queryClient = useQueryClient();
  const addToast = useShopStore((s) => s.addToast);

  const todayStr = new Date().toISOString().slice(0, 10);

  const [form, setForm] = useState({
    category: 'Rent',
    amount: '',
    mode: 'ONLINE' as 'CASH' | 'ONLINE',
    note: '',
    expDate: todayStr,
    isRecurring: false,
  });

  // Filter & Sort State (default to 'all' so all entries show by default)
  const [filterMode, setFilterMode] = useState<'today' | 'date' | 'range' | 'all'>('all');
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [dateRange, setDateRange] = useState({ from: todayStr, to: todayStr });
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [sortField, setSortField] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [voidModal, setVoidModal] = useState<{ open: boolean; expenseId: string; reason: string }>({
    open: false,
    expenseId: '',
    reason: '',
  });

  const queryParams = (() => {
    const params: { from?: string; to?: string; category?: string } = {};
    if (filterMode === 'today') {
      params.from = todayStr;
      params.to = todayStr;
    } else if (filterMode === 'date') {
      params.from = selectedDate;
      params.to = selectedDate;
    } else if (filterMode === 'range') {
      params.from = dateRange.from;
      params.to = dateRange.to;
    }
    if (categoryFilter !== 'ALL') {
      params.category = categoryFilter;
    }
    return params;
  })();

  const { data: expensesData, isLoading } = useQuery({
    queryKey: ['shopExpenses', queryParams.from, queryParams.to, queryParams.category],
    queryFn: () => expenseApi.shop.list(queryParams),
  });

  const createMutation = useMutation({
    mutationFn: (newExp: any) => expenseApi.shop.create(newExp),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopExpenses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      addToast('success', 'Shop expense recorded');
      setForm({
        category: 'Rent',
        amount: '',
        mode: 'ONLINE',
        note: '',
        expDate: todayStr,
        isRecurring: false,
      });
    },
    onError: (err: any) => {
      addToast('error', err.message || 'Failed to record expense');
    },
  });

  const voidMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      expenseApi.shop.void(id, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopExpenses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      addToast('success', 'Expense voided');
      setVoidModal({ open: false, expenseId: '', reason: '' });
    },
    onError: (err: any) => {
      addToast('error', err.message || 'Failed to void expense');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.amount || parseFloat(form.amount) <= 0) {
      addToast('warning', 'Please enter a valid amount');
      return;
    }

    const dateObj = new Date(form.expDate);
    const now = new Date();
    if (form.expDate === todayStr) {
      dateObj.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
    }

    createMutation.mutate({
      category: form.category,
      amount: parseFloat(form.amount),
      mode: form.mode,
      note: form.note || undefined,
      expDate: dateObj.toISOString(),
      isRecurring: form.isRecurring,
    });
  };

  const rawList = expensesData?.data || [];

  const sortedList = [...rawList].sort((a: any, b: any) => {
    if (sortField === 'date') {
      const timeA = new Date(a.expDate).getTime();
      const timeB = new Date(b.expDate).getTime();
      if (timeA !== timeB) {
        return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
      }
      const createA = new Date(a.createdAt).getTime();
      const createB = new Date(b.createdAt).getTime();
      return sortOrder === 'desc' ? createB - createA : createA - createB;
    } else {
      const amtA = parseFloat(a.amount);
      const amtB = parseFloat(b.amount);
      return sortOrder === 'desc' ? amtB - amtA : amtA - amtB;
    }
  });

  const toggleSort = (field: 'date' | 'amount') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const filteredTotal = sortedList
    .filter((item: any) => !item.voidedAt)
    .reduce((sum: number, item: any) => sum + parseFloat(item.amount), 0);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Shop Expenses</h1>
          <p className="page-subtitle">Rent, Electricity, Internet, Salary & Maintenance</p>
        </div>
      </div>

      <div className="page-split-layout">
        <div className="card" style={{ height: 'fit-content' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Record Shop Expense</h3>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="input-group">
              <label className="input-label">Category</label>
              <select
                className="input select"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                {SHOP_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="input-group">
              <label className="input-label">Payment Mode</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  className={`btn ${form.mode === 'CASH' ? 'btn-primary' : 'btn-secondary'} w-full`}
                  onClick={() => setForm({ ...form, mode: 'CASH' })}
                >
                  💵 Cash
                </button>
                <button
                  type="button"
                  className={`btn ${form.mode === 'ONLINE' ? 'btn-primary' : 'btn-secondary'} w-full`}
                  style={form.mode === 'ONLINE' ? { background: 'var(--color-online)' } : {}}
                  onClick={() => setForm({ ...form, mode: 'ONLINE' })}
                >
                  💳 Online
                </button>
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Amount (₹)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                className="input money"
                placeholder="0.00"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                required
              />
            </div>

            <div className="input-group">
              <label className="input-label">Expense Date</label>
              <input
                type="date"
                className="input"
                value={form.expDate}
                onChange={(e) => setForm({ ...form, expDate: e.target.value })}
                required
              />
            </div>

            <div className="input-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="checkbox"
                id="isRecurring"
                checked={form.isRecurring}
                onChange={(e) => setForm({ ...form, isRecurring: e.target.checked })}
              />
              <label htmlFor="isRecurring" style={{ fontSize: '0.875rem', cursor: 'pointer' }}>
                Monthly recurring expense
              </label>
            </div>

            <div className="input-group">
              <label className="input-label">Note (Optional)</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. July Rent paid to Landlord"
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
              />
            </div>

            <button type="submit" className="btn btn-primary btn-lg w-full" disabled={createMutation.isPending}>
              {createMutation.isPending ? <span className="spinner" /> : 'Save Shop Expense'}
            </button>
          </form>
        </div>

        <div className="card">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Shop Expense Log</h3>
              <div style={{ fontSize: '0.85rem', background: 'var(--color-bg-secondary)', padding: '0.35rem 0.75rem', borderRadius: '1rem', fontWeight: 600, color: 'var(--color-primary)' }}>
                Total: {formatCurrency(filteredTotal)} ({sortedList.length} entries)
              </div>
            </div>

            {/* Filter Toolbar */}
            <div style={{ background: 'var(--color-bg-secondary)', padding: '0.75rem', borderRadius: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Filter Date:</span>
                <button
                  type="button"
                  className={`btn btn-sm ${filterMode === 'today' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setFilterMode('today')}
                >
                  ⚡ Today Only
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${filterMode === 'date' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setFilterMode('date')}
                >
                  📅 By Specific Date
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${filterMode === 'range' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setFilterMode('range')}
                >
                  🗓️ Date Range
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${filterMode === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setFilterMode('all')}
                >
                  ♾️ All History
                </button>
              </div>

              {/* Conditional Inputs */}
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                {filterMode === 'date' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.8rem' }}>Date:</span>
                    <input
                      type="date"
                      className="input"
                      style={{ width: 'auto', padding: '0.25rem 0.5rem', fontSize: '0.85rem' }}
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                    />
                  </div>
                )}

                {filterMode === 'range' && (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.8rem' }}>From:</span>
                      <input
                        type="date"
                        className="input"
                        style={{ width: 'auto', padding: '0.25rem 0.5rem', fontSize: '0.85rem' }}
                        value={dateRange.from}
                        onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.8rem' }}>To:</span>
                      <input
                        type="date"
                        className="input"
                        style={{ width: 'auto', padding: '0.25rem 0.5rem', fontSize: '0.85rem' }}
                        value={dateRange.to}
                        onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                      />
                    </div>
                  </>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }}>
                  <span style={{ fontSize: '0.8rem' }}>Category:</span>
                  <select
                    className="input select"
                    style={{ width: 'auto', padding: '0.25rem 0.5rem', fontSize: '0.85rem' }}
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                  >
                    <option value="ALL">All Categories</option>
                    {SHOP_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}><span className="spinner" /></div>
          ) : sortedList.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">🏪</div>
              <div className="empty-state__title">No shop expenses for selected filter</div>
              <div className="empty-state__text">Change date filter or log a new operational expense.</div>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th
                      onClick={() => toggleSort('date')}
                      style={{ cursor: 'pointer', userSelect: 'none' }}
                      title="Click to sort by date"
                    >
                      Date {sortField === 'date' ? (sortOrder === 'desc' ? '🔽' : '🔼') : '↕️'}
                    </th>
                    <th>Category</th>
                    <th>Mode</th>
                    <th>Note</th>
                    <th
                      data-type="money"
                      onClick={() => toggleSort('amount')}
                      style={{ cursor: 'pointer', userSelect: 'none' }}
                      title="Click to sort by amount"
                    >
                      Amount {sortField === 'amount' ? (sortOrder === 'desc' ? '🔽' : '🔼') : '↕️'}
                    </th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedList.map((item: any) => (
                    <tr key={item.id} style={item.voidedAt ? { opacity: 0.5, background: 'var(--color-bg-secondary)' } : {}}>
                      <td>{formatDate(item.expDate)}</td>
                      <td style={{ fontWeight: 600 }}>
                        {item.category}
                        {item.isRecurring && <span className="badge" style={{ marginLeft: '0.5rem', background: 'var(--color-bg-secondary)' }}>Recurring</span>}
                      </td>
                      <td>
                        <span className={`badge ${item.mode === 'CASH' ? 'badge--cash' : 'badge--online'}`}>
                          {item.mode}
                        </span>
                      </td>
                      <td>
                        {item.note || '—'}
                        {item.voidedAt && <div style={{ fontSize: '0.75rem', color: 'var(--color-danger)' }}>Voided: {item.voidReason}</div>}
                      </td>
                      <td data-type="money" style={{ textDecoration: item.voidedAt ? 'line-through' : 'none' }}>
                        {formatCurrency(item.amount)}
                      </td>
                      <td>
                        {!item.voidedAt ? (
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ color: 'var(--color-danger)' }}
                            onClick={() => setVoidModal({ open: true, expenseId: item.id, reason: '' })}
                          >
                            Void
                          </button>
                        ) : (
                          <span className="badge badge--voided">Voided</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {voidModal.open && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal__header">
              <h3 className="modal__title">Void Shop Expense</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setVoidModal({ open: false, expenseId: '', reason: '' })}>✕</button>
            </div>
            <div className="modal__body">
              <div className="input-group">
                <label className="input-label">Reason for Voiding</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Reason..."
                  value={voidModal.reason}
                  onChange={(e) => setVoidModal({ ...voidModal, reason: e.target.value })}
                />
              </div>
            </div>
            <div className="modal__footer">
              <button className="btn btn-secondary" onClick={() => setVoidModal({ open: false, expenseId: '', reason: '' })}>Cancel</button>
              <button
                className="btn btn-danger"
                disabled={!voidModal.reason || voidMutation.isPending}
                onClick={() => voidMutation.mutate({ id: voidModal.expenseId, reason: voidModal.reason })}
              >
                Confirm Void
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ExpensesShop;
