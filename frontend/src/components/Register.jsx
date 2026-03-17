import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'passenger' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', form);
      login(data.data.user, data.token);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.errors?.[0]?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-radial flex-center" style={{ minHeight: '100vh', padding: '1.5rem' }}>
      <div style={{ maxWidth: '460px', width: '100%' }} className="animate-slide-up">
        
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 className="text-title text-gradient" style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Join the Network</h1>
          <p className="text-muted">Create your SRM Carpool account</p>
        </div>

        <Card>
          <p className="text-sm text-muted" style={{ marginBottom: '1.5rem' }}>
            Requires official SRM university ID (<code>@srmist.edu.in</code> or <code>@srmuniv.edu.in</code>)
          </p>
          
          {error && (
            <div style={{ padding: '0.75rem', background: 'var(--pk-danger-bg)', color: 'var(--pk-danger)', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="grid-cols-2" style={{ gap: '1rem', gridTemplateColumns: '1fr' }}>
               <Input label="Full Name" name="name" type="text" placeholder="John Doe" value={form.name} onChange={handleChange} required />
               <Input label="SRM Email" name="email" type="email" placeholder="you@srmist.edu.in" value={form.email} onChange={handleChange} required />
               <Input label="Password" name="password" type="password" placeholder="Create a password (min 6 chars)" value={form.password} onChange={handleChange} required />
               
               <div className="form-group">
                 <label className="form-label">Primary Role</label>
                 <select name="role" value={form.role} onChange={handleChange} className="form-input" style={{ appearance: 'auto' }}>
                    <option value="passenger">Passenger (Looking for rides)</option>
                    <option value="driver">Driver (Offering rides)</option>
                 </select>
               </div>
            </div>

            <Button type="submit" isLoading={loading} style={{ width: '100%', marginTop: '1.5rem' }}>
              Register Account
            </Button>
          </form>

          <p className="text-sm flex-center" style={{ marginTop: '1.5rem', gap: '0.5rem' }}>
            <span className="text-muted">Already have an account?</span>
            <Link to="/login" style={{ fontWeight: 500 }}>Login here</Link>
          </p>
        </Card>
        
      </div>
    </div>
  );
}
