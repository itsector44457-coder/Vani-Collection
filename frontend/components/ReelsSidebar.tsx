"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent, type ReactElement } from "react";

/* ------------------------------------------------------------------ */
/*  Icons — 18px, 1.6 stroke, consistent                               */
/* ------------------------------------------------------------------ */
const S = 18;

const strokeProps = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const HomeIcon = () => (
  <svg width={S} height={S} viewBox="0 0 24 24" {...strokeProps}>
    <path d="M3 10.5 12 3l9 7.5V20a1.5 1.5 0 0 1-1.5 1.5H4.5A1.5 1.5 0 0 1 3 20z" />
    <path d="M9.5 21.5V14h5v7.5" />
  </svg>
);

const ReelsIcon = () => (
  <svg width={S} height={S} viewBox="0 0 24 24" {...strokeProps}>
    <rect x="3" y="3" width="18" height="18" rx="3.5" />
    <path d="M3 8.5h18" />
    <path d="M9 3v5.5" />
    <path d="m11 12.5 4.5 2.6-4.5 2.6z" fill="currentColor" stroke="none" />
  </svg>
);

const ShopIcon = () => (
  <svg width={S} height={S} viewBox="0 0 24 24" {...strokeProps}>
    <path d="M5.5 8h13l-1.1 11.1A2 2 0 0 1 15.4 21H8.6a2 2 0 0 1-2-1.9z" />
    <path d="M8.75 8V6.5a3.25 3.25 0 1 1 6.5 0V8" />
  </svg>
);

const HeartIcon = () => (
  <svg width={S} height={S} viewBox="0 0 24 24" {...strokeProps}>
    <path d="M20.8 5.6a5.2 5.2 0 0 0-7.4 0L12 7l-1.4-1.4a5.2 5.2 0 0 0-7.4 7.4L12 21l8.8-8a5.2 5.2 0 0 0 0-7.4z" />
  </svg>
);

const OrdersIcon = () => (
  <svg width={S} height={S} viewBox="0 0 24 24" {...strokeProps}>
    <path d="M6.5 3h11A1.5 1.5 0 0 1 19 4.5V21l-3-1.5L13 21l-3-1.5L7 21l-1.5-.75V4.5A1.5 1.5 0 0 1 6.5 3z" />
    <path d="M9 8.5h6M9 12.5h6" />
  </svg>
);

const UserIcon = () => (
  <svg width={S} height={S} viewBox="0 0 24 24" {...strokeProps}>
    <circle cx="12" cy="8.5" r="3.5" />
    <path d="M4.5 21c1-3.5 4-5.5 7.5-5.5s6.5 2 7.5 5.5" />
  </svg>
);

const SearchIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" {...strokeProps} strokeWidth={1.8}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);

const ArrowIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" {...strokeProps} strokeWidth={1.8}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

/* ------------------------------------------------------------------ */
/*  Nav config                                                         */
/* ------------------------------------------------------------------ */
interface NavItem {
  name: string;
  href: string;
  icon: () => ReactElement;
  badge?: string;
  matchPrefix?: boolean;
}

const NAV: NavItem[] = [
  { name: "Home", href: "/", icon: HomeIcon },
  { name: "Reels", href: "/reels", icon: ReelsIcon, badge: "Live", matchPrefix: true },
  { name: "Shop", href: "/products", icon: ShopIcon, matchPrefix: true },
  { name: "Wishlist", href: "/account/wishlist", icon: HeartIcon },
];

const ACCOUNT: NavItem[] = [
  { name: "Orders", href: "/account/orders", icon: OrdersIcon, matchPrefix: true },
  { name: "Profile", href: "/account", icon: UserIcon },
];

const CATEGORIES = [
  { name: "Sarees", href: "/products?category=festive" },
  { name: "Anarkalis", href: "/products?category=anarkalis" },
  { name: "Co-ord Sets", href: "/products?category=coord-sets" },
  { name: "Mul Cotton", href: "/products?category=mul-cotton" },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export default function ReelsSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState("");

  const isActive = useMemo(
    () => (item: NavItem) => {
      if (item.href === "/") return pathname === "/";
      return item.matchPrefix
        ? pathname === item.href || pathname.startsWith(`${item.href}/`)
        : pathname === item.href;
    },
    [pathname]
  );

  /* The storefront reads `?search=`, so the sidebar hands the term over in that shape. */
  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    const term = query.trim();
    if (!term) return;
    router.push(`/products?search=${encodeURIComponent(term)}`);
  };

  const renderNavItem = (item: NavItem) => {
    const active = isActive(item);
    const Icon = item.icon;

    return (
      <li key={item.name}>
        <Link
          href={item.href}
          aria-current={active ? "page" : undefined}
          className={[
            "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 outline-none",
            "transition-all duration-200",
            active
              ? "bg-[#dfc28c]/[0.08] text-[#dfc28c]"
              : "text-[#f5f1ea]/55 hover:bg-white/[0.04] hover:text-[#f5f1ea]",
          ].join(" ")}
        >
          {/* Left accent bar */}
          <span
            aria-hidden="true"
            className={[
              "absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-r-full bg-[#dfc28c]",
              "transition-all duration-300",
              active ? "opacity-100" : "opacity-0",
            ].join(" ")}
          />

          <span
            className={
              active
                ? "text-[#dfc28c]"
                : "text-[#f5f1ea]/45 group-hover:text-[#f5f1ea] transition-colors"
            }
          >
            <Icon />
          </span>

          <span
            className={`flex-1 text-[13.5px] tracking-tight ${
              active ? "font-semibold" : "font-medium"
            }`}
          >
            {item.name}
          </span>

          {item.badge && (
            <span
              className={[
                "flex items-center gap-1 rounded-full px-1.5 py-[2px]",
                "text-[8.5px] font-bold uppercase tracking-widest",
                active
                  ? "bg-[#dfc28c] text-[#14100f]"
                  : "bg-[#dfc28c]/10 text-[#dfc28c]",
              ].join(" ")}
            >
              <span className="h-1 w-1 rounded-full bg-current animate-pulse" />
              {item.badge}
            </span>
          )}
        </Link>
      </li>
    );
  };

  return (
    <aside className="fixed left-0 top-0 z-50 hidden h-[100dvh] w-[248px] flex-col overflow-hidden border-r border-white/[0.06] bg-[#14100f] text-[#f5f1ea] lg:flex">
      {/* ---------- Brand ---------- */}
      <div className="shrink-0 px-5 pt-7 pb-5">
        <Link href="/" className="group flex items-center gap-3">
          {/* Framed monogram */}
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#dfc28c] via-[#c9a56b] to-[#8a6d3f]" />
            <div className="absolute inset-[1.5px] rounded-[14px] bg-[#14100f]" />
            <span className="relative font-serif text-lg font-bold text-[#dfc28c]">
              V
            </span>
          </div>
          <div className="min-w-0 leading-tight">
            <div className="font-serif text-[17px] font-semibold tracking-tight">
              Vani
            </div>
            <div className="text-[8.5px] font-semibold uppercase tracking-[0.22em] text-[#dfc28c]/60">
              Collection
            </div>
          </div>
        </Link>
      </div>

      {/* ---------- Search ---------- */}
      <div className="shrink-0 px-4 pb-4">
        <form onSubmit={submitSearch} role="search">
          <label htmlFor="reels-sidebar-search" className="sr-only">
            Search the collection
          </label>
          <div className="group flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2 transition-colors focus-within:border-[#dfc28c]/40 focus-within:bg-white/[0.05]">
            <span className="shrink-0 text-[#f5f1ea]/40 transition-colors group-focus-within:text-[#dfc28c]">
              <SearchIcon />
            </span>
            <input
              id="reels-sidebar-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search pieces…"
              className="min-w-0 flex-1 bg-transparent text-[12.5px] text-[#f5f1ea] outline-none placeholder:text-[#f5f1ea]/30"
            />
            {query && (
              <button
                type="submit"
                className="shrink-0 rounded-md border border-white/10 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wider text-[#dfc28c] transition hover:bg-[#dfc28c]/10"
              >
                Go
              </button>
            )}
          </div>
        </form>
      </div>

      {/* ---------- Nav ---------- */}
      <nav className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
        <p className="px-3 pb-2 text-[9.5px] font-semibold uppercase tracking-[0.2em] text-[#f5f1ea]/30">
          Menu
        </p>
        <ul className="space-y-0.5">{NAV.map(renderNavItem)}</ul>

        {/* Category shortcuts */}
        <p className="mt-6 px-3 pb-2 text-[9.5px] font-semibold uppercase tracking-[0.2em] text-[#f5f1ea]/30">
          Shop by
        </p>
        <ul className="space-y-px">
          {CATEGORIES.map((category) => (
            <li key={category.name}>
              <Link
                href={category.href}
                className="group flex items-center justify-between rounded-lg px-3 py-2 text-[12.5px] text-[#f5f1ea]/55 transition-colors hover:bg-white/[0.03] hover:text-[#dfc28c]"
              >
                <span>{category.name}</span>
                <span className="translate-x-[-4px] opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100">
                  <ArrowIcon />
                </span>
              </Link>
            </li>
          ))}
        </ul>

        {/* Account */}
        <p className="mt-6 px-3 pb-2 text-[9.5px] font-semibold uppercase tracking-[0.2em] text-[#f5f1ea]/30">
          Account
        </p>
        <ul className="space-y-0.5">{ACCOUNT.map(renderNavItem)}</ul>
      </nav>

      {/* ---------- Footer ---------- */}
      <div className="shrink-0 border-t border-white/[0.06] p-4">
        <div className="relative overflow-hidden rounded-2xl border border-[#dfc28c]/15 bg-gradient-to-br from-[#dfc28c]/[0.08] to-transparent p-3.5">
          <div className="pointer-events-none absolute -right-6 -top-6 h-16 w-16 rounded-full bg-[#dfc28c]/10 blur-2xl" />
          <p className="relative font-serif text-[13px] font-semibold text-[#dfc28c]">
            Need styling help?
          </p>
          <p className="relative mt-0.5 text-[10.5px] leading-relaxed text-[#f5f1ea]/55">
            Talk to our atelier for bespoke sizing &amp; care.
          </p>
          <a
            href="mailto:support@vanicollection.com"
            className="relative mt-2.5 inline-flex items-center gap-1 text-[10.5px] font-semibold uppercase tracking-wider text-[#dfc28c] transition-all hover:gap-2"
          >
            Contact
            <ArrowIcon />
          </a>
        </div>

        <p className="mt-3 px-1 text-[9px] tracking-wide text-[#f5f1ea]/25">
          © {new Date().getFullYear()} Vani Collection
        </p>
      </div>
    </aside>
  );
}
