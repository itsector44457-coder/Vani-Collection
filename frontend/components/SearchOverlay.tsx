"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { PRODUCTS } from "../data/products";
import { generateProductSlug } from "../lib/utils";

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

const POPULAR_SEARCHES = [
  "Pure Mul Cotton",
  "Bagru Handblock",
  "Anarkali Set",
  "Haldi Yellow Suit",
  "Co-ord Set",
  "Under ₹1,999",
  "Chanderi Silk",
  "Festive Suit",
];

export default function SearchOverlay({ isOpen, onClose }: SearchOverlayProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const handleClose = useCallback(() => {
    setQuery("");
    onClose();
  }, [onClose]);

  // Focus input when opened
  useEffect(() => {
    if (!isOpen) return;
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 80);
    return () => window.clearTimeout(focusTimer);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleClose]);

  const results =
    query.trim().length >= 2
      ? PRODUCTS.filter((p) => {
          const q = query.toLowerCase();
          return (
            p.title.toLowerCase().includes(q) ||
            p.fabric.toLowerCase().includes(q) ||
            p.category.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q)
          );
        }).slice(0, 6)
      : [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      handleClose();
      router.push(`/products?search=${encodeURIComponent(query.trim())}`);
    }
  };

  const handlePopularClick = (term: string) => {
    handleClose();
    router.push(`/products?search=${encodeURIComponent(term)}`);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[115] flex items-start justify-center pt-16 sm:pt-24 px-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Panel */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Product search"
            initial={{ y: -16, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -16, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-stone-200 z-[116] overflow-hidden"
          >
            {/* Search Input */}
            <form
              onSubmit={handleSubmit}
              className="flex items-center gap-3 px-5 py-4 border-b border-stone-200"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-stone-400 flex-shrink-0"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <label htmlFor="site-search" className="sr-only">
                Search products
              </label>
              <input
                id="site-search"
                ref={inputRef}
                type="search"
                autoComplete="off"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search Mul Cotton, Anarkalis, Sharara sets..."
                className="flex-1 text-sm text-stone-900 placeholder-stone-400 focus:outline-none bg-transparent"
              />
              <div className="flex items-center gap-2">
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    aria-label="Clear search"
                    className="text-stone-400 hover:text-stone-600 transition p-1"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleClose}
                  aria-label="Close search"
                  className="text-xs text-stone-400 hover:text-stone-700 px-2 py-1 bg-stone-100 hover:bg-stone-200 rounded-lg transition font-medium"
                >
                  ESC
                </button>
              </div>
            </form>

            {/* Live Results */}
            <AnimatePresence mode="wait">
              {results.length > 0 ? (
                <motion.div
                  key="results"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="max-h-[60vh] overflow-y-auto"
                >
                  <div className="px-5 pt-4 pb-2">
                    <span className="text-[10px] uppercase tracking-widest font-semibold text-stone-400">
                      {results.length} result{results.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <ul>
                    {results.map((product, i) => (
                      <motion.li
                        key={product.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04 }}
                      >
                        <Link
                          href={`/product/${generateProductSlug(product.title)}`}
                          onClick={handleClose}
                          className="flex items-center gap-4 px-5 py-3 hover:bg-stone-50 transition group"
                        >
                          <Image
                            src={product.image}
                            alt={product.title}
                            width={48}
                            height={56}
                            sizes="48px"
                            className="h-14 w-12 flex-shrink-0 rounded-lg border border-stone-100 object-cover"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-stone-900 group-hover:text-[#881337] transition line-clamp-1">
                              {product.title}
                            </p>
                            <p className="text-[10px] text-stone-400 mt-0.5 truncate">
                              {product.fabric}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-sm font-bold text-[#881337]">
                                ₹{product.price.toLocaleString()}
                              </span>
                              {product.originalPrice > product.price && (
                                <span className="text-xs text-stone-400 line-through">
                                  ₹{product.originalPrice.toLocaleString()}
                                </span>
                              )}
                            </div>
                          </div>
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className="text-stone-300 group-hover:text-[#881337] transition flex-shrink-0"
                          >
                            <path d="M9 18l6-6-6-6" />
                          </svg>
                        </Link>
                      </motion.li>
                    ))}
                  </ul>
                  <div className="px-5 py-4 border-t border-stone-100">
                    <button
                      onClick={() => {
                        handleClose();
                        router.push(
                          `/products?search=${encodeURIComponent(query)}`,
                        );
                      }}
                      className="w-full text-center text-sm text-[#881337] font-semibold hover:underline"
                    >
                      View all results for “{query}” →
                    </button>
                  </div>
                </motion.div>
              ) : query.trim().length >= 2 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="px-5 py-10 text-center"
                >
                  <p className="text-stone-400 text-sm">
                    No products found for “
                    <strong className="text-stone-600">{query}</strong>”
                  </p>
                  <p className="text-xs text-stone-400 mt-1">
                    Try a different keyword or browse all products
                  </p>
                  <Link
                    href="/products"
                    onClick={handleClose}
                    className="inline-block mt-4 text-sm text-[#881337] font-semibold hover:underline"
                  >
                    Browse all products →
                  </Link>
                </motion.div>
              ) : (
                <motion.div
                  key="suggestions"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="px-5 py-5"
                >
                  <span className="text-[10px] uppercase tracking-widest font-semibold text-stone-400 block mb-3">
                    Popular Searches
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {POPULAR_SEARCHES.map((term) => (
                      <button
                        key={term}
                        onClick={() => handlePopularClick(term)}
                        className="px-3 py-1.5 bg-stone-100 hover:bg-[#881337] hover:text-white rounded-full text-xs text-stone-700 transition font-medium"
                      >
                        {term}
                      </button>
                    ))}
                  </div>

                  {/* Quick category links */}
                  <div className="mt-5 pt-4 border-t border-stone-100">
                    <span className="text-[10px] uppercase tracking-widest font-semibold text-stone-400 block mb-3">
                      Browse Categories
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        {
                          label: "Mul Cotton",
                          href: "/products?category=mul-cotton",
                          emoji: "🌿",
                        },
                        {
                          label: "Festive Edit",
                          href: "/products?category=festive",
                          emoji: "✨",
                        },
                        {
                          label: "Co-ord Sets",
                          href: "/products?category=coord-sets",
                          emoji: "👗",
                        },
                        {
                          label: "Anarkalis",
                          href: "/products?category=anarkalis",
                          emoji: "🌸",
                        },
                      ].map((cat) => (
                        <Link
                          key={cat.href}
                          href={cat.href}
                          onClick={handleClose}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-stone-50 hover:bg-[#881337]/5 border border-stone-200 hover:border-[#881337]/30 text-xs text-stone-700 font-medium transition"
                        >
                          <span>{cat.emoji}</span>
                          <span>{cat.label}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
