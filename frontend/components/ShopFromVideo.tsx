"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { useModalDialog } from "../lib/use-modal-dialog";
import type { PublishedReel } from "../lib/content";
import { STORE_PHONE_DISPLAY, storeWhatsAppUrl } from "../lib/site-contact";

/* ------------------------------------------------------------------ */
/*  Muted looping previews play only while their card is in view.       */
/* ------------------------------------------------------------------ */
function VideoCard({
  reel,
  onOpen,
  hasMovedRef,
}: {
  reel: PublishedReel;
  onOpen: () => void;
  hasMovedRef: React.RefObject<boolean>;
}) {
  const image = reel.thumbnailUrl || reel.productId?.images?.[0]?.url || "";
  const prices = (reel.productId?.variants ?? []).filter((variant) => variant.active !== false).map((variant) => variant.price).filter((value) => Number.isFinite(value) && value > 0);
  const price = prices.length ? Math.min(...prices) : null;
  const formattedPrice = price ? `${prices.length > 1 && Math.max(...prices) !== price ? "₹" : "₹"}${price.toLocaleString("en-IN")}${prices.length > 1 && Math.max(...prices) !== price ? " se shuru" : ""}` : "Price product page par dekhe";
  const previewFrameRef = useRef<HTMLDivElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const [previewInView, setPreviewInView] = useState(false);
  const [failedPreviewUrl, setFailedPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    const frame = previewFrameRef.current;
    if (!frame) return;

    if (typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(([entry]) => {
      setPreviewInView(Boolean(entry?.isIntersecting && entry.intersectionRatio >= 0.35));
    }, { rootMargin: "0px 40px", threshold: [0, 0.35, 0.6] });
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const video = previewVideoRef.current;
    if (!video) return;

    const syncPlayback = () => {
      if (previewInView && document.visibilityState === "visible") {
        void video.play().catch(() => {
          // If autoplay is blocked, the poster remains visible and the full player is still clickable.
        });
      } else {
        video.pause();
      }
    };

    syncPlayback();
    document.addEventListener("visibilitychange", syncPlayback);
    return () => {
      document.removeEventListener("visibilitychange", syncPlayback);
      video.pause();
    };
  }, [previewInView, reel.videoUrl]);

  return (
    <div
      onClick={() => {
        if (hasMovedRef.current) return;
        onOpen();
      }}
      className="shop-video-card group relative flex shrink-0 snap-start cursor-pointer flex-col overflow-hidden rounded-xl border border-stone-200/90 bg-white shadow-sm transition-shadow duration-300 hover:shadow-xl sm:rounded-2xl"
    >
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          if (!hasMovedRef.current) onOpen();
        }}
        aria-label={`${reel.title || reel.productId?.name || "Video look"} dekhe`}
        className="absolute inset-0 z-20 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#881337] sm:rounded-2xl"
      />

      {/* Muted looping previews start only while the card is in view; the poster remains the fallback. */}
      <div ref={previewFrameRef} className="relative aspect-[9/15] w-full overflow-hidden bg-stone-900">
        {previewInView && failedPreviewUrl !== reel.videoUrl ? (
          <video
            ref={previewVideoRef}
            src={reel.videoUrl}
            poster={image || undefined}
            autoPlay
            loop
            muted
            playsInline
            preload="none"
            aria-hidden="true"
            onError={() => setFailedPreviewUrl(reel.videoUrl)}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : image ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={image}
            alt={reel.title || "Video Look"}
            className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center px-3 text-center font-serif text-sm text-[#dfc28c] sm:px-5 sm:text-lg">
            {reel.title || reel.productId?.name || "Video Look"}
          </div>
        )}

        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/25" />

        <div className="pointer-events-none absolute left-2 right-2 top-2 z-10 flex items-center justify-between sm:left-3 sm:right-3 sm:top-3">
          <span className="rounded-full border border-[#dfc28c]/40 bg-black/75 px-2 py-1 text-[8px] font-bold uppercase tracking-wider text-[#dfc28c] sm:px-2.5 sm:text-[9px]">
            Muted loop preview
          </span>
          <span className="flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-black/75 text-white shadow-xs">
            <svg aria-hidden="true" width="10" height="12" viewBox="0 0 10 12" fill="currentColor">
              <path d="M1 1.2c0-.7.8-1.1 1.4-.7l6.4 4.3a1.5 1.5 0 0 1 0 2.4l-6.4 4.3A.85.85 0 0 1 1 10.8z" />
            </svg>
          </span>
        </div>

        <div className="pointer-events-none absolute inset-x-2 bottom-2 z-10 text-center text-white sm:inset-x-3 sm:bottom-3">
          <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#dfc28c] drop-shadow-sm sm:text-[10px] sm:tracking-[0.2em]">
            ORDER NOW
          </p>
          <p className="text-[9px] font-semibold tracking-wide text-white/95 drop-shadow-sm sm:text-[11px]">
            {STORE_PHONE_DISPLAY}
          </p>
        </div>
      </div>

      {/* Product details stay compact so both posters fit on a phone screen. */}
      <div className="flex min-w-0 items-center gap-2 border-t border-stone-100 bg-white p-2 sm:gap-2.5 sm:p-3.5">
        {image ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={image}
            alt={reel.productId?.name || "Product"}
            className="h-8 w-8 shrink-0 rounded-lg border border-stone-200 bg-stone-50 object-cover sm:h-10 sm:w-10"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-stone-200 bg-[#faf7f2] font-serif text-sm text-[#881337] sm:h-10 sm:w-10">VC</span>
        )}
        <div className="min-w-0 flex-1">
          <h4 className="truncate text-[10px] font-semibold leading-snug text-stone-900 transition-colors group-hover:text-[#881337] sm:text-[13px]">
            {reel.productId?.name || reel.title}
          </h4>
          <p className="mt-0.5 truncate text-[9px] font-bold text-stone-600 sm:text-[11px]">
            {formattedPrice}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Section & Interactive Modal Component (Image 1 & 2 Match)    */
/* ------------------------------------------------------------------ */
export default function ShopFromVideo({
  reels: propReels,
}: {
  reels?: PublishedReel[];
}) {
  const { addToCart } = useCart();
  const { user } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Only Admin-published videos are shown. Bundled demo clips previously invented product names,
  // prices and descriptions, then presented them as orderable stock.
  const displayReels = propReels ?? [];

  // Modal State
  const [activeReelIndex, setActiveReelIndex] = useState<number | null>(null);
  const activeReel = activeReelIndex !== null ? displayReels[activeReelIndex] : null;

  // Video playback controls inside modal
  const modalVideoRef = useRef<HTMLVideoElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showDesc, setShowDesc] = useState(true);
  const [addedToast, setAddedToast] = useState(false);
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [selectionReelId, setSelectionReelId] = useState("");
  const [selectionError, setSelectionError] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const addedTimerRef = useRef<number | null>(null);

  const closeModal = useCallback(() => setActiveReelIndex(null), []);
  const dialogRef = useModalDialog<HTMLDivElement>(activeReelIndex !== null, closeModal);

  const activeProduct = activeReel?.productId;
  const sellableVariants = (activeProduct?.variants ?? []).filter((variant) => Boolean(variant.sku) && variant.active !== false);
  const activeSizes = [...new Set(sellableVariants.map((variant) => variant.size).filter((size): size is string => Boolean(size)))];
  const preferredSize = user?.preferences?.preferredSize;
  if (activeReel && selectionReelId !== activeReel._id) {
    const initialSize = preferredSize && activeSizes.includes(preferredSize)
      ? preferredSize
      : activeSizes.length === 1
        ? activeSizes[0]
        : "";
    const initialColors = [...new Set(sellableVariants
      .filter((variant) => !initialSize || variant.size === initialSize)
      .map((variant) => variant.color)
      .filter((color): color is string => Boolean(color)))];
    setSelectionReelId(activeReel._id);
    setSelectedSize(initialSize);
    setSelectedColor(initialColors.length === 1 ? initialColors[0] : "");
    setSelectionError("");
    setAddedToast(false);
  }
  const activeColors = [...new Set(sellableVariants
    .filter((variant) => !selectedSize || variant.size === selectedSize)
    .map((variant) => variant.color)
    .filter((color): color is string => Boolean(color)))];
  const activeColor = activeColors.includes(selectedColor)
    ? selectedColor
    : activeColors.length === 1
      ? activeColors[0]
      : "";
  const selectedVariant = sellableVariants.find((variant) => (
    (!selectedSize || variant.size === selectedSize) && (!activeColor || variant.color === activeColor)
  ));
  const needsSize = activeSizes.length > 1 && !selectedSize;
  const needsColor = activeColors.length > 1 && !activeColor;
  const activePrice = selectedVariant?.price
    ?? (sellableVariants.length ? Math.min(...sellableVariants.map((variant) => variant.price)) : null);

  useEffect(() => () => {
    if (addedTimerRef.current !== null) window.clearTimeout(addedTimerRef.current);
  }, []);

  // Drag-to-scroll state for mouse input; touch keeps native scrolling and snapping.
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftStartRef = useRef(0);
  const hasMovedRef = useRef(false);
  const rafIdRef = useRef<number | null>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    const el = scrollRef.current;
    if (!el) return;
    isDraggingRef.current = true;
    hasMovedRef.current = false;
    startXRef.current = e.clientX;
    scrollLeftStartRef.current = el.scrollLeft;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const el = scrollRef.current;
    if (!el) return;
    e.preventDefault();
    const currentX = e.clientX;
    const deltaX = (currentX - startXRef.current);
    if (Math.abs(deltaX) > 4) {
      hasMovedRef.current = true;
    }
    if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    rafIdRef.current = requestAnimationFrame(() => {
      if (el) {
        el.scrollLeft = scrollLeftStartRef.current - deltaX;
      }
    });
  };

  const handleMouseUpOrLeave = () => {
    isDraggingRef.current = false;
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
  };

  // Convert mouse wheel vertical scroll into horizontal carousel scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      // If user is already scrolling horizontally (trackpad), let native scroll work
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;

      const maxScroll = el.scrollWidth - el.clientWidth;
      if (maxScroll <= 0) return;

      const atLeft = el.scrollLeft <= 5;
      const atRight = el.scrollLeft >= maxScroll - 5;

      // If scrolling down/right and not at end, or scrolling up/left and not at start:
      if ((e.deltaY > 0 && !atRight) || (e.deltaY < 0 && !atLeft)) {
        e.preventDefault();
        el.scrollLeft += e.deltaY * 1.1;
      }
      // When at edges, let normal page scrolling continue without trapping!
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const scroll = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const distance = el.clientWidth * (direction === "left" ? -0.75 : 0.75);
    el.scrollBy({ left: distance, behavior: "smooth" });
  };

  const moveReel = useCallback((direction: -1 | 1) => {
    setIsPaused(false);
    setIsMuted(true);
    setActiveReelIndex((current) => {
      if (current === null || displayReels.length === 0) return current;
      return (current + direction + displayReels.length) % displayReels.length;
    });
  }, [displayReels.length]);

  // Keyboard navigation inside modal
  useEffect(() => {
    if (activeReelIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") moveReel(-1);
      else if (e.key === "ArrowRight") moveReel(1);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeReelIndex, moveReel]);

  // Play/pause toggle inside modal
  const togglePlayPause = () => {
    const v = modalVideoRef.current;
    if (!v) return;
    if (v.paused) {
      void v.play().then(() => setIsPaused(false)).catch(() => setIsPaused(true));
    } else {
      v.pause();
      setIsPaused(true);
    }
  };

  const toggleMute = () => {
    const v = modalVideoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setIsMuted(v.muted);
  };

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeReel?.productId || isAdding) return;
    if (needsSize) {
      setSelectionError("Bag me daalne se pehle size chune.");
      dialogRef.current?.querySelector<HTMLButtonElement>("[data-video-size]:not([disabled])")?.focus();
      return;
    }
    if (needsColor) {
      setSelectionError("Bag me daalne se pehle colour chune.");
      dialogRef.current?.querySelector<HTMLButtonElement>("[data-video-color]:not([disabled])")?.focus();
      return;
    }
    if (!selectedVariant?.sku) {
      setSelectionError("Is look ka online-order variant abhi uplabdh nahi hai. Product page ya WhatsApp se jaankari le.");
      return;
    }

    const reelProduct = activeReel.productId;
    const image = reelProduct.images?.[0]?.url || activeReel.thumbnailUrl || "";
    const variants = sellableVariants.flatMap((candidate) =>
      candidate.sku
        ? [{
            sku: candidate.sku,
            size: candidate.size,
            color: candidate.color,
            price: candidate.price,
            mrp: candidate.mrp ?? candidate.price,
          }]
        : [],
    );

    setIsAdding(true);
    setSelectionError("");
    try {
      const added = await addToCart(
        {
          id: reelProduct._id,
          productId: reelProduct._id,
          slug: reelProduct.slug,
          title: reelProduct.name,
          category: reelProduct.category || "",
          fabric: reelProduct.fabric || reelProduct.craft || "",
          price: selectedVariant.price,
          originalPrice: selectedVariant.mrp ?? selectedVariant.price,
          rating: 0,
          reviewsCount: 0,
          image,
          hoverImage: reelProduct.images?.[1]?.url || image,
          sizes: activeSizes,
          description: reelProduct.shortDescription || reelProduct.description || reelProduct.name,
          details: [
            reelProduct.fabric ? `Fabric: ${reelProduct.fabric}` : "",
            reelProduct.craft ? `Craft: ${reelProduct.craft}` : "",
          ].filter((detail): detail is string => Boolean(detail)),
          variants,
        },
        selectedVariant.size || selectedSize || "Free Size",
        1,
        selectedVariant.color || activeColor || undefined,
      );
      if (!added) {
        setSelectionError("Yeh variant bag me nahi jud paya. Cart me dikhi stock jaankari jaanche.");
        return;
      }
      setAddedToast(true);
      if (addedTimerRef.current !== null) window.clearTimeout(addedTimerRef.current);
      addedTimerRef.current = window.setTimeout(() => setAddedToast(false), 2500);
    } finally {
      setIsAdding(false);
    }
  };

  if (displayReels.length === 0) {
    return (
      <section id="shop-from-video" aria-labelledby="shop-from-video-heading" className="scroll-mt-24 border-b border-[#e8dfd5] bg-[#faf7f2] px-4 py-8 sm:px-8 sm:py-16">
        <div className="mx-auto max-w-[1500px] text-center">
          <span className="text-[10px] font-bold uppercase tracking-[0.35em] text-[#881337]">Artisanal Video Looks</span>
          <h2 id="shop-from-video-heading" className="mt-2 font-serif text-xl font-normal tracking-tight text-stone-900 sm:text-3xl lg:text-4xl">
            Shop From The Video
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-stone-600">
            Our latest styling videos will appear here as they are published. Explore the collection in the meantime.
          </p>
          <Link href="/products" className="button-feedback mx-auto mt-6 flex min-h-11 w-fit items-center rounded-full bg-[#881337] px-6 py-3 text-xs font-semibold uppercase tracking-[0.15em] text-white transition hover:bg-[#701a35]">
            Browse the collection
          </Link>
        </div>
      </section>
    );
  }

  return (
    <>
      {/* ── Top Red Banner Header (As shown above "Shop From The Video" in Screenshot 1) ── */}
      <div className="bg-[#881337] text-white py-3 px-4 sm:px-8 border-b border-[#701a35]">
        <div className="max-w-[1500px] mx-auto flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="font-serif text-sm sm:text-base font-semibold tracking-wide text-white">
              New Collection
            </h3>
            <p className="text-[11px] text-white/80 font-light hidden sm:block">
              Discover the Latest Trends &amp; Handcrafted Styles from Guna Atelier
            </p>
          </div>
          <Link
            href="/products"
            className="inline-flex min-h-11 items-center rounded-full border border-white/30 bg-white/10 px-5 py-2 text-[11px] font-bold uppercase tracking-widest text-white transition-all duration-300 hover:bg-white hover:text-[#881337]"
          >
            Shop Collection
          </Link>
        </div>
      </div>

      {/* ── Main Section: Shop From The Video ── */}
      <section id="shop-from-video" aria-labelledby="shop-from-video-heading" className="scroll-mt-24 relative overflow-hidden border-b border-[#e8dfd5] bg-[#faf7f2] py-8 sm:py-16">
        <div className="max-w-[1500px] mx-auto px-4 sm:px-8 lg:px-12">
          {/* Section Header */}
          <div className="mb-5 flex items-center justify-between sm:mb-10">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-[0.35em] text-[#881337] block mb-1">
                Artisanal Video Looks
              </span>
              <h2 id="shop-from-video-heading" className="font-serif text-xl font-normal tracking-tight text-stone-900 sm:text-3xl lg:text-4xl">
                Shop From The Video
              </h2>
            </div>


            {/* Header Controls: Buttons & Hint */}
            <div className="flex items-center gap-2.5">

              <button
                type="button"
                onClick={() => scroll("left")}
                aria-label="Scroll left"
                className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-stone-300 bg-white text-stone-700 shadow-xs transition hover:border-[#881337] hover:bg-[#881337] hover:text-white sm:h-11 sm:w-11"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => scroll("right")}
                aria-label="Scroll right"
                className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-stone-300 bg-white text-stone-700 shadow-xs transition hover:border-[#881337] hover:bg-[#881337] hover:text-white sm:h-11 sm:w-11"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>
          </div>

          {/* Horizontal Track (Supports Mouse Wheel, Click & Drag, Touch Swipe) */}
          <div
            ref={scrollRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUpOrLeave}
            onMouseLeave={handleMouseUpOrLeave}
            style={{
              WebkitOverflowScrolling: "touch",
            }}
            className="shop-video-track flex snap-x snap-proximity gap-3 overflow-x-auto overscroll-x-contain scrollbar-none py-1 -mx-4 px-4 select-none sm:gap-6 sm:py-2 sm:-mx-8 sm:px-8 lg:-mx-12 lg:px-12 cursor-grab active:cursor-grabbing"
          >
            {displayReels.map((reel, index) => (
              <VideoCard
                key={reel._id || `reel-${index}`}
                reel={reel}
                hasMovedRef={hasMovedRef}
                onOpen={() => {
                  setActiveReelIndex(index);
                  setIsPaused(false);
                  setIsMuted(true);
                }}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── MODAL: Fullscreen Interactive Shop From The Video (Exact Match of Screenshot 2) ── */}
      {activeReel && activeReelIndex !== null && (
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="shop-video-title"
          tabIndex={-1}
          className="fixed inset-0 z-[100] flex animate-fadeIn flex-col items-center justify-between overflow-hidden bg-black/95 p-3 backdrop-blur-md focus:outline-none sm:p-5 md:p-6"
          onClick={closeModal}
        >
          {/* Top Header Bar */}
          <div
            className="w-full max-w-5xl flex items-center justify-between text-white py-2 px-2 shrink-0 z-30"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top-Left: Counter (e.g. 6 / 9) */}
            <div className="text-xs sm:text-sm font-semibold tracking-widest text-white/90 bg-white/10 px-3 py-1 rounded-full backdrop-blur-sm">
              {activeReelIndex + 1} / {displayReels.length}
            </div>

            {/* Top-Center: Brand Logo */}
            <h3 id="shop-video-title" className="font-serif text-base font-normal uppercase tracking-widest text-[#dfc28c] sm:text-xl">
              VANI COLLECTION
            </h3>

            {/* Top-Right: Close Button (X) */}
            <button
              type="button"
              onClick={closeModal}
              aria-label="Video player band kare"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-all duration-200 hover:bg-white hover:text-black"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="6" />
              </svg>
            </button>
          </div>

          {/* Floating Left Navigation Chevron */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              moveReel(-1);
            }}
            aria-label="Previous reel"
            className="hidden md:flex absolute left-4 lg:left-8 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/30 text-white items-center justify-center backdrop-blur-md transition-all z-20"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          {/* Floating Right Navigation Chevron */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              moveReel(1);
            }}
            aria-label="Next reel"
            className="hidden md:flex absolute right-4 lg:right-8 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/30 text-white items-center justify-center backdrop-blur-md transition-all z-20"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>

          {/* Split Content Modal (Left Video, Right Product Details) */}
          <div
            className="w-full max-w-4xl flex-1 flex flex-col md:flex-row items-center justify-center gap-4 sm:gap-6 bg-transparent z-10 min-h-0 my-auto overflow-y-auto md:overflow-visible"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ── Left Column: Reel Video Player ── */}
            <div className="relative w-full max-w-[300px] sm:max-w-[340px] md:max-w-[360px] h-[480px] sm:h-[540px] md:h-[580px] max-h-[72vh] md:max-h-[78vh] rounded-2xl overflow-hidden bg-black shadow-2xl border border-white/15 shrink-0">
              <video
                ref={modalVideoRef}
                key={`${activeReel._id}:${activeReel.videoUrl}`}
                src={activeReel.videoUrl}
                poster={activeReel.thumbnailUrl || activeReel.productId?.images?.[0]?.url}
                autoPlay
                loop
                muted={isMuted}
                playsInline
                className="w-full h-full object-cover"
              />

              {/* Video Bottom Shadow */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none" />

              {/* Order Banner on Video (Screenshot 2 Match) */}
              <div className="absolute bottom-16 inset-x-4 text-center text-white pointer-events-none">
                <p className="text-xs font-bold tracking-[0.25em] uppercase text-[#dfc28c]">
                  ORDER NOW:-
                </p>
                <p className="mt-0.5 text-xs font-semibold text-white">
                  {STORE_PHONE_DISPLAY}
                </p>
              </div>

              {/* Floating Bottom Video Controls (Pause / Play & Mute / Unmute) */}
              <div className="absolute bottom-3 right-3 flex items-center gap-2 z-20">
                <button
                  type="button"
                  onClick={togglePlayPause}
                  aria-label={isPaused ? "Video play kare" : "Video roke"}
                  aria-pressed={isPaused}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white backdrop-blur-md transition hover:bg-black/90"
                >
                  {isPaused ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <rect x="6" y="4" width="4" height="16" />
                      <rect x="14" y="4" width="4" height="16" />
                    </svg>
                  )}
                </button>
                <button
                  type="button"
                  onClick={toggleMute}
                  aria-label={isMuted ? "Audio unmute kare" : "Audio mute kare"}
                  aria-pressed={!isMuted}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white backdrop-blur-md transition hover:bg-black/90"
                >
                  {isMuted ? "🔇" : "🔊"}
                </button>
              </div>
            </div>

            {/* ── Right Column: Product Shop Card (Exact Screenshot 2 Match) ── */}
            <div className="w-full max-w-[380px] bg-white rounded-2xl p-5 sm:p-6 shadow-2xl border border-stone-200 text-stone-900 flex flex-col h-[480px] sm:h-[540px] md:h-[580px] max-h-[72vh] md:max-h-[78vh] overflow-y-auto">
              {/* Product Header Row */}
              <div className="flex items-start gap-3.5 pb-4 border-b border-stone-100">
                {activeReel.productId?.images?.[0]?.url || activeReel.thumbnailUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={activeReel.productId?.images?.[0]?.url || activeReel.thumbnailUrl}
                    alt={activeReel.productId?.name || "Product"}
                    className="h-20 w-16 shrink-0 rounded-xl border border-stone-200 bg-stone-50 object-cover shadow-xs"
                  />
                ) : (
                  <span aria-hidden="true" className="flex h-20 w-16 shrink-0 items-center justify-center rounded-xl border border-stone-200 bg-[#faf7f2] font-serif text-[#881337]">VC</span>
                )}
                <div className="min-w-0 flex-1">
                  <h4 className="font-serif text-sm sm:text-base font-bold uppercase leading-snug text-stone-900">
                    {activeReel.productId?.name || activeReel.title}
                  </h4>
                  <p className="mt-1 text-sm font-semibold text-stone-600" aria-live="polite">
                    {activePrice ? `₹${activePrice.toLocaleString("en-IN")}${selectedVariant ? "" : " se shuru"}` : "Price product page par dekhe"}
                  </p>
                </div>
              </div>

              {(activeSizes.length > 0 || activeColors.length > 0) && (
                <div className="space-y-4 border-b border-stone-100 py-4">
                  {activeSizes.length > 0 && (
                    <fieldset>
                      <legend className="text-xs font-bold uppercase tracking-wider text-stone-700">Size chune</legend>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {activeSizes.map((size) => (
                          <button
                            key={size}
                            type="button"
                            data-video-size
                            onClick={() => {
                              setSelectedSize(size);
                              setSelectionError("");
                            }}
                            aria-pressed={selectedSize === size}
                            aria-label={`Size ${size} chune`}
                            className={`min-h-11 min-w-11 rounded-full border px-3 py-2 text-sm font-semibold transition ${selectedSize === size ? "border-[#881337] bg-[#881337] text-white" : "border-stone-300 bg-white text-stone-700 hover:border-[#881337]"}`}
                          >
                            {size}
                          </button>
                        ))}
                      </div>
                    </fieldset>
                  )}
                  {activeColors.length > 1 && (
                    <fieldset>
                      <legend className="text-xs font-bold uppercase tracking-wider text-stone-700">Colour chune</legend>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {activeColors.map((color) => (
                          <button
                            key={color}
                            type="button"
                            data-video-color
                            onClick={() => {
                              setSelectedColor(color);
                              setSelectionError("");
                            }}
                            aria-pressed={activeColor === color}
                            aria-label={`${color} colour chune`}
                            className={`min-h-11 rounded-full border px-3 py-2 text-sm font-semibold transition ${activeColor === color ? "border-[#881337] bg-[#881337] text-white" : "border-stone-300 bg-white text-stone-700 hover:border-[#881337]"}`}
                          >
                            {color}
                          </button>
                        ))}
                      </div>
                    </fieldset>
                  )}
                  {sellableVariants.length === 0 && (
                    <p className="text-xs leading-relaxed text-amber-700">Is look ke liye online bag uplabdh nahi hai; product page ya WhatsApp se order jaankari le.</p>
                  )}
                </div>
              )}

              {/* Action Buttons: Add to Cart / Order & Info */}
              <div className="py-4 space-y-2.5">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(event) => void handleAddToCart(event)}
                    disabled={isAdding || sellableVariants.length === 0}
                    aria-label={selectedVariant ? `${activeProduct?.name || "Product"}, size ${selectedVariant.size || "Free Size"}, bag me daale` : "Size chunne ke baad bag me daale"}
                    className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-[#615f5d] px-4 py-3 text-xs font-semibold uppercase tracking-wider text-white shadow-sm transition-colors hover:bg-[#881337] disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-600"
                  >
                    <span>{isAdding ? "Adding…" : sellableVariants.length === 0 ? "Online uplabdh nahi" : needsSize ? "Size chune" : needsColor ? "Colour chune" : "Add to Bag"}</span>
                  </button>
                  {activeReel.productId?.slug && (
                    <Link
                      href={`/product/${activeReel.productId.slug}`}
                      aria-label={`${activeProduct?.name || "Product"} ka page khole`}
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-stone-300 text-stone-700 transition hover:border-stone-400"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="16" x2="12" y2="12" />
                        <line x1="12" y1="8" x2="12.01" y2="8" />
                      </svg>
                    </Link>
                  )}
                </div>

                {/* Direct WhatsApp Order Button */}
                <a
                  href={storeWhatsAppUrl(
                    `Hello Vani Collection, I am interested in ordering "${activeReel.productId?.name || activeReel.title}" which I saw in your video look.`
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-3 text-xs font-semibold tracking-wider text-white transition hover:bg-[#1fa752]"
                >
                  <span>💬 Order Directly via WhatsApp</span>
                </a>

                {selectionError && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-center text-xs leading-relaxed text-rose-700">{selectionError}</p>}

                {/* Toast Notification */}
                {addedToast && (
                  <div role="status" className="animate-fadeIn rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 text-center text-xs text-emerald-800">
                    ✓ Added to your shopping bag!
                  </div>
                )}
              </div>

              {/* Description Accordion (Screenshot 2 Match) */}
              <div className="border-t border-stone-200 pt-3">
                <button
                  type="button"
                  onClick={() => setShowDesc(!showDesc)}
                  aria-expanded={showDesc}
                  aria-controls="shop-video-description"
                  className="flex min-h-12 w-full items-center justify-between py-2 text-left text-sm font-semibold text-stone-900"
                >
                  <span>Description</span>
                  <span aria-hidden="true" className="text-base font-bold">{showDesc ? "—" : "+"}</span>
                </button>

                {showDesc && (
                  <div id="shop-video-description" className="mt-3 space-y-2 border-t border-stone-100 pt-3 text-xs leading-relaxed text-stone-600">
                    <p className="font-semibold text-stone-800 uppercase text-[11px]">
                      {activeReel.productId?.name || activeReel.title}
                    </p>
                    <p className="whitespace-pre-line">
                      {activeReel.description || activeReel.productId?.description || activeReel.productId?.shortDescription || "Is look ki poori fabric, size aur delivery jaankari product page par uplabdh hai."}
                    </p>

                    {activeReel.productId?.slug && (
                      <div className="pt-2">
                        <Link
                          href={`/product/${activeReel.productId.slug}`}
                          className="inline-flex min-h-11 items-center text-xs font-bold text-[#881337] hover:underline"
                        >
                          View Full Product Details &amp; Size Guide →
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
