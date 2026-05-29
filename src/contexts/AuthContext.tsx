import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { authApi, AuthUser, clearStoredTokens, getStoredTokens, setStoredTokens } from "@/lib/apiClient";

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadUser() {
      const tokens = getStoredTokens();
      if (!tokens?.accessToken) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await authApi.me();
        if (!cancelled) setUser(response.user);
      } catch {
        clearStoredTokens();
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadUser();

    const handleLogout = () => setUser(null);
    window.addEventListener("fluxo-auth-logout", handleLogout);
    return () => {
      cancelled = true;
      window.removeEventListener("fluxo-auth-logout", handleLogout);
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    isLoading,
    isAuthenticated: !!user,
    login: async (email, password) => {
      const response = await authApi.login(email, password);
      setStoredTokens({
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
      });
      setUser(response.user);
    },
    logout: async () => {
      const tokens = getStoredTokens();
      try {
        await authApi.logout(tokens?.refreshToken);
      } finally {
        clearStoredTokens();
        setUser(null);
      }
    },
  }), [isLoading, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
