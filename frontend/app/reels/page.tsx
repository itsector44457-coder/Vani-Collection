"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "../../context/CartContext";
import { PRODUCTS } from "../../data/products";
import ReelsSidebar from "../../components/ReelsSidebar";
import Link from "next/link";
import { productHref } from "../../lib/utils";

/* ─────────────────────────────────────────────────────────────
  ROOT CAUSE ANALYSIS (why things broke):
  1. globals.css sets `html { zoom: 0.9 }` on sm+ screens.
     This means the browser's layout viewport is zoomed, but
     100dvh / 100vh units still refer to the PHYSICAL viewport
     height (pre-zoom), making each reel item taller than the
     scroll container → next reel always bleeds into view.
  2. The `.reel-item` CSS class adds `position: relative` +
     `overflow: hidden`, but the ReelCard uses `absolute inset-0`
     which needs a positioned parent that is EXACTLY the height
     of the scroll slot — when zoom breaks that height the whole
     card bleeds.
  3. The sidebar `overflow-y-auto` was on the nav section only,
     but the sidebar itself had no explicit height, so it didn't
     scroll.

  THE FIX:
  - Wrap the entire reels page in a div with `zoom: 1.111...`
    (= 1/0.9) to cancel out the global 0.9 zoom, making the
    page render at true 1:1 scale again. Now 100vh == real
    viewport height.
  - Each reel slot uses `height: 100vh` (not dvh) consistently.
  - The scroll container uses `height: 100vh` too, NOT 100dvh.
  - The sidebar gets explicit `height: 100vh` + `overflow-y: auto`.
  - The reel card NO LONGER uses `.reel-item` class (to avoid the
    CSS `position: relative; overflow: hidden` interference) —
    we set those inline.
───────────────────────────────────────────────────────────── */

const REELS = [
  {
    id: "reel-1",
    productId: "vani-1",
    videoSrc: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    poster: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=720&q=85",
    caption: "Pure Mul Cotton — Featherlight for Summer Days",
    tag: "Bagru Handblock",
    price: "₹2,499",
    likes: 1842,
    shares: 241,
  },
  {
    id: "reel-2",
    productId: "vani-2",
    videoSrc: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    poster: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=720&q=85",
    caption: "Festive Chanderi Silk — Craft the Perfect Heirloom Look",
    tag: "Gota Patti Zari",
    price: "₹3,999",
    likes: 3241,
    shares: 542,
  },
  {
    id: "reel-3",
    productId: "vani-3",
    videoSrc: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    poster: "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=720&q=85",
    caption: "Effortless Indo-Western Co-ords — Airport to Brunch",
    tag: "Modern Comfort",
    price: "₹1,899",
    likes: 2103,
    shares: 318,
  },
  {
    id: "reel-4",
    productId: "vani-4",
    videoSrc: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    poster: "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=720&q=85",
    caption: "Royal Kalidaar Anarkali — 5-Meter Full Flared Drama",
    tag: "Mughal Grandeur",
    price: "₹4,299",
    likes: 5012,
    shares: 812,
  },
  {
    id: "reel-5",
    productId: "vani-5",
    videoSrc: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
    poster: "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=720&q=85",
    caption: "Budget Luxe Under ₹1,999 — Premium Without The Price Tag",
    tag: "Pocket Luxe",
    price: "₹1,799",
    likes: 4321,
    shares: 698,
  },
];

/* ════════════════════════════════════════
   REEL CARD — fills 100% of its slot
════════════════════════════════════════ */
function ReelCard({
  reel,
  isActive,
  onLike,
  likedIds,
}: {
  reel: (typeof REELS)[0];
  isActive: boolean;
  onLike: (id: string) => void;
  likedIds: Set<string>;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const product = PRODUCTS.find((p) => p.id === reel.productId) ?? PRODUCTS[0];
  const { addToCart, setIsCartOpen } = useCart();
  const [muted, setMuted] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const isLiked = likedIds.has(reel.id);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    if (isActive) {
      vid.currentTime = 0;
      vid.play().catch(() => {});
    } else {
      vid.pause();
    }
  }, [isActive]);

  const handleAddToCart = () => {
    addToCart(product, product.sizes[0], 1);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2500);
  };

  const handleBuyNow = () => {
    addToCart(product, product.sizes[0], 1);
    setIsCartOpen(true);
  };

  return (
    // This div is exactly 100vh tall (the scroll slot height).
    // It must NOT use the .reel-item class (which adds overflow:hidden
    // and position:relative via globals.css and can conflict).
    // We set these inline to be explicit.
    <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", background: "#000" }}>

      {/* Video fills the card */}
      <video
        ref={videoRef}
        src={reel.videoSrc}
        poster={reel.poster}
        loop
        muted={muted}
        playsInline
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
      />

      {/* Gradient overlays */}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.15) 45%, rgba(0,0,0,0.35) 100%)", pointerEvents: "none" }} />

      {/* ── TOP: back + mute ── */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 20, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 16px 0" }}>
        {/* Back — mobile only */}
        <Link
          href="/"
          className="lg:hidden"
          style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(0,0,0,0.45)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
        </Link>
        {/* Spacer on desktop */}
        <div className="hidden lg:block" />
        {/* Mute */}
        <button
          onClick={() => setMuted((m) => !m)}
          style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(0,0,0,0.45)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}
        >
          {muted ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07" />
            </svg>
          )}
        </button>
      </div>

      {/* ── RIGHT: like / share / product thumb ──
          Positioned from the bottom so it always stays above the CTA area.
          bottom: 200px gives clearance above the ~172px CTA block. */}
      <div style={{ position: "absolute", right: 14, bottom: 200, zIndex: 20, display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        {/* Like */}
        <button onClick={() => onLike(reel.id)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer" }}>
          <motion.div
            whileTap={{ scale: 1.35 }}
            style={{
              width: 44, height: 44, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
              backdropFilter: "blur(8px)", border: `1px solid ${isLiked ? "rgba(251,113,133,0.6)" : "rgba(255,255,255,0.25)"}`,
              background: isLiked ? "rgba(225,29,72,0.85)" : "rgba(0,0,0,0.45)",
              color: "#fff",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill={isLiked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
            </svg>
          </motion.div>
          <span style={{ color: "#fff", fontSize: 10, fontWeight: 600, textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}>
            {(reel.likes + (isLiked ? 1 : 0)).toLocaleString()}
          </span>
        </button>

        {/* Share */}
        <button
          onClick={() => navigator?.share?.({ title: "Vani Collection", url: window.location.href }).catch(() => {})}
          style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer" }}
        >
          <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(0,0,0,0.45)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
          </div>
          <span style={{ color: "#fff", fontSize: 10, fontWeight: 600, textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}>{reel.shares.toLocaleString()}</span>
        </button>

        {/* Product thumb → product page */}
        <Link href={productHref(product)}>
          <Image
            src={product.image}
            alt={product.title}
            width={44}
            height={44}
            style={{ borderRadius: 12, objectFit: "cover", border: "2px solid rgba(255,255,255,0.65)", boxShadow: "0 2px 12px rgba(0,0,0,0.5)", display: "block" }}
          />
        </Link>
      </div>

      {/* ── BOTTOM: caption + CTA ── */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 20, padding: "0 20px 28px" }}>
        {/* Tag */}
        <span style={{ display: "inline-block", background: "rgba(136,19,55,0.92)", backdropFilter: "blur(4px)", color: "#fff", fontSize: 10, fontWeight: 700, padding: "4px 12px", borderRadius: 100, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>
          {reel.tag}
        </span>

        {/* Caption */}
        <p style={{ color: "#fff", fontSize: 15, fontWeight: 600, lineHeight: 1.4, marginBottom: 10, textShadow: "0 1px 6px rgba(0,0,0,0.7)" }}>
          {reel.caption}
        </p>

        {/* Product name + price */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ flex: 1, paddingRight: 12 }}>
            <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 11, lineHeight: 1.3, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical" }}>
              {product.title}
            </p>
            <p style={{ color: "#dfc28c", fontWeight: 700, fontSize: 22, marginTop: 2 }}>{reel.price}</p>
          </div>
          <Link
            href={productHref(product)}
            style={{ flexShrink: 0, fontSize: 11, color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 100, padding: "6px 14px", backdropFilter: "blur(4px)", whiteSpace: "nowrap" }}
          >
            View →
          </Link>
        </div>

        {/* CTA buttons */}
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={handleAddToCart}
            style={{ flex: 1, background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", padding: "14px 0", borderRadius: 100, fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", cursor: "pointer" }}
          >
            + Add to Bag
          </button>
          <button
            onClick={handleBuyNow}
            style={{ flex: 1, background: "linear-gradient(135deg, #b91c1c, #881337)", color: "#fff", border: "none", padding: "14px 0", borderRadius: 100, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", cursor: "pointer", boxShadow: "0 4px 20px rgba(185,28,28,0.45)" }}
          >
            Buy Now
          </button>
        </div>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            style={{ position: "absolute", top: 72, left: "50%", transform: "translateX(-50%)", background: "#16a34a", color: "#fff", padding: "10px 20px", borderRadius: 100, fontSize: 12, fontWeight: 600, boxShadow: "0 4px 20px rgba(0,0,0,0.4)", zIndex: 30, whiteSpace: "nowrap" }}
          >
            ✓ Added to your bag!
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ════════════════════════════════════════
   PAGE
════════════════════════════════════════ */
export default function ReelsPage() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  const handleLike = useCallback((id: string) => {
    setLikedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onScroll = () => {
      const idx = Math.round(el.scrollTop / el.clientHeight);
      setActiveIndex(Math.max(0, Math.min(REELS.length - 1, idx)));
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  return (
    /*
      ZOOM CANCELLATION WRAPPER:
      globals.css applies `zoom: 0.9` on html at sm+.
      We must counter it here with `zoom: 1.1111` (= 1/0.9)
      so the reels page always renders at true 1:1 scale.
      Without this, 100vh !== one screen height and reels bleed.

      We also set overflow:hidden on body for this page via the
      outer div being position:fixed — the page never scrolls,
      only the inner snap container does.
    */
    <div
      style={{
        position: "fixed",
        inset: 0,
        // Cancel the html zoom so this page renders at 1:1 scale
        zoom: "1.1111",
        background: "#0a0807",
      }}
    >
      {/* Sidebar — desktop only */}
      <ReelsSidebar />

      {/*
        Content area — starts after the sidebar on desktop (left: 248px).
        On mobile it's full width.
        It centers the portrait reel column.
      */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        }}
        className="lg:left-[248px]"
      >
        {/* Dark background with subtle pattern for the sides of widescreen */}
        <div style={{ position: "absolute", inset: 0, background: "#0a0807" }}>
          <div
            style={{
              position: "absolute", inset: 0, opacity: 0.04,
              backgroundImage: "radial-gradient(circle, #dfc28c 1px, transparent 1px)",
              backgroundSize: "28px 28px",
            }}
          />
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", pointerEvents: "none", userSelect: "none" }}>
            <p style={{ fontFamily: "var(--font-playfair), Georgia, serif", color: "rgba(223,194,140,0.06)", fontSize: 48, letterSpacing: "0.3em", whiteSpace: "nowrap" }}>
              Vani Collection
            </p>
          </div>
        </div>

        {/* Portrait column — centered in the content area */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              position: "relative",
              width: "100%",
              maxWidth: 430,
              height: "100vh",   // 100vh = one screen slot (zoom is cancelled above)
            }}
          >
            {/* ── Scroll snap container ── */}
            <div
              ref={containerRef}
              style={{
                position: "absolute",
                inset: 0,
                overflowY: "scroll",
                overflowX: "hidden",
                scrollSnapType: "y mandatory",
                // Hide scrollbar
                scrollbarWidth: "none",
                msOverflowStyle: "none",
              }}
            >
              {REELS.map((reel, idx) => (
                <div
                  key={reel.id}
                  style={{
                    // Each slot must be EXACTLY the same height as the container
                    height: "100vh",
                    minHeight: "100vh",
                    maxHeight: "100vh",
                    scrollSnapAlign: "start",
                    scrollSnapStop: "always",
                    // Do NOT use position:relative here — let ReelCard set its own
                    overflow: "hidden",
                  }}
                >
                  <ReelCard
                    reel={reel}
                    isActive={activeIndex === idx}
                    onLike={handleLike}
                    likedIds={likedIds}
                  />
                </div>
              ))}
            </div>

            {/* Progress dots — inside portrait column, right edge */}
            <div
              style={{
                position: "absolute",
                right: 6,
                top: "50%",
                transform: "translateY(-50%)",
                zIndex: 50,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 5,
                pointerEvents: "none",
              }}
            >
              {REELS.map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: 3,
                    height: activeIndex === i ? 22 : 6,
                    borderRadius: 99,
                    background: "#fff",
                    opacity: activeIndex === i ? 1 : 0.3,
                    transition: "height 0.3s ease, opacity 0.3s ease",
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
