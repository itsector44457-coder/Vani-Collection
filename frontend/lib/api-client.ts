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

/* ------------------------------------------------------- admin console shapes */

export interface AdminCoupon {
  _id: string;
  code: string;
  type: "percentage" | "fixed";
  value: number;
  minOrderValue: number;
  maxDiscount?: number;
  startsAt?: string;
  endsAt?: string;
  usageLimit?: number;
  perCustomerLimit: number;
  usedCount: number;
  active: boolean;
  applicableCategories: string[];
  excludedSkus: string[];
  createdAt: string;
}

export interface AdminReview {
  _id: string;
  productId: string | { _id: string; name?: string; slug?: string };
  /** Present when the admin list populates the product ref. */
  productTitle?: string;
  orderId?: string;
  userId?: string;
  customerName: string;
  rating: number;
  title?: string;
  body: string;
  images?: string[];
  verifiedPurchase: boolean;
  status: "pending" | "published" | "rejected";
  helpfulCount: number;
  adminReply?: string;
  createdAt: string;
}

export interface AdminReturnItem {
  sku?: string;
  quantity?: number;
  reason?: string;
  condition?: string;
  images?: string[];
}

export interface AdminReturn {
  _id: string;
  returnNumber: string;
  orderId: string | { _id: string; orderNumber?: string; status?: string; createdAt?: string; amounts?: { total?: number }; payment?: { method?: string; status?: string }; shippingAddress?: { fullName?: string; city?: string; state?: string; pincode?: string }; items?: { sku: string; name?: string; unitPrice?: number; quantity?: number }[] };
  customerId?: string | { _id: string; email?: string; firstName?: string; lastName?: string; phone?: string };
  items: AdminReturnItem[];
  type: "return" | "exchange";
  status: string;
  refundAmount?: number;
  refundId?: string;
  adminNote?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryRow {
  _id: string;
  sku: string;
  warehouseId: string;
  onHand: number;
  reserved: number;
  reorderLevel: number;
  location?: string;
  version: number;
  lastErpSyncAt?: string;
  available: number;
  updatedAt: string;
}

export interface RefundCandidate {
  _id: string;
  orderNumber: string;
  createdAt: string;
  status: string;
  reason: string;
  payment: { method: string; status: string; providerPaymentId?: string; paidAt?: string };
  amounts: { subtotal?: number; discount?: number; shipping?: number; tax?: number; total: number };
  refundable: number;
  customer: { email?: string; firstName?: string; lastName?: string; phone?: string; name?: string };
  returnRequest: { id: string; returnNumber: string; status: string; refundAmount?: number; refundId?: string } | null;
}

export interface AuditLogRow {
  _id: string;
  actorId?: string;
  actorEmail?: string;
  action: string;
  entity?: string;
  entityId?: string;
  ip?: string;
  userAgent?: string;
  requestId?: string;
  createdAt: string;
}

export interface SalesReport {
  from: string;
  to: string;
  byDay: { _id: string; orders: number; gross: number; discounts: number; tax: number }[];
  byStatus: { _id: string; count: number }[];
  byPayment: { _id: string; count: number; collected: number }[];
  topProducts: { _id: string; units: number; revenue: number }[];
}

export interface GstReport {
  month: string;
  invoices: number;
  gstByRate: { rate: number; taxableValue: number; tax: number }[];
  totalTax: number;
}

export interface IntegrationEventRow {
  _id: string;
  provider: string;
  direction: string;
  eventType: string;
  idempotencyKey: string;
  entityType?: string;
  entityId?: string;
  status: "pending" | "processing" | "succeeded" | "failed" | "dead_letter" | string;
  attempts: number;
  nextAttemptAt?: string;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StaffUser {
  _id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  roles: string[];
  status: string;
  lastLoginAt?: string;
  createdAt: string;
}

/** Coupon payload accepted by `POST`/`PATCH /api/coupons`. */
export interface CouponInput {
  code?: string;
  type?: "percentage" | "fixed";
  value?: number;
  minOrderValue?: number;
  maxDiscount?: number;
  startsAt?: string;
  endsAt?: string;
  usageLimit?: number;
  perCustomerLimit?: number;
  active?: boolean;
  applicableCategories?: string[];
  excludedSkus?: string[];
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

  /* --------------------------------------------------------------- coupons */
  coupons: (signal?: AbortSignal) => apiFetch<{ data: AdminCoupon[] }>("/api/coupons", { signal }),
  createCoupon: (body: CouponInput) => apiFetch<{ data: AdminCoupon }>("/api/coupons", { method: "POST", body }),
  updateCoupon: (id: string, body: CouponInput) => apiFetch<{ data: AdminCoupon }>(`/api/coupons/${id}`, { method: "PATCH", body }),
  deleteCoupon: (id: string) => apiFetch<void>(`/api/coupons/${id}`, { method: "DELETE" }),
  validateCoupon: (code: string, subtotal: number) => apiFetch<{ data: { code: string; discount: number; type: string } }>("/api/coupons/validate", { method: "POST", body: { code, subtotal } }),

  /* ---------------------------------------------------------------- reviews */
  reviews: (status?: string, signal?: AbortSignal) => apiFetch<{ data: AdminReview[] }>(`/api/reviews${status && status !== "all" ? `?status=${status}` : ""}`, { signal }),
  moderateReview: (id: string, body: { status?: string; adminReply?: string }) => apiFetch<{ data: AdminReview }>(`/api/reviews/${id}`, { method: "PATCH", body }),
  reviewSummary: (productId: string, signal?: AbortSignal) => apiFetch<{ data: ReviewSummary }>(`/api/reviews/summary/${productId}`, { signal }),

  /* ---------------------------------------------------------------- returns */
  returns: (params: { status?: string } = {}, signal?: AbortSignal) => apiFetch<{ data: AdminReturn[] }>(`/api/returns${params.status && params.status !== "all" ? `?status=${params.status}` : ""}`, { signal }),
  updateReturn: (id: string, body: { status: string; adminNote?: string; refundAmount?: number; refundId?: string }) => apiFetch<{ data: AdminReturn }>(`/api/returns/${id}`, { method: "PATCH", body }),

  /* -------------------------------------------------------------- inventory */
  // `GET /api/inventory` filters on `sku` and `low` only — the warehouse filter is applied in the
  // browser so one fetch keeps every warehouse's numbers for the summary cards.
  inventory: (params: { low?: boolean; sku?: string } = {}, signal?: AbortSignal) => {
    const query = new URLSearchParams();
    if (params.low) query.set("low", "true");
    if (params.sku) query.set("sku", params.sku);
    const suffix = query.toString();
    return apiFetch<{ data: InventoryRow[] }>(`/api/inventory${suffix ? `?${suffix}` : ""}`, { signal });
  },
  adjustInventory: (sku: string, body: { adjustment?: number; onHand?: number; reorderLevel?: number; location?: string; reason: string; warehouseId?: string }) => {
    const { warehouseId, ...payload } = body;
    const suffix = warehouseId ? `?warehouseId=${encodeURIComponent(warehouseId)}` : "";
    return apiFetch<{ data: InventoryRow }>(`/api/inventory/${encodeURIComponent(sku)}${suffix}`, { method: "PATCH", body: payload });
  },

  /* ---------------------------------------------------------------- refunds */
  refundsPending: (signal?: AbortSignal) => apiFetch<Paginated<RefundCandidate>>("/api/refunds/pending?limit=100", { signal }),
  processRefund: (orderId: string, body: { amount?: number; reason: string }) =>
    apiFetch<{ data: AdminOrder; refund: { id: string; amount: number; status: string } }>(`/api/refunds/${orderId}`, { method: "POST", body }),

  /* ------------------------------------------------------------ audit + reports */
  auditLogs: (params: { action?: string; limit?: number } = {}, signal?: AbortSignal) => {
    const query = new URLSearchParams();
    if (params.action && params.action !== "all") query.set("action", params.action);
    query.set("limit", String(params.limit ?? 200));
    return apiFetch<{ data: AuditLogRow[] }>(`/api/admin/audit-logs?${query.toString()}`, { signal });
  },
  salesReport: (days: number, signal?: AbortSignal) => apiFetch<{ data: SalesReport }>(`/api/admin/reports/sales?days=${days}`, { signal }),
  gstReport: (month: string, signal?: AbortSignal) => apiFetch<{ data: GstReport }>(`/api/admin/reports/gst?month=${encodeURIComponent(month)}`, { signal }),

  /* ------------------------------------------------------ integrations + staff */
  integrationEvents: (signal?: AbortSignal) => apiFetch<{ data: IntegrationEventRow[] }>("/api/integrations/events", { signal }),
  retryIntegrationEvent: (id: string) => apiFetch<{ data: IntegrationEventRow }>(`/api/integrations/events/${id}/retry`, { method: "POST" }),
  staff: (signal?: AbortSignal) => apiFetch<{ data: StaffUser[] }>("/api/admin/staff", { signal }),
  createStaff: (body: { email: string; firstName: string; lastName?: string; password: string; roles: string[] }) =>
    apiFetch<{ data: StaffUser }>("/api/admin/staff", { method: "POST", body }),
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

/** The return ladder, in the order support drives it (`rejected` short-circuits the rest). */
export const RETURN_LADDER = [
  "requested",
  "approved",
  "pickup_scheduled",
  "received",
  "quality_check",
  "refund_pending",
  "completed",
] as const;

export const RETURN_STATUS_LABELS: Record<string, string> = {
  requested: "Requested",
  approved: "Approved",
  rejected: "Rejected",
  pickup_scheduled: "Pickup scheduled",
  received: "Received",
  quality_check: "Quality check",
  refund_pending: "Refund pending",
  completed: "Completed",
};

/** The next states support can move a return to, per the backend's status ladder. */
export const RETURN_NEXT_STATES: Record<string, { value: string; label: string; tone?: "danger" }[]> = {
  requested: [
    { value: "approved", label: "Approve" },
    { value: "rejected", label: "Reject", tone: "danger" },
  ],
  approved: [
    { value: "pickup_scheduled", label: "Schedule pickup" },
    { value: "rejected", label: "Reject", tone: "danger" },
  ],
  pickup_scheduled: [{ value: "received", label: "Mark received" }],
  received: [{ value: "quality_check", label: "Start quality check" }],
  quality_check: [
    { value: "refund_pending", label: "Pass — queue refund" },
    { value: "rejected", label: "Fail inspection", tone: "danger" },
  ],
  refund_pending: [{ value: "completed", label: "Mark completed" }],
  completed: [],
  rejected: [],
};

export const returnStatusLabel = (status: string): string => RETURN_STATUS_LABELS[status] ?? status;

/** Shape of `GET /api/reviews/summary/:productId` — also what the product JSON-LD uses. */
export interface ReviewSummary {
  average: number;
  count: number;
  distribution: Record<number, number>;
}

/** Resolves a populated-or-raw product ref to something printable. */
export function reviewProductLabel(review: AdminReview): string {
  if (review.productTitle) return review.productTitle;
  const ref = review.productId;
  if (typeof ref === "string") return "Product";
  return ref?.name || "Product";
}

export const REVIEW_STATUSES = ["pending", "published", "rejected"] as const;
export const reviewStatusLabel = (status: string): string =>
  status === "published" ? "Published" : status === "rejected" ? "Rejected" : "Pending review";

export const EVENT_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  processing: "Processing",
  succeeded: "Succeeded",
  failed: "Failed — retrying",
  dead_letter: "Dead letter",
};

/** Staff roles an admin can grant (`super_admin` is deliberately not in this list). */
export const ASSIGNABLE_STAFF_ROLES = ["support", "warehouse", "catalog_manager", "finance", "admin"] as const;

export const ROLE_LABELS: Record<string, string> = {
  customer: "Customer",
  support: "Support",
  warehouse: "Warehouse",
  catalog_manager: "Catalogue manager",
  finance: "Finance",
  admin: "Admin",
  super_admin: "Super admin",
};

/** Turns a CSV-ish array of strings into a clean list, used by the coupon editor. */
export const parseList = (raw: string): string[] =>
  raw
    .split(/[,\n]/)
    .map((value) => value.trim())
    .filter(Boolean);

/** Downloads a string as a file — used by the client-side CSV exports. */
export function downloadFile(filename: string, contents: string, mime = "text/csv;charset=utf-8"): void {
  if (typeof window === "undefined") return;
  const blob = new Blob([contents], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

/** Minimal CSV encoder: quotes anything containing a comma, quote or newline. */
export function toCsv(rows: (string | number | null | undefined)[][]): string {
  const cell = (value: string | number | null | undefined) => {
    const text = value === null || value === undefined ? "" : String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return rows.map((row) => row.map(cell).join(",")).join("\n");
}

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

/**
 * Age of an ISO timestamp in whole days. Kept here (rather than inlined into a `useMemo`) because
 * the React Compiler treats `Date.now()` inside a memo as an impure render call; an imported helper
 * is opaque to it, and this also gives every screen the same rounding.
 */
export const ageInDays = (iso?: string): number => {
  if (!iso) return Number.POSITIVE_INFINITY;
  const timestamp = new Date(iso).getTime();
  if (Number.isNaN(timestamp)) return Number.POSITIVE_INFINITY;
  return Math.floor((Date.now() - timestamp) / 86400000);
};

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
