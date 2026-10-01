"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLenis } from "./SmoothScroll";
import { useCart } from "../context/CartContext";
import SearchOverlay from "./SearchOverlay";

// Utility function to convert display names to URL category parameters
const getCategoryParam = (displayName: string): string => {
  const categoryMap: Record<string, string> = {
    "Mul Cotton": "mul-cotton",
    "Festive Edit": "festive", 
    "Festive Wear": "festive",
    "Festive Luxe": "festive",
    "Co-ord Sets": "coord-sets",
    "Anarkalis": "anarkalis",
    "Daily Wear": "all",
    "Wedding Guest": "festive",
    "Casual Comfort": "all",
    "Spring Collection": "all",
    "Summer Breeze": "all",
    "Wedding Season": "festive",
    "Chanderi Silk": "all",
    "Linen Blends": "all",
    "Organza": "all",
    "Banarasi": "all",
  };
  return categoryMap[displayName] || "all";
};

/* =========================================================
   NAV DATA (Curated for Vani Collection Boutique)
   ========================================================= */
const NAV_ITEMS = [
  {
    label: "Mul Cotton",
    featured: {
      tag: "100-Count Handloom",
      title: "The Bagru Heritage",
      cta: "Explore Mul Edit",
      gradient: "from-[#4a1525] via-[#2d0c16] to-[#701a35]",
    },
    columns: [
      { title: "Pure Mul Suits", links: ["Anarkali Sets", "Straight Kurta Pants", "Angrakha Suits", "Flared Kalidaars", "Short Kurtis"] },
      { title: "Prints & Craft", links: ["Bagru Handblock", "Dabu Mud Resist", "Kalamkari Floral", "Indigo Natural Dyes", "Ajrakh Weaves"] },
      { title: "Bottoms & Dupattas", links: ["Mul Straight Pants", "Flared Palazzos", "Kota Doria Dupattas", "Chanderi Dupattas"] },
      { title: "Occasions", links: ["Daily Workwear", "Summer Breezy", "Festive Minimal", "Travel Comfort"] },
    ],
  },
  {
    label: "Festive Edit",
    featured: {
      tag: "Wedding & Celebrations",
      title: "Gulmohar Heirlooms",
      cta: "Shop Royal Edit",
      gradient: "from-[#881337] via-[#4c0519] to-[#b8935a]",
    },
    columns: [
      { title: "Festive Ensembles", links: ["Silk Chanderi Sets", "Gota Patti Suits", "Sharara Sets", "Gharara & Peplums", "Zari Embroidered"] },
      { title: "Ceremony Specials", links: ["Haldi & Mehendi", "Sangeet Glam", "Intimate Weddings", "Puja & Rituals"] },
      { title: "Luxe Fabrics", links: ["Pure Chanderi Silk", "Tissue Organza", "Banarasi Brocade", "Raw Silk Blends"] },
      { title: "Embellishments", links: ["Marodi Work", "Pita Zari", "Hand Mirror Work", "Scalloped Laces"] },
    ],
  },
  {
    label: "Co-ord Sets",
    featured: {
      tag: "Urban Elegance",
      title: "Effortless Modern",
      cta: "Discover Co-ords",
      gradient: "from-[#1c1917] via-[#292524] to-[#44403c]",
    },
    columns: [
      { title: "Modern Fits", links: ["High-Low Tunics", "Notch Collar Sets", "Floral Shirt Pants", "Cape & Trousers", "Short Kurti Sets"] },
      { title: "Everyday Comfort", links: ["Airport Chic", "Brunch Outfits", "Work From Anywhere", "Resort Loungewear"] },
      { title: "Fabrics", links: ["Breathable Cotton", "Slub Rayon", "Linen Blends", "Textured Voile"] },
    ],
  },
  {
    label: "Anarkalis",
    featured: {
      tag: "Regal Flair",
      title: "Mughal Grandeur",
      cta: "View Anarkalis",
      gradient: "from-[#5a4a3a] via-[#3d3229] to-[#8b7355]",
    },
    columns: [
      { title: "Silhouette Drama", links: ["Floor Length Anarkalis", "Tiered Kalidaar", "Angrakha Flared", "Asymmetric Flair"] },
      { title: "Occasion Sets", links: ["Bridal Guest", "Festive Soiree", "Daytime Elegance", "Classic Red & White"] },
      { title: "Details", links: ["Deep Back with Latkans", "Churidar Pants", "Heavy Border Dupattas"] },
    ],
  },
  {
    label: "Under ₹1,999",
    isNew: true,
    featured: {
      tag: "Pocket Luxe",
      title: "Pure Cotton Budget",
      cta: "Shop Under 1999",
      gradient: "from-[#064e3b] via-[#022c22] to-[#047857]",
    },
    columns: [
      { title: "Bestseller Kurtis", links: ["Daily Cotton Kurtis", "Short Tunic Tops", "Printed Kurtas"] },
      { title: "Value Sets", links: ["Kurta Pant Combos", "Everyday Mul Sets", "Summer Essentials"] },
      { title: "Mix & Match", links: ["Cotton Pants", "Kota Dupattas", "Palazzos"] },
    ],
  },
];

const ANNOUNCEMENTS = [
  "✦ Free Express Shipping Above ₹1,999",
  "✦ 100% Certified Pure Mul Cotton Handcrafted in Jaipur",
  "✦ Extra 10% Off First Order: Code FIRST10",
  "✦ Cash On Delivery & 7-Day Free Exchanges",
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [expandedMobileCategory, setExpandedMobileCategory] = useState<string | null>("Mul Cotton");

  const { cartCount, setIsCartOpen, wishlist } = useCart();
  const lenis = useLenis();

  /* ---------- Scroll shadow ---------- */
  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 15);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* ---------- Freeze Lenis when overlay/menu opens ---------- */
  useEffect(() => {
    if (!lenis) return;
    if (searchOpen || mobileDrawerOpen) lenis.stop();
    else lenis.start();
  }, [searchOpen, mobileDrawerOpen, lenis]);

  return (
    <>
      {/* ================= SLIDING ANNOUNCEMENT BAR ================= */}
      <motion.div
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative overflow-hidden bg-[#1c1917] text-[#dfc28c] py-2 select-none border-b border-[#2d2520] text-[10px] sm:text-[11px]"
      >
        <div className="absolute left-0 top-0 bottom-0 w-8 sm:w-16 bg-gradient-to-r from-[#1c1917] to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-8 sm:w-16 bg-gradient-to-l from-[#1c1917] to-transparent z-10 pointer-events-none" />
        <motion.div
          className="flex whitespace-nowrap"
          animate={{ x: ["0%", "-50%"] }}
          transition={{ duration: 28, ease: "linear", repeat: Infinity }}
        >
          {[0, 1].map((half) => (
            <div key={half} className="flex shrink-0">
              {ANNOUNCEMENTS.map((msg, i) => (
                <span
                  key={`${half}-${i}`}
                  className="mx-6 sm:mx-10 font-medium tracking-[0.22em] uppercase"
                >
                  {msg}
                </span>
              ))}
            </div>
          ))}
        </motion.div>
      </motion.div>

      {/* ================= MAIN HEADER ================= */}
      <header className="sticky top-0 z-50 transition-shadow duration-300">
        <motion.div
          initial={false}
          animate={{
            backgroundColor: scrolled
              ? "rgba(250,247,242,0.96)"
              : "rgba(250,247,242,1)",
          }}
          transition={{ duration: 0.2 }}
          style={{
            backdropFilter: scrolled ? "blur(16px)" : "blur(0px)",
            WebkitBackdropFilter: scrolled ? "blur(16px)" : "blur(0px)",
          }}
          className={`border-b transition-[border-color] duration-300 ${
            scrolled ? "border-[#e8dfd5] shadow-sm" : "border-[#f0e8dc]"
          }`}
        >
          <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-12 h-[66px] sm:h-[74px] flex items-center justify-between gap-4">
            {/* ============ Left: Mobile Drawer Trigger (UNIQUE) ============ */}
            <div className="flex items-center gap-2 lg:hidden">
              <button
                onClick={() => setMobileDrawerOpen(true)}
                aria-label="Open mobile menu"
                className="group relative w-11 h-11 -ml-1 rounded-full flex items-center justify-center transition-all duration-300 active:scale-95"
              >
                {/* Rotating conic accent ring (brand gradient) */}
                <span
                  className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity duration-300"
                  style={{
                    background:
                      "conic-gradient(from 0deg, #dfc28c, #881337, #dfc28c)",
                    padding: "1.5px",
                    WebkitMask:
                      "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                    WebkitMaskComposite: "xor",
                    maskComposite: "exclude",
                  }}
                />
                {/* Soft brand glow on tap */}
                <span className="absolute inset-0 rounded-full bg-[#881337]/0 group-active:bg-[#881337]/10 transition-colors duration-200" />

                {/* Animated 3-line icon */}
                <span className="relative flex flex-col items-center justify-center w-[22px] h-[16px]">
                  {/* Top line */}
                  <span className="absolute top-0 left-0 h-[2px] w-[18px] rounded-full bg-gradient-to-r from-[#1c1917] to-[#881337] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:w-[22px] group-hover:from-[#881337] group-hover:to-[#dfc28c]" />
                  {/* Middle line (shorter, gold) */}
                  <span className="absolute top-[7px] left-0 h-[2px] w-[12px] rounded-full bg-[#b8935a] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:w-[22px] group-hover:bg-[#881337]" />
                  {/* Bottom line */}
                  <span className="absolute bottom-0 left-0 h-[2px] w-[22px] rounded-full bg-gradient-to-r from-[#1c1917] to-[#881337] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:w-[14px] group-hover:from-[#881337] group-hover:to-[#dfc28c]" />

                  {/* Tiny gold sparkle dot */}
                  <span className="absolute -top-[3px] -right-[5px] w-[3px] h-[3px] rounded-full bg-[#b8935a] opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100" />
                </span>
              </button>

              <button
                onClick={() => setSearchOpen(true)}
                className="w-9 h-9 rounded-full flex items-center justify-center text-stone-700 hover:text-[#881337] transition"
                aria-label="Search"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <circle cx="11" cy="11" r="7" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
              </button>
            </div>

            {/* Center / Brand Logo */}
            <Link
              href="/"
              className="flex flex-col leading-none group text-center lg:text-left mx-auto lg:mx-0"
            >
              <span className="font-serif text-[22px] sm:text-[26px] tracking-[0.06em] text-[#1c1917] transition-colors group-hover:text-[#881337] font-normal whitespace-nowrap">
                Vani Collection
              </span>
              <span className="text-[7.5px] sm:text-[8.5px] tracking-[0.45em] uppercase text-[#b8935a] mt-0.5 sm:mt-1 pl-[1px] font-semibold">
                Atelier · Jaipur
              </span>
            </Link>

            {/* Desktop Navigation: Mega Menu Dropdowns */}
            <nav className="hidden lg:flex items-center gap-1 mx-auto">
              {/* Collections Mega Menu */}
              <MegaMenuItem
                label="Collections"
                categories={[
                  {
                    title: "By Fabric",
                    items: ["Mul Cotton", "Chanderi Silk", "Linen Blends", "Organza", "Banarasi"]
                  },
                  {
                    title: "By Occasion",
                    items: ["Festive Wear", "Daily Wear", "Wedding Guest", "Casual Comfort"]
                  },
                  {
                    title: "By Style",
                    items: ["Anarkali Sets", "Straight Suits", "Co-ord Sets", "Sharara Sets"]
                  }
                ]}
              />

              {/* Stories Link */}
              <Link
                href="/#stories"
                className="group relative text-[13px] font-semibold uppercase tracking-[0.15em] text-stone-700 hover:text-[#881337] transition-colors px-4 py-2 flex items-center gap-2"
              >
                <span>Stories</span>
                <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-tr from-[#dfc28c] to-[#881337]" />
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#881337] scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
              </Link>

              {/* Reels Link */}
              <Link
                href="/reels"
                className="group relative text-[13px] font-semibold uppercase tracking-[0.15em] text-stone-700 hover:text-[#881337] transition-colors px-4 py-2"
              >
                <span>Reels</span>
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#881337] scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
              </Link>

              {/* Living Looks Link */}
              <Link
                href="/#products"
                className="group relative text-[13px] font-semibold uppercase tracking-[0.15em] text-stone-700 hover:text-[#881337] transition-colors px-4 py-2"
              >
                <span>Living Looks</span>
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#881337] scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
              </Link>

              {/* Lookbook Mega Menu */}
              <MegaMenuItem
                label="Lookbook"
                categories={[
                  {
                    title: "Latest Edits",
                    items: ["Spring Collection", "Summer Breeze", "Festive Luxe", "Wedding Season"]
                  },
                  {
                    title: "Inspiration",
                    items: ["Celebrity Picks", "Stylist Favorites", "Best Sellers", "New Arrivals"]
                  }
                ]}
              />

              {/* Shop By Price */}
              <MegaMenuItem
                label="Shop by Price"
                categories={[
                  {
                    title: "Budget Friendly",
                    items: ["Under ₹1,499", "Under ₹1,999", "Under ₹2,999"]
                  },
                  {
                    title: "Premium Range",
                    items: ["₹3,000 - ₹5,000", "₹5,000 - ₹10,000", "Luxury Collection"]
                  }
                ]}
              />
            </nav>

            {/* Right Action Icons */}
            <div className="flex items-center gap-1 sm:gap-2">
              <div className="hidden lg:block">
                <IconBtn label="Search" onClick={() => setSearchOpen(true)}>
                  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <circle cx="11" cy="11" r="7" />
                    <path d="M21 21l-4.35-4.35" />
                  </svg>
                </IconBtn>
              </div>

              {/* Wishlist Icon → /account wishlist tab */}
              <Link href="/account" aria-label="Wishlist">
                <IconBtn label="Wishlist">
                  <div className="relative">
                    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
                    </svg>
                    {wishlist.length > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-rose-600 text-white text-[8px] flex items-center justify-center font-bold">
                        {wishlist.length}
                      </span>
                    )}
                  </div>
                </IconBtn>
              </Link>

              {/* Account icon */}
              <div className="hidden lg:block">
                <Link href="/account" aria-label="My Account">
                  <IconBtn label="Account">
                    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                      <circle cx="12" cy="8" r="4" />
                      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                    </svg>
                  </IconBtn>
                </Link>
              </div>

              {/* Shopping Bag Trigger */}
              <button
                onClick={() => setIsCartOpen(true)}
                aria-label="Bag"
                className="relative flex items-center justify-center w-10 h-10 text-stone-900 hover:text-[#881337] transition-colors"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
                  <path d="M3 6h18" />
                  <path d="M16 10a4 4 0 01-8 0" />
                </svg>
                <AnimatePresence>
                  {cartCount > 0 && (
                    <motion.span
                      key={cartCount}
                      initial={{ scale: 0 }}
                      animate={{ scale: [1.3, 1] }}
                      exit={{ scale: 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 18 }}
                      className="absolute top-1.5 right-0.5 min-w-[16px] h-[16px] px-1 rounded-full bg-[#881337] text-white text-[9px] font-bold flex items-center justify-center shadow"
                    >
                      {cartCount}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            </div>
          </div>
        </motion.div>

      </header>

      {/* ================= FULL MOBILE & TABLET SLIDE-OVER DRAWER ================= */}
      <AnimatePresence>
        {mobileDrawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileDrawerOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[95] lg:hidden"
            />

            {/* Left Drawer */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="fixed top-0 left-0 bottom-0 w-[88vw] max-w-[360px] z-[96] shadow-2xl flex flex-col lg:hidden"
              style={{ background: "#faf7f2", height: "100vh" }}
            >
              {/* ── Luxury Branded Header ── */}
              <div
                className="relative px-5 pt-6 pb-5 flex items-end justify-between shrink-0"
                style={{ background: "linear-gradient(135deg, #1c1917 0%, #3d2012 55%, #881337 100%)" }}
              >
                <div
                  className="absolute inset-0 opacity-[0.05] pointer-events-none"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
                    backgroundSize: "150px 150px",
                  }}
                />
                <div className="relative z-10">
                  <span className="text-[8px] font-bold uppercase tracking-[0.4em] text-[#dfc28c] block mb-1">Jaipur Atelier</span>
                  <h2 className="font-serif text-2xl text-white font-light leading-none">Vani Collection</h2>
                  <p className="text-[10px] text-white/50 mt-1.5 tracking-wider">Handcrafted Luxury Since 2018</p>
                </div>
                <button
                  onClick={() => setMobileDrawerOpen(false)}
                  className="relative z-10 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 border border-white/30 flex items-center justify-center text-white transition"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Quick Search inside Drawer */}
              <div className="px-4 pt-4 pb-3 border-b border-stone-200/80 bg-white/50 shrink-0">
                <div
                  onClick={() => {
                    setMobileDrawerOpen(false);
                    setSearchOpen(true);
                  }}
                  className="flex items-center gap-3 bg-white border border-stone-300 rounded-xl px-4 py-2.5 text-sm text-stone-400 cursor-pointer hover:border-stone-400 transition"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="7" />
                    <path d="M21 21l-4.35-4.35" />
                  </svg>
                  <span>Search products...</span>
                </div>
              </div>

              {/* Quick Links for New Features */}
              <div className="grid grid-cols-2 gap-2.5 px-4 py-3 border-b border-stone-200/80 bg-white/30 shrink-0">
                <Link
                  href="/reels"
                  onClick={() => setMobileDrawerOpen(false)}
                  className="flex items-center justify-center gap-2 p-3 rounded-xl bg-gradient-to-br from-[#881337] to-[#701a35] text-white font-semibold text-xs shadow-lg"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="white" stroke="none">
                    <rect x="2" y="2" width="20" height="20" rx="4" />
                    <path d="M10 8l6 4-6 4V8z" fill="#881337" />
                  </svg>
                  <span>Reels</span>
                </Link>
                <Link
                  href="/#stories"
                  onClick={() => setMobileDrawerOpen(false)}
                  className="flex items-center justify-center gap-2 p-3 rounded-xl bg-white border border-stone-200 text-stone-800 font-semibold text-xs hover:bg-stone-50 transition"
                >
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>Stories</span>
                </Link>
              </div>

              {/* Navigation Categories Accordion - SCROLLABLE */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2.5" style={{ overscrollBehavior: "contain" }}>
                <span className="text-[9px] uppercase tracking-[0.3em] font-bold text-stone-400 block mb-3">
                  Collections
                </span>
                {NAV_ITEMS.map((item) => {
                  const isExpanded = expandedMobileCategory === item.label;
                  return (
                    <div
                      key={item.label}
                      className="border border-stone-200 rounded-xl overflow-hidden bg-white shadow-sm"
                    >
                      <button
                        onClick={() =>
                          setExpandedMobileCategory(isExpanded ? null : item.label)
                        }
                        className="w-full flex items-center justify-between px-4 py-3.5 text-left"
                      >
                        <span className="flex items-center gap-2.5">
                          <span className="font-serif text-base font-semibold text-gray-900">{item.label}</span>
                          {item.isNew && (
                            <span className="text-[8px] bg-emerald-600 text-white px-1.5 py-0.5 rounded-full font-bold">
                              NEW
                            </span>
                          )}
                        </span>
                        <svg 
                          width="16" 
                          height="16" 
                          viewBox="0 0 24 24" 
                          fill="none" 
                          stroke="currentColor" 
                          strokeWidth="2.5"
                          className={`text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                        >
                          <path d="M6 9l6 6 6-6" />
                        </svg>
                      </button>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="bg-stone-50 border-t border-stone-200 px-4 py-4 space-y-4"
                          >
                            {item.columns.map((col) => (
                              <div key={col.title}>
                                <span className="text-[11px] font-bold uppercase tracking-wider text-[#881337] block mb-2">
                                  {col.title}
                                </span>
                                <div className="grid grid-cols-1 gap-2 pl-1">
                                  {col.links.slice(0, 5).map((link) => (
                                    <Link
                                      key={link}
                                      href={`/products?category=${getCategoryParam(link)}`}
                                      onClick={() => setMobileDrawerOpen(false)}
                                      className="flex items-center gap-2 text-sm text-stone-600 hover:text-[#881337] py-1 transition group"
                                    >
                                      <span className="w-1 h-1 rounded-full bg-stone-300 group-hover:bg-[#881337] transition" />
                                      <span>{link}</span>
                                    </Link>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}

                {/* Additional Quick Links */}
                <div className="pt-4 border-t border-stone-200 space-y-2 text-xs text-stone-700">
                  <Link
                    href="/products"
                    onClick={() => setMobileDrawerOpen(false)}
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-stone-100"
                  >
                    <span>✦ Shop The Lookbook</span>
                    <span>→</span>
                  </Link>
                  <a
                    href="https://wa.me/?text=Hello%20Vani%20Collection%20Atelier!"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-50 text-emerald-800 font-medium border border-emerald-200"
                  >
                    <span>💬 WhatsApp Styling Help</span>
                  </a>
                </div>
              </div>

              {/* Bottom Drawer Info */}
              <div className="p-4 bg-stone-100 border-t border-stone-200 text-[11px] text-stone-500 text-center">
                <span>Free Express Shipping Across India · COD Available</span>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ================= SEARCH OVERLAY ================= */}
      <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* ================= MOBILE BOTTOM STICKY BAR (Native App feel) ================= */}
      <div
        className="lg:hidden fixed bottom-0 inset-x-0 bg-[#faf7f2]/98 backdrop-blur-md border-t border-[#e8dfd5] z-40 shadow-lg"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="flex items-center justify-around px-2 py-1.5">
          {/* Home */}
          <Link
            href="/"
            className="flex flex-col items-center text-stone-800 hover:text-[#881337] py-1 px-3 rounded-xl transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              <path d="M9 22V12h6v10" />
            </svg>
            <span className="text-[9px] font-medium mt-0.5">Home</span>
          </Link>

          {/* Shop */}
          <Link
            href="/products"
            className="flex flex-col items-center text-stone-800 hover:text-[#881337] py-1 px-3 rounded-xl transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
            </svg>
            <span className="text-[9px] font-medium mt-0.5">Shop</span>
          </Link>

          {/* Reels — PROMINENT CENTER BUTTON */}
          <Link
            href="/reels"
            className="flex flex-col items-center -mt-5"
          >
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#b91c1c] via-[#881337] to-[#701a35] flex items-center justify-center shadow-[0_4px_18px_rgba(185,28,28,0.55)] border-2 border-[#dfc28c]/60">
              {/* Play / Reels icon */}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <rect x="2" y="2" width="20" height="20" rx="5" />
                <path d="M8 9.5l8 4.5-8 4.5V9.5z" fill="white" stroke="none" />
              </svg>
            </div>
            <span className="text-[9px] font-bold mt-1 text-[#881337] tracking-wide">Reels</span>
          </Link>

          {/* Wishlist → Account */}
          <Link
            href="/account"
            className="flex flex-col items-center text-stone-800 hover:text-[#881337] py-1 px-3 rounded-xl transition-colors relative"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
            </svg>
            {wishlist.length > 0 && (
              <span className="absolute top-0.5 right-1.5 w-3.5 h-3.5 rounded-full bg-rose-600 text-white text-[8px] flex items-center justify-center font-bold">
                {wishlist.length}
              </span>
            )}
            <span className="text-[9px] font-medium mt-0.5">Wishlist</span>
          </Link>

          {/* Bag */}
          <button
            onClick={() => setIsCartOpen(true)}
            className="flex flex-col items-center py-1 px-3 rounded-xl transition-colors relative"
          >
            <div className={`relative ${cartCount > 0 ? "text-[#881337]" : "text-stone-800"}`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
                <path d="M3 6h18" />
                <path d="M16 10a4 4 0 01-8 0" />
              </svg>
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 min-w-[16px] h-[16px] px-0.5 rounded-full bg-[#881337] text-white text-[8px] flex items-center justify-center font-bold shadow">
                  {cartCount}
                </span>
              )}
            </div>
            <span className={`text-[9px] font-medium mt-0.5 ${cartCount > 0 ? "text-[#881337]" : "text-stone-800"}`}>Bag</span>
          </button>
        </div>
      </div>
    </>
  );
}

function IconBtn({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 text-stone-800 hover:text-[#881337] transition-colors rounded-full hover:bg-stone-200/50"
    >
      {children}
    </button>
  );
}


/* ========================================
   MEGA MENU ITEM COMPONENT
   ======================================== */
function MegaMenuItem({ 
  label, 
  categories 
}: { 
  label: string;
  categories: Array<{ title: string; items: string[] }>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setIsOpen(false), 150);
  };

  return (
    <div 
      className="relative" 
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Trigger Button */}
      <button className="group relative text-[13px] font-semibold uppercase tracking-[0.15em] text-stone-700 hover:text-[#881337] transition-colors px-4 py-2 flex items-center gap-1.5">
        <span>{label}</span>
        <svg 
          width="12" 
          height="12" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2.5"
          className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
        <span className={`absolute bottom-0 left-0 right-0 h-0.5 bg-[#881337] transition-transform origin-left ${isOpen ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'}`} />
      </button>

      {/* Mega Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="absolute top-full left-1/2 -translate-x-1/2 pt-2 z-50"
          >
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden min-w-[600px]">
              {/* Header */}
              <div className="bg-gradient-to-r from-stone-50 to-white px-6 py-4 border-b border-gray-100">
                <h3 className="text-lg font-bold text-gray-900">{label}</h3>
                <p className="text-xs text-gray-500 mt-0.5">Explore our curated collection</p>
              </div>

              {/* Categories Grid */}
              <div className="grid grid-cols-2 gap-8 p-6">
                {categories.map((category, idx) => (
                  <div key={idx} className="space-y-3">
                    <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-gray-200 pb-2">
                      {category.title}
                    </h4>
                    <ul className="space-y-2">
                      {category.items.map((item, itemIdx) => (
                        <li key={itemIdx}>
                          <Link
                            href={`/products?category=${getCategoryParam(item)}`}
                            className="group flex items-center gap-2 text-sm text-gray-600 hover:text-[#881337] transition-colors py-1"
                          >
                            <span className="w-1 h-1 rounded-full bg-gray-300 group-hover:bg-[#881337] transition-colors" />
                            <span>{item}</span>
                            <svg 
                              width="14" 
                              height="14" 
                              viewBox="0 0 24 24" 
                              fill="none" 
                              stroke="currentColor" 
                              strokeWidth="2"
                              className="opacity-0 group-hover:opacity-100 transition-opacity -translate-x-1 group-hover:translate-x-0"
                            >
                              <path d="M5 12h14M12 5l7 7-7 7" />
                            </svg>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              {/* Footer CTA */}
              <div className="bg-gradient-to-r from-[#881337]/5 to-[#881337]/10 px-6 py-4 border-t border-gray-100">
                <Link 
                  href={`/products?category=${getCategoryParam(label)}`}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-[#881337] hover:text-[#701a35] transition-colors"
                >
                  <span>View All in {label}</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
