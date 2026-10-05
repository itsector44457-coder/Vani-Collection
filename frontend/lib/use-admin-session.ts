"use client";

import { useCallback, useEffect, useState } from "react";
import { api, hasStaffAccess, isApiConfigured, ApiError, type SessionUser } from "./api-client";

export interface AdminSession {
  user: SessionUser | null;
  configured: boolean;
  loading: boolean;
  authenticated: boolean;
  isStaff: boolean;
  error: string | null;
  signOut: () => Promise<void>;
  reload: () => void;
}

interface SessionState {
  user: SessionUser | null;
  loading: boolean;
  error: string | null;
}

/** Reads the current staff session from the backend (httpOnly cookie based). */
export function useAdminSession(): AdminSession {
  const configured = isApiConfigured();
  const [state, setState] = useState<SessionState>({ user: null, loading: configured, error: null });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!configured) return;
    const controller = new AbortController();
    api
      .me(controller.signal)
      .then((response) => setState({ user: response.data, loading: false, error: null }))
      .catch((cause: unknown) => {
        if ((cause as Error)?.name === "AbortError") return;
        setState({
          user: null,
          loading: false,
          error: cause instanceof ApiError && cause.status === 401 ? null : "Could not verify the admin session",
        });
      });
    return () => controller.abort();
  }, [configured, nonce]);

  const signOut = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      /* signing out locally is enough when the API is unreachable */
    }
    setState({ user: null, loading: false, error: null });
  }, []);

  return {
    user: state.user,
    configured,
    loading: configured ? state.loading : false,
    authenticated: Boolean(state.user),
    isStaff: hasStaffAccess(state.user),
    error: state.error,
    signOut,
    reload: () => setNonce((value) => value + 1),
  };
}
