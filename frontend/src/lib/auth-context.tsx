"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from './api';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, referralCode?: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      api.get('/users/me')
        .then((res) => setUser(res.data.data))
        .catch(() => localStorage.removeItem('accessToken'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const hydrateProfile = async () => {
    const res = await api.get('/users/me');
    setUser(res.data.data);
  };

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    localStorage.setItem('accessToken', res.data.data.accessToken);
    localStorage.setItem('refreshToken', res.data.data.refreshToken);
    try {
      await hydrateProfile();
    } catch {
      setUser(res.data.data.user);
    }
  };

  const register = async (name: string, email: string, password: string, referralCode?: string) => {
    const res = await api.post('/auth/register', { name, email, password, referralCode });
    localStorage.setItem('accessToken', res.data.data.accessToken);
    localStorage.setItem('refreshToken', res.data.data.refreshToken);
    try {
      await hydrateProfile();
    } catch {
      setUser(res.data.data.user);
    }
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
