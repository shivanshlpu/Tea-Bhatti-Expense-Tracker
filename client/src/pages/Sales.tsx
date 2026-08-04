import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { salesApi } from '../api/client';
import { formatCurrency, formatDate } from '../lib/financeFormatters';
import { useShopStore } from '../stores/useShopStore';

function Sales() {
  const queryClient = useQueryClient();
  const addToast = useShopStore((s) => s.addToast);

  const todayStr = new Date().toISOString().slice(0, 10);

  // Form state
  const [form, setForm] = useState({
    type: 'CASH' as 'CASH' | 'ONLINE',
    amount: '',
    paymentMethod: '',
    note: '',
    saleDate: todayStr,
  });

  // Filter & Sort state
  const [filterMode, setFilterMode] = useState<'today' | 'date' | 'range' | 'all'>('all');
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [dateRange, setDateRange] = useState({ from: todayStr, to: todayStr });
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'CASH' | 'ONLINE'>('ALL');
  const [sortField, setSortField] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Edit Modal State
  const [editModal, setEditModal] = useState<{
    open: boolean;
    id: string;
    type: 'CASH' | 'ONLINE';
    amount: string;
    paymentMethod: string;
    note: string;
    saleDate: string;
  }>({
    open: false,
    id: '',
    type: 'CASH',
    amount: '',
    paymentMethod: '',
    note: '',
    saleDate: todayStr,
  });

  // Delete Modal State
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; saleId: string }>({
    open: false,
    saleId: '',
  });

  const queryParams = (() => {
    const params: { from?: string; to?: string; type?: 'CASH' | 'ONLINE' } = {};
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
    if (typeFilter !== 'ALL') {
      params.type = typeFilter;
    }
    return params;
  })();

  const { data: salesData, isLoading } = useQuery({
    queryKey: ['sales', queryParams.from, queryParams.to, queryParams.type],
    queryFn: () => salesApi.list(queryParams),
  });

  const createMutation = useMutation({
    mutationFn: (newSale: any) => salesApi.create(newSale),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      addToast('success', 'Sale recorded successfully');
      setForm({
        type: 'CASH',
        amount: '',
        paymentMethod: '',
        note: '',
        saleDate: todayStr,
      });
    },
    onError: (err: any) => {
      addToast('error', err.message || 'Failed to record sale');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => salesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      addToast('success', 'Sale entry updated successfully');
      setEditModal({ ...editModal, open: false });
    },
    onError: (err: any) => {
      addToast('error', err.message || 'Failed to update sale entry');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => salesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      addToast('success', 'Sale entry deleted');
      setDeleteModal({ open: false, saleId: '' });
    },
    onError: (err: any) => {
      addToast('error', err.message || 'Failed to delete sale entry');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.amount || parseFloat(form.amount) <= 0) {
      addToast('warning', 'Please enter a valid amount');
      return;
    }

    const dateObj = new Date(form.saleDate);
    const now = new Date();
    if (form.saleDate === todayStr) {
      dateObj.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
    }

    createMutation.mutate({
      type: form.type,
      amount: parseFloat(form.amount),
      paymentMethod: form.type === 'ONLINE' ? form.paymentMethod || 'UPI' : undefined,
      note: form.note || undefined,
      saleDate: dateObj.toISOString(),
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
        type: editModal.type,
        amount: parseFloat(editModal.amount),
        paymentMethod: editModal.type === 'ONLINE' ? editModal.paymentMethod || 'UPI' : null,
        note: editModal.note || null,
        saleDate: new Date(editModal.saleDate).toISOString(),
      },
    });
  };

  const rawSales = salesData?.data || [];

  const sortedSales = [...rawSales].sort((a: any, b: any) => {
    if (sortField === 'date') {
      const timeA = new Date(a.saleDate).getTime();
      const timeB = new Date(b.saleDate).getTime();
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

  const totalDeposited = sortedSales
    .filter((s: any) => !s.voidedAt)
    .reduce((sum: number, s: any) => sum + parseFloat(s.amount), 0);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Sales Management</h1>
          <p className="page-subtitle">Log & track daily cash & online sales deposits</p>
        </div>
      </div>

      <div className="page-split-layout">
        {/* Entry Form */}
        <div className="card" style={{ height: 'fit-content' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Record New Deposit / Sale</h3>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="input-group">
              <label className="input-label">Sale Type</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  className={`btn ${form.type === 'CASH' ? 'btn-primary' : 'btn-secondary'} w-full`}
                  onClick={() => setForm({ ...form, type: 'CASH' })}
                >
                  💵 Cash
                </button>
                <button
                  type="button"
                  className={`btn ${form.type === 'ONLINE' ? 'btn-primary' : 'btn-secondary'} w-full`}
                  style={form.type === 'ONLINE' ? { background: 'var(--color-online)' } : {}}
                  onClick={() => setForm({ ...form, type: 'ONLINE' })}
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

            {form.type === 'ONLINE' && (
              <div className="input-group">
                <label className="input-label">Payment Method</label>
                <select
                  className="input select"
                  value={form.paymentMethod}
                  onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                >
                  <option value="UPI">UPI (Google Pay / PhonePe / Paytm)</option>
                  <option value="Bank Transfer">Bank Transfer / NEFT</option>
                  <option value="Card">Credit / Debit Card</option>
                </select>
              </div>
            )}

            <div className="input-group">
              <label className="input-label">Sale Date</label>
              <input
                type="date"
                className="input"
                value={form.saleDate}
                onChange={(e) => setForm({ ...form, saleDate: e.target.value })}
                required
              />
            </div>

            <div className="input-group">
              <label className="input-label">Note / Reference (Optional)</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. Table 4 bill, Order #102"
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
              />
            </div>

            <button type="submit" className="btn btn-primary btn-lg w-full" disabled={createMutation.isPending}>
              {createMutation.isPending ? <span className="spinner" /> : 'Save Sale Entry'}
            </button>
          </form>
        </div>

        {/* History Table */}
        <div className="card">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Sales Deposit Entries</h3>
              <div style={{ fontSize: '0.85rem', background: 'var(--color-bg-secondary)', padding: '0.35rem 0.75rem', borderRadius: '1rem', fontWeight: 600, color: 'var(--color-primary)' }}>
                Total: {formatCurrency(totalDeposited)} ({sortedSales.length} entries)
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

              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                {filterMode === 'date' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.8rem' }}>Date:</span>
                    <input type="date" className="input" style={{ width: 'auto', padding: '0.25rem 0.5rem', fontSize: '0.85rem' }} value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
                  </div>
                )}

                {filterMode === 'range' && (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.8rem' }}>From:</span>
                      <input type="date" className="input" style={{ width: 'auto', padding: '0.25rem 0.5rem', fontSize: '0.85rem' }} value={dateRange.from} onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.8rem' }}>To:</span>
                      <input type="date" className="input" style={{ width: 'auto', padding: '0.25rem 0.5rem', fontSize: '0.85rem' }} value={dateRange.to} onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })} />
                    </div>
                  </>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }}>
                  <span style={{ fontSize: '0.8rem' }}>Type:</span>
                  <select className="input select" style={{ width: 'auto', padding: '0.25rem 0.5rem', fontSize: '0.85rem' }} value={typeFilter} onChange={(e: any) => setTypeFilter(e.target.value)}>
                    <option value="ALL">All Modes (Cash & Online)</option>
                    <option value="CASH">💵 Cash Only</option>
                    <option value="ONLINE">💳 Online Only</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}><span className="spinner" /></div>
          ) : sortedSales.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">💰</div>
              <div className="empty-state__title">No sales deposits for selected filter</div>
              <div className="empty-state__text">Change your date filter or record a new sale entry.</div>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th onClick={() => toggleSort('date')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                      Date {sortField === 'date' ? (sortOrder === 'desc' ? '🔽' : '🔼') : '↕️'}
                    </th>
                    <th>Type</th>
                    <th>Method/Note</th>
                    <th data-type="money" onClick={() => toggleSort('amount')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                      Amount {sortField === 'amount' ? (sortOrder === 'desc' ? '🔽' : '🔼') : '↕️'}
                    </th>
                    <th style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedSales.map((sale: any) => (
                    <tr key={sale.id}>
                      <td>{formatDate(sale.saleDate)}</td>
                      <td>
                        <span className={`badge ${sale.type === 'CASH' ? 'badge--cash' : 'badge--online'}`}>
                          {sale.type}
                        </span>
                      </td>
                      <td>
                        <div>{sale.paymentMethod || 'Cash'}</div>
                        {sale.note && <div style={{ fontSize: '0.75rem', color: 'var(--color-neutral-muted)' }}>{sale.note}</div>}
                      </td>
                      <td data-type="money">{formatCurrency(sale.amount)}</td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center' }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-xs"
                            title="Edit Entry"
                            onClick={() =>
                              setEditModal({
                                open: true,
                                id: sale.id,
                                type: sale.type,
                                amount: sale.amount.toString(),
                                paymentMethod: sale.paymentMethod || '',
                                note: sale.note || '',
                                saleDate: new Date(sale.saleDate).toISOString().slice(0, 10),
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
                            onClick={() => setDeleteModal({ open: true, saleId: sale.id })}
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
              <h3 className="modal__title">✏️ Edit Sale Entry</h3>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditModal({ ...editModal, open: false })}>✕</button>
            </div>
            <form onSubmit={handleUpdate}>
              <div className="modal__body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="input-group">
                  <label className="input-label">Sale Type</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button type="button" className={`btn ${editModal.type === 'CASH' ? 'btn-primary' : 'btn-secondary'} w-full`} onClick={() => setEditModal({ ...editModal, type: 'CASH' })}>💵 Cash</button>
                    <button type="button" className={`btn ${editModal.type === 'ONLINE' ? 'btn-primary' : 'btn-secondary'} w-full`} onClick={() => setEditModal({ ...editModal, type: 'ONLINE' })}>💳 Online</button>
                  </div>
                </div>

                <div className="input-group">
                  <label className="input-label">Amount (₹)</label>
                  <input type="number" step="0.01" min="0.01" className="input money" value={editModal.amount} onChange={(e) => setEditModal({ ...editModal, amount: e.target.value })} required />
                </div>

                {editModal.type === 'ONLINE' && (
                  <div className="input-group">
                    <label className="input-label">Payment Method</label>
                    <select className="input select" value={editModal.paymentMethod} onChange={(e) => setEditModal({ ...editModal, paymentMethod: e.target.value })}>
                      <option value="UPI">UPI (Google Pay / PhonePe / Paytm)</option>
                      <option value="Bank Transfer">Bank Transfer / NEFT</option>
                      <option value="Card">Credit / Debit Card</option>
                    </select>
                  </div>
                )}

                <div className="input-group">
                  <label className="input-label">Sale Date</label>
                  <input type="date" className="input" value={editModal.saleDate} onChange={(e) => setEditModal({ ...editModal, saleDate: e.target.value })} required />
                </div>

                <div className="input-group">
                  <label className="input-label">Note / Reference</label>
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
              <h3 className="modal__title">🗑️ Delete Sale Entry</h3>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDeleteModal({ open: false, saleId: '' })}>✕</button>
            </div>
            <div className="modal__body">
              <p style={{ fontSize: '0.9rem' }}>Are you sure you want to delete this sale entry? This will update your balances immediately.</p>
            </div>
            <div className="modal__footer">
              <button type="button" className="btn btn-secondary" onClick={() => setDeleteModal({ open: false, saleId: '' })}>Cancel</button>
              <button type="button" className="btn btn-danger" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate(deleteModal.saleId)}>
                {deleteMutation.isPending ? <span className="spinner" /> : 'Delete Entry'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Sales;
