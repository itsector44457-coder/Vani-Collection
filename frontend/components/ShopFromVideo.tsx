"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import Link from "next/link";
import { useCart } from "../context/CartContext";
import type { PublishedReel } from "../lib/content";

/* ------------------------------------------------------------------ */
/*  Fallback curated reels if database has fewer than 6 reels         */
/* ------------------------------------------------------------------ */
const CURATED_REELS_FALLBACK = [
  {
    _id: "demo-reel-1",
    title: "Straight from Fav Serial to Your Wardrobe",
    description: "Pure muslin printed designer suit set with intricate gota patti and hand embroidery work.",
    videoUrl: "https://videos.pexels.com/video-files/8534828/8534828-hd_1920_1080_25fps.mp4",
    thumbnailUrl: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&q=80",
    position: 1,
    productId: {
      _id: "prod-demo-1",
      name: "Pure Muslin Printed Designer Suit Set",
      slug: "womens-pure-cotton-regular-fit-floral-printed-a-line-kurta",
      variants: [{ price: 4250, mrp: 5499, size: "M" }],
      fabric: "Pure Muslin Cotton",
      craft: "Gota Patti & Hand Embroidery",
      shortDescription: "Elevate your ethnic wardrobe with this elegant Suit set, crafted with timeless charm and intricate detailing.",
      description: "The Kurti features exquisite Dori threads and Zari embroidery highlighted with delicate motifs. Paired with coordinating bottoms and dupatta with cutwork borders.\n* Fabric: 100% Pure Muslin Cotton\n* Work: Intricate Dori thread and Zari embroidery\n* Delivery: Free shipping across India (3–5 days)\n* Return: 7-day hassle-free exchange",
      images: [{ url: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&q=80" }],
    },
  },
  {
    _id: "demo-reel-2",
    title: "Summer Readymade Ethnic Multicolor Embroidered",
    description: "Multicoloured floral embroidered white kurta set with delicate tassels and breathable mulmul cotton.",
    videoUrl: "https://videos.pexels.com/video-files/6069268/6069268-hd_1280_720_25fps.mp4",
    thumbnailUrl: "https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=800&q=80",
    position: 2,
    productId: {
      _id: "prod-demo-2",
      name: "Multi Coloured Floral Embroidered White Kurta Set",
      slug: "white-lucknowi-chikankari-kurta-set",
      variants: [{ price: 4650, mrp: 5999, size: "L" }],
      fabric: "Pure 100-Count Mul Cotton",
      craft: "Lucknowi Hand Chikankari",
      shortDescription: "Delicate pastel florals embroidered on ethereal featherweight cotton for summer elegance.",
      description: "Airy, breathable silhouettes tailored for festive soirees and garden brunches.\n* Fabric: 100-Count Long-staple Mul Cotton\n* Work: Multicolor floral thread embroidery with tassels\n* Includes: Kurta, Cigarette Pants & Sheer Dupatta\n* Guarantee: Colorfast and pre-shrunk",
      images: [{ url: "https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=800&q=80" }],
    },
  },
  {
    _id: "demo-reel-3",
    title: "Latest Gotta Patti Launch Perfect for Haldi & Mehendi",
    description: "New designer suit set with cutwork detailing, pastel tones, and shimmering zari borders.",
    videoUrl: "/videos/hero-video.mp4",
    thumbnailUrl: "https://images.unsplash.com/photo-1603189343302-e603f7add05a?w=800&q=80",
    position: 3,
    productId: {
      _id: "prod-demo-3",
      name: "NEW DESIGNER SUIT SET WITH CUTWORK",
      slug: "multi-color-digital-patola-printed-pure-gaji-silk-dupatta-with-tassels",
      variants: [{ price: 4850, mrp: 6250, size: "Free Size" }],
      fabric: "Premium Crushed Tissue Silk",
      craft: "Gotta Patti & Zari Cutwork",
      shortDescription: "Elevate your ethnic wardrobe with this elegant Suit set, crafted with timeless charm and intricate detailing.",
      description: "The Shirt features exquisite Dori threads and Zari embroidery highlighted with delicate motifs decorated with mirrors.\nPaired with a matching Opada silk bottomz and a beautifully coordinated dupatta adorned with embroidered cutwork borders.\n* Fabric: Premium Crushed tissue (lightweight with a soft sheen)\n* Work: Intricate Dori thread and Zari embroidery with cutwork\n* Neckline: Round neck with cutwork lace\n* Wash Care: Dry clean only",
      images: [{ url: "https://images.unsplash.com/photo-1603189343302-e603f7add05a?w=800&q=80" }],
    },
  },
  {
    _id: "demo-reel-4",
    title: "Summers Must Have in Contrast with Floral Printing",
    description: "Ethnic suit set with contrast print and embroidery work with soft organza dupatta.",
    videoUrl: "https://videos.pexels.com/video-files/8534828/8534828-hd_1920_1080_25fps.mp4",
    thumbnailUrl: "https://images.unsplash.com/photo-1609357605129-26f69add5d6e?w=800&q=80",
    position: 4,
    productId: {
      _id: "prod-demo-4",
      name: "Ethnic Suit Set with Contrast Print and Embroidery Work",
      slug: "mustard-embroidered-rayon-kurta-and-pants",
      variants: [{ price: 3550, mrp: 4500, size: "M" }],
      fabric: "Chanderi Cotton Silk",
      craft: "Bagru Handblock & Resham Work",
      shortDescription: "Bold contrast floral motifs on soft Chanderi silk with regal zari border.",
      description: "A signature daytime festive ensemble designed for effortless grace.\n* Fabric: Chanderi Cotton Blend\n* Work: Contrast floral block print & thread work\n* Fit: Regular comfortable straight fit\n* Dispatch: Within 24-48 hours",
      images: [{ url: "https://images.unsplash.com/photo-1609357605129-26f69add5d6e?w=800&q=80" }],
    },
  },
  {
    _id: "demo-reel-5",
    title: "Trousseau Search Ends with Embellished Handwork",
    description: "Premium Giraffe tissue suit with heavy neckline handwork and pearl detailing.",
    videoUrl: "https://videos.pexels.com/video-files/6069268/6069268-hd_1280_720_25fps.mp4",
    thumbnailUrl: "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800&q=80",
    position: 5,
    productId: {
      _id: "prod-demo-5",
      name: "Premium Giraffe Tissue Suit",
      slug: "womens-pure-cotton-regular-fit-floral-printed-a-line-kurta",
      variants: [{ price: 6850, mrp: 8500, size: "L" }],
      fabric: "Pure Tissue Silk",
      craft: "Zardozi & Pearl Hand Embroidery",
      shortDescription: "Regal bridal and festive ensemble with dense gold hand-embroidery and metallic sheen.",
      description: "Designed for grand receptions and wedding ceremonies.\n* Fabric: Metallic sheen tissue silk with soft cotton lining\n* Work: Zardozi, dabka, and authentic freshwater pearl work\n* Care: Professional dry cleaning recommended",
      images: [{ url: "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800&q=80" }],
    },
  },
  {
    _id: "demo-reel-6",
    title: "Hakuba Schiffli Embroidery Suit Set in Summer Colors",
    description: "Hakuba chicken stitched sets with scalloped hemlines and matching cotton pants.",
    videoUrl: "/videos/hero-video.mp4",
    thumbnailUrl: "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=800&q=80",
    position: 6,
    productId: {
      _id: "prod-demo-6",
      name: "HAKUBA CHICKEN STITCHED SETS",
      slug: "white-lucknowi-chikankari-kurta-set",
      variants: [{ price: 4550, mrp: 5799, size: "XL" }],
      fabric: "Pure Hakuba Cotton Schiffli",
      craft: "Schiffli Eyelet Embroidery",
      shortDescription: "All-over eyelet embroidery on pure breathable cotton in soothing lime & mint palettes.",
      description: "The ultimate hot-weather luxury staple.\n* Fabric: 100% Cotton Hakuba with voile lining\n* Detail: Cutwork hemline and sleeve borders\n* Includes: Designer Kurti, pants, and mulmul dupatta",
      images: [{ url: "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=800&q=80" }],
    },
  },
];

/* ------------------------------------------------------------------ */
/*  Lazy Card with Viewport-aware Boomerang Video Playback            */
/* ------------------------------------------------------------------ */
function VideoCard({
  reel,
  onOpen,
  hasMovedRef,
}: {
  reel: PublishedReel;
  onOpen: () => void;
  hasMovedRef: React.RefObject<boolean>;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [videoError, setVideoError] = useState(false);

  // Lazy observer: only play video when the card is within the user's viewport
  // This ensures MINIMAL load on the website and zero battery / CPU drain!
  useEffect(() => {
    const el = cardRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry) {
          setIsVisible(entry.isIntersecting);
          if (videoRef.current) {
            if (entry.isIntersecting) {
              videoRef.current.play().catch(() => { });
            } else {
              videoRef.current.pause();
            }
          }
        }
      },
      { rootMargin: "150px", threshold: 0.15 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const image = reel.thumbnailUrl || reel.productId?.images?.[0]?.url || "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&q=80";
  const price = reel.productId?.variants?.[0]?.price;
  const formattedPrice = price ? `Rs. ${price.toLocaleString("en-IN")}.00` : "Rs. 4,250.00";

  return (
    <div
      ref={cardRef}
      onClick={() => {
        if (hasMovedRef.current) return;
        onOpen();
      }}
      itemScope
      itemType="https://schema.org/VideoObject"
      style={{ transform: "translate3d(0,0,0)", willChange: "transform", contain: "layout paint" }}
      className="group snap-start shrink-0 w-[230px] sm:w-[265px] md:w-[285px] rounded-2xl overflow-hidden bg-white border border-stone-200/90 shadow-sm hover:shadow-xl transition-shadow duration-300 cursor-pointer flex flex-col"
    >
      <meta itemProp="name" content={reel.title || reel.productId?.name || "Shop From The Video"} />
      <meta itemProp="thumbnailUrl" content={image} />
      <meta itemProp="uploadDate" content="2026-01-01T08:00:00+05:30" />
      <meta itemProp="description" content={reel.description || reel.productId?.name || "Shop artisanal luxury ethnic wear"} />

      {/* ── Top: Video Area (9:16 Portrait Boomerang Loop) ── */}
      <div className="relative aspect-[9/15] w-full overflow-hidden bg-stone-900" style={{ transform: "translate3d(0,0,0)" }}>
        {!videoError && isVisible ? (
          <video
            ref={videoRef}
            src={reel.videoUrl}
            poster={image}
            autoPlay
            loop
            muted
            playsInline
            preload="none"
            disablePictureInPicture
            disableRemotePlayback
            style={{ transform: "translate3d(0,0,0)" }}
            onError={() => setVideoError(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={image}
            alt={reel.title || "Video Look"}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        )}

        {/* Gradient shadow for text visibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/25 pointer-events-none" />

        {/* Top Text / Badge (Solid background without heavy blur for 120fps scrolling) */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10 pointer-events-none">
          <span className="text-[9px] font-bold uppercase tracking-wider text-[#dfc28c] bg-black/75 px-2.5 py-1 rounded-full border border-[#dfc28c]/40 shadow-xs">
            Tap to Watch
          </span>
          <span className="w-7 h-7 rounded-full bg-black/75 flex items-center justify-center text-white text-xs border border-white/20 shadow-xs">
            🔇
          </span>
        </div>

        {/* Middle Banner text (Matching Image 1: ORDER NOW) */}
        <div className="absolute bottom-3 inset-x-3 text-center text-white z-10 pointer-events-none">
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#dfc28c] drop-shadow-sm">
            ORDER NOW:-
          </p>
          <p className="text-[11px] font-semibold text-white/95 tracking-wide drop-shadow-sm">
            +91 98765-43210
          </p>
        </div>
      </div>

      {/* ── Bottom: Product Info Bar (Matching Image 1 exactly) ── */}
      <div className="p-3 sm:p-3.5 bg-white flex items-center gap-2.5 border-t border-stone-100 min-w-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image}
          alt={reel.productId?.name || "Product"}
          className="w-10 h-10 rounded-lg object-cover shrink-0 border border-stone-200 bg-stone-50"
          loading="lazy"
        />
        <div className="min-w-0 flex-1">
          <h4 className="text-[12px] sm:text-[13px] font-semibold text-stone-900 truncate leading-snug group-hover:text-[#881337] transition-colors">
            {reel.productId?.name || reel.title}
          </h4>
          <p className="text-[11px] font-bold text-stone-600 mt-0.5">
            {formattedPrice}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Section & Interactive Modal Component (Image 1 & 2 Match)    */
/* ------------------------------------------------------------------ */
export default function ShopFromVideo({
  reels: propReels,
}: {
  reels?: PublishedReel[];
}) {
  const { addToCart } = useCart();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Combine backend reels with curated fallback reels so user always has 6-8 stunning cards
  const displayReels: PublishedReel[] = useMemo(() => {
    if (propReels && propReels.length >= 6) {
      return propReels;
    }
    const existing = propReels || [];
    const needed = Math.max(0, 6 - existing.length);
    return [...existing, ...CURATED_REELS_FALLBACK.slice(0, needed)] as PublishedReel[];
  }, [propReels]);

  // Modal State
  const [activeReelIndex, setActiveReelIndex] = useState<number | null>(null);
  const activeReel = activeReelIndex !== null ? displayReels[activeReelIndex] : null;

  // Video playback controls inside modal
  const modalVideoRef = useRef<HTMLVideoElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showDesc, setShowDesc] = useState(true);
  const [addedToast, setAddedToast] = useState(false);

  // Drag-to-scroll state for hand dragging with mouse or touch (Butter-smooth 120fps with RAF)
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftStartRef = useRef(0);
  const hasMovedRef = useRef(false);
  const rafIdRef = useRef<number | null>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    const el = scrollRef.current;
    if (!el) return;
    isDraggingRef.current = true;
    hasMovedRef.current = false;
    startXRef.current = e.clientX;
    scrollLeftStartRef.current = el.scrollLeft;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const el = scrollRef.current;
    if (!el) return;
    e.preventDefault();
    const currentX = e.clientX;
    const deltaX = (currentX - startXRef.current);
    if (Math.abs(deltaX) > 4) {
      hasMovedRef.current = true;
    }
    if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    rafIdRef.current = requestAnimationFrame(() => {
      if (el) {
        el.scrollLeft = scrollLeftStartRef.current - deltaX;
      }
    });
  };

  const handleMouseUpOrLeave = () => {
    isDraggingRef.current = false;
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
  };

  // Convert mouse wheel vertical scroll into horizontal carousel scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      // If user is already scrolling horizontally (trackpad), let native scroll work
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;

      const maxScroll = el.scrollWidth - el.clientWidth;
      if (maxScroll <= 0) return;

      const atLeft = el.scrollLeft <= 5;
      const atRight = el.scrollLeft >= maxScroll - 5;

      // If scrolling down/right and not at end, or scrolling up/left and not at start:
      if ((e.deltaY > 0 && !atRight) || (e.deltaY < 0 && !atLeft)) {
        e.preventDefault();
        el.scrollLeft += e.deltaY * 1.1;
      }
      // When at edges, let normal page scrolling continue without trapping!
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const scroll = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const distance = direction === "left" ? -340 : 340;
    el.scrollBy({ left: distance, behavior: "smooth" });
  };

  // Keyboard navigation inside modal
  useEffect(() => {
    if (activeReelIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveReelIndex(null);
      } else if (e.key === "ArrowLeft") {
        setActiveReelIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : displayReels.length - 1));
      } else if (e.key === "ArrowRight") {
        setActiveReelIndex((prev) => (prev !== null && prev < displayReels.length - 1 ? prev + 1 : 0));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeReelIndex, displayReels.length]);

  // Play/pause toggle inside modal
  const togglePlayPause = () => {
    const v = modalVideoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play();
      setIsPaused(false);
    } else {
      v.pause();
      setIsPaused(true);
    }
  };

  const toggleMute = () => {
    const v = modalVideoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setIsMuted(v.muted);
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeReel?.productId) return;
    const reelProduct = activeReel.productId;
    const variant = reelProduct.variants?.find((candidate) => candidate.sku) ?? reelProduct.variants?.[0];
    const image = reelProduct.images?.[0]?.url || activeReel.thumbnailUrl || "";
    const variants = (reelProduct.variants ?? []).flatMap((candidate) =>
      candidate.sku
        ? [{
            sku: candidate.sku,
            size: candidate.size,
            color: candidate.color,
            price: candidate.price,
            mrp: candidate.mrp ?? candidate.price,
          }]
        : [],
    );

    addToCart(
      {
        id: reelProduct._id,
        productId: reelProduct._id,
        slug: reelProduct.slug,
        title: reelProduct.name,
        category: reelProduct.category || "",
        fabric: reelProduct.fabric || reelProduct.craft || "",
        price: variant?.price ?? 4250,
        originalPrice: variant?.mrp ?? variant?.price ?? 4250,
        rating: 0,
        reviewsCount: 0,
        image,
        hoverImage: reelProduct.images?.[1]?.url || image,
        sizes: (reelProduct.variants ?? [])
          .map((candidate) => candidate.size)
          .filter((size): size is string => Boolean(size)),
        description: reelProduct.shortDescription || reelProduct.description || reelProduct.name,
        details: [
          reelProduct.fabric ? `Fabric: ${reelProduct.fabric}` : "",
          reelProduct.craft ? `Craft: ${reelProduct.craft}` : "",
        ].filter((detail): detail is string => Boolean(detail)),
        variants,
      },
      variant?.size || "Free Size",
      1,
      variant?.color,
    );
    setAddedToast(true);
    setTimeout(() => setAddedToast(false), 2500);
  };

  return (
    <>
      {/* ── Top Red Banner Header (As shown above "Shop From The Video" in Screenshot 1) ── */}
      <div className="bg-[#881337] text-white py-3 px-4 sm:px-8 border-b border-[#701a35]">
        <div className="max-w-[1500px] mx-auto flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="font-serif text-sm sm:text-base font-semibold tracking-wide text-white">
              New Collection
            </h3>
            <p className="text-[11px] text-white/80 font-light hidden sm:block">
              Discover the Latest Trends &amp; Handcrafted Styles from Guna Atelier
            </p>
          </div>
          <Link
            href="/products"
            className="rounded-full bg-white/10 hover:bg-white hover:text-[#881337] border border-white/30 px-5 py-1.5 text-[11px] font-bold uppercase tracking-widest text-white transition-all duration-300"
          >
            Shop Collection
          </Link>
        </div>
      </div>

      {/* ── Main Section: Shop From The Video ── */}
      <section className="py-12 sm:py-16 bg-[#faf7f2] border-b border-[#e8dfd5] relative overflow-hidden">
        <div className="max-w-[1500px] mx-auto px-4 sm:px-8 lg:px-12">
          {/* Section Header */}
          <div className="flex items-center justify-between mb-8 sm:mb-10">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-[0.35em] text-[#881337] block mb-1">
                Artisanal Video Looks
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-normal text-stone-900 tracking-tight">
                Shop From The Video
              </h2>
            </div>


            {/* Header Controls: Buttons & Hint */}
            <div className="flex items-center gap-2.5">

              <button
                type="button"
                onClick={() => scroll("left")}
                aria-label="Scroll left"
                className="w-9 h-9 rounded-full bg-white border border-stone-300 hover:border-[#881337] hover:bg-[#881337] hover:text-white text-stone-700 flex items-center justify-center transition shadow-xs cursor-pointer"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => scroll("right")}
                aria-label="Scroll right"
                className="w-9 h-9 rounded-full bg-white border border-stone-300 hover:border-[#881337] hover:bg-[#881337] hover:text-white text-stone-700 flex items-center justify-center transition shadow-xs cursor-pointer"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>
          </div>

          {/* Horizontal Track (Supports Mouse Wheel, Click & Drag, Touch Swipe) */}
          <div
            ref={scrollRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUpOrLeave}
            onMouseLeave={handleMouseUpOrLeave}
            style={{
              WebkitOverflowScrolling: "touch",
            }}
            className="flex gap-4 sm:gap-6 overflow-x-auto scrollbar-none py-2 -mx-4 sm:-mx-8 lg:-mx-12 px-4 sm:px-8 lg:px-12 cursor-grab active:cursor-grabbing select-none touch-pan-x"
          >
            {displayReels.map((reel, index) => (
              <VideoCard
                key={reel._id || `reel-${index}`}
                reel={reel}
                hasMovedRef={hasMovedRef}
                onOpen={() => {
                  setActiveReelIndex(index);
                  setIsPaused(false);
                  setIsMuted(true);
                }}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── MODAL: Fullscreen Interactive Shop From The Video (Exact Match of Screenshot 2) ── */}
      {activeReel && activeReelIndex !== null && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex flex-col items-center justify-between p-3 sm:p-5 md:p-6 overflow-hidden animate-fadeIn"
          onClick={() => setActiveReelIndex(null)}
        >
          {/* Top Header Bar */}
          <div
            className="w-full max-w-5xl flex items-center justify-between text-white py-2 px-2 shrink-0 z-30"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top-Left: Counter (e.g. 6 / 9) */}
            <div className="text-xs sm:text-sm font-semibold tracking-widest text-white/90 bg-white/10 px-3 py-1 rounded-full backdrop-blur-sm">
              {activeReelIndex + 1} / {displayReels.length}
            </div>

            {/* Top-Center: Brand Logo */}
            <h3 className="font-serif text-base sm:text-xl font-normal tracking-widest uppercase text-[#dfc28c]">
              VANI COLLECTION
            </h3>

            {/* Top-Right: Close Button (X) */}
            <button
              onClick={() => setActiveReelIndex(null)}
              aria-label="Close video player"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/10 hover:bg-white hover:text-black text-white flex items-center justify-center transition-all duration-200"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="6" />
              </svg>
            </button>
          </div>

          {/* Floating Left Navigation Chevron */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setActiveReelIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : displayReels.length - 1));
            }}
            aria-label="Previous reel"
            className="hidden md:flex absolute left-4 lg:left-8 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/30 text-white items-center justify-center backdrop-blur-md transition-all z-20"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          {/* Floating Right Navigation Chevron */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setActiveReelIndex((prev) => (prev !== null && prev < displayReels.length - 1 ? prev + 1 : 0));
            }}
            aria-label="Next reel"
            className="hidden md:flex absolute right-4 lg:right-8 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/30 text-white items-center justify-center backdrop-blur-md transition-all z-20"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>

          {/* Split Content Modal (Left Video, Right Product Details) */}
          <div
            className="w-full max-w-4xl flex-1 flex flex-col md:flex-row items-center justify-center gap-4 sm:gap-6 bg-transparent z-10 min-h-0 my-auto overflow-y-auto md:overflow-visible"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ── Left Column: Reel Video Player ── */}
            <div className="relative w-full max-w-[300px] sm:max-w-[340px] md:max-w-[360px] h-[480px] sm:h-[540px] md:h-[580px] max-h-[72vh] md:max-h-[78vh] rounded-2xl overflow-hidden bg-black shadow-2xl border border-white/15 shrink-0">
              <video
                ref={modalVideoRef}
                key={activeReel.videoUrl}
                src={activeReel.videoUrl}
                poster={activeReel.thumbnailUrl || activeReel.productId?.images?.[0]?.url}
                autoPlay
                loop
                muted={isMuted}
                playsInline
                className="w-full h-full object-cover"
              />

              {/* Video Bottom Shadow */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none" />

              {/* Order Banner on Video (Screenshot 2 Match) */}
              <div className="absolute bottom-16 inset-x-4 text-center text-white pointer-events-none">
                <p className="text-xs font-bold tracking-[0.25em] uppercase text-[#dfc28c]">
                  ORDER NOW:-
                </p>
                <p className="text-xs font-semibold text-white mt-0.5">
                  +91 98765-43210 | +91 9289369977
                </p>
                <p className="text-xs font-semibold text-white/90">
                  +91 9289369977
                </p>
              </div>

              {/* Floating Bottom Video Controls (Pause / Play & Mute / Unmute) */}
              <div className="absolute bottom-3 right-3 flex items-center gap-2 z-20">
                <button
                  onClick={togglePlayPause}
                  aria-label={isPaused ? "Play video" : "Pause video"}
                  className="w-9 h-9 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center backdrop-blur-md border border-white/20 transition"
                >
                  {isPaused ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <rect x="6" y="4" width="4" height="16" />
                      <rect x="14" y="4" width="4" height="16" />
                    </svg>
                  )}
                </button>
                <button
                  onClick={toggleMute}
                  aria-label={isMuted ? "Unmute audio" : "Mute audio"}
                  className="w-9 h-9 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center backdrop-blur-md border border-white/20 transition"
                >
                  {isMuted ? "🔇" : "🔊"}
                </button>
              </div>
            </div>

            {/* ── Right Column: Product Shop Card (Exact Screenshot 2 Match) ── */}
            <div className="w-full max-w-[380px] bg-white rounded-2xl p-5 sm:p-6 shadow-2xl border border-stone-200 text-stone-900 flex flex-col h-[480px] sm:h-[540px] md:h-[580px] max-h-[72vh] md:max-h-[78vh] overflow-y-auto">
              {/* Product Header Row */}
              <div className="flex items-start gap-3.5 pb-4 border-b border-stone-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={activeReel.productId?.images?.[0]?.url || activeReel.thumbnailUrl || "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400&q=80"}
                  alt={activeReel.productId?.name || "Product"}
                  className="w-16 h-20 rounded-xl object-cover border border-stone-200 shrink-0 bg-stone-50 shadow-xs"
                />
                <div className="min-w-0 flex-1">
                  <h4 className="font-serif text-sm sm:text-base font-bold uppercase leading-snug text-stone-900">
                    {activeReel.productId?.name || activeReel.title}
                  </h4>
                  <p className="text-sm font-semibold text-stone-600 mt-1">
                    {activeReel.productId?.variants?.[0]?.price
                      ? `Rs. ${activeReel.productId.variants[0].price.toLocaleString("en-IN")}.00`
                      : "Rs. 4,850.00"}
                  </p>
                </div>
              </div>

              {/* Action Buttons: Add to Cart / Order & Info */}
              <div className="py-4 space-y-2.5">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleAddToCart}
                    className="flex-1 py-3 px-4 rounded-xl bg-[#615f5d] hover:bg-[#881337] text-white font-semibold text-xs uppercase tracking-wider transition-colors shadow-sm flex items-center justify-center gap-2"
                  >
                    <span>Add to Bag</span>
                  </button>
                  {activeReel.productId?.slug && (
                    <Link
                      href={`/product/${activeReel.productId.slug}`}
                      aria-label="View product page"
                      className="w-11 h-11 rounded-xl border border-stone-300 hover:border-stone-400 flex items-center justify-center text-stone-700 transition"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="16" x2="12" y2="12" />
                        <line x1="12" y1="8" x2="12.01" y2="8" />
                      </svg>
                    </Link>
                  )}
                </div>

                {/* Direct WhatsApp Order Button */}
                <a
                  href={`https://wa.me/919876543210?text=${encodeURIComponent(
                    `Hello Vani Collection, I am interested in ordering "${activeReel.productId?.name || activeReel.title}" which I saw in your video look.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-4 rounded-xl bg-[#25D366] hover:bg-[#1fa752] text-white font-semibold text-xs tracking-wider transition flex items-center justify-center gap-2"
                >
                  <span>💬 Order Directly via WhatsApp</span>
                </a>

                {/* Toast Notification */}
                {addedToast && (
                  <div className="p-2 rounded-lg bg-emerald-50 text-emerald-800 text-xs text-center border border-emerald-200 animate-fadeIn">
                    ✓ Added to your shopping bag!
                  </div>
                )}
              </div>

              {/* Description Accordion (Screenshot 2 Match) */}
              <div className="border-t border-stone-200 pt-3">
                <button
                  onClick={() => setShowDesc(!showDesc)}
                  className="w-full flex items-center justify-between text-left py-1 text-sm font-semibold text-stone-900"
                >
                  <span>Description</span>
                  <span className="text-base font-bold">{showDesc ? "—" : "+"}</span>
                </button>

                {showDesc && (
                  <div className="mt-3 text-xs leading-relaxed text-stone-600 space-y-2 border-t border-stone-100 pt-3">
                    <p className="font-semibold text-stone-800 uppercase text-[11px]">
                      {activeReel.productId?.name || activeReel.title}
                    </p>
                    <p className="whitespace-pre-line">
                      {activeReel.productId?.description ||
                        activeReel.productId?.shortDescription ||
                        "Elevate your ethnic wardrobe with this elegant Suit set, crafted with timeless charm and intricate detailing.\n\n* Fabric: Pure Mul Cotton / Silk\n* Work: Intricate Dori thread and Zari embroidery\n* Delivery: Free Express Shipping across India\n* Returns: 7-day hassle-free exchange"}
                    </p>

                    {activeReel.productId?.slug && (
                      <div className="pt-2">
                        <Link
                          href={`/product/${activeReel.productId.slug}`}
                          className="text-[11px] font-bold text-[#881337] hover:underline"
                        >
                          View Full Product Details &amp; Size Guide →
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
