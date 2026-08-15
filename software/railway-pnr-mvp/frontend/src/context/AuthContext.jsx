import React, { createContext, useContext, useEffect, useState } from 'react';
import client from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('pnr_token');
    if (!token) {
      setLoading(false);
      return;
    }
    client
      .get('/auth/me')
      .then((res) => setUser(res.data.user))
      .catch(() => localStorage.removeItem('pnr_token'))
      .finally(() => setLoading(false));
  }, []);

  async function loginStaff(empId, password) {
    const res = await client.post('/auth/login/staff', { empId, password });
    localStorage.setItem('pnr_token', res.data.token);
    setUser(res.data.user);
    return res.data.user;
  }

  async function loginPassenger(mobile, password) {
    const res = await client.post('/auth/login/passenger', { mobile, password });
    localStorage.setItem('pnr_token', res.data.token);
    setUser(res.data.user);
    return res.data.user;
  }

  function logout() {
    localStorage.removeItem('pnr_token');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, loginStaff, loginPassenger, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
