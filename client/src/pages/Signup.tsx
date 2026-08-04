import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { SignupSchema } from '@shop-finance/shared';
import { authApi } from '../api/client';
import { useAuthStore } from '../stores/useAuthStore';

function Signup() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [form, setForm] = useState({
    shopName: '', ownerName: '', mobile: '', email: '', password: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setApiError('');

    const result = SignupSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err: any) => {
        fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    try {
      const response = await authApi.signup(result.data);
      setAuth(response.data.accessToken, response.data.shop);
      navigate('/');
    } catch (err: any) {
      setApiError(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [field]: e.target.value });

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--color-bg)',
      padding: '1rem',
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: 56, height: 56,
            borderRadius: 'var(--radius-lg)',
            background: 'var(--color-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1rem',
            fontSize: '1.5rem',
          }}>
            💼
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-neutral-text)' }}>
            Create Your Shop
          </h1>
          <p style={{ color: 'var(--color-neutral-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Set up your shop finance management
          </p>
        </div>

        <div className="card card-elevated" style={{ padding: '2rem' }}>
          <form onSubmit={handleSubmit}>
            {apiError && (
              <div style={{
                padding: '0.75rem 1rem',
                background: 'rgb(220 38 38 / 0.08)',
                color: 'var(--color-danger)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.875rem',
                marginBottom: '1.25rem',
                fontWeight: 500,
              }}>
                {apiError}
              </div>
            )}

            <div className="input-group" style={{ marginBottom: '1rem' }}>
              <label className="input-label" htmlFor="signup-shop-name">Shop Name</label>
              <input id="signup-shop-name" className={`input ${errors.shopName ? 'input--error' : ''}`} placeholder="e.g., Raj's Cafe" value={form.shopName} onChange={updateField('shopName')} />
              {errors.shopName && <span className="input-error-msg">{errors.shopName}</span>}
            </div>

            <div className="input-group" style={{ marginBottom: '1rem' }}>
              <label className="input-label" htmlFor="signup-owner-name">Owner Name</label>
              <input id="signup-owner-name" className={`input ${errors.ownerName ? 'input--error' : ''}`} placeholder="Your full name" value={form.ownerName} onChange={updateField('ownerName')} />
              {errors.ownerName && <span className="input-error-msg">{errors.ownerName}</span>}
            </div>

            <div className="input-group" style={{ marginBottom: '1rem' }}>
              <label className="input-label" htmlFor="signup-mobile">Mobile Number</label>
              <input id="signup-mobile" type="tel" className={`input ${errors.mobile ? 'input--error' : ''}`} placeholder="10-digit mobile" value={form.mobile} onChange={updateField('mobile')} maxLength={10} />
              {errors.mobile && <span className="input-error-msg">{errors.mobile}</span>}
            </div>

            <div className="input-group" style={{ marginBottom: '1rem' }}>
              <label className="input-label" htmlFor="signup-email">Email (optional)</label>
              <input id="signup-email" type="email" className={`input ${errors.email ? 'input--error' : ''}`} placeholder="your@email.com" value={form.email} onChange={updateField('email')} />
              {errors.email && <span className="input-error-msg">{errors.email}</span>}
            </div>

            <div className="input-group" style={{ marginBottom: '1.5rem' }}>
              <label className="input-label" htmlFor="signup-password">Password</label>
              <input id="signup-password" type="password" className={`input ${errors.password ? 'input--error' : ''}`} placeholder="Min. 8 characters" value={form.password} onChange={updateField('password')} />
              {errors.password && <span className="input-error-msg">{errors.password}</span>}
            </div>

            <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading}>
              {loading ? <span className="spinner" /> : 'Create Shop'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.875rem', color: 'var(--color-neutral-muted)' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>Sign In</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Signup;
