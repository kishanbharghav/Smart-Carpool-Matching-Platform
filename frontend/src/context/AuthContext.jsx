import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { setAuthToken } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setTokenState] = useState(() => localStorage.getItem('carpool_token'));

  const setToken = useCallback((newToken) => {
    setTokenState(newToken);
    if (newToken) localStorage.setItem('carpool_token', newToken);
    else localStorage.removeItem('carpool_token');
    setAuthToken(newToken);
  }, []);

  useEffect(() => {
    setAuthToken(token);
    if (!token) {
      setUser(null);
      return;
    }
    const controller = new AbortController();
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setUser)
      .catch(() => {
        setToken(null);
        setUser(null);
      });
    return () => controller.abort();
  }, [token, setToken]);

  useEffect(() => {
    const handleLogout = () => {
      setToken(null);
      setUser(null);
      window.location.href = '/login';
    };
    window.addEventListener('carpool:auth:logout', handleLogout);
    return () => window.removeEventListener('carpool:auth:logout', handleLogout);
  }, [setToken]);

  const login = useCallback((userData, newToken) => {
    setUser(userData);
    setToken(newToken);
  }, [setToken]);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
  }, [setToken]);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, setToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
