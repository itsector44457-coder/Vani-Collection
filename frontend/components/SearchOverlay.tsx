"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { isApiConfigured } from "../lib/api-client";
import { searchProducts } from "../lib/storefront-api";
import type { Product } from "../lib/storefront-types";
import { formatPrice } from "../lib/utils";
import { useScrollLock } from "./SmoothScroll";

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

const RECENT_SEARCHES_KEY = "vani_recent_searches";
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const CATEGORY_SUGGESTIONS = [
  { label: "Mul Cotton", href: "/collections/mul-cotton" },
  { label: "Anarkalis", href: "/collections/anarkalis" },
  { label: "Co-ord Sets", href: "/collections/coord-sets" },
  { label: "Kurta Sets", href: "/collections/kurta-sets" },
  { label: "Sarees", href: "/collections/sarees" },
  { label: "Festive Edit", href: "/collections/festive" },
];

const QUICK_SEARCHES = ["Mul cotton kurti", "Bagru print", "Anarkali set", "Lal saree", "Sharara set", "Gulabi suit"];

function readRecentSearches(): string[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(RECENT_SEARCHES_KEY) || "[]") as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string").slice(0, 6) : [];
  } catch {
    return [];
  }
}

function categoryLabel(category?: string): string {
  if (!category) return "";
  return category.split(/[-_\s]+/).filter(Boolean).map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}

function HighlightedTitle({ title, query }: { title: string; query: string }) {
  const tokens = [...new Set(query.toLowerCase().split(/\s+/).filter((token) => token.length >= 2))];
  if (!tokens.length) return <>{title}</>;
  const pattern = new RegExp(`(${tokens.map((token) => token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
  return (
    <>
      {title.split(pattern).map((part, index) => (
        tokens.some((token) => token === part.toLowerCase())
          ? <mark key={index} className="rounded bg-[#881337]/10 px-0.5 text-inherit">{part}</mark>
          : <span key={index}>{part}</span>
      ))}
    </>
  );
}

export default function SearchOverlay({ isOpen, onClose }: SearchOverlayProps) {
  useScrollLock(isOpen);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [searchedTerm, setSearchedTerm] = useState("");
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [retryNonce, setRetryNonce] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const handleClose = useCallback(() => {
    setQuery("");
    setResults([]);
    setTotalResults(0);
    setSearchedTerm("");
    setActiveIndex(-1);
    onClose();
  }, [onClose]);

  const saveRecentSearch = useCallback((rawTerm: string) => {
    const term = rawTerm.trim().replace(/\s+/g, " ");
    if (term.length < 2) return;
    setRecentSearches((previous) => {
      const next = [term, ...previous.filter((item) => item.toLowerCase() !== term.toLowerCase())].slice(0, 6);
      try {
        window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
      } catch {
        /* recent searches are a convenience only */
      }
      return next;
    });
  }, []);

  /* Open: focus the input, trap Tab inside the dialog, restore focus/scroll on close. */
  useEffect(() => {
    if (!isOpen) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 80);
    void Promise.resolve().then(() => setRecentSearches(readRecentSearches()));

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        handleClose();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = [...panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((element) => element.offsetParent !== null);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [handleClose, isOpen]);

  /* Debounced live search — one request per pause in typing, never per keystroke. */
  useEffect(() => {
    if (!isOpen) return;
    const term = query.trim();
    if (term.length < 2) {
      const timer = window.setTimeout(() => {
        setResults([]);
        setTotalResults(0);
        setSearchedTerm("");
        setSearchError(null);
        setSearching(false);
      }, 0);
      return () => window.clearTimeout(timer);
    }
    if (!isApiConfigured()) {
      const timer = window.setTimeout(() => {
        setResults([]);
        setSearchError("Search abhi uplabdh nahi hai — kripya categories se browse kare.");
        setSearching(false);
      }, 0);
      return () => window.clearTimeout(timer);
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setSearching(true);
      setSearchError(null);
      searchProducts(term, controller.signal, 8)
        .then(({ products, total }) => {
          setResults(products);
          setTotalResults(total);
          setSearchedTerm(term);
          setActiveIndex(-1);
        })
        .catch((cause: unknown) => {
          if ((cause as Error)?.name === "AbortError") return;
          setResults([]);
          setTotalResults(0);
          setSearchedTerm(term);
          setSearchError("Khoj puri nahi ho payi. Connection jaanch kar dobara koshish kare.");
        })
        .finally(() => {
          if (!controller.signal.aborted) setSearching(false);
        });
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [isOpen, query, retryNonce]);

  /* Keep the keyboard-highlighted result visible. */
  useEffect(() => {
    if (activeIndex < 0) return;
    document.getElementById(`search-option-${activeIndex}`)?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const trimmedQuery = query.trim();
  const optionCount = results.length + (results.length ? 1 : 0); // products + "view all"
  const showResults = results.length > 0;
  const showNoResults = trimmedQuery.length >= 2 && searchedTerm === trimmedQuery && !searching && !searchError && results.length === 0;
  const queryWords = trimmedQuery.split(/\s+/).filter((word) => word.length >= 2);

  const goToSearchPage = (term: string) => {
    const cleaned = term.trim();
    if (!cleaned) return;
    saveRecentSearch(cleaned);
    handleClose();
    router.push(`/products?search=${encodeURIComponent(cleaned)}`);
  };

  const goToProduct = (product: Product) => {
    saveRecentSearch(trimmedQuery);
    handleClose();
    router.push(`/product/${product.slug}`);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (activeIndex >= 0 && activeIndex < results.length) {
      goToProduct(results[activeIndex]);
      return;
    }
    goToSearchPage(trimmedQuery);
  };

  const onInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!optionCount) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((previous) => (previous + 1) % optionCount);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((previous) => (previous <= 0 ? optionCount - 1 : previous - 1));
    } else if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setActiveIndex(optionCount - 1);
    }
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    try {
      window.localStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch {
      /* ignore */
    }
    inputRef.current?.focus();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[115] flex items-start justify-center px-3 sm:px-4" style={{ paddingTop: "max(4rem, env(safe-area-inset-top))" }}>
          <motion.button
            type="button"
            aria-label="Close search"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Product search"
            initial={{ y: -16, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -16, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-[116] flex max-h-[calc(100dvh-5.5rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl"
          >
            <form onSubmit={handleSubmit} role="search" className="flex items-center gap-2 border-b border-stone-200 px-4 py-3 sm:px-5">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0 text-stone-400" aria-hidden="true">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <label htmlFor="site-search" className="sr-only">Search products</label>
              <input
                id="site-search"
                ref={inputRef}
                type="search"
                role="combobox"
                aria-expanded={showResults}
                aria-controls="site-search-results"
                aria-activedescendant={activeIndex >= 0 ? `search-option-${activeIndex}` : undefined}
                autoComplete="off"
                enterKeyHint="search"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setActiveIndex(-1);
                }}
                onKeyDown={onInputKeyDown}
                placeholder="Kurti, saree, Bagru, lal suit khoje…"
                className="min-h-11 min-w-0 flex-1 bg-transparent text-sm text-stone-900 placeholder-stone-400 focus:outline-none"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setActiveIndex(-1);
                    inputRef.current?.focus();
                  }}
                  aria-label="Clear search"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-stone-400 transition hover:bg-stone-100 hover:text-stone-700"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12" /></svg>
                </button>
              )}
              <button type="button" onClick={handleClose} aria-label="Close search" className="min-h-11 shrink-0 rounded-lg bg-stone-100 px-3 text-xs font-semibold text-stone-500 transition hover:bg-stone-200 hover:text-stone-700">
                ESC
              </button>
            </form>

            <div className="sr-only" role="status" aria-live="polite">
              {searching ? "Khoj jaari hai" : showResults ? `${totalResults} parinaam mile` : showNoResults ? `“${trimmedQuery}” ke liye koi parinaam nahi mila` : ""}
            </div>

            {showResults ? (
              <div className="overflow-y-auto" id="site-search-results">
                <div className="flex items-center justify-between px-5 pb-2 pt-4">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">
                    {searching ? "Khoj jaari hai…" : totalResults > results.length ? `${totalResults} me se behtareen ${results.length}` : `${results.length} result${results.length === 1 ? "" : "s"}`}
                  </span>
                  <span className="hidden text-[10px] text-stone-400 sm:block">↑ ↓ se chune, Enter dabaye</span>
                </div>
                <ul role="listbox" aria-label="Search results">
                  {results.map((product, index) => {
                    const availableSizes = [...new Set((product.variants ?? []).filter((variant) => variant.size && (variant.available === undefined || variant.available > 0)).map((variant) => variant.size as string))];
                    const colors = [...new Set((product.variants ?? []).map((variant) => variant.color).filter(Boolean))];
                    const allKnownUnavailable = (product.variants ?? []).length > 0 && (product.variants ?? []).every((variant) => variant.available === 0);
                    const discount = product.originalPrice > product.price ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) : 0;
                    const active = activeIndex === index;
                    return (
                      <li key={product.id} role="presentation">
                        <Link
                          id={`search-option-${index}`}
                          role="option"
                          aria-selected={active}
                          href={`/product/${product.slug}`}
                          onClick={(event) => {
                            event.preventDefault();
                            goToProduct(product);
                          }}
                          onMouseEnter={() => setActiveIndex(index)}
                          className={`group flex items-center gap-4 px-5 py-3 transition ${active ? "bg-[#881337]/5" : "hover:bg-stone-50"}`}
                        >
                          <span className="relative h-14 w-12 flex-shrink-0 overflow-hidden rounded-lg border border-stone-100 bg-stone-100">
                            {product.image && <Image src={product.image} alt="" width={48} height={56} unoptimized sizes="48px" className="h-full w-full object-cover object-top" />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className={`block truncate text-sm font-medium transition ${active ? "text-[#881337]" : "text-stone-900 group-hover:text-[#881337]"}`}>
                              <HighlightedTitle title={product.title} query={searchedTerm || trimmedQuery} />
                            </span>
                            <span className="mt-0.5 block truncate text-[11px] text-stone-500">
                              {[categoryLabel(product.category), product.fabric, colors.slice(0, 2).join(", ")].filter(Boolean).join(" · ") || product.fabric}
                            </span>
                            <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                              <span className="text-sm font-bold text-[#881337]">{formatPrice(product.price)}</span>
                              {product.originalPrice > product.price && <span className="text-xs text-stone-400 line-through">{formatPrice(product.originalPrice)}</span>}
                              {discount > 0 && <span className="text-[11px] font-bold text-emerald-700">{discount}% off</span>}
                              {allKnownUnavailable
                                ? <span className="text-[11px] font-semibold text-amber-700">Abhi uplabdh nahi</span>
                                : availableSizes.length > 0 && <span className="text-[11px] text-stone-500">Sizes: {availableSizes.slice(0, 5).join(", ")}</span>}
                              {product.reviewsCount > 0 && product.rating > 0 && <span className="text-[11px] text-amber-600">★ {product.rating.toFixed(1)} ({product.reviewsCount})</span>}
                            </span>
                          </span>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`flex-shrink-0 transition ${active ? "text-[#881337]" : "text-stone-300 group-hover:text-[#881337]"}`} aria-hidden="true"><path d="M9 18l6-6-6-6" /></svg>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
                <div className="border-t border-stone-100 px-5 py-3">
                  <button
                    type="button"
                    id={`search-option-${results.length}`}
                    role="option"
                    aria-selected={activeIndex === results.length}
                    onMouseEnter={() => setActiveIndex(results.length)}
                    onClick={() => goToSearchPage(trimmedQuery)}
                    className={`min-h-11 w-full rounded-xl text-center text-sm font-semibold transition ${activeIndex === results.length ? "bg-[#881337]/5 text-[#881337]" : "text-[#881337] hover:underline"}`}
                  >
                    “{trimmedQuery}” ke saare {totalResults > results.length ? `${totalResults} ` : ""}results dekhe →
                  </button>
                </div>
              </div>
            ) : searchError ? (
              <div className="px-5 py-10 text-center" role="alert">
                <p className="text-sm leading-relaxed text-stone-600">{searchError}</p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <button type="button" onClick={() => setRetryNonce((value) => value + 1)} className="min-h-11 rounded-full bg-[#881337] px-5 text-sm font-semibold text-white">Dobara koshish kare</button>
                  <Link href="/products" onClick={handleClose} className="inline-flex min-h-11 items-center rounded-full border border-stone-300 px-5 text-sm font-semibold text-stone-700">Saare products dekhe</Link>
                </div>
              </div>
            ) : showNoResults ? (
              <div className="overflow-y-auto px-5 py-8">
                <div className="text-center">
                  <p className="text-sm leading-relaxed text-stone-600">“<strong className="text-stone-800">{trimmedQuery}</strong>” ke liye kuch nahi mila.</p>
                  <p className="mt-1 text-xs leading-relaxed text-stone-400">Spelling jaanche, ya kam shabdon me khoje — jaise sirf “kurti” ya “mul cotton”.</p>
                </div>
                {queryWords.length > 1 && (
                  <div className="mt-5">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">Yeh khoj kar dekhe</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {[...new Set([queryWords[0], queryWords[queryWords.length - 1], queryWords.slice(0, -1).join(" ")])].filter(Boolean).map((suggestion) => (
                        <button key={suggestion} type="button" onClick={() => setQuery(suggestion)} className="min-h-10 rounded-full border border-stone-200 px-3.5 text-xs font-semibold text-stone-700 transition hover:border-[#881337] hover:text-[#881337]">{suggestion}</button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="mt-5">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">Categories browse kare</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {CATEGORY_SUGGESTIONS.map((category) => (
                      <Link key={category.href} href={category.href} onClick={handleClose} className="inline-flex min-h-10 items-center rounded-full bg-stone-100 px-3.5 text-xs font-semibold text-stone-700 transition hover:bg-[#881337] hover:text-white">{category.label}</Link>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-5 overflow-y-auto px-5 py-5">
                {trimmedQuery.length === 1 && <p className="text-xs font-medium text-stone-500">Kam se kam 2 akshar likhe — khoj apne aap shuru ho jayegi.</p>}
                {searching && <p className="text-sm text-stone-500">Khoj jaari hai…</p>}

                {recentSearches.length > 0 && (
                  <section aria-label="Recent searches">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">Haal ki khoj</h3>
                      <button type="button" onClick={clearRecentSearches} className="min-h-9 text-[11px] font-semibold text-stone-400 hover:text-[#881337]">Saaf kare</button>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {recentSearches.map((term) => (
                        <button key={term} type="button" onClick={() => setQuery(term)} className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-stone-200 px-3.5 text-xs font-medium text-stone-700 transition hover:border-[#881337] hover:text-[#881337]">
                          <span aria-hidden="true">↺</span>{term}
                        </button>
                      ))}
                    </div>
                  </section>
                )}

                <section aria-label="Search suggestions">
                  <h3 className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">Khoj ke sujhav</h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {QUICK_SEARCHES.map((term) => (
                      <button key={term} type="button" onClick={() => setQuery(term)} className="min-h-10 rounded-full bg-[#881337]/5 px-3.5 text-xs font-semibold text-[#881337] transition hover:bg-[#881337] hover:text-white">{term}</button>
                    ))}
                  </div>
                </section>

                <section aria-label="Popular categories">
                  <h3 className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">Collections</h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {CATEGORY_SUGGESTIONS.map((category) => (
                      <Link key={category.href} href={category.href} onClick={handleClose} className="inline-flex min-h-10 items-center rounded-full border border-stone-200 px-3.5 text-xs font-semibold text-stone-700 transition hover:border-[#881337] hover:text-[#881337]">{category.label} →</Link>
                    ))}
                  </div>
                </section>

                <p className="text-[11px] leading-relaxed text-stone-400">Tip: rang, fabric ya size bhi likh sakte hain — “lal mul kurti M”, ya seedha product code (SKU).</p>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
