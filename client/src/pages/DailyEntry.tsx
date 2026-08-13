import { useState, useEffect, useMemo } from 'react';
import { dailyEntryApi } from '../api/client';
import { useShopStore } from '../stores/useShopStore';

interface ExpenseRow {
  id?: string;
  category: string;
  amount: number | '';
  paymentMode: 'Cash' | 'UPI' | 'Card' | 'Credit';
  note: string;
}

interface DrawingRow {
  id?: string;
  amount: number | '';
  paymentMode: 'Cash' | 'UPI';
  reason: string;
}

const CATEGORIES = [
  'Material Purchase',
  'Shop Expense',
  'Fixed Expense',
  'Personal Expense (Drawings)',
  'Loan Given',
  'Loan Taken',
  'Other',
];

const QUICK_EXPENSES = [
  { label: '🥛 Milk', category: 'Material Purchase', defaultNote: 'Daily Milk Supply' },
  { label: '🍞 Bread & Snacks', category: 'Material Purchase', defaultNote: 'Bakery & Snacks' },
  { label: '🍃 Tea & Spices', category: 'Material Purchase', defaultNote: 'Tea & Ingredients' },
  { label: '⚡ Utility / Rent', category: 'Fixed Expense', defaultNote: 'Shop Electricity/Rent' },
  { label: '🧹 Staff & Misc', category: 'Shop Expense', defaultNote: 'Staff / Daily Cleaning' },
];

function DailyEntry() {
  const { addToast } = useShopStore();
  const [date, setDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autoCarried, setAutoCarried] = useState(false);

  // Form States
  const [openingCash, setOpeningCash] = useState<number | ''>(0);
  const [openingBank, setOpeningBank] = useState<number | ''>(0);

  const [cashSales, setCashSales] = useState<number | ''>(0);
  const [upiSales, setUpiSales] = useState<number | ''>(0);
  const [cardSales, setCardSales] = useState<number | ''>(0);
  const [salesNote, setSalesNote] = useState('');

  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [drawings, setDrawings] = useState<DrawingRow[]>([]);

  // Fetch initial day balance and existing entries
  const loadDayData = async (selectedDate: string) => {
    setLoading(true);
    try {
      const res = await dailyEntryApi.getBalance(selectedDate);
      if (res.success && res.data) {
        const d = res.data;
        setAutoCarried(!!d.autoCarried);
        setOpeningCash(d.openingCash || 0);
        setOpeningBank(d.openingBank || 0);

        setCashSales(d.sales?.cashSales || 0);
        setUpiSales(d.sales?.upiSales || 0);
        setCardSales(d.sales?.cardSales || 0);
        setSalesNote(d.sales?.note || '');

        setExpenses(
          d.expenses && d.expenses.length > 0
            ? d.expenses.map((e: any) => ({
                id: e.id,
                category: e.category,
                amount: e.amount,
                paymentMode: e.paymentMode || 'Cash',
                note: e.note || '',
              }))
            : []
        );

        setDrawings(
          d.drawings && d.drawings.length > 0
            ? d.drawings.map((dr: any) => ({
                id: dr.id,
                amount: dr.amount,
                paymentMode: dr.paymentMode || 'Cash',
                reason: dr.reason || '',
              }))
            : []
        );
      }
    } catch (err: any) {
      addToast('error', err.message || 'Failed to load daily entry');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDayData(date);
  }, [date]);

  // Real-Time Calculations
  const numOpeningCash = Number(openingCash) || 0;
  const numOpeningBank = Number(openingBank) || 0;
  const totalOpening = numOpeningCash + numOpeningBank;

  const numCashSales = Number(cashSales) || 0;
  const numUpiSales = Number(upiSales) || 0;
  const numCardSales = Number(cardSales) || 0;
  const totalSales = numCashSales + numUpiSales + numCardSales;

  const { cashExpenses, onlineExpenses } = useMemo(() => {
    let cashExp = 0;
    let onlineExp = 0;
    for (const exp of expenses) {
      const amt = Number(exp.amount) || 0;
      if (exp.paymentMode === 'Cash') cashExp += amt;
      else onlineExp += amt;
    }
    return { cashExpenses: cashExp, onlineExpenses: onlineExp };
  }, [expenses]);

  const { cashDrawings, onlineDrawings } = useMemo(() => {
    let cashDrw = 0;
    let onlineDrw = 0;
    for (const dr of drawings) {
      const amt = Number(dr.amount) || 0;
      if (dr.paymentMode === 'Cash') cashDrw += amt;
      else onlineDrw += amt;
    }
    return { cashDrawings: cashDrw, onlineDrawings: onlineDrw };
  }, [drawings]);

  const closingCash = numOpeningCash + numCashSales - cashExpenses - cashDrawings;
  const closingBank = numOpeningBank + numUpiSales + numCardSales - onlineExpenses - onlineDrawings;
  const totalClosing = closingCash + closingBank;

  // Handlers for Quick Expense Add
  const handleQuickAddExpense = (quick: typeof QUICK_EXPENSES[0]) => {
    setExpenses((prev) => [
      ...prev,
      {
        category: quick.category,
        amount: '',
        paymentMode: 'Cash',
        note: quick.defaultNote,
      },
    ]);
  };

  const handleAddExpenseRow = () => {
    setExpenses((prev) => [
      ...prev,
      {
        category: 'Material Purchase',
        amount: '',
        paymentMode: 'Cash',
        note: '',
      },
    ]);
  };

  const handleUpdateExpense = (index: number, field: keyof ExpenseRow, val: any) => {
    setExpenses((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: val };
      return next;
    });
  };

  const handleRemoveExpense = (index: number) => {
    setExpenses((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddDrawingRow = () => {
    setDrawings((prev) => [
      ...prev,
      {
        amount: '',
        paymentMode: 'Cash',
        reason: '',
      },
    ]);
  };

  const handleUpdateDrawing = (index: number, field: keyof DrawingRow, val: any) => {
    setDrawings((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: val };
      return next;
    });
  };

  const handleRemoveDrawing = (index: number) => {
    setDrawings((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        date,
        openingCash: numOpeningCash,
        openingBank: numOpeningBank,
        cashSales: numCashSales,
        upiSales: numUpiSales,
        cardSales: numCardSales,
        note: salesNote,
        expenses: expenses.map((e) => ({
          category: e.category,
          amount: Number(e.amount) || 0,
          paymentMode: e.paymentMode,
          note: e.note,
        })),
        drawings: drawings.map((d) => ({
          amount: Number(d.amount) || 0,
          paymentMode: d.paymentMode,
          reason: d.reason,
        })),
      };

      const res = await dailyEntryApi.save(payload);
      if (res.success) {
        addToast('success', '✅ Daily Entry saved successfully!');
        await loadDayData(date);
      }
    } catch (err: any) {
      addToast('error', err.message || 'Failed to save daily entry');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="daily-entry-container" style={{ paddingBottom: '7rem' }}>
      {/* Top Bar Header */}
      <div className="page-header" style={{ marginBottom: '1.25rem' }}>
        <div>
          <h1 className="page-title">⚡ Daily Entry</h1>
          <p className="page-subtitle">3–5 minute quick entry for Tea Bhatti Cafe</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <input
            type="date"
            className="input"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{ fontWeight: 600, padding: '0.5rem 0.75rem', borderRadius: '10px' }}
          />
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-secondary)' }}>
          Loading entry data for {date}...
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Section A: Opening Balance */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.25rem' }}>🏦</span>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>1. Opening Balance</h2>
              </div>
              {autoCarried && (
                <span className="badge badge--success" style={{ fontSize: '0.75rem' }}>
                  ⚡ Auto-carried from previous closing
                </span>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div>
                <label className="input-label">Opening Cash (₹)</label>
                <input
                  type="number"
                  className="input"
                  placeholder="0.00"
                  value={openingCash === '' ? '' : openingCash}
                  onChange={(e) => setOpeningCash(e.target.value === '' ? '' : Number(e.target.value))}
                />
              </div>
              <div>
                <label className="input-label">Opening Bank / UPI (₹)</label>
                <input
                  type="number"
                  className="input"
                  placeholder="0.00"
                  value={openingBank === '' ? '' : openingBank}
                  onChange={(e) => setOpeningBank(e.target.value === '' ? '' : Number(e.target.value))}
                />
              </div>
              <div style={{ background: 'var(--color-surface-hover)', padding: '0.875rem', borderRadius: '12px' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Total Opening Balance</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--color-primary)', marginTop: '0.25rem' }}>
                  ₹{totalOpening.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </div>

          {/* Section B: Sales Entry */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <span style={{ fontSize: '1.25rem' }}>💰</span>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>2. Sales Entry</h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
              <div>
                <label className="input-label">Cash Sales (₹)</label>
                <input
                  type="number"
                  className="input"
                  placeholder="0.00"
                  value={cashSales === '' ? '' : cashSales}
                  onChange={(e) => setCashSales(e.target.value === '' ? '' : Number(e.target.value))}
                />
              </div>
              <div>
                <label className="input-label">UPI Sales (₹)</label>
                <input
                  type="number"
                  className="input"
                  placeholder="0.00"
                  value={upiSales === '' ? '' : upiSales}
                  onChange={(e) => setUpiSales(e.target.value === '' ? '' : Number(e.target.value))}
                />
              </div>
              <div>
                <label className="input-label">Card Sales (₹) <small>(Optional)</small></label>
                <input
                  type="number"
                  className="input"
                  placeholder="0.00"
                  value={cardSales === '' ? '' : cardSales}
                  onChange={(e) => setCardSales(e.target.value === '' ? '' : Number(e.target.value))}
                />
              </div>
              <div style={{ background: 'var(--color-surface-hover)', padding: '0.875rem', borderRadius: '12px' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Total Sales</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--color-success)', marginTop: '0.25rem' }}>
                  ₹{totalSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </div>

          {/* Section C: Expense Entry */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.25rem' }}>💸</span>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>3. Expense Entry</h2>
              </div>
              <button
                type="button"
                className="btn btn--outline"
                onClick={handleAddExpenseRow}
                style={{ fontSize: '0.875rem', padding: '0.4rem 0.85rem' }}
              >
                + Add Expense
              </button>
            </div>

            {/* Quick Cafe Add Buttons */}
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>
                ⚡ Quick Add Common Cafe Expenses:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {QUICK_EXPENSES.map((q, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="btn btn--surface"
                    style={{ fontSize: '0.8125rem', padding: '0.35rem 0.75rem', borderRadius: '20px', border: '1px solid var(--color-border)' }}
                    onClick={() => handleQuickAddExpense(q)}
                  >
                    {q.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Expense Rows */}
            {expenses.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1.5rem', background: 'var(--color-background)', borderRadius: '10px', color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                No expenses added for today. Click quick add above or "+ Add Expense".
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {expenses.map((exp, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr)) 40px',
                      gap: '0.5rem',
                      alignItems: 'center',
                      background: 'var(--color-background)',
                      padding: '0.75rem',
                      borderRadius: '10px',
                      border: '1px solid var(--color-border)',
                    }}
                  >
                    <div>
                      <label className="input-label" style={{ fontSize: '0.75rem' }}>Category</label>
                      <select
                        className="select"
                        style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                        value={exp.category}
                        onChange={(e) => handleUpdateExpense(idx, 'category', e.target.value)}
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="input-label" style={{ fontSize: '0.75rem' }}>Amount (₹)</label>
                      <input
                        type="number"
                        className="input"
                        style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                        placeholder="0.00"
                        value={exp.amount === '' ? '' : exp.amount}
                        onChange={(e) => handleUpdateExpense(idx, 'amount', e.target.value === '' ? '' : Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <label className="input-label" style={{ fontSize: '0.75rem' }}>Pay Mode</label>
                      <select
                        className="select"
                        style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                        value={exp.paymentMode}
                        onChange={(e) => handleUpdateExpense(idx, 'paymentMode', e.target.value)}
                      >
                        <option value="Cash">Cash</option>
                        <option value="UPI">UPI</option>
                        <option value="Card">Card</option>
                        <option value="Credit">Credit</option>
                      </select>
                    </div>
                    <div>
                      <label className="input-label" style={{ fontSize: '0.75rem' }}>Note</label>
                      <input
                        type="text"
                        className="input"
                        style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                        placeholder="Details..."
                        value={exp.note}
                        onChange={(e) => handleUpdateExpense(idx, 'note', e.target.value)}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveExpense(idx)}
                      style={{
                        height: 36,
                        width: 36,
                        marginTop: '1.2rem',
                        background: 'rgba(239, 68, 68, 0.1)',
                        color: '#ef4444',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: 700,
                      }}
                      title="Remove expense"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section D: Personal Drawings Entry */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.25rem' }}>🏧</span>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>4. Personal Owner Drawings</h2>
              </div>
              <button
                type="button"
                className="btn btn--outline"
                onClick={handleAddDrawingRow}
                style={{ fontSize: '0.875rem', padding: '0.4rem 0.85rem' }}
              >
                + Add Personal Withdrawal
              </button>
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginBottom: '1rem', marginTop: 0 }}>
              💡 Drawings track personal money taken by owner for personal use. They do <strong>NOT</strong> reduce business net profit.
            </p>

            {drawings.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1.25rem', background: 'var(--color-background)', borderRadius: '10px', color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
                No personal withdrawals recorded for today.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {drawings.map((dr, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 120px 1.5fr 40px',
                      gap: '0.5rem',
                      alignItems: 'center',
                      background: 'var(--color-background)',
                      padding: '0.75rem',
                      borderRadius: '10px',
                      border: '1px solid var(--color-border)',
                    }}
                  >
                    <div>
                      <label className="input-label" style={{ fontSize: '0.75rem' }}>Amount (₹)</label>
                      <input
                        type="number"
                        className="input"
                        style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                        placeholder="0.00"
                        value={dr.amount === '' ? '' : dr.amount}
                        onChange={(e) => handleUpdateDrawing(idx, 'amount', e.target.value === '' ? '' : Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <label className="input-label" style={{ fontSize: '0.75rem' }}>Pay Mode</label>
                      <select
                        className="select"
                        style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                        value={dr.paymentMode}
                        onChange={(e) => handleUpdateDrawing(idx, 'paymentMode', e.target.value)}
                      >
                        <option value="Cash">Cash</option>
                        <option value="UPI">UPI / Bank</option>
                      </select>
                    </div>
                    <div>
                      <label className="input-label" style={{ fontSize: '0.75rem' }}>Reason / Note</label>
                      <input
                        type="text"
                        className="input"
                        style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                        placeholder="Personal use..."
                        value={dr.reason}
                        onChange={(e) => handleUpdateDrawing(idx, 'reason', e.target.value)}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveDrawing(idx)}
                      style={{
                        height: 36,
                        width: 36,
                        marginTop: '1.2rem',
                        background: 'rgba(239, 68, 68, 0.1)',
                        color: '#ef4444',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: 700,
                      }}
                      title="Remove drawing"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sticky Real-Time Closing Calculation Bar */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'var(--color-surface)',
          borderTop: '2px solid var(--color-border)',
          boxShadow: '0 -4px 20px rgba(0,0,0,0.15)',
          padding: '0.875rem 1.25rem',
          zIndex: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Closing Cash</div>
            <div
              style={{
                fontSize: '1.1rem',
                fontWeight: 800,
                color: closingCash < 0 ? '#ef4444' : 'var(--color-text)',
              }}
            >
              ₹{closingCash.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Closing Bank</div>
            <div
              style={{
                fontSize: '1.1rem',
                fontWeight: 800,
                color: closingBank < 0 ? '#ef4444' : 'var(--color-text)',
              }}
            >
              ₹{closingBank.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Total Closing</div>
            <div
              style={{
                fontSize: '1.25rem',
                fontWeight: 900,
                color: totalClosing < 0 ? '#ef4444' : 'var(--color-primary)',
              }}
            >
              ₹{totalClosing.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        <button
          type="button"
          className="btn btn--primary"
          onClick={handleSave}
          disabled={saving || loading}
          style={{
            fontSize: '1rem',
            fontWeight: 700,
            padding: '0.75rem 2rem',
            borderRadius: '12px',
            minWidth: '160px',
          }}
        >
          {saving ? 'Saving...' : '💾 Save Entry'}
        </button>
      </div>
    </div>
  );
}

export default DailyEntry;
