import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { expenseApi } from '../api/client';
import { formatCurrency, formatDate } from '../lib/financeFormatters';
import { useShopStore } from '../stores/useShopStore';

function ExpensesMisc() {
  const queryClient = useQueryClient();
  const addToast = useShopStore((s) => s.addToast);

  const todayStr = new Date().toISOString().slice(0, 10);

  const [form, setForm] = useState({
    name: '',
    amount: '',
    mode: 'CASH' as 'CASH' | 'ONLINE',
    note: '',
    expDate: todayStr,
  });

  // Filter & Sort State (default to 'all' so all entries show by default)
  const [filterMode, setFilterMode] = useState<'today' | 'date' | 'range' | 'all'>('all');
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [dateRange, setDateRange] = useState({ from: todayStr, to: todayStr });
  const [sortField, setSortField] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [voidModal, setVoidModal] = useState<{ open: boolean; expenseId: string; reason: string }>({
    open: false,
    expenseId: '',
    reason: '',
  });

  const queryParams = (() => {
    const params: { from?: string; to?: string } = {};
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
    return params;
  })();

  const { data: expensesData, isLoading } = useQuery({
    queryKey: ['miscExpenses', queryParams.from, queryParams.to],
    queryFn: () => expenseApi.misc.list(queryParams),
  });

  const createMutation = useMutation({
    mutationFn: (newExp: any) => expenseApi.misc.create(newExp),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['miscExpenses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      addToast('success', 'Misc expense recorded');
      setForm({
        name: '',
        amount: '',
        mode: 'CASH',
        note: '',
        expDate: todayStr,
      });
    },
    onError: (err: any) => {
      addToast('error', err.message || 'Failed to record expense');
    },
  });

  const voidMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      expenseApi.misc.void(id, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['miscExpenses'] });
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
    if (!form.name.trim()) {
      addToast('warning', 'Please enter a name');
      return;
    }
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
      name: form.name,
      amount: parseFloat(form.amount),
      mode: form.mode,
      note: form.note || undefined,
      expDate: dateObj.toISOString(),
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
          <h1 className="page-title">Miscellaneous Expenses</h1>
          <p className="page-subtitle">One-off or unexpected petty expenses</p>
        </div>
      </div>

      <div className="page-split-layout">
        <div className="card" style={{ height: 'fit-content' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Record Misc Expense</h3>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="input-group">
              <label className="input-label">Expense Name / Item</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. Tea for guests, Bulb repair"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
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

            <div className="input-group">
              <label className="input-label">Note (Optional)</label>
              <input
                type="text"
                className="input"
                placeholder="Additional notes"
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
              />
            </div>

            <button type="submit" className="btn btn-primary btn-lg w-full" disabled={createMutation.isPending}>
              {createMutation.isPending ? <span className="spinner" /> : 'Save Misc Expense'}
            </button>
          </form>
        </div>

        <div className="card">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Misc Expense Log</h3>
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

              {/* Conditional Date Inputs */}
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
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
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
                </div>
              )}
            </div>
          </div>

          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}><span className="spinner" /></div>
          ) : sortedList.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">📦</div>
              <div className="empty-state__title">No misc expenses for selected filter</div>
              <div className="empty-state__text">Change date filter or log a new petty expense.</div>
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
                    <th>Name</th>
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
                      <td style={{ fontWeight: 600 }}>{item.name}</td>
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
              <h3 className="modal__title">Void Misc Expense</h3>
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

export default ExpensesMisc;
