import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LoginSchema } from '@shop-finance/shared';
import { authApi } from '../api/client';
import { useAuthStore } from '../stores/useAuthStore';

function Login() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [form, setForm] = useState({ mobile: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setApiError('');

    const result = LoginSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    try {
      const response = await authApi.login(result.data);
      setAuth(response.data.accessToken, response.data.shop);
      navigate('/');
    } catch (err: any) {
      setApiError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
    }}>
      <div style={{ width: '100%', maxWidth: 440 }}>
        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <img
            src="/logo.png"
            alt="Tea Bhatti Logo"
            style={{
              width: 80, height: 80,
              borderRadius: '20px',
              objectFit: 'contain',
              background: '#000',
              border: '2px solid var(--color-border)',
              boxShadow: 'var(--shadow-card)',
              margin: '0 auto 1rem',
              display: 'block',
            }}
          />
          <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--color-text)' }}>
            Tea Bhatti
          </h1>
          <p style={{ color: 'var(--color-brand)', fontSize: '0.9375rem', fontWeight: 800, marginTop: '0.15rem' }}>
            Expense Tracker
          </p>
        </div>

        {/* Form Sticker Card */}
        <div className="card card-elevated card-accent-violet" style={{ padding: '2.25rem' }}>
          <form onSubmit={handleSubmit}>
            {apiError && (
              <div style={{
                padding: '0.75rem 1rem',
                background: '#FFE4E6',
                color: 'var(--color-net-profit-neg)',
                border: '2px solid #1E293B',
                boxShadow: '3px 3px 0px #1E293B',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.875rem',
                fontWeight: 700,
                marginBottom: '1.25rem',
              }}>
                {apiError}
              </div>
            )}

            <div className="input-group" style={{ marginBottom: '1.25rem' }}>
              <label className="input-label" htmlFor="login-mobile">Mobile Number</label>
              <input
                id="login-mobile"
                type="tel"
                className={`input ${errors.mobile ? 'input--error' : ''}`}
                placeholder="10-digit mobile number"
                value={form.mobile}
                onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                maxLength={10}
                autoComplete="tel"
              />
              {errors.mobile && <span style={{ color: 'var(--color-net-profit-neg)', fontSize: '0.75rem', fontWeight: 700 }}>{errors.mobile}</span>}
            </div>

            <div className="input-group" style={{ marginBottom: '1.75rem' }}>
              <label className="input-label" htmlFor="login-password">Password</label>
              <input
                id="login-password"
                type="password"
                className={`input ${errors.password ? 'input--error' : ''}`}
                placeholder="Enter your password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                autoComplete="current-password"
              />
              {errors.password && <span style={{ color: 'var(--color-net-profit-neg)', fontSize: '0.75rem', fontWeight: 700 }}>{errors.password}</span>}
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              style={{ width: '100%' }}
              disabled={loading}
            >
              {loading ? <span className="spinner" /> : 'Sign In 🚀'}
            </button>
          </form>

          <div style={{
            textAlign: 'center',
            marginTop: '1.5rem',
            fontSize: '0.875rem',
            fontWeight: 600,
            color: 'var(--color-muted-foreground)',
          }}>
            Don't have an account?{' '}
            <Link to="/signup" style={{ color: 'var(--color-accent)', fontWeight: 800, textDecoration: 'none' }}>
              Create one
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
