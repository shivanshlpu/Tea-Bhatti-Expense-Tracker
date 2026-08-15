import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { loansApi } from '../api/client';
import { formatCurrency, formatDate } from '../lib/financeFormatters';
import { useShopStore } from '../stores/useShopStore';

interface Loan {
  id: string;
  date: string;
  type: 'TAKEN' | 'GIVEN';
  personName: string;
  amount: number;
  returnedAmount: number;
  pendingAmount: number;
  status: 'PENDING' | 'CLOSED';
  paymentMode: 'CASH' | 'ONLINE';
  note?: string;
}

function Loans() {
  const queryClient = useQueryClient();
  const addToast = useShopStore((s) => s.addToast);
  const todayStr = new Date().toISOString().slice(0, 10);

  // Form State
  const [form, setForm] = useState({
    type: 'TAKEN' as 'TAKEN' | 'GIVEN',
    personName: '',
    amount: '',
    returnedAmount: '0',
    paymentMode: 'CASH' as 'CASH' | 'ONLINE',
    date: todayStr,
    note: '',
  });

  // Filter State - Default to 'ALL' so newly created entries (pending or closed) are immediately visible!
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'CLOSED'>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'TAKEN' | 'GIVEN'>('ALL');

  // Repayment Modal State
  const [repayModal, setRepayModal] = useState<{ open: boolean; loan: Loan | null; amount: string; repaymentMode: 'CASH' | 'ONLINE' }>({
    open: false,
    loan: null,
    amount: '',
    repaymentMode: 'CASH',
  });

  // Delete Modal State
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; loanId: string }>({
    open: false,
    loanId: '',
  });

  // Fetch loans list
  const { data: loansData, isLoading } = useQuery({
    queryKey: ['loans', statusFilter, typeFilter],
    queryFn: () =>
      loansApi.list({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        type: typeFilter === 'ALL' ? undefined : typeFilter,
      }),
  });

  const loansList: Loan[] = loansData?.data || [];

  // Mutations
  const createMutation = useMutation({
    mutationFn: (newLoan: any) => loansApi.create(newLoan),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      addToast('success', 'Loan record saved successfully');
      setForm({
        type: 'TAKEN',
        personName: '',
        amount: '',
        returnedAmount: '0',
        paymentMode: 'CASH',
        date: todayStr,
        note: '',
      });
    },
    onError: (err: any) => {
      addToast('error', err.message || 'Failed to record loan');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => loansApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      addToast('success', 'Loan repayment recorded successfully');
      setRepayModal({ open: false, loan: null, amount: '', repaymentMode: 'CASH' });
    },
    onError: (err: any) => {
      addToast('error', err.message || 'Failed to update loan repayment');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => loansApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      addToast('success', 'Loan record deleted successfully');
      setDeleteModal({ open: false, loanId: '' });
    },
    onError: (err: any) => {
      addToast('error', err.message || 'Failed to delete loan');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.personName.trim()) {
      addToast('warning', 'Please enter person/party name');
      return;
    }
    const amt = parseFloat(form.amount);
    if (isNaN(amt) || amt <= 0) {
      addToast('warning', 'Please enter a valid positive loan amount');
      return;
    }

    createMutation.mutate({
      type: form.type,
      personName: form.personName.trim(),
      amount: amt,
      returnedAmount: parseFloat(form.returnedAmount || '0'),
      paymentMode: form.paymentMode,
      date: form.date,
      note: form.note.trim() || undefined,
    });
  };

  const handleRepaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!repayModal.loan) return;
    const addAmt = parseFloat(repayModal.amount);
    if (isNaN(addAmt) || addAmt <= 0) {
      addToast('warning', 'Please enter a valid repayment amount');
      return;
    }

    const currentReturned = repayModal.loan.returnedAmount;
    const newReturnedTotal = currentReturned + addAmt;

    updateMutation.mutate({
      id: repayModal.loan.id,
      data: {
        returnedAmount: newReturnedTotal,
        paymentMode: repayModal.repaymentMode,
        repaymentMode: repayModal.repaymentMode,
      },
    });
  };

  // Totals
  const totalPendingTaken = loansList
    .filter((l) => l.type === 'TAKEN' && l.status === 'PENDING')
    .reduce((sum, l) => sum + l.pendingAmount, 0);

  const totalPendingGiven = loansList
    .filter((l) => l.type === 'GIVEN' && l.status === 'PENDING')
    .reduce((sum, l) => sum + l.pendingAmount, 0);

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Loans & Ledger Management</h1>
          <p className="page-subtitle">Log & track borrowed loans (liabilities) and lent loans (assets) with Cash vs Online mode tracking</p>
        </div>
      </div>

      <div className="page-split-layout">
        {/* Entry Form */}
        <div className="card" style={{ height: 'fit-content' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Record New Loan</h3>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="input-group">
              <label className="input-label">Loan Type</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  className={`btn ${form.type === 'TAKEN' ? 'btn-primary' : 'btn-secondary'} w-full`}
                  onClick={() => setForm({ ...form, type: 'TAKEN' })}
                >
                  📥 Loan Taken (Borrowed)
                </button>
                <button
                  type="button"
                  className={`btn ${form.type === 'GIVEN' ? 'btn-primary' : 'btn-secondary'} w-full`}
                  style={form.type === 'GIVEN' ? { background: 'var(--color-online)' } : {}}
                  onClick={() => setForm({ ...form, type: 'GIVEN' })}
                >
                  📤 Loan Given (Lent)
                </button>
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Payment Mode (Cash vs Online)</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  className={`btn ${form.paymentMode === 'CASH' ? 'btn-primary' : 'btn-secondary'} w-full`}
                  style={form.paymentMode === 'CASH' ? { background: '#16a34a', borderColor: '#16a34a' } : {}}
                  onClick={() => setForm({ ...form, paymentMode: 'CASH' })}
                >
                  💵 Cash (Offline)
                </button>
                <button
                  type="button"
                  className={`btn ${form.paymentMode === 'ONLINE' ? 'btn-primary' : 'btn-secondary'} w-full`}
                  style={form.paymentMode === 'ONLINE' ? { background: '#2563eb', borderColor: '#2563eb' } : {}}
                  onClick={() => setForm({ ...form, paymentMode: 'ONLINE' })}
                >
                  🌐 Online / UPI
                </button>
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Person / Party Name</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. Ramesh Kumar, Milk Vendor"
                value={form.personName}
                onChange={(e) => setForm({ ...form, personName: e.target.value })}
                required
              />
            </div>

            <div className="input-group">
              <label className="input-label">Total Loan Amount (₹)</label>
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
              <label className="input-label">Initial Returned Amount (₹)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="input money"
                placeholder="0.00"
                value={form.returnedAmount}
                onChange={(e) => setForm({ ...form, returnedAmount: e.target.value })}
              />
            </div>

            <div className="input-group">
              <label className="input-label">Loan Date</label>
              <input
                type="date"
                className="input"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
              />
            </div>

            <div className="input-group">
              <label className="input-label">Note / Reference (Optional)</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. Shop renovation borrowing..."
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
              />
            </div>

            <button type="submit" className="btn btn-primary btn-lg w-full" disabled={createMutation.isPending}>
              {createMutation.isPending ? <span className="spinner" /> : 'Save Loan Record'}
            </button>
          </form>
        </div>

        {/* History Table */}
        <div className="card">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Loan Ledger Entries</h3>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <div style={{ fontSize: '0.8rem', background: 'var(--color-bg-secondary)', padding: '0.35rem 0.75rem', borderRadius: '1rem', fontWeight: 600, color: '#ef4444' }}>
                  Pending Taken: {formatCurrency(totalPendingTaken)}
                </div>
                <div style={{ fontSize: '0.8rem', background: 'var(--color-bg-secondary)', padding: '0.35rem 0.75rem', borderRadius: '1rem', fontWeight: 600, color: 'var(--color-primary)' }}>
                  Pending Given: {formatCurrency(totalPendingGiven)}
                </div>
              </div>
            </div>

            {/* Filter Toolbar */}
            <div style={{ background: 'var(--color-bg-secondary)', padding: '0.75rem', borderRadius: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Status Filter:</span>
                <button type="button" className={`btn btn-sm ${statusFilter === 'ALL' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setStatusFilter('ALL')}>♾️ All Loans</button>
                <button type="button" className={`btn btn-sm ${statusFilter === 'PENDING' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setStatusFilter('PENDING')}>⚡ Pending Only</button>
                <button type="button" className={`btn btn-sm ${statusFilter === 'CLOSED' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setStatusFilter('CLOSED')}>✅ Closed Only</button>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Type Filter:</span>
                <button type="button" className={`btn btn-sm ${typeFilter === 'ALL' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTypeFilter('ALL')}>🤝 All Types</button>
                <button type="button" className={`btn btn-sm ${typeFilter === 'TAKEN' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTypeFilter('TAKEN')}>📥 Loan Taken</button>
                <button type="button" className={`btn btn-sm ${typeFilter === 'GIVEN' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTypeFilter('GIVEN')}>📤 Loan Given</button>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}><span className="spinner" /></div>
          ) : loansList.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">🤝</div>
              <div className="empty-state__title">No loan records found</div>
              <div className="empty-state__desc">Use the form on the left to record a new loan entry.</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Mode</th>
                    <th>Person / Party</th>
                    <th>Total Amount</th>
                    <th>Returned</th>
                    <th>Pending</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loansList.map((loan) => (
                    <tr key={loan.id}>
                      <td style={{ fontWeight: 600 }}>{formatDate(loan.date, 'short')}</td>
                      <td>
                        <span className={`badge ${loan.type === 'TAKEN' ? 'badge--cash' : 'badge--online'}`}>
                          {loan.type === 'TAKEN' ? 'TAKEN' : 'GIVEN'}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${loan.paymentMode === 'CASH' ? 'badge--cash' : 'badge--online'}`}>
                          {loan.paymentMode || 'CASH'}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        {loan.personName}
                        {loan.note && <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 400 }}>{loan.note}</div>}
                      </td>
                      <td className="money" style={{ fontWeight: 700 }}>{formatCurrency(loan.amount)}</td>
                      <td className="money" style={{ color: 'var(--color-success)', fontWeight: 600 }}>{formatCurrency(loan.returnedAmount)}</td>
                      <td className="money" style={{ color: loan.pendingAmount > 0 ? '#ef4444' : 'var(--color-success)', fontWeight: 800 }}>
                        {formatCurrency(loan.pendingAmount)}
                      </td>
                      <td>
                        <span className={`badge ${loan.status === 'CLOSED' ? 'badge--cash' : 'badge--voided'}`}>
                          {loan.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end' }}>
                          {loan.status === 'PENDING' && (
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => setRepayModal({ open: true, loan, amount: '', repaymentMode: 'CASH' })}
                            >
                              + Repay
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ color: 'var(--color-net-profit-neg)' }}
                            onClick={() => setDeleteModal({ open: true, loanId: loan.id })}
                          >
                            Delete
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

      {/* Repayment Modal */}
      {repayModal.open && repayModal.loan && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 450 }}>
            <h3 className="modal__title">💰 Record Loan Repayment</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
              Party: <strong>{repayModal.loan.personName}</strong> • Pending: <strong>{formatCurrency(repayModal.loan.pendingAmount)}</strong>
            </p>

            <form onSubmit={handleRepaySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="input-group">
                <label className="input-label">Repayment Mode</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    className={`btn ${repayModal.repaymentMode === 'CASH' ? 'btn-primary' : 'btn-secondary'} w-full`}
                    style={repayModal.repaymentMode === 'CASH' ? { background: '#16a34a', borderColor: '#16a34a' } : {}}
                    onClick={() => setRepayModal({ ...repayModal, repaymentMode: 'CASH' })}
                  >
                    💵 Cash
                  </button>
                  <button
                    type="button"
                    className={`btn ${repayModal.repaymentMode === 'ONLINE' ? 'btn-primary' : 'btn-secondary'} w-full`}
                    style={repayModal.repaymentMode === 'ONLINE' ? { background: '#2563eb', borderColor: '#2563eb' } : {}}
                    onClick={() => setRepayModal({ ...repayModal, repaymentMode: 'ONLINE' })}
                  >
                    🌐 Online / UPI
                  </button>
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Repayment Amount Received/Paid (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  className="input money"
                  placeholder="0.00"
                  value={repayModal.amount}
                  onChange={(e) => setRepayModal({ ...repayModal, amount: e.target.value })}
                  required
                  autoFocus
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setRepayModal({ open: false, loan: null, amount: '', repaymentMode: 'CASH' })}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? <span className="spinner" /> : 'Record Repayment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.open && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 400 }}>
            <h3 className="modal__title" style={{ color: 'var(--color-net-profit-neg)' }}>⚠️ Delete Loan Record</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '1.25rem' }}>
              Are you sure you want to delete this loan record? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setDeleteModal({ open: false, loanId: '' })}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ background: 'var(--color-net-profit-neg)', borderColor: 'var(--color-net-profit-neg)' }}
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deleteModal.loanId)}
              >
                {deleteMutation.isPending ? <span className="spinner" /> : 'Delete Loan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Loans;
