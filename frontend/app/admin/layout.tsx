"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode, type ReactElement } from "react";
import { useAdminSession } from "@/lib/use-admin-session";

/* ---------------- Icons ---------------- */
const s = 17;
const sp = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const DashboardIcon = () => (
  <svg width={s} height={s} viewBox="0 0 24 24" {...sp}>
    <rect x="3" y="3" width="7.5" height="9" rx="1.5" />
    <rect x="13.5" y="3" width="7.5" height="5.5" rx="1.5" />
    <rect x="3" y="15" width="7.5" height="6" rx="1.5" />
    <rect x="13.5" y="11.5" width="7.5" height="9.5" rx="1.5" />
  </svg>
);
const AnalyticsIcon = () => (
  <svg width={s} height={s} viewBox="0 0 24 24" {...sp}>
    <path d="M3 20V9M9 20V4M15 20v-7M21 20v-4" />
  </svg>
);
const ProductsIcon = () => (
  <svg width={s} height={s} viewBox="0 0 24 24" {...sp}>
    <path d="M12 2.5 21 7v10l-9 4.5L3 17V7z" />
    <path d="m3 7 9 4.5L21 7M12 21.5V11.5" />
  </svg>
);
const OrdersIcon = () => (
  <svg width={s} height={s} viewBox="0 0 24 24" {...sp}>
    <path d="M6.5 3h11A1.5 1.5 0 0 1 19 4.5V21l-3-1.5L13 21l-3-1.5L7 21V4.5A1.5 1.5 0 0 1 8.5 3z" />
    <path d="M9 8.5h6M9 12.5h6" />
  </svg>
);
const CustomersIcon = () => (
  <svg width={s} height={s} viewBox="0 0 24 24" {...sp}>
    <circle cx="9" cy="8.5" r="3.2" />
    <path d="M2.5 20c.8-3.4 3.4-5.3 6.5-5.3s5.7 1.9 6.5 5.3" />
    <path d="M16.5 5.5a3 3 0 0 1 0 6M18 14.7c1.9.4 3.3 1.8 3.9 4.3" />
  </svg>
);
const ReelsIcon = () => (
  <svg width={s} height={s} viewBox="0 0 24 24" {...sp}>
    <rect x="3" y="3" width="18" height="18" rx="3.5" />
    <path d="M3 8.5h18M9 3v5.5" />
    <path d="m11 12.5 4.5 2.6-4.5 2.6z" fill="currentColor" stroke="none" />
  </svg>
);
const CollectionIcon = () => (
  <svg width={s} height={s} viewBox="0 0 24 24" {...sp}>
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
  </svg>
);
const SettingsIcon = () => (
  <svg width={s} height={s} viewBox="0 0 24 24" {...sp}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </svg>
);

const SearchIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" {...sp} strokeWidth={1.8}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);
const BellIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" {...sp}>
    <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.7 21a2 2 0 0 1-3.4 0" />
  </svg>
);
const LogoutIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" {...sp}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="m16 17 5-5-5-5M21 12H9" />
  </svg>
);

/* ---------------- Nav config ---------------- */
interface NavItem {
  name: string;
  href: string;
  icon: () => ReactElement;
  badge?: string;
  matchPrefix?: boolean;
}

const SECTIONS: { label: string; items: NavItem[] }[] = [
  {
    label: "Overview",
    items: [
      { name: "Dashboard", href: "/admin", icon: DashboardIcon },
      { name: "Analytics", href: "/admin/analytics", icon: AnalyticsIcon, matchPrefix: true },
    ],
  },
  {
    label: "Commerce",
    items: [
      { name: "Products", href: "/admin/products", icon: ProductsIcon, badge: "142", matchPrefix: true },
      { name: "Orders", href: "/admin/orders", icon: OrdersIcon, badge: "8", matchPrefix: true },
      { name: "Customers", href: "/admin/customers", icon: CustomersIcon, matchPrefix: true },
    ],
  },
  {
    label: "Content",
    items: [
      { name: "Reels", href: "/admin/reels", icon: ReelsIcon, matchPrefix: true },
      { name: "Collections", href: "/admin/collections", icon: CollectionIcon, matchPrefix: true },
    ],
  },
  {
    label: "System",
    items: [{ name: "Settings", href: "/admin/settings", icon: SettingsIcon, matchPrefix: true }],
  },
];

/* ---------------- Layout ---------------- */
export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [profileOpen, setProfileOpen] = useState(false);
  const session = useAdminSession();
  const displayName = [session.user?.firstName, session.user?.lastName].filter(Boolean).join(" ") || "Demo Workspace";
  const displayEmail = session.user?.email || "demo@vanicollection.in";
  const displayRole = session.user?.roles?.includes("super_admin")
    ? "Super Admin"
    : session.user?.roles?.includes("admin")
    ? "Administrator"
    : session.user
    ? "Staff"
    : "Demo data";
  const initials = (displayName.match(/\b\w/g) || ["V"]).slice(0, 2).join("").toUpperCase();
  const needsSignIn = session.configured && !session.loading && !session.isStaff;

  const isActive = (item: NavItem) => {
    if (item.href === "/admin") return pathname === "/admin";
    return item.matchPrefix
      ? pathname === item.href || pathname.startsWith(`${item.href}/`)
      : pathname === item.href;
  };

  return (
    <div className="min-h-screen bg-[#faf7f2] text-[#14100f]">
      {/* ============ SIDEBAR ============ */}
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-[248px] flex-col border-r border-white/[0.06] bg-[#14100f] text-[#f5f1ea] lg:flex">
        {/* Brand */}
        <div className="px-5 pt-6 pb-5">
          <Link href="/admin" className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 items-center justify-center">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#dfc28c] via-[#c9a56b] to-[#8a6d3f]" />
              <div className="absolute inset-[1.5px] rounded-[14px] bg-[#14100f]" />
              <span className="relative font-serif text-lg font-bold text-[#dfc28c]">
                V
              </span>
            </div>
            <div className="leading-tight">
              <div className="font-serif text-[16px] font-semibold tracking-tight">
                Vani
              </div>
              <div className="text-[8.5px] font-semibold uppercase tracking-[0.22em] text-[#dfc28c]/60">
                Admin Console
              </div>
            </div>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 pb-4">
          {SECTIONS.map((section, si) => (
            <div key={section.label} className={si > 0 ? "mt-5" : ""}>
              <p className="px-3 pb-2 text-[9.5px] font-semibold uppercase tracking-[0.2em] text-[#f5f1ea]/30">
                {section.label}
              </p>
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const active = isActive(item);
                  const Icon = item.icon;
                  return (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className={[
                          "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all",
                          active
                            ? "bg-[#dfc28c]/[0.08] text-[#dfc28c]"
                            : "text-[#f5f1ea]/55 hover:bg-white/[0.04] hover:text-[#f5f1ea]",
                        ].join(" ")}
                      >
                        <span
                          className={[
                            "absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-r-full bg-[#dfc28c] transition-opacity",
                            active ? "opacity-100" : "opacity-0",
                          ].join(" ")}
                        />
                        <span className={active ? "text-[#dfc28c]" : "text-[#f5f1ea]/45 group-hover:text-[#f5f1ea]"}>
                          <Icon />
                        </span>
                        <span className={`flex-1 text-[13px] tracking-tight ${active ? "font-semibold" : "font-medium"}`}>
                          {item.name}
                        </span>
                        {item.badge && (
                          <span
                            className={[
                              "rounded-full px-1.5 py-px text-[9.5px] font-bold tracking-wide",
                              active
                                ? "bg-[#dfc28c] text-[#14100f]"
                                : "bg-white/[0.06] text-[#f5f1ea]/60",
                            ].join(" ")}
                          >
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Footer - user card */}
        <div className="border-t border-white/[0.06] p-3">
          <div className="flex items-center gap-3 rounded-xl bg-white/[0.03] p-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#881337] to-[#4c0a1f] text-[12px] font-bold text-white">
              {initials}
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-[12px] font-semibold">{displayName}</p>
              <p className="truncate text-[10px] text-[#f5f1ea]/45">{displayRole}</p>
            </div>
            <button
              onClick={() => { void session.signOut().then(() => { if (session.configured) router.push("/admin/login"); }); }}
              aria-label="Sign out"
              className="rounded-lg p-1.5 text-[#f5f1ea]/40 transition hover:bg-white/[0.06] hover:text-[#f5f1ea]"
            >
              <LogoutIcon />
            </button>
          </div>
        </div>
      </aside>

      {/* ============ MAIN ============ */}
      <div className="lg:pl-[248px]">
        {/* Topbar */}
        <header className="sticky top-0 z-30 border-b border-[#ebe6de] bg-[#faf7f2]/85 backdrop-blur-md">
          <div className="flex h-16 items-center gap-4 px-6">
            {/* Search */}
            <div className="flex flex-1 items-center gap-2 rounded-xl border border-[#ebe6de] bg-white px-3 py-2 transition-colors focus-within:border-[#dfc28c] lg:max-w-md">
              <span className="text-stone-400">
                <SearchIcon />
              </span>
              <input
                placeholder="Search orders, products, customers…"
                className="w-full bg-transparent text-[13px] outline-none placeholder:text-stone-400"
              />
              <kbd className="hidden rounded border border-[#ebe6de] px-1.5 py-0.5 text-[9.5px] font-semibold text-stone-400 sm:inline">
                ⌘K
              </kbd>
            </div>

            <div className="ml-auto flex items-center gap-2">
              {/* Notifications */}
              <button className="relative rounded-xl border border-[#ebe6de] bg-white p-2.5 text-stone-600 transition hover:border-[#dfc28c] hover:text-[#881337]">
                <BellIcon />
                <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#881337] ring-2 ring-white" />
              </button>

              {/* Profile dropdown */}
              <div className="relative">
                <button
                  onClick={() => setProfileOpen((v) => !v)}
                  className="flex items-center gap-2 rounded-xl border border-[#ebe6de] bg-white py-1.5 pl-1.5 pr-3 transition hover:border-[#dfc28c]"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#881337] to-[#4c0a1f] text-[11px] font-bold text-white">
                    {initials}
                  </span>
                  <span className="hidden text-[12.5px] font-semibold sm:inline">{displayName.split(" ")[0]}</span>
                  <svg width="10" height="10" viewBox="0 0 24 24" {...sp}>
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </button>

                {profileOpen && (
                  <div className="absolute right-0 mt-2 w-52 overflow-hidden rounded-xl border border-[#ebe6de] bg-white shadow-lg">
                    <div className="border-b border-[#f0ebe3] px-4 py-3">
                      <p className="text-[12.5px] font-semibold">{displayName}</p>
                      <p className="text-[11px] text-stone-500">{displayEmail}</p>
                    </div>
                    <ul className="p-1.5 text-[12.5px]">
                      <li>
                        <Link href="/admin/settings" className="block rounded-lg px-3 py-2 text-stone-600 hover:bg-[#faf7f2]">
                          Account settings
                        </Link>
                      </li>
                      <li>
                        <Link href="/" className="block rounded-lg px-3 py-2 text-stone-600 hover:bg-[#faf7f2]">
                          View storefront
                        </Link>
                      </li>
                      <li className="mt-1 border-t border-[#f0ebe3] pt-1">
                        <button
                          onClick={() => { void session.signOut().then(() => { if (session.configured) router.push("/admin/login"); }); }}
                          className="block w-full rounded-lg px-3 py-2 text-left font-medium text-[#881337] hover:bg-rose-50"
                        >
                          Sign out
                        </button>
                      </li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="p-6">
          {needsSignIn && (
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12.5px] text-amber-900">
              <span>
                <strong className="font-semibold">Live API connected.</strong> Sign in with a staff account to
                load real orders, catalogue and customers.
              </span>
              <Link
                href="/admin/login"
                className="rounded-xl bg-[#881337] px-3.5 py-2 text-[12px] font-semibold text-white transition hover:bg-[#6b0f2b]"
              >
                Sign in
              </Link>
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}