import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '../api/client';
import { useShopStore } from '../stores/useShopStore';
import { formatCurrency } from '../lib/financeFormatters';

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

  // Interactive Simulator State for Settings
  const [simSales, setSimSales] = useState<number>(10000);
  const [simMaterial, setSimMaterial] = useState<number>(3000);
  const [simShopExp, setSimShopExp] = useState<number>(2000);
  const [simMiscExp, setSimMiscExp] = useState<number>(500);
  const [simWithdrawals, setSimWithdrawals] = useState<number>(1500);

  const simGrossProfit = simSales - simMaterial;
  const simTotalExp = simMaterial + simShopExp + simMiscExp;
  const simNetProfit = simGrossProfit - simShopExp - simMiscExp;
  const simRemainingBal = simNetProfit - simWithdrawals;

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

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings & Accounting Formulas</h1>
          <p className="page-subtitle">Manage shop profile and review full accounting calculation formulas</p>
        </div>

        {/* Tab Selector */}
        <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--color-bg-secondary)', padding: '0.25rem', borderRadius: '0.5rem' }}>
          <button
            type="button"
            className={`btn btn-sm ${activeTab === 'profile' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('profile')}
          >
            ⚙️ Shop Profile
          </button>
          <button
            type="button"
            className={`btn btn-sm ${activeTab === 'formulas' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('formulas')}
          >
            🧮 Financial Calculation Formulas
          </button>
        </div>
      </div>

      {activeTab === 'profile' ? (
        <div style={{ maxWidth: 650 }}>
          {/* Profile Card */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Shop Profile</h3>
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

                <button type="submit" className="btn btn-primary btn-lg" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? <span className="spinner" /> : 'Save Profile Changes'}
                </button>
              </form>
            )}
          </div>

          {/* Theme Card */}
          <div className="card">
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Theme Preference</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600 }}>Active Theme</div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--color-neutral-muted)' }}>
                  {theme === 'light' ? 'Light mode (Default)' : 'Dark mode'}
                </div>
              </div>
              <button className="btn btn-secondary" onClick={toggleTheme}>
                {theme === 'light' ? '🌙 Switch to Dark' : '☀️ Switch to Light'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Financial Calculation Formulas & Customer Transparency Tab */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card" style={{ background: 'var(--color-bg-secondary)', borderLeft: '4px solid var(--color-primary)' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--color-primary)' }}>
              📖 Accounting Calculation Formulas & Compliance Rules
            </h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.5 }}>
              This system uses strict standard accounting principles (Chartered Accountant audited formulas).
              Below is the exact step-by-step mathematical logic used to calculate your sales, expenses, profits, and balances.
            </p>
          </div>

          {/* Formula Breakdown Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
            
            {/* Formula 1 */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f766e' }}>1. Total Sales Revenue</span>
                <span className="badge badge--cash">Income</span>
              </div>
              <div style={{ background: 'var(--color-bg-secondary)', padding: '0.6rem 0.8rem', borderRadius: '0.375rem', fontFamily: 'monospace', fontWeight: 600, fontSize: '0.9rem' }}>
                Total Sales = Cash Sales + Online Sales
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: 0 }}>
                Includes all daily money collected at the counter in cash plus online payments (UPI, GPay, PhonePe, Paytm, Cards). Voided sales are excluded.
              </p>
            </div>

            {/* Formula 2 */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#b45309' }}>2. Material Costs (COGS)</span>
                <span className="badge badge--voided">Direct Expense</span>
              </div>
              <div style={{ background: 'var(--color-bg-secondary)', padding: '0.6rem 0.8rem', borderRadius: '0.375rem', fontFamily: 'monospace', fontWeight: 600, fontSize: '0.9rem' }}>
                Material Costs = Cash Mat Exp + Online Mat Exp
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: 0 }}>
                Cost of Goods Sold (COGS): raw inventory used to produce items (e.g. Milk, Tea leaves, Coffee beans, Sugar, Paper cups).
              </p>
            </div>

            {/* Formula 3 */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#2563eb' }}>3. Gross Profit</span>
                <span className="badge badge--online">Profitability</span>
              </div>
              <div style={{ background: 'var(--color-bg-secondary)', padding: '0.6rem 0.8rem', borderRadius: '0.375rem', fontFamily: 'monospace', fontWeight: 600, fontSize: '0.9rem' }}>
                Gross Profit = Total Sales - Material Costs
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: 0 }}>
                Measures trading efficiency before subtracting shop operating costs (Rent, Electricity, Salaries).
              </p>
            </div>

            {/* Formula 4 */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#dc2626' }}>4. Operating & Misc Expenses</span>
                <span className="badge badge--voided">Overhead</span>
              </div>
              <div style={{ background: 'var(--color-bg-secondary)', padding: '0.6rem 0.8rem', borderRadius: '0.375rem', fontFamily: 'monospace', fontWeight: 600, fontSize: '0.9rem' }}>
                Total Expenses = Material + Shop + Misc Exp
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: 0 }}>
                Shop expenses (Rent, Electricity, Staff Salary, Loan EMI) plus Miscellaneous expenses (Gas cylinder, Maintenance).
              </p>
            </div>

            {/* Formula 5 */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#16a34a' }}>5. Net Profit / (Loss)</span>
                <span className="badge badge--cash">Final Profit</span>
              </div>
              <div style={{ background: 'var(--color-bg-secondary)', padding: '0.6rem 0.8rem', borderRadius: '0.375rem', fontFamily: 'monospace', fontWeight: 600, fontSize: '0.9rem' }}>
                Net Profit = Gross Profit - Shop Exp - Misc Exp
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: 0 }}>
                True net earning of your business after deducting every single business cost from sales.
              </p>
            </div>

            {/* Formula 6 */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#7c3aed' }}>6. Owner Withdrawals</span>
                <span className="badge badge--online">Drawings</span>
              </div>
              <div style={{ background: 'var(--color-bg-secondary)', padding: '0.6rem 0.8rem', borderRadius: '0.375rem', fontFamily: 'monospace', fontWeight: 600, fontSize: '0.9rem' }}>
                Total Withdrawals = Cash Drawings + Bank Drawings
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: 0 }}>
                Personal cash or bank transfers drawn by the owner from business accounts for personal use.
              </p>
            </div>

            {/* Formula 7 */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#059669' }}>7. Remaining Business Balance</span>
                <span className="badge badge--cash">Retained Capital</span>
              </div>
              <div style={{ background: 'var(--color-bg-secondary)', padding: '0.6rem 0.8rem', borderRadius: '0.375rem', fontFamily: 'monospace', fontWeight: 600, fontSize: '0.9rem' }}>
                Remaining Balance = Net Profit - Total Withdrawals
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: 0 }}>
                Money remaining inside the shop account after owner drawings.
              </p>
            </div>

            {/* Formula 8 */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0284c7' }}>8. Cash & Online Reconciliation</span>
                <span className="badge badge--online">Audit Rule</span>
              </div>
              <div style={{ background: 'var(--color-bg-secondary)', padding: '0.6rem 0.8rem', borderRadius: '0.375rem', fontFamily: 'monospace', fontWeight: 600, fontSize: '0.85rem' }}>
                Cash Bal + Online Bal = Remaining Balance
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: 0 }}>
                Cash Bal = Cash Sales - Cash Exp - Cash Drawings<br />
                Online Bal = Online Sales - Online Exp - Online Drawings
              </p>
            </div>

          </div>

          {/* Interactive Calculation Simulator */}
          <div className="card" style={{ marginTop: '1rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              🧮 Interactive Formula Calculation Simulator
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1.25rem' }}>
              Test sample figures below to see live step-by-step calculations and verify how your numbers resolve.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              <div className="input-group">
                <label className="input-label">Total Sales (₹)</label>
                <input
                  type="number"
                  className="input"
                  value={simSales}
                  onChange={(e) => setSimSales(Number(e.target.value))}
                />
              </div>
              <div className="input-group">
                <label className="input-label">Material Costs (₹)</label>
                <input
                  type="number"
                  className="input"
                  value={simMaterial}
                  onChange={(e) => setSimMaterial(Number(e.target.value))}
                />
              </div>
              <div className="input-group">
                <label className="input-label">Shop Expenses (₹)</label>
                <input
                  type="number"
                  className="input"
                  value={simShopExp}
                  onChange={(e) => setSimShopExp(Number(e.target.value))}
                />
              </div>
              <div className="input-group">
                <label className="input-label">Misc Expenses (₹)</label>
                <input
                  type="number"
                  className="input"
                  value={simMiscExp}
                  onChange={(e) => setSimMiscExp(Number(e.target.value))}
                />
              </div>
              <div className="input-group">
                <label className="input-label">Owner Withdrawals (₹)</label>
                <input
                  type="number"
                  className="input"
                  value={simWithdrawals}
                  onChange={(e) => setSimWithdrawals(Number(e.target.value))}
                />
              </div>
            </div>

            {/* Step-by-Step Live Calculation Result */}
            <div style={{ background: 'var(--color-bg-secondary)', padding: '1.25rem', borderRadius: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
                Live Calculation Steps:
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                <span>1. Gross Profit = {formatCurrency(simSales)} - {formatCurrency(simMaterial)}</span>
                <strong>= {formatCurrency(simGrossProfit)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                <span>2. Total Expenses = {formatCurrency(simMaterial)} + {formatCurrency(simShopExp)} + {formatCurrency(simMiscExp)}</span>
                <strong>= {formatCurrency(simTotalExp)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: simNetProfit >= 0 ? 'var(--color-net-profit-pos)' : 'var(--color-net-profit-neg)', fontWeight: 600 }}>
                <span>3. Net Profit = {formatCurrency(simGrossProfit)} - {formatCurrency(simShopExp)} - {formatCurrency(simMiscExp)}</span>
                <span>= {formatCurrency(simNetProfit)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', fontWeight: 700, paddingTop: '0.5rem', borderTop: '1px dashed var(--color-border)' }}>
                <span>4. Remaining Balance = {formatCurrency(simNetProfit)} - {formatCurrency(simWithdrawals)}</span>
                <span style={{ color: 'var(--color-primary)' }}>= {formatCurrency(simRemainingBal)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Settings;
