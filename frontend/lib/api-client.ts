/**
 * Real API client for the Vani Collection backend (/backend).
 *
 * The admin console talks to this client when NEXT_PUBLIC_API_URL is set. When it is not set the
 * console keeps rendering its built-in demo data, so the storefront demo remains deployable on its
 * own while the real backend is wired up.
 */

const RAW_BASE = (process.env.NEXT_PUBLIC_API_URL || "").trim().replace(/\/+$/, "");

export const API_BASE = RAW_BASE;

/** True when a backend URL is configured for this deployment. */
export const isApiConfigured = (): boolean => API_BASE.length > 0;

export interface ApiErrorPayload {
  error?: { code?: string; message?: string; details?: unknown; requestId?: string };
}

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;
  requestId?: string;

  constructor(status: number, code: string, message: string, details?: unknown, requestId?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
    this.requestId = requestId;
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
  /** Set to false to skip the browser cache for admin reads. */
  cache?: RequestCache;
  /** Extra headers, e.g. the guest cart token for anonymous shoppers. */
  headers?: Record<string, string>;
}

export interface Paginated<T> {
  data: T[];
  meta?: { page?: number; limit?: number; total?: number; pages?: number };
}

/** Performs an authenticated JSON request against the backend. */
export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  if (!isApiConfigured()) throw new ApiError(503, "API_NOT_CONFIGURED", "NEXT_PUBLIC_API_URL is not configured");
  const { method = "GET", body, signal, cache = "no-store", headers } = options;

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      credentials: "include",
      cache,
      signal,
      headers: { ...(body ? { "content-type": "application/json" } : {}), ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    if ((error as Error)?.name === "AbortError") throw error;
    throw new ApiError(0, "NETWORK_ERROR", "Could not reach the Vani Collection API");
  }

  if (response.status === 204) return undefined as T;

  const text = await response.text();
  const payload = text ? (JSON.parse(text) as T & ApiErrorPayload) : ({} as T & ApiErrorPayload);

  if (!response.ok) {
    const apiError = payload.error;
    throw new ApiError(
      response.status,
      apiError?.code || "REQUEST_FAILED",
      apiError?.message || `Request failed with status ${response.status}`,
      apiError?.details,
      apiError?.requestId
    );
  }
  return payload as T;
}

/* ------------------------------------------------------------------ types */

export interface SessionUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  roles: string[];
  status: string;
  lastLoginAt?: string;
}

export interface DashboardMetrics {
  revenue30d: number;
  paidOrders30d: number;
  aov30d: number;
  orders30d: number;
  openOrders: number;
  lowStockSkus: number;
  pendingReviews: number;
  openReturns: number;
  activeProducts: number;
  customers: { total: number; new30d: number };
  salesByCategory: { _id: string; revenue: number; units: number }[];
  daily: { _id: string; orders: number; revenue: number }[];
}

export interface AdminOrderItem {
  sku: string;
  name?: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface AdminOrder {
  _id: string;
  orderNumber: string;
  createdAt: string;
  status: string;
  payment: { method: string; status: string };
  amounts: { subtotal: number; discount: number; shipping: number; tax: number; total: number };
  items: AdminOrderItem[];
  shippingAddress?: { fullName?: string; city?: string; state?: string; pincode?: string };
  customerId?: { email?: string; firstName?: string; lastName?: string } | string;
  erpSyncStatus?: string;
}

export interface AdminCatalogueVariant {
  sku: string;
  size?: string;
  color?: string;
  price: number;
  mrp: number;
  available: number;
  onHand: number;
  reorderLevel: number;
  low: boolean;
}

export interface AdminCatalogueProduct {
  _id: string;
  name: string;
  slug: string;
  category: string;
  status: string;
  featured?: boolean;
  images?: { url: string; alt?: string }[];
  variants: AdminCatalogueVariant[];
  stockAvailable: number;
  lowStockSkus: number;
  unitsSold: number;
  revenue: number;
  updatedAt: string;
}

export interface AdminCustomer {
  _id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  roles: string[];
  status: string;
  createdAt: string;
}

/** One row of the outbound email log (`GET /api/admin/emails`). */
export interface EmailLogEntry {
  _id: string;
  to: string;
  template: string;
  subject: string;
  status: "queued" | "sent" | "failed" | "skipped" | string;
  providerMessageId?: string;
  error?: string;
  attempts: number;
  orderId?: string;
  userId?: string;
  tags?: string[];
  replyTo?: string;
  createdAt: string;
  updatedAt?: string;
  sentAt?: string;
}

export interface EmailLogMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
  counts?: { byStatus?: Record<string, number>; byTemplate?: Record<string, number> };
}

/* ------------------------------------------------------------------ calls */

export const api = {
  login: (email: string, password: string) => apiFetch<{ data: SessionUser }>("/api/auth/login", { method: "POST", body: { email, password } }),
  logout: () => apiFetch<void>("/api/auth/logout", { method: "POST" }),
  me: (signal?: AbortSignal) => apiFetch<{ data: SessionUser }>("/api/auth/me", { signal }),
  dashboard: (signal?: AbortSignal) => apiFetch<{ data: DashboardMetrics }>("/api/admin/dashboard", { signal }),
  orders: (params: { status?: string; limit?: number } = {}, signal?: AbortSignal) => {
    const query = new URLSearchParams();
    if (params.status && params.status !== "All") query.set("status", mapStatusFilter(params.status));
    query.set("limit", String(params.limit ?? 50));
    return apiFetch<Paginated<AdminOrder>>(`/api/orders?${query.toString()}`, { signal });
  },
  updateOrderStatus: (orderId: string, status: string, note?: string) => apiFetch<{ data: AdminOrder }>(`/api/orders/${orderId}/status`, { method: "PATCH", body: { status, note } }),
  catalogue: (params: { q?: string; limit?: number } = {}, signal?: AbortSignal) => {
    const query = new URLSearchParams();
    if (params.q) query.set("q", params.q);
    query.set("limit", String(params.limit ?? 50));
    return apiFetch<Paginated<AdminCatalogueProduct>>(`/api/admin/catalogue?${query.toString()}`, { signal });
  },
  customers: (params: { q?: string; limit?: number } = {}, signal?: AbortSignal) => {
    const query = new URLSearchParams();
    if (params.q) query.set("q", params.q);
    query.set("limit", String(params.limit ?? 50));
    return apiFetch<Paginated<AdminCustomer>>(`/api/admin/customers?${query.toString()}`, { signal });
  },
  events: (signal?: AbortSignal) => apiFetch<{ data: { _id: string; provider: string; eventType: string; status: string; attempts: number; lastError?: string; createdAt: string }[] }>("/api/integrations/events", { signal }),
  lowStock: (signal?: AbortSignal) => apiFetch<{ data: { sku: string; onHand: number; reserved: number; reorderLevel: number }[] }>("/api/inventory?low=true", { signal }),

  /* ------------------------------------------------- transactional email log */
  emails: (params: { status?: string; template?: string; to?: string; page?: number; limit?: number } = {}, signal?: AbortSignal) => {
    const query = new URLSearchParams();
    if (params.status && params.status !== "all") query.set("status", params.status);
    if (params.template && params.template !== "all") query.set("template", params.template);
    if (params.to) query.set("to", params.to);
    query.set("page", String(params.page ?? 1));
    query.set("limit", String(params.limit ?? 25));
    return apiFetch<{ data: EmailLogEntry[]; meta: EmailLogMeta }>(`/api/admin/emails?${query.toString()}`, { signal });
  },
  resendEmail: (id: string) => apiFetch<{ data: { queued?: boolean; skipped?: boolean; reason?: string; id: string; status: string } }>(`/api/admin/emails/${id}/resend`, { method: "POST" }),
};

/** The UI groups orders into friendly buckets; the API uses lifecycle statuses. */
export function mapStatusFilter(label: string): string {
  switch (label) {
    case "Pending":
      return "pending_payment";
    case "Paid":
      return "confirmed";
    case "Shipped":
      return "shipped";
    case "Delivered":
      return "delivered";
    case "Refunded":
      return "refunded";
    default:
      return label.toLowerCase();
  }
}

const STATUS_LABELS: Record<string, string> = {
  pending_payment: "Pending",
  confirmed: "Paid",
  processing: "Processing",
  packed: "Packed",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  return_requested: "Return",
  returned: "Returned",
  refunded: "Refunded",
};

/** Human label for an order status coming from the API. */
export const orderStatusLabel = (status: string): string => STATUS_LABELS[status] ?? status;

/** Every template the backend can render — kept in sync with `backend/src/services/email-templates`. */
export const EMAIL_TEMPLATES = [
  "welcome",
  "password-reset",
  "password-changed",
  "order-confirmation",
  "order-status",
  "order-cancelled",
  "refund-processed",
  "return-status",
  "email-verification",
] as const;

export const EMAIL_TEMPLATE_LABELS: Record<string, string> = {
  welcome: "Welcome",
  "password-reset": "Password reset",
  "password-changed": "Password changed",
  "order-confirmation": "Order confirmation",
  "order-status": "Order status",
  "order-cancelled": "Order cancelled",
  "refund-processed": "Refund processed",
  "return-status": "Return status",
  "email-verification": "Email verification",
  raw: "One-off",
};

export const EMAIL_STATUSES = ["queued", "sent", "failed", "skipped"] as const;

/** Badge tone for an email delivery state. */
export const emailStatusTone = (status: string): "success" | "warning" | "danger" | "info" | "neutral" => {
  switch (status) {
    case "sent":
      return "success";
    case "queued":
      return "info";
    case "failed":
      return "danger";
    case "skipped":
      return "warning";
    default:
      return "neutral";
  }
};

/** Staff roles allowed into the admin console. */
export const STAFF_ROLES = ["support", "warehouse", "catalog_manager", "finance", "admin", "super_admin"] as const;
export const hasStaffAccess = (user: SessionUser | null): boolean => Boolean(user?.roles?.some((role) => (STAFF_ROLES as readonly string[]).includes(role)));

export const formatCurrency = (value: number): string => `₹${Math.round(value || 0).toLocaleString("en-IN")}`;

export const formatRelativeTime = (iso: string): string => {
  const timestamp = new Date(iso).getTime();
  if (Number.isNaN(timestamp)) return "—";
  const diffMinutes = Math.round((Date.now() - timestamp) / 60000);
  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  const hours = Math.round(diffMinutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.round(hours / 24)} d ago`;
};
