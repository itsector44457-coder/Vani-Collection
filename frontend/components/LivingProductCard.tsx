"use client";

import React, { useRef, useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Product } from "../context/CartContext";
import { generateProductSlug } from "../lib/utils";

interface LivingProductCardProps {
  product: Product;
  isWish: boolean;
  toggleWishlist: (id: string) => void;
  onQuickView: (product: Product) => void;
  onAddToCart: (product: Product, size: string, quantity: number) => void;
  selectedSize: string;
  onSelectSize: (productId: string, size: string) => void;
}

export default function LivingProductCard({
  product,
  isWish,
  toggleWishlist,
  onQuickView,
  onAddToCart,
  selectedSize,
  onSelectSize,
}: LivingProductCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [shouldLoadVideo, setShouldLoadVideo] = useState(false);
  const [addedAnimation, setAddedAnimation] = useState(false);

  // Fallback video if product has none
  const videoSrc =
    product.videoUrl ||
    "https://videos.pexels.com/video-files/8534828/8534828-hd_1920_1080_25fps.mp4";

  // Product motion is desktop-only and opt-in on hover. Avoiding viewport
  // autoplay saves substantial bandwidth and battery on mobile devices.
  useEffect(() => {
    const checkMobile = () => {
      const mobileQuery =
        window.innerWidth < 768 || window.matchMedia("(hover: none)").matches;
      setIsMobile(mobileQuery);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile, { passive: true });
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Desktop Hover Handlers
  const handleMouseEnter = () => {
    if (isMobile) return;
    setShouldLoadVideo(true);
    // Wait for the opt-in video element to mount before playback.
    requestAnimationFrame(() => {
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current
          .play()
          .then(() => setIsPlaying(true))
          .catch(() => {});
      }
    });
  };

  const handleMouseLeave = () => {
    if (isMobile) return;
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  };

  const handleAdd = () => {
    onAddToCart(product, selectedSize, 1);
    setAddedAnimation(true);
    setTimeout(() => setAddedAnimation(false), 1200);
  };

  const showVideo = isPlaying;

  return (
    <div
      ref={cardRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="group relative flex flex-col bg-[#faf7f2] rounded-xl overflow-hidden border border-[#e8dfd5] transition-all duration-300 hover:shadow-2xl hover:-translate-y-1.5"
    >
      {/* Media Container: Photo + Boomerang Living Video */}
      <div
        onClick={() => onQuickView(product)}
        className="relative aspect-[3/4] w-full overflow-hidden bg-stone-100 cursor-pointer"
      >
        {/* Still Photo (Primary) */}
        <Image
          src={product.image}
          alt={product.title}
          fill
          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
          className={`object-cover object-top transition-opacity duration-700 ease-in-out ${
            showVideo ? "opacity-0" : "opacity-100"
          }`}
        />

        {/* Motion preview is created only after a desktop hover. */}
        {shouldLoadVideo && (
          <video
            ref={videoRef}
            src={videoSrc}
            loop
            muted
            playsInline
            preload="none"
            className={`absolute inset-0 w-full h-full object-cover object-top transition-all duration-700 ease-out pointer-events-none ${
              showVideo
                ? "opacity-100 scale-105"
                : "opacity-0 scale-100"
            }`}
          />
        )}

        {/* Live Motion Status Pill (visible when video plays) */}
        {showVideo && (
          <div className="absolute bottom-2.5 left-2.5 z-10 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white text-[9px] font-medium tracking-wider uppercase animate-fade-in pointer-events-none">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Living View</span>
          </div>
        )}

        {/* Badge */}
        {product.badge && (
          <span className="absolute top-2 sm:top-3 left-2 sm:left-3 z-10 bg-[#881337] text-white text-[8px] sm:text-[9px] uppercase font-bold tracking-widest px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded shadow-xs">
            {product.badge}
          </span>
        )}

        {/* Wishlist Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleWishlist(product.id);
          }}
          className={`absolute top-2 sm:top-3 right-2 sm:right-3 z-10 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/90 hover:bg-white flex items-center justify-center transition shadow-xs text-xs sm:text-sm active:scale-90 ${
            isWish ? "text-rose-600" : "text-stone-600 hover:text-rose-600"
          }`}
          aria-label={isWish ? `Remove ${product.title} from wishlist` : `Add ${product.title} to wishlist`}
          aria-pressed={isWish}
        >
          {isWish ? "♥" : "♡"}
        </button>

        {/* Quick View Button (Desktop hover overlay) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onQuickView(product);
          }}
          className="hidden sm:block absolute bottom-3 inset-x-3 z-10 bg-white/95 hover:bg-white text-stone-900 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-md transform translate-y-2 group-hover:translate-y-0 focus:opacity-100 focus:translate-y-0"
          aria-label={`Quick view ${product.title}`}
        >
          Quick View
        </button>
      </div>

      {/* Product Details */}
      <div className="p-2.5 sm:p-4 md:p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Fabric pill */}
          <span className="text-[9px] sm:text-[10px] text-[#b8935a] font-semibold uppercase tracking-wider block mb-0.5 sm:mb-1 truncate">
            {product.fabric}
          </span>

          {/* Title - Link to Product Page */}
          <Link 
            href={`/product/${generateProductSlug(product.title)}`}
            className="block"
          >
            <h3 className="font-serif text-xs sm:text-sm md:text-base font-medium text-stone-900 line-clamp-2 cursor-pointer hover:text-[#881337] transition leading-snug mb-1 sm:mb-2 min-h-[32px] sm:min-h-[40px]">
              {product.title}
            </h3>
          </Link>

          {/* Ratings */}
          <div className="flex items-center gap-1 text-[10px] sm:text-xs text-stone-500 mb-2">
            <span className="text-amber-500 font-bold">★ {product.rating}</span>
            <span className="hidden xs:inline">({product.reviewsCount})</span>
          </div>

          {/* Size Selector Chips */}
          <div className="flex flex-wrap items-center gap-1 mb-2.5 sm:mb-3">
            {product.sizes.slice(0, 4).map((size) => (
              <button
                key={size}
                onClick={() => onSelectSize(product.id, size)}
                aria-label={`Select size ${size} for ${product.title}`}
                aria-pressed={selectedSize === size}
                className={`min-h-8 min-w-8 px-2 py-1 rounded text-[11px] font-medium border transition ${
                  selectedSize === size
                    ? "bg-[#1c1917] text-white border-[#1c1917]"
                    : "bg-white text-stone-700 border-stone-300 hover:border-stone-400"
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        {/* Pricing & Add to Cart button */}
        <div className="pt-2 sm:pt-3 border-t border-stone-200/80">
          <div className="flex items-baseline justify-between mb-2 sm:mb-3">
            <div className="flex items-baseline gap-1 sm:gap-1.5">
              <span className="text-sm sm:text-base md:text-lg font-bold text-[#881337]">
                ₹{product.price}
              </span>
              {product.originalPrice > product.price && (
                <span className="text-[10px] sm:text-xs text-stone-400 line-through">
                  ₹{product.originalPrice}
                </span>
              )}
            </div>
            {product.originalPrice > product.price && (
              <span className="text-[8px] sm:text-[9.5px] font-bold text-emerald-800 bg-emerald-100 px-1 py-0.5 rounded">
                {Math.round(
                  ((product.originalPrice - product.price) /
                    product.originalPrice) *
                    100
                )}
                %
              </span>
            )}
          </div>

          <button
            onClick={handleAdd}
            className={`w-full py-2 sm:py-2.5 rounded-full text-[10px] sm:text-xs font-semibold uppercase tracking-wider transition-all duration-300 shadow-xs flex items-center justify-center gap-1 active:scale-95 ${
              addedAnimation
                ? "bg-emerald-700 text-white"
                : "bg-[#1c1917] hover:bg-[#881337] text-white"
            }`}
          >
            {addedAnimation ? (
              <span className="flex items-center gap-1">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Added to Bag
              </span>
            ) : (
              <span>+ Add to Bag</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
