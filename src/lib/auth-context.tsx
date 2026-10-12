"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { UserSession, LoginCredentials } from "@/types/auth";
import { api } from "@/lib/api";

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

  useEffect(() => {
    // Check initial user from localStorage or API
    const stored = localStorage.getItem("clinicpilot_user");
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem("clinicpilot_user");
      }
    }

    api
      .getMe()
      .then((userData) => {
        setUser(userData);
        localStorage.setItem("clinicpilot_user", JSON.stringify(userData));
      })
      .catch(() => {
        // Not logged in or mock session expired
        if (!stored) {
          // Provide default demo receptionist session if not explicitly logged out
          const defaultDemo: UserSession = {
            id: "usr-1",
            name: "Priya Sharma (Reception)",
            email: "reception@smilecraft.in",
            role: "receptionist",
            clinic_id: "cln-1",
            clinic_name: "SmileCraft Dental Clinic",
          };
          setUser(defaultDemo);
          localStorage.setItem("clinicpilot_user", JSON.stringify(defaultDemo));
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const login = async (credentials: LoginCredentials) => {
    setIsLoading(true);
    try {
      const res = await api.login(credentials);
      setUser(res.user);
      localStorage.setItem("clinicpilot_user", JSON.stringify(res.user));
      return res.user;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async (data: { email: string; name?: string; avatar?: string; role?: string }) => {
    setIsLoading(true);
    try {
      const res = await api.loginWithGoogle(data);
      setUser(res.user);
      localStorage.setItem("clinicpilot_user", JSON.stringify(res.user));
      return res.user;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithOtp = async (phone: string, otp: string, name?: string) => {
    setIsLoading(true);
    try {
      const res = await api.verifyOtp(phone, otp, name);
      setUser(res.user);
      localStorage.setItem("clinicpilot_user", JSON.stringify(res.user));
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
      setUser(null);
      localStorage.removeItem("clinicpilot_user");
      // Clear sensitive caches per Section 6
      if ("caches" in window) {
        caches.delete("clinic-schedule-cache");
        caches.delete("clinic-patients-cache");
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
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
