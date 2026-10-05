"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "../../context/CartContext";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

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
    icon: "📱",
    desc: "Instant payment via UPI apps",
  },
  {
    id: "card",
    label: "Credit / Debit Card",
    icon: "💳",
    desc: "Visa, Mastercard, RuPay",
  },
  {
    id: "netbanking",
    label: "Net Banking",
    icon: "🏦",
    desc: "All major Indian banks",
  },
  {
    id: "cod",
    label: "Cash on Delivery",
    icon: "🏠",
    desc: "Pay when you receive your order",
  },
  {
    id: "emi",
    label: "EMI (No Cost)",
    icon: "📅",
    desc: "0% EMI on select banks",
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
}: {
  compact?: boolean;
  discount?: number;
}) {
  const { cart, subtotal } = useCart();
  const shipping = subtotal >= 1999 ? 0 : 99;
  const total = subtotal + shipping - discount;
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
        <div className="border-t border-gray-100 pt-3 grid grid-cols-2 gap-2">
          {[
            "🔒 Secure Payments",
            "🔁 7-Day Exchange",
            "🚚 Free Shipping >₹1,999",
            "📦 Pan India COD",
          ].map((b) => (
            <span
              key={b}
              className="text-[10px] text-gray-500 flex items-center gap-1"
            >
              {b}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════ */
export default function CheckoutPage() {
  const { cart, subtotal, clearCart } = useCart();
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [address, setAddress] = useState<Address>(EMPTY_ADDRESS);
  const [addressErrors, setAddressErrors] = useState<Partial<Address>>({});
  const [paymentMethod, setPaymentMethod] = useState("upi");
  const [upiId, setUpiId] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoError, setPromoError] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const [cardDetails, setCardDetails] = useState({
    number: "",
    expiry: "",
    cvv: "",
    name: "",
  });

  const shipping = subtotal >= 1999 ? 0 : 99;
  const discount = promoApplied ? Math.round(subtotal * 0.1) : 0;
  const total = subtotal + shipping - discount;

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
    if (pin.length === 6) {
      // Simulate pincode lookup
      const cityMap: Record<string, { city: string; state: string }> = {
        "302001": { city: "Jaipur", state: "Rajasthan" },
        "400001": { city: "Mumbai", state: "Maharashtra" },
        "110001": { city: "New Delhi", state: "Delhi" },
        "560001": { city: "Bengaluru", state: "Karnataka" },
      };
      if (cityMap[pin]) {
        setAddress((prev) => ({
          ...prev,
          city: cityMap[pin].city,
          state: cityMap[pin].state,
        }));
      }
    }
  };

  const handleApplyPromo = () => {
    if (promoCode.toUpperCase() === "FIRST10") {
      setPromoApplied(true);
      setPromoError("");
    } else {
      setPromoError("Invalid promo code");
      setPromoApplied(false);
    }
  };

  const handlePlaceOrder = () => {
    setPaymentError("");

    if (
      paymentMethod === "upi" &&
      !/^[\w.-]{2,}@[\w.-]{2,}$/.test(upiId.trim())
    ) {
      setPaymentError("Enter a valid UPI ID, for example name@bank.");
      return;
    }

    if (paymentMethod === "card") {
      const cardNumber = cardDetails.number.replace(/\s/g, "");
      if (
        !/^\d{16}$/.test(cardNumber) ||
        !/^\d{2}\s?\/\s?\d{2}$/.test(cardDetails.expiry) ||
        !/^\d{3,4}$/.test(cardDetails.cvv) ||
        !cardDetails.name.trim()
      ) {
        setPaymentError("Please complete all card details correctly.");
        return;
      }
    }

    clearCart();
    setStep(3);
    router.push(
      "/order-confirmation?orderId=VC" + Date.now().toString().slice(-6),
    );
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
            placeholder="Enter code (try FIRST10)"
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
            ✓ 10% discount applied!
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
            <span>Promo (FIRST10)</span>
            <span>−₹{discount.toLocaleString()}</span>
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
                className={`px-4 py-2 rounded-xl text-xs font-semibold capitalize border transition ${
                  address.addressType === type
                    ? "bg-[#881337] text-white border-[#881337]"
                    : "bg-white text-gray-700 border-gray-200 hover:border-gray-300"
                }`}
              >
                {type === "home"
                  ? "🏠 Home"
                  : type === "work"
                    ? "🏢 Work"
                    : "📍 Other"}
              </button>
            ))}
          </div>
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
            <span className="text-2xl" aria-hidden="true">
              {method.icon}
            </span>
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

      {/* UPI input */}
      {paymentMethod === "upi" && (
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

      {/* Card fields */}
      {paymentMethod === "card" && (
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
          <p>🔒 256-bit SSL</p>
          <p>Secured by Razorpay</p>
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
          onClick={handlePlaceOrder}
          className="flex-grow py-3 bg-[#881337] text-white rounded-xl font-bold text-base hover:bg-[#701a35] transition"
        >
          Place Order →
        </button>
      </div>

      <p className="text-xs text-gray-500 text-center leading-relaxed">
        By placing this order you agree to our Terms & Conditions and Privacy
        Policy. Delivery within 5–7 business days across India.
      </p>
    </div>
  );

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
          <div className="text-xs text-gray-500">Secure Checkout 🔒</div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <StepIndicator current={step} />

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
            <OrderSummary discount={discount} />
          </div>
        </div>
      </div>
    </div>
  );
}
