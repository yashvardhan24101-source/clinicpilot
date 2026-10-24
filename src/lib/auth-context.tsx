"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { UserSession, LoginCredentials } from "@/types/auth";
import { api } from "@/lib/api";

import { purgeAllOfflineData } from "@/lib/offline-snapshot";

interface AuthContextType {
  user: UserSession | null;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<UserSession>;
  loginWithGoogle: (data: { email: string; name?: string; avatar?: string; role?: string }) => Promise<UserSession>;
  loginWithOtp: (phone: string, otp: string, name?: string) => Promise<UserSession>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const applyUser = async (newUser: UserSession | null) => {
    if (typeof window !== "undefined") {
      const lastUserId = sessionStorage.getItem("clinicpilot_last_user_id");
      const currentUserId = newUser ? (newUser.user_id || newUser.id) : null;
      if (lastUserId && currentUserId && lastUserId !== currentUserId) {
        // User changed: purge all offline snapshots and caches so User B never sees User A's data
        await purgeAllOfflineData();
      }
      if (currentUserId) {
        sessionStorage.setItem("clinicpilot_last_user_id", currentUserId);
      } else {
        sessionStorage.removeItem("clinicpilot_last_user_id");
      }
    }
    setUser(newUser);
  };

  // Per security rules: verify session strictly with server (/api/auth/me) via HttpOnly cookie.
  useEffect(() => {
    let isMounted = true;

    // When on login page, skip immediate unauthenticated session probe to avoid 401 console error
    if (typeof window !== "undefined" && window.location.pathname.startsWith("/login")) {
      setIsLoading(false);
      return;
    }

    api
      .getMe()
      .then((userData) => {
        if (isMounted) {
          applyUser(userData);
        }
      })
      .catch(() => {
        if (isMounted) {
          applyUser(null);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (credentials: LoginCredentials) => {
    setIsLoading(true);
    try {
      const res = await api.login(credentials);
      await applyUser(res.user);
      return res.user;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async (data: { email: string; name?: string; avatar?: string; role?: string }) => {
    setIsLoading(true);
    try {
      const res = await api.loginWithGoogle(data);
      await applyUser(res.user);
      return res.user;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithOtp = async (phone: string, otp: string, name?: string) => {
    setIsLoading(true);
    try {
      const res = await api.verifyOtp(phone, otp, name);
      await applyUser(res.user);
      return res.user;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch {
      // Ignore network errors on logout
    } finally {
      // Wipe offline snapshot AND all SW caches on logout
      await purgeAllOfflineData();
      await applyUser(null);

      // Remove any lingering client-side auth/profile storage
      if (typeof window !== "undefined") {
        try {
          Object.keys(localStorage).forEach((key) => {
            if (key.startsWith("clinicpilot_")) {
              localStorage.removeItem(key);
            }
          });
        } catch {
          // Ignore localStorage errors
        }
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        loginWithGoogle,
        loginWithOtp,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    return {
      user: null,
      isLoading: false,
      login: async () => { throw new Error("AuthProvider missing"); },
      loginWithGoogle: async () => { throw new Error("AuthProvider missing"); },
      loginWithOtp: async () => { throw new Error("AuthProvider missing"); },
      logout: async () => {},
      isAuthenticated: false,
    };
  }
  return context;
}
