"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReelsSidebar from "../../components/ReelsSidebar";
import { useCart } from "../../context/CartContext";
import { useReels } from "../../lib/use-reels";
import { formatCount, readMutedPreference, writeMutedPreference, type Reel, type ReelProduct } from "../../lib/reels-api";
import { productHref } from "../../lib/utils";
import type { Product } from "../../lib/storefront-types";

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

/** Adapts the API's product summary onto the storefront `Product` the cart expects. */
function toStoreProduct(source: ReelProduct): Product {
  const variants = (source.variants ?? []).map((variant) => ({
    sku: variant.sku,
    size: variant.size,
    color: variant.color,
    price: variant.price,
    mrp: variant.mrp,
  }));
  return {
    id: source.id,
    productId: source.id,
    slug: source.slug,
    title: source.name,
    category: source.category,
    fabric: "",
    price: source.price,
    originalPrice: source.mrp || source.price,
    rating: 0,
    reviewsCount: 0,
    image: source.image,
    hoverImage: source.image,
    sizes: source.sizes,
    description: source.name,
    details: [],
    variants: variants.length
      ? variants
      : source.sizes.map((size) => ({ sku: `${source.slug}-${size}`.toUpperCase(), size, price: source.price, mrp: source.mrp || source.price })),
  };
}

const rupees = (value: number) => `₹${Math.round(value || 0).toLocaleString("en-IN")}`;

/* ------------------------------------------------------------------ */
/*  Icons                                                             */
/* ------------------------------------------------------------------ */
const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

const HeartIcon = ({ filled, size = 20 }: { filled: boolean; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={filled ? 0 : 2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

const ShareIcon = () => (
  <svg width={19} height={19} viewBox="0 0 24 24" {...stroke}>
    <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
    <path d="m8.59 13.51 6.83 3.98M15.41 6.51 8.59 10.49" />
  </svg>
);

const BackIcon = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" {...stroke} strokeWidth={2.4}>
    <path d="M19 12H5M12 19l-7-7 7-7" />
  </svg>
);

const MutedIcon = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" {...stroke}>
    <path d="M11 5 6 9H2v6h4l5 4z" /><path d="m23 9-6 6M17 9l6 6" />
  </svg>
);

const SoundIcon = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" {...stroke}>
    <path d="M11 5 6 9H2v6h4l5 4z" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14" />
  </svg>
);

const PlayIcon = () => (
  <svg width={22} height={22} viewBox="0 0 24 24" fill="currentColor">
    <path d="M8 5.5v13l11-6.5z" />
  </svg>
);

const BagIcon = () => (
  <svg width={15} height={15} viewBox="0 0 24 24" {...stroke} strokeWidth={1.9}>
    <path d="M5.5 8h13l-1.1 11.1A2 2 0 0 1 15.4 21H8.6a2 2 0 0 1-2-1.9z" /><path d="M8.75 8V6.5a3.25 3.25 0 1 1 6.5 0V8" />
  </svg>
);

const SparkleIcon = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" {...stroke} strokeWidth={1.7}>
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" />
  </svg>
);

/* ------------------------------------------------------------------ */
/*  Reel card                                                         */
/* ------------------------------------------------------------------ */

interface ReelCardProps {
  reel: Reel;
  index: number;
  total: number;
  isActive: boolean;
  isLiked: boolean;
  muted: boolean;
  onToggleMute: () => void;
  onLike: (id: string) => boolean;
  onShare: (id: string) => void;
  onView: (id: string) => void;
  onCartAdd: (id: string) => void;
}

function ReelCard({ reel, index, total, isActive, isLiked, muted, onToggleMute, onLike, onShare, onView, onCartAdd }: ReelCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { addToCart, setIsCartOpen } = useCart();

  const [paused, setPaused] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [progress, setProgress] = useState(0);
  const [burst, setBurst] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [sizeSheet, setSizeSheet] = useState(false);
  const [busy, setBusy] = useState(false);

  const product = reel.product ? toStoreProduct(reel.product) : null;

  /*
   * Play only the reel on screen; park every other one so the feed stays light.
   * `paused`/`buffering` are driven by the media events below rather than set here, so the effect
   * only talks to the video element.
   */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (!isActive) {
      video.pause();
      return;
    }
    onView(reel._id);
    video.currentTime = 0;
    void video.play().catch(() => setPaused(true));
  }, [isActive, onView, reel._id]);

  useEffect(() => () => { if (tapTimer.current) clearTimeout(tapTimer.current); }, []);

  /* Single tap pauses, double tap likes — the timeout keeps the two apart. */
  const handleTap = useCallback(() => {
    if (tapTimer.current) {
      clearTimeout(tapTimer.current);
      tapTimer.current = null;
      if (!isLiked) onLike(reel._id);
      setBurst((value) => value + 1);
      return;
    }
    tapTimer.current = setTimeout(() => {
      tapTimer.current = null;
      const video = videoRef.current;
      if (!video) return;
      if (video.paused) void video.play().catch(() => {});
      else video.pause();
    }, 230);
  }, [isLiked, onLike, reel._id]);

  const flash = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2400);
  };

  const addSize = async (size: string) => {
    if (!product || busy) return;
    setBusy(true);
    setSizeSheet(false);
    try {
      await addToCart(product, size, 1);
      onCartAdd(reel._id);
      flash(`Added to bag · Size ${size}`);
    } catch {
      flash("Could not add to bag — please try again");
    } finally {
      setBusy(false);
    }
  };

  const handleAddToBag = () => {
    if (!product) return;
    if (product.sizes.length > 1) {
      setSizeSheet(true);
      return;
    }
    void addSize(product.sizes[0] ?? "Free Size");
  };

  const handleBuyNow = () => {
    if (!product) return;
    if (product.sizes.length > 1) {
      setSizeSheet(true);
      return;
    }
    void addSize(product.sizes[0] ?? "Free Size").then(() => setIsCartOpen(true));
  };

  const handleShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    onShare(reel._id);
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: reel.title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      flash("Link copied to clipboard");
    } catch {
      /* the shopper cancelled the share sheet */
    }
  };

  return (
    <div className="relative h-full w-full overflow-hidden bg-black select-none">
      {/* ---------------- video ---------------- */}
      <video
        ref={videoRef}
        src={reel.videoUrl}
        poster={reel.posterUrl}
        loop
        muted={muted}
        playsInline
        preload={isActive ? "auto" : "metadata"}
        onClick={handleTap}
        onPlay={() => setPaused(false)}
        onPause={() => setPaused(true)}
        onWaiting={() => setBuffering(true)}
        onPlaying={() => { setBuffering(false); setPaused(false); }}
        onTimeUpdate={(event) => {
          const video = event.currentTarget;
          if (video.duration > 0) setProgress((video.currentTime / video.duration) * 100);
        }}
        className="absolute inset-0 h-full w-full cursor-pointer object-cover"
      />

      {/* ---------------- gradients ---------------- */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-black/75 via-black/25 to-transparent" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-80 bg-gradient-to-t from-black/92 via-black/55 to-transparent" />

      {/* ---------------- top bar ---------------- */}
      <div className="absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-3 p-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="flex min-w-0 items-center gap-2">
          <Link
            href="/"
            aria-label="Back to the store"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/20 bg-black/45 text-white backdrop-blur-md transition hover:bg-black/65 lg:hidden"
          >
            <BackIcon />
          </Link>
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-white/95">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#dfc28c]" />
              Vani Reels
            </p>
            <p className="truncate text-[10.5px] text-white/55">
              {index + 1} of {total}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onToggleMute}
          aria-label={muted ? "Unmute" : "Mute"}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/20 bg-black/45 text-white backdrop-blur-md transition hover:bg-black/65"
        >
          {muted ? <MutedIcon /> : <SoundIcon />}
        </button>
      </div>

      {/* ---------------- buffering / paused ---------------- */}
      <AnimatePresence>
        {(buffering || (paused && isActive)) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-md">
              {buffering ? (
                <span className="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <PlayIcon />
              )}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---------------- double-tap heart ---------------- */}
      <AnimatePresence>
        {burst > 0 && (
          <motion.div
            key={burst}
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{ opacity: [0, 1, 0], scale: [0.4, 1.15, 1.35] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center text-[#fb7185]"
          >
            <HeartIcon filled size={104} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---------------- bottom block: copy + action rail ---------------- */}
      <div className="absolute inset-x-0 bottom-0 z-20 flex items-end gap-3 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="min-w-0 flex-1">
          {reel.tag && (
            <span className="mb-2 inline-flex items-center gap-1 rounded-full bg-[#881337]/90 px-2.5 py-1 text-[9.5px] font-bold uppercase tracking-[0.14em] text-white backdrop-blur-sm">
              <SparkleIcon />
              {reel.tag}
            </span>
          )}

          <h2 className="mb-1.5 font-serif text-[17px] font-semibold leading-snug text-white [text-shadow:0_1px_10px_rgba(0,0,0,0.75)]">
            {reel.title}
          </h2>

          {reel.caption && (
            <p className="mb-3 line-clamp-2 max-w-[36ch] text-[12.5px] leading-relaxed text-white/70">
              {reel.caption}
            </p>
          )}

          {/* linked product */}
          {product ? (
            <Link
              href={productHref({ slug: product.slug, title: product.title })}
              className="mb-3 flex items-center gap-2.5 rounded-2xl border border-white/15 bg-white/10 p-2 pr-3 backdrop-blur-md transition hover:border-white/30 hover:bg-white/15"
            >
              {product.image ? (
                // eslint-disable-next-line @next/next/no-img-element -- Cloudinary already delivers a sized, optimised asset
                <img src={product.image} alt="" className="h-11 w-11 shrink-0 rounded-xl object-cover" />
              ) : (
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white/60">
                  <BagIcon />
                </span>
              )}
              <span className="min-w-0 flex-1 text-left">
                <span className="block truncate text-[12px] font-semibold text-white">{product.title}</span>
                <span className="mt-0.5 flex items-baseline gap-1.5">
                  <span className="text-[13.5px] font-bold text-[#dfc28c]">{rupees(product.price)}</span>
                  {product.originalPrice > product.price && (
                    <span className="text-[10.5px] text-white/45 line-through">{rupees(product.originalPrice)}</span>
                  )}
                </span>
              </span>
              <span className="shrink-0 rounded-full border border-white/25 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/85">
                View
              </span>
            </Link>
          ) : (
            <p className="mb-3 text-[11.5px] text-white/45">Lookbook reel — no product linked</p>
          )}

          {/* CTAs */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleAddToBag}
              disabled={!product || busy}
              className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-full border border-white/30 bg-white/15 px-3 py-2.5 text-[11px] font-bold uppercase tracking-[0.1em] text-white backdrop-blur-md transition enabled:hover:bg-white/25 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <BagIcon />
              {busy ? "Adding…" : "Add to bag"}
            </button>
            <button
              type="button"
              onClick={handleBuyNow}
              disabled={!product || busy}
              className="min-h-11 flex-1 rounded-full bg-gradient-to-br from-[#b91c1c] to-[#881337] px-3 py-2.5 text-[11px] font-bold uppercase tracking-[0.1em] text-white shadow-[0_6px_20px_-6px_rgba(185,28,28,0.9)] transition enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Buy now
            </button>
          </div>
        </div>

        {/* action rail — sits beside the copy, never on top of it */}
        <div className="flex w-14 shrink-0 flex-col items-center gap-4 pb-1">
          <button
            type="button"
            onClick={() => onLike(reel._id)}
            aria-pressed={isLiked}
            aria-label={isLiked ? "Unlike this reel" : "Like this reel"}
            className="flex flex-col items-center gap-1.5"
          >
            <span
              className={`flex h-11 w-11 items-center justify-center rounded-full border backdrop-blur-md transition ${
                isLiked ? "border-rose-300/60 bg-rose-600/90 text-white" : "border-white/25 bg-black/45 text-white hover:bg-black/65"
              }`}
            >
              <HeartIcon filled={isLiked} />
            </span>
            <span className="text-[10px] font-semibold text-white [text-shadow:0_1px_4px_rgba(0,0,0,0.8)]">
              {formatCount(reel.likes + (isLiked && reel.likes === 0 ? 1 : 0))}
            </span>
          </button>

          <button
            type="button"
            onClick={handleShare}
            aria-label="Share this reel"
            className="flex flex-col items-center gap-1.5"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-black/45 text-white backdrop-blur-md transition hover:bg-black/65">
              <ShareIcon />
            </span>
            <span className="text-[10px] font-semibold text-white [text-shadow:0_1px_4px_rgba(0,0,0,0.8)]">
              {formatCount(reel.shares)}
            </span>
          </button>
        </div>
      </div>

      {/* ---------------- playback progress ---------------- */}
      <div aria-hidden className="absolute inset-x-0 bottom-0 z-30 h-0.5 bg-white/15">
        <div className="h-full bg-[#dfc28c] transition-[width] duration-200 ease-linear" style={{ width: `${progress}%` }} />
      </div>

      {/* ---------------- size picker ---------------- */}
      <AnimatePresence>
        {sizeSheet && product && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 flex items-end bg-black/60 backdrop-blur-sm"
            onClick={() => setSizeSheet(false)}
          >
            <motion.div
              initial={{ y: 80 }}
              animate={{ y: 0 }}
              exit={{ y: 80 }}
              transition={{ type: "spring", stiffness: 380, damping: 32 }}
              onClick={(event) => event.stopPropagation()}
              className="w-full rounded-t-3xl border-t border-white/10 bg-[#14100f] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#dfc28c]/70">Select a size</p>
              <p className="mt-1 truncate font-serif text-[15px] font-semibold text-[#f5f1ea]">{product.title}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {product.sizes.map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => void addSize(size)}
                    className="min-h-11 min-w-11 rounded-xl border border-white/15 bg-white/[0.06] px-4 text-[13px] font-semibold text-[#f5f1ea] transition hover:border-[#dfc28c] hover:bg-[#dfc28c]/10 hover:text-[#dfc28c]"
                  >
                    {size}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setSizeSheet(false)}
                className="mt-4 w-full rounded-full border border-white/15 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#f5f1ea]/70 transition hover:bg-white/5"
              >
                Cancel
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---------------- toast ---------------- */}
      <AnimatePresence>
        {toast && (
          <motion.p
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="absolute left-1/2 top-[max(4.5rem,calc(env(safe-area-inset-top)+4.5rem))] z-40 -translate-x-1/2 whitespace-nowrap rounded-full bg-emerald-600 px-4 py-2 text-[12px] font-semibold text-white shadow-lg"
          >
            {toast}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Feed states                                                       */
/* ------------------------------------------------------------------ */

function FeedSkeleton() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-[#1a1512] via-[#241c17] to-[#14100f]" />
      <div className="absolute inset-x-0 bottom-0 space-y-3 p-4 pb-8">
        <div className="h-4 w-28 rounded-full bg-white/10" />
        <div className="h-5 w-4/5 rounded-full bg-white/10" />
        <div className="h-3 w-3/5 rounded-full bg-white/[0.07]" />
        <div className="h-16 w-full rounded-2xl bg-white/[0.07]" />
        <div className="flex gap-2">
          <div className="h-11 flex-1 rounded-full bg-white/10" />
          <div className="h-11 flex-1 rounded-full bg-white/10" />
        </div>
      </div>
      <p className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-[12px] font-semibold uppercase tracking-[0.2em] text-white/35">
        Loading reels…
      </p>
    </div>
  );
}

function EmptyFeed({ message, source, onRetry }: { message: string; source: "live" | "demo"; onRetry: () => void }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-[#0a0807] px-8 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[#dfc28c]/25 bg-[#dfc28c]/10 text-[#dfc28c]">
        <svg width="26" height="26" viewBox="0 0 24 24" {...stroke} strokeWidth={1.6}>
          <rect x="3" y="3" width="18" height="18" rx="3.5" /><path d="M3 8.5h18M9 3v5.5" />
          <path d="m11 12.5 4.5 2.6-4.5 2.6z" fill="currentColor" stroke="none" />
        </svg>
      </span>
      <div>
        <h2 className="font-serif text-[19px] font-semibold text-[#f5f1ea]">No reels to show yet</h2>
        <p className="mx-auto mt-1.5 max-w-[34ch] text-[12.5px] leading-relaxed text-[#f5f1ea]/50">{message}</p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={onRetry}
          className="min-h-11 rounded-full border border-white/20 px-5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#f5f1ea]/80 transition hover:bg-white/5"
        >
          Try again
        </button>
        <Link
          href={source === "live" ? "/admin/reels" : "/products"}
          className="min-h-11 rounded-full bg-[#881337] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-[#6b0f2b]"
        >
          {source === "live" ? "Add a reel" : "Shop the collection"}
        </Link>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                              */
/* ------------------------------------------------------------------ */

export default function ReelsPage() {
  const { reels, source, loading, error, refresh, likedIds, toggleLike, registerView, registerShare, registerCartAdd } = useReels();
  const [activeIndex, setActiveIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  /*
   * Derived rather than stored, so a feed that shrinks (or has not loaded yet) can never leave the
   * active index pointing past the last reel.
   */
  const currentIndex = reels.length === 0 ? 0 : Math.min(activeIndex, reels.length - 1);

  /*
   * Restore the shopper's last sound choice — browsers only autoplay muted video, so the initial
   * render has to match the server and the preference is read once, after mount.
   */
  useEffect(() => {
    let cancelled = false;
    const restore = async () => {
      await Promise.resolve();
      if (!cancelled) setMuted(readMutedPreference());
    };
    void restore();
    return () => { cancelled = true; };
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((value) => {
      writeMutedPreference(!value);
      return !value;
    });
  }, []);

  const goTo = useCallback((index: number) => {
    const container = containerRef.current;
    if (!container) return;
    const clamped = Math.max(0, Math.min(reels.length - 1, index));
    container.scrollTo({ top: clamped * container.clientHeight, behavior: "smooth" });
    setActiveIndex(clamped);
  }, [reels.length]);

  /* Keyboard navigation, the way the desktop feed is actually used. */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (["ArrowDown", "ArrowUp", "j", "k", "m"].includes(event.key)) event.preventDefault();
      if (event.key === "ArrowDown" || event.key === "j") goTo(currentIndex + 1);
      else if (event.key === "ArrowUp" || event.key === "k") goTo(currentIndex - 1);
      else if (event.key === "m") toggleMute();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [currentIndex, goTo, toggleMute]);

  const onScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container || container.clientHeight === 0) return;
    setActiveIndex(Math.max(0, Math.min(reels.length - 1, Math.round(container.scrollTop / container.clientHeight))));
  }, [reels.length]);

  const showSkeleton = loading && reels.length === 0;
  const showEmpty = !loading && reels.length === 0;
  const feed = useMemo(() => (reels.length ? reels : []), [reels]);

  return (
    <div className="reels-stage bg-[#0a0807]">
      <ReelsSidebar />

      <main className="absolute inset-0 lg:left-[248px]">
        {/* ambient backdrop behind the phone frame on wide screens */}
        <div aria-hidden className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 opacity-[0.045] [background-image:radial-gradient(circle,#dfc28c_1px,transparent_1px)] [background-size:28px_28px]" />
          <div className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 select-none lg:block">
            <p className="whitespace-nowrap font-serif text-[46px] tracking-[0.3em] text-[#dfc28c]/[0.07]">VANI COLLECTION</p>
          </div>
        </div>

        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative h-full w-full max-w-[430px] overflow-hidden lg:h-[min(100%,880px)] lg:rounded-[28px] lg:ring-1 lg:ring-white/10 lg:shadow-[0_40px_90px_-30px_rgba(0,0,0,0.95)]">
            {showSkeleton && <FeedSkeleton />}

            {showEmpty && (
              <EmptyFeed
                source={source}
                message={error ?? "Publish a reel from the admin console and it will appear here instantly."}
                onRetry={refresh}
              />
            )}

            {feed.length > 0 && (
              <>
                <div ref={containerRef} onScroll={onScroll} className="reels-scroll-container absolute inset-0 overflow-x-hidden overflow-y-scroll">
                  {feed.map((reel, index) => (
                    <div key={reel._id} className="reels-slot">
                      <ReelCard
                        reel={reel}
                        index={index}
                        total={feed.length}
                        isActive={currentIndex === index}
                        isLiked={likedIds.has(reel._id)}
                        muted={muted}
                        onToggleMute={toggleMute}
                        onLike={toggleLike}
                        onShare={registerShare}
                        onView={registerView}
                        onCartAdd={registerCartAdd}
                      />
                    </div>
                  ))}
                </div>

                {/* scroll position rail */}
                {feed.length > 1 && (
                  <div aria-hidden className="pointer-events-none absolute left-1.5 top-1/2 z-30 flex -translate-y-1/2 flex-col items-center gap-1.5">
                    {feed.map((reel, index) => (
                      <span
                        key={reel._id}
                        className={`w-[3px] rounded-full bg-white transition-all duration-300 ${
                          currentIndex === index ? "h-6 opacity-100" : "h-1.5 opacity-30"
                        }`}
                      />
                    ))}
                  </div>
                )}

                {/* demo honesty badge */}
                {source === "demo" && (
                  <span className="absolute right-3 top-[max(3.5rem,calc(env(safe-area-inset-top)+3.5rem))] z-30 rounded-full bg-amber-500/90 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-[#14100f]">
                    Demo
                  </span>
                )}
              </>
            )}
          </div>
        </div>

        {/* error strip when we silently fell back to demo data */}
        {source === "demo" && error && feed.length > 0 && (
          <p className="absolute inset-x-0 bottom-0 z-30 truncate bg-amber-500/90 px-4 py-1.5 text-center text-[10.5px] font-semibold text-[#14100f]">
            {error}
          </p>
        )}
      </main>
    </div>
  );
}
