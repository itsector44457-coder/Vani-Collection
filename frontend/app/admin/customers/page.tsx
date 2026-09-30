"use client";

import { Badge, Card, StatCard } from "@/lib/admin-ui";

/* 🔌 API: GET /api/admin/customers */
const CUSTOMERS = [
  { name: "Priya Sharma", email: "priya@example.com", orders: 14, spent: 28400, tier: "VIP", joined: "Mar 2024" },
  { name: "Meera Iyer", email: "meera@example.com", orders: 8, spent: 15600, tier: "Regular", joined: "Jun 2024" },
  { name: "Ananya Bose", email: "ananya@example.com", orders: 22, spent: 51200, tier: "VIP", joined: "Jan 2024" },
  { name: "Riya Kapoor", email: "riya@example.com", orders: 3, spent: 4200, tier: "New", joined: "Sep 2024" },
  { name: "Sneha Reddy", email: "sneha@example.com", orders: 11, spent: 18700, tier: "Regular", joined: "Feb 2024" },
  { name: "Kavya Nair", email: "kavya@example.com", orders: 6, spent: 22900, tier: "Regular", joined: "Aug 2024" },
];

const tierTone = (t: string) =>
  t === "VIP" ? "gold" : t === "New" ? "info" : "neutral";

export default function CustomersPage() {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-400">
            Audience
          </p>
          <h1 className="mt-1 font-serif text-[26px] font-semibold tracking-tight">Customers</h1>
          <p className="mt-1 text-[13px] text-stone-500">
            3,912 registered · 146 added this month
          </p>
        </div>
        <button className="rounded-xl bg-[#881337] px-4 py-2 text-[12.5px] font-semibold text-white transition hover:bg-[#6b0f2b]">
          Send broadcast
        </button>
      </div>

      {/* Segments */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="VIP customers"
          value="128"
          delta="12%"
          positive
          hint="Spent > ₹25,000 lifetime"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3l2.4 4.86 5.36.78-3.88 3.78.92 5.34L12 15.24 7.2 17.76l.92-5.34L4.24 8.64l5.36-.78z" />
            </svg>
          }
        />
        <StatCard
          label="Repeat rate"
          value="42.8%"
          delta="3.1%"
          positive
          hint="Returned within 90 days"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 0 1 15.5-6.2M21 12a9 9 0 0 1-15.5 6.2" />
              <path d="M21 4v6h-6M3 20v-6h6" />
            </svg>
          }
        />
        <StatCard
          label="Avg. order value"
          value="₹3,180"
          delta="5.4%"
          positive
          hint="Across all paid orders"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          }
        />
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#f0ebe3] text-[10.5px] font-semibold uppercase tracking-[0.12em] text-stone-400">
                <th className="pb-3 pr-4">Customer</th>
                <th className="pb-3 pr-4">Tier</th>
                <th className="pb-3 pr-4">Orders</th>
                <th className="pb-3 pr-4">Lifetime value</th>
                <th className="pb-3 pr-4">Joined</th>
                <th className="pb-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0ebe3]">
              {CUSTOMERS.map((c) => (
                <tr key={c.email} className="group transition hover:bg-[#faf7f2]/60">
                  <td className="py-3.5 pr-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#881337] to-[#4c0a1f] text-[12px] font-bold text-white">
                        {c.name.split(" ").map((n) => n[0]).join("")}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold">{c.name}</p>
                        <p className="truncate text-[11px] text-stone-500">{c.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 pr-4">
                    <Badge tone={tierTone(c.tier) as any}>{c.tier}</Badge>
                  </td>
                  <td className="py-3.5 pr-4 text-[12.5px] font-medium text-stone-700">{c.orders}</td>
                  <td className="py-3.5 pr-4 text-[13px] font-semibold">
                    ₹{c.spent.toLocaleString("en-IN")}
                  </td>
                  <td className="py-3.5 pr-4 text-[12.5px] text-stone-500">{c.joined}</td>
                  <td className="py-3.5 text-right">
                    <button className="rounded-lg px-2.5 py-1.5 text-[11.5px] font-medium text-[#881337] opacity-0 transition group-hover:opacity-100 hover:bg-rose-50">
                      View profile →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}