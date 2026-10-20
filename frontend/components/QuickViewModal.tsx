"use client";

import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { productHref } from "../lib/utils";
import { useScrollLock } from "./SmoothScroll";
import { storeWhatsAppUrl } from "../lib/site-contact";
import { useModalDialog } from "../lib/use-modal-dialog";
import type { Product } from "../lib/storefront-types";

const sizeKnownOutOfStock = (product: Product, size: string): boolean => {
  const variants = (product.variants ?? []).filter((variant) => variant.size === size);
  return variants.length > 0 && variants.every((variant) => variant.available !== undefined && variant.available <= 0);
};

export default function QuickViewModal() {
  const { quickViewProduct, setQuickViewProduct, addToCart, toggleWishlist, isInWishlist } = useCart();
  useScrollLock(Boolean(quickViewProduct));
  const { user } = useAuth();
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [activeImgIndex, setActiveImgIndex] = useState<number>(0);
  const [addedNotice, setAddedNotice] = useState(false);
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const [sizeError, setSizeError] = useState("");
  const [selectedForProductId, setSelectedForProductId] = useState<string | null>(null);
  const closeTimerRef = useRef<number | null>(null);

  const closeQuickView = useCallback(() => {
    if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
    setQuickViewProduct(null);
  }, [setQuickViewProduct]);
  const dialogRef = useModalDialog<HTMLDivElement>(Boolean(quickViewProduct), closeQuickView);

  useEffect(() => () => {
    if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
  }, []);

  if (quickViewProduct && selectedForProductId !== quickViewProduct.id) {
    setSelectedForProductId(quickViewProduct.id);
    const preferredSize = user?.preferences?.preferredSize ?? "";
    const preferredAvailable = preferredSize
      && quickViewProduct.sizes.includes(preferredSize)
      && !sizeKnownOutOfStock(quickViewProduct, preferredSize);
    const onlySize = quickViewProduct.sizes.length === 1 ? quickViewProduct.sizes[0] : "";
    setSelectedSize(preferredAvailable ? preferredSize : onlySize && !sizeKnownOutOfStock(quickViewProduct, onlySize) ? onlySize : "");
    setActiveImgIndex(0);
    setAddedNotice(false);
    setShowSizeGuide(false);
    setSizeError("");
  }

  if (!quickViewProduct) return null;

  const images = [quickViewProduct.image, quickViewProduct.hoverImage].filter(Boolean);
  const isWish = isInWishlist(quickViewProduct.id);

  const activeSize = quickViewProduct.sizes.includes(selectedSize) ? selectedSize : "";
  const activeVariant = (quickViewProduct.variants ?? []).find((variant) => !activeSize || variant.size === activeSize);
  const hasAvailableSize = quickViewProduct.sizes.length === 0
    || quickViewProduct.sizes.some((size) => !sizeKnownOutOfStock(quickViewProduct, size));

  const handleAdd = async () => {
    if (quickViewProduct.sizes.length > 0 && !activeSize) {
      setSizeError("Pehle apna size chune.");
      dialogRef.current?.querySelector<HTMLButtonElement>("[data-quickview-size]:not([disabled])")?.focus();
      return;
    }
    if (activeSize && sizeKnownOutOfStock(quickViewProduct, activeSize)) {
      setSizeError("Yeh size abhi uplabdh nahi hai — koi aur size chune.");
      return;
    }
    setSizeError("");
    const added = await addToCart(quickViewProduct, activeSize, 1);
    if (!added) {
      setSizeError("Yeh piece bag me nahi jud paya. Cart me dikhi jaankari jaanche.");
      return;
    }
    setAddedNotice(true);
    if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = window.setTimeout(() => {
      setAddedNotice(false);
      closeQuickView();
    }, 800);
  };

  const whatsappMessage = `Hello Vani Collection Atelier! I am interested in: "${quickViewProduct.title}" (Price: ₹${quickViewProduct.price}). Could you please share more details?`;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6 md:p-10">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeQuickView}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          ref={dialogRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-labelledby="quick-view-title"
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ duration: 0.3 }}
          className="relative w-full max-w-4xl bg-[#faf7f2] rounded-xl overflow-y-auto md:overflow-hidden shadow-2xl z-[111] max-h-[90vh] flex flex-col md:flex-row border border-[#e8dfd5]"
        >
          {/* Close button */}
          <button
            onClick={closeQuickView}
            className="absolute right-3 top-3 z-30 flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-stone-700 shadow-md transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#881337]"
            aria-label="Close quick view"
          >
            ✕
          </button>

          {/* Left: Gallery */}
          <div className="w-full md:w-1/2 bg-stone-100 p-4 md:p-6 flex flex-col justify-between shrink-0">
            <div className="relative aspect-[4/5] sm:aspect-[3/4] max-h-[320px] md:max-h-none w-full rounded-lg overflow-hidden bg-white shadow-sm border border-stone-200 mx-auto">
              {images[activeImgIndex] && (
                <Image
                  src={images[activeImgIndex]}
                  alt={quickViewProduct.title}
                  fill
                  unoptimized
                  sizes="(min-width: 768px) 480px, 92vw"
                  className="object-cover object-top"
                />
              )}
              {quickViewProduct.badge && (
                <span className="absolute top-3 left-3 bg-[#881337] text-white text-[10px] uppercase font-semibold px-2.5 py-1 tracking-wider rounded">
                  {quickViewProduct.badge}
                </span>
              )}
            </div>

            {/* Thumbnail dots/selectors */}
            {images.length > 1 && (
              <div className="flex gap-2 justify-center mt-3">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveImgIndex(idx)}
                    aria-label={`Photo ${idx + 1} dekhe`}
                    aria-pressed={activeImgIndex === idx}
                    className={`relative h-14 w-12 overflow-hidden rounded border-2 transition sm:h-16 sm:w-14 ${
                      activeImgIndex === idx ? "border-[#881337]" : "border-transparent opacity-60"
                    }`}
                  >
                    <Image src={img} alt="" fill unoptimized sizes="56px" className="object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: Info & Actions */}
          <div className="w-full md:w-1/2 p-5 sm:p-6 md:p-8 flex flex-col justify-between overflow-y-auto pb-8 md:pb-6">
            <div>
              {/* Brand & Category */}
              <div className="flex items-center justify-between text-xs text-[#b8935a] uppercase tracking-widest font-semibold mb-2">
                <span>Vani Collection Atelier</span>
                <span className="text-stone-400">{activeVariant?.sku ? `SKU: ${activeVariant.sku}` : "Handcrafted in India"}</span>
              </div>

              {/* Title */}
              <h2 id="quick-view-title" className="font-serif text-2xl md:text-3xl text-stone-900 leading-tight mb-2">
                {quickViewProduct.title}
              </h2>

              {/* Ratings */}
              <div className="flex items-center gap-2 mb-4">
                <div className="flex text-amber-500 text-sm" role="img" aria-label={quickViewProduct.reviewsCount > 0 ? `Rating ${quickViewProduct.rating} / 5` : "Abhi koi review nahi"}>
                  {"★".repeat(Math.max(0, Math.min(5, Math.floor(quickViewProduct.rating || 0))))}
                  {"☆".repeat(5 - Math.max(0, Math.min(5, Math.floor(quickViewProduct.rating || 0))))}
                </div>
                <span className="text-xs text-stone-600 font-medium">
                  {quickViewProduct.reviewsCount > 0 ? `${quickViewProduct.rating} (${quickViewProduct.reviewsCount} reviews)` : "Abhi koi review nahi hai"}
                </span>
              </div>

              {/* Price */}
              <div className="flex items-baseline gap-3 mb-5 pb-4 border-b border-stone-200">
                <span className="text-2xl font-bold text-[#881337]">
                  ₹{quickViewProduct.price.toLocaleString("en-IN")}
                </span>
                {quickViewProduct.originalPrice > quickViewProduct.price && (
                  <>
                    <span className="text-sm text-stone-400 line-through">
                      ₹{quickViewProduct.originalPrice.toLocaleString("en-IN")}
                    </span>
                    <span className="text-xs bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded">
                      {Math.round(
                        ((quickViewProduct.originalPrice - quickViewProduct.price) /
                          quickViewProduct.originalPrice) *
                          100
                      )}
                      % OFF
                    </span>
                  </>
                )}
              </div>

              {/* Fabric highlight */}
              <div className="bg-[#f2ece2] p-3 rounded-lg mb-5 text-xs text-stone-800 flex items-center gap-2">
                <span className="text-[#881337] text-base">✦</span>
                <span>
                  <strong>Fabric:</strong> {quickViewProduct.fabric}{/mul/i.test(quickViewProduct.fabric) ? " — halka aur saans lene wala kapda" : ""}
                </span>
              </div>

              {/* Size Selector */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-semibold text-stone-800 uppercase tracking-wider">
                    Select Size
                  </span>
                  <button
                    type="button"
                    aria-expanded={showSizeGuide}
                    onClick={() => setShowSizeGuide((open) => !open)}
                    className="inline-flex min-h-11 items-center px-2 text-[11px] font-semibold text-[#881337] underline hover:text-stone-900"
                  >
                    Size Guide
                  </button>
                </div>
                {showSizeGuide && (
                  <div className="mb-3 whitespace-pre-wrap rounded-lg bg-white p-3 text-xs leading-6 text-stone-700 ring-1 ring-stone-200">
                    {quickViewProduct.sizeGuide?.trim() || "Standard size guide: XS (34) | S (36) | M (38) | L (40) | XL (42) | XXL (44)"}
                  </div>
                )}
                <div className="flex flex-wrap gap-2" role="group" aria-label="Size chune" aria-describedby={sizeError ? "quickview-size-error" : undefined}>
                  {quickViewProduct.sizes.map((size) => {
                    const unavailable = sizeKnownOutOfStock(quickViewProduct, size);
                    return (
                      <button
                        key={size}
                        type="button"
                        data-quickview-size
                        disabled={unavailable}
                        aria-pressed={activeSize === size}
                        aria-label={unavailable ? `Size ${size}, uplabdh nahi` : `Size ${size} chune`}
                        onClick={() => {
                          setSelectedSize(size);
                          setSizeError("");
                        }}
                        className={`min-h-11 rounded border px-4 py-2 text-xs font-semibold transition ${
                          activeSize === size
                            ? "bg-[#1c1917] text-white border-[#1c1917]"
                            : unavailable
                              ? "cursor-not-allowed bg-stone-100 text-stone-400 line-through border-stone-200"
                              : "bg-white text-stone-800 border-stone-300 hover:border-stone-500"
                        }`}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
                {sizeError && <p id="quickview-size-error" role="alert" className="mt-2 text-xs font-medium text-rose-700">{sizeError}</p>}
                {!hasAvailableSize && <p className="mt-2 text-xs font-medium text-rose-700">Yeh piece abhi kisi size me uplabdh nahi hai.</p>}
              </div>

              {/* Description & Details */}
              <div className="space-y-3 mb-6 text-xs text-stone-600 leading-relaxed">
                <p>{quickViewProduct.description}</p>
                <ul className="list-disc pl-4 space-y-1 text-stone-500">
                  {quickViewProduct.details.slice(0, 3).map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* CTAs */}
            <div className="space-y-2 pt-4 border-t border-stone-200">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void handleAdd()}
                  disabled={!hasAvailableSize}
                  className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full bg-[#881337] py-3.5 text-xs font-semibold uppercase tracking-[0.2em] text-white shadow-md transition hover:bg-[#6b0f2b] disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-600"
                >
                  {addedNotice ? "✓ Added to Bag!" : hasAvailableSize ? "Add to Bag" : "Out of Stock"}
                </button>
                <button
                  type="button"
                  onClick={() => toggleWishlist(quickViewProduct.id)}
                  className={`w-12 h-12 rounded-full border flex items-center justify-center transition ${
                    isWish
                      ? "border-rose-400 bg-rose-50 text-rose-600"
                      : "border-stone-300 bg-white text-stone-600 hover:border-stone-500"
                  }`}
                  aria-label={isWish ? `${quickViewProduct.title} ko wishlist se hataye` : `${quickViewProduct.title} ko wishlist me save kare`}
                  aria-pressed={isWish}
                >
                  {isWish ? "♥" : "♡"}
                </button>
              </div>

              {/* WhatsApp Quick Order */}
              <a
                href={storeWhatsAppUrl(whatsappMessage)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-[#25D366]/30 bg-[#25D366]/10 py-2.5 text-xs font-semibold text-[#128C7E] transition hover:bg-[#25D366]/20"
              >
                <span>💬 Order / Ask Size via WhatsApp</span>
              </a>

              {/* View Full Details Button */}
              <Link
                href={productHref(quickViewProduct)}
                className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-stone-300 bg-white py-2.5 text-xs font-semibold text-stone-800 transition hover:border-[#881337] hover:bg-stone-50 hover:text-[#881337]"
                onClick={closeQuickView} // Close modal when navigating
              >
                <span>👁️ View Full Details</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
