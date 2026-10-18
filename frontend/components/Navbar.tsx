"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLenis } from "./SmoothScroll";
import { useCart } from "../context/CartContext";
import SearchOverlay from "./SearchOverlay";
import { api, isApiConfigured, type NavigationMenu, type NavigationSettings, type StoreCategory } from "../lib/api-client";

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

const FALLBACK_DROPDOWN_MENUS: NavigationMenu[] = [
  {
    key: "lookbook",
    label: "Lookbook",
    position: 1,
    isActive: true,
    columns: [
      { title: "Latest Edits", items: [
        { label: "Spring Collection", href: "/products?sort=new" },
        { label: "Summer Breeze", href: "/products" },
        { label: "Festive Luxe", categorySlug: "festive" },
        { label: "Wedding Season", categorySlug: "festive" },
      ] },
      { title: "Inspiration", items: [
        { label: "Celebrity Picks", href: "/products?sort=featured" },
        { label: "Stylist Favorites", href: "/products?sort=featured" },
        { label: "Best Sellers", href: "/products?sort=featured" },
        { label: "New Arrivals", href: "/products?sort=new" },
      ] },
    ],
  },
  {
    key: "shop-by-price",
    label: "Shop by Price",
    position: 2,
    isActive: true,
    columns: [
      { title: "Budget Friendly", items: [
        { label: "Under ₹1,499", href: "/products?price=Under+%E2%82%B91%2C499" },
        { label: "₹1,500 – ₹1,999", href: "/products?price=%E2%82%B91%2C500+%E2%80%93+%E2%82%B91%2C999" },
        { label: "₹2,000 – ₹2,999", href: "/products?price=%E2%82%B92%2C000+%E2%80%93+%E2%82%B92%2C999" },
      ] },
      { title: "Premium Range", items: [
        { label: "₹3,000 - ₹5,000", href: "/products?price=%E2%82%B93%2C000+%26+Above" },
        { label: "Premium Collection", href: "/products?price=%E2%82%B93%2C000+%26+Above" },
        { label: "Luxury Collection", href: "/products?sort=price-high" },
      ] },
    ],
  },
];

const FALLBACK_NAV_SETTINGS: NavigationSettings = {
  theme: "atelier",
  brandName: "Vani Collection",
  brandTagline: "Speciality in Fancy Kurties & Party Wear Dresses",
  logoUrl: "",
  collectionLabel: "Collections",
  announcements: [
    "✦ Speciality in Fancy Kurties & Party Wear Dresses",
    "✦ Free Express Shipping Across India Above ₹1,999",
    "✦ 100% Certified Pure Handcrafted Ensembles · Guna",
  ],
  links: [
    { label: "Stories", href: "/#stories", isActive: true },
    { label: "Reels", href: "/reels", isActive: true },
    { label: "Living Looks", href: "/#products", isActive: true },
    { label: "Contact", href: "/contact", isActive: true },
  ],
  colors: {
    announcementBg: "#1c1917",
    announcementText: "#dfc28c",
    announcementBorder: "#2d2520",
    headerBg: "#faf7f2",
    headerText: "#292524",
    accent: "#881337",
    mobileDrawerBg: "#faf7f2",
    mobileBottomBg: "#faf7f2",
  },
};

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [expandedMobileCategory, setExpandedMobileCategory] = useState<string | null>("Mul Cotton");
  const [storeCategories, setStoreCategories] = useState<StoreCategory[]>([]);
  const [dropdownMenus, setDropdownMenus] = useState<NavigationMenu[]>(FALLBACK_DROPDOWN_MENUS);
  const [settings, setSettings] = useState<NavigationSettings>(FALLBACK_NAV_SETTINGS);

  const { cartCount, setIsCartOpen, wishlist } = useCart();
  const lenis = useLenis();

  useEffect(() => {
    if (!isApiConfigured()) return;
    const controller = new AbortController();
    void api.storefrontNavigation(controller.signal)
      .then(({ data }) => {
        setStoreCategories(data.categories);
        setDropdownMenus(data.menus);
        setSettings(data.settings);
        setExpandedMobileCategory(data.categories[0]?.navigationGroup || null);
      })
      .catch((cause: unknown) => {
        if ((cause as Error)?.name !== "AbortError") console.error("Could not load storefront navigation", cause);
      });
    return () => controller.abort();
  }, []);

  const categories = storeCategories.length
    ? storeCategories
    : [
        { name: "Mul Cotton", slug: "mul-cotton", navigationGroup: "By Fabric", position: 0, isActive: true },
        { name: "Festive Edit", slug: "festive", navigationGroup: "By Occasion", position: 1, isActive: true },
        { name: "Co-ord Sets", slug: "coord-sets", navigationGroup: "By Style", position: 2, isActive: true },
        { name: "Anarkalis", slug: "anarkalis", navigationGroup: "By Style", position: 3, isActive: true },
        { name: "Kurta Sets", slug: "kurta-sets", navigationGroup: "By Style", position: 4, isActive: true },
        { name: "Sarees", slug: "sarees", navigationGroup: "By Style", position: 5, isActive: true },
        { name: "Dupattas", slug: "dupattas", navigationGroup: "By Style", position: 6, isActive: true },
      ];
  const collectionColumns = Array.from(
    categories.reduce((groups, category) => {
      const items = groups.get(category.navigationGroup) || [];
      items.push({ label: category.name, href: `/products?category=${encodeURIComponent(category.slug)}` });
      groups.set(category.navigationGroup, items);
      return groups;
    }, new Map<string, { label: string; href: string }[]>()),
    ([title, items]) => ({ title, items }),
  );
  const menuColumns = (menu: NavigationMenu | undefined) => (menu?.columns || []).map((column) => ({
    title: column.title,
    items: column.items.map((item) => ({
      label: item.label,
      href: item.categorySlug ? `/products?category=${encodeURIComponent(item.categorySlug)}` : item.href || "/products",
    })),
  }));
  const mobileCollectionGroups = storeCategories.length
    ? collectionColumns
    : NAV_ITEMS.map((item) => ({
        title: item.label,
        items: item.columns.flatMap((column) => column.links.map((label) => ({
          label,
          href: `/products?category=${getCategoryParam(label)}`,
        }))),
      }));
  const mobileDropdownGroups = dropdownMenus
    .filter((menu) => menu.isActive)
    .flatMap((menu) => menu.columns.map((column) => ({
      title: `${menu.label}: ${column.title}`,
      items: column.items.map((item) => ({
        label: item.label,
        href: item.categorySlug ? `/products?category=${encodeURIComponent(item.categorySlug)}` : item.href || "/products",
      })),
    })));

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
        style={{ backgroundColor: settings.colors.announcementBg, color: settings.colors.announcementText, borderBottom: `1px solid ${settings.colors.announcementBorder}` }}
        className="relative overflow-hidden py-2 select-none text-[10px] sm:text-[11px]"
      >
        <div className="absolute left-0 top-0 bottom-0 w-8 sm:w-16 z-10 pointer-events-none" style={{ background: `linear-gradient(to right, ${settings.colors.announcementBg}, transparent)` }} />
        <div className="absolute right-0 top-0 bottom-0 w-8 sm:w-16 z-10 pointer-events-none" style={{ background: `linear-gradient(to left, ${settings.colors.announcementBg}, transparent)` }} />
        <motion.div
          className="flex whitespace-nowrap"
          animate={{ x: ["0%", "-50%"] }}
          transition={{ duration: 28, ease: "linear", repeat: Infinity }}
        >
          {[0, 1].map((half) => (
            <div key={half} className="flex shrink-0">
              {settings.announcements.map((msg, i) => (
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
            backgroundColor: settings.colors.headerBg,
          }}
          transition={{ duration: 0.2 }}
          style={{
            backdropFilter: scrolled ? "blur(16px)" : "blur(0px)",
            WebkitBackdropFilter: scrolled ? "blur(16px)" : "blur(0px)",
            borderColor: settings.colors.announcementBorder,
            color: settings.colors.headerText,
          }}
          className={`border-b transition-[border-color] duration-300 ${scrolled ? "shadow-sm" : ""}`}
        >
          <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 h-[66px] sm:h-[74px] flex items-center gap-2">
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
                    background: `conic-gradient(from 0deg, ${settings.colors.announcementText}, ${settings.colors.accent}, ${settings.colors.announcementText})`,
                    padding: "1.5px",
                    WebkitMask:
                      "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                    WebkitMaskComposite: "xor",
                    maskComposite: "exclude",
                  }}
                />
                {/* Soft brand glow on tap */}
                <span className="absolute inset-0 rounded-full opacity-0 group-active:opacity-10 transition-opacity duration-200" style={{ backgroundColor: settings.colors.accent }} />

                {/* Animated 3-line icon */}
                <span className="relative flex flex-col items-center justify-center w-[22px] h-[16px]">
                  {/* Top line */}
                  <span className="absolute top-0 left-0 h-[2px] w-[18px] rounded-full transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:w-[22px]" style={{ background: `linear-gradient(to right, ${settings.colors.headerText}, ${settings.colors.accent})` }} />
                  {/* Middle line (shorter, gold) */}
                  <span className="absolute top-[7px] left-0 h-[2px] w-[12px] rounded-full transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:w-[22px]" style={{ backgroundColor: settings.colors.announcementText }} />
                  {/* Bottom line */}
                  <span className="absolute bottom-0 left-0 h-[2px] w-[22px] rounded-full transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:w-[14px]" style={{ background: `linear-gradient(to right, ${settings.colors.headerText}, ${settings.colors.accent})` }} />

                  {/* Tiny gold sparkle dot */}
                  <span className="absolute -top-[3px] -right-[5px] w-[3px] h-[3px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100" style={{ backgroundColor: settings.colors.announcementText }} />
                </span>
              </button>

              <button
                onClick={() => setSearchOpen(true)}
                className="w-9 h-9 rounded-full flex items-center justify-center transition"
                style={{ color: settings.colors.headerText }}
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
              className="flex flex-col leading-none group text-center lg:text-left shrink-0"
            >
              {settings.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={settings.logoUrl} alt={settings.brandName} className="max-h-12 max-w-44 object-contain" />
              ) : (
                <>
                  <span className="font-serif text-[22px] sm:text-[26px] tracking-[0.06em] transition-colors font-normal whitespace-nowrap" style={{ color: settings.colors.headerText }}>
                    {settings.brandName}
                  </span>
                  {settings.brandTagline && <span className="text-[7.5px] sm:text-[8.5px] tracking-[0.45em] uppercase mt-0.5 sm:mt-1 pl-[1px] font-semibold" style={{ color: settings.colors.accent }}>
                    {settings.brandTagline}
                  </span>}
                </>
              )}
            </Link>

            {/* Desktop Navigation: Mega Menu Dropdowns */}
            <nav className="hidden lg:flex items-center gap-0 flex-1 justify-center">
              {/* Collections Mega Menu */}
              <MegaMenuItem
                label={settings.collectionLabel}
                categories={collectionColumns}
                accent={settings.colors.accent}
                textColor={settings.colors.headerText}
                panelBg={settings.colors.headerBg}
              />

              {settings.links.filter((link) => link.isActive).map((link) => (
                <Link key={`${link.label}-${link.href}`} href={link.href} className="group relative px-3 py-2 text-[12px] font-semibold uppercase tracking-[0.12em] transition-colors whitespace-nowrap" style={{ color: settings.colors.headerText }}>
                  <span>{link.label}</span>
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 scale-x-0 transition-transform origin-left group-hover:scale-x-100" style={{ backgroundColor: settings.colors.accent }} />
                </Link>
              ))}

              {!settings.links.some((link) => link.href === "/about" || link.label.toLowerCase().includes("story") || link.label.toLowerCase().includes("about")) && (
                <Link
                  href="/about"
                  className="group relative px-4 py-2 text-[13px] font-semibold uppercase tracking-[0.15em] transition-colors"
                  style={{ color: settings.colors.headerText }}
                >
                  <span>Our Story</span>
                  <span
                    className="absolute bottom-0 left-0 right-0 h-0.5 scale-x-0 transition-transform origin-left group-hover:scale-x-100"
                    style={{ backgroundColor: settings.colors.accent }}
                  />
                </Link>
              )}

              {!settings.links.some((link) => link.href === "/contact" || link.label.toLowerCase() === "contact") && (
                <Link
                  href="/contact"
                  className="group relative px-4 py-2 text-[13px] font-semibold uppercase tracking-[0.15em] transition-colors"
                  style={{ color: settings.colors.headerText }}
                >
                  <span>Contact</span>
                  <span
                    className="absolute bottom-0 left-0 right-0 h-0.5 scale-x-0 transition-transform origin-left group-hover:scale-x-100"
                    style={{ backgroundColor: settings.colors.accent }}
                  />
                </Link>
              )}

              {/* Lookbook Mega Menu */}
              {dropdownMenus.filter((menu) => menu.isActive).sort((a, b) => a.position - b.position).map((menu) => {
                const isLookbook = menu.key === "lookbook" || menu.label.toLowerCase().includes("lookbook");
                return (
                  <MegaMenuItem
                    key={menu.key}
                    label={menu.label}
                    triggerHref={isLookbook ? "/#lookbook" : undefined}
                    categories={menuColumns(menu)}
                    footerHref={isLookbook ? "/#lookbook" : "/products"}
                    accent={settings.colors.accent}
                    textColor={settings.colors.headerText}
                    panelBg={settings.colors.headerBg}
                  />
                );
              })}

              {/* Shop By Price */}
            </nav>

            {/* Right Action Icons */}
            <div className="flex items-center gap-0.5 shrink-0">
              <div className="hidden lg:block">
                <IconBtn label="Search" onClick={() => setSearchOpen(true)} accent={settings.colors.accent} textColor={settings.colors.headerText}>
                  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <circle cx="11" cy="11" r="7" />
                    <path d="M21 21l-4.35-4.35" />
                  </svg>
                </IconBtn>
              </div>

              {/* Wishlist Icon → /account wishlist tab */}
              <Link href="/account" aria-label="Wishlist">
                <IconBtn label="Wishlist" accent={settings.colors.accent} textColor={settings.colors.headerText}>
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
                  <IconBtn label="Account" accent={settings.colors.accent} textColor={settings.colors.headerText}>
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
                className="relative flex items-center justify-center w-10 h-10 transition-colors hover:text-[var(--nav-accent)]"
                style={{ color: settings.colors.headerText, "--nav-accent": settings.colors.accent } as React.CSSProperties}
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
              style={{ background: settings.colors.mobileDrawerBg, height: "100vh" }}
            >
              {/* ── Luxury Branded Header ── */}
              <div
                className="relative px-5 pt-6 pb-5 flex items-end justify-between shrink-0"
                style={{ background: `linear-gradient(135deg, ${settings.colors.announcementBg} 0%, ${settings.colors.headerText} 55%, ${settings.colors.accent} 100%)` }}
              >
                <div
                  className="absolute inset-0 opacity-[0.05] pointer-events-none"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
                    backgroundSize: "150px 150px",
                  }}
                />
                <div className="relative z-10">
                  <span className="text-[8px] font-bold uppercase tracking-[0.4em] block mb-1" style={{ color: settings.colors.announcementText }}>{settings.brandTagline || "Store navigation"}</span>
                  <h2 className="font-serif text-2xl text-white font-light leading-none">{settings.brandName}</h2>
                  {settings.logoUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={settings.logoUrl} alt={settings.brandName} className="mt-2 max-h-9 max-w-36 object-contain" />
                  )}
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

              {/* Quick Links for Features */}
              <div className="grid grid-cols-3 gap-2 px-4 py-3 border-b border-stone-200/80 bg-white/30 shrink-0">
                <Link
                  href="/reels"
                  onClick={() => setMobileDrawerOpen(false)}
                  className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl bg-gradient-to-br from-[#881337] to-[#701a35] text-white font-semibold text-xs shadow-md"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="white" stroke="none">
                    <rect x="2" y="2" width="20" height="20" rx="4" />
                    <path d="M10 8l6 4-6 4V8z" fill="#881337" />
                  </svg>
                  <span>Reels</span>
                </Link>
                <Link
                  href="/#stories"
                  onClick={() => setMobileDrawerOpen(false)}
                  className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl bg-white border border-stone-200 text-stone-800 font-semibold text-xs hover:bg-stone-50 transition"
                >
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>Stories</span>
                </Link>
                <Link
                  href="/contact"
                  onClick={() => setMobileDrawerOpen(false)}
                  className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl bg-[#dfc28c]/15 border border-[#dfc28c]/40 text-[#7a5c2b] font-semibold text-xs hover:bg-[#dfc28c]/25 transition"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                  <span>Contact</span>
                </Link>
              </div>

              {/* Collection groups are driven by the active category catalogue. */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2.5" style={{ overscrollBehavior: "contain" }}>
                <span className="text-[9px] uppercase tracking-[0.3em] font-bold text-stone-400 block mb-3">
                  Collections
                </span>
                {[...mobileCollectionGroups, ...mobileDropdownGroups].map((group) => {
                  const isExpanded = expandedMobileCategory === group.title;
                  return (
                    <div
                      key={group.title}
                      className="border border-stone-200 rounded-xl overflow-hidden bg-white shadow-sm"
                    >
                      <button
                        onClick={() => setExpandedMobileCategory(isExpanded ? null : group.title)}
                        className="w-full flex items-center justify-between px-4 py-3.5 text-left"
                      >
                        <span className="flex items-center gap-2.5">
                          <span className="font-serif text-base font-semibold text-gray-900">{group.title}</span>
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
                            <div className="grid grid-cols-1 gap-2 pl-1">
                              {group.items.slice(0, 20).map((link) => (
                                <Link
                                  key={`${group.title}-${link.label}`}
                                  href={link.href}
                                  onClick={() => setMobileDrawerOpen(false)}
                                  className="flex items-center gap-2 text-sm text-stone-600 hover:text-[#881337] py-1 transition group"
                                >
                                  <span className="w-1 h-1 rounded-full bg-stone-300 group-hover:bg-[#881337] transition" />
                                  <span>{link.label}</span>
                                </Link>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}

                {/* Additional Quick Links */}
                <div className="pt-4 border-t border-stone-200 space-y-2 text-xs text-stone-700">
                  {settings.links.filter((link) => link.isActive).map((link) => (
                    <Link key={`mobile-${link.label}-${link.href}`} href={link.href} onClick={() => setMobileDrawerOpen(false)} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-stone-100" style={{ color: settings.colors.headerText }}>
                      <span>{link.label}</span><span>→</span>
                    </Link>
                  ))}
                  <Link
                    href="/#lookbook"
                    onClick={(e) => {
                      setMobileDrawerOpen(false);
                      if (window.location.pathname === "/") {
                        const target = document.getElementById("lookbook");
                        if (target) {
                          e.preventDefault();
                          target.scrollIntoView({ behavior: "smooth" });
                          window.history.pushState(null, "", "/#lookbook");
                        }
                      }
                    }}
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-stone-100 font-semibold text-[#881337]"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="text-[#881337]"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/></svg>
                      Shop The Lookbook
                    </span>
                    <span>→</span>
                  </Link>
                  <Link
                    href="/about"
                    onClick={() => setMobileDrawerOpen(false)}
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-stone-100 font-medium text-stone-800"
                  >
                    <span className="flex items-center gap-2">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.5 14.5L5 19m5.5-5.5L19 2M9.5 14.5c1 1 2.5 2 5 .5M5 19c1 1 2.5 1.5 4.5.5"/><circle cx="17" cy="5" r="2"/></svg>
                      <span>Our Story &amp; Guna Heritage</span>
                    </span>
                    <span>→</span>
                  </Link>
                  <Link
                    href="/contact"
                    onClick={() => setMobileDrawerOpen(false)}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-[#dfc28c]/15 text-[#7a5c2b] border border-[#dfc28c]/40 font-semibold text-xs"
                  >
                    <span className="flex items-center gap-2">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                      <span>Guna Flagship Atelier &amp; Contact</span>
                    </span>
                    <span>→</span>
                  </Link>
                  <a
                    href="https://wa.me/?text=Hello%20Vani%20Collection%20Atelier!"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-50 text-emerald-800 font-medium border border-emerald-200 text-xs"
                  >
                    {/* WhatsApp brand SVG */}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    <span>WhatsApp Styling Help</span>
                  </a>
                </div>
              </div>

              {/* Bottom Drawer Info */}
              <div className="p-4 border-t text-[11px] text-center" style={{ backgroundColor: settings.colors.announcementBg, borderColor: settings.colors.announcementBorder, color: settings.colors.announcementText }}>
                <span>{settings.announcements[0] || "Welcome to our store"}</span>
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
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)", backgroundColor: settings.colors.mobileBottomBg, borderColor: settings.colors.announcementBorder }}
      >
        <div className="flex items-center justify-around px-2 py-1.5">
          {/* Home */}
          <Link
            href="/"
            className="flex flex-col items-center py-1 px-3 rounded-xl transition-colors"
            style={{ color: settings.colors.headerText }}
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
            className="flex flex-col items-center py-1 px-3 rounded-xl transition-colors"
            style={{ color: settings.colors.headerText }}
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
            <div className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg border-2" style={{ background: `linear-gradient(135deg, ${settings.colors.accent}, ${settings.colors.announcementBg})`, borderColor: settings.colors.announcementText }}>
              {/* Play / Reels icon */}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <rect x="2" y="2" width="20" height="20" rx="5" />
                <path d="M8 9.5l8 4.5-8 4.5V9.5z" fill="white" stroke="none" />
              </svg>
            </div>
            <span className="text-[9px] font-bold mt-1 tracking-wide" style={{ color: settings.colors.accent }}>Reels</span>
          </Link>

          {/* Wishlist → Account */}
          <Link
            href="/account"
            className="flex flex-col items-center py-1 px-3 rounded-xl transition-colors relative"
            style={{ color: settings.colors.headerText }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
            </svg>
            {wishlist.length > 0 && (
              <span className="absolute top-0.5 right-1.5 w-3.5 h-3.5 rounded-full text-white text-[8px] flex items-center justify-center font-bold" style={{ backgroundColor: settings.colors.accent }}>
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
            <div className="relative" style={{ color: cartCount > 0 ? settings.colors.accent : settings.colors.headerText }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
                <path d="M3 6h18" />
                <path d="M16 10a4 4 0 01-8 0" />
              </svg>
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 min-w-[16px] h-[16px] px-0.5 rounded-full text-white text-[8px] flex items-center justify-center font-bold shadow" style={{ backgroundColor: settings.colors.accent }}>
                  {cartCount}
                </span>
              )}
            </div>
            <span className="text-[9px] font-medium mt-0.5" style={{ color: cartCount > 0 ? settings.colors.accent : settings.colors.headerText }}>Bag</span>
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
  accent = "#881337",
  textColor = "#292524",
}: {
  label: string;
  onClick?: () => void;
  children: React.ReactNode;
  accent?: string;
  textColor?: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 transition-colors rounded-full hover:bg-stone-200/50 hover:text-[var(--nav-accent)]"
      style={{ color: textColor, "--nav-accent": accent } as React.CSSProperties}
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
  triggerHref,
  categories,
  footerHref = "/products",
  accent = "#881337",
  textColor = "#292524",
  panelBg = "#faf7f2",
}: { 
  label: string;
  triggerHref?: string;
  categories: Array<{ title: string; items: Array<{ label: string; href: string }> }>;
  footerHref?: string;
  accent?: string;
  textColor?: string;
  panelBg?: string;
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
      {triggerHref ? (
        <Link
          href={triggerHref}
          onClick={(e) => {
            if (triggerHref.includes("#") && window.location.pathname === "/") {
              const id = triggerHref.split("#")[1];
              const target = document.getElementById(id);
              if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: "smooth" });
                window.history.pushState(null, "", triggerHref);
                setIsOpen(false);
              }
            }
          }}
          className="group relative text-[13px] font-semibold uppercase tracking-[0.15em] transition-colors px-4 py-2 flex items-center gap-1.5 cursor-pointer"
          style={{ color: textColor }}
        >
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
          <span className={`absolute bottom-0 left-0 right-0 h-0.5 transition-transform origin-left ${isOpen ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'}`} style={{ backgroundColor: accent }} />
        </Link>
      ) : (
        <button className="group relative text-[13px] font-semibold uppercase tracking-[0.15em] transition-colors px-4 py-2 flex items-center gap-1.5" style={{ color: textColor }}>
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
          <span className={`absolute bottom-0 left-0 right-0 h-0.5 transition-transform origin-left ${isOpen ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'}`} style={{ backgroundColor: accent }} />
        </button>
      )}

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
            <div className="rounded-2xl shadow-2xl border border-gray-100 overflow-hidden min-w-[600px]" style={{ backgroundColor: panelBg }}>
              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-100" style={{ backgroundColor: panelBg }}>
                <h3 className="text-lg font-bold" style={{ color: textColor }}>{label}</h3>
                <p className="text-xs text-gray-500 mt-0.5">Explore our curated collection</p>
              </div>

              {/* Categories Grid */}
              <div className="grid grid-cols-2 gap-8 p-6">
                {categories.map((category, idx) => (
                  <div key={idx} className="space-y-3">
                    <h4 className="text-sm font-bold uppercase tracking-wider border-b border-gray-200 pb-2" style={{ color: textColor }}>
                      {category.title}
                    </h4>
                    <ul className="space-y-2">
                      {category.items.map((item) => (
                        <li key={`${category.title}-${item.label}`}>
                          <Link
                            href={item.href}
                            className="group flex items-center gap-2 text-sm text-gray-600 transition-colors py-1 hover:text-[var(--nav-accent)]"
                            style={{ "--nav-accent": accent } as React.CSSProperties}
                          >
                            <span className="w-1 h-1 rounded-full bg-gray-300 transition-colors group-hover:bg-[var(--nav-accent)]" />
                            <span>{item.label}</span>
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
              <div className="px-6 py-4 border-t border-gray-100" style={{ backgroundColor: `${accent}12` }}>
                <Link 
                  href={footerHref}
                  onClick={(e) => {
                    setIsOpen(false);
                    if (footerHref.includes("#") && window.location.pathname === "/") {
                      const id = footerHref.split("#")[1];
                      const target = document.getElementById(id);
                      if (target) {
                        e.preventDefault();
                        target.scrollIntoView({ behavior: "smooth" });
                        window.history.pushState(null, "", footerHref);
                      }
                    }
                  }}
                  className="inline-flex items-center gap-2 text-sm font-semibold transition-colors"
                  style={{ color: accent }}
                >
                  <span>{footerHref.includes("#lookbook") ? "✦ Go to Shoppable Lookbook" : `View All in ${label}`}</span>
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
