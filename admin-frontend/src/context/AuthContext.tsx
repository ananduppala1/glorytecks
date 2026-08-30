import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, apiPost, tokenStore, getErrorMessage } from '@/lib/api';
import type { AdminUser, Role } from '@/types';

interface AuthContextValue {
  user: AdminUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setUser: (u: AdminUser | null) => void;
  hasRole: (...roles: Role[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface LoginResponse {
  user: AdminUser;
  accessToken: string;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Attempt to restore the session on first load using the refresh cookie.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await apiPost<LoginResponse>('/auth/refresh');
        if (!active) return;
        tokenStore.set(res.data.accessToken);
        setUser(res.data.user);
      } catch {
        if (active) setUser(null);
      } finally {
        if (active) setIsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // React to forced logouts broadcast by the axios interceptor.
  useEffect(() => {
    const onLogout = () => {
      tokenStore.set(null);
      setUser(null);
    };
    window.addEventListener('auth:logout', onLogout);
    return () => window.removeEventListener('auth:logout', onLogout);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await apiPost<LoginResponse>('/auth/login', { email, password });
      tokenStore.set(res.data.accessToken);
      setUser(res.data.user);
    } catch (err) {
      throw new Error(getErrorMessage(err, 'Unable to sign in'));
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      /* ignore network errors on logout */
    } finally {
      tokenStore.set(null);
      setUser(null);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const res = await api.get<{ data: AdminUser }>('/auth/me');
    setUser(res.data.data);
  }, []);

  const hasRole = useCallback(
    (...roles: Role[]) => (user ? roles.includes(user.role) : false),
    [user],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated: Boolean(user),
      login,
      logout,
      refreshUser,
      setUser,
      hasRole,
    }),
    [user, isLoading, login, logout, refreshUser, hasRole],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
