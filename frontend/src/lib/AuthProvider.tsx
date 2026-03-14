import React, { createContext, useContext, useEffect, useState } from 'react';
import { authService } from '../api/auth';

interface User {
  id?: number;
  email: string;
  name: string;
  role: 'admin' | 'designer' | 'checker' | 'viewer';
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isAuthenticated: false,
  login: async () => false,
  logout: () => {},
  isLoading: false,
  error: null,
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('beaver-token'));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Restore session from stored token
    const storedUser = localStorage.getItem('beaver-user');
    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('beaver-token');
        localStorage.removeItem('beaver-user');
        setToken(null);
      }
    }
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await authService.login(email, password);

      const userData: User = {
        id: data.user?.id,
        email: data.user?.email || email,
        name: data.user?.full_name || email.split('@')[0],
        role: (data.user?.role as User['role']) || 'designer',
      };

      setToken(data.access_token);
      setUser(userData);
      localStorage.setItem('beaver-token', data.access_token);
      localStorage.setItem('beaver-user', JSON.stringify(userData));
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid credentials';
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('beaver-token');
    localStorage.removeItem('beaver-user');
  };

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!user, login, logout, isLoading, error }}>
      {children}
    </AuthContext.Provider>
  );
}
