"use client";

import FounderMessage from "@/components/FounderMessage";
import CustomerReviews from "@/components/CustomerReviews";
import InspiredLooks from "@/components/InspiredLooks";
import type { FounderMessage as FounderContent } from "@/lib/founder";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext";
import type { Lookbook, Testimonial, PublishedReel } from "../../lib/content";
import { useCatalogue } from "../../lib/use-storefront";
import type { Product } from "../../lib/storefront-types";
import LivingProductCard from "../../components/LivingProductCard";
import ShopFromVideo from "../../components/ShopFromVideo";
import OrderStatusBand from "../../components/OrderStatusBand";
import ShopByCategory from "../../components/ShopByCategory";
import StylistConciergeBand from "../../components/StylistConciergeBand";
import { api, isApiConfigured, type StoreCategory } from "../../lib/api-client";
import { STORE_PHONE_DISPLAY, storeWhatsAppUrl } from "../../lib/site-contact";

const FALLBACK_CATEGORY_SLUGS = ["mul-cotton", "festive", "coord-sets", "anarkalis"];

export interface HomeViewProps {
  founder?: FounderContent;
  testimonials?: Testimonial[];
  lookbook?: Lookbook;
  lookbooks?: Lookbook[];
  faqs?: { question: string; answer: string }[];
  productCollection?: { title?: string; subtitle?: string; productIds: string[] } | null;
  /** True when at least one block came from the CMS. Drives the small "live content" note. */
  fromCms?: boolean;
  reels?: PublishedReel[];
  /** Server-rendered catalogue for first paint (SSR/ISR); the client hook skips its mount fetch when present. */
  initialProducts?: Product[];
}

/**
 * The homepage body.
 *
 * Split out of `page.tsx` so that file can be a Server Component: it fetches the CMS blocks, exports
 * `generateMetadata` and mounts the FAQPage JSON-LD — none of which a `"use client"` module can do.
 * Content arrives as props; only published CMS blocks and live API products are rendered.
 */
export default function HomeView({
  founder,
  testimonials = [],
  lookbook = { title: "", subtitle: "", image: "", pins: [] },
  lookbooks = [],
  faqs = [],
  productCollection = null,
  fromCms = false,
  reels = [],
  initialProducts,
}: HomeViewProps = {}) {
  const { addToCart, setQuickViewProduct, toggleWishlist, isInWishlist } = useCart();
  const { user } = useAuth();
  const preferredSize = user?.preferences?.preferredSize;

  // Multi-lookbook support: preserves every published lookbook!
  const allLookbooks = (lookbooks && lookbooks.length > 0)
    ? lookbooks.filter((item) => Boolean(item && item.image))
    : (lookbook && lookbook.image ? [lookbook] : []);
  const [activeLookbookIdx, setActiveLookbookIdx] = useState<number>(0);
  const currentLookbook = allLookbooks[activeLookbookIdx] ?? allLookbooks[0] ?? lookbook;

  // Active filter tab
  const [activeTab, setActiveTab] = useState<string>("all");
  // Active hotspot pin
  const [activePin, setActivePin] = useState<string | null>("pin-1");
  // Quick size selection per product card
  const [selectedSizes, setSelectedSizes] = useState<Record<string, string>>({});
  const [categories, setCategories] = useState<StoreCategory[]>([]);

  // Only testimonials the shop itself published in admin are ever shown. An empty list hides the
  // section entirely (CustomerReviews returns null) — never substitute invented customers.
  const displayTestimonials = testimonials;

  const catalogue = useCatalogue({}, { initialData: initialProducts });
  const catalogueProducts = productCollection?.productIds.length
    ? productCollection.productIds
      .map((id) => catalogue.data.find((product) => product.id === id))
      .filter((product): product is (typeof catalogue.data)[number] => Boolean(product))
    : catalogue.data;

  // Filter products according to active tab
  const filteredProducts = catalogueProducts.filter((p) => {
    if (activeTab === "all") return true;
    if (activeTab === "budget") return p.price <= 1999;
    return p.category === activeTab;
  });

  useEffect(() => {
    if (!isApiConfigured()) return;
    const controller = new AbortController();
    let cancelled = false;

    const refreshCategories = async () => {
      try {
        const { data } = await api.categories(controller.signal);
        if (cancelled) return;
        setCategories(data);
        setActiveTab((current) => current === "all" || current === "budget" || data.some((category) => category.slug === current) ? current : "all");
      } catch (cause: unknown) {
        if ((cause as Error)?.name !== "AbortError") console.error("Could not load homepage categories and product counts", cause);
      }
    };

    void refreshCategories();
    // Re-fetch the no-store category totals when shoppers return after an Admin product change.
    window.addEventListener("focus", refreshCategories);
    return () => {
      cancelled = true;
      controller.abort();
      window.removeEventListener("focus", refreshCategories);
    };
  }, []);

  const categoryTabs = categories.length
    ? categories.map((category) => ({ key: category.slug, label: category.name }))
    : FALLBACK_CATEGORY_SLUGS.map((slug) => ({ key: slug, label: slug.replace(/-/g, " ") }));

  const handleSizeChange = (productId: string, size: string) => {
    setSelectedSizes((prev) => ({ ...prev, [productId]: size }));
  };

  return (
    <div
      className="relative min-h-screen bg-[#faf7f2] text-[#1c1917] pb-16 lg:pb-0"
      // Invisible to shoppers, but answers the first question a merchant asks after editing a block:
      // "is the homepage actually reading my CMS content, or still the bundled copy?"
      data-content-source={fromCms ? "cms" : "empty"}
    >
      {/* ================= 1. VANI COLLECTION STOREFRONT ================= */}
      <section className="relative h-[42svh] min-h-[270px] max-h-[400px] w-full overflow-hidden bg-stone-900 sm:h-[84vh] sm:min-h-[580px] sm:max-h-[860px]">
        <Image
          src="/vani-store-front.jpg"
          alt="Vani Collection storefront in Guna"
          fill
          priority
          sizes="100vw"
          className="object-cover"
          style={{ objectPosition: "center 54%" }}
        />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/20 to-black/55" />
        <div className="relative z-10 flex h-full flex-col items-center justify-center px-4 text-center">
          <h1 className="font-serif text-[clamp(2.35rem,7vw,5.5rem)] font-medium leading-[1.03] text-white drop-shadow-[0_3px_18px_rgba(0,0,0,0.75)]">
            <span className="block">Vani Collection</span>
            <span className="block">Guna</span>
          </h1>
          <Link
            href="/products"
            className="button-feedback mt-6 inline-flex min-h-12 items-center justify-center gap-3 rounded-full bg-[#1c1917]/95 px-8 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-white shadow-lg transition hover:bg-[#881337] sm:mt-8 sm:px-10 sm:py-4 sm:text-sm"
          >
            Shop Now
            <span aria-hidden="true" className="text-[#dfc28c]">→</span>
          </Link>
        </div>
      </section>

      {/* ================= 2. SHOP FROM THE VIDEO ================= */}
      <ShopFromVideo reels={reels} />
      <OrderStatusBand />

      {/* ================= 3. LIVE VIDEO SHOPPING ================= */}
      <StylistConciergeBand />

      {/* ================= 4. RESPONSIVE PRODUCT GRID (2 COLS MOBILE, 3 COLS TABLET, 4 COLS PC) ================= */}
      <section id="products" className="py-12 sm:py-20 bg-white border-y border-[#e8dfd5]">
        <div className="max-w-[1500px] mx-auto px-3 sm:px-6 lg:px-12">
          {/* Header & Category Switcher Tabs */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-6 mb-6 sm:mb-10">
            <div>
              <span className="text-[9.5px] sm:text-[10px] font-semibold uppercase tracking-[0.35em] text-[#b8935a]">
                Artisanal Handpicked
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl text-stone-900 mt-1">
                {productCollection?.title || "Trending Creations"}
              </h2>
              {productCollection?.subtitle && <p className="mt-1 text-sm text-stone-600">{productCollection.subtitle}</p>}
            </div>

            {/* Filter Tabs - horizontally scrollable on mobile */}
            <div className="relative w-full md:w-auto">
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory">
                {[
                  { label: "All Styles", key: "all" },
                  ...categoryTabs,
                  { label: "Under ₹1,999", key: "budget" },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`snap-start flex-shrink-0 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-[13px] font-semibold tracking-wide whitespace-nowrap transition-all ${
                      activeTab === tab.key
                        ? "bg-[#881337] text-white shadow-lg"
                        : "bg-white text-stone-700 hover:bg-stone-100 border border-stone-200"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Product Grid: Properly aligned with consistent gaps */}
          {catalogue.error && <p role="status" className="mb-5 text-center text-sm text-amber-800">{catalogue.error}</p>}
          {filteredProducts.length === 0 && !catalogue.loading ? (
            <p className="py-10 text-center text-sm text-stone-500">No products are currently available.</p>
          ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
            {filteredProducts.map((product) => (
              <LivingProductCard
                key={product.id}
                product={product}
                isWish={isInWishlist(product.id)}
                toggleWishlist={toggleWishlist}
                onQuickView={setQuickViewProduct}
                onAddToCart={addToCart}
                selectedSize={selectedSizes[product.id] ?? (preferredSize && product.sizes.includes(preferredSize) ? preferredSize : undefined)}
                onSelectSize={handleSizeChange}
              />
            ))}
          </div>
          )}
        </div>
      </section>

      {/* ================= 4a. SHOP BY CATEGORIES (tiles with live piece counts) ================= */}
      <ShopByCategory
        items={(categories.length
          ? categories
          : // Demo / no-API mode: derive the tiles from the bundled catalogue so the section still shows.
            [...new Set(catalogueProducts.map((product) => product.category))].map((slug): StoreCategory => ({
              _id: slug,
              slug,
              name: slug.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()),
              bannerImage: undefined,
              navigationGroup: "By Category",
              position: 0,
              isActive: true,
            }))
        ).map((category) => {
          const inCategory = catalogueProducts.filter((product) => product.category === category.slug);
          return {
            category,
            count: category.productCount ?? inCategory.length,
            image: category.bannerImage || inCategory[0]?.image || undefined,
          };
        })}
      />

      {/* ================= 5. INTERACTIVE LOOKBOOK (HOTSPOTS BANNER) ================= */}
      {currentLookbook?.image && (
        <section id="lookbook" className="py-12 sm:py-20 max-w-[1500px] mx-auto px-4 sm:px-8 lg:px-12">
          <div className="text-center max-w-xl mx-auto mb-6 sm:mb-8">
            <span className="text-[9.5px] sm:text-[10px] font-semibold uppercase tracking-[0.35em] text-[#b8935a]">
              Editorial Styling
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl text-stone-900 mt-1">
              {currentLookbook.title}
            </h2>
            <p className="text-xs text-stone-600 mt-1.5 font-light">
              Tap on any floating gold pin on the muse to explore the handcrafted elements.
            </p>
          </div>

          {/* Multiple Lookbooks Switcher Tabs */}
          {allLookbooks.length > 1 && (
            <div className="flex flex-wrap items-center justify-center gap-2 mb-6 sm:mb-8">
              {allLookbooks.map((lb, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setActiveLookbookIdx(idx);
                    setActivePin(lb.pins?.[0]?.id ?? null);
                  }}
                  className={`px-4 sm:px-5 py-1.5 sm:py-2 rounded-full text-xs font-medium tracking-wide transition-all shadow-sm ${
                    activeLookbookIdx === idx
                      ? "bg-[#881337] text-white shadow-md ring-2 ring-[#881337]/30 scale-105"
                      : "bg-white text-stone-700 hover:bg-stone-100 border border-stone-200"
                  }`}
                >
                  <span className="font-serif">Look {idx + 1}:</span> {lb.title ? (lb.title.length > 28 ? `${lb.title.slice(0, 28)}…` : lb.title) : `Collection ${idx + 1}`}
                </button>
              ))}
            </div>
          )}

          <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl min-h-[520px] sm:min-h-[660px] lg:min-h-[760px] w-full bg-[#12100e] border border-stone-800 flex items-center justify-center p-3 sm:p-6 lg:p-8">
            {/* Ambient Blurred Aura so the widescreen edges fill with luxury matching tones */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={currentLookbook.image}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-cover blur-3xl opacity-35 scale-110 pointer-events-none"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/45 pointer-events-none" />

            {/* Prev / Next navigation arrows when multiple lookbooks exist */}
            {allLookbooks.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    const nextIdx = activeLookbookIdx > 0 ? activeLookbookIdx - 1 : allLookbooks.length - 1;
                    setActiveLookbookIdx(nextIdx);
                    setActivePin(allLookbooks[nextIdx]?.pins?.[0]?.id ?? null);
                  }}
                  className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-white/90 hover:bg-white text-stone-900 flex items-center justify-center shadow-2xl backdrop-blur-md transition hover:scale-110 active:scale-95 cursor-pointer"
                  aria-label="Previous Lookbook"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const nextIdx = activeLookbookIdx < allLookbooks.length - 1 ? activeLookbookIdx + 1 : 0;
                    setActiveLookbookIdx(nextIdx);
                    setActivePin(allLookbooks[nextIdx]?.pins?.[0]?.id ?? null);
                  }}
                  className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-white/90 hover:bg-white text-stone-900 flex items-center justify-center shadow-2xl backdrop-blur-md transition hover:scale-110 active:scale-95 cursor-pointer"
                  aria-label="Next Lookbook"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}

            {/* Centered Muse / Model Canvas - uncropped, showing the full outfit and head! */}
            <div className={`relative z-10 ${
              currentLookbook.layout === 'banner'
                ? 'w-full h-full min-h-[500px] sm:min-h-[640px] lg:min-h-[740px]'
                : 'h-[480px] sm:h-[620px] lg:h-[720px] w-full max-w-[560px] mx-auto rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/15'
            }`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={currentLookbook.image}
                src={currentLookbook.image}
                alt={currentLookbook.title}
                className={`w-full h-full object-cover ${currentLookbook.focalPosition || 'object-top'} transition-all duration-700`}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20 pointer-events-none" />

              {/* Lookbook Title Overlay on mobile & tablet */}
              <div className="absolute bottom-5 left-4 right-4 text-white z-10 pointer-events-none lg:hidden">
                {currentLookbook.subtitle && (
                  <span className="text-[9px] uppercase tracking-[0.25em] font-semibold text-[#dfc28c] bg-black/60 px-2.5 py-0.5 rounded-full backdrop-blur-md">
                    {currentLookbook.subtitle}
                  </span>
                )}
                <h3 className="font-serif text-lg sm:text-2xl font-light mt-1.5 leading-tight drop-shadow-md">
                  {currentLookbook.title}
                </h3>
              </div>

              {/* Interactive Floating Pulse Pins */}
              {(currentLookbook.pins ?? []).map((pin) => {
                const matchedProduct = catalogueProducts.find((p) =>
                  (pin.productId && (p.id === pin.productId || p.productId === pin.productId)) ||
                  (pin.slug && p.slug === pin.slug) ||
                  (pin.title && p.title.toLowerCase().trim() === pin.title.toLowerCase().trim()) ||
                  (pin.title && p.title.toLowerCase().includes(pin.title.toLowerCase().trim()))
                );

                return (
                  <div
                    key={pin.id}
                    style={{ top: pin.top, left: pin.left }}
                    className="absolute transform -translate-x-1/2 -translate-y-1/2 z-20"
                  >
                    <button
                      type="button"
                      onClick={() => setActivePin(activePin === pin.id ? null : pin.id)}
                      aria-expanded={activePin === pin.id}
                      aria-label={`${pin.title || matchedProduct?.title || "Lookbook item"} ki jaankari ${activePin === pin.id ? "band kare" : "khole"}`}
                      className="relative flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-[#dfc28c] text-sm font-bold text-stone-900 shadow-lg transition hover:scale-105"
                    >
                      <span aria-hidden="true" className="absolute inset-2 rounded-full bg-[#dfc28c] opacity-60 motion-safe:animate-ping" />
                      <span aria-hidden="true" className="relative">+</span>
                    </button>

                    {/* Pin Tooltip Box */}
                    <AnimatePresence>
                      {activePin === pin.id && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute left-1/2 top-12 z-30 w-60 -translate-x-1/2 rounded-xl border border-stone-200 bg-white/95 p-3 text-stone-900 shadow-2xl backdrop-blur-md sm:w-64 sm:p-3.5"
                        >
                          <div className="flex items-start gap-2.5">
                            {matchedProduct?.image && (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img
                                src={matchedProduct.image}
                                alt={pin.title || matchedProduct.title}
                                className="w-12 h-14 object-cover rounded-md border border-stone-200 shrink-0 bg-stone-100"
                              />
                            )}
                            <div className="min-w-0 flex-1">
                              <span className="text-[8.5px] sm:text-[9px] uppercase font-bold text-[#881337] tracking-wider block truncate">
                                {pin.tag || matchedProduct?.fabric || matchedProduct?.category || "Artisanal"}
                              </span>
                              <h4 className="font-serif text-xs sm:text-sm font-semibold leading-tight my-0.5 line-clamp-2">
                                {matchedProduct?.slug ? (
                                  <Link
                                    href={`/product/${matchedProduct.slug}`}
                                    className="hover:text-[#881337] transition underline-offset-2 hover:underline"
                                  >
                                    {pin.title || matchedProduct.title}
                                  </Link>
                                ) : (
                                  pin.title || matchedProduct?.title
                                )}
                              </h4>
                            </div>
                          </div>

                          <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-stone-200">
                            <span className="text-xs font-bold text-[#881337]">
                              {pin.price || (matchedProduct ? `₹${matchedProduct.price.toLocaleString("en-IN")}` : "")}
                            </span>
                            {matchedProduct && (
                              <button
                                type="button"
                                onClick={() => setQuickViewProduct(matchedProduct)}
                                aria-label={`${matchedProduct.title} ke liye size chune`}
                                className="min-h-11 cursor-pointer rounded-full bg-[#1c1917] px-3.5 py-2 text-[10px] font-semibold uppercase tracking-wider text-white shadow-xs transition hover:bg-[#881337]"
                              >
                                Size chune
                              </button>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>

            {/* Lookbook Title Badge on Desktop Widescreen */}
            <div className="absolute bottom-8 left-8 text-white max-w-sm z-10 pointer-events-none hidden lg:block">
              {currentLookbook.subtitle && (
                <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.3em] font-semibold text-[#dfc28c] bg-black/60 px-3 py-1 rounded-full backdrop-blur-md border border-white/10">
                  {currentLookbook.subtitle}
                </span>
              )}
              <h3 className="font-serif text-2xl sm:text-3xl font-light mt-2.5 mb-1.5 leading-snug drop-shadow-md">
                {currentLookbook.title}
              </h3>
              {currentLookbook.subtitle && (
                <p className="text-[11px] text-stone-300 font-light">
                  {currentLookbook.subtitle}
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      <InspiredLooks products={catalogueProducts} image={currentLookbook.image} loading={catalogue.loading} />

      <CustomerReviews reviews={displayTestimonials} />

      <FounderMessage content={founder} />

      {/* ================= 7b. FAQ (CMS `kind=faq`) ================= */}
      {/* Only rendered when the CMS has published questions, and every one of them is also marked up
          as FAQPage JSON-LD by app/(main)/page.tsx — markup without visible content is a spam
          signal, so the two are driven by the same array. */}
      {faqs.length > 0 && (
        <section id="faq" className="py-14 sm:py-20 bg-[#faf7f2] border-t border-[#e8dfd5]">
          <div className="max-w-[1500px] mx-auto px-4 sm:px-8 lg:px-12">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-14">
              <div className="lg:sticky lg:top-28 self-start">
                <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.3em] text-[#881337] mb-3">
                  Good to know
                </p>
                <h3 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-medium leading-tight text-stone-900">
                  Frequently asked questions
                </h3>
                <p className="mt-4 text-xs sm:text-sm leading-relaxed text-stone-600 max-w-sm">
                  Fabric, sizing, shipping and care — the things shoppers ask us most. Anything else,
                  write to us and a person will answer.
                </p>
                <a
                  href="mailto:demo@example.com"
                  className="mt-6 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-[#881337] border-b border-[#881337]/30 pb-1 hover:border-[#881337] transition"
                >
                  Ask us anything <span aria-hidden="true">→</span>
                </a>
              </div>

              <div className="lg:col-span-2">
                {/* <details> gives a keyboard- and screen-reader-accessible accordion with no JS and
                    no extra state, and it stays openable when the CMS content changes. */}
                <div className="divide-y divide-[#e8dfd5] border-y border-[#e8dfd5]">
                  {faqs.map((faq, index) => (
                    <details key={`${faq.question}-${index}`} className="group py-1">
                      <summary className="flex cursor-pointer list-none items-start justify-between gap-4 py-4 sm:py-5 text-left [&::-webkit-details-marker]:hidden">
                        <span className="font-serif text-base sm:text-lg font-medium text-stone-900 group-open:text-[#881337] transition-colors">
                          {faq.question}
                        </span>
                        <span
                          aria-hidden="true"
                          className="mt-0.5 shrink-0 text-[#dfc28c] transition-transform duration-300 group-open:rotate-45"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                            <path d="M12 5v14M5 12h14" />
                          </svg>
                        </span>
                      </summary>
                      <p className="pb-5 pr-8 text-xs sm:text-sm leading-relaxed text-stone-600">
                        {faq.answer}
                      </p>
                    </details>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ================= 8. THE GUNA ATELIER & CONCIERGE ================= */}
      <section className="py-16 sm:py-24 bg-white border-t border-[#f0ebe3]">
        <div className="max-w-[1300px] mx-auto px-4 sm:px-8 lg:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            {/* Interactive atelier location, with a direct link if maps cannot load. */}
            <div className="overflow-hidden rounded-2xl border border-stone-200 bg-[#faf7f2] shadow-lg">
              <iframe
                title="Demo store location"
                src="https://www.google.com/maps?q=Connaught+Place+New+Delhi&output=embed"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
                className="aspect-[4/3] min-h-[280px] w-full border-0"
              />
              <div className="flex flex-wrap items-center justify-between gap-4 border-t border-stone-200 px-5 py-4 sm:px-6">
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-[0.25em] text-[#881337]">Flagship Atelier</p>
                  <p className="mt-1 font-serif text-lg text-stone-900">Demo Street · Demo City, India</p>
                </div>
                <a
                  href="https://www.google.com/maps/dir/?api=1&destination=Connaught+Place+New+Delhi"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-[#881337] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-[#6d0f2b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#881337]"
                >
                  Get directions <span aria-hidden="true">↗</span>
                </a>
              </div>
            </div>

            {/* Content & Invitation */}
            <div className="space-y-6">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-[0.35em] text-[#881337] block mb-2">
                  Visit & Connect
                </span>
                <h2 className="font-serif text-3xl sm:text-4xl lg:text-[42px] font-light text-stone-900 leading-tight">
                  Step Into Our Atelier
                </h2>
                <div className="w-12 h-[2px] bg-[#dfc28c] mt-4" />
              </div>

              <p className="text-stone-600 text-sm sm:text-base leading-relaxed font-light">
                Discover the touch of 100-count pure Mul Cotton and handblock craft in person. Our Guna atelier welcomes you for bespoke styling, festive consultations, and made-to-order ensembles.
              </p>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-stone-100 text-xs text-stone-700">
                <div>
                  <p className="font-semibold text-stone-900">Atelier Timings</p>
                  <p className="text-stone-500 mt-0.5">Mon – Sat · 10:30 am – 7:30 pm</p>
                </div>
                <div>
                  <p className="font-semibold text-stone-900">Concierge Desk</p>
                  <p className="text-stone-500 mt-0.5">{STORE_PHONE_DISPLAY}</p>
                </div>
              </div>

              <div className="pt-2 flex flex-wrap gap-4">
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2.5 bg-[#1c1917] hover:bg-[#881337] text-white text-xs font-semibold tracking-[0.2em] uppercase px-8 py-4 rounded-full transition shadow-md hover:shadow-lg"
                >
                  <span>Explore Contact & Atelier</span>
                  <span>→</span>
                </Link>
                <a
                  href={storeWhatsAppUrl("Hello Vani Collection Atelier!")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 border border-stone-300 hover:border-stone-500 text-stone-800 text-xs font-semibold tracking-[0.15em] uppercase px-6 py-4 rounded-full transition"
                >
                  <span>WhatsApp Stylist</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
