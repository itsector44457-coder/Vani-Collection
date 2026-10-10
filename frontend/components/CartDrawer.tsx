"use client";

import { useCart } from "../context/CartContext";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CartDrawer() {
  const [cartItemsRef] = useAutoAnimate<HTMLDivElement>();
  const {
    cart,
    isCartOpen,
    setIsCartOpen,
    removeFromCart,
    updateQuantity,
    subtotal,
    freeShippingThreshold,
    cartCount,
  } = useCart();

  const router = useRouter();
  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState(false);
  const [discountAmount, setDiscountAmount] = useState(0);

  const amountLeftForFreeShipping = Math.max(0, freeShippingThreshold - subtotal);
  const freeShippingProgress = Math.min(100, (subtotal / freeShippingThreshold) * 100);

  const handleApplyPromo = () => {
    if (promoCode.trim().toUpperCase() === "FIRST10" || promoCode.trim().toUpperCase() === "VANI10") {
      setPromoApplied(true);
      setDiscountAmount(Math.round(subtotal * 0.1));
    } else {
      alert("Invalid coupon! Try using code 'FIRST10' for 10% off.");
    }
  };

  const finalTotal = subtotal - discountAmount;

  return (
    <AnimatePresence>
      {isCartOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsCartOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
          />

          {/* Drawer */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cart-drawer-title"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 260 }}
            className="fixed top-0 right-0 bottom-0 w-full sm:w-[460px] bg-[#faf7f2] z-[101] shadow-2xl flex flex-col border-l border-[#e8dfd5]"
            style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
          >
            {/* Header */}
            <div className="p-6 border-b border-[#e8dfd5] flex items-center justify-between bg-white/70">
              <div className="flex items-center gap-2">
                <h2 id="cart-drawer-title" className="font-serif text-2xl text-[#1c1917] tracking-wide">
                  Your Shopping Bag
                </h2>
                <span className="text-xs bg-[#881337] text-white px-2 py-0.5 rounded-full font-medium">
                  {cartCount}
                </span>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-stone-200/60 text-stone-600 transition"
                aria-label="Close cart"
              >
                ✕
              </button>
            </div>

            {/* Free Shipping Progress Bar */}
            <div className="bg-[#f2ece2] p-4 border-b border-[#e8dfd5] text-xs">
              {amountLeftForFreeShipping > 0 ? (
                <p className="text-stone-700 mb-2">
                  Add <span className="font-bold text-[#881337]">₹{amountLeftForFreeShipping}</span> more to unlock <span className="font-semibold text-emerald-800">FREE Express Delivery</span>!
                </p>
              ) : (
                <p className="text-emerald-800 font-semibold mb-2 flex items-center gap-1.5">
                  <span>✓</span> You have unlocked <strong>FREE Express Shipping</strong>!
                </p>
              )}
              <div className="w-full h-1.5 bg-stone-300 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#b8935a] to-[#881337] transition-all duration-500 rounded-full"
                  style={{ width: `${freeShippingProgress}%` }}
                />
              </div>
            </div>

            {/* Cart Items List */}
            <div ref={cartItemsRef} className="flex-1 overflow-y-auto p-6 space-y-5 divide-y divide-stone-200">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8">
                  <div className="w-20 h-20 rounded-full bg-stone-100 flex items-center justify-center text-3xl mb-4 text-stone-400">
                    🛍️
                  </div>
                  <h3 className="font-serif text-xl text-stone-800 mb-2">Your Bag is Empty</h3>
                  <p className="text-xs text-stone-500 max-w-xs mb-6">
                    Explore our pure mul cotton handcrafted suits and festive edits crafted by Jaipur master artisans.
                  </p>
                  <button
                    onClick={() => setIsCartOpen(false)}
                    className="bg-[#1c1917] text-white px-6 py-3 rounded-full text-xs uppercase tracking-widest hover:bg-[#881337] transition"
                  >
                    Start Exploring
                  </button>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={`${item.id}-${item.size}`} className="pt-4 first:pt-0 flex gap-4">
                    <div className="w-20 h-24 relative rounded-md overflow-hidden bg-stone-100 shrink-0 border border-stone-200">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-full h-full object-cover object-top"
                      />
                    </div>
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start">
                          <h4 className="font-serif text-sm font-semibold text-stone-900 line-clamp-2 pr-2">
                            {item.title}
                          </h4>
                          <button
                            onClick={() => removeFromCart(item.id, item.size)}
                            className="text-stone-400 hover:text-rose-700 text-xs transition"
                            title="Remove"
                          >
                            ✕
                          </button>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-stone-500 mt-1">
                          <span className="bg-stone-200/80 px-2 py-0.5 rounded text-stone-800 font-medium">
                            Size: {item.size}
                          </span>
                          {item.color && <span>{item.color}</span>}
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-3">
                        {/* Quantity selector */}
                        <div className="flex items-center border border-stone-300 rounded bg-white overflow-hidden text-xs">
                          <button
                            onClick={() => updateQuantity(item.id, item.size, item.quantity - 1)}
                            className="px-2.5 py-1 text-stone-600 hover:bg-stone-100 transition"
                          >
                            -
                          </button>
                          <span className="px-3 py-1 font-semibold text-stone-800">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, item.size, item.quantity + 1)}
                            className="px-2.5 py-1 text-stone-600 hover:bg-stone-100 transition"
                          >
                            +
                          </button>
                        </div>

                        {/* Price */}
                        <div className="text-right">
                          <span className="font-bold text-stone-900 text-sm">
                            ₹{item.price * item.quantity}
                          </span>
                          {item.originalPrice > item.price && (
                            <span className="block text-[10px] text-stone-400 line-through">
                              ₹{item.originalPrice * item.quantity}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer / Checkout */}
            {cart.length > 0 && (
              <div className="p-4 sm:p-6 pb-24 sm:pb-6 bg-white border-t border-[#e8dfd5] space-y-3 sm:space-y-4 shadow-inner">
                {/* Coupon input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Coupon (e.g. FIRST10)"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    className="flex-1 px-3 py-2 border border-stone-300 rounded text-xs uppercase tracking-wider focus:outline-none focus:border-[#881337]"
                  />
                  <button
                    onClick={handleApplyPromo}
                    className="px-4 py-2 bg-stone-100 border border-stone-300 rounded text-xs font-semibold text-stone-800 hover:bg-stone-200 transition"
                  >
                    Apply
                  </button>
                </div>

                {promoApplied && (
                  <div className="flex justify-between text-xs text-emerald-700 bg-emerald-50 p-2 rounded border border-emerald-200">
                    <span>Coupon &apos;FIRST10&apos; Applied (10% OFF)</span>
                    <span>-₹{discountAmount}</span>
                  </div>
                )}

                {/* Subtotals */}
                <div className="space-y-1.5 text-xs text-stone-600">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="font-semibold text-stone-900">₹{subtotal}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-700">
                      <span>Discount</span>
                      <span>-₹{discountAmount}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Shipping</span>
                    <span>
                      {amountLeftForFreeShipping === 0 ? (
                        <span className="text-emerald-700 font-semibold">FREE</span>
                      ) : (
                        "₹99"
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-stone-900 pt-2 border-t border-stone-200">
                    <span>Estimated Total</span>
                    <span className="text-[#881337] text-base">
                      ₹{amountLeftForFreeShipping === 0 ? finalTotal : finalTotal + 99}
                    </span>
                  </div>
                  <p className="text-[10px] text-stone-400 text-center">
                    Taxes included · Free returns & 7-day exchanges
                  </p>
                </div>

                {/* Checkout button */}
                <button
                  onClick={() => { setIsCartOpen(false); router.push("/checkout"); }}
                  className="w-full bg-[#881337] hover:bg-[#6b0f2b] text-white py-3.5 rounded-full text-xs uppercase tracking-[0.2em] font-semibold transition shadow-md flex items-center justify-center gap-2 group"
                >
                  <span>Proceed to Checkout</span>
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
