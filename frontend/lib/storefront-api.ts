/**
 * Storefront ↔ backend bridge.
 *
 * Every function here is used by the demo storefront; when NEXT_PUBLIC_API_URL is configured the data
 * is real (catalogue, cart, orders, auth), otherwise the pages fall back to the bundled demo data.
 */
import { apiFetch, ApiError, isApiConfigured, type Paginated } from "./api-client";
import type { CartItem, OrderAddress, Product, StoreOrder, StoreReview, StoreVariant } from "./storefront-types";

const CART_TOKEN_KEY = "vani_cart_token";
const WISHLIST_KEY = "vani_wishlist";

/* --------------------------------------------------------------- api shapes */

interface ApiVariant {
  sku: string;
  size?: string;
  color?: string;
  price: number;
  mrp: number;
}

interface ApiProduct {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  shortDescription?: string;
  category: string;
  fabric?: string;
  craft?: string;
  hsnCode?: string;
  gstRate?: number;
  images?: { url: string; alt?: string }[];
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
    hoverImage: images[1] ?? images[0] ?? "",
    videoUrl: apiProduct.videos?.[0]?.url,
    sizes: unique(variants.map((variant) => variant.size).filter((size): size is string => Boolean(size))),
    description: apiProduct.description || apiProduct.shortDescription || apiProduct.name,
    details,
    variants,
    status: apiProduct.status,
  };
}

export const cartLineToItem = (line: ApiCartLine): CartItem => ({
  id: line.productId,
  productId: line.productId,
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
  line1: address.line1 ?? "",
  line2: address.line2,
  landmark: address.landmark,
  city: address.city ?? "",
  state: address.state ?? "",
  pincode: address.pincode ?? "",
  country: "IN",
});

/* ---------------------------------------------------------------- catalogue */

export async function listProducts(params: { page?: number; limit?: number; category?: string; q?: string } = {}, signal?: AbortSignal): Promise<{ products: Product[]; total: number }> {
  const query = new URLSearchParams();
  query.set("limit", String(params.limit ?? 60));
  if (params.page) query.set("page", String(params.page));
  if (params.category && params.category !== "all") query.set("category", params.category);
  if (params.q) query.set("q", params.q);
  const response = await apiFetch<Paginated<ApiProduct>>(`/api/products?${query.toString()}`, { signal });
  return { products: response.data.map(toStoreProduct), total: response.meta?.total ?? response.data.length };
}

export async function getProduct(slug: string, signal?: AbortSignal): Promise<Product> {
  const response = await apiFetch<{ data: ApiProduct }>(`/api/products/${encodeURIComponent(slug)}`, { signal });
  return toStoreProduct(response.data);
}

export async function searchProducts(term: string, signal?: AbortSignal): Promise<Product[]> {
  const response = await apiFetch<{ data: ApiProduct[] }>(`/api/search?q=${encodeURIComponent(term)}`, { signal });
  return response.data.map(toStoreProduct);
}

export async function getProductReviews(productId: string, signal?: AbortSignal): Promise<StoreReview[]> {
  const response = await apiFetch<{ data: StoreReview[] }>(`/api/reviews/product/${productId}`, { signal });
  return response.data;
}

export async function submitReview(payload: { productId: string; rating: number; title?: string; body: string; images?: string[] }): Promise<void> {
  await apiFetch("/api/reviews", { method: "POST", body: payload });
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
}

export interface RazorpayHandoff {
  id: string;
  amount: number;
  currency: string;
  keyId: string;
}

export async function placeOrder(payload: CheckoutPayload): Promise<{ order: StoreOrder; payment?: RazorpayHandoff }> {
  return apiFetch<{ order: StoreOrder; payment?: RazorpayHandoff } & { data: StoreOrder }>("/api/orders", {
    method: "POST",
    body: { ...payload, shippingAddress: addressToApi(payload.shippingAddress) },
  }).then((response) => ({ order: response.data, payment: response.payment }));
}

export async function verifyRazorpayPayment(payload: { orderId: string; razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }): Promise<StoreOrder> {
  const response = await apiFetch<{ data: StoreOrder }>("/api/payments/razorpay/verify", { method: "POST", body: payload });
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

export async function requestReturn(payload: { orderId: string; type: "return" | "exchange"; items: { sku: string; quantity: number; reason: string }[] }): Promise<void> {
  await apiFetch("/api/returns", { method: "POST", body: payload });
}

/* ----------------------------------------------------------------- customer */

export async function fetchWishlist(signal?: AbortSignal): Promise<string[]> {
  const response = await apiFetch<{ data: { productId: string }[] }>("/api/customers/wishlist", { signal });
  return response.data.map((item) => item.productId);
}

export async function addWishlistItem(productId: string): Promise<void> {
  await apiFetch("/api/customers/wishlist", { method: "PUT", body: { productId } });
}

export async function removeWishlistItem(productId: string): Promise<void> {
  await apiFetch(`/api/customers/wishlist/${productId}`, { method: "DELETE" });
}

export async function updateProfile(payload: { firstName?: string; lastName?: string; phone?: string }): Promise<void> {
  await apiFetch("/api/customers/profile", { method: "PATCH", body: payload });
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
