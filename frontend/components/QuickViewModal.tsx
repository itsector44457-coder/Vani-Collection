"use client";

import { useCart } from "../context/CartContext";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

export default function QuickViewModal() {
  const { quickViewProduct, setQuickViewProduct, addToCart, toggleWishlist, isInWishlist } = useCart();
  const [selectedSize, setSelectedSize] = useState<string>("M");
  const [activeImgIndex, setActiveImgIndex] = useState<number>(0);
  const [addedNotice, setAddedNotice] = useState(false);

  if (!quickViewProduct) return null;

  const images = [quickViewProduct.image, quickViewProduct.hoverImage].filter(Boolean);
  const isWish = isInWishlist(quickViewProduct.id);

  const handleAdd = () => {
    addToCart(quickViewProduct, selectedSize, 1);
    setAddedNotice(true);
    setTimeout(() => {
      setAddedNotice(false);
      setQuickViewProduct(null);
    }, 800);
  };

  const whatsappMessage = encodeURIComponent(
    `Hello Vani Collection Atelier! I am interested in: "${quickViewProduct.title}" (Price: ₹${quickViewProduct.price}). Could you please share more details?`
  );

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6 md:p-10">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setQuickViewProduct(null)}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ duration: 0.3 }}
          className="relative w-full max-w-4xl bg-[#faf7f2] rounded-xl overflow-y-auto md:overflow-hidden shadow-2xl z-[111] max-h-[90vh] flex flex-col md:flex-row border border-[#e8dfd5]"
        >
          {/* Close button */}
          <button
            onClick={() => setQuickViewProduct(null)}
            className="absolute top-3 right-3 z-30 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-stone-700 flex items-center justify-center transition shadow-md"
          >
            ✕
          </button>

          {/* Left: Gallery */}
          <div className="w-full md:w-1/2 bg-stone-100 p-4 md:p-6 flex flex-col justify-between shrink-0">
            <div className="relative aspect-[4/5] sm:aspect-[3/4] max-h-[320px] md:max-h-none w-full rounded-lg overflow-hidden bg-white shadow-sm border border-stone-200 mx-auto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={images[activeImgIndex]}
                alt={quickViewProduct.title}
                className="w-full h-full object-cover object-top transition-all duration-300"
              />
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
                    onClick={() => setActiveImgIndex(idx)}
                    className={`w-12 h-14 sm:w-14 sm:h-16 rounded overflow-hidden border-2 transition ${
                      activeImgIndex === idx ? "border-[#881337]" : "border-transparent opacity-60"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img} alt="thumb" className="w-full h-full object-cover" />
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
                <span className="text-stone-400">SKU: VC-{quickViewProduct.id}</span>
              </div>

              {/* Title */}
              <h2 className="font-serif text-2xl md:text-3xl text-stone-900 leading-tight mb-2">
                {quickViewProduct.title}
              </h2>

              {/* Ratings */}
              <div className="flex items-center gap-2 mb-4">
                <div className="flex text-amber-500 text-sm">
                  {"★".repeat(Math.floor(quickViewProduct.rating))}
                  {"☆".repeat(5 - Math.floor(quickViewProduct.rating))}
                </div>
                <span className="text-xs text-stone-600 font-medium">
                  {quickViewProduct.rating} ({quickViewProduct.reviewsCount} verified reviews)
                </span>
              </div>

              {/* Price */}
              <div className="flex items-baseline gap-3 mb-5 pb-4 border-b border-stone-200">
                <span className="text-2xl font-bold text-[#881337]">
                  ₹{quickViewProduct.price}
                </span>
                {quickViewProduct.originalPrice > quickViewProduct.price && (
                  <>
                    <span className="text-sm text-stone-400 line-through">
                      ₹{quickViewProduct.originalPrice}
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
                  <strong>Fabric:</strong> {quickViewProduct.fabric} (Breathable 100-Count Mul)
                </span>
              </div>

              {/* Size Selector */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-semibold text-stone-800 uppercase tracking-wider">
                    Select Size
                  </span>
                  <button
                    onClick={() => alert("Size Chart: XS (34) | S (36) | M (38) | L (40) | XL (42) | XXL (44)")}
                    className="text-[11px] text-[#881337] underline hover:text-stone-900"
                  >
                    Size Guide
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {quickViewProduct.sizes.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSelectedSize(s)}
                      className={`px-4 py-2 text-xs rounded border transition font-medium ${
                        selectedSize === s
                          ? "bg-[#1c1917] text-white border-[#1c1917]"
                          : "bg-white text-stone-800 border-stone-300 hover:border-stone-500"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
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
                  onClick={handleAdd}
                  className="flex-1 bg-[#881337] hover:bg-[#6b0f2b] text-white py-3.5 rounded-full text-xs uppercase tracking-[0.2em] font-semibold transition shadow-md flex items-center justify-center gap-2"
                >
                  {addedNotice ? "✓ Added to Bag!" : "Add to Bag"}
                </button>
                <button
                  onClick={() => toggleWishlist(quickViewProduct.id)}
                  className={`w-12 h-12 rounded-full border flex items-center justify-center transition ${
                    isWish
                      ? "border-rose-400 bg-rose-50 text-rose-600"
                      : "border-stone-300 bg-white text-stone-600 hover:border-stone-500"
                  }`}
                  aria-label="Wishlist"
                >
                  {isWish ? "♥" : "♡"}
                </button>
              </div>

              {/* WhatsApp Quick Order */}
              <a
                href={`https://wa.me/?text=${whatsappMessage}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#128C7E] border border-[#25D366]/30 py-2.5 rounded-full text-xs font-semibold transition flex items-center justify-center gap-2"
              >
                <span>💬 Order / Ask Size via WhatsApp</span>
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
