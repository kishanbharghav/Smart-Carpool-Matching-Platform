import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

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
      login(data.data.user, data.token);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-radial flex-center" style={{ minHeight: '100vh', padding: '1.5rem' }}>
      <div style={{ maxWidth: '420px', width: '100%' }} className="animate-slide-up">
        
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 className="text-title text-gradient" style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Carpool v2</h1>
          <p className="text-muted">SRM University Student Rideshare</p>
        </div>

        <Card>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Welcome back</h2>
          <p className="text-sm text-muted" style={{ marginBottom: '1.5rem' }}>
            Login with your official SRM email address.
          </p>
          
          {error && (
            <div style={{ padding: '0.75rem', background: 'var(--pk-danger-bg)', color: 'var(--pk-danger)', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <Input
              label="SRM Email"
              type="email"
              placeholder="you@srmist.edu.in"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            
            <Input
              label="Password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <Button type="submit" isLoading={loading} style={{ width: '100%', marginTop: '0.5rem' }}>
              Login to Account
            </Button>
          </form>

          <p className="text-sm flex-center" style={{ marginTop: '1.5rem', gap: '0.5rem' }}>
            <span className="text-muted">New to Carpool?</span>
            <Link to="/register" style={{ fontWeight: 500 }}>Create an account</Link>
          </p>
        </Card>
        
      </div>
    </div>
  );
}
