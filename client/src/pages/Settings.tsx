import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '../api/client';
import { useShopStore } from '../stores/useShopStore';

function Settings() {
  const queryClient = useQueryClient();
  const addToast = useShopStore((s) => s.addToast);
  const { theme, toggleTheme } = useShopStore();

  const todayStr = new Date().toISOString().slice(0, 10);
  const firstDayStr = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

  const [activeTab, setActiveTab] = useState<'profile' | 'formulas' | 'cleanup'>('profile');

  const [form, setForm] = useState({
    name: '',
    ownerName: '',
    email: '',
    currency: 'INR',
  });

  // Date Range Deletion State
  const [deleteRange, setDeleteRange] = useState({
    from: firstDayStr,
    to: todayStr,
  });
  const [showRangeModal, setShowRangeModal] = useState(false);

  // Entire Shop Data Wipe State
  const [showWipeModal, setShowWipeModal] = useState(false);
  const [wipeInput, setWipeInput] = useState('');

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

  // Delete Data Range Mutation
  const deleteRangeMutation = useMutation({
    mutationFn: (data: { from: string; to: string }) => settingsApi.deleteDataRange(data),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries();
      addToast('success', res.message || 'Data in selected range deleted successfully');
      setShowRangeModal(false);
    },
    onError: (err: any) => {
      addToast('error', err.message || 'Failed to delete date range data');
    },
  });

  // Wipe All Data Mutation
  const wipeAllDataMutation = useMutation({
    mutationFn: (confirmText: string) => settingsApi.wipeAllData({ confirmText }),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries();
      addToast('success', res.message || 'Entire shop database successfully reset to 0');
      setShowWipeModal(false);
      setWipeInput('');
    },
    onError: (err: any) => {
      addToast('error', err.message || 'Failed to wipe shop data');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(form);
  };

  const fmtCurrency = (val: number) => `₹${val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="page-container" style={{ paddingBottom: '3rem', width: '100%', boxSizing: 'border-box' }}>
      <div className="page-header" style={{ flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem', width: '100%' }}>
        <div>
          <h1 className="page-title" style={{ fontSize: '1.4rem' }}>⚙️ Settings & Data Cleanup</h1>
          <p className="page-subtitle">Manage shop profile, view accounting formulas, or remove transaction data</p>
        </div>

        {/* Side-Scrollable Horizontal Tab Switcher for Mobile & Desktop */}
        <div className="tab-scroll-container">
          <button
            type="button"
            className={`btn btn--sm tab-btn-item ${activeTab === 'profile' ? 'btn--primary' : 'btn--outline'}`}
            onClick={() => setActiveTab('profile')}
          >
            ⚙️ Shop Profile
          </button>
          <button
            type="button"
            className={`btn btn--sm tab-btn-item ${activeTab === 'formulas' ? 'btn--primary' : 'btn--outline'}`}
            onClick={() => setActiveTab('formulas')}
          >
            🧮 Accounting Formulas
          </button>
          <button
            type="button"
            className={`btn btn--sm tab-btn-item ${activeTab === 'cleanup' ? 'btn--primary' : 'btn--outline'}`}
            style={activeTab === 'cleanup' ? { background: '#ef4444', borderColor: '#ef4444', color: '#fff' } : {}}
            onClick={() => setActiveTab('cleanup')}
          >
            🗑️ Data Cleanup & Reset
          </button>
        </div>
      </div>

      {activeTab === 'profile' ? (
        <div style={{ maxWidth: 650, width: '100%', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
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
      ) : activeTab === 'formulas' ? (
        /* Accounting Formulas & Live Calculator Tab */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
          
          {/* Header Banner */}
          <div className="card" style={{ background: 'linear-gradient(135deg, var(--color-surface) 0%, var(--color-surface-hover) 100%)', borderLeft: '4px solid var(--color-primary)' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, marginBottom: '0.35rem', color: 'var(--color-primary)' }}>
              📖 Background Accounting Formulas & Cash Flow Logic
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.5 }}>
              Below are all 11 accounting formulas and real-time cash/bank drawer tracking logic applied across Tea Bhatti Cafe.
            </p>
          </div>

          {/* Real-Life Opening & Closing Cash Flow Example Card */}
          <div className="card" style={{ borderLeft: '4px solid var(--color-success)', background: 'var(--color-surface)' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '0.75rem', color: 'var(--color-success)' }}>
              💡 Real-World Example: How Opening, Spending, Sales & Closing Work
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.85rem' }}>
              <div style={{ background: 'var(--color-background)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                <strong>1. Opening State (Day Start):</strong><br />
                • Opening Cash Drawer = <strong>₹100</strong><br />
                • Opening Bank Account = <strong>₹100</strong><br />
                • Total Opening Funds = <strong>₹200</strong>
              </div>

              <div style={{ background: 'var(--color-background)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                <strong>2. Daily Activity & Transactions:</strong><br />
                • 🛒 Market Supplies Expense: Spent <strong>₹50 Online</strong> → Bank drops from ₹100 to <strong>₹50</strong><br />
                • 💰 Customer Sale Received: Collected <strong>₹200 Online</strong> → Bank increases from ₹50 to <strong>₹250</strong><br />
                • 💵 Cash Activity: Spent <strong>₹0 Cash</strong> → Cash remains <strong>₹100</strong>
              </div>

              <div style={{ background: 'var(--color-background)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                <strong>3. Today's Closing Balances:</strong><br />
                • Closing Bank Account = ₹100 (Opening) − ₹50 (Online Exp) + ₹200 (Online Sale) = <strong style={{ color: 'var(--color-primary)' }}>₹250</strong><br />
                • Closing Cash Drawer = ₹100 (Opening) − ₹0 (Cash Exp) + ₹0 (Cash Sale) = <strong style={{ color: 'var(--color-success)' }}>₹100</strong><br />
                • Total Cash Available = ₹250 + ₹100 = <strong style={{ color: 'var(--color-primary)', fontSize: '1rem' }}>₹350</strong>
              </div>

              <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--color-success)', color: 'var(--color-text)' }}>
                🔄 <strong>Automatic Continuous Carry Forward to Tomorrow:</strong><br />
                Tomorrow automatically opens with <strong>₹250 Bank</strong> and <strong>₹100 Cash</strong> (₹350 Total). From ₹350, any new cash expenses reduce Cash, any online expenses reduce Bank, and any new sales add to Cash or Bank continuously!
              </div>
            </div>
          </div>

          {/* Grid of 11 Formulas */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
            
            {/* 1. Total Sales */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--color-success)' }}>1. Total Sales Revenue</span>
                <span className="badge badge--success">Income</span>
              </div>
              <div style={{ background: 'var(--color-background)', padding: '0.65rem', borderRadius: '8px', fontFamily: 'monospace', fontWeight: 700, fontSize: '0.85rem', border: '1px solid var(--color-border)', marginBottom: '0.5rem' }}>
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
              <div style={{ background: 'var(--color-background)', padding: '0.65rem', borderRadius: '8px', fontFamily: 'monospace', fontWeight: 700, fontSize: '0.85rem', border: '1px solid var(--color-border)', marginBottom: '0.5rem' }}>
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
              <div style={{ background: 'var(--color-background)', padding: '0.65rem', borderRadius: '8px', fontFamily: 'monospace', fontWeight: 700, fontSize: '0.85rem', border: '1px solid var(--color-border)', marginBottom: '0.5rem' }}>
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
              <div style={{ background: 'var(--color-background)', padding: '0.65rem', borderRadius: '8px', fontFamily: 'monospace', fontWeight: 700, fontSize: '0.78rem', border: '1px solid var(--color-border)', marginBottom: '0.5rem' }}>
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
              <div style={{ background: 'var(--color-background)', padding: '0.65rem', borderRadius: '8px', fontFamily: 'monospace', fontWeight: 700, fontSize: '0.78rem', border: '1px solid var(--color-border)', marginBottom: '0.5rem' }}>
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
        </div>
      ) : (
        /* Data Cleanup & Deletion Tab (Mobile Optimized) */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: 800, width: '100%', boxSizing: 'border-box' }}>
          
          {/* Header Banner */}
          <div className="card" style={{ background: 'rgba(239, 68, 68, 0.05)', borderLeft: '4px solid #ef4444', width: '100%', boxSizing: 'border-box' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, marginBottom: '0.35rem', color: '#dc2626' }}>
              🗑️ Data Cleanup & Removal Management
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.5 }}>
              Use the tools below to delete data for a specific date range or reset your entire database cleanly back to zero.
            </p>
          </div>

          {/* Option A: Delete Data by Date Range */}
          <div className="card" style={{ border: '1px solid var(--color-border)', width: '100%', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '1.2rem' }}>📅</span>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>Option A: Delete Data by Specific Date Range</h3>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '1rem', lineHeight: 1.4 }}>
              Select a start date (From) and end date (To) to delete all sales, expenses, withdrawals, loans, and daily balances recorded within that specific time period.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', marginBottom: '1rem', width: '100%' }}>
              <div className="input-group">
                <label className="input-label" style={{ fontSize: '0.8rem' }}>Start Date (From)</label>
                <input
                  type="date"
                  className="input"
                  style={{ width: '100%', boxSizing: 'border-box' }}
                  value={deleteRange.from}
                  onChange={(e) => setDeleteRange({ ...deleteRange, from: e.target.value })}
                />
              </div>

              <div className="input-group">
                <label className="input-label" style={{ fontSize: '0.8rem' }}>End Date (To)</label>
                <input
                  type="date"
                  className="input"
                  style={{ width: '100%', boxSizing: 'border-box' }}
                  value={deleteRange.to}
                  onChange={(e) => setDeleteRange({ ...deleteRange, to: e.target.value })}
                />
              </div>
            </div>

            <button
              type="button"
              className="btn"
              style={{
                width: '100%',
                background: '#f97316',
                borderColor: '#f97316',
                color: '#fff',
                fontWeight: 700,
                whiteSpace: 'normal',
                wordBreak: 'break-word',
                padding: '0.75rem 1rem',
                textAlign: 'center',
                lineHeight: 1.3,
                fontSize: '0.875rem',
              }}
              onClick={() => {
                if (!deleteRange.from || !deleteRange.to) {
                  addToast('warning', 'Please select both start and end dates');
                  return;
                }
                setShowRangeModal(true);
              }}
            >
              🗓️ Delete Data in Range ({deleteRange.from} to {deleteRange.to})
            </button>
          </div>

          {/* Option B: Wipe Entire Shop Data */}
          <div className="card" style={{ border: '1px solid #fca5a5', background: 'rgba(254, 226, 226, 0.2)', width: '100%', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '1.2rem' }}>🔥</span>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: '#dc2626' }}>Option B: Reset & Wipe ENTIRE Shop Database</h3>
            </div>
            <p style={{ fontSize: '0.85rem', color: '#991b1b', marginBottom: '1rem', lineHeight: 1.4 }}>
              <strong>DANGER ZONE</strong>: Permanently erases <strong>ALL</strong> sales, material expenses, shop expenses, misc expenses, withdrawals, loans, and daily balance entries, resetting database balances cleanly back to <strong>₹0.00</strong>.
            </p>

            <button
              type="button"
              className="btn"
              style={{
                width: '100%',
                background: '#dc2626',
                borderColor: '#dc2626',
                color: '#fff',
                fontWeight: 800,
                whiteSpace: 'normal',
                wordBreak: 'break-word',
                padding: '0.75rem 1rem',
                textAlign: 'center',
                fontSize: '0.875rem',
                lineHeight: 1.3,
              }}
              onClick={() => setShowWipeModal(true)}
            >
              💣 Reset Entire Database to 0 (Wipe All Shop Data)
            </button>
          </div>

        </div>
      )}

      {/* Date Range Delete Confirmation Modal */}
      {showRangeModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '92vw', width: 450, padding: '1.25rem' }}>
            <div className="modal__header">
              <h3 className="modal__title" style={{ color: '#f97316', fontSize: '1.05rem' }}>🗓️ Confirm Date Range Deletion</h3>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowRangeModal(false)}>✕</button>
            </div>
            <div className="modal__body" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text)', margin: 0 }}>
                You are about to delete <strong>ALL sales, expenses, withdrawals, loans, and balances</strong> recorded between:
              </p>
              <div style={{ background: 'var(--color-background)', padding: '0.65rem', borderRadius: '8px', fontWeight: 700, textAlign: 'center', fontSize: '0.9rem', border: '1px solid var(--color-border)' }}>
                {deleteRange.from}  ➔  {deleteRange.to}
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', margin: 0 }}>
                This action cannot be undone. Are you sure you want to proceed?
              </p>
            </div>
            <div className="modal__footer" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
              <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowRangeModal(false)}>Cancel</button>
              <button
                type="button"
                className="btn"
                style={{ background: '#f97316', borderColor: '#f97316', color: '#fff', flex: 1 }}
                disabled={deleteRangeMutation.isPending}
                onClick={() => deleteRangeMutation.mutate({ from: deleteRange.from, to: deleteRange.to })}
              >
                {deleteRangeMutation.isPending ? 'Deleting...' : 'Confirm Deletion'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Entire Data Wipe Confirmation Modal */}
      {showWipeModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '92vw', width: 480, padding: '1.25rem' }}>
            <div className="modal__header">
              <h3 className="modal__title" style={{ color: '#dc2626', fontSize: '1.05rem' }}>💣 Confirm Full Database Reset</h3>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setShowWipeModal(false); setWipeInput(''); }}>✕</button>
            </div>
            <div className="modal__body" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <p style={{ fontSize: '0.875rem', color: '#991b1b', margin: 0, fontWeight: 600 }}>
                ⚠️ WARNING: This will permanently delete EVERY transaction record in your shop account!
              </p>
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', margin: 0 }}>
                To prevent accidental deletion, type <strong style={{ color: '#dc2626' }}>DELETE</strong> in the box below:
              </p>

              <div className="input-group">
                <input
                  type="text"
                  className="input"
                  style={{ width: '100%', boxSizing: 'border-box' }}
                  placeholder="Type DELETE to confirm"
                  value={wipeInput}
                  onChange={(e) => setWipeInput(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
            <div className="modal__footer" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
              <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => { setShowWipeModal(false); setWipeInput(''); }}>Cancel</button>
              <button
                type="button"
                className="btn"
                style={{ background: '#dc2626', borderColor: '#dc2626', color: '#fff', fontWeight: 800, flex: 1 }}
                disabled={wipeInput !== 'DELETE' || wipeAllDataMutation.isPending}
                onClick={() => wipeAllDataMutation.mutate(wipeInput)}
              >
                {wipeAllDataMutation.isPending ? 'Resetting...' : 'Reset Database'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default Settings;
