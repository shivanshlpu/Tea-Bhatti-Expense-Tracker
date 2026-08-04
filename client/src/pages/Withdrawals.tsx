import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { withdrawalApi } from '../api/client';
import { formatCurrency, formatDate } from '../lib/financeFormatters';
import { useShopStore } from '../stores/useShopStore';

function Withdrawals() {
  const queryClient = useQueryClient();
  const addToast = useShopStore((s) => s.addToast);

  const todayStr = new Date().toISOString().slice(0, 10);

  const [form, setForm] = useState({
    amount: '',
    mode: 'CASH' as 'CASH' | 'ONLINE',
    note: '',
    wDate: todayStr,
  });

  const [filterMode, setFilterMode] = useState<'today' | 'date' | 'range' | 'all'>('all');
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [dateRange, setDateRange] = useState({ from: todayStr, to: todayStr });
  const [sortField, setSortField] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Edit Modal State
  const [editModal, setEditModal] = useState<{
    open: boolean;
    id: string;
    amount: string;
    mode: 'CASH' | 'ONLINE';
    note: string;
    wDate: string;
  }>({
    open: false,
    id: '',
    amount: '',
    mode: 'CASH',
    note: '',
    wDate: todayStr,
  });

  // Delete Modal State
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; id: string }>({
    open: false,
    id: '',
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

  const { data: withdrawalsData, isLoading } = useQuery({
    queryKey: ['withdrawals', queryParams.from, queryParams.to],
    queryFn: () => withdrawalApi.list(queryParams),
  });

  const createMutation = useMutation({
    mutationFn: (newW: any) => withdrawalApi.create(newW),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['withdrawals'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      addToast('success', 'Withdrawal recorded');
      setForm({
        amount: '',
        mode: 'CASH',
        note: '',
        wDate: todayStr,
      });
    },
    onError: (err: any) => {
      addToast('error', err.message || 'Failed to record withdrawal');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => withdrawalApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['withdrawals'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      addToast('success', 'Withdrawal updated');
      setEditModal({ ...editModal, open: false });
    },
    onError: (err: any) => {
      addToast('error', err.message || 'Failed to update withdrawal');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => withdrawalApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['withdrawals'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      addToast('success', 'Withdrawal deleted');
      setDeleteModal({ open: false, id: '' });
    },
    onError: (err: any) => {
      addToast('error', err.message || 'Failed to delete withdrawal');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.amount || parseFloat(form.amount) <= 0) {
      addToast('warning', 'Please enter a valid amount');
      return;
    }

    const dateObj = new Date(form.wDate);
    const now = new Date();
    if (form.wDate === todayStr) {
      dateObj.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
    }

    createMutation.mutate({
      amount: parseFloat(form.amount),
      mode: form.mode,
      note: form.note || undefined,
      wDate: dateObj.toISOString(),
    });
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModal.amount || parseFloat(editModal.amount) <= 0) {
      addToast('warning', 'Please enter a valid amount');
      return;
    }

    updateMutation.mutate({
      id: editModal.id,
      data: {
        amount: parseFloat(editModal.amount),
        mode: editModal.mode,
        note: editModal.note || null,
        wDate: new Date(editModal.wDate).toISOString(),
      },
    });
  };

  const rawList = withdrawalsData?.data || [];

  const sortedList = [...rawList].sort((a: any, b: any) => {
    if (sortField === 'date') {
      const timeA = new Date(a.wDate).getTime();
      const timeB = new Date(b.wDate).getTime();
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
          <h1 className="page-title">Owner Withdrawals</h1>
          <p className="page-subtitle">Track personal cash/bank drawings from shop earnings</p>
        </div>
      </div>

      <div className="page-split-layout">
        <div className="card" style={{ height: 'fit-content' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Record Owner Withdrawal</h3>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="input-group">
              <label className="input-label">Withdrawal Mode</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  className={`btn ${form.mode === 'CASH' ? 'btn-primary' : 'btn-secondary'} w-full`}
                  onClick={() => setForm({ ...form, mode: 'CASH' })}
                >
                  💵 Cash Drawer
                </button>
                <button
                  type="button"
                  className={`btn ${form.mode === 'ONLINE' ? 'btn-primary' : 'btn-secondary'} w-full`}
                  style={form.mode === 'ONLINE' ? { background: 'var(--color-online)' } : {}}
                  onClick={() => setForm({ ...form, mode: 'ONLINE' })}
                >
                  💳 Bank Account
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
              <label className="input-label">Withdrawal Date</label>
              <input
                type="date"
                className="input"
                value={form.wDate}
                onChange={(e) => setForm({ ...form, wDate: e.target.value })}
                required
              />
            </div>

            <div className="input-group">
              <label className="input-label">Note / Purpose (Optional)</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. Personal expenses"
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
              />
            </div>

            <button type="submit" className="btn btn-primary btn-lg w-full" disabled={createMutation.isPending}>
              {createMutation.isPending ? <span className="spinner" /> : 'Save Withdrawal Entry'}
            </button>
          </form>
        </div>

        <div className="card">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Withdrawal Log</h3>
              <div style={{ fontSize: '0.85rem', background: 'var(--color-bg-secondary)', padding: '0.35rem 0.75rem', borderRadius: '1rem', fontWeight: 600, color: 'var(--color-primary)' }}>
                Total: {formatCurrency(filteredTotal)} ({sortedList.length} entries)
              </div>
            </div>

            {/* Filter Toolbar */}
            <div style={{ background: 'var(--color-bg-secondary)', padding: '0.75rem', borderRadius: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Filter Date:</span>
                <button type="button" className={`btn btn-sm ${filterMode === 'today' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilterMode('today')}>⚡ Today Only</button>
                <button type="button" className={`btn btn-sm ${filterMode === 'date' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilterMode('date')}>📅 By Specific Date</button>
                <button type="button" className={`btn btn-sm ${filterMode === 'range' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilterMode('range')}>🗓️ Date Range</button>
                <button type="button" className={`btn btn-sm ${filterMode === 'all' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilterMode('all')}>♾️ All History</button>
              </div>

              {filterMode === 'date' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.8rem' }}>Date:</span>
                  <input type="date" className="input" style={{ width: 'auto', padding: '0.25rem 0.5rem', fontSize: '0.85rem' }} value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
                </div>
              )}

              {filterMode === 'range' && (
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.8rem' }}>From:</span>
                    <input type="date" className="input" style={{ width: 'auto', padding: '0.25rem 0.5rem', fontSize: '0.85rem' }} value={dateRange.from} onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.8rem' }}>To:</span>
                    <input type="date" className="input" style={{ width: 'auto', padding: '0.25rem 0.5rem', fontSize: '0.85rem' }} value={dateRange.to} onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}><span className="spinner" /></div>
          ) : sortedList.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">🏧</div>
              <div className="empty-state__title">No withdrawals for selected filter</div>
              <div className="empty-state__text">Change date filter or log a new withdrawal entry.</div>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th onClick={() => toggleSort('date')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                      Date {sortField === 'date' ? (sortOrder === 'desc' ? '🔽' : '🔼') : '↕️'}
                    </th>
                    <th>Mode</th>
                    <th>Note</th>
                    <th data-type="money" onClick={() => toggleSort('amount')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                      Amount {sortField === 'amount' ? (sortOrder === 'desc' ? '🔽' : '🔼') : '↕️'}
                    </th>
                    <th style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedList.map((item: any) => (
                    <tr key={item.id}>
                      <td>{formatDate(item.wDate)}</td>
                      <td>
                        <span className={`badge ${item.mode === 'CASH' ? 'badge--cash' : 'badge--online'}`}>
                          {item.mode}
                        </span>
                      </td>
                      <td>{item.note || '—'}</td>
                      <td data-type="money">{formatCurrency(item.amount)}</td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center' }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-xs"
                            title="Edit Entry"
                            onClick={() =>
                              setEditModal({
                                open: true,
                                id: item.id,
                                amount: item.amount.toString(),
                                mode: item.mode,
                                note: item.note || '',
                                wDate: new Date(item.wDate).toISOString().slice(0, 10),
                              })
                            }
                          >
                            ✏️ Edit
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline btn-xs"
                            style={{ color: '#ef4444', borderColor: '#fca5a5' }}
                            title="Delete Entry"
                            onClick={() => setDeleteModal({ open: true, id: item.id })}
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editModal.open && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal__header">
              <h3 className="modal__title">✏️ Edit Withdrawal</h3>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditModal({ ...editModal, open: false })}>✕</button>
            </div>
            <form onSubmit={handleUpdate}>
              <div className="modal__body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="input-group">
                  <label className="input-label">Withdrawal Mode</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button type="button" className={`btn ${editModal.mode === 'CASH' ? 'btn-primary' : 'btn-secondary'} w-full`} onClick={() => setEditModal({ ...editModal, mode: 'CASH' })}>💵 Cash Drawer</button>
                    <button type="button" className={`btn ${editModal.mode === 'ONLINE' ? 'btn-primary' : 'btn-secondary'} w-full`} onClick={() => setEditModal({ ...editModal, mode: 'ONLINE' })}>💳 Bank Account</button>
                  </div>
                </div>

                <div className="input-group">
                  <label className="input-label">Amount (₹)</label>
                  <input type="number" step="0.01" min="0.01" className="input money" value={editModal.amount} onChange={(e) => setEditModal({ ...editModal, amount: e.target.value })} required />
                </div>

                <div className="input-group">
                  <label className="input-label">Withdrawal Date</label>
                  <input type="date" className="input" value={editModal.wDate} onChange={(e) => setEditModal({ ...editModal, wDate: e.target.value })} required />
                </div>

                <div className="input-group">
                  <label className="input-label">Note / Purpose</label>
                  <input type="text" className="input" value={editModal.note} onChange={(e) => setEditModal({ ...editModal, note: e.target.value })} />
                </div>
              </div>
              <div className="modal__footer">
                <button type="button" className="btn btn-secondary" onClick={() => setEditModal({ ...editModal, open: false })}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? <span className="spinner" /> : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.open && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal__header">
              <h3 className="modal__title">🗑️ Delete Withdrawal</h3>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDeleteModal({ open: false, id: '' })}>✕</button>
            </div>
            <div className="modal__body">
              <p style={{ fontSize: '0.9rem' }}>Are you sure you want to delete this withdrawal entry?</p>
            </div>
            <div className="modal__footer">
              <button type="button" className="btn btn-secondary" onClick={() => setDeleteModal({ open: false, id: '' })}>Cancel</button>
              <button type="button" className="btn btn-danger" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate(deleteModal.id)}>
                {deleteMutation.isPending ? <span className="spinner" /> : 'Delete Entry'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Withdrawals;
