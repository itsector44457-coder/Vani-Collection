/**
 * Storefront ↔ backend bridge.
 *
 * When NEXT_PUBLIC_API_URL is configured, storefront data is loaded from the backend.
 */
import { apiFetch, ApiError, isApiConfigured, type Paginated } from "./api-client";
import type { CartItem, GiftOptions, OrderAddress, OrderLine, Product, StoreOrder, StoreReview, StoreVariant } from "./storefront-types";

const CART_TOKEN_KEY = "vani_cart_token";
const WISHLIST_KEY = "vani_wishlist";

/* --------------------------------------------------------------- api shapes */

interface ApiVariant {
  sku: string;
  size?: string;
  color?: string;
  images?: { url: string; alt?: string }[];
  price: number;
  mrp: number;
}

interface ApiProduct {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  shortDescription?: string;
  sizeGuide?: string;
  category: string;
  fabric?: string;
  craft?: string;
  hsnCode?: string;
  gstRate?: number;
  images?: { url: string; alt?: string }[];
  hoverImage?: string;
  videos?: { url: string; kind?: string }[];
  variants: ApiVariant[];
  badges?: string[];
  tags?: string[];
  featured?: boolean;
  status?: string;
  rating?: { average: number; count: number };
  inventory?: Record<string, number>;
}

interface ApiCartLine {
  lineId: string;
  productId: string;
  slug?: string;
  sku: string;
  quantity: number;
  title: string;
  image: string;
  size?: string;
  color?: string;
  price: number;
  originalPrice: number;
  available: number;
  inStock: boolean;
}

export interface CartSnapshot {
  lines: ApiCartLine[];
  subtotal: number;
  savings: number;
  count: number;
  hasUnavailable: boolean;
  lineLimit?: number;
}

/* ------------------------------------------------------------------ helpers */

/** Guest cart identity — stored per browser and sent as `x-cart-token`. */
export function getCartToken(): string {
  if (typeof window === "undefined") return "";
  try {
    const existing = window.localStorage.getItem(CART_TOKEN_KEY);
    if (existing) return existing;
    const token = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `guest-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    window.localStorage.setItem(CART_TOKEN_KEY, token);
    return token;
  } catch {
    return "";
  }
}

const cartHeaders = (): Record<string, string> => {
  const token = getCartToken();
  return token ? { "x-cart-token": token } : {};
};

/** Local wishlist fallback used when the API is not configured or the shopper is signed out. */
export function readLocalWishlist(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(WISHLIST_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function writeLocalWishlist(ids: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(WISHLIST_KEY, JSON.stringify(ids));
  } catch {
    /* storage may be unavailable in private mode */
  }
}

const unique = <T,>(values: T[]): T[] => Array.from(new Set(values));

/** Maps a backend product onto the storefront `Product` shape used by every existing component. */
export function toStoreProduct(apiProduct: ApiProduct): Product {
  const variants: StoreVariant[] = apiProduct.variants.map((variant) => ({
    sku: variant.sku,
    size: variant.size,
    color: variant.color,
    images: (variant.images ?? []).map((image) => image.url).filter(Boolean),
    price: variant.price,
    mrp: variant.mrp,
    available: apiProduct.inventory?.[variant.sku],
  }));
  const cheapest = variants.reduce((best, variant) => (variant.price < best.price ? variant : best), variants[0]);
  const images = (apiProduct.images ?? []).map((image) => image.url).filter(Boolean);
  const badge = apiProduct.badges?.[0];
  const badgeType = badge
    ? /best/i.test(badge)
      ? "bestseller"
      : /new/i.test(badge)
      ? "new"
      : /sale|offer/i.test(badge)
      ? "sale"
      : "mul"
    : apiProduct.featured
    ? "bestseller"
    : undefined;

  const details = [
    apiProduct.fabric && `Fabric: ${apiProduct.fabric}`,
    apiProduct.craft && `Craft: ${apiProduct.craft}`,
    apiProduct.hsnCode && `HSN: ${apiProduct.hsnCode}${apiProduct.gstRate ? ` · GST ${apiProduct.gstRate}%` : ""}`,
    variants.length > 0 && `Available sizes: ${unique(variants.map((variant) => variant.size).filter(Boolean)).join(", ")}`,
    "Handcrafted in India · Dispatch in 2–3 working days",
  ].filter((line): line is string => Boolean(line));

  return {
    id: apiProduct._id,
    productId: apiProduct._id,
    slug: apiProduct.slug,
    title: apiProduct.name,
    category: apiProduct.category,
    fabric: apiProduct.fabric || apiProduct.craft || "",
    price: cheapest?.price ?? 0,
    originalPrice: cheapest?.mrp ?? cheapest?.price ?? 0,
    rating: apiProduct.rating?.average ?? 0,
    reviewsCount: apiProduct.rating?.count ?? 0,
    badge,
    badgeType,
    image: images[0] ?? "",
    hoverImage: apiProduct.hoverImage === undefined ? images[1] ?? images[0] ?? "" : apiProduct.hoverImage,
    videoUrl: apiProduct.videos?.[0]?.url,
    sizes: unique(variants.map((variant) => variant.size).filter((size): size is string => Boolean(size))),
    description: apiProduct.description || apiProduct.shortDescription || apiProduct.name,
    sizeGuide: apiProduct.sizeGuide,
    details,
    variants,
    status: apiProduct.status,
  };
}

export const cartLineToItem = (line: ApiCartLine): CartItem => ({
  id: line.productId,
  productId: line.productId,
  slug: line.slug,
  available: line.available,
  inStock: line.inStock,
  lineId: line.lineId,
  sku: line.sku,
  title: line.title,
  price: line.price,
  originalPrice: line.originalPrice,
  size: line.size ?? "",
  color: line.color,
  image: line.image,
  quantity: line.quantity,
});

export const addressToApi = (address: OrderAddress) => ({
  fullName: address.fullName ?? "",
  phone: (address.phone ?? "").replace(/\D/g, "").slice(-10),
  email: address.email ?? "",
  line1: address.line1 ?? "",
  line2: address.line2,
  landmark: address.landmark,
  city: address.city ?? "",
  state: address.state ?? "",
  pincode: address.pincode ?? "",
  country: "IN",
});

/* ---------------------------------------------------------------- catalogue */

export async function listProducts(params: { page?: number; limit?: number; category?: string; q?: string } = {}, signal?: AbortSignal): Promise<{ products: Product[]; total: number; pages: number }> {
  const query = new URLSearchParams();
  query.set("limit", String(params.limit ?? 60));
  if (params.page) query.set("page", String(params.page));
  if (params.category && params.category !== "all") query.set("category", params.category);
  if (params.q) query.set("q", params.q);
  const response = await apiFetch<Paginated<ApiProduct>>(`/api/products?${query.toString()}`, { signal });
  return {
    products: response.data.map(toStoreProduct),
    total: response.meta?.total ?? response.data.length,
    pages: response.meta?.pages ?? 1,
  };
}

export async function getProduct(slug: string, signal?: AbortSignal): Promise<Product> {
  const response = await apiFetch<{ data: ApiProduct }>(`/api/products/${encodeURIComponent(slug)}`, { signal });
  return toStoreProduct(response.data);
}

export async function searchProducts(term: string, signal?: AbortSignal, limit = 8): Promise<{ products: Product[]; total: number }> {
  const response = await apiFetch<{ data: ApiProduct[]; meta?: { total?: number } }>(`/api/search?q=${encodeURIComponent(term)}&limit=${limit}`, { signal });
  return { products: response.data.map(toStoreProduct), total: response.meta?.total ?? response.data.length };
}

export async function getProductReviews(productId: string, signal?: AbortSignal): Promise<StoreReview[]> {
  const response = await apiFetch<{ data: StoreReview[] }>(`/api/reviews/product/${productId}`, { signal });
  return response.data;
}

export async function submitReview(payload: { productId: string; orderId?: string; rating: number; title?: string; body: string; images?: string[] }): Promise<StoreReview> {
  const response = await apiFetch<{ data: StoreReview }>("/api/reviews", { method: "POST", body: payload });
  return response.data;
}

export async function getMyReviews(signal?: AbortSignal): Promise<StoreReview[]> {
  const response = await apiFetch<{ data: StoreReview[] }>("/api/reviews/mine", { signal });
  return response.data;
}

export async function updateMyReview(reviewId: string, payload: { rating: number; title?: string; body: string; images?: string[] }): Promise<StoreReview> {
  const response = await apiFetch<{ data: StoreReview }>(`/api/reviews/mine/${reviewId}`, { method: "PATCH", body: payload });
  return response.data;
}

export async function deleteMyReview(reviewId: string): Promise<void> {
  await apiFetch(`/api/reviews/mine/${reviewId}`, { method: "DELETE" });
}

/* --------------------------------------------------------------------- cart */

export async function fetchCart(signal?: AbortSignal): Promise<CartSnapshot> {
  const response = await apiFetch<{ data: CartSnapshot }>("/api/cart", { headers: cartHeaders(), signal });
  return response.data;
}

export async function addCartItem(sku: string, quantity = 1): Promise<CartSnapshot> {
  const response = await apiFetch<{ data: CartSnapshot }>("/api/cart/items", { method: "POST", body: { sku, quantity }, headers: cartHeaders() });
  return response.data;
}

export async function updateCartLine(lineId: string, quantity: number): Promise<CartSnapshot> {
  const response = await apiFetch<{ data: CartSnapshot }>(`/api/cart/items/${lineId}`, { method: "PATCH", body: { quantity }, headers: cartHeaders() });
  return response.data;
}

export async function removeCartLine(lineId: string): Promise<CartSnapshot> {
  const response = await apiFetch<{ data: CartSnapshot }>(`/api/cart/items/${lineId}`, { method: "DELETE", headers: cartHeaders() });
  return response.data;
}

export async function clearServerCart(): Promise<CartSnapshot> {
  const response = await apiFetch<{ data: CartSnapshot }>("/api/cart", { method: "DELETE", headers: cartHeaders() });
  return response.data;
}

/* ------------------------------------------------------------------- orders */

export interface CheckoutPayload {
  items: { productId: string; sku: string; quantity: number }[];
  shippingAddress: OrderAddress;
  couponCode?: string;
  paymentMethod: "razorpay" | "cod";
  giftOptions?: GiftOptions;
}

export interface RazorpayHandoff {
  id: string;
  amount: number;
  currency: string;
  keyId: string;
  expiresAt?: string;
}

export async function placeOrder(payload: CheckoutPayload): Promise<{ order: StoreOrder; payment?: RazorpayHandoff }> {
  return apiFetch<{ order: StoreOrder; payment?: RazorpayHandoff } & { data: StoreOrder }>("/api/orders", {
    method: "POST",
    body: { ...payload, shippingAddress: addressToApi(payload.shippingAddress) },
  }).then((response) => ({ order: response.data, payment: response.payment }));
}

/**
 * This browser's copy of the order it just placed. Guest orders cannot be re-fetched from the
 * authenticated order API, so checkout keeps the create-order response in sessionStorage and the
 * confirmation page renders from it (a signed-in shopper's copy is refreshed from the API). It is
 * session-scoped on purpose: the snapshot carries the delivery address and should not outlive the tab.
 */
const LAST_ORDER_KEY = "vani_last_order";

export function saveLastOrderSnapshot(order: StoreOrder): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(LAST_ORDER_KEY, JSON.stringify(order));
  } catch {
    /* private mode / quota — confirmation still works for signed-in shoppers via the API */
  }
}

export function readLastOrderSnapshot(orderId: string): StoreOrder | null {
  if (typeof window === "undefined") return null;
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(LAST_ORDER_KEY) || "null") as StoreOrder | null;
    return parsed && (parsed._id === orderId || parsed.orderNumber === orderId) ? parsed : null;
  } catch {
    return null;
  }
}

export interface PaymentVerification {
  _id: string;
  orderNumber: string;
  status: string;
  payment: { status: string };
}

export async function verifyRazorpayPayment(payload: { orderId: string; razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }): Promise<PaymentVerification> {
  const response = await apiFetch<{ data: PaymentVerification }>("/api/payments/razorpay/verify", { method: "POST", body: payload });
  return response.data;
}

/** Thin, privacy-safe payload returned by guest tracking (`POST /api/orders/track-public`). */
export interface PublicOrderTracking {
  orderNumber: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  items: { name: string; image?: string; size?: string; color?: string; quantity: number }[];
  total?: number;
  paymentMethod?: string;
  shipment?: { awb?: string; courier?: string; trackingUrl?: string; status?: string; estimatedDelivery?: string };
  statusHistory: { status: string; at: string; note?: string }[];
}

/**
 * Guest tracking unlocked by order number/AWB + the full order mobile number. The backend answers
 * one generic 404 for every mismatch, so callers must not try to guess which field was wrong.
 */
export async function trackOrderPublic(identifier: string, phone: string): Promise<PublicOrderTracking> {
  const response = await apiFetch<{ data: PublicOrderTracking }>("/api/orders/track-public", {
    method: "POST",
    body: { identifier: identifier.trim(), phone: phone.trim() },
  });
  return response.data;
}

export async function getMyOrders(signal?: AbortSignal): Promise<StoreOrder[]> {
  const response = await apiFetch<{ data: StoreOrder[] }>("/api/orders/mine", { signal });
  return response.data;
}

export async function getOrder(orderId: string, signal?: AbortSignal): Promise<StoreOrder> {
  const response = await apiFetch<{ data: StoreOrder }>(`/api/orders/${orderId}`, { signal });
  return response.data;
}

export async function createOrderPaymentSession(orderId: string): Promise<RazorpayHandoff & { orderNumber: string }> {
  const response = await apiFetch<{ data: RazorpayHandoff & { orderNumber: string } }>(`/api/orders/${orderId}/payment-session`, { method: "POST", body: {} });
  return response.data;
}

export async function cancelOrder(orderId: string, reason?: string): Promise<StoreOrder> {
  const response = await apiFetch<{ data: StoreOrder }>(`/api/orders/${orderId}/cancel`, { method: "POST", body: { reason } });
  return response.data;
}

/* ------------------------------------------------- shipping, coupons, returns */

export interface Serviceability {
  pincode: string;
  serviceable: boolean;
  cod: boolean;
  etaDays: number;
  zone: string;
  shippingFee: number;
  freeAbove: number;
}

export async function checkServiceability(pincode: string): Promise<Serviceability> {
  const response = await apiFetch<{ data: Serviceability }>(`/api/shipping/serviceability?pincode=${encodeURIComponent(pincode)}`);
  return response.data;
}

export async function validateCoupon(code: string, subtotal: number): Promise<{ code: string; discount: number; type: string }> {
  const response = await apiFetch<{ data: { code: string; discount: number; type: string } }>("/api/coupons/validate", { method: "POST", body: { code, subtotal } });
  return response.data;
}

export interface MyReturnRequest {
  _id: string;
  returnNumber: string;
  type: "return" | "exchange" | string;
  status: string;
  items: { sku: string; quantity: number; reason: string; condition?: string }[];
  refundAmount?: number;
  refundId?: string;
  adminNote?: string;
  createdAt: string;
  updatedAt?: string;
  orderId: string | { _id: string; orderNumber: string; status: string; amounts?: { total: number }; items?: OrderLine[] };
}

export async function requestReturn(payload: { orderId: string; type: "return" | "exchange"; items: { sku: string; quantity: number; reason: string; condition?: string }[] }): Promise<MyReturnRequest> {
  const response = await apiFetch<{ data: MyReturnRequest }>("/api/returns", { method: "POST", body: payload });
  return response.data;
}

export async function getMyReturns(signal?: AbortSignal): Promise<MyReturnRequest[]> {
  const response = await apiFetch<{ data: MyReturnRequest[] }>("/api/returns/mine", { signal });
  return response.data;
}

/* ----------------------------------------------------------------- customer */

/** One saved wishlist row. `product` carries the populated catalogue entry when present. */
export interface WishlistRow {
  productId: string;
  sku?: string;
  addedAt?: string;
  product?: unknown;
}

/**
 * Coerces a wishlist row's id to a string.
 *
 * The API is meant to return `productId` as a string, but it used to hand back the *populated
 * Product document* — and because the return type claimed `string`, TypeScript could not catch it.
 * Every consumer then compared an object against a string id, so a signed-in shopper's saved
 * wishlist never matched, and the object was written into localStorage as "[object Object]".
 * Normalising here means a shape regression on either side degrades instead of corrupting storage.
 */
const wishlistId = (row: WishlistRow | string): string => {
  if (typeof row === "string") return row;
  const value = row?.productId as unknown;
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "_id" in value) return String((value as { _id: unknown })._id);
  return "";
};

export async function fetchWishlist(signal?: AbortSignal): Promise<string[]> {
  const response = await apiFetch<{ data: WishlistRow[] }>("/api/customers/wishlist", { signal });
  const ids = (response.data ?? []).map(wishlistId).filter(Boolean);
  // De-duplicate defensively: a stale row set should never render the same product twice.
  return Array.from(new Set(ids));
}

/** The saved rows with their populated product data, for the account wishlist screen. */
export async function fetchWishlistRows(signal?: AbortSignal): Promise<WishlistRow[]> {
  const response = await apiFetch<{ data: WishlistRow[] }>("/api/customers/wishlist", { signal });
  return (response.data ?? []).map((row) => ({ ...row, productId: wishlistId(row) })).filter((row) => row.productId);
}

export async function addWishlistItem(productId: string): Promise<void> {
  await apiFetch("/api/customers/wishlist", { method: "PUT", body: { productId } });
}

/**
 * Merges a whole guest wishlist in one request.
 *
 * The backend de-duplicates by productId and keeps each insert atomic, so signing in repeatedly — or
 * in two tabs at once — cannot grow the list. One round trip also avoids the burst of concurrent
 * PUTs the per-item loop used to fire.
 */
export async function mergeWishlist(productIds: string[]): Promise<string[]> {
  const ids = Array.from(new Set(productIds.map((id) => (id || "").trim()).filter(Boolean)));
  if (ids.length === 0) return [];
  const response = await apiFetch<{ data: WishlistRow[] }>("/api/customers/wishlist", {
    method: "PUT",
    body: { items: ids.map((productId) => ({ productId })) },
  });
  return (response.data ?? []).map(wishlistId).filter(Boolean);
}

export async function removeWishlistItem(productId: string): Promise<void> {
  await apiFetch(`/api/customers/wishlist/${productId}`, { method: "DELETE" });
}

export async function updateProfile(payload: {
  firstName?: string;
  lastName?: string;
  phone?: string;
  preferences?: Record<string, boolean | string>;
  avatar?: string;
}): Promise<void> {
  await apiFetch("/api/customers/profile", { method: "PATCH", body: payload });
}

export async function changeCredentials(payload: {
  currentPassword: string;
  newPassword?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}): Promise<void> {
  await apiFetch("/api/auth/change-credentials", { method: "PATCH", body: payload });
}

export async function deleteCustomerAccount(): Promise<void> {
  await apiFetch("/api/customers/profile", { method: "DELETE" });
}

export interface ApiAddress {
  _id: string;
  label?: string;
  fullName?: string;
  phone?: string;
  line1?: string;
  line2?: string;
  landmark?: string;
  city?: string;
  state?: string;
  pincode?: string;
  isDefault?: boolean;
}

export async function fetchAddresses(signal?: AbortSignal): Promise<ApiAddress[]> {
  const response = await apiFetch<{ data: ApiAddress[] }>("/api/customers/addresses", { signal });
  return response.data;
}

export async function createAddress(payload: Omit<ApiAddress, "_id">): Promise<ApiAddress[]> {
  const response = await apiFetch<{ data: ApiAddress[] }>("/api/customers/addresses", { method: "POST", body: payload });
  return response.data;
}

export async function updateAddress(id: string, payload: Partial<ApiAddress>): Promise<ApiAddress[]> {
  const response = await apiFetch<{ data: ApiAddress[] }>(`/api/customers/addresses/${id}`, { method: "PATCH", body: payload });
  return response.data;
}

export async function deleteAddress(id: string): Promise<void> {
  await apiFetch(`/api/customers/addresses/${id}`, { method: "DELETE" });
}

/* --------------------------------------------------------------------- auth */

export async function requestPasswordReset(email: string): Promise<{ resetUrl?: string }> {
  const response = await apiFetch<{ meta?: { resetUrl?: string } }>("/api/auth/forgot-password", { method: "POST", body: { email } });
  return response.meta ?? {};
}

export async function resetPassword(token: string, password: string): Promise<void> {
  await apiFetch("/api/auth/reset-password", { method: "POST", body: { token, password } });
}

/* ------------------------------------------------------------------ razorpay */

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

/** Loads the Razorpay checkout script once and resolves when it is ready. */
export function loadRazorpay(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export { isApiConfigured, ApiError };
