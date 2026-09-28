"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLenis } from "./SmoothScroll";
import { useCart } from "../context/CartContext";

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
            {/* Left: Mobile Drawer Trigger */}
            <div className="flex items-center gap-2 lg:hidden">
              <button
                onClick={() => setMobileDrawerOpen(true)}
                className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center text-stone-800 hover:text-[#881337] transition"
                aria-label="Open mobile menu"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M4 6h16M4 12h16M4 18h16" />
                </svg>
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

            {/* Desktop Navigation: Links to Newly Built Features */}
            <nav className="hidden lg:flex items-center gap-7 xl:gap-9 mx-auto">
              <Link
                href="/#stories"
                className="group text-[12px] font-semibold uppercase tracking-[0.2em] text-stone-800 hover:text-[#881337] transition-colors py-2 flex items-center gap-1.5"
              >
                <span>Stories</span>
                <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-tr from-[#dfc28c] to-[#881337]" />
              </Link>

              <Link
                href="/reels"
                className="group text-[12px] font-bold uppercase tracking-[0.2em] text-[#881337] transition-colors py-1.5 px-3 rounded-full bg-[#881337]/5 hover:bg-[#881337]/10 flex items-center gap-2 border border-[#881337]/20"
              >
                <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
                <span>Reels</span>
                <span className="text-[8px] bg-[#881337] text-white px-1.5 py-0.5 rounded font-bold tracking-widest">
                  NEW
                </span>
              </Link>

              <Link
                href="/#products"
                className="group text-[12px] font-semibold uppercase tracking-[0.2em] text-stone-800 hover:text-[#881337] transition-colors py-2 flex items-center gap-1.5"
              >
                <span>Living Looks</span>
              </Link>

              <Link
                href="/#lookbook"
                className="group text-[12px] font-semibold uppercase tracking-[0.2em] text-stone-800 hover:text-[#881337] transition-colors py-2"
              >
                <span>Lookbook</span>
              </Link>
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

              {/* Wishlist Icon */}
              <IconBtn
                label="Wishlist"
                onClick={() => {
                  const target = document.getElementById("products");
                  target?.scrollIntoView({ behavior: "smooth" });
                }}
              >
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
              className="fixed top-0 left-0 bottom-0 w-[84vw] max-w-[340px] bg-[#faf7f2] z-[96] shadow-2xl flex flex-col border-r border-[#e8dfd5] lg:hidden"
            >
              {/* Drawer Top Header */}
              <div className="p-5 border-b border-stone-200 flex items-center justify-between bg-white">
                <div>
                  <h3 className="font-serif text-lg font-medium text-stone-900 leading-none">
                    Vani Collection
                  </h3>
                  <span className="text-[8px] uppercase tracking-[0.3em] text-[#b8935a] font-semibold">
                    Jaipur Atelier
                  </span>
                </div>
                <button
                  onClick={() => setMobileDrawerOpen(false)}
                  className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-600 hover:bg-stone-200 text-xs"
                >
                  ✕
                </button>
              </div>

              {/* Quick Search inside Drawer */}
              <div className="p-4 border-b border-stone-200 bg-stone-50">
                <div
                  onClick={() => {
                    setMobileDrawerOpen(false);
                    setSearchOpen(true);
                  }}
                  className="flex items-center gap-2 bg-white border border-stone-300 rounded-full px-3.5 py-2 text-xs text-stone-400 cursor-pointer"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="7" />
                    <path d="M21 21l-4.35-4.35" />
                  </svg>
                  <span>Search Mul, Suits, Co-ords...</span>
                </div>
              </div>

              {/* Quick Links for New Features */}
              <div className="grid grid-cols-2 gap-2 p-4 pb-2 border-b border-stone-200">
                <Link
                  href="/reels"
                  onClick={() => setMobileDrawerOpen(false)}
                  className="flex items-center gap-2 p-2.5 rounded-xl bg-gradient-to-br from-[#881337]/10 to-[#881337]/5 border border-[#881337]/20 text-[#881337] font-semibold text-xs"
                >
                  <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
                  <span>Reels Feed</span>
                  <span className="text-[8px] bg-[#881337] text-white px-1 rounded font-bold ml-auto">HOT</span>
                </Link>
                <Link
                  href="/#stories"
                  onClick={() => setMobileDrawerOpen(false)}
                  className="flex items-center gap-2 p-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 border border-stone-200 text-stone-800 font-semibold text-xs"
                >
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>Stories</span>
                </Link>
              </div>

              {/* Navigation Categories Accordion */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                <span className="text-[9px] uppercase tracking-[0.3em] font-bold text-stone-400 px-2 block mb-2">
                  Collections
                </span>
                {NAV_ITEMS.map((item) => {
                  const isExpanded = expandedMobileCategory === item.label;
                  return (
                    <div
                      key={item.label}
                      className="border border-stone-200/80 rounded-xl overflow-hidden bg-white shadow-xs"
                    >
                      <button
                        onClick={() =>
                          setExpandedMobileCategory(isExpanded ? null : item.label)
                        }
                        className="w-full flex items-center justify-between p-3.5 text-left text-xs font-semibold text-stone-800"
                      >
                        <span className="flex items-center gap-2">
                          <span className="font-serif text-sm">{item.label}</span>
                          {item.isNew && (
                            <span className="text-[8px] bg-[#881337] text-white px-1.5 py-0.5 rounded font-bold">
                              HOT
                            </span>
                          )}
                        </span>
                        <span className="text-stone-400 text-xs transition-transform duration-200">
                          {isExpanded ? "−" : "+"}
                        </span>
                      </button>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="bg-[#faf7f2] border-t border-stone-200 p-3.5 space-y-3"
                          >
                            {item.columns.map((col) => (
                              <div key={col.title}>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-[#881337] block mb-1.5">
                                  {col.title}
                                </span>
                                <div className="grid grid-cols-1 gap-1.5 pl-2">
                                  {col.links.slice(0, 4).map((link) => (
                                    <Link
                                      key={link}
                                      href="#products"
                                      onClick={() => setMobileDrawerOpen(false)}
                                      className="text-xs text-stone-600 hover:text-[#881337] py-0.5"
                                    >
                                      • {link}
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
                    href="#lookbook"
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
      <AnimatePresence>
        {searchOpen && (
          <div className="fixed inset-0 z-[115] flex items-start justify-center pt-20 sm:pt-24 px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSearchOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl p-5 sm:p-6 border border-stone-200 z-[116]"
            >
              <div className="flex items-center gap-3 border-b border-stone-200 pb-3">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-stone-400">
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
                <input
                  type="text"
                  placeholder="Search Mul Cotton, Anarkalis, Sharara sets..."
                  autoFocus
                  className="w-full text-xs sm:text-sm text-stone-900 focus:outline-none"
                />
                <button
                  onClick={() => setSearchOpen(false)}
                  className="text-xs text-stone-400 hover:text-stone-700 px-2 py-1 bg-stone-100 rounded"
                >
                  ESC
                </button>
              </div>

              <div className="mt-4">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-stone-400 block mb-2">
                  Popular Searches
                </span>
                <div className="flex flex-wrap gap-2">
                  {["Pure Mul Cotton", "Bagru Print Kurta", "Anarkali Set", "Haldi Yellow Suit", "Co-ord Set", "Under ₹1999"].map((tag) => (
                    <button
                      key={tag}
                      onClick={() => setSearchOpen(false)}
                      className="px-3 py-1.5 bg-stone-100 hover:bg-[#881337] hover:text-white rounded-full text-xs text-stone-700 transition"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
          <button
            onClick={() => setMobileDrawerOpen(true)}
            className="flex flex-col items-center text-stone-800 hover:text-[#881337] py-1 px-3 rounded-xl transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
            </svg>
            <span className="text-[9px] font-medium mt-0.5">Shop</span>
          </button>

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

          {/* Wishlist */}
          <button
            onClick={() => {
              const target = document.getElementById("products");
              target?.scrollIntoView({ behavior: "smooth" });
            }}
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
          </button>

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