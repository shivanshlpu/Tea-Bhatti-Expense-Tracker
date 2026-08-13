import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';
import { useShopStore } from '../stores/useShopStore';
import { authApi } from '../api/client';

function Layout() {
  const shop = useAuthStore((s) => s.shop);
  const logout = useAuthStore((s) => s.logout);
  const { sidebarOpen, toggleSidebar, toasts, removeToast } = useShopStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore
    }
    logout();
    navigate('/login');
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`;

  return (
    <div className="app-layout">
      {/* Mobile Header Bar */}
      <header className="mobile-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <img
            src="/logo.png"
            alt="Tea Bhatti Logo"
            style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'contain', background: '#000' }}
          />
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.95rem', fontFamily: 'var(--font-heading)', color: 'var(--color-text)' }}>
              Tea Bhatti
            </div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
              Expense Tracker
            </div>
          </div>
        </div>
        <button
          onClick={toggleSidebar}
          aria-label="Toggle menu"
          style={{
            marginLeft: 'auto',
            flexShrink: 0,
            width: 40,
            height: 40,
            borderRadius: 10,
            background: 'var(--color-surface)',
            border: '1.5px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.25rem',
            color: 'var(--color-text)',
            cursor: 'pointer',
          }}
        >
          ☰
        </button>
      </header>

      {/* Mobile Drawer Overlay */}
      {sidebarOpen && (
        <div
          className="modal-overlay"
          style={{ zIndex: 45 }}
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`sidebar ${sidebarOpen ? 'sidebar--open' : ''}`}>
        <div className="sidebar__brand">
          <img
            src="/logo.png"
            alt="Tea Bhatti Logo"
            style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'contain', background: '#000', border: '1.5px solid var(--color-border)' }}
          />
          <div>
            <div className="sidebar__brand-name">Tea Bhatti</div>
            <div className="sidebar__brand-sub">Expense Tracker</div>
          </div>
        </div>

        <nav className="sidebar__nav">
          <div className="sidebar__section-title">Overview</div>
          <NavLink to="/" end className={navLinkClass} onClick={() => useShopStore.getState().setSidebarOpen(false)}>
            <span>📊</span> Dashboard
          </NavLink>
          <NavLink to="/daily-entry" className={navLinkClass} onClick={() => useShopStore.getState().setSidebarOpen(false)}>
            <span>⚡</span> Daily Entry
          </NavLink>

          <div className="sidebar__section-title">Transactions</div>
          <NavLink to="/sales" className={navLinkClass} onClick={() => useShopStore.getState().setSidebarOpen(false)}>
            <span>💰</span> Sales
          </NavLink>
          <NavLink to="/expenses/material" className={navLinkClass} onClick={() => useShopStore.getState().setSidebarOpen(false)}>
            <span>🧱</span> Material Expenses
          </NavLink>
          <NavLink to="/expenses/shop" className={navLinkClass} onClick={() => useShopStore.getState().setSidebarOpen(false)}>
            <span>🏪</span> Shop Expenses
          </NavLink>
          <NavLink to="/expenses/misc" className={navLinkClass} onClick={() => useShopStore.getState().setSidebarOpen(false)}>
            <span>📦</span> Misc Expenses
          </NavLink>
          <NavLink to="/withdrawals" className={navLinkClass} onClick={() => useShopStore.getState().setSidebarOpen(false)}>
            <span>🏧</span> Withdrawals
          </NavLink>
          <NavLink to="/loans" className={navLinkClass} onClick={() => useShopStore.getState().setSidebarOpen(false)}>
            <span>🤝</span> Loans & Ledger
          </NavLink>

          <div className="sidebar__section-title">Insights & AI</div>
          <NavLink to="/analytics" className={navLinkClass} onClick={() => useShopStore.getState().setSidebarOpen(false)}>
            <span>📈</span> Analytics
          </NavLink>
          <NavLink to="/reports" className={navLinkClass} onClick={() => useShopStore.getState().setSidebarOpen(false)}>
            <span>📄</span> Reports
          </NavLink>
          <NavLink to="/assistant" className={navLinkClass} onClick={() => useShopStore.getState().setSidebarOpen(false)}>
            <span>🤖</span> AI Assistant
          </NavLink>

          <div className="sidebar__section-title">Account</div>
          <NavLink to="/settings" className={navLinkClass} onClick={() => useShopStore.getState().setSidebarOpen(false)}>
            <span>⚙️</span> Settings
          </NavLink>
          <button
            className="sidebar__link"
            onClick={handleLogout}
            style={{
              cursor: 'pointer',
              textAlign: 'left',
              width: '100%',
              color: 'var(--color-net-profit-neg)',
              background: 'transparent',
            }}
          >
            <span>🚪</span> Logout
          </button>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <Outlet />
      </main>

      {/* Mobile Bottom Bar for native app feel */}
      <nav className="mobile-bottom-bar">
        <NavLink to="/" end className={`mobile-bottom-nav ${location.pathname === '/' ? 'active' : ''}`}>
          <span>📊</span>
          <span>Home</span>
        </NavLink>
        <NavLink to="/daily-entry" className={`mobile-bottom-nav ${location.pathname === '/daily-entry' ? 'active' : ''}`}>
          <span>⚡</span>
          <span>Daily</span>
        </NavLink>
        <NavLink to="/sales" className={`mobile-bottom-nav ${location.pathname.startsWith('/sales') ? 'active' : ''}`}>
          <span>💰</span>
          <span>Sales</span>
        </NavLink>
        <NavLink to="/expenses/material" className={`mobile-bottom-nav ${location.pathname.startsWith('/expenses') ? 'active' : ''}`}>
          <span>💸</span>
          <span>Expenses</span>
        </NavLink>
        <NavLink to="/reports" className={`mobile-bottom-nav ${location.pathname.startsWith('/reports') ? 'active' : ''}`}>
          <span>📄</span>
          <span>Reports</span>
        </NavLink>
      </nav>

      {/* Toast Notifications */}
      {toasts.length > 0 && (
        <div className="toast-container">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`toast toast--${toast.type}`}
              onClick={() => removeToast(toast.id)}
              style={{ cursor: 'pointer' }}
            >
              {toast.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Layout;
