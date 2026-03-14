import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  login as authLogin,
  logout as authLogout,
  getUser,
  isAuthenticated,
  type AuthUser,
  type LoginResponse,
} from '../lib/auth';

interface AuthContextValue {
  user: AuthUser | null;
  isLoggedIn: boolean;
  login: (username: string, password: string) => Promise<LoginResponse>;
  logout: () => void;
  updateUser: (user: AuthUser) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(getUser);
  const [loggedIn, setLoggedIn] = useState(isAuthenticated);

  const login = useCallback(async (username: string, password: string) => {
    const data = await authLogin(username, password);
    setUser({ username: data.username, is_admin: data.is_admin });
    setLoggedIn(true);
    return data;
  }, []);

  const logout = useCallback(() => {
    authLogout();
    setUser(null);
    setLoggedIn(false);
    navigate('/login', { replace: true });
  }, [navigate]);

  const updateUser = useCallback((updatedUser: AuthUser) => {
    setUser(updatedUser);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoggedIn: loggedIn, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
