import { createContext, useContext, useState, useCallback } from 'react';
import { BASE_URL } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,  setUser]  = useState(() => {
    try { return JSON.parse(localStorage.getItem('auth_user')); } catch { return null; }
  });
  const [token, setToken] = useState(() => localStorage.getItem('auth_token') || null);

  const _save = (u, t) => {
    setUser(u); setToken(t);
    localStorage.setItem('auth_user',  JSON.stringify(u));
    localStorage.setItem('auth_token', t);
  };

  const _clear = () => {
    setUser(null); setToken(null);
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_token');
  };

  const register = useCallback(async (name, email, password) => {
    const res  = await fetch(`${BASE_URL}/auth/register`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ name, email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? 'Registration failed');
    _save(data.user, data.token);
    return data.user;
  }, []);

  const login = useCallback(async (email, password) => {
    const res  = await fetch(`${BASE_URL}/auth/login`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? 'Login failed');
    _save(data.user, data.token);
    return data.user;
  }, []);

  const logout = useCallback(() => _clear(), []);

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
