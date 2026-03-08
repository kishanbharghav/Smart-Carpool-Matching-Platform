import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      login(data.user, data.token);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell">
      <header className="app-brand-bar">
        <div>
          <div className="app-brand-title">SRM Carpool</div>
          <div className="app-brand-subtitle">Log in with your SRM email to start sharing rides.</div>
        </div>
        <div className="app-chip">SRM students only</div>
      </header>

      <main className="app-main-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ maxWidth: 420, width: '100%' }}>
          <div className="card-elevated">
            <h2>Welcome back</h2>
            <p className="helper-text">
              Use your SRM college email (<code>@srmist.edu.in</code>) that you registered with.
            </p>
            {error && <p className="field-error">{error}</p>}
            <form onSubmit={handleSubmit}>
              <label className="field-label" htmlFor="login-email">
                SRM email
              </label>
              <input
                id="login-email"
                type="email"
                placeholder="you@srmist.edu.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="text-input"
              />

              <label className="field-label" htmlFor="login-password" style={{ marginTop: 12 }}>
                Password
              </label>
              <input
                id="login-password"
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="text-input"
              />

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{ width: '100%', marginTop: 16 }}
              >
                {loading ? 'Logging in…' : 'Login'}
              </button>
            </form>

            <p style={{ marginTop: 18, fontSize: 14, color: '#9ca3af' }}>
              New here?{' '}
              <Link to="/register">
                Create an SRM Carpool account
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
