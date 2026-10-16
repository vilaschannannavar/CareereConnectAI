"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { apiClient, setCsrfToken } from "@/lib/api";

export interface User {
  id: string;
  email: string;
  full_name?: string | null;
  headline?: string | null;
  is_active: boolean;
  created_at: string;
}

interface AuthResponse {
  user: User;
  csrf_token: string;
  message: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName?: string) => Promise<void>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const checkSession = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await apiClient<AuthResponse>("/auth/me");
      setUser(res.user);
      setCsrfToken(res.csrf_token);
    } catch {
      setUser(null);
      setCsrfToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkSession();
  }, []);

  const login = async (email: string, password: string) => {
    setError(null);
    const res = await apiClient<AuthResponse>("/auth/login", {
      method: "POST",
      data: { email, password },
    });
    setUser(res.user);
    setCsrfToken(res.csrf_token);
  };

  const register = async (email: string, password: string, fullName?: string) => {
    setError(null);
    const res = await apiClient<AuthResponse>("/auth/register", {
      method: "POST",
      data: { email, password, full_name: fullName },
    });
    setUser(res.user);
    setCsrfToken(res.csrf_token);
  };

  const logout = async () => {
    try {
      await apiClient("/auth/logout", { method: "POST" });
    } finally {
      setUser(null);
      setCsrfToken(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        error,
        login,
        register,
        logout,
        checkSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
