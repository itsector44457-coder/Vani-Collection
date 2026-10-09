"use client";

import { useCallback } from "react";
import { useAuth, type User } from "@/context/AuthContext";
import { hasStaffAccess, isApiConfigured } from "./api-client";

export interface AdminSession {
  user: User | null;
  configured: boolean;
  loading: boolean;
  authenticated: boolean;
  isStaff: boolean;
  signOut: () => Promise<void>;
  reload: () => void;
}

/** Shares the root auth session so admin pages do not request /api/auth/me again. */
export function useAdminSession(): AdminSession {
  const configured = isApiConfigured();
  const { user, isLoading, logout, refresh } = useAuth();

  const signOut = useCallback(async () => {
    logout();
  }, [logout]);

  return {
    user: configured ? user : null,
    configured,
    loading: configured ? isLoading : false,
    authenticated: configured && Boolean(user),
    isStaff: configured && hasStaffAccess(user),
    signOut,
    reload: refresh,
  };
}
