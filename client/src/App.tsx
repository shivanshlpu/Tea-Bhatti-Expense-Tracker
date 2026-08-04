import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './stores/useAuthStore';
import { useShopStore } from './stores/useShopStore';
import { useEffect } from 'react';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Sales from './pages/Sales';
import ExpensesMaterial from './pages/ExpensesMaterial';
import ExpensesShop from './pages/ExpensesShop';
import ExpensesMisc from './pages/ExpensesMisc';
import Withdrawals from './pages/Withdrawals';
import Analytics from './pages/Analytics';
import Reports from './pages/Reports';
import Assistant from './pages/Assistant';
import Settings from './pages/Settings';
import Layout from './components/Layout';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes instant cache
      gcTime: 15 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false, // Prevent laggy background re-fetches
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

  // Apply theme on mount
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

          {/* Protected routes with sidebar layout */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="sales" element={<Sales />} />
            <Route path="expenses/material" element={<ExpensesMaterial />} />
            <Route path="expenses/shop" element={<ExpensesShop />} />
            <Route path="expenses/misc" element={<ExpensesMisc />} />
            <Route path="withdrawals" element={<Withdrawals />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="reports" element={<Reports />} />
            <Route path="assistant" element={<Assistant />} />
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
