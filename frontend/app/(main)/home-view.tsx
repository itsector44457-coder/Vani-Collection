"use client";

import FounderMessage from "@/components/FounderMessage";
import type { FounderMessage as FounderContent } from "@/lib/founder";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "../../context/CartContext";
import type { HeroSlide, Lookbook, Testimonial, PublishedReel } from "../../lib/content";
import { DEFAULT_TESTIMONIALS } from "../../lib/content";
import type { CategoryStory as CmsCategoryStory } from "../../lib/content";
import { useCatalogue } from "../../lib/use-storefront";
import StoryReelModal from "../../components/StoryReelModal";
import LivingProductCard from "../../components/LivingProductCard";
import ShopFromVideo from "../../components/ShopFromVideo";
import { api, isApiConfigured, type StoreCategory } from "../../lib/api-client";

export interface HomeViewProps {
  founder?: FounderContent;
  banners?: HeroSlide[];
  testimonials?: Testimonial[];
  lookbook?: Lookbook;
  lookbooks?: Lookbook[];
  stories?: CmsCategoryStory[];
  faqs?: { question: string; answer: string }[];
  productCollection?: { title?: string; subtitle?: string; productIds: string[] } | null;
  /** True when at least one block came from the CMS. Drives the small "live content" note. */
  fromCms?: boolean;
  reels?: PublishedReel[];
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
  banners = [],
  testimonials = [],
  lookbook = { title: "", subtitle: "", image: "", pins: [] },
  lookbooks = [],
  stories = [],
  faqs = [],
  productCollection = null,
  fromCms = false,
  reels = [],
}: HomeViewProps = {}) {
  const { addToCart, setQuickViewProduct, toggleWishlist, isInWishlist } = useCart();

  // Multi-lookbook support: preserves every published lookbook!
  const allLookbooks = (lookbooks && lookbooks.length > 0)
    ? lookbooks.filter((item) => Boolean(item && item.image))
    : (lookbook && lookbook.image ? [lookbook] : []);
  const [activeLookbookIdx, setActiveLookbookIdx] = useState<number>(0);
  const currentLookbook = allLookbooks[activeLookbookIdx] ?? allLookbooks[0] ?? lookbook;

  // Active filter tab
  const [activeTab, setActiveTab] = useState<string>("all");
  // Story modal state
  const [activeStory, setActiveStory] = useState<CmsCategoryStory | null>(null);
  // Active Hero Slide
  const [heroSlide, setHeroSlide] = useState<number>(0);
  // Start with the lightweight image experience; video remains an explicit opt-in.
  const [heroMode, setHeroMode] = useState<"slides" | "video">("slides");
  // Active hotspot pin
  const [activePin, setActivePin] = useState<string | null>("pin-1");
  // Quick size selection per product card
  const [selectedSizes, setSelectedSizes] = useState<Record<string, string>>({});
  const [categories, setCategories] = useState<StoreCategory[]>([]);

  // Testimonials Side-Scrollable State
  const testimonialsScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollTestiLeft, setCanScrollTestiLeft] = useState(false);
  const [canScrollTestiRight, setCanScrollTestiRight] = useState(true);

  const displayTestimonials = (testimonials && testimonials.length > 0) ? testimonials : DEFAULT_TESTIMONIALS;

  const updateTestimonialScrollState = () => {
    if (!testimonialsScrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = testimonialsScrollRef.current;
    setCanScrollTestiLeft(scrollLeft > 10);
    setCanScrollTestiRight(scrollLeft < scrollWidth - clientWidth - 10);
  };

  const scrollTestimonials = (direction: "left" | "right") => {
    if (!testimonialsScrollRef.current) return;
    const scrollAmount = Math.min(testimonialsScrollRef.current.clientWidth * 0.85, 420);
    testimonialsScrollRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };
  const catalogue = useCatalogue();
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
    void api.categories(controller.signal)
      .then(({ data }) => {
        setCategories(data);
        setActiveTab((current) => current === "all" || current === "budget" || data.some((category) => category.slug === current) ? current : "all");
      })
      .catch((cause: unknown) => {
        if ((cause as Error)?.name !== "AbortError") console.error("Could not load homepage categories", cause);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (heroMode !== "slides" || banners.length < 2) return;
    const timer = window.setInterval(() => {
      setHeroSlide((current) => (current + 1) % banners.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [heroMode, banners.length]);

  const fallbackCategorySlugs = ["mul-cotton", "festive", "coord-sets", "anarkalis"];
  const categoryTabs = categories.length
    ? categories.map((category) => ({ key: category.slug, label: category.name }))
    : fallbackCategorySlugs.map((slug) => ({ key: slug, label: slug.replace(/-/g, " ") }));
  const chooseCategory = (slug: string) => setActiveTab(categoryTabs.some((category) => category.key === slug) ? slug : "all");


  /* The CMS may publish one banner where the bundle had two, and `heroSlide` is state that survives
     a prop change — so clamp the index rather than reading past the end of the array. */
  const safeSlideIndex = banners.length ? Math.min(heroSlide, banners.length - 1) : 0;
  const activeSlide: HeroSlide | undefined = banners[safeSlideIndex];
  const heroVideo = activeSlide?.video ?? banners.find((slide) => slide.video)?.video;
  const heroImage = activeSlide?.image || catalogueProducts[0]?.image || "";
  const hasHeroImage = Boolean(heroImage);

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
      {/* ================= 1. EDITORIAL HERO — DUAL MODE (Video / Slides) ================= */}
      <section className="relative h-[42svh] min-h-[270px] max-h-[400px] sm:h-[84vh] sm:min-h-[580px] sm:max-h-[860px] w-full overflow-hidden bg-[#faf7f2]">

        {/* ---- MODE TOGGLE PILL (top-right corner) ---- */}
        {banners.length > 0 && <div className="hidden sm:flex absolute top-3.5 right-3.5 sm:top-6 sm:right-6 z-30 items-center gap-1 bg-black/60 backdrop-blur-xl border border-[#dfc28c]/40 rounded-full p-1 shadow-[0_4px_25px_rgba(0,0,0,0.6)]">
          <button
            onClick={() => setHeroMode("slides")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider transition-all duration-300 ${
              heroMode === "slides"
                ? "bg-gradient-to-r from-[#b91c1c] to-[#881337] text-white shadow-[0_2px_12px_rgba(185,28,28,0.5)] border border-[#dfc28c]/40"
                : "text-white/75 hover:text-white"
            }`}
            aria-label="Use image slideshow"
            aria-pressed={heroMode === "slides"}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
            <span className="hidden sm:inline">Slides</span>
          </button>
          <button
            onClick={() => setHeroMode("video")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider transition-all duration-300 ${
              heroMode === "video"
                ? "bg-gradient-to-r from-[#b91c1c] to-[#881337] text-white shadow-[0_2px_12px_rgba(185,28,28,0.5)] border border-[#dfc28c]/40"
                : "text-white/75 hover:text-white"
            }`}
            aria-label="Play atelier video"
            aria-pressed={heroMode === "video"}
            title={heroVideo ? "Play the uploaded hero video" : "Play the atelier video"}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M23 7l-7 5 7 5V7z" />
              <rect x="1" y="5" width="15" height="14" rx="2" />
            </svg>
            <span className="hidden sm:inline">Video</span>
          </button>
        </div>}

        {/* ---- SLIDES MODE ---- */}
        <AnimatePresence>
          {heroMode === "slides" && (
            <motion.div
              key="slides-bg"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
              className="absolute inset-0"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={heroSlide}
                  initial={{ opacity: 0, scale: 1.05 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute inset-0"
                >
                  {activeSlide?.video ? (
                    <>
                      {/* Mobile browsers may block autoplay; show the banner image instead of a black video frame. */}
                      {heroImage && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={heroImage} alt={activeSlide.title} className={`h-full w-full object-cover brightness-[0.96] sm:hidden ${activeSlide.position || "object-center"}`} />
                      )}
                      <video
                        key={activeSlide.video}
                        src={activeSlide.video}
                        autoPlay
                        loop
                        muted
                        playsInline
                        preload="metadata"
                        poster={heroImage || undefined}
                        className={`hidden sm:block w-full h-full object-cover filter brightness-[0.92] ${activeSlide.position || "object-center"}`}
                      />
                    </>
                  ) : (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={heroImage || undefined}
                      alt={activeSlide?.title ?? ""}
                      className={`w-full h-full object-cover filter brightness-[0.96] sm:brightness-[0.92] ${activeSlide?.position || "object-center"}`}
                    />
                  )}
                  {/* Clean light overlays so the luxury photography is bright & crystal clear */}
                  {hasHeroImage && <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/10 sm:from-black/75 sm:to-black/20" />}
                  {hasHeroImage && <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-transparent sm:from-black/35" />}
                </motion.div>
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ---- VIDEO MODE ---- */}
        <AnimatePresence>
          {heroMode === "video" && (
            <motion.div
              key="video-bg"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
              className="absolute inset-0"
            >
              {/* ---- FULLSCREEN BACKGROUND VIDEO ---- */}
              {heroImage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={heroImage} alt={activeSlide?.title || "Vani Collection"} className="absolute inset-0 h-full w-full object-cover brightness-[0.96] sm:hidden" />
              )}
              <video
                key={heroVideo ?? "atelier-default-video"}
                src={heroVideo}
                autoPlay
                loop
                muted
                playsInline
                preload="metadata"
                className="absolute inset-0 hidden sm:block w-full h-full object-cover object-center filter brightness-[0.88]"
                poster={heroImage || undefined}
              >
                {!heroVideo && (
                  <>
                    <source src="/videos/hero-video.mp4" type="video/mp4" />
                    <source src="/videos/hero-video.webm" type="video/webm" />
                    <source src="https://videos.pexels.com/video-files/8534828/8534828-hd_1920_1080_25fps.mp4" type="video/mp4" />
                    <source src="https://videos.pexels.com/video-files/6069268/6069268-hd_1280_720_25fps.mp4" type="video/mp4" />
                  </>
                )}
              </video>
              {/* Clean minimal overlays (video stays bright & clear, button stands out) */}
              {hasHeroImage && <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/10 sm:from-black/75 sm:to-black/20" />}
              {hasHeroImage && <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-transparent sm:from-black/35" />}
              <div className="hidden sm:block absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(136,19,55,0.15),transparent_50%)] pointer-events-none" />

              {/* Subtle animated noise grain for cinematic feel */}
              <div
                className="hidden sm:block absolute inset-0 opacity-[0.035] pointer-events-none"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
                  backgroundSize: "200px 200px",
                }}
              />
              {/* LIVE badge for video mode */}
              <div className="hidden sm:flex absolute top-3.5 left-3.5 sm:top-6 sm:left-6 items-center gap-2 bg-black/60 backdrop-blur-md border border-[#dfc28c]/40 px-3 py-1.5 rounded-full z-20 shadow-lg">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                <span className="text-[#dfc28c] text-[10px] font-bold uppercase tracking-[0.2em]">Atelier Live</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ---- SHARED HERO CONTENT OVERLAY ---- */}
        <div
          className="relative z-10 mx-auto flex h-full max-w-[1440px] flex-col justify-end px-5 pb-14 sm:px-8 sm:pb-16 lg:px-14 lg:pb-20"
        >
          <motion.div
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.55 }}
            className={`mb-3 max-w-xl sm:mb-7 ${hasHeroImage ? "text-white" : "text-stone-900"}`}
          >
            {(activeSlide?.tag || !activeSlide) && (
              <p className={`mb-1.5 text-[9px] font-semibold uppercase tracking-[0.22em] sm:mb-3 sm:text-xs ${hasHeroImage ? "text-[#dfc28c]" : "text-[#881337]"}`}>
                {activeSlide?.tag || "Handcrafted in Guna"}
              </p>
            )}
            <h1 className="font-serif text-3xl font-medium leading-[1.08] sm:text-5xl lg:text-6xl">
              {activeSlide?.title ?? banners[0]?.title ?? "Vani Collection"}
            </h1>
            {(activeSlide?.subtitle || !activeSlide) && (
              <p className={`mt-1 text-[10px] font-medium uppercase tracking-[0.16em] sm:mt-2 sm:text-sm ${hasHeroImage ? "text-white/75" : "text-stone-600"}`}>
                {activeSlide?.subtitle || "Speciality in Fancy Kurties & Party Wear Dresses"}
              </p>
            )}
            {(activeSlide?.desc || !activeSlide) && (
              <p className={`mt-1.5 max-w-lg text-[11px] leading-relaxed sm:mt-3 sm:text-base ${hasHeroImage ? "text-white/85" : "text-stone-700"}`}>
                {activeSlide?.desc || "Explore our handcrafted collection of elegant Indian wear."}
              </p>
            )}
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="w-full sm:w-auto flex flex-col items-stretch sm:items-start"
          >
            {/* Single Attractive Explore Collection Button */}
            <a
              href={activeSlide?.ctaLink || "#products"}
              className="group relative inline-flex items-center justify-center gap-3 overflow-hidden rounded-full bg-gradient-to-r from-[#b91c1c] via-[#881337] to-[#701a35] px-6 py-2.5 sm:px-10 sm:py-4 text-[10px] sm:text-sm font-bold uppercase tracking-[0.2em] sm:tracking-[0.25em] text-white shadow-[0_4px_30px_rgba(185,28,28,0.55)] border border-[#dfc28c]/60 transition-all duration-300 hover:shadow-[0_6px_35px_rgba(223,194,140,0.5),0_4px_25px_rgba(136,19,55,0.7)] hover:border-[#dfc28c] hover:-translate-y-0.5 active:scale-95 text-center w-full sm:w-auto"
            >
              <span className="relative z-10">{activeSlide?.ctaText || "Explore Products"}</span>
              <span className="relative z-10 text-[#dfc28c] text-base transition-transform duration-300 group-hover:translate-x-1.5">→</span>
              <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full duration-1000 bg-gradient-to-r from-transparent via-white/30 to-transparent transition-all" />
            </a>
          </motion.div>

          {/* Slide indicators — only in slides mode */}
          <AnimatePresence>
            {heroMode === "slides" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="hidden sm:flex absolute right-5 sm:right-10 bottom-14 sm:bottom-12 items-center gap-2.5"
              >
                {banners.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setHeroSlide(i)}
                    className={`transition-all duration-300 rounded-full ${
                      safeSlideIndex === i
                        ? "w-7 sm:w-8 h-2 bg-[#dfc28c]"
                        : "w-2 h-2 bg-white/50 hover:bg-white"
                    }`}
                    aria-label={`Slide ${i + 1}`}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </section>

      {/* ================= 2. CIRCULAR STORY HIGHLIGHTS (Aisha Creations Style) ================= */}
      {stories.length > 0 && (
      <section id="stories" className="py-5 sm:py-10 border-b border-[#e8dfd5] bg-[#faf7f2]">
        <div className="max-w-[1500px] mx-auto px-4 sm:px-8">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div>
              <span className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-[0.3em] text-[#b8935a]">
                Live From Atelier
              </span>
              <h2 className="font-serif text-lg sm:text-2xl text-stone-900">
                Shop Our Story Highlights
              </h2>
            </div>
            <span className="text-[11px] text-stone-500 hidden sm:inline">
              Tap any highlight to preview reels & outfits
            </span>
          </div>

          {/* Stories Horizontal Scroll with touch snap */}
          <div className="flex items-start gap-3 sm:gap-7 overflow-x-auto pb-3 pt-1 scrollbar-none snap-x -mx-4 px-4 sm:mx-0 sm:px-0">
            {stories.map((story) => (
              <button
                key={story.id}
                onClick={() => setActiveStory(story)}
                className="flex flex-col items-center shrink-0 group focus:outline-none snap-start min-w-[72px] sm:min-w-[88px]"
              >
                {/* Glowing ring */}
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full p-[2px] sm:p-[2.5px] bg-gradient-to-tr from-[#dfc28c] via-[#881337] to-[#b8935a] group-hover:scale-105 transition-transform duration-300 shadow-xs">
                  <div className="w-full h-full rounded-full border-2 border-white overflow-hidden bg-stone-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={story.image}
                      alt={story.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  </div>
                </div>
                <span className="text-[10px] sm:text-xs font-medium text-stone-800 mt-1.5 sm:mt-2 text-center max-w-[72px] sm:max-w-[85px] leading-tight group-hover:text-[#881337] transition">
                  {story.name}
                </span>
                <span className="text-[8.5px] sm:text-[9px] text-[#b8935a] font-semibold">
                  {story.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* ================= 3. CURATED BENTO COLLECTIONS (Label Amrita Prestige Style) ================= */}
      {stories.length > 0 && (
      <section className="py-12 sm:py-20 max-w-[1500px] mx-auto px-4 sm:px-8 lg:px-12">
        <div className="text-center max-w-xl mx-auto mb-10 sm:mb-16">
          <span className="text-[9.5px] sm:text-[10px] font-semibold uppercase tracking-[0.35em] text-[#b8935a]">
            Curated For The Modern Woman
          </span>
          <h2 className="font-serif text-2xl sm:text-4xl lg:text-5xl text-stone-900 mt-1 sm:mt-2 font-normal">
            Signature Ensembles
          </h2>
          <div className="w-12 sm:w-16 h-[1.5px] bg-[#881337] mx-auto mt-3 sm:mt-4" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-4 sm:gap-5 lg:gap-8">
          {/* Card 1: Large Featured Mul Cotton */}
          <div
            onClick={() => chooseCategory("mul-cotton")}
            className="sm:col-span-2 md:col-span-7 relative h-[300px] sm:h-[420px] lg:h-[500px] rounded-2xl overflow-hidden group cursor-pointer shadow-sm hover:shadow-xl transition-all"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1200&q=85"
              alt="The Mul Cotton Sanctuary"
              className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
            <div className="absolute bottom-0 inset-x-0 p-6 sm:p-8 lg:p-10 text-white flex flex-col justify-end">
              <span className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-[0.28em] text-[#dfc28c] mb-1.5 sm:mb-2">
                Everyday Featherlight Luxury
              </span>
              <h3 className="font-serif text-xl sm:text-3xl lg:text-4xl font-light mb-1.5 sm:mb-2">
                The Pure Mul Cotton Sanctuary
              </h3>
              <p className="text-xs sm:text-sm text-stone-200/90 max-w-md font-light mb-3 sm:mb-4 line-clamp-2 sm:line-clamp-none">
                100-count breathable handloom voile with authentic Guna &amp; Bagru prints and gossamer Kota Doria dupattas.
              </p>
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] font-semibold text-[#dfc28c] group-hover:text-white transition">
                <span>Explore Mul Cotton Edit</span>
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </div>
          </div>

          {/* Card 2: Festive Edit */}
          <div
            onClick={() => chooseCategory("festive")}
            className="sm:col-span-1 md:col-span-5 relative h-[300px] sm:h-[420px] lg:h-[500px] rounded-2xl overflow-hidden group cursor-pointer shadow-sm hover:shadow-xl transition-all"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1000&q=85"
              alt="Gulmohar Festive Atelier"
              className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
            <div className="absolute bottom-0 inset-x-0 p-6 sm:p-8 lg:p-10 text-white flex flex-col justify-end">
              <span className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-[0.28em] text-[#dfc28c] mb-1.5 sm:mb-2">
                Royal Ceremonies
              </span>
              <h3 className="font-serif text-xl sm:text-2xl lg:text-3xl font-light mb-1.5 sm:mb-2">
                Gulmohar Festive Heirlooms
              </h3>
              <p className="text-xs text-stone-200/90 font-light mb-3 sm:mb-4 line-clamp-2 sm:line-clamp-none">
                Silk Chanderi ensembles accented with handcrafted gota patti, marodi, and pita zari stitches.
              </p>
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] font-semibold text-[#dfc28c] group-hover:text-white transition">
                <span>Shop Festive Edit</span>
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </div>
          </div>

          {/* Card 3: Indo-Western Co-ords */}
          <div
            onClick={() => chooseCategory("coord-sets")}
            className="sm:col-span-1 md:col-span-6 relative h-[260px] sm:h-[360px] lg:h-[420px] rounded-2xl overflow-hidden group cursor-pointer shadow-sm hover:shadow-xl transition-all"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1000&q=85"
              alt="Indo-Western Co-ords"
              className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
            <div className="absolute bottom-0 inset-x-0 p-6 sm:p-8 text-white">
              <span className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-[0.28em] text-[#dfc28c] mb-1.5 block">
                Contemporary Chic
              </span>
              <h3 className="font-serif text-lg sm:text-2xl font-light mb-1">
                Modern Indo-Western Co-ords
              </h3>
              <p className="text-xs text-stone-200/90 font-light mb-2.5 line-clamp-2">
                Effortless high-low tunics and cigarette trousers for airport & brunch comfort.
              </p>
              <span className="text-xs uppercase tracking-[0.2em] font-semibold text-[#dfc28c]">
                Shop Co-ord Sets →
              </span>
            </div>
          </div>

          {/* Card 4: Royal Anarkalis */}
          <div
            onClick={() => setActiveTab("all")}
            className="sm:col-span-1 md:col-span-6 relative h-[260px] sm:h-[360px] lg:h-[420px] rounded-2xl overflow-hidden group cursor-pointer shadow-sm hover:shadow-xl transition-all"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=1000&q=85"
              alt="Royal Kalidaar Anarkalis"
              className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
            <div className="absolute bottom-0 inset-x-0 p-6 sm:p-8 text-white">
              <span className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-[0.28em] text-[#dfc28c] mb-1.5 block">
                Regal Silhouette
              </span>
              <h3 className="font-serif text-lg sm:text-2xl font-light mb-1">
                Kalidaar & Angrakha Suites
              </h3>
              <p className="text-xs text-stone-200/90 font-light mb-2.5 line-clamp-2">
                Dramatic 5-meter royal flare with authentic hand-tied fabric latkans and scalloped trims.
              </p>
              <span className="text-xs uppercase tracking-[0.2em] font-semibold text-[#dfc28c]">
                View Anarkali Sets →
              </span>
            </div>
          </div>
        </div>
      </section>
      )}

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
                selectedSize={selectedSizes[product.id] || product.sizes[0]}
                onSelectSize={handleSizeChange}
              />
            ))}
          </div>
          )}
        </div>
      </section>

      {/* ================= 4b. SHOP FROM THE VIDEO (REELS SHOWCASE & MODAL) ================= */}
      <ShopFromVideo reels={reels} />

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
                ) || catalogueProducts[0];

                const productSize = (matchedProduct && selectedSizes[matchedProduct.id]) || (matchedProduct?.sizes?.[0]) || "M";

                return (
                  <div
                    key={pin.id}
                    style={{ top: pin.top, left: pin.left }}
                    className="absolute transform -translate-x-1/2 -translate-y-1/2 z-20"
                  >
                    <button
                      onClick={() => setActivePin(activePin === pin.id ? null : pin.id)}
                      className="relative flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#dfc28c] text-stone-900 font-bold text-xs shadow-lg hover:scale-110 transition cursor-pointer"
                    >
                      <span className="absolute inset-0 rounded-full bg-[#dfc28c] animate-ping opacity-60" />
                      <span>+</span>
                    </button>

                    {/* Pin Tooltip Box */}
                    <AnimatePresence>
                      {activePin === pin.id && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute left-1/2 -translate-x-1/2 top-9 sm:top-10 w-48 sm:w-56 bg-white/95 backdrop-blur-md p-3 sm:p-3.5 rounded-xl shadow-2xl border border-stone-200 text-stone-900 z-30"
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
                            <div className="flex items-center gap-1.5">
                              {matchedProduct && (
                                <button
                                  type="button"
                                  onClick={() => setQuickViewProduct(matchedProduct)}
                                  className="border border-stone-300 text-stone-700 px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wider font-semibold hover:border-stone-900 hover:text-stone-900 transition cursor-pointer"
                                  title="Quick View"
                                >
                                  View
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  if (matchedProduct) {
                                    addToCart(matchedProduct, productSize, 1);
                                  }
                                }}
                                className="bg-[#1c1917] text-white px-2.5 sm:px-3 py-1 rounded-full text-[9px] sm:text-[10px] uppercase tracking-wider font-semibold hover:bg-[#881337] transition shadow-xs cursor-pointer"
                              >
                                + Bag
                              </button>
                            </div>
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

      {/* ================= 6. ARTISANAL HERITAGE & CRAFT PILLARS ================= */}
      {/* ================= 7. VERIFIED CUSTOMER REVIEWS (SIDE-SCROLLABLE WITH CUSTOMER PHOTO) ================= */}
      {displayTestimonials.length > 0 && (
      <section className="py-14 sm:py-20 max-w-[1500px] mx-auto px-4 sm:px-8 lg:px-12 overflow-hidden">
        {/* Section Header with Side-Scroll Controls */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 sm:mb-12 gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#b8935a]/30 bg-[#b8935a]/10 px-3 py-1 text-[10px] font-semibold tracking-[0.25em] uppercase text-[#b8935a] mb-2.5">
              <span>✦ Honest Love</span>
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl text-stone-900 font-normal">
              Echoes from Our Community
            </h2>
            <p className="text-xs sm:text-sm text-stone-500 font-light mt-1 max-w-lg">
              Loved by patrons across India for pure fabrics, handcrafted tailoring, and prompt Guna delivery.
            </p>
          </div>

          {/* Navigation Arrows for Horizontal Side-Scroll */}
          <div className="flex items-center gap-3 shrink-0">
            <span className="hidden sm:inline text-[11px] text-stone-400 font-light">
              Scroll or drag ✦
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => scrollTestimonials("left")}
                disabled={!canScrollTestiLeft}
                aria-label="Previous customer review"
                className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full border flex items-center justify-center transition-all duration-200 ${
                  canScrollTestiLeft
                    ? "border-stone-300 text-stone-800 bg-white hover:border-[#881337] hover:bg-[#881337] hover:text-white shadow-sm cursor-pointer"
                    : "border-stone-200 text-stone-300 bg-stone-50 cursor-not-allowed opacity-60"
                }`}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => scrollTestimonials("right")}
                disabled={!canScrollTestiRight}
                aria-label="Next customer review"
                className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full border flex items-center justify-center transition-all duration-200 ${
                  canScrollTestiRight
                    ? "border-stone-300 text-stone-800 bg-white hover:border-[#881337] hover:bg-[#881337] hover:text-white shadow-sm cursor-pointer"
                    : "border-stone-200 text-stone-300 bg-stone-50 cursor-not-allowed opacity-60"
                }`}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Side-Scrollable Track */}
        <div
          ref={testimonialsScrollRef}
          onScroll={updateTestimonialScrollState}
          className="flex gap-5 sm:gap-6 overflow-x-auto scrollbar-none snap-x snap-mandatory py-3 px-1 -mx-4 sm:-mx-8 lg:-mx-12 px-4 sm:px-8 lg:px-12 scroll-smooth"
        >
          {displayTestimonials.map((rev) => (
            <div
              key={rev.id}
              className="snap-start shrink-0 w-[300px] sm:w-[360px] lg:w-[390px] bg-white p-6 sm:p-7 rounded-2xl border border-stone-200/90 shadow-xs hover:shadow-xl hover:border-[#dfc28c]/60 transition-all duration-300 flex flex-col justify-between group"
            >
              <div>
                {/* Header: Stars & Verified Badge */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div
                    className="flex items-center gap-1 text-amber-500 text-sm"
                    aria-label={`${rev.rating} out of 5 stars`}
                  >
                    <span>{"★".repeat(Math.max(0, Math.min(5, Math.round(rev.rating))))}</span>
                    <span className="text-stone-300">{"★".repeat(Math.max(0, 5 - Math.min(5, Math.round(rev.rating))))}</span>
                    <span className="text-[11px] font-semibold text-stone-700 ml-1">
                      {rev.rating}.0
                    </span>
                  </div>
                  {rev.verified && (
                    <span className="text-[9px] sm:text-[10px] bg-emerald-50 text-emerald-800 font-semibold px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1 shrink-0">
                      <span>✓</span> Verified Buyer
                    </span>
                  )}
                </div>

                {/* Review Title */}
                {rev.title && (
                  <h4 className="font-serif text-base sm:text-lg font-semibold text-stone-900 mb-2 leading-snug group-hover:text-[#881337] transition-colors">
                    &ldquo;{rev.title}&rdquo;
                  </h4>
                )}

                {/* Review Text */}
                <p className="text-xs sm:text-[13px] text-stone-600 leading-relaxed font-light mb-4">
                  {rev.comment}
                </p>

                {/* Purchased Product Tag (if available) */}
                {rev.product && (
                  <div className="mb-4 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#faf7f2] border border-[#ebe4d8] text-[11px] text-stone-600 font-medium">
                    <span className="text-[#881337]">✦</span>
                    <span className="truncate max-w-[260px]">{rev.product}</span>
                  </div>
                )}
              </div>

              {/* Customer Profile & Photo Area */}
              <div className="pt-4 border-t border-stone-100 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Customer Photo with graceful fallback */}
                  {rev.image ? (
                    <div className="relative shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={rev.image}
                        alt={rev.name}
                        className="w-11 h-11 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-[#dfc28c]/60 shadow-sm"
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = "none";
                          const fallbackEl = (e.currentTarget.parentElement as HTMLElement)?.querySelector(".avatar-fallback");
                          if (fallbackEl) (fallbackEl as HTMLElement).style.display = "flex";
                        }}
                      />
                      <div className="avatar-fallback hidden w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-[#881337] to-[#1c1917] text-[#dfc28c] font-serif font-bold text-base items-center justify-center border border-[#dfc28c]/40 shadow-sm">
                        {rev.name.charAt(0)}
                      </div>
                    </div>
                  ) : (
                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-[#881337] to-[#1c1917] text-[#dfc28c] font-serif font-bold text-base flex items-center justify-center border border-[#dfc28c]/40 shadow-sm shrink-0">
                      {rev.name.charAt(0)}
                    </div>
                  )}

                  <div className="min-w-0">
                    <h5 className="font-semibold text-stone-900 text-xs sm:text-sm truncate">{rev.name}</h5>
                    <p className="text-[10px] sm:text-[11px] text-stone-400 truncate">
                      {rev.city}{rev.date ? ` · ${rev.date}` : ""}
                    </p>
                  </div>
                </div>

                {/* Decorative Quote Icon */}
                <span className="text-2xl text-stone-200 font-serif select-none shrink-0 group-hover:text-[#dfc28c]/50 transition-colors">
                  &rdquo;
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
      )}

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
                  href="mailto:Vanicollectionguna@gmail.com"
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
                title="Vani Collection atelier location in Guna, Madhya Pradesh"
                src="https://www.google.com/maps?q=Vani+Collection+Station+Road+Guna+Madhya+Pradesh&output=embed"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
                className="aspect-[4/3] min-h-[280px] w-full border-0"
              />
              <div className="flex flex-wrap items-center justify-between gap-4 border-t border-stone-200 px-5 py-4 sm:px-6">
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-[0.25em] text-[#881337]">Flagship Atelier</p>
                  <p className="mt-1 font-serif text-lg text-stone-900">Station Road · Guna, MP</p>
                </div>
                <a
                  href="https://www.google.com/maps/dir/?api=1&destination=Vani+Collection+Station+Road+Guna+Madhya+Pradesh"
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
                  <p className="text-stone-500 mt-0.5">+91 98765-43210</p>
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
                  href="https://wa.me/919876543210?text=Hello%20Vani%20Collection%20Atelier!"
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



      {/* Story Reel Modal */}
      <StoryReelModal
        story={activeStory}
        onClose={() => setActiveStory(null)}
        onSelectCategory={(key) => setActiveTab(key)}
      />
    </div>
  );
}