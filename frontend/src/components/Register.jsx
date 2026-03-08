import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('passenger');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', { name, email, password, role });
      login(data.user, data.token);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell">
      <header className="app-brand-bar">
        <div>
          <div className="app-brand-title">Join SRM Carpool</div>
          <div className="app-brand-subtitle">Create an account to offer or join safe campus rides.</div>
        </div>
        <div className="app-chip">SRM email required</div>
      </header>

      <main className="app-main-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ maxWidth: 460, width: '100%' }}>
          <div className="card-elevated">
            <h2>Create your account</h2>
            <p className="helper-text">
              Use your official SRM ID (<code>@srmist.edu.in</code> or <code>@srmuniv.edu.in</code>) so only students can join.
            </p>

            {error && <p className="field-error">{error}</p>}

            <form onSubmit={handleSubmit}>
              <label className="field-label" htmlFor="reg-name">
                Full name
              </label>
              <input
                id="reg-name"
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="text-input"
              />

              <label className="field-label" htmlFor="reg-email" style={{ marginTop: 12 }}>
                SRM email
              </label>
              <input
                id="reg-email"
                type="email"
                placeholder="you@srmist.edu.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="text-input"
              />

              <label className="field-label" htmlFor="reg-password" style={{ marginTop: 12 }}>
                Password
              </label>
              <input
                id="reg-password"
                type="password"
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="text-input"
              />

              <label className="field-label" htmlFor="reg-role" style={{ marginTop: 12 }}>
                I mostly travel as
              </label>
              <select
                id="reg-role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="select-input"
              >
                <option value="passenger">Passenger</option>
                <option value="driver">Driver</option>
              </select>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{ width: '100%', marginTop: 18 }}
              >
                {loading ? 'Registering…' : 'Create account'}
              </button>
            </form>

            <p style={{ marginTop: 18, fontSize: 14, color: '#9ca3af' }}>
              Already have an account?{' '}
              <Link to="/login">
                Login instead
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
