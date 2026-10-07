"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  IconBox,
  IconCard,
  IconGift,
  IconHeart,
  IconPin,
  IconReturn,
  IconStar,
  IconTruck,
  IconUser,
} from "@/lib/account-ui";

interface NavItem {
  name: string;
  href: string;
  icon: () => ReactNode;
  matchPrefix?: boolean;
}

const SECTIONS: { label: string; items: NavItem[] }[] = [
  {
    label: "Overview",
    items: [
      { name: "Dashboard", href: "/account", icon: IconUser },
      { name: "My Orders", href: "/account/orders", icon: IconBox, matchPrefix: true },
      { name: "Track Order", href: "/account/track", icon: IconTruck },
    ],
  },
  {
    label: "Shopping",
    items: [
      { name: "Wishlist", href: "/account/wishlist", icon: IconHeart },
      { name: "Reviews", href: "/account/reviews", icon: IconStar },
      { name: "Returns", href: "/account/returns", icon: IconReturn },
      { name: "Rewards", href: "/account/rewards", icon: IconGift },
    ],
  },
  {
    label: "Settings",
    items: [
      { name: "Profile", href: "/account/profile", icon: IconUser, matchPrefix: true },
      { name: "Addresses", href: "/account/addresses", icon: IconPin },
      { name: "Payments", href: "/account/payments", icon: IconCard },
    ],
  },
];

export default function AccountShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (item: NavItem) =>
    item.href === "/account"
      ? pathname === "/account"
      : item.matchPrefix
      ? pathname === item.href || pathname.startsWith(`${item.href}/`)
      : pathname === item.href;

  return (
    <div className="min-h-screen bg-[#faf7f2] text-[#14100f]">
      {/* -------- Top brand bar -------- */}
      <header className="sticky top-0 z-30 border-b border-[#ebe6de] bg-[#faf7f2]/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1240px] items-center justify-between px-5 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 items-center justify-center">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#dfc28c] via-[#c9a56b] to-[#8a6d3f]" />
              <div className="absolute inset-[1.5px] rounded-[14px] bg-[#faf7f2]" />
              <span className="relative font-serif text-lg font-bold text-[#881337]">
                V
              </span>
            </div>
            <div className="leading-tight">
              <div className="font-serif text-[16px] font-semibold tracking-tight">
                Vani
              </div>
              <div className="text-[8.5px] font-semibold uppercase tracking-[0.22em] text-stone-400">
                My Account
              </div>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="hidden rounded-full border border-stone-300 bg-white px-4 py-2 text-[12px] font-semibold text-stone-700 transition hover:border-stone-400 sm:inline-flex"
            >
              Continue shopping
            </Link>

            <div className="flex items-center gap-2 rounded-full border border-[#ebe6de] bg-white py-1.5 pl-1.5 pr-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-[#881337] to-[#4c0a1f] text-[10.5px] font-bold text-white">
                PS
              </span>
              <span className="hidden text-[12.5px] font-semibold sm:inline">
                Priya Sharma
              </span>
            </div>

            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              className="rounded-xl border border-[#ebe6de] bg-white p-2.5 text-stone-600 lg:hidden"
              aria-label="Toggle menu"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* -------- Body -------- */}
      <div className="mx-auto max-w-[1240px] px-5 py-8 lg:px-8 lg:py-10">
        <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
          {/* Sidebar */}
          <aside
            className={`${
              mobileOpen ? "block" : "hidden"
            } lg:block lg:sticky lg:top-24 lg:self-start`}
          >
            <nav className="rounded-2xl border border-[#ebe6de] bg-white p-3">
              {SECTIONS.map((section, si) => (
                <div key={section.label} className={si > 0 ? "mt-4" : ""}>
                  <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-400">
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
                            onClick={() => setMobileOpen(false)}
                            className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all ${
                              active
                                ? "bg-[#881337]/[0.06] text-[#881337]"
                                : "text-stone-600 hover:bg-stone-100/70 hover:text-stone-900"
                            }`}
                          >
                            <span
                              aria-hidden
                              className={`absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-full bg-[#881337] transition-opacity ${
                                active ? "opacity-100" : "opacity-0"
                              }`}
                            />
                            <span
                              className={
                                active
                                  ? "text-[#881337]"
                                  : "text-stone-400 group-hover:text-stone-700"
                              }
                            >
                              <Icon />
                            </span>
                            <span
                              className={`text-[13px] tracking-tight ${
                                active ? "font-semibold" : "font-medium"
                              }`}
                            >
                              {item.name}
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}

              <div className="mt-4 border-t border-[#f0ebe3] pt-3">
                <Link
                  href="/login"
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium text-stone-600 transition hover:bg-stone-100/70 hover:text-rose-600"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <path d="m16 17 5-5-5-5M21 12H9" />
                  </svg>
                  Sign out
                </Link>
              </div>
            </nav>
          </aside>

          {/* Content */}
          <main className="min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
}