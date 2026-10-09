"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "../../context/CartContext";
import { HERO_SLIDES, STORIES_CATEGORIES, EDITORIAL_LOOKBOOK, REVIEWS, CategoryStory } from "../../data/products";
import type { HeroSlide, Lookbook, Testimonial } from "../../lib/content";
import type { CategoryStory as CmsCategoryStory } from "../../lib/content";
import { useCatalogue } from "../../lib/use-storefront";
import StoryReelModal from "../../components/StoryReelModal";
import LivingProductCard from "../../components/LivingProductCard";

export interface HomeViewProps {
  banners?: HeroSlide[];
  testimonials?: Testimonial[];
  lookbook?: Lookbook;
  stories?: CmsCategoryStory[];
  faqs?: { question: string; answer: string }[];
  /** True when at least one block came from the CMS. Drives the small "live content" note. */
  fromCms?: boolean;
}

/**
 * The homepage body.
 *
 * Split out of `page.tsx` so that file can be a Server Component: it fetches the CMS blocks, exports
 * `generateMetadata` and mounts the FAQPage JSON-LD — none of which a `"use client"` module can do.
 * Content arrives as props and every prop defaults to the bundled demo data, so this renders
 * identically with an empty CMS, no backend at all, or a partially populated one.
 */
export default function HomeView({
  banners = HERO_SLIDES,
  testimonials = REVIEWS,
  lookbook = EDITORIAL_LOOKBOOK,
  stories = STORIES_CATEGORIES,
  faqs = [],
  fromCms = false,
}: HomeViewProps = {}) {
  const { addToCart, setQuickViewProduct, toggleWishlist, isInWishlist } = useCart();

  // Active filter tab
  const [activeTab, setActiveTab] = useState<string>("all");
  // Story modal state
  const [activeStory, setActiveStory] = useState<CategoryStory | null>(null);
  // Active Hero Slide
  const [heroSlide, setHeroSlide] = useState<number>(0);
  // Start with the lightweight image experience; video remains an explicit opt-in.
  const [heroMode, setHeroMode] = useState<"slides" | "video">("slides");
  // Active hotspot pin
  const [activePin, setActivePin] = useState<string | null>("pin-1");
  // Quick size selection per product card
  const [selectedSizes, setSelectedSizes] = useState<Record<string, string>>({
    "vani-1": "M",
    "vani-2": "M",
    "vani-3": "S",
    "vani-4": "M",
    "vani-5": "L",
    "vani-6": "M",
    "vani-7": "S",
    "vani-8": "Free Size (6.5m with blouse)",
  });
  // Newsletter email state
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(false);

  const catalogue = useCatalogue();
  const catalogueProducts = catalogue.data;

  // Filter products according to active tab
  const filteredProducts = catalogueProducts.filter((p) => {
    if (activeTab === "all") return true;
    if (activeTab === "mul-cotton") return p.category === "mul-cotton";
    if (activeTab === "festive") return p.category === "festive";
    if (activeTab === "coord-sets") return p.category === "coord-sets";
    if (activeTab === "budget") return p.price <= 1999;
    return true;
  });


  /* The CMS may publish one banner where the bundle had two, and `heroSlide` is state that survives
     a prop change — so clamp the index rather than reading past the end of the array. */
  const safeSlideIndex = banners.length ? Math.min(heroSlide, banners.length - 1) : 0;
  const activeSlide: HeroSlide | undefined = banners[safeSlideIndex];

  const handleSizeChange = (productId: string, size: string) => {
    setSelectedSizes((prev) => ({ ...prev, [productId]: size }));
  };

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (newsletterEmail) {
      setNewsletterSubscribed(true);
      setNewsletterEmail("");
    }
  };

  return (
    <div
      className="relative min-h-screen bg-[#faf7f2] text-[#1c1917] pb-16 lg:pb-0"
      // Invisible to shoppers, but answers the first question a merchant asks after editing a block:
      // "is the homepage actually reading my CMS content, or still the bundled copy?"
      data-content-source={fromCms ? "cms" : "bundled"}
    >
      {/* ================= 1. EDITORIAL HERO — DUAL MODE (Video / Slides) ================= */}
      <section className="relative h-[85vh] sm:h-[84vh] min-h-[510px] sm:min-h-[580px] max-h-[860px] w-full overflow-hidden bg-[#12080a]">

        {/* ---- MODE TOGGLE PILL (top-right corner) ---- */}
        <div className="absolute top-3.5 right-3.5 sm:top-6 sm:right-6 z-30 flex items-center gap-1 bg-black/60 backdrop-blur-xl border border-[#dfc28c]/40 rounded-full p-1 shadow-[0_4px_25px_rgba(0,0,0,0.6)]">
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
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M23 7l-7 5 7 5V7z" />
              <rect x="1" y="5" width="15" height="14" rx="2" />
            </svg>
            <span className="hidden sm:inline">Video</span>
          </button>
        </div>

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
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={activeSlide?.image}
                    alt={activeSlide?.title ?? ""}
                    className={`w-full h-full object-cover filter brightness-[0.92] ${activeSlide?.position || "object-center"}`}
                  />
                  {/* Clean light overlays so the luxury photography is bright & crystal clear */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/20" />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/35 via-transparent to-transparent" />
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
              <video
                autoPlay
                loop
                muted
                playsInline
                preload="metadata"
                className="absolute inset-0 w-full h-full object-cover object-center filter brightness-[0.88]"
                poster="https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=1800&q=85"
              >
                <source src="/videos/hero-video.mp4" type="video/mp4" />
                <source src="/videos/hero-video.webm" type="video/webm" />
                <source src="https://videos.pexels.com/video-files/8534828/8534828-hd_1920_1080_25fps.mp4" type="video/mp4" />
                <source src="https://videos.pexels.com/video-files/6069268/6069268-hd_1280_720_25fps.mp4" type="video/mp4" />
              </video>
              {/* Clean minimal overlays (video stays bright & clear, button stands out) */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/20" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/35 via-transparent to-transparent" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(136,19,55,0.15),transparent_50%)] pointer-events-none" />

              {/* Subtle animated noise grain for cinematic feel */}
              <div
                className="absolute inset-0 opacity-[0.035] pointer-events-none"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
                  backgroundSize: "200px 200px",
                }}
              />
              {/* LIVE badge for video mode */}
              <div className="absolute top-3.5 left-3.5 sm:top-6 sm:left-6 flex items-center gap-2 bg-black/60 backdrop-blur-md border border-[#dfc28c]/40 px-3 py-1.5 rounded-full z-20 shadow-lg">
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
            className="mb-5 max-w-xl text-white sm:mb-7"
          >
            {activeSlide?.tag && (
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-[#dfc28c]">
                {activeSlide.tag}
              </p>
            )}
            <h1 className="font-serif text-4xl font-medium leading-[1.08] sm:text-5xl lg:text-6xl">
              {activeSlide?.title ?? banners[0]?.title ?? "Poetry in pure Mul Cotton"}
            </h1>
            {activeSlide?.subtitle && (
              <p className="mt-2 text-xs font-medium uppercase tracking-[0.16em] text-white/60 sm:text-sm">
                {activeSlide.subtitle}
              </p>
            )}
            {activeSlide?.desc && (
              <p className="mt-3 max-w-lg text-sm leading-relaxed text-white/80 sm:text-base">
                {activeSlide.desc}
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
              className="group relative inline-flex items-center justify-center gap-3 overflow-hidden rounded-full bg-gradient-to-r from-[#b91c1c] via-[#881337] to-[#701a35] px-8 sm:px-10 py-3.5 sm:py-4 text-xs sm:text-sm font-bold uppercase tracking-[0.25em] text-white shadow-[0_4px_30px_rgba(185,28,28,0.55)] border border-[#dfc28c]/60 transition-all duration-300 hover:shadow-[0_6px_35px_rgba(223,194,140,0.5),0_4px_25px_rgba(136,19,55,0.7)] hover:border-[#dfc28c] hover:-translate-y-0.5 active:scale-95 text-center w-full sm:w-auto"
            >
              <span className="relative z-10">{activeSlide?.ctaText || "Explore Collection"}</span>
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
                className="absolute right-5 sm:right-10 bottom-14 sm:bottom-12 flex items-center gap-2.5"
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

        {/* Social Proof Strip on Hero bottom */}
        <div className="absolute bottom-0 inset-x-0 bg-white/10 backdrop-blur-md border-t border-white/15 py-2.5 sm:py-3 z-10">
          <div className="max-w-[1500px] mx-auto px-4 sm:px-8 lg:px-16 flex items-center justify-between text-[10px] sm:text-[11px] text-stone-200 tracking-wider">
            <span className="flex items-center gap-1.5 text-[#dfc28c] mx-auto sm:mx-0">
              <span>★ ★ ★ ★ ★</span>
              <strong className="text-white font-semibold">4.9/5 Rating</strong> by 45,000+ Women
            </span>
            <span className="text-stone-300 hidden md:inline">
              ✦ 100% Bagru Handblock Print · Certified Organic Dyes
            </span>
            <span className="text-stone-300 hidden lg:inline">
              ✦ Direct from Jaipur Master Craftsmen
            </span>
          </div>
        </div>
      </section>

      {/* ================= 2. CIRCULAR STORY HIGHLIGHTS (Aisha Creations Style) ================= */}
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

      {/* ================= 3. CURATED BENTO COLLECTIONS (Label Amrita Prestige Style) ================= */}
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
            onClick={() => setActiveTab("mul-cotton")}
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
                100-count breathable handloom voile with authentic Jaipur Bagru prints and gossamer Kota Doria dupattas.
              </p>
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] font-semibold text-[#dfc28c] group-hover:text-white transition">
                <span>Explore Mul Cotton Edit</span>
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </div>
          </div>

          {/* Card 2: Festive Edit */}
          <div
            onClick={() => setActiveTab("festive")}
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
            onClick={() => setActiveTab("coord-sets")}
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
                Trending Creations
              </h2>
            </div>

            {/* Filter Tabs - horizontally scrollable on mobile */}
            <div className="relative w-full md:w-auto">
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory">
                {[
                  { label: "All Styles", key: "all" },
                  { label: "Pure Mul Cotton", key: "mul-cotton" },
                  { label: "Festive Suits", key: "festive" },
                  { label: "Co-ord Sets", key: "coord-sets" },
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
        </div>
      </section>

      {/* ================= 5. INTERACTIVE LOOKBOOK (HOTSPOTS BANNER) ================= */}
      <section id="lookbook" className="py-12 sm:py-20 max-w-[1500px] mx-auto px-4 sm:px-8 lg:px-12">
        <div className="text-center max-w-xl mx-auto mb-8 sm:mb-10">
          <span className="text-[9.5px] sm:text-[10px] font-semibold uppercase tracking-[0.35em] text-[#b8935a]">
            Editorial Styling
          </span>
          <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl text-stone-900 mt-1">
            Shop The Gulmohar Ensemble
          </h2>
          <p className="text-xs text-stone-600 mt-1.5 font-light">
            Tap on any floating gold pin on the muse to explore the handcrafted elements.
          </p>
        </div>

        <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden shadow-xl h-[380px] sm:h-[560px] lg:h-[650px] w-full border border-stone-200">
          {/* Main Lookbook Photography */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lookbook.image}
            alt={lookbook.title}
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/30" />

          {/* Interactive Floating Pulse Pins */}
          {lookbook.pins.map((pin) => (
            <div
              key={pin.id}
              style={{ top: pin.top, left: pin.left }}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 z-20"
            >
              <button
                onClick={() => setActivePin(activePin === pin.id ? null : pin.id)}
                className="relative flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#dfc28c] text-stone-900 font-bold text-xs shadow-lg hover:scale-110 transition"
              >
                <span className="absolute inset-0 rounded-full bg-[#dfc28c] animate-ping opacity-60" />
                <span>+</span>
              </button>

              {/* Pin Tooltip Box */}
              <AnimatePresence>
                {activePin === pin.id && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute left-1/2 -translate-x-1/2 top-9 sm:top-10 w-44 sm:w-52 bg-white/95 backdrop-blur-md p-3 sm:p-3.5 rounded-xl shadow-2xl border border-stone-200 text-stone-900 z-30"
                  >
                    <span className="text-[8.5px] sm:text-[9px] uppercase font-bold text-[#881337] tracking-wider block">
                      {pin.tag}
                    </span>
                    <h4 className="font-serif text-xs sm:text-sm font-semibold leading-tight my-1">
                      {pin.title}
                    </h4>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-stone-200">
                      <span className="text-xs font-bold text-[#881337]">{pin.price}</span>
                      <button
                        onClick={() => {
                          const prod = catalogueProducts[0];
                          addToCart(prod, "M", 1);
                        }}
                        className="bg-[#1c1917] text-white px-2.5 sm:px-3 py-1 rounded-full text-[9px] sm:text-[10px] uppercase tracking-wider font-semibold hover:bg-[#881337] transition"
                      >
                        + Bag
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}

          {/* Lookbook Title Badge */}
          <div className="absolute bottom-6 sm:bottom-8 left-5 sm:left-12 right-5 sm:right-auto text-white max-w-md z-10">
            <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.3em] font-semibold text-[#dfc28c] bg-black/40 px-2.5 sm:px-3 py-1 rounded-full backdrop-blur-md">
              {lookbook.subtitle}
            </span>
            <h3 className="font-serif text-2xl sm:text-4xl font-light mt-2.5 mb-1.5 sm:mb-2">
              {lookbook.title}
            </h3>
            <p className="text-[11px] sm:text-xs text-stone-300 font-light line-clamp-2 sm:line-clamp-none">
              Crafted in collaboration with Bagru artisans. Tailored with royal kalis for effortless festive comfort.
            </p>
          </div>
        </div>
      </section>

      {/* ================= 6. ARTISANAL HERITAGE & CRAFT PILLARS ================= */}
      <section className="py-14 sm:py-20 bg-[#f5ede3] border-t border-[#e8dfd5]">
        <div className="max-w-[1500px] mx-auto px-4 sm:px-8 lg:px-12">
          <div className="text-center max-w-xl mx-auto mb-10 sm:mb-16">
            <span className="text-[9.5px] sm:text-[10px] font-semibold uppercase tracking-[0.35em] text-[#b8935a]">
              The Jaipur Atelier Soul
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl text-stone-900 mt-1 sm:mt-2 font-normal">
              Why Women Adore Vani Collection
            </h2>
            <div className="w-12 sm:w-16 h-[1.5px] bg-[#881337] mx-auto mt-3 sm:mt-4" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
            {[
              {
                icon: "🌿",
                title: "100-Count Pure Mul",
                desc: "Super combed, breathable featherlight cotton weave that caresses delicate skin without stiffness or polyester.",
              },
              {
                icon: "🪵",
                title: "Carved Teakwood Blocks",
                desc: "Master generational block carvers press each floral motif by hand with natural plant & mineral dyes.",
              },
              {
                icon: "✂️",
                title: "Designed For Real Bodies",
                desc: "Thoughtful tailoring with deep hidden pockets, soft elastic comfort waists, and relaxed silhouette room.",
              },
              {
                icon: "📦",
                title: "Zero-Plastic Heirloom Box",
                desc: "Every order arrives packaged in reusable cotton dust bags with fair trade support to women artisans.",
              },
            ].map((pillar, i) => (
              <div
                key={i}
                className="bg-[#faf7f2] p-6 sm:p-8 rounded-2xl border border-[#e8dfd5] text-center hover:shadow-lg transition-all"
              >
                <div className="w-12 h-12 sm:w-14 sm:h-14 mx-auto rounded-full bg-[#f2ece2] flex items-center justify-center text-xl sm:text-2xl mb-3 sm:mb-4 text-[#881337] shadow-inner">
                  {pillar.icon}
                </div>
                <h3 className="font-serif text-base sm:text-lg font-semibold text-stone-900 mb-1.5 sm:mb-2">
                  {pillar.title}
                </h3>
                <p className="text-xs text-stone-600 leading-relaxed font-light">
                  {pillar.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= 7. VERIFIED CUSTOMER REVIEWS ================= */}
      <section className="py-14 sm:py-20 max-w-[1500px] mx-auto px-4 sm:px-8 lg:px-12">
        <div className="text-center max-w-xl mx-auto mb-10 sm:mb-14">
          <span className="text-[9.5px] sm:text-[10px] font-semibold uppercase tracking-[0.35em] text-[#b8935a]">
            Honest Love
          </span>
          <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl text-stone-900 mt-1 sm:mt-2 font-normal">
            Echoes from Our Community
          </h2>
          <div className="w-12 sm:w-16 h-[1.5px] bg-[#881337] mx-auto mt-3 sm:mt-4" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 lg:gap-8">
          {testimonials.map((rev) => (
            <div
              key={rev.id}
              className="bg-white p-6 sm:p-8 rounded-2xl border border-stone-200 shadow-xs flex flex-col justify-between hover:shadow-md transition"
            >
              <div>
                <div
                  className="flex text-amber-500 text-sm mb-2.5 sm:mb-3"
                  aria-label={`${rev.rating} out of 5 stars`}
                >
                  {"★".repeat(Math.max(0, Math.min(5, Math.round(rev.rating))))}
                  <span className="text-stone-300">{"★".repeat(Math.max(0, 5 - Math.min(5, Math.round(rev.rating))))}</span>
                </div>
                {rev.title && (
                  <h4 className="font-serif text-base sm:text-lg font-semibold text-stone-900 mb-1.5 sm:mb-2">
                    &ldquo;{rev.title}&rdquo;
                  </h4>
                )}
                <p className="text-xs text-stone-600 leading-relaxed font-light mb-4 sm:mb-6">
                  {rev.comment}
                </p>
              </div>

              <div className="pt-3 sm:pt-4 border-t border-stone-100 flex items-center justify-between text-xs">
                <div>
                  <h5 className="font-semibold text-stone-900">{rev.name}</h5>
                  <p className="text-[10px] sm:text-[11px] text-stone-400">{rev.city} · {rev.date}</p>
                </div>
                {rev.verified && (
                  <span className="text-[9px] sm:text-[10px] bg-emerald-50 text-emerald-800 font-semibold px-2 py-0.5 rounded border border-emerald-200">
                    Verified Buyer ✓
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

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
                  href="mailto:care@vanicollection.com"
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

      {/* ================= 8. INSTAGRAM COMMUNITY (#VaniWomen) ================= */}
      <section className="py-10 sm:py-14 bg-[#faf7f2] border-t border-[#e8dfd5]">
        <div className="max-w-[1500px] mx-auto px-4 sm:px-8 text-center mb-6 sm:mb-8">
          <span className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-[0.35em] text-[#b8935a]">
            @vanicollection_jaipur
          </span>
          <h3 className="font-serif text-xl sm:text-3xl text-stone-900 mt-1">
            Follow The Atelier On Instagram
          </h3>
          <p className="text-xs text-stone-500 mt-1 font-light">
            Tag #VaniWomen to be featured in our seasonal lookbooks
          </p>
        </div>

        <div className="grid grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 max-w-[1500px] mx-auto px-3 sm:px-8">
          {[
            "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=600&q=80",
            "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=600&q=80",
            "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=600&q=80",
            "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=600&q=80",
            "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=600&q=80",
            "https://images.unsplash.com/photo-1609357605129-26f69add5d6e?auto=format&fit=crop&w=600&q=80",
          ].map((img, i) => (
            <div key={i} className="relative aspect-square rounded-lg sm:rounded-xl overflow-hidden group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img}
                alt="Instagram look"
                className="w-full h-full object-cover group-hover:scale-110 transition duration-500"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-base sm:text-lg">
                ♥
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ================= 9. VIP NEWSLETTER CLUB ================= */}
      <section className="py-14 sm:py-20 bg-[#1c1917] text-white">
        <div className="max-w-3xl mx-auto px-5 sm:px-6 text-center">
          <span className="text-[9.5px] sm:text-[10px] font-semibold uppercase tracking-[0.35em] text-[#dfc28c]">
            The Vani Club
          </span>
          <h2 className="font-serif text-2xl sm:text-4xl lg:text-5xl font-light mt-1.5 sm:mt-2 mb-2 sm:mb-3">
            Receive ₹200 Off Your First Order
          </h2>
          <p className="text-xs sm:text-sm text-stone-300 font-light max-w-md mx-auto mb-6 sm:mb-8">
            Be the first to preview seasonal handblock drops, festive heirlooms, and private boutique sales.
          </p>

          {newsletterSubscribed ? (
            <div className="bg-emerald-900/60 border border-emerald-500 text-emerald-200 p-3.5 sm:p-4 rounded-full text-xs font-semibold max-w-md mx-auto">
              ✓ Welcome to The Vani Club! Use coupon code <strong>FIRST10</strong> at checkout for 10% off.
            </div>
          ) : (
            <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 max-w-md mx-auto">
              <input
                type="email"
                required
                placeholder="Enter your email address"
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                className="flex-1 px-4 sm:px-5 py-3 sm:py-3.5 rounded-full bg-white/10 border border-white/20 text-white placeholder-stone-400 text-xs focus:outline-none focus:border-[#dfc28c]"
              />
              <button
                type="submit"
                className="bg-[#881337] hover:bg-[#6b0f2b] text-white px-6 sm:px-8 py-3 sm:py-3.5 rounded-full text-xs uppercase tracking-[0.2em] font-semibold transition"
              >
                Join Atelier
              </button>
            </form>
          )}
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