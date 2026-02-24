'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: number;
  email: string;
  name: string;
  companyName: string;
  phone: string;
  role: string;
  isActive: boolean;
  subscription: any;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (data: any) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = () => {
    if (typeof window !== 'undefined') {
      // Check cookie first
      const cookies = document.cookie.split(';');
      let userFromCookie = null;
      
      for (const cookie of cookies) {
        const parts = cookie.trim().split('=');
        if (parts[0] === 'user') {
          try {
            userFromCookie = JSON.parse(decodeURIComponent(parts.slice(1).join('=')));
          } catch (e) {
            console.error('Failed to parse user cookie:', e);
          }
          break;
        }
      }

      // Fallback to localStorage
      const userFromStorage = localStorage.getItem('user');
      
      if (userFromCookie) {
        setUser(userFromCookie);
      } else if (userFromStorage) {
        try {
          const parsed = JSON.parse(userFromStorage);
          setUser(parsed);
        } catch (e) {
          setUser(null);
        }
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'login',
          email,
          password
        })
      });

      const result = await response.json();

      if (result.success) {
        setUser(result.data);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const register = async (data: any): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register',
          ...data
        })
      });

      const result = await response.json();

      if (result.success) {
        setUser(result.data);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Register error:', error);
      return false;
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth', {
        method: 'PUT'
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
    
    localStorage.removeItem('user');
    setUser(null);
    
    // Also clear cookie
    if (typeof document !== 'undefined') {
      document.cookie = 'user=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
