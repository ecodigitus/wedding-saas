"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "./types";
import {
  getMe,
  isLoggedIn,
  login as apiLogin,
  logout as apiLogout,
  registerAccount,
} from "./api";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName?: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  // Tanpa refresh token, tidak ada yang perlu di-fetch — loading langsung
  // false dari awal (dihitung sekali via lazy initializer, bukan di effect).
  const [loading, setLoading] = useState(() => isLoggedIn());
  const router = useRouter();

  // Dipakai dari login()/register() (event handler, bukan effect) — sinkron
  // setState di awal fungsi ini aman di konteks itu.
  const refreshUser = useCallback(async () => {
    if (!isLoggedIn()) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      setUser(await getMe());
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoggedIn()) return;
    let ignore = false;
    getMe()
      .then((me) => {
        if (!ignore) setUser(me);
      })
      .catch(() => {
        if (!ignore) setUser(null);
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      await apiLogin(email, password);
      await refreshUser();
    },
    [refreshUser]
  );

  const register = useCallback(
    async (email: string, password: string, fullName?: string) => {
      await registerAccount({ email, password, full_name: fullName });
      await refreshUser();
    },
    [refreshUser]
  );

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
    router.push("/login");
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth harus dipakai di dalam <AuthProvider>.");
  return ctx;
}
