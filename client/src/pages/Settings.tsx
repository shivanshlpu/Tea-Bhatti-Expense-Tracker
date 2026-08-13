import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '../api/client';
import { useShopStore } from '../stores/useShopStore';

function Settings() {
  const queryClient = useQueryClient();
  const addToast = useShopStore((s) => s.addToast);
  const { theme, toggleTheme } = useShopStore();

  const [activeTab, setActiveTab] = useState<'profile' | 'formulas'>('profile');

  const [form, setForm] = useState({
    name: '',
    ownerName: '',
    email: '',
    currency: 'INR',
  });

  // Interactive Live Calculator State
  const [calcOpeningCash, setCalcOpeningCash] = useState<number>(1000);
  const [calcOpeningBank, setCalcOpeningBank] = useState<number>(5000);

  const [calcCashSales, setCalcCashSales] = useState<number>(6000);
  const [calcUpiSales, setCalcUpiSales] = useState<number>(4000);
  const [calcCardSales, setCalcCardSales] = useState<number>(0);

  const [calcMaterialExp, setCalcMaterialExp] = useState<number>(2500);
  const [calcShopExp, setCalcShopExp] = useState<number>(1500);
  const [calcFixedExp, setCalcFixedExp] = useState<number>(1000);

  const [calcCashDrawings, setCalcCashDrawings] = useState<number>(800);
  const [calcUpiDrawings, setCalcUpiDrawings] = useState<number>(500);

  const [calcLoanAmount, setCalcLoanAmount] = useState<number>(2000);
  const [calcLoanReturned, setCalcLoanReturned] = useState<number>(500);

  // Live Calculated Proofs
  const calcTotalOpening = calcOpeningCash + calcOpeningBank;
  const calcTotalSales = calcCashSales + calcUpiSales + calcCardSales;

  const calcTotalBusinessExp = calcMaterialExp + calcShopExp;
  const calcTotalAllExp = calcTotalBusinessExp + calcFixedExp;

  const calcGrossProfit = calcTotalSales - calcMaterialExp;
  const calcNetProfit = calcTotalSales - calcTotalAllExp;

  const calcTotalDrawings = calcCashDrawings + calcUpiDrawings;

  const calcProfitMargin = calcTotalSales > 0 ? (calcNetProfit / calcTotalSales) * 100 : 0;
  const calcExpenseRatio = calcTotalSales > 0 ? (calcTotalAllExp / calcTotalSales) * 100 : 0;

  const calcClosingCash = calcOpeningCash + calcCashSales - (calcMaterialExp * 0.6) - calcCashDrawings;
  const calcClosingBank = calcOpeningBank + calcUpiSales + calcCardSales - (calcShopExp + calcFixedExp + calcMaterialExp * 0.4) - calcUpiDrawings;
  const calcTotalClosing = calcClosingCash + calcClosingBank;

  const calcPendingLoan = calcLoanAmount - calcLoanReturned;

  const { data: settingsData, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.getShop(),
  });

  useEffect(() => {
    if (settingsData?.data) {
      setForm({
        name: settingsData.data.name || '',
        ownerName: settingsData.data.ownerName || '',
        email: settingsData.data.email || '',
        currency: settingsData.data.currency || 'INR',
      });
    }
  }, [settingsData]);

  const updateMutation = useMutation({
    mutationFn: (data: any) => settingsApi.updateShop(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      addToast('success', 'Shop settings updated successfully');
    },
    onError: (err: any) => {
      addToast('error', err.message || 'Failed to update settings');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(form);
  };

  const fmtCurrency = (val: number) => `₹${val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="page-container" style={{ paddingBottom: '3rem' }}>
      <div className="page-header" style={{ flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title">⚙️ Settings & Accounting Formulas</h1>
          <p className="page-subtitle">Manage shop profile, theme preferences, and review full background accounting formulas</p>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--color-surface)', padding: '0.35rem', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
          <button
            type="button"
            className={`btn btn--sm ${activeTab === 'profile' ? 'btn--primary' : 'btn--outline'}`}
            onClick={() => setActiveTab('profile')}
          >
            ⚙️ Shop Profile
          </button>
          <button
            type="button"
            className={`btn btn--sm ${activeTab === 'formulas' ? 'btn--primary' : 'btn--outline'}`}
            onClick={() => setActiveTab('formulas')}
          >
            🧮 Finance Calculator & Formulas
          </button>
        </div>
      </div>

      {activeTab === 'profile' ? (
        <div style={{ maxWidth: 650, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Profile Card */}
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1rem' }}>Shop Profile</h3>
            {isLoading ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}><span className="spinner" /></div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="input-group">
                  <label className="input-label">Shop Name</label>
                  <input
                    type="text"
                    className="input"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Owner Name</label>
                  <input
                    type="text"
                    className="input"
                    value={form.ownerName}
                    onChange={(e) => setForm({ ...form, ownerName: e.target.value })}
                    required
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Email Address</label>
                  <input
                    type="email"
                    className="input"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Currency Code</label>
                  <input
                    type="text"
                    className="input"
                    value={form.currency}
                    onChange={(e) => setForm({ ...form, currency: e.target.value })}
                    maxLength={3}
                  />
                </div>

                <button type="submit" className="btn btn--primary" disabled={updateMutation.isPending} style={{ marginTop: '0.5rem' }}>
                  {updateMutation.isPending ? 'Saving...' : 'Save Profile Changes'}
                </button>
              </form>
            )}
          </div>

          {/* Theme Card */}
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1rem' }}>Theme Preference</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700 }}>Active Color Theme</div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                  {theme === 'light' ? 'Light mode (Default)' : 'Dark mode'}
                </div>
              </div>
              <button className="btn btn--outline" onClick={toggleTheme}>
                {theme === 'light' ? '🌙 Switch to Dark' : '☀️ Switch to Light'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Accounting Formulas & Live Calculator Tab */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Header Banner */}
          <div className="card" style={{ background: 'linear-gradient(135deg, var(--color-surface) 0%, var(--color-surface-hover) 100%)', borderLeft: '4px solid var(--color-primary)' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, marginBottom: '0.35rem', color: 'var(--color-primary)' }}>
              📖 Background Accounting Formulas & Mathematical Proof
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.5 }}>
              Below are all 11 accounting formulas applied in the background across Tea Bhatti Cafe. Use the interactive live calculator at the bottom to test numbers with step-by-step mathematical proof.
            </p>
          </div>

          {/* Grid of 11 Formulas */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
            
            {/* 1. Total Sales */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--color-success)' }}>1. Total Sales Revenue</span>
                <span className="badge badge--success">Income</span>
              </div>
              <div style={{ background: 'var(--color-background)', padding: '0.65rem', borderRadius: '8px', fontFamily: 'monospace', fontWeight: 700, fontSize: '0.875rem', border: '1px solid var(--color-border)', marginBottom: '0.5rem' }}>
                Total Sales = Cash Sales + UPI Sales + Card Sales
              </div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', margin: 0 }}>
                Aggregates counter cash, GPay/PhonePe UPI payments, and card swipes. Voided transactions are automatically excluded.
              </p>
            </div>

            {/* 2. Gross Profit */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#10b981' }}>2. Gross Profit</span>
                <span className="badge badge--info">Margin</span>
              </div>
              <div style={{ background: 'var(--color-background)', padding: '0.65rem', borderRadius: '8px', fontFamily: 'monospace', fontWeight: 700, fontSize: '0.875rem', border: '1px solid var(--color-border)', marginBottom: '0.5rem' }}>
                Gross Profit = Total Sales − Material Purchase Exp
              </div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', margin: 0 }}>
                Measures trading profitability before subtracting shop fixed overheads (Rent, Electricity, Wages).
              </p>
            </div>

            {/* 3. Fixed & Shop Expenses */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#ef4444' }}>3. Fixed & Shop Expenses</span>
                <span className="badge badge--warning">Overhead</span>
              </div>
              <div style={{ background: 'var(--color-background)', padding: '0.65rem', borderRadius: '8px', fontFamily: 'monospace', fontWeight: 700, fontSize: '0.875rem', border: '1px solid var(--color-border)', marginBottom: '0.5rem' }}>
                Fixed Exp = Shop Rent + Electricity + Staff Wages
              </div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', margin: 0 }}>
                Recurring overhead costs necessary to operate the cafe premises.
              </p>
            </div>

            {/* 4. Net Business Profit */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--color-primary)' }}>4. Net Business Profit</span>
                <span className="badge badge--success">Net Bottom Line</span>
              </div>
              <div style={{ background: 'var(--color-background)', padding: '0.65rem', borderRadius: '8px', fontFamily: 'monospace', fontWeight: 700, fontSize: '0.85rem', border: '1px solid var(--color-border)', marginBottom: '0.5rem' }}>
                Net Profit = Total Sales − Business Exp − Fixed Exp
              </div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', margin: 0 }}>
                💡 <strong>Key Rule</strong>: Personal drawings/withdrawals are strictly isolated and do <strong>NOT</strong> reduce Net Business Profit.
              </p>
            </div>

            {/* 5. Closing Cash Drawer */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#f59e0b' }}>5. Closing Cash Drawer</span>
                <span className="badge badge--warning">Drawer Cash</span>
              </div>
              <div style={{ background: 'var(--color-background)', padding: '0.65rem', borderRadius: '8px', fontFamily: 'monospace', fontWeight: 700, fontSize: '0.8rem', border: '1px solid var(--color-border)', marginBottom: '0.5rem' }}>
                Closing Cash = Opening Cash + Cash Sales − Cash Exp − Cash Drawings
              </div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', margin: 0 }}>
                Calculates the exact physical cash in drawer at end of day.
              </p>
            </div>

            {/* 6. Closing Bank Account */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#3b82f6' }}>6. Closing Bank / UPI Balance</span>
                <span className="badge badge--info">Bank Balance</span>
              </div>
              <div style={{ background: 'var(--color-background)', padding: '0.65rem', borderRadius: '8px', fontFamily: 'monospace', fontWeight: 700, fontSize: '0.8rem', border: '1px solid var(--color-border)', marginBottom: '0.5rem' }}>
                Closing Bank = Opening Bank + UPI Sales − Online Exp − Online Drawings
              </div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', margin: 0 }}>
                Calculates remaining digital money inside the cafe's bank account.
              </p>
            </div>

            {/* 7. Cash Available */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--color-text)' }}>7. Cash Available</span>
                <span className="badge badge--success">Total Liquidity</span>
              </div>
              <div style={{ background: 'var(--color-background)', padding: '0.65rem', borderRadius: '8px', fontFamily: 'monospace', fontWeight: 700, fontSize: '0.85rem', border: '1px solid var(--color-border)', marginBottom: '0.5rem' }}>
                Cash Available = Closing Cash + Closing Bank
              </div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', margin: 0 }}>
                Total liquid funds currently available across drawer and bank accounts.
              </p>
            </div>

            {/* 8. Profit Margin % */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--color-primary)' }}>8. Profit Margin %</span>
                <span className="badge badge--info">Ratio</span>
              </div>
              <div style={{ background: 'var(--color-background)', padding: '0.65rem', borderRadius: '8px', fontFamily: 'monospace', fontWeight: 700, fontSize: '0.85rem', border: '1px solid var(--color-border)', marginBottom: '0.5rem' }}>
                Profit Margin % = (Net Profit / Total Sales) × 100
              </div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', margin: 0 }}>
                Percentage of sales converted into profit (formatted to 1 decimal place).
              </p>
            </div>

            {/* 9. Expense Ratio % */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#f59e0b' }}>9. Expense Ratio %</span>
                <span className="badge badge--warning">Ratio</span>
              </div>
              <div style={{ background: 'var(--color-background)', padding: '0.65rem', borderRadius: '8px', fontFamily: 'monospace', fontWeight: 700, fontSize: '0.85rem', border: '1px solid var(--color-border)', marginBottom: '0.5rem' }}>
                Expense Ratio % = (Total Expenses / Total Sales) × 100
              </div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', margin: 0 }}>
                Percentage of sales consumed by expenses (formatted to 1 decimal place).
              </p>
            </div>

            {/* 10. Pending Loan */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#8b5cf6' }}>10. Pending Loan Ledger</span>
                <span className="badge badge--info">Ledger</span>
              </div>
              <div style={{ background: 'var(--color-background)', padding: '0.65rem', borderRadius: '8px', fontFamily: 'monospace', fontWeight: 700, fontSize: '0.85rem', border: '1px solid var(--color-border)', marginBottom: '0.5rem' }}>
                Pending Amount = Loan Amount − Returned Amount
              </div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', margin: 0 }}>
                Auto-updates loan status to CLOSED when pending balance reaches ₹0.
              </p>
            </div>

            {/* 11. Auto Carry Forward */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#10b981' }}>11. Auto-Carry Forward Rule</span>
                <span className="badge badge--success">Automated</span>
              </div>
              <div style={{ background: 'var(--color-background)', padding: '0.65rem', borderRadius: '8px', fontFamily: 'monospace', fontWeight: 700, fontSize: '0.8rem', border: '1px solid var(--color-border)', marginBottom: '0.5rem' }}>
                Next Day Opening = Previous Day Closing Balance
              </div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', margin: 0 }}>
                Automatically prefills tomorrow's opening cash & bank drawer.
              </p>
            </div>

          </div>

          {/* Interactive Live Finance Calculator */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '1.35rem' }}>🧮</span>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>Interactive Live Finance Calculator</h2>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: '1.25rem' }}>
              Enter sample numbers below to verify live step-by-step mathematical proof of background calculations.
            </p>

            {/* Calculator Inputs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <label className="input-label">Opening Cash (₹)</label>
                <input
                  type="number"
                  className="input"
                  value={calcOpeningCash}
                  onChange={(e) => setCalcOpeningCash(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="input-label">Opening Bank (₹)</label>
                <input
                  type="number"
                  className="input"
                  value={calcOpeningBank}
                  onChange={(e) => setCalcOpeningBank(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="input-label">Cash Sales (₹)</label>
                <input
                  type="number"
                  className="input"
                  value={calcCashSales}
                  onChange={(e) => setCalcCashSales(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="input-label">UPI Sales (₹)</label>
                <input
                  type="number"
                  className="input"
                  value={calcUpiSales}
                  onChange={(e) => setCalcUpiSales(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="input-label">Material Purchase (₹)</label>
                <input
                  type="number"
                  className="input"
                  value={calcMaterialExp}
                  onChange={(e) => setCalcMaterialExp(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="input-label">Shop Overhead (₹)</label>
                <input
                  type="number"
                  className="input"
                  value={calcShopExp}
                  onChange={(e) => setCalcShopExp(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="input-label">Fixed Rent/Util (₹)</label>
                <input
                  type="number"
                  className="input"
                  value={calcFixedExp}
                  onChange={(e) => setCalcFixedExp(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="input-label">Cash Drawings (₹)</label>
                <input
                  type="number"
                  className="input"
                  value={calcCashDrawings}
                  onChange={(e) => setCalcCashDrawings(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="input-label">UPI Drawings (₹)</label>
                <input
                  type="number"
                  className="input"
                  value={calcUpiDrawings}
                  onChange={(e) => setCalcUpiDrawings(Number(e.target.value))}
                />
              </div>
            </div>

            {/* Live Calculation Proof Results */}
            <div style={{ background: 'var(--color-surface-hover)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
                🔍 Live Step-by-Step Background Calculation Proof:
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                <span>1. Total Sales = {fmtCurrency(calcCashSales)} (Cash) + {fmtCurrency(calcUpiSales)} (UPI)</span>
                <strong>= {fmtCurrency(calcTotalSales)}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                <span>2. Gross Profit = {fmtCurrency(calcTotalSales)} − {fmtCurrency(calcMaterialExp)} (Material)</span>
                <strong style={{ color: 'var(--color-success)' }}>= {fmtCurrency(calcGrossProfit)}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                <span>3. Total Business Expenses = {fmtCurrency(calcMaterialExp)} + {fmtCurrency(calcShopExp)} + {fmtCurrency(calcFixedExp)}</span>
                <strong style={{ color: '#ef4444' }}>= {fmtCurrency(calcTotalAllExp)}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', fontWeight: 800, background: 'var(--color-background)', padding: '0.5rem 0.75rem', borderRadius: '8px' }}>
                <span>4. Net Business Profit = {fmtCurrency(calcTotalSales)} − {fmtCurrency(calcTotalAllExp)}</span>
                <span style={{ color: calcNetProfit >= 0 ? 'var(--color-success)' : '#ef4444' }}>= {fmtCurrency(calcNetProfit)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                <span>5. Profit Margin % = ({fmtCurrency(calcNetProfit)} / {fmtCurrency(calcTotalSales)}) × 100</span>
                <strong style={{ color: 'var(--color-primary)' }}>= {calcProfitMargin.toFixed(1)}%</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                <span>6. Expense Ratio % = ({fmtCurrency(calcTotalAllExp)} / {fmtCurrency(calcTotalSales)}) × 100</span>
                <strong style={{ color: '#f59e0b' }}>= {calcExpenseRatio.toFixed(1)}%</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                <span>7. Closing Cash Drawer = {fmtCurrency(calcOpeningCash)} + {fmtCurrency(calcCashSales)} − Expenses & Drawings</span>
                <strong>= {fmtCurrency(calcClosingCash)}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                <span>8. Closing Bank Account = {fmtCurrency(calcOpeningBank)} + {fmtCurrency(calcUpiSales)} − Expenses & Drawings</span>
                <strong>= {fmtCurrency(calcClosingBank)}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', fontWeight: 900, paddingTop: '0.5rem', borderTop: '1px dashed var(--color-border)' }}>
                <span>9. Total Cash Available = {fmtCurrency(calcClosingCash)} + {fmtCurrency(calcClosingBank)}</span>
                <span style={{ color: 'var(--color-primary)' }}>= {fmtCurrency(calcTotalClosing)}</span>
              </div>

              <div style={{ fontSize: '0.8125rem', color: 'var(--color-warning)', fontWeight: 600, background: 'rgba(245, 158, 11, 0.1)', padding: '0.5rem 0.75rem', borderRadius: '8px', marginTop: '0.25rem' }}>
                🛡️ Proof of Personal Isolation: Personal drawings total {fmtCurrency(calcTotalDrawings)}. Notice how Net Business Profit remains exactly {fmtCurrency(calcNetProfit)} and is untouched by personal drawings.
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

export default Settings;
