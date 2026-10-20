"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { AnimatePresence, motion } from "framer-motion";
import { useCart } from "../context/CartContext";
import { readSavedPincode, savePincode, SHIPPING_FEE_FAR, SHIPPING_FEE_LABEL, shippingFeeFor } from "../lib/pricing";
import { checkServiceability, type Serviceability } from "../lib/storefront-api";
import { formatPrice } from "../lib/utils";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

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
    isSyncing,
    error,
    dismissError,
    lastRemoved,
    undoRemove,
    dismissLastRemoved,
    toggleWishlist,
    isInWishlist,
    hasLocalOnlyItems,
  } = useCart();
  const router = useRouter();
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [pincode, setPincode] = useState("");
  const [delivery, setDelivery] = useState<Serviceability | null>(null);
  const [pincodeError, setPincodeError] = useState<string | null>(null);
  const [checkingPincode, setCheckingPincode] = useState(false);

  const checkPincode = useCallback(async (raw: string) => {
    const cleaned = raw.replace(/\D/g, "").slice(0, 6);
    if (!/^[1-9]\d{5}$/.test(cleaned)) {
      setDelivery(null);
      setPincodeError("Sahi 6-digit pincode likhe.");
      return;
    }
    setCheckingPincode(true);
    setPincodeError(null);
    try {
      const result = await checkServiceability(cleaned);
      if (!result.serviceable) throw new Error("unserviceable");
      setDelivery(result);
      savePincode(cleaned);
    } catch {
      setDelivery(null);
      setPincodeError("Is pincode ki delivery abhi confirm nahi ho payi. Checkout par dobara check hoga.");
    } finally {
      setCheckingPincode(false);
    }
  }, []);

  /* Open: remember where focus came from, move it into the drawer, trap Tab, honour Escape. */
  useEffect(() => {
    if (!isCartOpen) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => closeButtonRef.current?.focus(), 80);

    const saved = readSavedPincode();
    if (saved) {
      void Promise.resolve().then(() => {
        setPincode((current) => current || saved);
        void checkPincode(saved);
      });
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setIsCartOpen(false);
        return;
      }
      if (event.key !== "Tab" || !drawerRef.current) return;
      const focusable = [...drawerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((element) => element.offsetParent !== null);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [checkPincode, isCartOpen, setIsCartOpen]);

  const amountLeftForFreeShipping = Math.max(0, freeShippingThreshold - subtotal);
  const freeShippingProgress = Math.min(100, (subtotal / freeShippingThreshold) * 100);
  const knownZoneFee = delivery && delivery.pincode === pincode ? delivery.shippingFee : null;
  const shipping = shippingFeeFor(subtotal, knownZoneFee);
  const shippingKnown = amountLeftForFreeShipping === 0 || knownZoneFee !== null;
  const savings = cart.reduce((total, item) => total + Math.max(0, item.originalPrice - item.price) * item.quantity, 0);
  const unavailableItems = cart.filter((item) => item.inStock === false || (typeof item.available === "number" && item.available < item.quantity));
  const checkoutBlocked = isSyncing || unavailableItems.length > 0;

  const moveToWishlist = (item: (typeof cart)[number]) => {
    const productId = item.productId || item.id;
    if (!isInWishlist(productId)) toggleWishlist(productId);
    removeFromCart(item.id, item.size, item.color);
  };

  return (
    <AnimatePresence>
      {isCartOpen && (
        <>
          <motion.button
            type="button"
            aria-label="Close cart"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsCartOpen(false)}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="cart-drawer-title"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 260 }}
            className="fixed bottom-0 right-0 top-0 z-[101] flex w-full flex-col border-l border-[#e8dfd5] bg-[#faf7f2] shadow-2xl sm:w-[460px]"
            style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
          >
            <div className="flex items-center justify-between border-b border-[#e8dfd5] bg-white/70 p-5 sm:p-6">
              <div className="flex items-center gap-2">
                <h2 id="cart-drawer-title" className="font-serif text-2xl tracking-wide text-[#1c1917]">Your Shopping Bag</h2>
                <span className="rounded-full bg-[#881337] px-2 py-0.5 text-xs font-medium text-white" aria-label={`${cartCount} items`}>{cartCount}</span>
              </div>
              <button ref={closeButtonRef} type="button" onClick={() => setIsCartOpen(false)} className="flex h-11 w-11 items-center justify-center rounded-full text-stone-600 transition hover:bg-stone-200/60" aria-label="Close cart">✕</button>
            </div>

            <div aria-live="polite" className="empty:hidden">
              {isSyncing && <p className="bg-sky-50 px-4 py-2 text-center text-xs font-medium text-sky-800">Bag update ho raha hai…</p>}
              {error && (
                <div role="alert" className="flex items-start justify-between gap-3 bg-rose-50 px-4 py-2.5 text-xs leading-relaxed text-rose-800">
                  <span>{error}</span>
                  <button type="button" onClick={dismissError} aria-label="Cart error band kare" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-bold hover:bg-rose-100">✕</button>
                </div>
              )}
              {lastRemoved && (
                <div className="flex flex-wrap items-center gap-2 bg-[#1c1917] px-4 py-2.5 text-xs text-white">
                  <span className="min-w-0 flex-1 truncate">“{lastRemoved.title}” bag se hata diya.</span>
                  <button type="button" onClick={undoRemove} className="min-h-11 rounded-full bg-white px-4 font-bold text-[#881337]">Undo</button>
                  <button type="button" onClick={dismissLastRemoved} aria-label="Removed item sandesh band kare" className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-white/10">✕</button>
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div className="border-b border-[#e8dfd5] bg-[#f2ece2] p-4 text-xs">
                {amountLeftForFreeShipping > 0 ? (
                  <p className="mb-2 text-stone-700">Aur <strong className="text-[#881337]">{formatPrice(amountLeftForFreeShipping)}</strong> jodne par <strong className="text-emerald-800">FREE delivery</strong> mil jayegi.</p>
                ) : (
                  <p className="mb-2 font-semibold text-emerald-800">✓ Badhai ho — is order ki delivery FREE hai.</p>
                )}
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-300" role="progressbar" aria-label="Free shipping progress" aria-valuemin={0} aria-valuemax={freeShippingThreshold} aria-valuenow={Math.min(subtotal, freeShippingThreshold)}>
                  <div className="h-full rounded-full bg-gradient-to-r from-[#b8935a] to-[#881337] transition-all duration-500" style={{ width: `${freeShippingProgress}%` }} />
                </div>
              </div>
            )}

            <div ref={cartItemsRef} className="flex-1 divide-y divide-stone-200 overflow-y-auto p-5 sm:p-6">
              {cart.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center p-6 text-center">
                  <div aria-hidden="true" className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-stone-100 text-3xl text-stone-400">🛍️</div>
                  <h3 className="mb-2 font-serif text-xl text-stone-800">Your bag is empty</h3>
                  <p className="mb-6 max-w-xs text-sm leading-relaxed text-stone-500">Mul cotton sets, Anarkalis aur festive pieces — apni pasand se shuruaat kare.</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    <button type="button" onClick={() => { setIsCartOpen(false); router.push("/products"); }} className="min-h-11 rounded-full bg-[#881337] px-5 text-xs font-bold uppercase tracking-widest text-white transition hover:bg-[#6b0f2b]">Shop bestsellers</button>
                    <button type="button" onClick={() => { setIsCartOpen(false); router.push("/collections"); }} className="min-h-11 rounded-full border border-stone-300 bg-white px-5 text-xs font-bold uppercase tracking-widest text-stone-700 transition hover:border-[#881337] hover:text-[#881337]">Collections</button>
                  </div>
                </div>
              ) : (
                cart.map((item) => {
                  const unavailable = item.inStock === false || (typeof item.available === "number" && item.available < item.quantity);
                  const productHref = item.slug ? `/product/${item.slug}` : null;
                  const title = <span className="line-clamp-2">{item.title}</span>;
                  return (
                    <article key={`${item.lineId || item.sku || item.id}-${item.size}-${item.color || ""}`} className="flex gap-4 py-4 first:pt-0">
                      <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-md border border-stone-200 bg-stone-100">
                        {item.image && <Image src={item.image} alt="" fill unoptimized sizes="80px" className="object-cover object-top" />}
                        {productHref && <Link href={productHref} onClick={() => setIsCartOpen(false)} aria-label={`${item.title} ka product page khole`} className="absolute inset-0" />}
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col justify-between">
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-serif text-sm font-semibold text-stone-900">
                              {productHref ? <Link href={productHref} onClick={() => setIsCartOpen(false)} className="hover:text-[#881337]">{title}</Link> : title}
                            </h3>
                            <button type="button" disabled={isSyncing} onClick={() => removeFromCart(item.id, item.size, item.color)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-stone-400 transition hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50" aria-label={`Remove ${item.title} from bag`}>✕</button>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-stone-500">
                            {item.size && <span className="rounded bg-stone-200/80 px-2 py-0.5 font-medium text-stone-800">Size: {item.size}</span>}
                            {item.color && <span>{item.color}</span>}
                            {typeof item.available === "number" && item.available > 0 && item.available <= 3 && !unavailable && <span className="font-semibold text-amber-700">Sirf {item.available} bache hain</span>}
                          </div>
                          {unavailable && (
                            <p role="alert" className="mt-2 rounded-lg bg-rose-50 px-2.5 py-2 text-[11.5px] leading-relaxed text-rose-800">
                              {typeof item.available === "number" && item.available > 0 ? `Is size me ab sirf ${item.available} uplabdh hai — quantity ghata de.` : "Yeh size abhi khatm ho gaya hai — kripya hata de ya doosra size chune."}
                            </p>
                          )}
                        </div>

                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center overflow-hidden rounded-full border border-stone-300 bg-white" aria-label={`${item.title} quantity`}>
                            <button type="button" disabled={isSyncing} onClick={() => updateQuantity(item.id, item.size, item.quantity - 1, item.color)} className="flex h-11 w-11 items-center justify-center text-base text-stone-600 transition hover:bg-stone-100 disabled:opacity-50" aria-label={`Decrease quantity of ${item.title}`}>−</button>
                            <span className="min-w-8 text-center text-sm font-bold text-stone-800" aria-live="polite">{item.quantity}</span>
                            <button type="button" disabled={isSyncing || (typeof item.available === "number" && item.quantity >= item.available)} onClick={() => updateQuantity(item.id, item.size, item.quantity + 1, item.color)} className="flex h-11 w-11 items-center justify-center text-base text-stone-600 transition hover:bg-stone-100 disabled:opacity-50" aria-label={`Increase quantity of ${item.title}`}>+</button>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-bold text-stone-900">{formatPrice(item.price * item.quantity)}</span>
                            {item.originalPrice > item.price && <span className="block text-[11px] text-stone-400 line-through">{formatPrice(item.originalPrice * item.quantity)}</span>}
                          </div>
                        </div>
                        <button type="button" disabled={isSyncing} onClick={() => moveToWishlist(item)} className="mt-2 min-h-9 w-fit text-left text-[11.5px] font-semibold text-[#881337] hover:underline disabled:opacity-50">♡ Baad ke liye save kare (wishlist)</button>
                      </div>
                    </article>
                  );
                })
              )}
            </div>

            {cart.length > 0 && (
              <div className="space-y-3 border-t border-[#e8dfd5] bg-white p-4 shadow-inner sm:p-6 sm:pb-6">
                <form
                  onSubmit={(event) => { event.preventDefault(); void checkPincode(pincode); }}
                  className="rounded-2xl bg-[#faf7f2] p-3"
                >
                  <label htmlFor="cart-pincode" className="text-xs font-bold text-stone-700">Delivery pincode check kare</label>
                  <div className="mt-2 flex gap-2">
                    <input id="cart-pincode" value={pincode} onChange={(event) => { setPincode(event.target.value.replace(/\D/g, "").slice(0, 6)); setPincodeError(null); }} inputMode="numeric" autoComplete="postal-code" placeholder="473001" className="min-h-11 min-w-0 flex-1 rounded-xl border border-stone-300 bg-white px-3 text-sm tracking-widest outline-none focus:border-[#881337] focus:ring-2 focus:ring-[#881337]/15" />
                    <button type="submit" disabled={checkingPincode || pincode.length !== 6} className="min-h-11 shrink-0 rounded-xl bg-[#1c1917] px-4 text-xs font-bold text-white disabled:opacity-50">{checkingPincode ? "Check…" : "Check"}</button>
                  </div>
                  <div aria-live="polite">
                    {pincodeError && <p className="mt-2 text-[11.5px] leading-relaxed text-rose-700">{pincodeError}</p>}
                    {delivery && delivery.pincode === pincode && (
                      <p className="mt-2 text-[11.5px] leading-relaxed text-emerald-800">✓ {delivery.pincode} par delivery uplabdh hai · lagbhag {delivery.etaDays} din · {delivery.cod ? "COD uplabdh" : "Sirf online payment"} · shipping {amountLeftForFreeShipping === 0 ? "FREE" : formatPrice(delivery.shippingFee)}</p>
                    )}
                  </div>
                </form>

                <dl className="space-y-1.5 text-xs text-stone-600">
                  <div className="flex justify-between"><dt>Subtotal</dt><dd className="font-semibold text-stone-900">{formatPrice(subtotal)}</dd></div>
                  {savings > 0 && <div className="flex justify-between text-emerald-700"><dt>Aapki bachat (MRP se)</dt><dd className="font-semibold">−{formatPrice(savings)}</dd></div>}
                  <div className="flex justify-between">
                    <dt>Shipping</dt>
                    <dd>{amountLeftForFreeShipping === 0 ? <span className="font-semibold text-emerald-700">FREE</span> : shippingKnown ? formatPrice(shipping) : `${SHIPPING_FEE_LABEL} (pincode par)`}</dd>
                  </div>
                  <div className="flex justify-between border-t border-stone-200 pt-2 text-sm font-bold text-stone-900">
                    <dt>Estimated total</dt>
                    <dd className="text-base text-[#881337]">{shippingKnown ? formatPrice(subtotal + shipping) : `${formatPrice(subtotal + 79)}–${formatPrice(subtotal + SHIPPING_FEE_FAR)}`}</dd>
                  </div>
                  <p className="text-center text-[11px] leading-relaxed text-stone-400">Tax included hai. Coupon checkout par lagega; final shipping pincode se confirm hogi.</p>
                </dl>

                {unavailableItems.length > 0 && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-[11.5px] leading-relaxed text-rose-800">Kuch items ab uplabdh nahi hain — checkout se pehle unhe hataye ya quantity ghata de.</p>}
                {hasLocalOnlyItems && <p className="rounded-xl bg-amber-50 px-3 py-2 text-[11.5px] leading-relaxed text-amber-800">Kuch items abhi online order ke liye ready nahi hain; checkout par final jaanch hogi.</p>}

                <button type="button" disabled={checkoutBlocked} onClick={() => { setIsCartOpen(false); router.push("/checkout"); }} className="group flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#881337] py-3.5 text-xs font-bold uppercase tracking-[0.2em] text-white shadow-md transition hover:bg-[#6b0f2b] disabled:cursor-not-allowed disabled:opacity-50">
                  <span>{isSyncing ? "Bag update ho raha hai…" : "Proceed to checkout"}</span><span aria-hidden="true" className="transition-transform group-hover:translate-x-1">→</span>
                </button>
                <button type="button" onClick={() => setIsCartOpen(false)} className="min-h-10 w-full text-center text-xs font-semibold text-stone-600 underline-offset-2 hover:text-[#881337] hover:underline">Shopping jaari rakhe</button>

                <div className="flex flex-col items-center gap-1.5 border-t border-stone-100 pt-2 text-center">
                  <p className="text-[10.5px] font-medium text-stone-500">🔒 100% Secure &amp; Encrypted Checkout</p>
                  <div className="flex items-center gap-1.5 opacity-80" aria-label="Accepted payments: UPI, GPay, PhonePe, cards and Cash on Delivery">
                    {["UPI", "GPay", "PhonePe", "Cards", "COD"].map((label) => <span key={label} className="rounded border border-stone-200 bg-stone-100 px-1.5 py-0.5 text-[9px] font-black text-stone-700">{label}</span>)}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
