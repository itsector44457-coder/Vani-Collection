"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CategoryStory } from "../data/products";
import { useEffect, useState } from "react";

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
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!story) return;
    requestAnimationFrame(() => setProgress(0));
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          onClose();
          return 100;
        }
        return prev + 2;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [story, onClose]);

  if (!story) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/85 backdrop-blur-md"
        />

        {/* Story Card */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 30 }}
          className="relative w-full max-w-sm aspect-[9/16] max-h-[85vh] rounded-2xl overflow-hidden shadow-2xl z-[121] bg-stone-900 border border-white/20 flex flex-col justify-between"
        >
          {/* Background image */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={story.image}
            alt={story.name}
            className="absolute inset-0 w-full h-full object-cover"
          />

          {/* Dark Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80" />

          {/* Top Progress Bar & Header */}
          <div className="relative z-10 p-4">
            <div className="w-full h-1 bg-white/30 rounded-full overflow-hidden mb-3">
              <div
                className="h-full bg-white transition-all duration-100 rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full border border-white/60 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={story.image} alt={story.name} className="w-full h-full object-cover" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold">{story.name}</h4>
                  <p className="text-[10px] text-white/70">Vani Collection · Highlight</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-full bg-black/40 text-white flex items-center justify-center text-xs hover:bg-black/60 transition"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Bottom Content & CTA */}
          <div className="relative z-10 p-5 text-white">
            <span className="inline-block bg-[#881337] text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider mb-2">
              {story.count}
            </span>
            <h3 className="font-serif text-2xl font-bold mb-1">{story.name}</h3>
            <p className="text-xs text-white/80 mb-4">{story.tagline}</p>

            <button
              onClick={() => {
                onSelectCategory(story.filterKey);
                onClose();
              }}
              className="w-full bg-white text-stone-900 hover:bg-rose-50 py-3 rounded-full text-xs uppercase tracking-widest font-bold transition shadow-lg flex items-center justify-center gap-2"
            >
              <span>Explore Collection</span>
              <span>→</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
