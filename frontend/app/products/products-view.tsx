"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useCatalogue } from "../../lib/use-storefront";
import LivingProductCard from "../../components/LivingProductCard";
import { useCart } from "../../context/CartContext";
import Link from "next/link";

const CATEGORIES = [
  { key: "all", label: "All Products" },
  { key: "mul-cotton", label: "Mul Cotton" },
  { key: "festive", label: "Festive Edit" },
  { key: "coord-sets", label: "Co-ord Sets" },
  { key: "anarkalis", label: "Anarkalis" },
];

const FABRICS = [
  "All Fabrics",
  "100% Pure Jaipuri Mul Cotton",
  "Chanderi Silk & Mul Voile Lining",
  "100% Dabu Mud-Resist Mul Cotton",
  "Fine Woven Mul Cotton",
  "Pure Silk Chanderi",
];

const SORT_OPTIONS = [
  { value: "featured", label: "Featured" },
  { value: "price-low", label: "Price: Low to High" },
  { value: "price-high", label: "Price: High to Low" },
  { value: "rating", label: "Top Rated" },
  { value: "new", label: "New Arrivals" },
];

const PRICE_RANGES = [
  { label: "All Prices", min: 0, max: Infinity },
  { label: "Under ₹1,499", min: 0, max: 1499 },
  { label: "₹1,500 – ₹1,999", min: 1500, max: 1999 },
  { label: "₹2,000 – ₹2,999", min: 2000, max: 2999 },
  { label: "₹3,000 & Above", min: 3000, max: Infinity },
];

function ProductsContent() {
  const { addToCart, toggleWishlist, isInWishlist, setQuickViewProduct } = useCart();
  const searchParams = useSearchParams();
  const router = useRouter();
  const catalogue = useCatalogue({ category: searchParams.get("category") || undefined, q: searchParams.get("search") || undefined });
  const products = catalogue.data;

  // Initialize state from URL params
  const [activeCategory, setActiveCategory] = useState(() => 
    searchParams.get("category") || "all"
  );
  const [activePriceRange, setActivePriceRange] = useState(() => {
    const priceParam = searchParams.get("price");
    if (!priceParam) return 0;
    return PRICE_RANGES.findIndex(range => range.label === priceParam) || 0;
  });
  const [activeFabric, setActiveFabric] = useState(() => 
    searchParams.get("fabric") || "All Fabrics"
  );
  const [sortBy, setSortBy] = useState(() => 
    searchParams.get("sort") || "featured"
  );
  const [selectedSizes, setSelectedSizes] = useState<Record<string, string>>({});
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(() => 
    searchParams.get("search") || ""
  );

  // Update URL when filters change
  const updateURL = (newParams: Record<string, string>) => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    
    Object.entries(newParams).forEach(([key, value]) => {
      if (value && value !== "all" && value !== "All Fabrics" && value !== "featured" && value !== "") {
        current.set(key, value);
      } else {
        current.delete(key);
      }
    });

    const search = current.toString();
    const query = search ? `?${search}` : "";
    router.replace(`/products${query}`, { scroll: false });
  };

  // Effect to update URL when state changes
  useEffect(() => {
    updateURL({
      category: activeCategory,
      price: activePriceRange > 0 ? PRICE_RANGES[activePriceRange].label : "",
      fabric: activeFabric,
      sort: sortBy,
      search: searchQuery,
    });
  }, [products, activeCategory, activePriceRange, activeFabric, sortBy, searchQuery]);

  const priceRange = PRICE_RANGES[activePriceRange];

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

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.fabric.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q)
      );
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
    }

    return result;
  }, [activeCategory, activePriceRange, activeFabric, sortBy, searchQuery, priceRange]);

  const activeFilterCount = [
    activeCategory !== "all",
    activePriceRange !== 0,
    activeFabric !== "All Fabrics",
  ].filter(Boolean).length;

  const clearAllFilters = () => {
    setActiveCategory("all");
    setActivePriceRange(0);
    setActiveFabric("All Fabrics");
    setSearchQuery("");
  };

  return (
    <div className="min-h-screen bg-[#faf7f2]">
      {/* ── Page Header ── */}
      <div className="bg-gradient-to-br from-[#1c1917] via-[#3d2012] to-[#881337] text-white py-16 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-[10px] uppercase tracking-[0.4em] text-[#dfc28c] mb-3 font-semibold">
            Handcrafted in Jaipur
          </p>
          <h1 className="font-serif text-4xl sm:text-5xl font-light mb-4">
            Our Collection
          </h1>
          <p className="text-white/60 text-sm max-w-md mx-auto">
            Discover {products.length} handcrafted {products.length === 1 ? "piece" : "pieces"}
            {catalogue.source === "demo" ? " · demo catalogue" : ", each telling the story of Indian artistry"}
          </p>
          {/* Breadcrumb */}
          <nav className="mt-6 flex items-center justify-center gap-2 text-xs text-white/50">
            <Link href="/" className="hover:text-white transition">Home</Link>
            <span>/</span>
            <span className="text-white/80">All Products</span>
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
            <input
              type="text"
              placeholder="Search fabrics, prints, styles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#881337]/20 focus:border-[#881337]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            )}
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#881337]/20 focus:border-[#881337] min-w-[180px]"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Filter Toggle (mobile) */}
          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            className="sm:hidden flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium"
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
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition flex-shrink-0 ${
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
              <h3 className="font-semibold text-gray-900 text-sm">Filters</h3>
              {activeFilterCount > 0 && (
                <button
                  onClick={clearAllFilters}
                  className="text-xs text-[#881337] hover:underline"
                >
                  Clear all
                </button>
              )}
            </div>

            {/* Price Range */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
                Price Range
              </h4>
              <div className="space-y-1.5">
                {PRICE_RANGES.map((range, i) => (
                  <button
                    key={range.label}
                    onClick={() => setActivePriceRange(i)}
                    className={`w-full text-left text-sm px-3 py-2 rounded-lg transition ${
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
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
                Fabric
              </h4>
              <div className="space-y-1.5">
                {FABRICS.map((fabric) => (
                  <button
                    key={fabric}
                    onClick={() => setActiveFabric(fabric)}
                    className={`w-full text-left text-sm px-3 py-2 rounded-lg transition leading-snug ${
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
          </aside>

          {/* ── Mobile Filters Drawer ── */}
          <AnimatePresence>
            {filtersOpen && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setFiltersOpen(false)}
                  className="sm:hidden fixed inset-0 bg-black/50 z-40"
                />
                <motion.div
                  initial={{ x: "-100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "-100%" }}
                  className="sm:hidden fixed left-0 top-0 bottom-0 w-72 bg-white z-50 overflow-y-auto p-6 space-y-6"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">Filters</h3>
                    <button onClick={() => setFiltersOpen(false)}>✕</button>
                  </div>
                  {activeFilterCount > 0 && (
                    <button onClick={clearAllFilters} className="text-sm text-[#881337]">
                      Clear all filters
                    </button>
                  )}
                  {/* Price Range */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Price Range</h4>
                    <div className="space-y-1.5">
                      {PRICE_RANGES.map((range, i) => (
                        <button
                          key={range.label}
                          onClick={() => { setActivePriceRange(i); setFiltersOpen(false); }}
                          className={`w-full text-left text-sm px-3 py-2 rounded-lg transition ${
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
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Fabric</h4>
                    <div className="space-y-1.5">
                      {FABRICS.map((fabric) => (
                        <button
                          key={fabric}
                          onClick={() => { setActiveFabric(fabric); setFiltersOpen(false); }}
                          className={`w-full text-left text-sm px-3 py-2 rounded-lg transition leading-snug ${
                            activeFabric === fabric ? "bg-[#881337]/10 text-[#881337] font-medium" : "text-gray-700 hover:bg-gray-100"
                          }`}
                        >
                          {fabric}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* ── Product Grid ── */}
          <div className="flex-1 min-w-0">
            {/* Result Count */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-600">
                {filteredProducts.length === 0
                  ? "No products found"
                  : `${filteredProducts.length} product${filteredProducts.length !== 1 ? "s" : ""}`}
                {searchQuery && ` for "${searchQuery}"`}
              </p>
              {activeFilterCount > 0 && (
                <button
                  onClick={clearAllFilters}
                  className="text-xs text-[#881337] hover:underline hidden sm:block"
                >
                  Clear filters
                </button>
              )}
            </div>

            {filteredProducts.length === 0 ? (
              <div className="text-center py-24">
                <div className="text-5xl mb-4">🧵</div>
                <h3 className="text-lg font-serif text-gray-900 mb-2">No products found</h3>
                <p className="text-gray-500 text-sm mb-6">Try adjusting your filters or search terms</p>
                <button
                  onClick={clearAllFilters}
                  className="bg-[#881337] text-white px-6 py-2 rounded-xl text-sm font-medium hover:bg-[#701a35] transition"
                >
                  Clear All Filters
                </button>
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
                        selectedSize={selectedSizes[product.id] || product.sizes[0]}
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
  return (
    <div className="min-h-screen bg-[#faf7f2]">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#1c1917] via-[#3d2012] to-[#881337] text-white py-16 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-[10px] uppercase tracking-[0.4em] text-[#dfc28c] mb-3 font-semibold">
            Handcrafted in Jaipur
          </p>
          <h1 className="font-serif text-4xl sm:text-5xl font-light mb-4">
            Our Collection
          </h1>
          <p className="text-white/60 text-sm max-w-md mx-auto">
            Loading our beautiful collection...
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-[#881337] border-t-transparent"></div>
        </div>
      </div>
    </div>
  );
}

/**
 * The interactive catalogue listing.
 *
 * Moved out of `page.tsx` so that file can be a Server Component and export `generateMetadata` for
 * the category pages — `useSearchParams()` in a `"use client"` module rules that out. `Suspense`
 * stays here because `useSearchParams` needs it during prerendering.
 */
export default function ProductsView() {
  return (
    <Suspense fallback={<ProductsLoading />}>
      <ProductsContent />
    </Suspense>
  );
}
