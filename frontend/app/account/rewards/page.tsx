"use client";

import { Badge, ButtonPrimary, Card, IconGift, PageHeader } from "@/lib/account-ui";

const REWARDS = [
  { id: 1, title: "₹500 off on next order", points: 500, code: "VANI500", expires: "31 Dec 2024", unlocked: true },
  { id: 2, title: "Free express shipping", points: 300, code: "FASTSHIP", expires: "31 Dec 2024", unlocked: true },
  { id: 3, title: "₹1000 off — Gold tier only", points: 1500, code: "GOLD1K", expires: "31 Mar 2025", unlocked: false },
  { id: 4, title: "Early access to Festive '25", points: 800, code: "EARLYFEST", expires: "15 Jan 2025", unlocked: true },
];

const HISTORY = [
  { date: "12 Oct 2024", action: "Order #VC-4821", points: +43 },
  { date: "28 Sep 2024", action: "Order #VC-4790", points: +25 },
  { date: "10 Sep 2024", action: "Referral bonus", points: +200 },
  { date: "05 Sep 2024", action: "Order #VC-4712", points: +68 },
  { date: "21 Aug 2024", action: "Redeemed: ₹500 off", points: -500 },
];

export default function RewardsPage() {
  const points = 1240;
  const nextTierAt = 1500;
  const progress = (points / nextTierAt) * 100;

  return (
    <>
      <PageHeader
        eyebrow="Loyalty"
        title="Rewards & Points"
        subtitle="Earn points on every purchase and unlock exclusive perks."
      />

      {/* Hero card */}
      <div className="mb-5 overflow-hidden rounded-2xl bg-gradient-to-br from-[#881337] via-[#6b0f2b] to-[#4c0a1f] p-6 text-white sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.2em] text-[#dfc28c]">
              Silver tier · Member since Mar 2024
            </p>
            <p className="mt-3 font-serif text-[42px] font-semibold leading-none">
              {points.toLocaleString("en-IN")}{" "}
              <span className="text-[16px] font-normal text-white/60">
                points
              </span>
            </p>
            <p className="mt-2 text-[12.5px] text-white/70">
              ₹{Math.round(points / 10)} value · Earn 1 point per ₹1 spent
            </p>
          </div>
          <div className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#dfc28c]/15 text-[#dfc28c] ring-1 ring-[#dfc28c]/30 sm:flex">
            <IconGift />
          </div>
        </div>

        {/* Progress */}
        <div className="mt-6">
          <div className="flex justify-between text-[11.5px] font-medium text-white/70">
            <span>Silver</span>
            <span>
              {nextTierAt - points} pts to{" "}
              <span className="text-[#dfc28c]">Gold</span>
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/15">
            <div
              className="h-full rounded-full bg-[#dfc28c] transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Available rewards */}
      <Card title="Available rewards" className="mb-5">
        <ul className="divide-y divide-[#f0ebe3]">
          {REWARDS.map((r) => (
            <li
              key={r.id}
              className="flex flex-wrap items-center gap-4 py-4 first:pt-0 last:pb-0"
            >
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ring-1 ${
                  r.unlocked
                    ? "bg-[#dfc28c]/15 text-[#881337] ring-[#dfc28c]/40"
                    : "bg-stone-100 text-stone-400 ring-stone-200"
                }`}
              >
                <IconGift />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-[13.5px] font-semibold">{r.title}</p>
                  {!r.unlocked && <Badge tone="neutral">Locked</Badge>}
                </div>
                <p className="mt-0.5 text-[11.5px] text-stone-500">
                  {r.points} points · Expires {r.expires}
                </p>
              </div>
              <ButtonPrimary disabled={!r.unlocked} className="text-[11.5px]">
                {r.unlocked ? "Redeem" : "Locked"}
              </ButtonPrimary>
            </li>
          ))}
        </ul>
      </Card>

      {/* History */}
      <Card title="Points history">
        <ul className="divide-y divide-[#f0ebe3]">
          {HISTORY.map((h, i) => (
            <li key={i} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
              <div>
                <p className="text-[13px] font-medium text-stone-800">{h.action}</p>
                <p className="mt-0.5 text-[11.5px] text-stone-500">{h.date}</p>
              </div>
              <p
                className={`text-[13px] font-semibold ${
                  h.points > 0 ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                {h.points > 0 ? "+" : ""}
                {h.points}
              </p>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}