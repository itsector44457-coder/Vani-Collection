/**
 * Customer-facing delivery pricing — the single frontend mirror of `backend/src/services/pricing.js`
 * and `backend/src/services/shipping.js`. Cart, checkout, product pages and policy copy must all
 * read these numbers from here so the website never quotes one fee and charges another.
 */
export const FREE_SHIPPING_THRESHOLD = 1999;

/** Pincode-zone fees actually charged below the free-shipping threshold. */
export const SHIPPING_FEE_NEAR = 79;
export const SHIPPING_FEE_FAR = 99;

/** Exact fee once the pincode zone fee is known; `null` zone fee means "not checked yet". */
export function shippingFeeFor(subtotalAfterDiscount: number, zoneFee?: number | null): number {
  if (subtotalAfterDiscount >= FREE_SHIPPING_THRESHOLD) return 0;
  return zoneFee ?? SHIPPING_FEE_FAR;
}

export const SHIPPING_FEE_LABEL = `₹${SHIPPING_FEE_NEAR}–₹${SHIPPING_FEE_FAR}`;

export const DELIVERY_PINCODE_KEY = "vani_delivery_pincode";

export function readSavedPincode(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(DELIVERY_PINCODE_KEY) || window.localStorage.getItem("vani_user_pincode") || "";
  } catch {
    return "";
  }
}

export function savePincode(pincode: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DELIVERY_PINCODE_KEY, pincode);
    window.localStorage.setItem("vani_user_pincode", pincode);
  } catch {
    /* private mode — the shopper can still type it at checkout */
  }
}
