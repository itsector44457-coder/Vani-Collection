"use client";

import Link from "next/link";
import { Badge, ButtonGhost, Card, PageHeader, IconBox, IconGift, IconHeart, IconTruck } from "@/lib/account-ui";

const RECENT_ORDER = {
  id: "VC-4821",
  date: "12 Oct 2024",
  total: 4299,
  status: "Shipped",
  items: 2,
  eta: "16 Oct",
};

const STATS = [
  { label: "Total orders", value: "14", icon: IconBox, href: "/account/orders" },
  { label: "Wishlist items", value: "8", icon: IconHeart, href: "/account/wishlist" },
  { label: "Reward points", value: "1,240", icon: IconGift, href: "/account/rewards" },
  { label: "Active returns", value: "1", icon: IconTruck, href: "/account/returns" },
];

export default function AccountDashboard() {
  return (
    <>
      <PageHeader
        eyebrow="Welcome back"
        title="Namaste, Priya 🌸"
        subtitle="Here's a quick look at your Vani Collection account."
      />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {STATS.map((s) => {
          const Icon = s.icon;
          return (
            <Link
              key={s.label}
              href={s.href}
              className="group rounded-2xl border border-[#ebe6de] bg-white p-4 transition-all hover:border-[#dfc28c]/60 hover:shadow-[0_8px_24px_-12px_rgba(20,16,15,0.12)]"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#faf7f2] text-[#881337] ring-1 ring-[#ebe6de]">
                <Icon />
              </div>
              <p className="mt-4 font-serif text-[22px] font-semibold leading-none">
                {s.value}
              </p>
              <p className="mt-1.5 text-[11.5px] font-medium text-stone-500">
                {s.label}
              </p>
            </Link>
          );
        })}
      </div>

      {/* Recent order */}
      <div className="mt-8 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Card
          title="Recent order"
          description={`#${RECENT_ORDER.id} · placed on ${RECENT_ORDER.date}`}
          action={
            <Link
              href={`/account/orders/${RECENT_ORDER.id}`}
              className="text-[12px] font-semibold text-[#881337] hover:underline"
            >
              View details →
            </Link>
          }
        >
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#faf7f2] to-[#f0ebe3] text-[20px] font-bold text-[#881337] ring-1 ring-[#ebe6de]">
              G
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13.5px] font-semibold text-stone-900">
                Gulab Bagh Handblock Mul Cotton Saree
              </p>
              <p className="mt-0.5 text-[11.5px] text-stone-500">
                Qty 1 · {RECENT_ORDER.items} items · ₹{RECENT_ORDER.total}
              </p>
            </div>
            <Badge tone="info" dot>
              {RECENT_ORDER.status}
            </Badge>
          </div>

          {/* Simple progress */}
          <div className="mt-5">
            <div className="flex items-center justify-between text-[11px] font-medium text-stone-500">
              <span>Ordered</span>
              <span>Packed</span>
              <span className="text-[#881337]">Shipped</span>
              <span>Delivered</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-stone-100">
              <div className="h-full w-3/4 rounded-full bg-[#881337]" />
            </div>
            <p className="mt-2 text-[11.5px] text-stone-500">
              Estimated delivery by <span className="font-semibold text-stone-800">{RECENT_ORDER.eta}</span>
            </p>
          </div>
        </Card>

        <Card title="Rewards summary">
          <div className="rounded-xl bg-gradient-to-br from-[#881337] to-[#4c0a1f] p-5 text-white">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-[#dfc28c]">
              Silver tier
            </p>
            <p className="mt-2 font-serif text-[30px] font-semibold leading-none">
              1,240 <span className="text-[14px] text-white/60">pts</span>
            </p>
            <p className="mt-2 text-[11.5px] text-white/70">
              260 points to Gold tier
            </p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/15">
              <div className="h-full w-[83%] rounded-full bg-[#dfc28c]" />
            </div>
          </div>
          <Link
            href="/account/rewards"
            className="mt-4 block text-center text-[12px] font-semibold text-[#881337] hover:underline"
          >
            View all rewards →
          </Link>
        </Card>
      </div>

      {/* Quick actions */}
      <div className="mt-8">
        <Card title="Quick actions">
          <div className="grid gap-3 sm:grid-cols-3">
            <Link
              href="/account/track"
              className="flex items-center justify-between rounded-xl border border-[#f0ebe3] bg-[#faf7f2]/60 p-4 transition hover:border-[#dfc28c]/60"
            >
              <div>
                <p className="text-[13px] font-semibold">Track an order</p>
                <p className="mt-0.5 text-[11.5px] text-stone-500">
                  Live delivery status
                </p>
              </div>
              <span className="text-[#881337]">→</span>
            </Link>
            <Link
              href="/account/returns"
              className="flex items-center justify-between rounded-xl border border-[#f0ebe3] bg-[#faf7f2]/60 p-4 transition hover:border-[#dfc28c]/60"
            >
              <div>
                <p className="text-[13px] font-semibold">Start a return</p>
                <p className="mt-0.5 text-[11.5px] text-stone-500">
                  7-day easy returns
                </p>
              </div>
              <span className="text-[#881337]">→</span>
            </Link>
            <Link
              href="/account/addresses"
              className="flex items-center justify-between rounded-xl border border-[#f0ebe3] bg-[#faf7f2]/60 p-4 transition hover:border-[#dfc28c]/60"
            >
              <div>
                <p className="text-[13px] font-semibold">Manage addresses</p>
                <p className="mt-0.5 text-[11.5px] text-stone-500">
                  Add or edit shipping
                </p>
              </div>
              <span className="text-[#881337]">→</span>
            </Link>
          </div>
        </Card>
      </div>
    </>
  );
}