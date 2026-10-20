"use client";

import { useCallback, useState, useMemo, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useCatalogue } from "../../lib/use-storefront";
import LivingProductCard from "../../components/LivingProductCard";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext";
import Link from "next/link";
import { api, isApiConfigured, type StoreCategory } from "../../lib/api-client";
import type { Product } from "../../lib/storefront-types";
import { ProductGridSkeleton, ListingSkeleton } from "../../components/Skeletons";
import { useModalDialog } from "../../lib/use-modal-dialog";

const FALLBACK_CATEGORIES = [
  { key: "mul-cotton", label: "Mul Cotton" },
  { key: "festive", label: "Festive Edit" },
  { key: "coord-sets", label: "Co-ord Sets" },
  { key: "anarkalis", label: "Anarkalis" },
];

/** Apparel sizes in shopper order; anything else the catalogue carries sorts after these. */
const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL", "2XL", "3XL", "4XL", "5XL", "Free Size"];

/**
 * Everyday words shoppers actually type, mapped to the catalogue's own vocabulary — a search for
 * "lal kurti" or "haldi dress" should find maroon/red and yellow pieces instead of nothing.
 */
const SEARCH_SYNONYMS: Record<string, string[]> = {
  lal: ["red", "maroon"],
  gulabi: ["pink"],
  peela: ["yellow"],
  peeli: ["yellow"],
  haldi: ["yellow", "haldi"],
  hari: ["green"],
  hara: ["green"],
  neela: ["blue", "navy"],
  neeli: ["blue", "navy"],
  kala: ["black"],
  safed: ["white", "ivory", "cream"],
  shadi: ["festive", "party", "wedding"],
  shaadi: ["festive", "party", "wedding"],
  sangeet: ["festive", "party"],
  mehndi: ["green", "festive"],
  tyohar: ["festive"],
  suti: ["cotton", "mul"],
  reshmi: ["silk", "chanderi"],
};

const SORT_OPTIONS = [
  { value: "featured", label: "Featured" },
  { value: "price-low", label: "Price: Low to High" },
  { value: "price-high", label: "Price: High to Low" },
  { value: "rating", label: "Top Rated" },
  { value: "new", label: "New Arrivals" },
  { value: "discount", label: "Highest Discount" },
];

const PRICE_RANGES = [
  { label: "All Prices", min: 0, max: Infinity },
  { label: "Under ₹1,499", min: 0, max: 1499 },
  { label: "₹1,500 – ₹1,999", min: 1500, max: 1999 },
  { label: "₹2,000 – ₹2,999", min: 2000, max: 2999 },
  { label: "₹3,000 & Above", min: 3000, max: Infinity },
];

function ProductsContent({ initialProducts, initialCategories = [] }: { initialProducts?: Product[]; initialCategories?: StoreCategory[] }) {
  const { addToCart, toggleWishlist, isInWishlist, setQuickViewProduct } = useCart();
  const { user } = useAuth();
  const preferredSize = user?.preferences?.preferredSize;
  const searchParams = useSearchParams();
  const router = useRouter();
  const catalogue = useCatalogue(
    { category: searchParams.get("category") || undefined, q: searchParams.get("search") || undefined, allPages: true },
    { initialData: initialProducts }
  );
  const products = catalogue.data;
  const [categories, setCategories] = useState<StoreCategory[]>(initialCategories);

  useEffect(() => {
    if (!isApiConfigured() || initialCategories.length) return;
    const controller = new AbortController();
    void api.categories(controller.signal)
      .then(({ data }) => setCategories(data))
      .catch((cause: unknown) => {
        if ((cause as Error)?.name !== "AbortError") console.error("Could not load storefront categories", cause);
      });
    return () => controller.abort();
    // initialCategories only seeds the first render; refetching is intentionally mount-only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const categoryOptions = [
    { key: "all", label: "All Products" },
    ...(categories.length
      ? categories.map((category) => ({ key: category.slug, label: category.name }))
      : FALLBACK_CATEGORIES),
  ];

  // Initialize state from URL params
  const [activeCategory, setActiveCategory] = useState(() => 
    searchParams.get("category") || "all"
  );
  const [activePriceRange, setActivePriceRange] = useState(() => {
    const priceParam = searchParams.get("price");
    if (!priceParam) return 0;
    const matchingRange = PRICE_RANGES.findIndex((range) => range.label === priceParam);
    return matchingRange >= 0 ? matchingRange : 0;
  });
  const [activeFabric, setActiveFabric] = useState(() => 
    searchParams.get("fabric") || "All Fabrics"
  );
  const [sortBy, setSortBy] = useState(() => 
    searchParams.get("sort") || "featured"
  );
  const [selectedSizes, setSelectedSizes] = useState<Record<string, string>>({});
  const [activeSizeFilters, setActiveSizeFilters] = useState<string[]>(() =>
    (searchParams.get("sizes") || "").split(",").map((size) => size.trim()).filter(Boolean)
  );
  const [activeColor, setActiveColor] = useState(() => searchParams.get("color") || "All Colours");
  const [inStockOnly, setInStockOnly] = useState(() => searchParams.get("availability") === "in-stock");
  const [onSaleOnly, setOnSaleOnly] = useState(() => searchParams.get("offer") === "sale");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const closeFilters = useCallback(() => setFiltersOpen(false), []);
  const filtersDialogRef = useModalDialog<HTMLDivElement>(filtersOpen, closeFilters);
  const [searchQuery, setSearchQuery] = useState(() => 
    searchParams.get("search") || ""
  );

  /*
   * Keep local filter state synchronized when the URL changes underneath the mounted listing
   * (navbar/search links, browser back/forward). Adjusting during render avoids one stale frame
   * and an effect cascade; the URL-mirror effect below writes the exact same values back.
   */
  const searchParamsString = searchParams.toString();
  const [syncedSearchParams, setSyncedSearchParams] = useState(searchParamsString);
  if (searchParamsString !== syncedSearchParams) {
    setSyncedSearchParams(searchParamsString);
    setSearchQuery(searchParams.get("search") || searchParams.get("q") || "");
    setActiveCategory(searchParams.get("category") || "all");
    const priceParam = searchParams.get("price");
    const matchingRange = priceParam ? PRICE_RANGES.findIndex((range) => range.label === priceParam) : 0;
    setActivePriceRange(matchingRange >= 0 ? matchingRange : 0);
    setActiveFabric(searchParams.get("fabric") || "All Fabrics");
    setSortBy(searchParams.get("sort") || "featured");
    setActiveSizeFilters((searchParams.get("sizes") || "").split(",").map((size) => size.trim()).filter(Boolean));
    setActiveColor(searchParams.get("color") || "All Colours");
    setInStockOnly(searchParams.get("availability") === "in-stock");
    setOnSaleOnly(searchParams.get("offer") === "sale");
  }

  /**
   * Mirrors the filter state into the URL so a filtered listing is shareable and survives a refresh.
   */
  useEffect(() => {
    const desired = new URLSearchParams();
    const filters: Record<string, string> = {
      category: activeCategory,
      price: activePriceRange > 0 ? PRICE_RANGES[activePriceRange].label : "",
      fabric: activeFabric,
      sort: sortBy,
      search: searchQuery,
      sizes: activeSizeFilters.join(","),
      color: activeColor,
      availability: inStockOnly ? "in-stock" : "",
      offer: onSaleOnly ? "sale" : "",
    };

    // Anything at its neutral value is dropped, so the default listing keeps a clean /products URL.
    for (const [key, value] of Object.entries(filters)) {
      const neutral = !value || value === "all" || value === "All Fabrics" || value === "All Colours" || value === "featured";
      if (neutral) continue;
      desired.set(key, value);
    }

    const desiredQuery = desired.toString();
    if (desiredQuery === searchParams.toString()) return;
    router.replace(`/products${desiredQuery ? `?${desiredQuery}` : ""}`, { scroll: false });
  }, [router, searchParams, activeCategory, activePriceRange, activeFabric, sortBy, searchQuery, activeSizeFilters, activeColor, inStockOnly, onSaleOnly]);

  const priceRange = PRICE_RANGES[activePriceRange];

  /**
   * Facets are derived from the catalogue actually loaded — never a hardcoded list. Fabric names,
   * colours and sizes come from the ERP-fed product data, so a new fabric or size appears as a
   * filter the moment its first product is published, with no code change.
   */
  const fabricOptions = useMemo(() => {
    const found = [...new Set(products.map((product) => product.fabric).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    const options = ["All Fabrics", ...found];
    if (activeFabric !== "All Fabrics" && !options.includes(activeFabric)) options.push(activeFabric);
    return options;
  }, [products, activeFabric]);

  const sizeOptions = useMemo(() => {
    const found = new Set<string>();
    for (const product of products) {
      for (const size of product.sizes) found.add(size);
      for (const variant of product.variants ?? []) if (variant.size) found.add(variant.size);
    }
    for (const size of activeSizeFilters) found.add(size);
    return [...found].sort((a, b) => {
      const rankA = SIZE_ORDER.indexOf(a.toUpperCase());
      const rankB = SIZE_ORDER.indexOf(b.toUpperCase());
      if (rankA !== -1 || rankB !== -1) return (rankA === -1 ? SIZE_ORDER.length : rankA) - (rankB === -1 ? SIZE_ORDER.length : rankB);
      return a.localeCompare(b);
    });
  }, [products, activeSizeFilters]);

  const colorOptions = useMemo(() => {
    const found = new Set<string>();
    for (const product of products) {
      for (const variant of product.variants ?? []) {
        if (variant.color && variant.color.toLowerCase() !== "as shown") found.add(variant.color);
      }
    }
    const options = ["All Colours", ...[...found].sort((a, b) => a.localeCompare(b))];
    if (activeColor !== "All Colours" && !options.includes(activeColor)) options.push(activeColor);
    return options;
  }, [products, activeColor]);

  const toggleSizeFilter = (size: string) =>
    setActiveSizeFilters((current) => (current.includes(size) ? current.filter((value) => value !== size) : [...current, size]));

  /** Real sellable stock when the API reported it; unknown availability is never treated as sold out. */
  const hasSellableStock = (product: Product): boolean => {
    const known = (product.variants ?? []).filter((variant) => typeof variant.available === "number");
    if (!known.length) return true;
    return known.some((variant) => (variant.available ?? 0) > 0);
  };

  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Category filter
    if (activeCategory !== "all") {
      result = result.filter((p) => p.category === activeCategory);
    }

    // Price filter
    result = result.filter(
      (p) => p.price >= priceRange.min && p.price <= priceRange.max
    );

    // Fabric filter
    if (activeFabric !== "All Fabrics") {
      result = result.filter((p) => p.fabric === activeFabric);
    }

    // Size filter — the size must exist *and* be sellable when stock is known.
    if (activeSizeFilters.length) {
      result = result.filter((p) =>
        (p.variants ?? []).some(
          (variant) => variant.size && activeSizeFilters.includes(variant.size) && (typeof variant.available !== "number" || variant.available > 0)
        ) || (!p.variants?.length && p.sizes.some((size) => activeSizeFilters.includes(size)))
      );
    }

    // Colour filter
    if (activeColor !== "All Colours") {
      result = result.filter((p) =>
        (p.variants ?? []).some((variant) => variant.color?.toLowerCase() === activeColor.toLowerCase())
      );
    }

    if (inStockOnly) result = result.filter((p) => hasSellableStock(p));
    if (onSaleOnly) result = result.filter((p) => p.originalPrice > p.price);

    // Search filter: every typed word must match (after Hinglish synonym expansion), anywhere in
    // the product's own words — so "lal kurti" finds maroon kurtis, not zero results.
    if (searchQuery.trim()) {
      const groups = searchQuery
        .toLowerCase()
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((word) => [word, ...(SEARCH_SYNONYMS[word] ?? [])]);
      result = result.filter((p) => {
        const haystack = [
          p.title,
          p.fabric,
          p.description,
          p.category ?? "",
          p.slug ?? "",
          ...(p.variants ?? []).flatMap((variant) => [variant.sku ?? "", variant.color ?? "", variant.size ?? ""]),
        ]
          .join(" ")
          .toLowerCase();
        return groups.every((group) => group.some((term) => haystack.includes(term)));
      });
    }

    // Sorting
    switch (sortBy) {
      case "price-low":
        result.sort((a, b) => a.price - b.price);
        break;
      case "price-high":
        result.sort((a, b) => b.price - a.price);
        break;
      case "rating":
        result.sort((a, b) => b.rating - a.rating);
        break;
      case "new":
        result.sort((a, b) => (b.badge === "NEW LAUNCH" ? 1 : 0) - (a.badge === "NEW LAUNCH" ? 1 : 0));
        break;
      case "discount":
        result.sort(
          (a, b) =>
            (b.originalPrice > 0 ? (b.originalPrice - b.price) / b.originalPrice : 0) -
            (a.originalPrice > 0 ? (a.originalPrice - a.price) / a.originalPrice : 0)
        );
        break;
    }

    return result;
    // `products` was missing here, so the memo kept the first catalogue it saw and never recomputed
    // when the live data replaced the demo fallback. `activePriceRange` is not listed because the body
    // reads the derived `priceRange`, which is indexed from a module constant and so changes identity
    // exactly when `activePriceRange` does.
    // hasSellableStock is a pure read of the product argument, safe to leave unlisted.
  }, [products, activeCategory, activeFabric, sortBy, searchQuery, priceRange, activeSizeFilters, activeColor, inStockOnly, onSaleOnly]);

  const activeFilterCount = [
    activeCategory !== "all",
    activePriceRange !== 0,
    activeFabric !== "All Fabrics",
    activeSizeFilters.length > 0,
    activeColor !== "All Colours",
    inStockOnly,
    onSaleOnly,
  ].filter(Boolean).length;

  const clearAllFilters = () => {
    setActiveCategory("all");
    setActivePriceRange(0);
    setActiveFabric("All Fabrics");
    setActiveSizeFilters([]);
    setActiveColor("All Colours");
    setInStockOnly(false);
    setOnSaleOnly(false);
    setSearchQuery("");
  };

  const activeChips: { label: string; clear: () => void }[] = [
    ...(activeCategory !== "all"
      ? [{ label: categoryOptions.find((option) => option.key === activeCategory)?.label ?? activeCategory, clear: () => setActiveCategory("all") }]
      : []),
    ...(activePriceRange !== 0 ? [{ label: PRICE_RANGES[activePriceRange].label, clear: () => setActivePriceRange(0) }] : []),
    ...(activeFabric !== "All Fabrics" ? [{ label: activeFabric, clear: () => setActiveFabric("All Fabrics") }] : []),
    ...activeSizeFilters.map((size) => ({ label: `Size ${size}`, clear: () => toggleSizeFilter(size) })),
    ...(activeColor !== "All Colours" ? [{ label: activeColor, clear: () => setActiveColor("All Colours") }] : []),
    ...(inStockOnly ? [{ label: "In stock only", clear: () => setInStockOnly(false) }] : []),
    ...(onSaleOnly ? [{ label: "On sale", clear: () => setOnSaleOnly(false) }] : []),
    ...(searchQuery.trim() ? [{ label: `“${searchQuery.trim()}”`, clear: () => setSearchQuery("") }] : []),
  ];

  const activeCategoryLabel =
    categoryOptions.find((option) => option.key === activeCategory)?.label ?? "Our Collection";


  const facetButtonClass = (active: boolean) =>
    `min-h-11 w-full text-left text-sm px-3 py-2 rounded-lg transition leading-snug ${
      active ? "bg-[#881337]/10 text-[#881337] font-medium" : "text-gray-700 hover:bg-gray-100"
    }`;

  const renderExtraFilters = () => (
    <>
      {/* Size — with real per-size stock when the API reported it */}
      {sizeOptions.length > 0 && (
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Size</h3>
          <div className="flex flex-wrap gap-2">
            {sizeOptions.map((size) => {
              const active = activeSizeFilters.includes(size);
              return (
                <button
                  key={size}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleSizeFilter(size)}
                  className={`min-h-11 min-w-11 rounded-lg border px-3 text-sm font-medium transition ${
                    active
                      ? "border-[#881337] bg-[#881337] text-white"
                      : "border-gray-200 bg-white text-gray-700 hover:border-gray-400"
                  }`}
                >
                  {size}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Colour */}
      {colorOptions.length > 1 && (
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Colour</h3>
          <div className="space-y-1.5">
            {colorOptions.map((color) => (
              <button key={color} type="button" aria-pressed={activeColor === color} onClick={() => setActiveColor(color)} className={facetButtonClass(activeColor === color)}>
                {color}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Availability & offers */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Availability &amp; Offers</h3>
        <div className="space-y-1.5">
          <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-3 text-sm text-gray-700 transition hover:bg-gray-100">
            <input type="checkbox" checked={inStockOnly} onChange={(event) => setInStockOnly(event.target.checked)} className="h-4 w-4 shrink-0 accent-[#881337]" />
            In stock only
          </label>
          <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-3 text-sm text-gray-700 transition hover:bg-gray-100">
            <input type="checkbox" checked={onSaleOnly} onChange={(event) => setOnSaleOnly(event.target.checked)} className="h-4 w-4 shrink-0 accent-[#881337]" />
            On sale
          </label>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-[#faf7f2]">
      {/* ── Page Header ── */}
      <div className="bg-gradient-to-br from-[#1c1917] via-[#3d2012] to-[#881337] text-white py-16 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-[10px] uppercase tracking-[0.4em] text-[#dfc28c] mb-3 font-semibold">
            Handcrafted in Guna
          </p>
          <h1 className="font-serif text-4xl sm:text-5xl font-light mb-4">
            {activeCategory === "all" ? "Our Collection" : activeCategoryLabel}
          </h1>
          <p className="text-white/60 text-sm max-w-md mx-auto">
            {catalogue.loading && products.length === 0
              ? "Loading our handcrafted pieces…"
              : catalogue.error
                ? "We are having a little trouble loading the collection — please try again in a moment."
                : `Discover ${filteredProducts.length} handcrafted ${filteredProducts.length === 1 ? "piece" : "pieces"}`}
          </p>
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs text-white/50">
            <Link href="/" className="hover:text-white transition">Home</Link>
            <span aria-hidden="true">/</span>
            {activeCategory === "all" ? (
              <span aria-current="page" className="text-white/80">Our Collection</span>
            ) : (
              <>
                <Link href="/products" className="hover:text-white transition">Our Collection</Link>
                <span aria-hidden="true">/</span>
                <Link href={`/collections/${encodeURIComponent(activeCategory)}`} aria-current="page" className="text-white/80 hover:text-white">{activeCategoryLabel}</Link>
              </>
            )}
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ── Top Bar: Search + Sort + Filter Toggle ── */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          {/* Search */}
          <div className="relative flex-1">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <label htmlFor="catalogue-search" className="sr-only">Search products</label>
            <input
              id="catalogue-search"
              type="search"
              placeholder="Search fabrics, prints, styles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="min-h-11 w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-[#881337]/20 focus:border-[#881337]"
            />
            {searchQuery && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setSearchQuery("")}
                className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            )}
          </div>

          {/* Sort */}
          <label htmlFor="catalogue-sort" className="sr-only">Sort products</label>
          <select
            id="catalogue-sort"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="min-h-11 px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#881337]/20 focus:border-[#881337] min-w-[180px]"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Filter Toggle (mobile) */}
          <button
            type="button"
            aria-expanded={filtersOpen}
            aria-controls="mobile-filters"
            onClick={() => setFiltersOpen(!filtersOpen)}
            className="sm:hidden flex min-h-11 items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="8" y1="12" x2="16" y2="12" />
              <line x1="10" y1="18" x2="14" y2="18" />
            </svg>
            Filters
            {activeFilterCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-[#881337] text-white text-[10px] flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* ── Category Pills ── */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-none">
          {categoryOptions.map((cat) => (
            <button
              key={cat.key}
              type="button"
              aria-pressed={activeCategory === cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={`min-h-11 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition flex-shrink-0 ${
                activeCategory === cat.key
                  ? "bg-[#881337] text-white shadow"
                  : "bg-white border border-gray-200 text-gray-700 hover:border-gray-300"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="flex gap-8">
          {/* ── Sidebar Filters (Desktop) ── */}
          <aside className="hidden sm:block w-56 flex-shrink-0 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 text-sm">Filters</h2>
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="inline-flex min-h-11 items-center px-2 text-xs font-semibold text-[#881337] hover:underline"
                >
                  Clear all
                </button>
              )}
            </div>

            {/* Price Range */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
                Price Range
              </h3>
              <div className="space-y-1.5">
                {PRICE_RANGES.map((range, i) => (
                  <button
                    key={range.label}
                    type="button"
                    aria-pressed={activePriceRange === i}
                    onClick={() => setActivePriceRange(i)}
                    className={`min-h-11 w-full rounded-lg px-3 py-2.5 text-left text-sm transition ${
                      activePriceRange === i
                        ? "bg-[#881337]/10 text-[#881337] font-medium"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {range.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Fabric */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
                Fabric
              </h3>
              <div className="space-y-1.5">
                {fabricOptions.map((fabric) => (
                  <button
                    key={fabric}
                    type="button"
                    aria-pressed={activeFabric === fabric}
                    onClick={() => setActiveFabric(fabric)}
                    className={`min-h-11 w-full rounded-lg px-3 py-2.5 text-left text-sm leading-snug transition ${
                      activeFabric === fabric
                        ? "bg-[#881337]/10 text-[#881337] font-medium"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {fabric}
                  </button>
                ))}
              </div>
            </div>
            {renderExtraFilters()}
          </aside>

          {/* ── Mobile Filters Drawer ── */}
          <AnimatePresence>
            {filtersOpen && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={closeFilters}
                  className="fixed inset-0 z-40 bg-black/50 sm:hidden"
                />
                <motion.div
                  ref={filtersDialogRef}
                  id="mobile-filters"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="mobile-filters-title"
                  tabIndex={-1}
                  initial={{ x: "-100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "-100%" }}
                  className="fixed bottom-0 left-0 top-0 z-50 h-[100dvh] w-[88vw] max-w-80 space-y-6 overflow-y-auto bg-white p-5 focus:outline-none sm:hidden"
                >
                  <div className="flex items-center justify-between">
                    <h2 id="mobile-filters-title" className="font-semibold text-gray-900">Filters</h2>
                    <button type="button" aria-label="Filters band kare" onClick={closeFilters} className="flex h-11 w-11 items-center justify-center">✕</button>
                  </div>
                  {activeFilterCount > 0 && (
                    <button type="button" onClick={clearAllFilters} className="inline-flex min-h-11 items-center px-2 text-sm font-semibold text-[#881337]">
                      Clear all filters
                    </button>
                  )}
                  {/* Price Range */}
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Price Range</h3>
                    <div className="space-y-1.5">
                      {PRICE_RANGES.map((range, i) => (
                        <button
                          key={range.label}
                          type="button"
                          aria-pressed={activePriceRange === i}
                          onClick={() => setActivePriceRange(i)}
                          className={`min-h-11 w-full rounded-lg px-3 py-2.5 text-left text-sm transition ${
                            activePriceRange === i ? "bg-[#881337]/10 text-[#881337] font-medium" : "text-gray-700 hover:bg-gray-100"
                          }`}
                        >
                          {range.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Fabric */}
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Fabric</h3>
                    <div className="space-y-1.5">
                      {fabricOptions.map((fabric) => (
                        <button
                          key={fabric}
                          type="button"
                          aria-pressed={activeFabric === fabric}
                          onClick={() => setActiveFabric(fabric)}
                          className={`min-h-11 w-full rounded-lg px-3 py-2.5 text-left text-sm leading-snug transition ${
                            activeFabric === fabric ? "bg-[#881337]/10 text-[#881337] font-medium" : "text-gray-700 hover:bg-gray-100"
                          }`}
                        >
                          {fabric}
                        </button>
                      ))}
                    </div>
                  </div>
                  {renderExtraFilters()}
                  <button type="button" onClick={closeFilters} className="sticky bottom-0 min-h-12 w-full rounded-xl bg-[#881337] px-4 py-2.5 text-sm font-semibold text-white">
                    View {filteredProducts.length} {filteredProducts.length === 1 ? "product" : "products"}
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* ── Product Grid ── */}
          <div className="flex-1 min-w-0">
            {/* Result Count */}
            <div className="flex items-center justify-between mb-4">
              <p aria-live="polite" className="text-sm text-gray-600">
                {filteredProducts.length === 0
                  ? "No products found"
                  : `${filteredProducts.length} product${filteredProducts.length !== 1 ? "s" : ""}`}
                {searchQuery && ` for "${searchQuery}"`}
              </p>
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="hidden min-h-11 items-center px-2 text-xs font-semibold text-[#881337] hover:underline sm:inline-flex"
                >
                  Clear filters
                </button>
              )}
            </div>

            {activeChips.length > 0 && (
              <ul aria-label="Active filters" className="mb-4 flex flex-wrap gap-2">
                {activeChips.map((chip) => (
                  <li key={chip.label}>
                    <button
                      type="button"
                      onClick={chip.clear}
                      aria-label={`Remove filter ${chip.label}`}
                      className="flex min-h-11 items-center gap-1.5 rounded-full border border-[#881337]/25 bg-[#881337]/5 px-3.5 text-xs font-medium text-[#881337]"
                    >
                      {chip.label} <span aria-hidden="true">✕</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {catalogue.loading && products.length === 0 ? (
              <ProductGridSkeleton count={8} />
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-24">
                <div className="text-5xl mb-4">🧵</div>
                <h2 className="text-lg font-serif text-gray-900 mb-2">
                  {catalogue.error ? "The collection could not be loaded" : "No pieces match those filters yet"}
                </h2>
                <p className="text-gray-500 text-sm mb-6">
                  {catalogue.error
                    ? "Please try again in a moment — or message us and we will help you find your piece."
                    : "Try removing a size, colour or price filter — or browse a few loved pieces below."}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  {catalogue.error ? (
                    <button type="button" onClick={catalogue.refresh} className="min-h-11 rounded-xl bg-[#881337] px-6 py-2 text-sm font-medium text-white transition hover:bg-[#701a35]">
                      Try again
                    </button>
                  ) : (
                    <button type="button" onClick={clearAllFilters} className="min-h-11 rounded-xl bg-[#881337] px-6 py-2 text-sm font-medium text-white transition hover:bg-[#701a35]">
                      Clear All Filters
                    </button>
                  )}
                  <Link href="/contact" className="flex min-h-11 items-center rounded-xl border border-gray-200 bg-white px-5 text-sm font-medium text-gray-800">
                    Ask us for help
                  </Link>
                </div>
                {!catalogue.error && products.length > 0 && (
                  <div className="mt-14 text-left">
                    <h3 className="mb-4 text-center font-serif text-lg text-gray-900">You may also like</h3>
                    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                      {products.slice(0, 4).map((product) => (
                        <LivingProductCard
                          key={product.id}
                          product={product}
                          isWish={isInWishlist(product.id)}
                          toggleWishlist={toggleWishlist}
                          onQuickView={setQuickViewProduct}
                          onAddToCart={addToCart}
                          selectedSize={selectedSizes[product.id] ?? (preferredSize && product.sizes.includes(preferredSize) ? preferredSize : undefined)}
                          onSelectSize={(id, size) => setSelectedSizes((prev) => ({ ...prev, [id]: size }))}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <motion.div
                layout
                className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4"
              >
                <AnimatePresence>
                  {filteredProducts.map((product) => (
                    <motion.div
                      key={product.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                    >
                      <LivingProductCard
                        product={product}
                        isWish={isInWishlist(product.id)}
                        toggleWishlist={toggleWishlist}
                        onQuickView={setQuickViewProduct}
                        onAddToCart={addToCart}
                        selectedSize={selectedSizes[product.id] ?? (preferredSize && product.sizes.includes(preferredSize) ? preferredSize : undefined)}
                        onSelectSize={(id, size) =>
                          setSelectedSizes((prev) => ({ ...prev, [id]: size }))
                        }
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Loading component for Suspense fallback
function ProductsLoading() {
  return <ListingSkeleton />;
}

/**
 * The interactive catalogue listing.
 *
 * Moved out of `page.tsx` so that file can be a Server Component and export `generateMetadata` for
 * the category pages — `useSearchParams()` in a `"use client"` module rules that out. `Suspense`
 * stays here because `useSearchParams` needs it during prerendering.
 */
export default function ProductsView({
  initialProducts,
  initialCategories = [],
}: {
  initialProducts?: Product[];
  initialCategories?: StoreCategory[];
} = {}) {
  return (
    <Suspense fallback={<ProductsLoading />}>
      <ProductsContent initialProducts={initialProducts} initialCategories={initialCategories} />
    </Suspense>
  );
}
