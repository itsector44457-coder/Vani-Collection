"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "../../context/CartContext";
import { PRODUCTS } from "../../data/products";
import Link from "next/link";

const REELS = [
  {
    id: "reel-1",
    productId: "vani-1",
    videoSrc: "https://videos.pexels.com/video-files/8534828/8534828-hd_1920_1080_25fps.mp4",
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
    videoSrc: "https://videos.pexels.com/video-files/6069268/6069268-hd_1280_720_25fps.mp4",
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
    videoSrc: "https://videos.pexels.com/video-files/8534828/8534828-hd_1920_1080_25fps.mp4",
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
    videoSrc: "https://videos.pexels.com/video-files/6069268/6069268-hd_1280_720_25fps.mp4",
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
    videoSrc: "https://videos.pexels.com/video-files/8534828/8534828-hd_1920_1080_25fps.mp4",
    poster: "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=720&q=85",
    caption: "Budget Luxe Under Rs.1,999 — Premium Without The Price Tag",
    tag: "Pocket Luxe",
    price: "₹1,799",
    likes: 4321,
    shares: 698,
  },
];

function ReelCard({
  reel,
  isActive,
  onLike,
  likedIds,
}: {
  reel: typeof REELS[0];
  isActive: boolean;
  onLike: (id: string) => void;
  likedIds: Set<string>;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const product = PRODUCTS.find((p) => p.id === reel.productId) || PRODUCTS[0];
  const { addToCart, setIsCartOpen } = useCart();
  const [muted, setMuted] = useState(true);
  const [showBuyToast, setShowBuyToast] = useState(false);
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
    setShowBuyToast(true);
    setTimeout(() => setShowBuyToast(false), 2500);
  };

  const handleBuyNow = () => {
    addToCart(product, product.sizes[0], 1);
    setIsCartOpen(true);
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-black">
      <video
        ref={videoRef}
        src={reel.videoSrc}
        poster={reel.poster}
        loop
        muted={muted}
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/30 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-transparent pointer-events-none" />

      <div className="absolute top-0 inset-x-0 p-4 flex items-center justify-between z-20">
        <Link href="/" className="flex items-center gap-2 text-white">
          <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
          </div>
          <span className="font-serif text-sm font-medium tracking-wide">Vani Reels</span>
        </Link>
        <button
          onClick={() => setMuted(!muted)}
          className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-center text-white"
        >
          {muted ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <line x1="23" y1="9" x2="17" y2="15" />
              <line x1="17" y1="9" x2="23" y2="15" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07" />
            </svg>
          )}
        </button>
      </div>

      <div className="absolute right-4 bottom-44 flex flex-col items-center gap-5 z-20">
        <button onClick={() => onLike(reel.id)} className="flex flex-col items-center gap-1">
          <motion.div
            whileTap={{ scale: 1.4 }}
            className={`w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-md border transition ${
              isLiked ? "bg-rose-600 border-rose-400 text-white" : "bg-black/40 border-white/20 text-white"
            }`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill={isLiked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
            </svg>
          </motion.div>
          <span className="text-white text-[10px] font-semibold drop-shadow-lg">
            {(reel.likes + (isLiked ? 1 : 0)).toLocaleString()}
          </span>
        </button>

        <button
          onClick={() => {
            if (typeof navigator !== "undefined" && navigator.share) {
              navigator.share({ title: "Vani Collection", url: window.location.href }).catch(() => {});
            }
          }}
          className="flex flex-col items-center gap-1"
        >
          <div className="w-11 h-11 rounded-full bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-center text-white">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
          </div>
          <span className="text-white text-[10px] font-semibold drop-shadow-lg">{reel.shares.toLocaleString()}</span>
        </button>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.image}
          alt={product.title}
          className="w-11 h-11 rounded-xl object-cover border-2 border-white/60 shadow-lg"
        />
      </div>

      <div className="absolute bottom-0 inset-x-0 p-5 z-20">
        <span className="inline-block bg-[#881337]/90 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-2">
          {reel.tag}
        </span>
        <p className="text-white text-sm font-medium leading-snug mb-3 max-w-[75%] drop-shadow-lg">{reel.caption}</p>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-white/80 text-[11px] line-clamp-1 max-w-[200px]">{product.title}</p>
            <p className="text-[#dfc28c] font-bold text-lg">{reel.price}</p>
          </div>
        </div>
        <div className="flex gap-2.5">
          <button
            onClick={handleAddToCart}
            className="flex-1 bg-white/15 backdrop-blur-md border border-white/30 text-white py-3.5 rounded-full text-xs uppercase tracking-widest font-semibold hover:bg-white/25 active:scale-95 transition"
          >
            + Add to Bag
          </button>
          <button
            onClick={handleBuyNow}
            className="flex-1 bg-gradient-to-r from-[#b91c1c] to-[#881337] text-white py-3.5 rounded-full text-xs uppercase tracking-widest font-bold shadow-[0_4px_20px_rgba(185,28,28,0.5)] active:scale-95 transition"
          >
            Buy Now
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showBuyToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-16 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-4 py-2 rounded-full text-xs font-semibold shadow-xl z-30 whitespace-nowrap"
          >
            Added to your bag!
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

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
    const container = containerRef.current;
    if (!container) return;
    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const height = container.clientHeight;
      const index = Math.round(scrollTop / height);
      setActiveIndex(Math.max(0, Math.min(REELS.length - 1, index)));
    };
    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      <div
        ref={containerRef}
        className="flex-1 overflow-y-scroll"
        style={{ scrollSnapType: "y mandatory" }}
      >
        {REELS.map((reel, idx) => (
          <div key={reel.id} style={{ scrollSnapAlign: "start" }} className="relative w-full h-screen">
            <ReelCard reel={reel} isActive={activeIndex === idx} onLike={handleLike} likedIds={likedIds} />
          </div>
        ))}
      </div>
      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-1.5 z-30 pointer-events-none">
        {REELS.map((_, idx) => (
          <div
            key={idx}
            className={`rounded-full transition-all duration-300 ${
              activeIndex === idx ? "w-1.5 h-5 bg-white" : "w-1.5 h-1.5 bg-white/40"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
