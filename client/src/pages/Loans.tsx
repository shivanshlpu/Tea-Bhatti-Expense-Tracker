import { useState, useEffect, useMemo } from 'react';
import { loansApi } from '../api/client';
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
  note?: string;
}

function Loans() {
  const { addToast } = useShopStore();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'CLOSED'>('PENDING');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'TAKEN' | 'GIVEN'>('ALL');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [personName, setPersonName] = useState('');
  const [type, setType] = useState<'TAKEN' | 'GIVEN'>('TAKEN');
  const [amount, setAmount] = useState<number | ''>('');
  const [returnedAmount, setReturnedAmount] = useState<number | ''>(0);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Repayment Modal
  const [repayLoan, setRepayLoan] = useState<Loan | null>(null);
  const [addRepayAmount, setAddRepayAmount] = useState<number | ''>('');

  const loadLoans = async () => {
    setLoading(true);
    try {
      const res = await loansApi.list({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        type: typeFilter === 'ALL' ? undefined : typeFilter,
      });
      if (res.success && res.data) {
        setLoans(res.data);
      }
    } catch (err: any) {
      addToast('error', err.message || 'Failed to load loans');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLoans();
  }, [statusFilter, typeFilter]);

  // Aggregates
  const totals = useMemo(() => {
    let taken = 0;
    let pendingTaken = 0;
    let given = 0;
    let pendingGiven = 0;

    for (const l of loans) {
      if (l.type === 'TAKEN') {
        taken += l.amount;
        pendingTaken += l.pendingAmount;
      } else {
        given += l.amount;
        pendingGiven += l.pendingAmount;
      }
    }

    return { taken, pendingTaken, given, pendingGiven };
  }, [loans]);

  const handleCreateLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!personName.trim()) {
      addToast('error', 'Person name is required');
      return;
    }
    if (!amount || Number(amount) <= 0) {
      addToast('error', 'Enter a valid amount');
      return;
    }

    setSubmitting(true);
    try {
      const res = await loansApi.create({
        personName,
        type,
        amount: Number(amount),
        returnedAmount: Number(returnedAmount) || 0,
        note,
      });
      if (res.success) {
        addToast('success', '✅ Loan entry created');
        setShowModal(false);
        setPersonName('');
        setAmount('');
        setReturnedAmount(0);
        setNote('');
        loadLoans();
      }
    } catch (err: any) {
      addToast('error', err.message || 'Failed to create loan');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRepaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repayLoan) return;

    const addAmt = Number(addRepayAmount) || 0;
    if (addAmt <= 0) {
      addToast('error', 'Enter a valid repayment amount');
      return;
    }

    const newReturned = repayLoan.returnedAmount + addAmt;
    setSubmitting(true);
    try {
      const res = await loansApi.update(repayLoan.id, {
        returnedAmount: newReturned,
      });
      if (res.success) {
        addToast('success', '✅ Repayment recorded');
        setRepayLoan(null);
        setAddRepayAmount('');
        loadLoans();
      }
    } catch (err: any) {
      addToast('error', err.message || 'Failed to record repayment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="loans-container" style={{ paddingBottom: '3rem' }}>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title">🤝 Loan & Ledger Management</h1>
          <p className="page-subtitle">Track loans taken, loans given, and pending balances</p>
        </div>
        <button className="btn btn--primary" onClick={() => setShowModal(true)}>
          + Record New Loan
        </button>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="card" style={{ borderLeft: '4px solid var(--color-warning)' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Loan Taken (Liabilities)</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '0.25rem' }}>
            ₹{totals.taken.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--color-warning)', fontWeight: 700, marginTop: '0.25rem' }}>
            Pending Payback: ₹{totals.pendingTaken.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="card" style={{ borderLeft: '4px solid var(--color-info)' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Loan Given (Assets)</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '0.25rem' }}>
            ₹{totals.given.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--color-info)', fontWeight: 700, marginTop: '0.25rem' }}>
            Pending Receivable: ₹{totals.pendingGiven.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginRight: '0.5rem' }}>Status:</span>
            <div className="button-group" style={{ display: 'inline-flex' }}>
              {(['PENDING', 'CLOSED', 'ALL'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`btn btn--sm ${statusFilter === s ? 'btn--primary' : 'btn--outline'}`}
                  onClick={() => setStatusFilter(s)}
                >
                  {s === 'ALL' ? 'All Loans' : s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginRight: '0.5rem' }}>Type:</span>
            <div className="button-group" style={{ display: 'inline-flex' }}>
              {(['ALL', 'TAKEN', 'GIVEN'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`btn btn--sm ${typeFilter === t ? 'btn--primary' : 'btn--outline'}`}
                  onClick={() => setTypeFilter(t)}
                >
                  {t === 'ALL' ? 'All Types' : t === 'TAKEN' ? 'Loan Taken' : 'Loan Given'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Loan List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-secondary)' }}>Loading loans...</div>
      ) : loans.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-secondary)' }}>
          No loan records found matching the current filters.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {loans.map((loan) => (
            <div key={loan.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.25rem' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>{loan.personName}</h3>
                  <span className={`badge ${loan.type === 'TAKEN' ? 'badge--warning' : 'badge--info'}`}>
                    {loan.type === 'TAKEN' ? 'LOAN TAKEN' : 'LOAN GIVEN'}
                  </span>
                  <span className={`badge ${loan.status === 'CLOSED' ? 'badge--success' : 'badge--danger'}`}>
                    {loan.status}
                  </span>
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                  Date: {loan.date} {loan.note ? `• ${loan.note}` : ''}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Total Amount</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>₹{loan.amount.toLocaleString('en-IN')}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Returned</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-success)' }}>
                    ₹{loan.returnedAmount.toLocaleString('en-IN')}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Pending</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: loan.pendingAmount > 0 ? '#ef4444' : 'var(--color-success)' }}>
                    ₹{loan.pendingAmount.toLocaleString('en-IN')}
                  </div>
                </div>

                {loan.status === 'PENDING' && (
                  <button
                    className="btn btn--outline btn--sm"
                    onClick={() => {
                      setRepayLoan(loan);
                      setAddRepayAmount('');
                    }}
                  >
                    + Repayment
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Loan Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '500px', width: '90%' }}>
            <h2 className="modal__title">🤝 Record New Loan</h2>
            <form onSubmit={handleCreateLoan}>
              <div className="form-group">
                <label className="input-label">Person / Party Name</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. Ramesh Kumar"
                  value={personName}
                  onChange={(e) => setPersonName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="input-label">Loan Type</label>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="loanType"
                      checked={type === 'TAKEN'}
                      onChange={() => setType('TAKEN')}
                    />
                    Loan Taken (Money borrowed)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="loanType"
                      checked={type === 'GIVEN'}
                      onChange={() => setType('GIVEN')}
                    />
                    Loan Given (Money lent)
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label className="input-label">Total Loan Amount (₹)</label>
                <input
                  type="number"
                  className="input"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  required
                />
              </div>

              <div className="form-group">
                <label className="input-label">Initial Returned Amount (₹)</label>
                <input
                  type="number"
                  className="input"
                  placeholder="0.00"
                  value={returnedAmount}
                  onChange={(e) => setReturnedAmount(e.target.value === '' ? '' : Number(e.target.value))}
                />
              </div>

              <div className="form-group">
                <label className="input-label">Note / Reason <small>(Optional)</small></label>
                <input
                  type="text"
                  className="input"
                  placeholder="Details..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn--outline" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn--primary" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save Loan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Repayment Modal */}
      {repayLoan && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '450px', width: '90%' }}>
            <h2 className="modal__title">💰 Record Loan Repayment</h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
              Person: <strong>{repayLoan.personName}</strong> • Current Pending: <strong>₹{repayLoan.pendingAmount.toLocaleString('en-IN')}</strong>
            </p>
            <form onSubmit={handleRepaymentSubmit}>
              <div className="form-group">
                <label className="input-label">Repayment Amount Received/Paid Now (₹)</label>
                <input
                  type="number"
                  className="input"
                  placeholder="0.00"
                  value={addRepayAmount}
                  onChange={(e) => setAddRepayAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn--outline" onClick={() => setRepayLoan(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn--primary" disabled={submitting}>
                  {submitting ? 'Updating...' : 'Record Repayment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Loans;
