import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './stores/useAuthStore';
import { useShopStore } from './stores/useShopStore';
import { useEffect } from 'react';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import DailyEntry from './pages/DailyEntry';
import Loans from './pages/Loans';
import Reports from './pages/Reports';
import Sales from './pages/Sales';
import ExpensesMaterial from './pages/ExpensesMaterial';
import ExpensesShop from './pages/ExpensesShop';
import ExpensesMisc from './pages/ExpensesMisc';
import Withdrawals from './pages/Withdrawals';
import Analytics from './pages/Analytics';
import Assistant from './pages/Assistant';
import Settings from './pages/Settings';
import PaymentBreakdown from './pages/PaymentBreakdown';
import Layout from './components/Layout';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 15 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: 'always',
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function App() {
  const theme = useShopStore((s) => s.theme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Navigate to="/login" replace />} />

          {/* Protected routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="daily-entry" element={<DailyEntry />} />
            <Route path="loans" element={<Loans />} />
            <Route path="reports" element={<Reports />} />
            <Route path="sales" element={<Sales />} />
            <Route path="expenses/material" element={<ExpensesMaterial />} />
            <Route path="expenses/shop" element={<ExpensesShop />} />
            <Route path="expenses/misc" element={<ExpensesMisc />} />
            <Route path="withdrawals" element={<Withdrawals />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="assistant" element={<Assistant />} />
            <Route path="payment-breakdown" element={<PaymentBreakdown />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
