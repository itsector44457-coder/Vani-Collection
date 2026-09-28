"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CategoryStory, PRODUCTS } from "../data/products";
import { useEffect, useState, useRef } from "react";
import { useCart } from "../context/CartContext";

interface StoryReelModalProps {
  story: CategoryStory | null;
  onClose: () => void;
  onSelectCategory: (filterKey: string) => void;
}

// Story video sources — maps story filterKey → pexels video
const STORY_VIDEOS: Record<string, string> = {
  "mul-cotton":
    "https://videos.pexels.com/video-files/8534828/8534828-hd_1920_1080_25fps.mp4",
  festive:
    "https://videos.pexels.com/video-files/6069268/6069268-hd_1280_720_25fps.mp4",
  "coord-sets":
    "https://videos.pexels.com/video-files/8534828/8534828-hd_1920_1080_25fps.mp4",
  anarkalis:
    "https://videos.pexels.com/video-files/6069268/6069268-hd_1280_720_25fps.mp4",
  budget:
    "https://videos.pexels.com/video-files/8534828/8534828-hd_1920_1080_25fps.mp4",
  all: "https://videos.pexels.com/video-files/6069268/6069268-hd_1280_720_25fps.mp4",
};

export default function StoryReelModal({
  story,
  onClose,
  onSelectCategory,
}: StoryReelModalProps) {
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { addToCart } = useCart();

  // Find a matching product for the story category
  const matchedProduct = PRODUCTS.find(
    (p) =>
      story?.filterKey === "all" ||
      p.category === story?.filterKey ||
      (story?.filterKey === "budget" && p.price <= 1999)
  );

  // Progress timer
  useEffect(() => {
    if (!story) return;
    setProgress(0);
    setIsPaused(false);
    const interval = setInterval(() => {
      if (isPaused) return;
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          onClose();
          return 100;
        }
        return prev + 1.4;
      });
    }, 80);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story]);

  // Control progress pause on hold
  useEffect(() => {
    if (!story) return;
    const interval = setInterval(() => {
      if (!isPaused) {
        setProgress((prev) => {
          if (prev >= 100) {
            onClose();
            return 100;
          }
          return prev + 1.4;
        });
      }
    }, 80);
    return () => clearInterval(interval);
  }, [isPaused, story, onClose]);

  // Play/pause video with progress
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    if (isPaused) vid.pause();
    else vid.play().catch(() => {});
  }, [isPaused]);

  const handleAddToCart = () => {
    if (matchedProduct) {
      addToCart(matchedProduct, matchedProduct.sizes[0], 1);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2500);
    }
  };

  const handleExplore = () => {
    if (story) {
      onSelectCategory(story.filterKey);
      onClose();
    }
  };

  if (!story) return null;

  const videoSrc = STORY_VIDEOS[story.filterKey] || STORY_VIDEOS["all"];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/90 backdrop-blur-md"
        />

        {/* Story Card */}
        <motion.div
          initial={{ scale: 0.88, opacity: 0, y: 40 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.88, opacity: 0, y: 40 }}
          transition={{ type: "spring", damping: 22, stiffness: 260 }}
          className="relative w-full max-w-[340px] sm:max-w-sm aspect-[9/16] max-h-[88vh] rounded-2xl overflow-hidden shadow-2xl z-[121] bg-stone-900 border border-white/15 flex flex-col"
          onMouseDown={() => setIsPaused(true)}
          onMouseUp={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setIsPaused(false)}
        >
          {/* Background video */}
          <video
            ref={videoRef}
            src={videoSrc}
            poster={story.image}
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />

          {/* Gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-transparent to-black/80" />

          {/* Top: Progress + Header */}
          <div className="relative z-10 p-4 pt-3">
            {/* Story progress bar */}
            <div className="w-full h-[2.5px] bg-white/25 rounded-full overflow-hidden mb-3">
              <motion.div
                className="h-full bg-white rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Header row */}
            <div className="flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full border-2 border-[#dfc28c] overflow-hidden bg-stone-700">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={story.image}
                    alt={story.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h4 className="text-[11px] font-bold tracking-wide">{story.name}</h4>
                  <p className="text-[9px] text-white/60">Vani Collection · Atelier</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setIsPaused(!isPaused)}
                  className="w-7 h-7 rounded-full bg-black/40 text-white flex items-center justify-center"
                >
                  {isPaused ? (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="5,3 19,12 5,21" />
                    </svg>
                  ) : (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                      <rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" />
                    </svg>
                  )}
                </button>
                <button
                  onClick={onClose}
                  className="w-7 h-7 rounded-full bg-black/40 text-white flex items-center justify-center text-xs"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>

          {/* Middle — tap left/right hint */}
          <div className="flex-1" />

          {/* Bottom Content */}
          <div className="relative z-10 p-5 pt-2">
            {/* Category tag */}
            <span className="inline-block bg-[#881337] text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-2 shadow">
              {story.count}
            </span>

            {/* Story name */}
            <h3 className="font-serif text-2xl font-bold text-white mb-0.5">{story.name}</h3>
            <p className="text-xs text-white/70 mb-3">{story.tagline}</p>

            {/* Product teaser (if found) */}
            {matchedProduct && (
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-3 mb-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={matchedProduct.image}
                  alt={matchedProduct.title}
                  className="w-12 h-12 rounded-lg object-cover object-top border border-white/20"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-[11px] font-medium line-clamp-1">{matchedProduct.title}</p>
                  <p className="text-[#dfc28c] font-bold text-sm mt-0.5">₹{matchedProduct.price}</p>
                </div>
                <button
                  onClick={handleAddToCart}
                  className="bg-[#881337] text-white text-[10px] font-bold px-3 py-2 rounded-full uppercase tracking-wide hover:bg-[#b91c1c] transition whitespace-nowrap"
                >
                  + Bag
                </button>
              </div>
            )}

            {/* Swipe Up / Explore CTA */}
            <button
              onClick={handleExplore}
              className="w-full bg-white text-stone-900 hover:bg-[#faf7f2] py-3.5 rounded-full text-xs uppercase tracking-widest font-bold transition shadow-lg flex items-center justify-center gap-2"
            >
              <span>Swipe Up to Shop</span>
              <span className="text-[#881337]">↑</span>
            </button>
          </div>

          {/* Toast */}
          <AnimatePresence>
            {showToast && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-14 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-4 py-2 rounded-full text-xs font-semibold shadow-xl z-50 whitespace-nowrap"
              >
                ✓ Added to your bag!
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
