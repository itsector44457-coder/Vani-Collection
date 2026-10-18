"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { isApiConfigured } from "../../lib/api-client";
import { checkServiceability, loadRazorpay, placeOrder, validateCoupon, verifyRazorpayPayment } from "../../lib/storefront-api";
import GiftOptionsCard from "../../components/GiftOptionsCard";
import type { GiftOptions } from "../../lib/storefront-types";

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
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Delhi",
  "Jammu & Kashmir",
];

const PAYMENT_METHODS = [
  {
    id: "upi",
    label: "UPI / GPay / PhonePe",
    desc: "Instant & zero-fee payment via GPay, PhonePe, Paytm, or BHIM",
  },
  {
    id: "card",
    label: "Credit / Debit Card",
    desc: "Visa, Mastercard, RuPay & all major Indian bank cards",
  },
  {
    id: "netbanking",
    label: "Net Banking",
    desc: "All 50+ major Indian banks supported",
  },
  {
    id: "cod",
    label: "Cash on Delivery",
    desc: "Pay in cash or UPI when your parcel arrives in Guna packaging",
  },
  {
    id: "emi",
    label: "EMI (No Cost)",
    desc: "Flexible installments on select credit cards",
  },
];

const STEPS = ["Cart Review", "Delivery Address", "Payment", "Confirmation"];

/* ─── Step Indicator ─── */
function StepIndicator({ current }: { current: number }) {
  return (
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
  );
}

/* ─── Order Summary Panel ─── */
function OrderSummary({
  compact = false,
  discount = 0,
  giftFee = 0,
}: {
  compact?: boolean;
  discount?: number;
  giftFee?: number;
}) {
  const { cart, subtotal } = useCart();
  const shipping = subtotal >= 1999 ? 0 : 99;
  const total = subtotal + shipping - discount + giftFee;
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
          <div key={`${item.id}-${item.size}`} className="flex gap-3">
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
              {shipping === 0 ? "FREE" : `₹${shipping}`}
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
            <span>Total</span>
            <span>₹{total.toLocaleString()}</span>
          </div>
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
            No Return &amp; Exchange
          </span>
          <span className="text-[11px] text-gray-700 flex items-center gap-1.5 font-medium">
            <svg className="w-3.5 h-3.5 text-[#881337] shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <rect x="1" y="3" width="15" height="13" />
              <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
              <circle cx="5.5" cy="18.5" r="2.5" />
              <circle cx="18.5" cy="18.5" r="2.5" />
            </svg>
            Free Shipping &gt;₹1,999
          </span>
          <span className="text-[11px] text-gray-700 flex items-center gap-1.5 font-medium">
            <svg className="w-3.5 h-3.5 text-amber-600 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <rect x="2" y="6" width="20" height="12" rx="2" />
              <circle cx="12" cy="12" r="2" />
              <path d="M6 12h.01M18 12h.01" />
            </svg>
            Pan India COD
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
  const { cart, subtotal, clearCart, hasLocalOnlyItems } = useCart();
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const live = isApiConfigured();

  const [step, setStep] = useState(0);
  const [address, setAddress] = useState<Address>(EMPTY_ADDRESS);
  const [addressErrors, setAddressErrors] = useState<Partial<Address>>({});
  const [paymentMethod, setPaymentMethod] = useState("upi");
  const [upiId, setUpiId] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoError, setPromoError] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const [placing, setPlacing] = useState(false);
  const [serviceability, setServiceability] = useState<{ etaDays: number; cod: boolean; shippingFee: number } | null>(null);
  const [giftOptions, setGiftOptions] = useState<GiftOptions>({
    isGift: false,
    packaging: true,
    recipientName: "",
    senderName: "",
    message: "",
    hidePriceTag: true,
  });
  const [cardDetails, setCardDetails] = useState({
    number: "",
    expiry: "",
    cvv: "",
    name: "",
  });

  /* Prefill from the signed-in customer's default address. */
  useEffect(() => {
    if (!isAuthenticated || !user) return;
    const preferred = user.addresses?.find((item) => item.isDefault) ?? user.addresses?.[0];
    const fill = async () => {
      await Promise.resolve();
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

  const giftFee = giftOptions.isGift && giftOptions.packaging ? 149 : 0;
  const shipping = subtotal - promoDiscount >= 1999 ? 0 : serviceability ? serviceability.shippingFee : 99;
  const discount = promoDiscount;
  const total = subtotal + shipping - discount + giftFee;

  /* Empty cart redirect */
  if (cart.length === 0 && step < 3) {
    return (
      <div className="min-h-screen bg-[#faf7f2] flex items-center justify-center px-4">
        <div className="text-center">
          <div className="text-6xl mb-4">🛍️</div>
          <h2 className="text-2xl font-serif text-gray-900 mb-3">
            Your cart is empty
          </h2>
          <p className="text-gray-500 mb-6">
            Add some beautiful pieces before checking out
          </p>
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
  const validateAddress = (): boolean => {
    const errors: Partial<Address> = {};
    if (!address.fullName.trim()) errors.fullName = "Required";
    if (!/^[6-9]\d{9}$/.test(address.phone))
      errors.phone = "Enter valid 10-digit mobile number";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address.email))
      errors.email = "Enter valid email";
    if (!/^\d{6}$/.test(address.pincode))
      errors.pincode = "Enter valid 6-digit pincode";
    if (!address.address.trim()) errors.address = "Required";
    if (!address.city.trim()) errors.city = "Required";
    if (!address.state) errors.state = "Required";
    setAddressErrors(errors);
    const firstError = Object.keys(errors)[0] as keyof Address | undefined;
    if (firstError) {
      requestAnimationFrame(() =>
        document.getElementById(`checkout-${firstError}`)?.focus(),
      );
    }
    return !firstError;
  };

  const handlePincodeLookup = async (pin: string) => {
    if (pin.length !== 6) return;
    if (live) {
      try {
        const result = await checkServiceability(pin);
        setServiceability({ etaDays: result.etaDays, cod: result.cod, shippingFee: result.shippingFee });
        setAddressErrors((previous) => ({ ...previous, pincode: undefined }));
        if (!result.cod && paymentMethod === "cod") setPaymentMethod("upi");
      } catch {
        setServiceability(null);
        setAddressErrors((previous) => ({ ...previous, pincode: "We do not deliver to this pincode yet" }));
      }
      return;
    }
    setServiceability(null);
    setAddressErrors((previous) => ({
      ...previous,
      pincode: "Delivery lookup is unavailable until the storefront API is connected.",
    }));
  };

  const handleApplyPromo = async () => {
    const code = promoCode.trim().toUpperCase();
    if (!code) return;
    if (live) {
      try {
        const result = await validateCoupon(code, subtotal);
        setPromoDiscount(result.discount);
        setPromoApplied(true);
        setPromoError("");
      } catch (cause) {
        setPromoApplied(false);
        setPromoDiscount(0);
        setPromoError((cause as Error)?.message || "That code is not valid");
      }
      return;
    }
    setPromoError("Promo codes are unavailable until the storefront API is connected.");
    setPromoApplied(false);
    setPromoDiscount(0);
  };

  const handlePlaceOrder = async () => {
    setPaymentError("");
    if (!live) {
      setPaymentError("Checkout is unavailable because the storefront API is not configured.");
      return;
    }

    /* ── Real order through the backend ── */
    if (live) {
      if (!isAuthenticated) {
        setPaymentError("Please sign in to place your order — your bag is saved.");
        router.push("/login?redirect=/checkout");
        return;
      }
      if (hasLocalOnlyItems || cart.some((item) => !item.sku || !item.productId)) {
        setPaymentError("Some pieces in your bag are not linked to live products. Please remove them and add them again from the catalogue.");
        return;
      }
      setPlacing(true);
      try {
        const { order, payment } = await placeOrder({
          items: cart.map((item) => ({ productId: item.productId as string, sku: item.sku as string, quantity: item.quantity })),
          shippingAddress: {
            fullName: address.fullName,
            phone: address.phone,
            email: address.email,
            line1: address.address,
            landmark: address.landmark || undefined,
            city: address.city,
            state: address.state,
            pincode: address.pincode,
          },
          couponCode: promoApplied ? promoCode.trim().toUpperCase() : undefined,
          paymentMethod: paymentMethod === "cod" ? "cod" : "razorpay",
          giftOptions: giftOptions.isGift ? { ...giftOptions, fee: giftFee } : undefined,
        });

        if (paymentMethod === "cod") {
          clearCart();
          router.push(`/order-confirmation?orderId=${order._id}`);
          return;
        }

        if (!payment) {
          setPaymentError("Online payment is not available right now. Please choose Cash on Delivery.");
          return;
        }
        const ready = await loadRazorpay();
        if (!ready || !window.Razorpay) {
          setPaymentError("Could not load the payment window. Check your connection or choose Cash on Delivery.");
          return;
        }
        const checkout = new window.Razorpay({
          key: payment.keyId,
          amount: payment.amount,
          currency: payment.currency,
          name: "Vani Collection",
          description: `Order ${order.orderNumber}`,
          order_id: payment.id,
          prefill: { name: address.fullName, email: address.email, contact: address.phone },
          notes: { orderNumber: order.orderNumber },
          theme: { color: "#881337" },
          handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
            try {
              await verifyRazorpayPayment({ orderId: order._id, ...response });
              clearCart();
              router.push(`/order-confirmation?orderId=${order._id}`);
            } catch {
              setPaymentError("Payment went through but we could not confirm it. Our team will contact you shortly.");
            }
          },
          modal: {
            ondismiss: () => setPaymentError("Payment cancelled — your order is saved with payment pending."),
          },
        });
        checkout.open();
      } catch (cause) {
        setPaymentError((cause as Error)?.message || "We could not place your order. Please try again.");
      } finally {
        setPlacing(false);
      }
      return;
    }

  };

  /* ─── STEP 0: Cart Review ─── */
  const renderCartReview = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-serif text-gray-900 mb-6">Review Your Bag</h2>
      {cart.map((item) => (
        <div
          key={`${item.id}-${item.size}`}
          className="bg-white rounded-2xl p-4 flex gap-4 border border-gray-100 shadow-sm"
        >
          <Image
            src={item.image}
            alt={item.title}
            width={80}
            height={96}
            unoptimized
            sizes="80px"
            className="h-24 w-20 flex-shrink-0 rounded-xl object-cover"
          />
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-gray-900 text-sm leading-snug line-clamp-2">
              {item.title}
            </h4>
            <div className="flex gap-3 mt-1.5">
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                Size: {item.size}
              </span>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                Qty: {item.quantity}
              </span>
            </div>
            <div className="flex items-center justify-between mt-3">
              <div>
                <span className="font-bold text-[#881337]">
                  ₹{(item.price * item.quantity).toLocaleString()}
                </span>
                {item.originalPrice > item.price && (
                  <span className="text-xs text-gray-400 line-through ml-2">
                    ₹{(item.originalPrice * item.quantity).toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Promo Code */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Promo Code</h4>
        <div className="flex gap-2">
          <label htmlFor="promo-code" className="sr-only">
            Promo code
          </label>
          <input
            id="promo-code"
            type="text"
            autoComplete="off"
            placeholder="Enter coupon code"
            value={promoCode}
            onChange={(e) => {
              setPromoCode(e.target.value.toUpperCase());
              setPromoError("");
              setPromoApplied(false);
            }}
            className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#881337]/20 focus:border-[#881337]"
          />
          <button
            onClick={handleApplyPromo}
            className="px-4 py-2 bg-[#881337] text-white text-sm font-semibold rounded-xl hover:bg-[#701a35] transition"
          >
            Apply
          </button>
        </div>
        {promoApplied && (
          <p className="text-emerald-600 text-xs mt-2 font-medium">
            ✓ Coupon applied.
          </p>
        )}
        {promoError && (
          <p className="text-red-500 text-xs mt-2">{promoError}</p>
        )}
      </div>

      {/* Price summary inline */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-2 text-sm">
        <div className="flex justify-between text-gray-600">
          <span>Subtotal</span>
          <span>₹{subtotal.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span>Shipping</span>
          <span
            className={shipping === 0 ? "text-emerald-600 font-medium" : ""}
          >
            {shipping === 0 ? "FREE" : `₹${shipping}`}
          </span>
        </div>
        {promoApplied && (
          <div className="flex justify-between text-emerald-600 font-medium">
            <span>Promo ({promoCode.trim().toUpperCase()})</span>
            <span>−₹{discount.toLocaleString()}</span>
          </div>
        )}
        {giftFee > 0 && (
          <div className="flex justify-between text-amber-900 font-medium">
            <span>🎁 Royal Gift Box</span>
            <span>+₹{giftFee.toLocaleString()}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-gray-900 text-base pt-2 border-t border-gray-100">
          <span>Total Payable</span>
          <span>₹{total.toLocaleString()}</span>
        </div>
      </div>

      <button
        onClick={() => setStep(1)}
        className="w-full bg-[#881337] text-white py-4 rounded-xl font-bold text-base hover:bg-[#701a35] transition"
      >
        Proceed to Delivery →
      </button>
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
          value={address[name] as string}
          onChange={(e) => {
            setAddress((prev) => ({ ...prev, [name]: e.target.value }));
            if (name === "pincode") handlePincodeLookup(e.target.value);
            setAddressErrors((prev) => ({ ...prev, [name]: "" }));
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
        <h2 className="text-xl font-serif text-gray-900">Delivery Address</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {renderField({
            label: "Full Name",
            name: "fullName",
            placeholder: "As per ID",
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
            label: "Pincode",
            name: "pincode",
            placeholder: "6-digit pincode",
            half: true,
          })}
          {renderField({
            label: "City",
            name: "city",
            placeholder: "Auto-filled from pincode",
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

        {/* Address Type */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-2">
            Save address as
          </label>
          <div className="flex gap-3">
            {(["home", "work", "other"] as const).map((type) => (
              <button
                key={type}
                onClick={() => setAddress((p) => ({ ...p, addressType: type }))}
                className={`px-4 py-2 rounded-xl text-xs font-semibold capitalize border transition flex items-center gap-2 ${
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
        </div>

        {/* Bespoke Royal Gift Packaging & Handwritten Note */}
        <div className="pt-2">
          <GiftOptionsCard value={giftOptions} onChange={setGiftOptions} />
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setStep(0)}
            className="flex-1 py-3 border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition"
          >
            ← Back
          </button>
          <button
            onClick={() => {
              if (validateAddress()) setStep(2);
            }}
            className="flex-2 flex-grow py-3 bg-[#881337] text-white rounded-xl font-semibold hover:bg-[#701a35] transition"
          >
            Continue to Payment →
          </button>
        </div>
      </div>
    );
  };

  /* ─── STEP 2: Payment ─── */
  const renderPaymentStep = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-serif text-gray-900">Payment Method</h2>

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
            onClick={() => setStep(1)}
            className="text-xs text-[#881337] font-medium hover:underline"
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
              onClick={() => setStep(1)}
              className="text-xs text-[#881337] font-semibold hover:underline shrink-0 ml-3"
            >
              Edit Gift
            </button>
          </div>
        </div>
      )}

      {/* Payment Options */}
      <div className="space-y-3">
        {PAYMENT_METHODS.map((method) => (
          <label
            key={method.id}
            className={`flex min-h-20 items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition ${
              paymentMethod === method.id
                ? "border-[#881337] bg-[#881337]/5"
                : "border-gray-200 hover:border-gray-300 bg-white"
            }`}
          >
            <input
              type="radio"
              name="payment-method"
              value={method.id}
              checked={paymentMethod === method.id}
              onChange={() => {
                setPaymentMethod(method.id);
                setPaymentError("");
              }}
              className="sr-only"
            />
            {/* Real Payment Logo Badges */}
            <div className="w-14 h-11 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-center shrink-0 p-1">
              {method.id === "upi" && (
                <div className="flex flex-col items-center justify-center gap-0.5">
                  <svg className="h-3.5 w-auto" viewBox="0 0 70 24" fill="none">
                    <path d="M7.5 4L13 14H2L7.5 4Z" fill="#097939" />
                    <path d="M11 9.5L16.5 19.5H5.5L11 9.5Z" fill="#ED752E" />
                    <text x="21" y="17" fontFamily="sans-serif" fontSize="13" fontWeight="800" fill="#2E2E2E">UPI</text>
                  </svg>
                  <span className="text-[9px] font-bold text-[#5f259f] tracking-tight">GPay · PhonePe</span>
                </div>
              )}
              {method.id === "card" && (
                <div className="flex flex-col items-center justify-center">
                  <div className="flex items-center gap-1">
                    <svg className="h-3 w-auto" viewBox="0 0 52 18" fill="none">
                      <path d="M20.5 1.5l-4.2 14.8h-3.4L8.7 5.2c-.3-.9-.6-1.2-1.3-1.6C5.9 2.8 4 2.2 2.2 1.8l.2-.7h6.8c1 0 1.8.6 2 1.8l1.7 8.9 4.1-10.3h3.5zm15.4 10c0-3.9-5.4-4.1-5.4-5.9 0-.6.6-1.2 1.8-1.4.6-.1 2.2-.2 4 .7l.7-3.3c-1-.4-2.3-.7-3.9-.7-4.1 0-7 2.2-7 5.3 0 2.3 2 3.6 3.6 4.4 1.6.8 2.2 1.3 2.2 2 0 1.1-1.3 1.6-2.6 1.6-1.7 0-2.7-.3-4.1-.9l-.7 3.4c1 .5 2.8.8 4.7.8 4.4 0 7.3-2.2 7.3-5.2zM45.5 16.3h3.2L45.9 1.5h-2.9c-.8 0-1.4.4-1.7 1.1l-6 13.7h3.6l.7-2h4.4l.6 2zm-3.8-4.7l1.8-4.9 1 4.9h-2.8zM27.2 1.5l-2.7 14.8h-3.4L23.8 1.5h3.4z" fill="#1A1F71"/>
                    </svg>
                    <svg className="h-3 w-auto" viewBox="0 0 34 22" fill="none">
                      <circle cx="11" cy="11" r="9" fill="#EB001B"/>
                      <circle cx="23" cy="11" r="9" fill="#F79E1B"/>
                    </svg>
                  </div>
                  <span className="text-[8px] font-bold text-stone-500 uppercase mt-0.5">Cards</span>
                </div>
              )}
              {method.id === "netbanking" && (
                <div className="flex flex-col items-center justify-center text-stone-800">
                  <svg className="w-5 h-5 text-stone-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3" />
                  </svg>
                  <span className="text-[8px] font-bold text-stone-600 tracking-tight">Bank</span>
                </div>
              )}
              {method.id === "cod" && (
                <div className="flex flex-col items-center justify-center text-amber-700">
                  <svg className="w-5 h-5 text-amber-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="6" width="20" height="12" rx="2" />
                    <circle cx="12" cy="12" r="2" />
                    <path d="M6 12h.01M18 12h.01" />
                  </svg>
                  <span className="text-[8px] font-bold text-amber-800 uppercase">COD</span>
                </div>
              )}
              {method.id === "emi" && (
                <div className="flex flex-col items-center justify-center text-stone-700">
                  <svg className="w-5 h-5 text-[#881337]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  <span className="text-[8px] font-bold text-[#881337]">0% EMI</span>
                </div>
              )}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900 text-sm">
                {method.label}
              </p>
              <p className="text-xs text-gray-500">{method.desc}</p>
            </div>
            <div
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                paymentMethod === method.id
                  ? "border-[#881337]"
                  : "border-gray-300"
              }`}
            >
              {paymentMethod === method.id && (
                <div className="w-2.5 h-2.5 rounded-full bg-[#881337]" />
              )}
            </div>
          </label>
        ))}
      </div>

      {/* Live mode: the gateway collects the instrument details, so no card data touches our form. */}
      {live && paymentMethod !== "cod" && (
        <div className="rounded-2xl border border-[#881337]/20 bg-[#881337]/5 p-4 text-sm text-stone-700">
          <p className="font-semibold text-[#881337]">Secure payment window</p>
          <p className="mt-1 leading-relaxed">
            UPI, credit/debit cards, net banking and EMI are handled inside the Razorpay window on the next step.
            We never see or store your card or UPI credentials.
          </p>
          {serviceability && (
            <p className="mt-2 text-xs text-stone-500">
              Delivering to {address.pincode} in about {serviceability.etaDays} day{serviceability.etaDays === 1 ? "" : "s"}
              {serviceability.cod ? " · Cash on Delivery available" : " · Cash on Delivery not available for this pincode"}
            </p>
          )}
        </div>
      )}

      {/* Instrument details are never collected here; live payments use the hosted provider flow. */}
      {!live && paymentMethod === "upi" && (
        <div>
          <label
            htmlFor="upi-id"
            className="block text-sm font-semibold text-gray-700 mb-1.5"
          >
            UPI ID
          </label>
          <input
            id="upi-id"
            name="upiId"
            type="text"
            inputMode="email"
            autoComplete="off"
            aria-invalid={Boolean(paymentError)}
            aria-describedby={paymentError ? "payment-error" : undefined}
            placeholder="yourname@upi"
            value={upiId}
            onChange={(e) => {
              setUpiId(e.target.value);
              setPaymentError("");
            }}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#881337]/20 focus:border-[#881337]"
          />
        </div>
      )}

      {!live && paymentMethod === "card" && (
        <div className="space-y-3 bg-gray-50 p-4 rounded-2xl border border-gray-200">
          <div>
            <label
              htmlFor="card-number"
              className="block text-sm font-semibold text-gray-700 mb-1.5"
            >
              Card Number
            </label>
            <input
              id="card-number"
              name="cc-number"
              type="text"
              inputMode="numeric"
              autoComplete="cc-number"
              placeholder="1234 5678 9012 3456"
              maxLength={19}
              value={cardDetails.number}
              onChange={(e) => {
                setCardDetails((prev) => ({
                  ...prev,
                  number: e.target.value.replace(/[^\d ]/g, ""),
                }));
                setPaymentError("");
              }}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#881337]"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="card-expiry"
                className="block text-sm font-semibold text-gray-700 mb-1.5"
              >
                Expiry Date
              </label>
              <input
                id="card-expiry"
                name="cc-exp"
                type="text"
                inputMode="numeric"
                autoComplete="cc-exp"
                placeholder="MM / YY"
                maxLength={7}
                value={cardDetails.expiry}
                onChange={(e) => {
                  setCardDetails((prev) => ({
                    ...prev,
                    expiry: e.target.value,
                  }));
                  setPaymentError("");
                }}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#881337]"
              />
            </div>
            <div>
              <label
                htmlFor="card-cvv"
                className="block text-sm font-semibold text-gray-700 mb-1.5"
              >
                CVV
              </label>
              <input
                id="card-cvv"
                name="cc-csc"
                type="password"
                inputMode="numeric"
                autoComplete="cc-csc"
                placeholder="•••"
                maxLength={4}
                value={cardDetails.cvv}
                onChange={(e) => {
                  setCardDetails((prev) => ({
                    ...prev,
                    cvv: e.target.value.replace(/\D/g, ""),
                  }));
                  setPaymentError("");
                }}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#881337]"
              />
            </div>
          </div>
          <div>
            <label
              htmlFor="card-name"
              className="block text-sm font-semibold text-gray-700 mb-1.5"
            >
              Cardholder Name
            </label>
            <input
              id="card-name"
              name="cc-name"
              type="text"
              autoComplete="cc-name"
              placeholder="Name on card"
              value={cardDetails.name}
              onChange={(e) => {
                setCardDetails((prev) => ({ ...prev, name: e.target.value }));
                setPaymentError("");
              }}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#881337]"
            />
          </div>
        </div>
      )}

      {/* Final total */}
      <div className="bg-[#881337]/5 border border-[#881337]/20 rounded-2xl p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-600">Amount Payable</p>
          <p className="text-2xl font-bold text-gray-900">
            ₹{total.toLocaleString()}
          </p>
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
          onClick={() => setStep(1)}
          className="flex-1 py-3 border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition"
        >
          ← Back
        </button>
        <button
          onClick={() => void handlePlaceOrder()}
          disabled={placing || !live}
          className="flex-grow py-3 bg-[#881337] text-white rounded-xl font-bold text-base hover:bg-[#701a35] transition disabled:cursor-not-allowed disabled:bg-stone-400"
        >
          {placing ? "Placing order…" : paymentMethod === "cod" || !live ? "Place Order →" : `Pay ₹${total.toLocaleString()} →`}
        </button>
      </div>

      <p className="text-xs text-gray-500 text-center leading-relaxed">
        By placing this order you agree to our Terms & Conditions and Privacy
        Policy. Delivery within 5–7 business days across India.
      </p>
    </div>
  );

  const sessionNotice = !live ? (
    <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12.5px] text-amber-900">
      <strong className="font-semibold">Checkout unavailable.</strong> The storefront API is not configured, so orders cannot be placed.
    </div>
  ) : !isAuthenticated ? (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#881337]/20 bg-[#881337]/5 px-4 py-3 text-[12.5px] text-stone-700">
      <span>
        <strong className="font-semibold">Signed out.</strong> Sign in so we can save your bag, addresses and order history.
      </span>
      <Link href="/login?redirect=/checkout" className="rounded-xl bg-[#881337] px-3.5 py-2 text-[12px] font-semibold text-white hover:bg-[#6b0f2b]">
        Sign in
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
        <StepIndicator current={step} />
        {sessionNotice}

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
            <OrderSummary discount={discount} giftFee={giftFee} />
          </div>
        </div>
      </div>
    </div>
  );
}
