"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { apiFetch, ApiError, hasAuthSessionHint, isApiConfigured } from "../lib/api-client";
import {
  createAddress,
  deleteAddress as deleteAddressRequest,
  fetchAddresses,
  requestPasswordReset,
  resetPassword as resetPasswordRequest,
  updateAddress as updateAddressRequest,
  updateProfile as updateProfileRequest,
  type ApiAddress,
} from "../lib/storefront-api";

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  addresses?: Address[];
  preferences?: UserPreferences;
  createdAt: string;
  roles?: string[];
  mustChangePassword?: boolean;
}

export interface Address {
  id: string;
  type: "home" | "work" | "other";
  fullName: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  landmark?: string;
  isDefault: boolean;
}

export interface UserPreferences {
  newsletter: boolean;
  smsUpdates: boolean;
  whatsappUpdates: boolean;
  preferredSize: string;
  favoriteCategories: string[];
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (userData: SignupData & { otp: string }) => Promise<void>;
  requestSignupOtp: (userData: SignupData) => Promise<void>;
  logout: () => void;
  updateProfile: (data: Partial<User>) => Promise<void>;
  addAddress: (address: Omit<Address, "id">) => Promise<void>;
  updateAddress: (id: string, address: Partial<Address>) => Promise<void>;
  deleteAddress: (id: string) => Promise<void>;
  setDefaultAddress: (id: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  /** "live" when the real backend is handling sessions, "demo" for the local preview accounts. */
  mode: "live" | "unavailable";
  /** Reset link returned by the API in non-production (no email provider connected yet). */
  lastResetUrl: string | null;
  refresh: () => void;
}

export interface SignupData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  newsletter?: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USER_KEY = "vani_user";
const PREFERENCES_KEY = "vani_preferences";
const readJson = <T,>(key: string, fallback: T): T => {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const writeJson = (key: string, value: unknown) => {
  if (typeof window === "undefined") return;
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage can be unavailable in private mode */
  }
};

interface ApiUser {
  _id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  roles?: string[];
  createdAt?: string;
  addresses?: ApiAddress[];
  mustChangePassword?: boolean;
}

const toUiAddress = (address: ApiAddress): Address => ({
  id: address._id,
  type: (address.label as Address["type"]) || "home",
  fullName: address.fullName ?? "",
  phone: address.phone ?? "",
  address: [address.line1, address.line2].filter(Boolean).join(", "),
  city: address.city ?? "",
  state: address.state ?? "",
  pincode: address.pincode ?? "",
  landmark: address.landmark,
  isDefault: Boolean(address.isDefault),
});

const toApiAddress = (address: Partial<Address>) => ({
  label: address.type ?? "home",
  fullName: address.fullName ?? "",
  phone: address.phone ?? "",
  line1: address.address ?? "",
  landmark: address.landmark,
  city: address.city ?? "",
  state: address.state ?? "",
  pincode: address.pincode ?? "",
  isDefault: address.isDefault,
});

const toUiUser = (user: ApiUser): User => ({
  id: user._id,
  email: user.email,
  firstName: user.firstName ?? "",
  lastName: user.lastName ?? "",
  phone: user.phone,
  addresses: (user.addresses ?? []).map(toUiAddress),
  preferences: readJson<UserPreferences | undefined>(PREFERENCES_KEY, undefined),
  createdAt: user.createdAt ?? new Date().toISOString(),
  roles: user.roles,
  mustChangePassword: user.mustChangePassword,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const configured = isApiConfigured();
  const pathname = usePathname();
  const requiresSession = pathname === "/checkout"
    || pathname.startsWith("/checkout/")
    || pathname === "/account"
    || pathname.startsWith("/account/")
    || pathname === "/admin"
    || pathname.startsWith("/admin/");
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(configured && requiresSession);
  const [checkedPath, setCheckedPath] = useState<string | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [lastResetUrl, setLastResetUrl] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const refresh = useCallback(() => {
    setSessionLoaded(false);
    setIsLoading(true);
    setCheckedPath(null);
    setNonce((value) => value + 1);
  }, []);

  /* --------------------------------------------------------------- session load */

  useEffect(() => {
    if (!configured) return;
    if (
      sessionLoaded
      || checkedPath === pathname
      || (!requiresSession && (!hasAuthSessionHint() || checkedPath !== null))
    ) return;
    const controller = new AbortController();
    let cancelled = false;
    const load = async () => {
      await Promise.resolve();
      if (cancelled) return;
      try {
        const response = await apiFetch<{ data: ApiUser }>("/api/auth/me", { signal: controller.signal });
        if (!cancelled) {
          setSessionLoaded(true);
          setUser(toUiUser(response.data));
        }
      } catch (cause) {
        if ((cause as Error)?.name === "AbortError") return;
        if (!cancelled) {
          if (cause instanceof ApiError && cause.status === 401) {
            setSessionLoaded(false);
            setUser(null);
          } else {
            setSessionLoaded(Boolean(user));
          }
        }
        if (cause instanceof ApiError && cause.status !== 401) console.warn("Session check failed:", cause.message);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
          setCheckedPath(pathname);
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [checkedPath, configured, nonce, pathname, requiresSession, sessionLoaded, user]);

  const sessionLoading = configured && requiresSession
    && (isLoading || (!sessionLoaded && checkedPath !== pathname));

  const loadAddresses = useCallback(async () => {
    if (!configured) return;
    const addresses = await fetchAddresses().catch(() => [] as ApiAddress[]);
    setUser((previous) => (previous ? { ...previous, addresses: addresses.map(toUiAddress) } : previous));
  }, [configured]);

  /* ------------------------------------------------------------------- actions */

  const login = useCallback(
    async (email: string, password: string): Promise<void> => {
      setIsLoading(true);
      try {
        if (configured) {
          const response = await apiFetch<{ data: ApiUser }>("/api/auth/login", { method: "POST", body: { email: email.trim(), password } });
          const nextUser = toUiUser(response.data);
          setSessionLoaded(true);
          setUser(nextUser);
          if (!nextUser.mustChangePassword) await loadAddresses();
          return;
        }
        throw new Error("Authentication is unavailable because the API is not configured.");
      } finally {
        setIsLoading(false);
      }
    },
    [configured, loadAddresses]
  );

  const signup = useCallback(
    async (userData: SignupData & { otp: string }): Promise<void> => {
      setIsLoading(true);
      try {
        if (!configured) throw new Error("Email-verified signup requires a connected backend.");
        const response = await apiFetch<{ data: ApiUser }>("/api/auth/register", {
          method: "POST",
          body: { email: userData.email.trim(), code: userData.otp },
        });
        setSessionLoaded(true);
        setUser(toUiUser(response.data));
      } finally {
        setIsLoading(false);
      }
    },
    [configured]
  );

  const requestSignupOtp = useCallback(async (userData: SignupData): Promise<void> => {
    if (!configured) throw new Error("Email-verified signup requires a connected backend.");
    setIsLoading(true);
    try {
      await apiFetch("/api/auth/register/request-otp", {
        method: "POST",
        body: {
          email: userData.email.trim(),
          password: userData.password,
          firstName: userData.firstName.trim(),
          lastName: userData.lastName.trim(),
          phone: userData.phone ? userData.phone.replace(/\D/g, "").slice(-10) : undefined,
        },
      });
    } finally {
      setIsLoading(false);
    }
  }, [configured]);

  const logout = useCallback(() => {
    setSessionLoaded(false);
    setUser(null);
    writeJson(USER_KEY, null);
    if (configured) apiFetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
  }, [configured]);

  const updateProfile = useCallback(
    async (data: Partial<User>): Promise<void> => {
      if (!configured) throw new Error("Authentication is unavailable because the API is not configured.");
      if (!user) throw new Error("Not authenticated");
      await updateProfileRequest({ firstName: data.firstName, lastName: data.lastName, phone: data.phone });
      const nextUser = { ...user, ...data };
      setUser(nextUser);
      if (data.preferences) writeJson(PREFERENCES_KEY, data.preferences);
    },
    [configured, user]
  );

  const addAddress = useCallback(
    async (address: Omit<Address, "id">): Promise<void> => {
      if (!configured) throw new Error("Address management is unavailable because the API is not configured.");
      if (!user) throw new Error("Not authenticated");
      const addresses = await createAddress(toApiAddress(address));
      setUser((previous) => (previous ? { ...previous, addresses: addresses.map(toUiAddress) } : previous));
    },
    [configured, user]
  );

  const updateAddress = useCallback(
    async (id: string, addressData: Partial<Address>): Promise<void> => {
      if (!configured) throw new Error("Address management is unavailable because the API is not configured.");
      if (!user) throw new Error("Not authenticated");
      const addresses = await updateAddressRequest(id, toApiAddress(addressData));
      setUser((previous) => (previous ? { ...previous, addresses: addresses.map(toUiAddress) } : previous));
    },
    [configured, user]
  );

  const deleteAddress = useCallback(
    async (id: string): Promise<void> => {
      if (!configured) throw new Error("Address management is unavailable because the API is not configured.");
      if (!user) throw new Error("Not authenticated");
      await deleteAddressRequest(id);
      await loadAddresses();
    },
    [configured, loadAddresses, user]
  );

  const setDefaultAddress = useCallback(
    async (id: string): Promise<void> => {
      if (!configured) throw new Error("Address management is unavailable because the API is not configured.");
      if (!user) throw new Error("Not authenticated");
      const addresses = await updateAddressRequest(id, { isDefault: true });
      setUser((previous) => (previous ? { ...previous, addresses: addresses.map(toUiAddress) } : previous));
    },
    [configured, user]
  );

  const forgotPassword = useCallback(
    async (email: string): Promise<void> => {
      if (!configured) throw new Error("Password reset is unavailable because the API is not configured.");
      const { resetUrl } = await requestPasswordReset(email.trim());
      setLastResetUrl(resetUrl ?? null);
    },
    [configured]
  );

  const resetPassword = useCallback(
    async (token: string, newPassword: string): Promise<void> => {
      if (!configured) throw new Error("Password reset is unavailable because the API is not configured.");
      await resetPasswordRequest(token, newPassword);
    },
    [configured]
  );

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      isLoading: sessionLoading,
      isAuthenticated: Boolean(user),
      login,
      signup,
      requestSignupOtp,
      logout,
      updateProfile,
      addAddress,
      updateAddress,
      deleteAddress,
      setDefaultAddress,
      forgotPassword,
      resetPassword,
      mode: configured ? "live" : "unavailable",
      lastResetUrl,
      refresh,
    }),
    [user, sessionLoading, login, signup, requestSignupOtp, logout, updateProfile, addAddress, updateAddress, deleteAddress, setDefaultAddress, forgotPassword, resetPassword, configured, lastResetUrl, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
