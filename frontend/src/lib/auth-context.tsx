'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from './api';
import { UserContext } from './types';

interface AuthContextType {
  user: UserContext | null;
  token: string | null;
  publicAccessEnabled: boolean;
  isLoading: boolean;
  login: (username: string, pass: string) => Promise<void>;
  logout: () => void;
  refreshStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  publicAccessEnabled: false,
  isLoading: true,
  login: async () => {},
  logout: () => {},
  refreshStatus: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<UserContext | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [publicAccessEnabled, setPublicAccessEnabled] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshStatus = async () => {
    try {
      const status = await api.getAuthStatus();
      setPublicAccessEnabled(!!status.publicAccessEnabled);
    } catch {
      // Default to public access false
      setPublicAccessEnabled(false);
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      setIsLoading(true);
      await refreshStatus();

      if (typeof window !== 'undefined') {
        const savedToken = localStorage.getItem('sre_token');
        const savedUser = localStorage.getItem('sre_user');

        if (savedToken && savedUser) {
          try {
            setToken(savedToken);
            setUser(JSON.parse(savedUser));
          } catch {
            localStorage.removeItem('sre_token');
            localStorage.removeItem('sre_user');
          }
        } else {
          // If no token and public access is true, guest context
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (username: string, pass: string) => {
    const res = await api.login(username, pass);
    if (res.accessToken) {
      setToken(res.accessToken);
      setUser(res.user);
      if (typeof window !== 'undefined') {
        localStorage.setItem('sre_token', res.accessToken);
        localStorage.setItem('sre_user', JSON.stringify(res.user));
      }
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('sre_token');
      localStorage.removeItem('sre_user');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        publicAccessEnabled,
        isLoading,
        login,
        logout,
        refreshStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
