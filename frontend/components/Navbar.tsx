"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import SearchOverlay from "./SearchOverlay";
import { useCart } from "../context/CartContext";
import { api, isApiConfigured, type NavigationMenu, type NavigationSettings, type StoreCategory } from "../lib/api-client";
import { normalizeNavigationLinks } from "../lib/navigation";
import { useModalDialog } from "../lib/use-modal-dialog";

const FALLBACK_CATEGORIES: StoreCategory[] = [
  { name: "Mul Cotton", slug: "mul-cotton", navigationGroup: "By Fabric", position: 0, isActive: true },
  { name: "Festive Edit", slug: "festive", navigationGroup: "By Occasion", position: 1, isActive: true },
  { name: "Co-ord Sets", slug: "coord-sets", navigationGroup: "By Style", position: 2, isActive: true },
  { name: "Anarkalis", slug: "anarkalis", navigationGroup: "By Style", position: 3, isActive: true },
  { name: "Kurta Sets", slug: "kurta-sets", navigationGroup: "By Style", position: 4, isActive: true },
  { name: "Sarees", slug: "sarees", navigationGroup: "By Style", position: 5, isActive: true },
  { name: "Dupattas", slug: "dupattas", navigationGroup: "By Style", position: 6, isActive: true },
];

const FALLBACK_SETTINGS: NavigationSettings = {
  theme: "atelier",
  brandName: "Vani Collection",
  brandTagline: "Speciality in Fancy Kurties & Party Wear Dresses",
  logoUrl: "",
  collectionLabel: "Collections",
  announcements: [
    "✦ Speciality in Fancy Kurties & Party Wear Dresses",
    "✦ Free Express Shipping Across India Above ₹1,999",
    "✦ Cash on Delivery Available (select pincodes)",
    "✦ 100% Certified Pure Handcrafted Ensembles · Guna",
  ],
  links: [
    { label: "Shop From The Video", href: "/#shop-from-video", isActive: true },
    { label: "Journal", href: "/journal", isActive: true },
    { label: "Living Looks", href: "/#products", isActive: true },
    { label: "Lookbook", href: "/#lookbook", isActive: true },
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

type DesktopMenu = "collections" | "more" | null;

type ConfiguredMenuItem = NavigationMenu["columns"][number]["items"][number];

function getMenuItemHref(item: ConfiguredMenuItem): string {
  return item.categorySlug ? `/collections/${encodeURIComponent(item.categorySlug)}` : item.href || "/products";
}

export default function Navbar() {
  const pathname = usePathname() ?? "/";
  const isProductPage = pathname.startsWith("/product/");
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [openDesktopMenu, setOpenDesktopMenu] = useState<DesktopMenu>(null);
  const [announcementIndex, setAnnouncementIndex] = useState(0);
  const [storeCategories, setStoreCategories] = useState<StoreCategory[]>([]);
  const [navigationMenus, setNavigationMenus] = useState<NavigationMenu[]>([]);
  const [settings, setSettings] = useState<NavigationSettings>(FALLBACK_SETTINGS);
  const desktopNavRef = useRef<HTMLElement>(null);
  const closeMobileDrawer = useCallback(() => setMobileDrawerOpen(false), []);
  const mobileDrawerRef = useModalDialog<HTMLDivElement>(mobileDrawerOpen, closeMobileDrawer);
  const { cartCount, setIsCartOpen, wishlist } = useCart();

  useEffect(() => {
    if (!isApiConfigured()) return;
    const controller = new AbortController();
    void api.storefrontNavigation(controller.signal)
      .then(({ data }) => {
        setStoreCategories(data.categories.filter((category) => category.isActive));
        setNavigationMenus(data.menus.filter((menu) => menu.isActive).sort((a, b) => a.position - b.position));
        setSettings({ ...data.settings, links: normalizeNavigationLinks(data.settings.links) });
      })
      .catch((cause: unknown) => {
        if ((cause as Error)?.name !== "AbortError") console.error("Could not load storefront navigation", cause);
      });
    return () => controller.abort();
  }, []);

  const announcements = settings.announcements.filter((message) => message.trim());
  const announcementCount = announcements.length;
  useEffect(() => {
    if (announcementCount < 2) return;
    const interval = window.setInterval(() => {
      setAnnouncementIndex((current) => (current + 1) % announcementCount);
    }, 5000);
    return () => window.clearInterval(interval);
  }, [announcementCount]);

  const navLinks = normalizeNavigationLinks(settings.links);
  const navItems = [
    ...navLinks.filter((link) => link.isActive),
    ...(!navLinks.some((link) => link.href === "/journal" || link.label.toLowerCase() === "journal")
      ? [{ label: "Journal", href: "/journal", isActive: true }]
      : []),
    ...(!navLinks.some((link) => link.href === "/about" || link.label.toLowerCase().includes("story") || link.label.toLowerCase().includes("about"))
      ? [{ label: "Our Story", href: "/about", isActive: true }]
      : []),
    ...(!navLinks.some((link) => link.href === "/contact" || link.label.toLowerCase() === "contact")
      ? [{ label: "Contact", href: "/contact", isActive: true }]
      : []),
  ];
  const primaryDesktopLinks = navItems.slice(0, 4);
  const overflowDesktopLinks = navItems.slice(4);
  const hasMoreNavigation = overflowDesktopLinks.length > 0 || navigationMenus.length > 0;
  const categories = storeCategories.length ? storeCategories : FALLBACK_CATEGORIES;

  useEffect(() => {
    if (!openDesktopMenu) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!desktopNavRef.current?.contains(event.target as Node)) setOpenDesktopMenu(null);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenDesktopMenu(null);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [openDesktopMenu]);

  const openSearch = () => {
    setMobileDrawerOpen(false);
    setOpenDesktopMenu(null);
    setSearchOpen(true);
  };
  const closeMenus = () => setOpenDesktopMenu(null);
  const displayedAnnouncement = announcementCount
    ? announcements[announcementIndex % announcementCount]
    : "";

  return (
    <>
      {displayedAnnouncement && (
        <div
          aria-live="polite"
          className="px-3 py-1.5 text-center text-[9px] font-medium tracking-wide sm:text-[10px]"
          style={{
            backgroundColor: settings.colors.announcementBg,
            color: settings.colors.announcementText,
            borderBottom: `1px solid ${settings.colors.announcementBorder}`,
          }}
        >
          <span className="mx-auto block max-w-7xl truncate">{displayedAnnouncement}</span>
        </div>
      )}

      <header
        className="sticky top-0 z-50 border-b shadow-sm"
        style={{ backgroundColor: settings.colors.headerBg, borderColor: settings.colors.announcementBorder, color: settings.colors.headerText }}
      >
        <div className="mx-auto flex h-14 max-w-[1500px] items-center gap-2 px-3 sm:h-16 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => setMobileDrawerOpen(true)}
            aria-label="Open navigation menu"
            aria-expanded={mobileDrawerOpen}
            aria-controls="mobile-navigation-drawer"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition hover:bg-black/5 xl:hidden"
          >
            <svg aria-hidden="true" width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>

          <Link
            href="/"
            aria-label={settings.brandName}
            className="flex min-w-0 flex-1 flex-col items-center justify-center leading-none xl:flex-none xl:items-start"
          >
            {settings.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={settings.logoUrl} alt={settings.brandName} className="max-h-10 max-w-36 object-contain sm:max-w-44" />
            ) : (
              <span className="max-w-full truncate font-serif text-[17px] font-medium tracking-wide sm:text-xl xl:text-[22px]">
                {settings.brandName}
              </span>
            )}
            {settings.brandTagline && (
              <span className="mt-1 hidden max-w-52 truncate text-[8px] uppercase tracking-[0.16em] text-stone-500 xl:block">
                {settings.brandTagline}
              </span>
            )}
          </Link>

          <nav ref={desktopNavRef} aria-label="Primary navigation" className="hidden min-w-0 flex-1 items-center justify-center gap-1 xl:flex">
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setOpenDesktopMenu((current) => current === "collections" ? null : "collections")}
                aria-expanded={openDesktopMenu === "collections"}
                aria-controls="desktop-collections-menu"
                className="flex min-h-10 items-center gap-1 rounded-lg px-2.5 text-[11px] font-semibold uppercase tracking-wide transition hover:bg-black/5 2xl:px-3 2xl:text-xs"
                style={{ color: settings.colors.headerText }}
              >
                <span>{settings.collectionLabel || "Collections"}</span>
                <ChevronIcon open={openDesktopMenu === "collections"} />
              </button>
              {openDesktopMenu === "collections" && (
                <div id="desktop-collections-menu" className="absolute left-0 top-full z-50 mt-1 max-h-[70vh] w-64 overflow-y-auto rounded-xl border border-stone-200 bg-white p-2 shadow-xl">
                  <Link href="/collections" onClick={closeMenus} className="nav-snake-link flex min-h-10 items-center rounded-lg px-3 text-sm font-semibold text-stone-900 transition hover:bg-stone-50" style={{ "--nav-accent": settings.colors.accent } as React.CSSProperties}>
                    All collections <span className="ml-auto text-[var(--nav-accent)]">→</span>
                  </Link>
                  {categories.map((category) => (
                    <Link
                      key={category.slug}
                      href={`/collections/${encodeURIComponent(category.slug)}`}
                      onClick={closeMenus}
                      className="nav-snake-link flex min-h-10 items-center rounded-lg px-3 text-sm text-stone-700 transition hover:bg-stone-50 hover:text-[var(--nav-accent)]"
                      style={{ "--nav-accent": settings.colors.accent } as React.CSSProperties}
                    >
                      {category.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {primaryDesktopLinks.map((link) => (
              <Link
                key={`${link.label}-${link.href}`}
                href={link.href}
                onClick={closeMenus}
                className="nav-snake-link max-w-32 truncate rounded-lg px-2.5 py-2 text-[11px] font-semibold transition hover:bg-black/5 hover:text-[var(--nav-accent)] 2xl:max-w-40 2xl:px-3 2xl:text-xs"
                style={{ color: settings.colors.headerText, "--nav-accent": settings.colors.accent } as React.CSSProperties}
              >
                {link.label}
              </Link>
            ))}

            {hasMoreNavigation && (
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setOpenDesktopMenu((current) => current === "more" ? null : "more")}
                  aria-expanded={openDesktopMenu === "more"}
                  aria-controls="desktop-more-menu"
                  className="flex min-h-10 items-center gap-1 rounded-lg px-2.5 text-[11px] font-semibold uppercase tracking-wide transition hover:bg-black/5"
                  style={{ color: settings.colors.headerText }}
                >
                  More <ChevronIcon open={openDesktopMenu === "more"} />
                </button>
                {openDesktopMenu === "more" && (
                  <div id="desktop-more-menu" className="absolute right-0 top-full z-50 mt-1 max-h-[70vh] w-60 overflow-y-auto rounded-xl border border-stone-200 bg-white p-2 shadow-xl">
                    {overflowDesktopLinks.map((link) => (
                      <Link key={`${link.label}-${link.href}`} href={link.href} onClick={closeMenus} className="nav-snake-link flex min-h-10 items-center rounded-lg px-3 text-sm text-stone-700 transition hover:bg-stone-50 hover:text-[var(--nav-accent)]" style={{ "--nav-accent": settings.colors.accent } as React.CSSProperties}>
                        {link.label}
                      </Link>
                    ))}
                    {navigationMenus.map((menu) => (
                      <section key={menu.key} className="mt-2 border-t border-stone-100 pt-2">
                        <h3 className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-stone-400">{menu.label}</h3>
                        {menu.columns.flatMap((column) => column.items.map((item) => (
                          <Link key={`${menu.key}-${column.title}-${item.label}`} href={getMenuItemHref(item)} onClick={closeMenus} className="nav-snake-link flex min-h-9 items-center rounded-lg px-3 text-sm text-stone-700 transition hover:bg-stone-50 hover:text-[var(--nav-accent)]" style={{ "--nav-accent": settings.colors.accent } as React.CSSProperties}>
                            {item.label}
                          </Link>
                        )))}
                      </section>
                    ))}
                  </div>
                )}
              </div>
            )}
          </nav>

          <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
            <IconButton label="Search" onClick={() => setSearchOpen(true)} accent={settings.colors.accent}>
              <SearchIcon />
            </IconButton>
            <Link href="/account" aria-label="My account" title="My account" className="hidden h-10 w-10 items-center justify-center rounded-full transition hover:bg-black/5 hover:text-[var(--nav-accent)] xl:inline-flex" style={{ color: settings.colors.headerText, "--nav-accent": settings.colors.accent } as React.CSSProperties}>
              <AccountIcon />
            </Link>
            <Link href="/account/wishlist" aria-label="Wishlist" title="Wishlist" className="relative hidden h-10 w-10 items-center justify-center rounded-full transition hover:bg-black/5 hover:text-[var(--nav-accent)] xl:inline-flex" style={{ color: settings.colors.headerText, "--nav-accent": settings.colors.accent } as React.CSSProperties}>
              <HeartIcon />
              {wishlist.length > 0 && <CountBadge count={wishlist.length} accent={settings.colors.accent} />}
            </Link>
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              aria-label={`Shopping bag${cartCount ? `, ${cartCount} items` : ""}`}
              title="Shopping bag"
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-black/5 hover:text-[var(--nav-accent)]"
              style={{ color: settings.colors.headerText, "--nav-accent": settings.colors.accent } as React.CSSProperties}
            >
              <BagIcon />
              {cartCount > 0 && <CountBadge count={cartCount} accent={settings.colors.accent} />}
            </button>
          </div>
        </div>
      </header>

      {mobileDrawerOpen && (
        <>
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={closeMobileDrawer}
            className="animate-fadeIn fixed inset-0 z-[90] bg-black/35 xl:hidden"
          />
          <div
            ref={mobileDrawerRef}
            id="mobile-navigation-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-navigation-title"
            tabIndex={-1}
            className="animate-fadeIn fixed inset-y-0 left-0 z-[91] flex h-[100dvh] w-[min(88vw,22rem)] flex-col shadow-xl focus:outline-none xl:hidden"
            style={{ backgroundColor: settings.colors.mobileDrawerBg }}
          >
            <div className="flex min-h-16 items-center justify-between border-b border-stone-200 px-4">
              <button type="button" onClick={closeMobileDrawer} aria-label="Close navigation menu" className="inline-flex h-10 w-10 items-center justify-center rounded-full text-stone-700 transition hover:bg-black/5">
                <CloseIcon />
              </button>
              <h2 id="mobile-navigation-title" className="min-w-0 flex-1 truncate px-2 text-center font-serif text-lg text-stone-900">
                {settings.brandName}
              </h2>
              <span aria-hidden="true" className="h-10 w-10 shrink-0" />
            </div>

            <div className="border-b border-stone-200 p-4">
              <button type="button" onClick={openSearch} className="flex min-h-11 w-full items-center gap-3 rounded-lg border border-stone-200 bg-white px-3 text-sm text-stone-500 transition hover:border-stone-300">
                <SearchIcon />
                <span>Search products</span>
              </button>
            </div>

            <nav aria-label="Mobile navigation" className="flex-1 overflow-y-auto px-4 py-3">
              <p className="px-2 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-400">Shop</p>
              <MobileNavLink href="/products" onClick={closeMobileDrawer} accent={settings.colors.accent}>
                All products
              </MobileNavLink>
              <MobileNavLink href="/collections" onClick={closeMobileDrawer} accent={settings.colors.accent}>
                All collections
              </MobileNavLink>
              {categories.map((category) => (
                <MobileNavLink key={category.slug} href={`/collections/${encodeURIComponent(category.slug)}`} onClick={closeMobileDrawer} accent={settings.colors.accent}>
                  {category.name}
                </MobileNavLink>
              ))}

              <p className="mt-5 border-t border-stone-200 px-2 pb-2 pt-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-400">Discover</p>
              {navItems.map((link) => (
                <MobileNavLink key={`${link.label}-${link.href}`} href={link.href} onClick={closeMobileDrawer} accent={settings.colors.accent}>
                  {link.label}
                </MobileNavLink>
              ))}
              {navigationMenus.map((menu) => (
                <details key={menu.key} className="group mt-2 rounded-lg border border-stone-200 bg-white">
                  <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between rounded-lg px-3 text-sm font-medium text-stone-700">
                    {menu.label}
                    <span aria-hidden="true" className="text-lg leading-none text-stone-400 transition-transform group-open:rotate-180">⌄</span>
                  </summary>
                  <div className="border-t border-stone-100 px-2 py-2">
                    {menu.columns.map((column) => (
                      <div key={`${menu.key}-${column.title}`} className="py-1">
                        <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-stone-400">{column.title}</p>
                        {column.items.map((item) => (
                          <MobileNavLink key={`${menu.key}-${column.title}-${item.label}`} href={getMenuItemHref(item)} onClick={closeMobileDrawer} accent={settings.colors.accent}>
                            {item.label}
                          </MobileNavLink>
                        ))}
                      </div>
                    ))}
                  </div>
                </details>
              ))}

              <p className="mt-5 border-t border-stone-200 px-2 pb-2 pt-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-400">Your account</p>
              <MobileNavLink href="/account" onClick={closeMobileDrawer} accent={settings.colors.accent}>My account</MobileNavLink>
              <MobileNavLink href="/account/wishlist" onClick={closeMobileDrawer} accent={settings.colors.accent}>
                Wishlist {wishlist.length > 0 && <span className="ml-auto text-xs text-stone-500">{wishlist.length}</span>}
              </MobileNavLink>
              <button
                type="button"
                onClick={() => {
                  closeMobileDrawer();
                  setIsCartOpen(true);
                }}
                className="flex min-h-11 w-full items-center justify-between rounded-lg px-3 text-left text-sm font-medium text-stone-700 transition hover:bg-white hover:text-[var(--nav-accent)]"
                style={{ "--nav-accent": settings.colors.accent } as React.CSSProperties}
              >
                <span>Shopping bag</span>
                {cartCount > 0 && <span className="rounded-full px-2 py-0.5 text-xs text-white" style={{ backgroundColor: settings.colors.accent }}>{cartCount}</span>}
              </button>
            </nav>

            {settings.brandTagline && <p className="border-t border-stone-200 px-5 py-3 text-center text-[10px] text-stone-500">{settings.brandTagline}</p>}
          </div>
        </>
      )}

      <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />

      {!isProductPage && (
        <nav
          aria-label="Mobile quick navigation"
          className="fixed inset-x-0 bottom-0 z-40 border-t bg-white/95 shadow-sm backdrop-blur xl:hidden"
          style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)", backgroundColor: settings.colors.mobileBottomBg, borderColor: settings.colors.announcementBorder }}
        >
          <div className="mx-auto grid max-w-lg grid-cols-3 px-2 py-1">
            <MobileQuickLink href="/" label="Home" active={pathname === "/"} accent={settings.colors.accent}>
              <HomeIcon />
            </MobileQuickLink>
            <MobileQuickLink href="/collections" label="Shop" active={pathname.startsWith("/collections") || pathname.startsWith("/products")} accent={settings.colors.accent}>
              <ShopIcon />
            </MobileQuickLink>
            <MobileQuickLink href="/#shop-from-video" label="Video" active={false} accent={settings.colors.accent}>
              <VideoIcon />
            </MobileQuickLink>
          </div>
        </nav>
      )}
    </>
  );
}

function IconButton({ label, onClick, children, accent }: { label: string; onClick: () => void; children: React.ReactNode; accent: string }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} className="inline-flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-black/5 hover:text-[var(--nav-accent)]" style={{ color: "inherit", "--nav-accent": accent } as React.CSSProperties}>
      {children}
    </button>
  );
}

function MobileNavLink({ href, onClick, accent, children }: { href: string; onClick: () => void; accent: string; children: React.ReactNode }) {
  return (
    <Link href={href} onClick={onClick} className="nav-snake-link nav-snake-link--mobile flex min-h-11 items-center justify-between rounded-lg px-3 text-sm font-medium text-stone-700 transition hover:bg-white hover:text-[var(--nav-accent)]" style={{ "--nav-accent": accent } as React.CSSProperties}>
      {children}
      <span aria-hidden="true" className="ml-2 text-stone-300">→</span>
    </Link>
  );
}

function MobileQuickLink({ href, label, active, accent, children }: { href: string; label: string; active: boolean; accent: string; children: React.ReactNode }) {
  return (
    <Link href={href} aria-label={label} aria-current={active ? "page" : undefined} className="nav-snake-link nav-snake-link--quick flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-lg px-2 text-[10px] font-medium transition hover:bg-black/5" style={{ color: active ? accent : "#57534e" }}>
      {children}
      <span>{label}</span>
    </Link>
  );
}

function CountBadge({ count, accent }: { count: number; accent: string }) {
  return (
    <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold text-white" style={{ backgroundColor: accent }}>
      {count > 99 ? "99+" : count}
    </span>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transition-transform ${open ? "rotate-180" : ""}`}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </svg>
  );
}

function AccountIcon() {
  return (
    <svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round">
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1 7.8 7.8 7.8-7.8 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />
    </svg>
  );
}

function BagIcon() {
  return (
    <svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round">
      <path d="M5 8h14l1 13H4L5 8Z" />
      <path d="M9 9V6a3 3 0 0 1 6 0v3" />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
      <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V10Z" />
    </svg>
  );
}

function ShopIcon() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function VideoIcon() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m10 9 5 3-5 3z" fill="currentColor" stroke="none" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}
