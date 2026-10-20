"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { isApiConfigured } from "../../lib/api-client";
import { checkServiceability, loadRazorpay, placeOrder, saveLastOrderSnapshot, validateCoupon, verifyRazorpayPayment, type RazorpayHandoff, type Serviceability } from "../../lib/storefront-api";
import GiftOptionsCard from "../../components/GiftOptionsCard";
import type { GiftOptions, StoreOrder } from "../../lib/storefront-types";
import { readSavedPincode, savePincode, SHIPPING_FEE_FAR, SHIPPING_FEE_LABEL, SHIPPING_FEE_NEAR, shippingFeeFor } from "../../lib/pricing";
import { formatPrice } from "../../lib/utils";

/* ─── Types ─── */
interface Address {
  fullName: string;
  phone: string;
  email: string;
  pincode: string;
  address: string;
  city: string;
  state: string;
  landmark: string;
  addressType: "home" | "work" | "other";
}

const EMPTY_ADDRESS: Address = {
  fullName: "",
  phone: "",
  email: "",
  pincode: "",
  address: "",
  city: "",
  state: "",
  landmark: "",
  addressType: "home",
};

const INDIAN_STATES = [
  "Andaman and Nicobar Islands",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chandigarh",
  "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu & Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Ladakh",
  "Lakshadweep",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Puducherry",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
];

/**
 * Conservative pincode → state autofill from postal circles. Only fills a blank state and only
 * where the prefix is unambiguous; border circles (16x, 19x, 79x…) stay manual rather than wrong.
 */
function stateForPincode(pincode: string): string {
  const three = pincode.slice(0, 3);
  const two = pincode.slice(0, 2);
  if (three === "403") return "Goa";
  if (three === "605") return "Puducherry";
  if (three === "682") return "Lakshadweep";
  if (three === "737") return "Sikkim";
  if (three === "744") return "Andaman and Nicobar Islands";
  if (["246", "247", "248", "249"].includes(three)) return "Uttarakhand";
  const byTwo: Record<string, string> = {
    "11": "Delhi", "12": "Haryana", "13": "Haryana", "14": "Punjab", "15": "Punjab", "17": "Himachal Pradesh",
    "20": "Uttar Pradesh", "21": "Uttar Pradesh", "22": "Uttar Pradesh", "23": "Uttar Pradesh", "25": "Uttar Pradesh", "26": "Uttar Pradesh", "27": "Uttar Pradesh", "28": "Uttar Pradesh",
    "30": "Rajasthan", "31": "Rajasthan", "32": "Rajasthan", "33": "Rajasthan", "34": "Rajasthan",
    "36": "Gujarat", "37": "Gujarat", "38": "Gujarat", "39": "Gujarat",
    "40": "Maharashtra", "41": "Maharashtra", "42": "Maharashtra", "43": "Maharashtra", "44": "Maharashtra",
    "45": "Madhya Pradesh", "46": "Madhya Pradesh", "47": "Madhya Pradesh", "48": "Madhya Pradesh", "49": "Chhattisgarh",
    "50": "Telangana", "51": "Andhra Pradesh", "52": "Andhra Pradesh", "53": "Andhra Pradesh",
    "56": "Karnataka", "57": "Karnataka", "58": "Karnataka", "59": "Karnataka",
    "60": "Tamil Nadu", "61": "Tamil Nadu", "62": "Tamil Nadu", "63": "Tamil Nadu", "64": "Tamil Nadu", "65": "Tamil Nadu", "66": "Tamil Nadu",
    "67": "Kerala", "68": "Kerala", "69": "Kerala",
    "70": "West Bengal", "71": "West Bengal", "72": "West Bengal", "73": "West Bengal", "74": "West Bengal",
    "75": "Odisha", "76": "Odisha", "77": "Odisha", "78": "Assam",
    "80": "Bihar", "81": "Bihar", "82": "Bihar", "83": "Jharkhand", "84": "Bihar", "85": "Bihar",
  };
  return byTwo[two] ?? "";
}

type PaymentMethodId = "online" | "cod";

const PAYMENT_METHODS: { id: PaymentMethodId; label: string; desc: string }[] = [
  {
    id: "online",
    label: "Online Payment — UPI / Card / Net Banking",
    desc: "Choose GPay, PhonePe, a card, or net banking in Razorpay's secure window. We never store your card or UPI details.",
  },
  {
    id: "cod",
    label: "Cash on Delivery",
    desc: "Pay by cash or UPI on delivery (available in selected PIN codes).",
  },
];

const CHECKOUT_DRAFT_KEY = "vani_checkout_draft";
const GIFT_PACKAGING_FEE = 149;

interface PendingPayment {
  order: StoreOrder;
  payment: RazorpayHandoff;
  fingerprint: string;
}

const formatPaymentExpiry = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
};

const STEPS = ["Cart Review", "Delivery Address", "Payment", "Confirmation"];

/* ─── Step Indicator ─── */
function StepIndicator({ current }: { current: number }) {
  return (
    <>
    <p className="mb-3 text-center text-xs font-bold uppercase tracking-widest text-[#881337] sm:hidden" aria-live="polite">
      Step {current + 1} of {STEPS.length}: {STEPS[current]}
    </p>
    <div
      className="flex items-center justify-center gap-0 mb-8"
      role="list"
      aria-label={`Checkout progress: step ${current + 1} of ${STEPS.length}`}
    >
      {STEPS.map((label, i) => (
        <div key={label} className="flex items-center" role="listitem">
          <div className="flex flex-col items-center">
            <div
              aria-current={i === current ? "step" : undefined}
              aria-label={`${label}${i < current ? ", completed" : i === current ? ", current step" : ""}`}
              className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                i < current
                  ? "bg-emerald-600 text-white"
                  : i === current
                    ? "bg-[#881337] text-white ring-4 ring-[#881337]/20"
                    : "bg-gray-200 text-gray-500"
              }`}
            >
              {i < current ? (
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                >
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              ) : (
                i + 1
              )}
            </div>
            <span
              className={`text-[10px] mt-1 font-medium whitespace-nowrap hidden sm:block ${
                i === current
                  ? "text-[#881337]"
                  : i < current
                    ? "text-emerald-600"
                    : "text-gray-400"
              }`}
            >
              {label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div
              className={`w-10 sm:w-16 h-0.5 mx-1 transition-all duration-500 ${
                i < current ? "bg-emerald-500" : "bg-gray-200"
              }`}
            />
          )}
        </div>
      ))}
    </div>
    </>
  );
}

/* ─── Order Summary Panel ─── */
function OrderSummary({
  compact = false,
  discount = 0,
  giftFee = 0,
  shipping = null,
}: {
  compact?: boolean;
  discount?: number;
  giftFee?: number;
  /** Exact fee once the pincode is checked; null shows the honest ₹79–₹99 range. */
  shipping?: number | null;
}) {
  const { cart, subtotal } = useCart();
  const total = shipping === null ? null : subtotal + shipping - discount + giftFee;
  const estimatedRange = `${formatPrice(subtotal - discount + giftFee + SHIPPING_FEE_NEAR)}–${formatPrice(subtotal - discount + giftFee + SHIPPING_FEE_FAR)}`;
  const savings = cart.reduce(
    (s, i) => s + (i.originalPrice - i.price) * i.quantity,
    0,
  );

  return (
    <div
      className={`bg-white rounded-2xl border border-gray-200 overflow-hidden ${compact ? "" : "sticky top-24"}`}
    >
      <div className="bg-gradient-to-r from-[#1c1917] to-[#3d2012] text-white px-5 py-4">
        <h3 className="font-semibold text-sm">Order Summary</h3>
        <p className="text-white/60 text-xs mt-0.5">
          {cart.length} item{cart.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="p-5 space-y-3">
        {/* Items */}
        {cart.map((item) => (
          <div key={`${item.lineId || item.sku || item.id}-${item.size}-${item.color || ""}`} className="flex gap-3">
            <Image
              src={item.image}
              alt={item.title}
              width={56}
              height={64}
              unoptimized
              sizes="56px"
              className="h-16 w-14 flex-shrink-0 rounded-lg border border-gray-100 object-cover"
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-900 font-medium leading-snug line-clamp-2">
                {item.title}
              </p>
              <p className="text-[10px] text-gray-500 mt-0.5">
                Size: {item.size} · Qty: {item.quantity}
              </p>
              <p className="text-sm font-bold text-[#881337] mt-1">
                ₹{(item.price * item.quantity).toLocaleString()}
              </p>
            </div>
          </div>
        ))}

        {/* Divider */}
        <div className="border-t border-gray-100 pt-3 space-y-2 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal</span>
            <span>₹{subtotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Shipping</span>
            <span
              className={shipping === 0 ? "text-emerald-600 font-medium" : ""}
            >
              {shipping === null ? `${SHIPPING_FEE_LABEL} (after PIN code check)` : shipping === 0 ? "FREE" : formatPrice(shipping)}
            </span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-emerald-700">
              <span>Promo discount</span>
              <span className="font-medium">−₹{discount.toLocaleString()}</span>
            </div>
          )}
          {giftFee > 0 && (
            <div className="flex justify-between text-amber-900 font-medium">
              <span>🎁 Royal Gift Box</span>
              <span>+₹{giftFee.toLocaleString()}</span>
            </div>
          )}
          {savings > 0 && (
            <div className="flex justify-between text-emerald-700">
              <span>Product savings</span>
              <span className="font-medium">₹{savings.toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-gray-900 text-base border-t border-gray-200 pt-2">
            <span>{total === null ? "Estimated total" : "Total"}</span>
            <span>{total === null ? estimatedRange : formatPrice(total)}</span>
          </div>
          <p className="text-[11px] leading-relaxed text-gray-500">Taxes are included. Final shipping charges will be confirmed after your PIN code is checked and shown before payment.</p>
        </div>

        {/* Trust badges */}
        <div className="border-t border-gray-100 pt-3.5 grid grid-cols-2 gap-2.5">
          <span className="text-[11px] text-gray-700 flex items-center gap-1.5 font-medium">
            <svg className="w-3.5 h-3.5 text-emerald-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
            </svg>
            100% Secure Payment
          </span>
          <span className="text-[11px] text-gray-700 flex items-center gap-1.5 font-medium">
            <svg className="w-3.5 h-3.5 text-stone-700 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="9" />
              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
            </svg>
            7-day Return & Exchange
          </span>
          <span className="text-[11px] text-gray-700 flex items-center gap-1.5 font-medium">
            <svg className="w-3.5 h-3.5 text-[#881337] shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <rect x="1" y="3" width="15" height="13" />
              <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
              <circle cx="5.5" cy="18.5" r="2.5" />
              <circle cx="18.5" cy="18.5" r="2.5" />
            </svg>
            Free shipping on orders over ₹1,999
          </span>
          <span className="text-[11px] text-gray-700 flex items-center gap-1.5 font-medium">
            <svg className="w-3.5 h-3.5 text-amber-600 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <rect x="2" y="6" width="20" height="12" rx="2" />
              <circle cx="12" cy="12" r="2" />
              <path d="M6 12h.01M18 12h.01" />
            </svg>
            COD available in selected PIN codes
          </span>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════ */
export default function CheckoutPage() {
  const {
    cart,
    subtotal,
    clearCart,
    hasLocalOnlyItems,
    updateQuantity,
    removeFromCart,
    isSyncing,
    error: cartError,
    dismissError,
    lastRemoved,
    undoRemove,
    dismissLastRemoved,
  } = useCart();
  const { user, isAuthenticated, addAddress } = useAuth();
  const router = useRouter();
  const live = isApiConfigured();

  const [step, setStep] = useState(0);
  const [address, setAddress] = useState<Address>(EMPTY_ADDRESS);
  const [addressErrors, setAddressErrors] = useState<Partial<Address>>({});
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodId>("online");
  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState(false);
  const [appliedPromoCode, setAppliedPromoCode] = useState("");
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoError, setPromoError] = useState("");
  const [promoChecking, setPromoChecking] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [placing, setPlacing] = useState(false);
  const [serviceability, setServiceability] = useState<Serviceability | null>(null);
  const [pincodeStatus, setPincodeStatus] = useState<"idle" | "checking" | "ok" | "error">("idle");
  const [pendingPayment, setPendingPayment] = useState<PendingPayment | null>(null);
  const [paymentUncertain, setPaymentUncertain] = useState(false);
  const [selectedSavedAddressId, setSelectedSavedAddressId] = useState("");
  const [saveToAccount, setSaveToAccount] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const lookupRequestRef = useRef(0);
  const lastLookupPinRef = useRef("");
  const firstStepRenderRef = useRef(true);
  const [giftOptions, setGiftOptions] = useState<GiftOptions>({
    isGift: false,
    packaging: true,
    recipientName: "",
    senderName: "",
    message: "",
    hidePriceTag: true,
  });

  /*
   * Restore this tab's checkout draft after an accidental refresh. SessionStorage (not
   * localStorage) on purpose: it contains a delivery address and a pending-payment handoff, and
   * neither should outlive the browser session on a shared/family phone.
   */
  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (cancelled) return;
      try {
        const draft = JSON.parse(window.sessionStorage.getItem(CHECKOUT_DRAFT_KEY) || "null") as {
          address?: Partial<Address>;
          giftOptions?: GiftOptions;
          paymentMethod?: PaymentMethodId;
          promoCode?: string;
          pendingPayment?: PendingPayment | null;
        } | null;
        if (draft?.address) setAddress((previous) => ({ ...previous, ...draft.address }));
        if (draft?.giftOptions) setGiftOptions(draft.giftOptions);
        if (draft?.paymentMethod === "online" || draft?.paymentMethod === "cod") setPaymentMethod(draft.paymentMethod);
        if (typeof draft?.promoCode === "string") setPromoCode(draft.promoCode);
        if (draft?.pendingPayment?.order?._id && draft.pendingPayment.payment?.id) setPendingPayment(draft.pendingPayment);
        const savedPin = readSavedPincode();
        if (savedPin) setAddress((previous) => (previous.pincode ? previous : { ...previous, pincode: savedPin }));
      } catch {
        /* a corrupt draft should never block checkout */
      }
      setDraftReady(true);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!draftReady) return;
    try {
      window.sessionStorage.setItem(CHECKOUT_DRAFT_KEY, JSON.stringify({ address, giftOptions, paymentMethod, promoCode, pendingPayment }));
    } catch {
      /* storage is a convenience, never a checkout dependency */
    }
  }, [address, draftReady, giftOptions, paymentMethod, pendingPayment, promoCode]);

  const clearCheckoutDraft = useCallback(() => {
    try {
      window.sessionStorage.removeItem(CHECKOUT_DRAFT_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  /* Prefill from the signed-in customer's default address (blank fields only — a draft wins). */
  useEffect(() => {
    if (!isAuthenticated || !user) return;
    const preferred = user.addresses?.find((item) => item.isDefault) ?? user.addresses?.[0];
    const fill = async () => {
      await Promise.resolve();
      setSelectedSavedAddressId((current) => current || preferred?.id || "");
      setAddress((previous) => ({
        ...previous,
        fullName: previous.fullName || preferred?.fullName || `${user.firstName} ${user.lastName}`.trim(),
        phone: previous.phone || preferred?.phone || user.phone || "",
        email: previous.email || user.email,
        address: previous.address || preferred?.address || "",
        city: previous.city || preferred?.city || "",
        state: previous.state || preferred?.state || "",
        pincode: previous.pincode || preferred?.pincode || "",
        landmark: previous.landmark || preferred?.landmark || "",
        addressType: preferred?.type ?? previous.addressType,
      }));
    };
    void fill();
  }, [isAuthenticated, user]);

  /* Step changes: go to the top and put keyboard/screen-reader focus on the new heading. */
  useEffect(() => {
    if (firstStepRenderRef.current) {
      firstStepRenderRef.current = false;
      return;
    }
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
    const timer = window.setTimeout(() => document.querySelector<HTMLElement>("[data-checkout-step-heading]")?.focus({ preventScroll: true }), 80);
    return () => window.clearTimeout(timer);
  }, [step]);

  const giftFee = giftOptions.isGift && giftOptions.packaging ? GIFT_PACKAGING_FEE : 0;
  const discount = promoApplied ? promoDiscount : 0;
  const deliveryForAddress = serviceability && serviceability.pincode === address.pincode ? serviceability : null;
  const shipping = shippingFeeFor(subtotal - discount, deliveryForAddress?.shippingFee);
  const total = subtotal + (shipping ?? SHIPPING_FEE_FAR) - discount + giftFee;
  const unavailableItems = cart.filter((item) => item.inStock === false || (typeof item.available === "number" && item.available < item.quantity));
  const checkoutFingerprint = JSON.stringify({
    items: cart.map((item) => ({ sku: item.sku, quantity: item.quantity })),
    address,
    coupon: promoApplied ? appliedPromoCode : "",
    giftOptions,
    paymentMethod,
  });

  const handlePincodeLookup = useCallback(async (pin: string): Promise<boolean> => {
    if (!/^[1-9]\d{5}$/.test(pin)) {
      setServiceability(null);
      setPincodeStatus("idle");
      return false;
    }
    lastLookupPinRef.current = pin;
    if (!live) {
      setServiceability(null);
      setPincodeStatus("error");
      setAddressErrors((previous) => ({ ...previous, pincode: "Delivery availability checking is currently unavailable." }));
      return false;
    }
    const request = ++lookupRequestRef.current;
    setPincodeStatus("checking");
    try {
      const result = await checkServiceability(pin);
      if (lookupRequestRef.current !== request) return false;
      if (!result.serviceable) throw new Error("unserviceable");
      setServiceability(result);
      setPincodeStatus("ok");
      savePincode(pin);
      setAddressErrors((previous) => ({ ...previous, pincode: undefined }));
      setAddress((previous) => (previous.pincode === pin && !previous.state ? { ...previous, state: stateForPincode(pin) } : previous));
      if (!result.cod) setPaymentMethod((current) => (current === "cod" ? "online" : current));
      return true;
    } catch {
      if (lookupRequestRef.current !== request) return false;
      setServiceability(null);
      setPincodeStatus("error");
      setAddressErrors((previous) => ({ ...previous, pincode: "We couldn't confirm delivery for this PIN code. Please check it and try again." }));
      return false;
    }
  }, [live]);

  /* Check delivery automatically once a full pincode exists (typed, saved, drafted or account-filled). */
  useEffect(() => {
    const pin = address.pincode;
    if (!live || pin.length !== 6 || deliveryForAddress || lastLookupPinRef.current === pin) return;
    const timer = window.setTimeout(() => void handlePincodeLookup(pin), 350);
    return () => window.clearTimeout(timer);
  }, [address.pincode, deliveryForAddress, handlePincodeLookup, live]);

  /* Empty cart redirect */
  if (cart.length === 0 && step < 3) {
    return (
      <div className="min-h-screen bg-[#faf7f2] flex items-center justify-center px-4">
        <div className="text-center">
          <div className="text-6xl mb-4">🛍️</div>
          <h2 className="text-2xl font-serif text-gray-900 mb-3">
            Your cart is empty
          </h2>
          {pendingPayment ? (
            <p className="mx-auto mb-6 max-w-md text-sm leading-relaxed text-gray-600">
              Payment is pending for order <strong>#{pendingPayment.order.orderNumber}</strong>. {formatPaymentExpiry(pendingPayment.payment.expiresAt) ? <>Complete payment by <strong>{formatPaymentExpiry(pendingPayment.payment.expiresAt)}</strong> or the reservation will expire. </> : null}Check your email or{" "}
              <Link href={`/track-order?order=${encodeURIComponent(pendingPayment.order.orderNumber)}`} className="font-bold text-[#881337] underline underline-offset-2">Track Order</Link>{" "}
              for the latest status. Please do not place another order.
            </p>
          ) : (
            <p className="text-gray-500 mb-6">Add some beautiful pieces before checking out</p>
          )}
          <Link
            href="/products"
            className="inline-block bg-[#881337] text-white px-8 py-3 rounded-xl font-semibold hover:bg-[#701a35] transition"
          >
            Shop Now
          </Link>
        </div>
      </div>
    );
  }

  /* ── Address Validation ── */
  const validateAddress = (includeDelivery = true): boolean => {
    const errors: Partial<Address> = {};
    if (address.fullName.trim().length < 3) errors.fullName = "Enter your full name.";
    if (!/^[6-9]\d{9}$/.test(address.phone)) errors.phone = "Enter a valid 10-digit mobile number.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address.email.trim())) errors.email = "Enter a valid email address; order updates will be sent there.";
    if (!/^[1-9]\d{5}$/.test(address.pincode)) errors.pincode = "Enter a valid 6-digit PIN code.";
    else if (includeDelivery && live && !deliveryForAddress) errors.pincode = "Delivery availability has not been confirmed. Please wait or check the PIN code again.";
    if (address.address.trim().length < 8) errors.address = "Enter your full address, including your house or flat number and area.";
    if (address.city.trim().length < 2) errors.city = "Enter your city.";
    if (!address.state) errors.state = "Select a state.";
    setAddressErrors(errors);
    const firstError = (Object.keys(errors) as (keyof Address)[]).find((key) => errors[key]);
    if (firstError) {
      requestAnimationFrame(() => document.getElementById(`checkout-${firstError}`)?.focus());
    }
    return !firstError;
  };

  const continueToPayment = async () => {
    if (!validateAddress(false)) return;
    if (live && !deliveryForAddress) {
      lastLookupPinRef.current = "";
      const checked = await handlePincodeLookup(address.pincode);
      if (!checked) {
        requestAnimationFrame(() => document.getElementById("checkout-pincode")?.focus());
        return;
      }
    }
    if (validateAddress()) setStep(2);
  };

  const clearPromo = (message = "") => {
    setPromoApplied(false);
    setAppliedPromoCode("");
    setPromoDiscount(0);
    setPromoError(message);
  };

  const invalidatePromoForCartChange = () => {
    if (promoApplied) clearPromo("Your bag changed, so the coupon was removed. You can apply it again.");
  };

  const handleApplyPromo = async () => {
    const code = promoCode.trim().toUpperCase();
    if (!code || promoChecking) return;
    if (!live) {
      clearPromo("Promo codes are currently unavailable.");
      return;
    }
    setPromoChecking(true);
    setPromoError("");
    try {
      const result = await validateCoupon(code, subtotal);
      setPromoDiscount(result.discount);
      setAppliedPromoCode(result.code || code);
      setPromoApplied(true);
      setPromoError("");
    } catch (cause) {
      clearPromo((cause as Error)?.message || "This coupon code could not be applied.");
    } finally {
      setPromoChecking(false);
    }
  };

  const persistAddressIfRequested = async () => {
    if (!saveToAccount || !isAuthenticated || !user) return;
    const alreadySaved = (user.addresses ?? []).some(
      (saved) => saved.pincode === address.pincode && saved.phone === address.phone && [saved.address, saved.line2].filter(Boolean).join(", ").trim().toLowerCase() === address.address.trim().toLowerCase(),
    );
    if (alreadySaved) return;
    try {
      await addAddress({
        type: address.addressType,
        fullName: address.fullName.trim(),
        phone: address.phone,
        address: address.address.trim(),
        city: address.city.trim(),
        state: address.state,
        pincode: address.pincode,
        landmark: address.landmark.trim() || undefined,
        isDefault: !(user.addresses?.length),
      });
    } catch {
      /* saving the address must never fail an order that already succeeded */
    }
  };

  const finishSuccessfulOrder = async (order: StoreOrder) => {
    saveLastOrderSnapshot(order);
    await persistAddressIfRequested();
    setPendingPayment(null);
    setDraftReady(false);
    clearCheckoutDraft();
    clearCart();
    router.push(`/order-confirmation?orderId=${order._id}`);
  };

  const openRazorpay = async (pending: PendingPayment) => {
    const ready = await loadRazorpay();
    if (!ready || !window.Razorpay) {
      setPlacing(false);
      setPaymentError(`The payment window could not be opened. Payment for order #${pending.order.orderNumber} is still pending. Use the button below to try again; no new order will be created.`);
      return;
    }
    const checkout = new window.Razorpay({
      key: pending.payment.keyId,
      amount: pending.payment.amount,
      currency: pending.payment.currency,
      name: "Vani Collection",
      description: `Order ${pending.order.orderNumber}`,
      order_id: pending.payment.id,
      prefill: { name: address.fullName, email: address.email, contact: address.phone },
      notes: { orderNumber: pending.order.orderNumber },
      theme: { color: "#881337" },
      handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
        setPlacing(true);
        try {
          const verified = await verifyRazorpayPayment({ orderId: pending.order._id, ...response });
          const paidOrder: StoreOrder = {
            ...pending.order,
            status: verified.status,
            payment: { ...pending.order.payment, status: verified.payment.status, providerPaymentId: response.razorpay_payment_id, paidAt: new Date().toISOString() },
          };
          setPaymentUncertain(false);
          await finishSuccessfulOrder(paidOrder);
        } catch {
          setPaymentUncertain(true);
          setPaymentError(`Your payment may have gone through, but we haven't received confirmation yet. Do not pay again. Check your email or the Track Order page in a few minutes. Order #${pending.order.orderNumber}.`);
        } finally {
          setPlacing(false);
        }
      },
      modal: {
        ondismiss: () => {
          setPlacing(false);
          setPaymentError(`Payment was not completed. Payment for order #${pending.order.orderNumber} is still pending. Use the button below to reopen payment for this order; no new order will be created.`);
        },
      },
    });
    checkout.open();
  };

  const handlePlaceOrder = async () => {
    if (placing) return;
    setPaymentError("");
    if (!live) {
      setPaymentError("Checkout is currently unavailable.");
      return;
    }
    if (paymentUncertain && pendingPayment) {
      setPaymentError(`Please wait for payment confirmation before trying again. Do not pay again. Check order #${pendingPayment.order.orderNumber} in your email or on the Track Order page.`);
      return;
    }
    if (!validateAddress()) {
      setStep(1);
      return;
    }
    if (shipping === null) {
      setStep(1);
      lastLookupPinRef.current = "";
      void handlePincodeLookup(address.pincode);
      return;
    }
    if (unavailableItems.length > 0) {
      setPaymentError("Some items are no longer available. Remove them from your bag or reduce their quantities before continuing.");
      setStep(0);
      return;
    }
    if (hasLocalOnlyItems || cart.some((item) => !item.sku || !item.productId)) {
      setPaymentError("Some items in your bag are not linked to the live catalogue. Remove them and add them again from their product pages.");
      setStep(0);
      return;
    }
    if (paymentMethod === "cod" && deliveryForAddress && !deliveryForAddress.cod) {
      setPaymentError("Cash on Delivery is unavailable for this PIN code. Please choose online payment.");
      return;
    }

    /* Retry safety: a dismissed/failed gateway window reopens for THE SAME order. */
    if (pendingPayment) {
      if (pendingPayment.fingerprint !== checkoutFingerprint) {
        setPaymentError(`Payment is still pending for order #${pendingPayment.order.orderNumber}. Changing these details could create a duplicate order. Complete payment for the existing order${isAuthenticated ? " or cancel it from Account > Orders" : " or contact us with your order number"} before making changes.`);
        return;
      }
      setPlacing(true);
      await openRazorpay(pendingPayment);
      return;
    }

    setPlacing(true);
    let paymentWindowOpened = false;
    try {
      const { order, payment } = await placeOrder({
        items: cart.map((item) => ({ productId: item.productId as string, sku: item.sku as string, quantity: item.quantity })),
        shippingAddress: {
          fullName: address.fullName.trim(),
          phone: address.phone,
          email: address.email.trim().toLowerCase(),
          line1: address.address.trim(),
          landmark: address.landmark.trim() || undefined,
          city: address.city.trim(),
          state: address.state,
          pincode: address.pincode,
        },
        couponCode: promoApplied ? appliedPromoCode : undefined,
        paymentMethod: paymentMethod === "cod" ? "cod" : "razorpay",
        giftOptions: giftOptions.isGift ? { ...giftOptions, fee: giftFee } : undefined,
      });
      saveLastOrderSnapshot(order);

      if (paymentMethod === "cod") {
        await finishSuccessfulOrder(order);
        return;
      }
      if (!payment) {
        setPaymentError(`Order #${order.orderNumber} was created, but online payment is currently unavailable. Our team will contact you. Please do not place another order.`);
        return;
      }
      const pending = { order, payment, fingerprint: checkoutFingerprint };
      setPendingPayment(pending);
      paymentWindowOpened = true;
      await openRazorpay(pending);
    } catch (cause) {
      setPaymentError((cause as Error)?.message || "We couldn't place your order. Please try again.");
    } finally {
      if (!paymentWindowOpened) setPlacing(false);
    }
  };

  /* ─── STEP 0: Cart Review ─── */
  const renderCartReview = () => (
    <div className="space-y-4">
      <h2 data-checkout-step-heading tabIndex={-1} className="mb-6 text-xl font-serif text-gray-900 outline-none">Review Your Bag</h2>

      <div aria-live="polite" className="space-y-3 empty:hidden">
        {cartError && (
          <div role="alert" className="flex items-start justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            <span>{cartError}</span>
            <button type="button" onClick={dismissError} aria-label="Dismiss cart error" className="shrink-0 font-bold">✕</button>
          </div>
        )}
        {lastRemoved && (
          <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-stone-900 px-4 py-3 text-sm text-white">
            <span className="min-w-0 flex-1">“{lastRemoved.title}” was removed from your bag.</span>
            <button type="button" disabled={isSyncing} onClick={undoRemove} className="min-h-10 rounded-full bg-white px-4 font-bold text-[#881337] disabled:opacity-50">Undo</button>
            <button type="button" onClick={dismissLastRemoved} aria-label="Dismiss removed item message" className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/10">✕</button>
          </div>
        )}
        {hasLocalOnlyItems && live && (
          <p role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900">
            Some items in your bag are not linked to the live catalogue and cannot be ordered online. Remove them and add them again from their product pages.
          </p>
        )}
        {unavailableItems.length > 0 && (
          <p role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-relaxed text-rose-800">
            Some items are unavailable. Remove them or reduce their quantities before continuing to checkout.
          </p>
        )}
      </div>

      {cart.map((item) => {
        const unavailable = item.inStock === false || (typeof item.available === "number" && item.available < item.quantity);
        const productHref = item.slug ? `/product/${item.slug}` : null;
        return (
          <article key={`${item.lineId || item.sku || item.id}-${item.size}-${item.color || ""}`} className="flex gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="relative h-24 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-stone-100">
              {item.image && <Image src={item.image} alt="" width={80} height={96} unoptimized sizes="80px" className="h-full w-full object-cover object-top" />}
              {productHref && <Link href={productHref} aria-label={`View ${item.title} product page`} className="absolute inset-0" />}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="line-clamp-2 text-sm font-medium leading-snug text-gray-900">
                {productHref ? <Link href={productHref} className="hover:text-[#881337]">{item.title}</Link> : item.title}
              </h3>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {item.size && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">Size: {item.size}</span>}
                {item.color && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{item.color}</span>}
                {typeof item.available === "number" && item.available > 0 && item.available <= 3 && !unavailable && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">{item.available} left in stock</span>}
              </div>
              {unavailable && (
                <p role="alert" className="mt-2 rounded-lg bg-rose-50 px-2.5 py-2 text-xs leading-relaxed text-rose-800">
                  {typeof item.available === "number" && item.available > 0 ? `Only ${item.available} left in this size. Reduce the quantity to continue.` : "This size is out of stock. Please remove it or choose another size."}
                </p>
              )}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center overflow-hidden rounded-full border border-gray-300" aria-label={`${item.title} quantity`}>
                  <button type="button" disabled={isSyncing && item.quantity <= 1} onClick={() => { invalidatePromoForCartChange(); updateQuantity(item.id, item.size, item.quantity - 1, item.color); }} className="flex h-11 w-11 items-center justify-center text-base text-gray-700 transition hover:bg-gray-100 disabled:opacity-50" aria-label={`Decrease quantity of ${item.title}`}>−</button>
                  <span className="min-w-8 text-center text-sm font-bold" aria-live="polite">{item.quantity}</span>
                  <button type="button" disabled={(isSyncing && item.quantity <= 1) || item.quantity >= 10 || (typeof item.available === "number" && item.quantity >= item.available)} onClick={() => { invalidatePromoForCartChange(); updateQuantity(item.id, item.size, item.quantity + 1, item.color); }} className="flex h-11 w-11 items-center justify-center text-base text-gray-700 transition hover:bg-gray-100 disabled:opacity-50" aria-label={`Increase quantity of ${item.title}`}>+</button>
                </div>
                <div className="text-right">
                  <span className="font-bold text-[#881337]">{formatPrice(item.price * item.quantity)}</span>
                  {item.originalPrice > item.price && <span className="ml-2 text-xs text-gray-400 line-through">{formatPrice(item.originalPrice * item.quantity)}</span>}
                </div>
              </div>
              <button type="button" disabled={isSyncing} onClick={() => { invalidatePromoForCartChange(); removeFromCart(item.id, item.size, item.color); }} className="mt-1 min-h-10 text-xs font-semibold text-rose-700 hover:underline disabled:opacity-50">
                Remove from bag
              </button>
            </div>
          </article>
        );
      })}

      {/* Promo Code */}
      <div className="rounded-2xl border border-gray-100 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-gray-900">Promo Code</h3>
        {promoApplied ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-emerald-50 px-3.5 py-3 text-sm text-emerald-900 ring-1 ring-emerald-200">
            <span>✓ <strong>{appliedPromoCode}</strong> applied — you saved {formatPrice(discount)}.</span>
            <button type="button" onClick={() => { clearPromo(); setPromoCode(""); }} className="min-h-10 rounded-full bg-white px-3.5 text-xs font-bold text-emerald-800 ring-1 ring-emerald-300">Remove</button>
          </div>
        ) : (
          <form onSubmit={(event) => { event.preventDefault(); void handleApplyPromo(); }} className="flex gap-2">
            <label htmlFor="promo-code" className="sr-only">Promo code</label>
            <input
              id="promo-code"
              type="text"
              autoComplete="off"
              autoCapitalize="characters"
              placeholder="Enter coupon code"
              value={promoCode}
              aria-invalid={Boolean(promoError)}
              aria-describedby={promoError ? "promo-error" : undefined}
              onChange={(event) => { setPromoCode(event.target.value.toUpperCase()); setPromoError(""); }}
              className="min-h-11 min-w-0 flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm uppercase focus:border-[#881337] focus:outline-none focus:ring-2 focus:ring-[#881337]/20"
            />
            <button type="submit" disabled={promoChecking || !promoCode.trim()} className="min-h-11 shrink-0 rounded-xl bg-[#881337] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#701a35] disabled:opacity-50">
              {promoChecking ? "Checking…" : "Apply"}
            </button>
          </form>
        )}
        <div aria-live="polite">
          {promoError && <p id="promo-error" role="alert" className="mt-2 text-xs leading-relaxed text-red-600">{promoError}</p>}
        </div>
      </div>

      {/* Price summary inline */}
      <div className="space-y-2 rounded-2xl border border-gray-100 bg-white p-4 text-sm">
        <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div>
        <div className="flex justify-between text-gray-600">
          <span>Shipping</span>
          <span className={shipping === 0 ? "font-medium text-emerald-600" : ""}>{shipping === null ? `${SHIPPING_FEE_LABEL} (after PIN code check)` : shipping === 0 ? "FREE" : formatPrice(shipping)}</span>
        </div>
        {promoApplied && discount > 0 && (
          <div className="flex justify-between font-medium text-emerald-700"><span>Promo ({appliedPromoCode})</span><span>−{formatPrice(discount)}</span></div>
        )}
        {giftFee > 0 && (
          <div className="flex justify-between font-medium text-amber-900"><span>🎁 Royal Gift Box</span><span>+{formatPrice(giftFee)}</span></div>
        )}
        <div className="flex justify-between border-t border-gray-100 pt-2 text-base font-bold text-gray-900">
          <span>{shipping === null ? "Estimated total" : "Total Payable"}</span>
          <span>{shipping === null ? `${formatPrice(subtotal - discount + giftFee + SHIPPING_FEE_NEAR)}–${formatPrice(subtotal - discount + giftFee + SHIPPING_FEE_FAR)}` : formatPrice(total)}</span>
        </div>
        <p className="text-[11px] leading-relaxed text-gray-400">Taxes are included. Final shipping charges and the total will be confirmed after your PIN code is checked, before payment.</p>
      </div>

      <button
        type="button"
        onClick={() => setStep(1)}
        disabled={isSyncing || unavailableItems.length > 0 || (live && hasLocalOnlyItems)}
        className="min-h-12 w-full rounded-xl bg-[#881337] py-4 text-base font-bold text-white transition hover:bg-[#701a35] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSyncing ? "Updating your bag…" : "Proceed to Delivery →"}
      </button>
      <Link href="/products" className="block min-h-10 text-center text-sm font-semibold text-stone-600 underline-offset-2 hover:text-[#881337] hover:underline">Continue shopping</Link>
    </div>
  );

  /* ─── STEP 1: Address ─── */
  const renderAddressStep = () => {
    const renderField = ({
      label,
      name,
      type = "text",
      placeholder,
      required = true,
      half = false,
    }: {
      label: string;
      name: keyof Address;
      type?: string;
      placeholder?: string;
      required?: boolean;
      half?: boolean;
    }) => (
      <div className={half ? "col-span-1" : "col-span-1 sm:col-span-2"}>
        <label
          htmlFor={`checkout-${name}`}
          className="block text-sm font-semibold text-gray-700 mb-1.5"
        >
          {label}{" "}
          {required && (
            <span className="text-red-500" aria-hidden="true">
              *
            </span>
          )}
        </label>
        <input
          id={`checkout-${name}`}
          name={name}
          type={type}
          required={required}
          aria-invalid={Boolean(addressErrors[name])}
          aria-describedby={
            addressErrors[name] ? `checkout-${name}-error` : undefined
          }
          autoComplete={
            name === "fullName"
              ? "name"
              : name === "phone"
                ? "tel"
                : name === "email"
                  ? "email"
                  : name === "pincode"
                    ? "postal-code"
                    : name === "city"
                      ? "address-level2"
                      : "off"
          }
          placeholder={placeholder}
          inputMode={name === "phone" ? "tel" : name === "pincode" ? "numeric" : name === "email" ? "email" : undefined}
          maxLength={name === "phone" ? 10 : name === "pincode" ? 6 : undefined}
          autoCapitalize={name === "fullName" || name === "city" ? "words" : name === "email" ? "none" : undefined}
          spellCheck={name === "email" || name === "phone" || name === "pincode" ? false : undefined}
          value={address[name] as string}
          onChange={(e) => {
            let next = e.target.value;
            if (name === "phone") {
              const digits = next.replace(/\D/g, "");
              next = digits.length > 10 ? digits.slice(-10) : digits.slice(0, 10);
            } else if (name === "pincode") {
              next = next.replace(/\D/g, "").slice(0, 6);
              if (next.length < 6) {
                lastLookupPinRef.current = "";
                setServiceability(null);
                setPincodeStatus("idle");
              }
            } else if (name === "email") {
              next = next.replace(/\s/g, "");
            }
            setSelectedSavedAddressId("");
            setAddress((prev) => ({ ...prev, [name]: next }));
            setAddressErrors((prev) => ({ ...prev, [name]: undefined }));
          }}
          className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#881337]/20 focus:border-[#881337] transition ${
            addressErrors[name] ? "border-red-400" : "border-gray-200"
          }`}
        />
        {addressErrors[name] && (
          <p
            id={`checkout-${name}-error`}
            role="alert"
            className="text-red-600 text-xs mt-1"
          >
            {addressErrors[name]}
          </p>
        )}
      </div>
    );

    return (
      <div className="space-y-6">
        <h2 data-checkout-step-heading tabIndex={-1} className="text-xl font-serif text-gray-900 outline-none">Delivery Address</h2>

        {!isAuthenticated ? (
          <p className="rounded-2xl border border-[#881337]/15 bg-[#881337]/5 px-4 py-3 text-[13px] leading-relaxed text-stone-700">
            <strong className="font-semibold">Guest checkout:</strong> No account is required. Order updates will be sent to this mobile number or email, and you can track your parcel without signing in.
          </p>
        ) : user?.addresses?.length ? (
          <section aria-label="Saved addresses" className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900">Saved addresses</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {user.addresses.map((saved) => {
                const selected = selectedSavedAddressId === saved.id;
                return (
                  <button
                    key={saved.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => {
                      setSelectedSavedAddressId(saved.id);
                      setSaveToAccount(false);
                      if (saved.pincode !== address.pincode) lastLookupPinRef.current = "";
                      setAddress((previous) => ({
                        ...previous,
                        fullName: saved.fullName,
                        phone: saved.phone,
                        email: previous.email || user.email,
                        pincode: saved.pincode,
                        address: [saved.address, saved.line2].filter(Boolean).join(", "),
                        city: saved.city,
                        state: saved.state,
                        landmark: saved.landmark || "",
                        addressType: saved.type,
                      }));
                      setAddressErrors({});
                    }}
                    className={`rounded-2xl border-2 p-3.5 text-left transition ${selected ? "border-[#881337] bg-[#881337]/5" : "border-gray-200 bg-white hover:border-gray-300"}`}
                  >
                    <span className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wide text-[#881337]">
                      {saved.type}
                      {saved.isDefault && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">Default</span>}
                      {selected && <span className="rounded-full bg-[#881337] px-2 py-0.5 text-[10px] font-bold text-white">Selected</span>}
                    </span>
                    <span className="mt-1.5 block text-sm font-semibold text-gray-900">{saved.fullName}</span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-gray-600">{[saved.address, saved.line2].filter(Boolean).join(", ")}, {saved.city}, {saved.state} – {saved.pincode}</span>
                    <span className="mt-0.5 block text-xs text-gray-500">{saved.phone}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-gray-500">You can edit the selected address in the form below.</p>
          </section>
        ) : null}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {renderField({
            label: "Full Name",
            name: "fullName",
            placeholder: "Name for the delivery label",
          })}
          {renderField({
            label: "Mobile Number",
            name: "phone",
            type: "tel",
            placeholder: "10-digit number",
            half: true,
          })}
          {renderField({
            label: "Email Address",
            name: "email",
            type: "email",
            placeholder: "for order updates",
            half: true,
          })}
          {renderField({
            label: "PIN Code",
            name: "pincode",
            placeholder: "6-digit PIN code",
            half: true,
          })}
          {renderField({
            label: "City",
            name: "city",
            placeholder: "City",
            half: true,
          })}
          <div className="col-span-1 sm:col-span-2">
            <label
              htmlFor="checkout-state"
              className="block text-sm font-semibold text-gray-700 mb-1.5"
            >
              State{" "}
              <span className="text-red-500" aria-hidden="true">
                *
              </span>
            </label>
            <select
              id="checkout-state"
              name="state"
              required
              autoComplete="address-level1"
              aria-invalid={Boolean(addressErrors.state)}
              aria-describedby={
                addressErrors.state ? "checkout-state-error" : undefined
              }
              value={address.state}
              onChange={(e) => {
                setAddress((p) => ({ ...p, state: e.target.value }));
                setAddressErrors((p) => ({ ...p, state: "" }));
              }}
              className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#881337]/20 focus:border-[#881337] ${
                addressErrors.state ? "border-red-400" : "border-gray-200"
              }`}
            >
              <option value="">Select state</option>
              {INDIAN_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            {addressErrors.state && (
              <p
                id="checkout-state-error"
                role="alert"
                className="text-red-600 text-xs mt-1"
              >
                {addressErrors.state}
              </p>
            )}
          </div>
          <div className="col-span-1 sm:col-span-2">
            <label
              htmlFor="checkout-address"
              className="block text-sm font-semibold text-gray-700 mb-1.5"
            >
              Full Address{" "}
              <span className="text-red-500" aria-hidden="true">
                *
              </span>
            </label>
            <textarea
              id="checkout-address"
              name="address"
              required
              autoComplete="street-address"
              aria-invalid={Boolean(addressErrors.address)}
              aria-describedby={
                addressErrors.address ? "checkout-address-error" : undefined
              }
              rows={3}
              placeholder="House/Flat No., Street, Area, Locality"
              value={address.address}
              onChange={(e) => {
                setAddress((p) => ({ ...p, address: e.target.value }));
                setAddressErrors((p) => ({ ...p, address: "" }));
              }}
              className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#881337]/20 focus:border-[#881337] resize-none ${
                addressErrors.address ? "border-red-400" : "border-gray-200"
              }`}
            />
            {addressErrors.address && (
              <p
                id="checkout-address-error"
                role="alert"
                className="text-red-600 text-xs mt-1"
              >
                {addressErrors.address}
              </p>
            )}
          </div>
          {renderField({
            label: "Landmark (optional)",
            name: "landmark",
            placeholder: "Near temple, school, etc.",
            required: false,
          })}
        </div>

        <div aria-live="polite">
          {pincodeStatus === "checking" && <p className="rounded-2xl bg-sky-50 px-4 py-3 text-sm text-sky-800 ring-1 ring-sky-100">Checking delivery availability…</p>}
          {deliveryForAddress && (
            <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm leading-relaxed text-emerald-900 ring-1 ring-emerald-200">
              ✓ Delivery is available for {deliveryForAddress.pincode} · Estimated arrival in {deliveryForAddress.etaDays} days · Shipping {shipping === 0 ? "FREE" : shipping === null ? formatPrice(deliveryForAddress.shippingFee) : formatPrice(shipping)} · {deliveryForAddress.cod ? "Cash on Delivery available" : "Online payment only for this PIN code"}
            </p>
          )}
        </div>

        {/* Address Type — only meaningful when the address can be saved to an account */}
        {isAuthenticated && (
        <div>
          <p id="address-type-label" className="block text-xs font-semibold text-gray-700 mb-2">Address type</p>
          <div className="flex flex-wrap gap-3" role="group" aria-labelledby="address-type-label">
            {(["home", "work", "other"] as const).map((type) => (
              <button
                key={type}
                type="button"
                aria-pressed={address.addressType === type}
                onClick={() => setAddress((p) => ({ ...p, addressType: type }))}
                className={`min-h-11 px-4 py-2 rounded-xl text-xs font-semibold capitalize border transition flex items-center gap-2 ${
                  address.addressType === type
                    ? "bg-[#881337] text-white border-[#881337]"
                    : "bg-white text-gray-700 border-gray-200 hover:border-gray-300"
                }`}
              >
                {type === "home" ? (
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                  </svg>
                ) : type === "work" ? (
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                )}
                <span>{type}</span>
              </button>
            ))}
          </div>
          <label className="mt-4 flex min-h-11 cursor-pointer items-center gap-3 rounded-xl bg-stone-50 px-3.5 py-2.5 text-sm text-stone-700 ring-1 ring-stone-200">
            <input type="checkbox" checked={saveToAccount} onChange={(event) => setSaveToAccount(event.target.checked)} className="h-5 w-5 shrink-0 accent-[#881337]" />
            <span>Save this address to my account after the order is placed</span>
          </label>
        </div>
        )}

        {/* Bespoke Royal Gift Packaging & Handwritten Note */}
        <div className="pt-2">
          <GiftOptionsCard value={giftOptions} onChange={setGiftOptions} />
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setStep(0)}
            className="min-h-12 flex-1 py-3 border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition"
          >
            ← Back
          </button>
          <button
            type="button"
            onClick={() => void continueToPayment()}
            disabled={pincodeStatus === "checking"}
            className="min-h-12 flex-grow py-3 bg-[#881337] text-white rounded-xl font-semibold hover:bg-[#701a35] transition disabled:cursor-wait disabled:opacity-60"
          >
            {pincodeStatus === "checking" ? "Checking delivery availability…" : "Continue to Payment →"}
          </button>
        </div>
      </div>
    );
  };

  /* ─── STEP 2: Payment ─── */
  const renderPaymentStep = () => (
    <div className="space-y-6">
      <h2 data-checkout-step-heading tabIndex={-1} className="text-xl font-serif text-gray-900 outline-none">Payment Method</h2>

      {pendingPayment && paymentUncertain ? (
        <div role="alert" className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-950">
          <p><strong>Payment confirmation is pending.</strong> Do not pay again for order #{pendingPayment.order.orderNumber}. An update will arrive by email in a few minutes.</p>
          <Link href={`/track-order?order=${encodeURIComponent(pendingPayment.order.orderNumber)}`} className="mt-2 inline-block min-h-10 font-bold text-[#881337] underline underline-offset-2">Check order status →</Link>
        </div>
      ) : pendingPayment && pendingPayment.fingerprint === checkoutFingerprint ? (
        <p className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm leading-relaxed text-sky-950">
          Payment is pending for order <strong>#{pendingPayment.order.orderNumber}</strong>. The button below will reopen payment for <strong>this order</strong>; it will not create another order or reserve stock again.{formatPaymentExpiry(pendingPayment.payment.expiresAt) ? <> Complete payment by <strong>{formatPaymentExpiry(pendingPayment.payment.expiresAt)}</strong> or the stock reservation will expire.</> : null}
        </p>
      ) : pendingPayment ? (
        <p role="alert" className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-950">
          Payment is pending for order <strong>#{pendingPayment.order.orderNumber}</strong>, but your bag or address has changed. To avoid a duplicate order, complete payment for the pending order{isAuthenticated ? " or cancel it from Account > Orders" : " or contact us with your order number to make changes"}.{formatPaymentExpiry(pendingPayment.payment.expiresAt) ? <> The payment deadline is <strong>{formatPaymentExpiry(pendingPayment.payment.expiresAt)}</strong>.</> : null}
        </p>
      ) : null}

      {/* Delivery address recap */}
      <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 text-sm">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-semibold text-gray-900">{address.fullName}</p>
            <p className="text-gray-600 text-xs mt-0.5">
              {address.address}, {address.city}, {address.state} –{" "}
              {address.pincode}
            </p>
            <p className="text-gray-600 text-xs">{address.phone}</p>
          </div>
          <button
            type="button"
            onClick={() => setStep(1)}
            className="min-h-10 shrink-0 text-xs text-[#881337] font-medium hover:underline"
          >
            Change
          </button>
        </div>
      </div>

      {/* Royal Gift Recap */}
      {giftOptions.isGift && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-stone-800">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-amber-950">
                <span>🎁</span>
                <span>Royal Gift Order {giftOptions.packaging ? "(Bespoke Gift Box · +₹149)" : "(Complimentary Calligraphy Note)"}</span>
              </div>
              {giftOptions.recipientName && (
                <p className="text-stone-700">
                  To: <strong>{giftOptions.recipientName}</strong>
                  {giftOptions.senderName ? ` · From: ${giftOptions.senderName}` : ""}
                </p>
              )}
              {giftOptions.message && (
                <p className="italic text-stone-600 bg-white/80 p-2.5 rounded-lg border border-amber-200/60 mt-1.5">
                  &ldquo;{giftOptions.message}&rdquo;
                </p>
              )}
              {giftOptions.hidePriceTag && (
                <p className="text-[11px] text-amber-800/90 font-medium">
                  ✓ Price tags hidden & invoice excluded from box
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="min-h-10 text-xs text-[#881337] font-semibold hover:underline shrink-0 ml-3"
            >
              Edit Gift
            </button>
          </div>
        </div>
      )}

      {/* Payment Options — two real choices; the instrument is picked inside Razorpay. */}
      <fieldset className="space-y-3">
        <legend className="sr-only">Choose a payment method</legend>
        {PAYMENT_METHODS.map((method) => {
          const codUnavailable = method.id === "cod" && (!deliveryForAddress || !deliveryForAddress.cod);
          const selected = paymentMethod === method.id;
          return (
            <label
              key={method.id}
              aria-disabled={codUnavailable || undefined}
              className={`flex min-h-20 items-center gap-4 rounded-2xl border-2 p-4 transition has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-[#881337]/25 ${
                codUnavailable
                  ? "cursor-not-allowed border-gray-200 bg-gray-50 opacity-60"
                  : selected
                    ? "cursor-pointer border-[#881337] bg-[#881337]/5"
                    : "cursor-pointer border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <input
                type="radio"
                name="payment-method"
                value={method.id}
                checked={selected}
                disabled={codUnavailable}
                onChange={() => {
                  setPaymentMethod(method.id);
                  setPaymentError("");
                }}
                className="h-5 w-5 shrink-0 accent-[#881337]"
              />
              <div className="flex h-11 w-14 shrink-0 items-center justify-center rounded-xl border border-stone-200 bg-stone-50 p-1 text-center" aria-hidden="true">
                {method.id === "online" ? (
                  <span className="text-[10px] font-black leading-tight text-stone-800">UPI<br /><span className="font-bold text-stone-500">Card · Bank</span></span>
                ) : (
                  <span className="text-[10px] font-black uppercase leading-tight text-amber-800">Cash on<br />Delivery</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900">{method.label}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-gray-500">
                  {codUnavailable
                    ? deliveryForAddress
                      ? "Cash on Delivery is unavailable for this PIN code. Please choose online payment."
                      : "Cash on Delivery availability will be confirmed after your PIN code is checked."
                    : method.desc}
                </p>
                {method.id === "online" && shipping !== null && <p className="mt-1 text-xs font-semibold text-stone-700">Secure online payment of {formatPrice(total)}</p>}
                {method.id === "cod" && !codUnavailable && shipping !== null && <p className="mt-1 text-xs font-semibold text-emerald-700">Total due on delivery: {formatPrice(total)}</p>}
              </div>
            </label>
          );
        })}
      </fieldset>

      {deliveryForAddress && (
        <p className="rounded-2xl bg-sky-50 px-4 py-3 text-[13px] leading-relaxed text-sky-950 ring-1 ring-sky-100">
          🚚 Delivery to {address.pincode} · Dispatched within 2–3 working days · Estimated arrival in about {deliveryForAddress.etaDays} days · Shipping {shipping === 0 ? "FREE" : shipping === null ? formatPrice(deliveryForAddress.shippingFee) : formatPrice(shipping)} · {deliveryForAddress.cod ? "Cash on Delivery available" : "Online payment only"}.
        </p>
      )}

      {live && paymentMethod === "online" && (
        <div className="rounded-2xl border border-[#881337]/20 bg-[#881337]/5 p-4 text-sm text-stone-700">
          <p className="font-semibold text-[#881337]">Secure payment window</p>
          <p className="mt-1 leading-relaxed">
            Pay by UPI, card, or net banking in Razorpay’s secure window. We never see or store your card number, CVV, or UPI PIN.
          </p>
        </div>
      )}

      {paymentMethod === "cod" && deliveryForAddress?.cod && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-950">
          <p className="font-semibold">Cash on Delivery details</p>
          <p className="mt-1">Pay {formatPrice(total)} in cash or by UPI when your parcel arrives. Keep your phone available on delivery day so the courier can contact you.</p>
        </div>
      )}

      {/* Card/UPI details are NEVER collected on this page — the hosted Razorpay window owns them. */}

      {/* Final total */}
      <div className="bg-[#881337]/5 border border-[#881337]/20 rounded-2xl p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-600">Amount Payable</p>
          <p className="text-2xl font-bold text-gray-900">{formatPrice(total)}</p>
        </div>
        <div className="text-right text-xs text-gray-500">
          <div className="flex items-center gap-1.5 justify-end font-semibold text-emerald-700">
            <svg className="w-3.5 h-3.5 text-emerald-600" viewBox="0 0 24 24" fill="currentColor">
              <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3H6a2.25 2.25 0 00-2.25 2.25v8.5A2.25 2.25 0 006 22.75h12a2.25 2.25 0 002.25-2.25v-8.5A2.25 2.25 0 0018 9.75h-.75v-3A5.25 5.25 0 0012 1.5zm-3.25 5.25a3.25 3.25 0 016.5 0v3h-6.5v-3zM12 13a1.5 1.5 0 00-1 2.618V18a1 1 0 102 0v-2.382A1.5 1.5 0 0012 13z" clipRule="evenodd" />
            </svg>
            <span>256-bit SSL</span>
          </div>
          <p className="text-[11px] text-stone-500 mt-0.5">Secured by Razorpay</p>
        </div>
      </div>

      {paymentError && (
        <p
          id="payment-error"
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
        >
          {paymentError}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setStep(1)}
          className="min-h-12 flex-1 py-3 border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={() => void handlePlaceOrder()}
          disabled={placing || !live || shipping === null || paymentUncertain || (paymentMethod === "cod" && (!deliveryForAddress || !deliveryForAddress.cod))}
          className="min-h-12 flex-grow py-3 bg-[#881337] text-white rounded-xl font-bold text-base hover:bg-[#701a35] transition disabled:cursor-not-allowed disabled:bg-stone-400"
        >
          {placing
            ? "Please wait…"
            : paymentUncertain
              ? "Payment confirmation pending"
              : pendingPayment && pendingPayment.fingerprint === checkoutFingerprint
                ? `Retry payment · ${formatPrice(total)} →`
                : paymentMethod === "cod"
                  ? `Place COD Order · ${formatPrice(total)} →`
                  : `Pay ${formatPrice(total)} →`}
        </button>
      </div>

      <p className="text-xs text-gray-500 text-center leading-relaxed">
        By placing your order, you agree to our <Link href="/terms" className="font-semibold text-[#881337] underline underline-offset-2">Terms</Link> and{" "}
        <Link href="/privacy" className="font-semibold text-[#881337] underline underline-offset-2">Privacy Policy</Link>.
        Orders are usually dispatched within 2–3 working days; delivery time depends on your PIN code.
      </p>
    </div>
  );

  const sessionNotice = !live ? (
    <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12.5px] text-amber-900">
      <strong className="font-semibold">Checkout unavailable.</strong> The storefront API is not configured, so orders cannot be placed.
    </div>
  ) : !isAuthenticated ? (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#881337]/20 bg-[#881337]/5 px-4 py-3 text-[12.5px] leading-relaxed text-stone-700">
      <span>
        <strong className="font-semibold">Guest checkout:</strong> You can place an order without an account and track it without signing in. Sign in to save your address and order history.
      </span>
      <Link href="/login?redirect=/checkout" className="min-h-10 shrink-0 rounded-xl bg-[#881337] px-3.5 py-2 text-[12px] font-semibold leading-6 text-white hover:bg-[#6b0f2b]">
        Sign in (optional)
      </Link>
    </div>
  ) : null;

  const stepContent =
    step === 0
      ? renderCartReview()
      : step === 1
        ? renderAddressStep()
        : renderPaymentStep();

  return (
    <div className="min-h-screen bg-[#faf7f2]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="font-serif text-xl text-[#1c1917] hover:text-[#881337] transition"
          >
            Vani Collection
          </Link>
          <div className="flex items-center gap-1.5 text-xs text-stone-700 font-medium bg-stone-100 px-3 py-1 rounded-full border border-stone-200">
            <svg className="w-3.5 h-3.5 text-emerald-600" viewBox="0 0 24 24" fill="currentColor">
              <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3H6a2.25 2.25 0 00-2.25 2.25v8.5A2.25 2.25 0 006 22.75h12a2.25 2.25 0 002.25-2.25v-8.5A2.25 2.25 0 0018 9.75h-.75v-3A5.25 5.25 0 0012 1.5zm-3.25 5.25a3.25 3.25 0 016.5 0v3h-6.5v-3zM12 13a1.5 1.5 0 00-1 2.618V18a1 1 0 102 0v-2.382A1.5 1.5 0 0012 13z" clipRule="evenodd" />
            </svg>
            <span>Secure Checkout</span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="sr-only">Secure Checkout</h1>
        <StepIndicator current={step} />
        {sessionNotice}
        <details className="mb-5 lg:hidden">
          <summary className="flex min-h-12 cursor-pointer items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-900">
            <span>Order Summary</span>
            <span className="text-[#881337]">{shipping === null ? `${formatPrice(subtotal - discount + giftFee + SHIPPING_FEE_NEAR)}–${formatPrice(subtotal - discount + giftFee + SHIPPING_FEE_FAR)}` : formatPrice(total)}</span>
          </summary>
          <div className="mt-3">
            <OrderSummary compact discount={discount} giftFee={giftFee} shipping={shipping} />
          </div>
        </details>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
          {/* Main Step Content */}
          <div>
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.25 }}
              >
                {stepContent}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Order Summary Sidebar */}
          <div className="hidden lg:block">
            <OrderSummary discount={discount} giftFee={giftFee} shipping={shipping} />
          </div>
        </div>
      </div>
    </div>
  );
}
