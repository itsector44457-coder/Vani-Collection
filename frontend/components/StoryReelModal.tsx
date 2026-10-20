"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { CategoryStory } from "../lib/content";
import { useCatalogue } from "../lib/use-storefront";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { useModalDialog } from "../lib/use-modal-dialog";
import { useScrollLock } from "./SmoothScroll";

/* ------------------------------------------------------------------ */
/*  Story media map                                                    */
/* ------------------------------------------------------------------ */
/** Story auto-advance window (ms) */
const DEFAULT_DURATION = 7000;
const MIN_DURATION = 4000;
const MAX_DURATION = 15000;

/* ------------------------------------------------------------------ */
/*  Public component                                                   */
/* ------------------------------------------------------------------ */
interface StoryReelModalProps {
  story: CategoryStory | null;
  onClose: () => void;
  onSelectCategory: (filterKey: string) => void;
}

export default function StoryReelModal({
  story,
  onClose,
  onSelectCategory,
}: StoryReelModalProps) {
  return (
    <AnimatePresence mode="wait">
      {story ? (
        <StoryReel
          key={story.id}
          story={story}
          onClose={onClose}
          onSelectCategory={onSelectCategory}
        />
      ) : null}
    </AnimatePresence>
  );
}

/* ------------------------------------------------------------------ */
/*  Inner reel — mounted only while a story is active                  */
/* ------------------------------------------------------------------ */
interface StoryReelProps {
  story: CategoryStory;
  onClose: () => void;
  onSelectCategory: (filterKey: string) => void;
}

function StoryReel({ story, onClose, onSelectCategory }: StoryReelProps) {
  useScrollLock(true);
  const { addToCart, setQuickViewProduct } = useCart();
  const { user } = useAuth();
  const dialogRef = useModalDialog<HTMLDivElement>(true, onClose);

  /* ---------- state ---------- */
  const [isHolding, setIsHolding] = useState(false);
  const [isManuallyPaused, setIsManuallyPaused] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [isMuted, setIsMuted] = useState(true);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [videoBroken, setVideoBroken] = useState(!story.video);

  const isPaused = isHolding || isManuallyPaused;

  /* ---------- refs ---------- */
  const pausedRef = useRef(isPaused);
  const elapsedRef = useRef(0);
  const durationRef = useRef(DEFAULT_DURATION);
  const lastFrameRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const finishedRef = useRef(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  /* ---------- derived ---------- */
  const { data: products } = useCatalogue({
    category: story.filterKey === "all" || story.filterKey === "budget" ? undefined : story.filterKey,
    limit: 1,
  });

  const matchedProduct = useMemo(() => {
    if (story.filterKey === "budget") return products.find((product) => product.price <= 1999) ?? null;
    return products[0] ?? null;
  }, [products, story.filterKey]);

  /* ---------- video <-> pause sync ---------- */
  useEffect(() => {
    pausedRef.current = isPaused;
    const vid = videoRef.current;
    if (!vid) return;
    if (isPaused) {
      vid.pause();
    } else {
      void vid.play().catch(() => {});
    }
  }, [isPaused]);

  /* ---------- progress loop (rAF, no re-renders) ---------- */
  useEffect(() => {
    lastFrameRef.current = performance.now();

    const tick = (now: number) => {
      const dt = now - lastFrameRef.current;
      lastFrameRef.current = now;

      if (!pausedRef.current) {
        elapsedRef.current += dt;
        const ratio = Math.min(elapsedRef.current / durationRef.current, 1);

        if (barRef.current) {
          barRef.current.style.transform = `scaleX(${ratio})`;
        }

        if (ratio >= 1) {
          if (!finishedRef.current) {
            finishedRef.current = true;
            onCloseRef.current?.();
          }
          return; // stop the loop
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  /* ---------- keyboard shortcuts ---------- */
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        (e.key === " " || e.key === "k") &&
        !target?.closest("button, a, input, textarea")
      ) {
        e.preventDefault();
        setIsManuallyPaused((p) => !p);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  /* ---------- toast timer cleanup ---------- */
  useEffect(
    () => () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    },
    []
  );

  /* ---------- handlers ---------- */
  const handleLoadedMetadata = useCallback(() => {
    const vid = videoRef.current;
    if (!vid || !Number.isFinite(vid.duration) || vid.duration <= 0) return;
    durationRef.current = Math.min(
      Math.max(vid.duration * 1000, MIN_DURATION),
      MAX_DURATION
    );
  }, []);

  const handlePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if ((e.target as HTMLElement).closest("button, a")) return;
      e.currentTarget.setPointerCapture?.(e.pointerId);
      setIsHolding(true);
    },
    []
  );

  const handlePointerUp = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      setIsHolding(false);
    },
    []
  );

  const availableSizes = matchedProduct
    ? matchedProduct.sizes.filter((size) => {
        const variants = (matchedProduct.variants ?? []).filter((variant) => variant.size === size);
        return variants.length === 0 || variants.some((variant) => variant.available === undefined || variant.available > 0);
      })
    : [];
  const preferredSize = user?.preferences?.preferredSize;
  const quickAddSize = preferredSize && availableSizes.includes(preferredSize)
    ? preferredSize
    : availableSizes.length === 1
      ? availableSizes[0]
      : "";

  const showToastMessage = useCallback((message: string, tone: "success" | "error") => {
    setToast({ message, tone });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 2500);
  }, []);

  const handleAddToCart = useCallback(async () => {
    if (!matchedProduct || isAdding) return;
    if (!quickAddSize) {
      // Never guess the first size. Quick View asks explicitly and shows stock for every option.
      setQuickViewProduct(matchedProduct);
      onClose();
      return;
    }
    setIsAdding(true);
    try {
      const added = await addToCart(matchedProduct, quickAddSize, 1);
      showToastMessage(
        added ? `✓ Size ${quickAddSize} bag me jud gaya!` : "Yeh size bag me nahi jud paya.",
        added ? "success" : "error",
      );
    } finally {
      setIsAdding(false);
    }
  }, [addToCart, isAdding, matchedProduct, onClose, quickAddSize, setQuickViewProduct, showToastMessage]);

  const handleExplore = useCallback(() => {
    onSelectCategory(story.filterKey);
    onClose();
  }, [onClose, onSelectCategory, story.filterKey]);

  /* ---------- render ---------- */
  return (
    <>
      {/* Backdrop */}
      <motion.div
        key="story-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.22 }}
        onClick={onClose}
        className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-md"
      />

      {/* Card wrapper */}
      <div className="pointer-events-none fixed inset-0 z-[121] flex items-center justify-center p-0 sm:p-4">
        <motion.div
          ref={dialogRef}
          key="story-card"
          role="dialog"
          aria-modal="true"
          aria-label={`${story.name} — story`}
          tabIndex={-1}
          initial={{ scale: 0.88, opacity: 0, y: 40 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.88, opacity: 0, y: 40 }}
          transition={{ type: "spring", damping: 22, stiffness: 260 }}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="pointer-events-auto relative flex h-[100dvh] focus:outline-none w-full max-h-[100dvh] max-w-none touch-none flex-col overflow-hidden bg-stone-900 shadow-2xl select-none sm:aspect-[9/16] sm:h-auto sm:max-h-[88vh] sm:max-w-sm sm:rounded-2xl sm:border sm:border-white/15"
        >
          {/* Poster fallback (always rendered underneath) */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={story.image}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover"
          />

          {/* Background video */}
          {!videoBroken && (
            <video
              ref={videoRef}
              src={story.video}
              poster={story.image}
              autoPlay={!isManuallyPaused}
              loop
              muted={isMuted}
              playsInline
              preload="metadata"
              disablePictureInPicture
              onLoadedMetadata={handleLoadedMetadata}
              onError={() => setVideoBroken(true)}
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}

          {/* Gradient overlays */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/70 sm:from-black/55 sm:to-black/80" />

          {/* ---------- Top: progress + header ---------- */}
          <div className="relative z-10 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] sm:p-4 sm:pt-3">
            {/* Progress bar */}
            <div
              className="mb-3 h-[2.5px] w-full overflow-hidden rounded-full bg-white/25"
              aria-hidden="true"
            >
              <div
                ref={barRef}
                style={{ transform: "scaleX(0)" }}
                className="h-full w-full origin-left rounded-full bg-white will-change-transform"
              />
            </div>

            {/* Header row */}
            <div className="flex items-center justify-between gap-2 text-white">
              <div className="flex min-w-0 items-center gap-2">
                <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full border-2 border-[#dfc28c] bg-stone-700">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={story.image}
                    alt={story.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <h4 className="truncate text-[11px] font-bold tracking-wide">
                    {story.name}
                  </h4>
                  <p className="truncate text-[9px] text-white/60">
                    Vani Collection · Atelier
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1.5">
                {/* Play / pause */}
                <button
                  type="button"
                  onClick={() => setIsManuallyPaused((p) => !p)}
                  aria-label={isPaused ? "Play story" : "Pause story"}
                  aria-pressed={isPaused}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-black/40 text-white transition hover:bg-black/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                >
                  {isPaused ? (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="5,3 19,12 5,21" />
                    </svg>
                  ) : (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                      <rect x="6" y="4" width="4" height="16" />
                      <rect x="14" y="4" width="4" height="16" />
                    </svg>
                  )}
                </button>

                {/* Mute toggle */}
                <button
                  type="button"
                  onClick={() => setIsMuted((m) => !m)}
                  aria-label={isMuted ? "Unmute video" : "Mute video"}
                  aria-pressed={!isMuted}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-black/40 text-white transition hover:bg-black/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                >
                  {isMuted ? (
                    <svg
                      width="11"
                      height="11"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                      <line x1="23" y1="9" x2="17" y2="15" />
                      <line x1="17" y1="9" x2="23" y2="15" />
                    </svg>
                  ) : (
                    <svg
                      width="11"
                      height="11"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                    </svg>
                  )}
                </button>

                {/* Close */}
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close story"
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-black/40 text-white transition hover:bg-black/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                >
                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Middle spacer — hold anywhere here to pause */}
          <div className="flex-1" />

          {/* ---------- Bottom content ---------- */}
          <div className="relative z-10 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 sm:p-5 sm:pt-2">
            {story.count && <span className="mb-2 inline-block rounded-full bg-[#881337] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow">
              {story.count}
            </span>}

            <h3 className="mb-0.5 font-serif text-2xl font-bold text-white sm:text-2xl">
              {story.name}
            </h3>
            {story.tagline && <p className="mb-1 text-xs text-white/85">{story.tagline}</p>}
            {story.description && <p className="mb-3 line-clamp-3 text-xs leading-relaxed text-white/90">{story.description}</p>}

            {/* Product teaser */}
            {matchedProduct && (
              <div className="mb-3 flex items-center gap-3 rounded-xl border border-white/20 bg-white/10 p-3 backdrop-blur-md">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={matchedProduct.image}
                  alt={matchedProduct.title}
                  loading="lazy"
                  className="h-12 w-12 rounded-lg border border-white/20 object-cover object-top"
                />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-[11px] font-medium text-white">
                    {matchedProduct.title}
                  </p>
                  <p className="mt-0.5 text-sm font-bold text-[#dfc28c]">
                    ₹{matchedProduct.price.toLocaleString("en-IN")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleAddToCart()}
                  disabled={isAdding}
                  aria-label={quickAddSize ? `${matchedProduct.title}, size ${quickAddSize}, bag me daale` : `${matchedProduct.title} ke liye size chune`}
                  className="min-h-11 shrink-0 whitespace-nowrap rounded-full bg-[#881337] px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-white transition hover:bg-[#b91c1c] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 active:scale-95 disabled:cursor-wait disabled:opacity-60"
                >
                  {isAdding ? "Adding…" : quickAddSize ? `+ Bag · ${quickAddSize}` : "Size chune"}
                </button>
              </div>
            )}

            {/* CTA */}
            <button
              type="button"
              onClick={handleExplore}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-white py-3.5 text-xs font-bold uppercase tracking-widest text-stone-900 shadow-lg transition hover:bg-[#faf7f2] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 active:scale-[0.98]"
            >
              <span>{story.ctaLabel || "Shop this collection"}</span>
              <span className="text-[#881337]">↑</span>
            </button>
          </div>

          {/* Toast */}
          <AnimatePresence>
            {toast && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                role={toast.tone === "error" ? "alert" : "status"}
                aria-live="polite"
                className={`absolute left-1/2 top-20 z-50 -translate-x-1/2 whitespace-nowrap rounded-full px-4 py-2.5 text-xs font-semibold text-white shadow-xl ${toast.tone === "error" ? "bg-rose-700" : "bg-emerald-600"}`}
              >
                {toast.message}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </>
  );
}