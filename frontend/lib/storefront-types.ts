/** Canonical storefront types shared by the demo data, the API adapters and the React contexts. */

export interface StoreVariant {
  sku: string;
  size?: string;
  color?: string;
  price: number;
  mrp: number;
  /** Units available to sell (onHand − reserved) when the backend reported inventory. */
  available?: number;
}

export interface Product {
  /** Storefront identity — the backend `_id` when the product came from the API. */
  id: string;
  title: string;
  category: string;
  fabric: string;
  price: number;
  originalPrice: number;
  rating: number;
  reviewsCount: number;
  badge?: string;
  badgeType?: "bestseller" | "new" | "sale" | "mul";
  image: string;
  hoverImage: string;
  videoUrl?: string;
  sizes: string[];
  description: string;
  details: string[];
  /** Backend product id — present for API products, used by the real cart and checkout. */
  productId?: string;
  /** Backend slug — present for API products, preferred for links. */
  slug?: string;
  /** Sellable variants with SKUs — required to place a real order. */
  variants?: StoreVariant[];
  status?: string;
  isDemo?: boolean;
}

export interface CartItem {
  id: string;
  title: string;
  price: number;
  originalPrice: number;
  size: string;
  image: string;
  color?: string;
  quantity: number;
  /** Backend identifiers — present when the line came from the real cart. */
  sku?: string;
  lineId?: string;
  productId?: string;
  /** True for demo-mode lines that cannot be sent to the backend. */
  localOnly?: boolean;
}

export interface OrderLine {
  sku: string;
  name?: string;
  image?: string;
  size?: string;
  color?: string;
  quantity: number;
  unitPrice: number;
  mrp?: number;
  lineTotal: number;
}

export interface OrderAddress {
  fullName?: string;
  phone?: string;
  email?: string;
  line1?: string;
  line2?: string;
  landmark?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

export interface StoreOrder {
  _id: string;
  orderNumber: string;
  createdAt: string;
  status: string;
  statusHistory?: { status: string; at: string; actor?: string; note?: string }[];
  items: OrderLine[];
  amounts: { subtotal: number; discount: number; shipping: number; tax: number; total: number; currency?: string };
  payment: { method: string; status: string; providerPaymentId?: string; paidAt?: string };
  shipment?: { awb?: string; courier?: string; trackingUrl?: string; status?: string; estimatedDelivery?: string };
  shippingAddress?: OrderAddress;
  couponCode?: string;
}

export interface StoreReview {
  _id: string;
  productId: string;
  customerName: string;
  rating: number;
  title?: string;
  body: string;
  createdAt: string;
  verifiedPurchase?: boolean;
}

export const PRODUCT_STATUS_LABELS: Record<string, string> = {
  pending_payment: "Payment pending",
  confirmed: "Confirmed",
  processing: "Processing",
  packed: "Packed",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  return_requested: "Return requested",
  returned: "Returned",
  refunded: "Refunded",
};

export const orderStatusLabel = (status: string): string => PRODUCT_STATUS_LABELS[status] ?? status;
