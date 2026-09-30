"use client";

import { useMemo, useState } from "react";
import { Badge, Card } from "@/lib/admin-ui";

/* 🔌 API: GET /api/admin/orders */
const ORDERS = [
  { id: "#VC-4821", customer: "Priya Sharma", items: 2, total: 4299, status: "Paid", payment: "UPI", date: "2 min ago" },
  { id: "#VC-4820", customer: "Meera Iyer", items: 1, total: 2499, status: "Shipped", payment: "Card", date: "18 min ago" },
  { id: "#VC-4819", customer: "Ananya Bose", items: 3, total: 6798, status: "Pending", payment: "COD", date: "1 h ago" },
  { id: "#VC-4818", customer: "Riya Kapoor", items: 1, total: 1899, status: "Paid", payment: "UPI", date: "2 h ago" },
  { id: "#VC-4817", customer: "Sneha Reddy", items: 2, total: 3799, status: "Refunded", payment: "Card", date: "4 h ago" },
  { id: "#VC-4816", customer: "Kavya Nair", items: 1, total: 12999, status: "Shipped", payment: "Net Banking", date: "6 h ago" },
  { id: "#VC-4815", customer: "Divya Menon", items: 4, total: 5696, status: "Delivered", payment: "UPI", date: "1 d ago" },
  { id: "#VC-4814", customer: "Ishita Roy", items: 1, total: 2199, status: "Delivered", payment: "Card", date: "1 d ago" },
];

const TABS = ["All", "Pending", "Paid", "Shipped", "Delivered", "Refunded"] as const;

const tone = (s: string) =>
  s === "Paid" || s === "Delivered"
    ? "success"
    : s === "Shipped"
    ? "info"
    : s === "Pending"
    ? "warning"
    : "danger";

export default function OrdersPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("All");

  const filtered = useMemo(
    () => (tab === "All" ? ORDERS : ORDERS.filter((o) => o.status === tab)),
    [tab]
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = { All: ORDERS.length };
    TABS.slice(1).forEach((t) => (c[t] = ORDERS.filter((o) => o.status === t).length));
    return c;
  }, []);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-400">
            Commerce
          </p>
          <h1 className="mt-1 font-serif text-[26px] font-semibold tracking-tight">Orders</h1>
          <p className="mt-1 text-[13px] text-stone-500">
            Track, fulfil, and manage every customer purchase.
          </p>
        </div>
        <button className="rounded-xl border border-[#ebe6de] bg-white px-4 py-2 text-[12.5px] font-semibold text-stone-700 transition hover:border-[#dfc28c]">
          Export CSV
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[12.5px] font-medium transition ${
              tab === t
                ? "bg-[#14100f] text-white"
                : "bg-white text-stone-600 ring-1 ring-[#ebe6de] hover:bg-[#faf7f2]"
            }`}
          >
            {t}
            <span
              className={`rounded-full px-1.5 py-px text-[10px] font-bold ${
                tab === t ? "bg-white/15 text-white" : "bg-[#faf7f2] text-stone-500"
              }`}
            >
              {counts[t]}
            </span>
          </button>
        ))}
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#f0ebe3] text-[10.5px] font-semibold uppercase tracking-[0.12em] text-stone-400">
                <th className="pb-3 pr-4">Order</th>
                <th className="pb-3 pr-4">Customer</th>
                <th className="pb-3 pr-4">Items</th>
                <th className="pb-3 pr-4">Payment</th>
                <th className="pb-3 pr-4">Total</th>
                <th className="pb-3 pr-4">Status</th>
                <th className="pb-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0ebe3]">
              {filtered.map((o) => (
                <tr key={o.id} className="group transition hover:bg-[#faf7f2]/60">
                  <td className="py-3.5 pr-4">
                    <p className="text-[13px] font-semibold">{o.id}</p>
                    <p className="text-[11px] text-stone-500">{o.date}</p>
                  </td>
                  <td className="py-3.5 pr-4">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#faf7f2] text-[10.5px] font-bold text-stone-600 ring-1 ring-[#ebe6de]">
                        {o.customer.split(" ").map((n) => n[0]).join("")}
                      </div>
                      <span className="text-[13px] font-medium">{o.customer}</span>
                    </div>
                  </td>
                  <td className="py-3.5 pr-4 text-[12.5px] text-stone-600">{o.items}</td>
                  <td className="py-3.5 pr-4 text-[12.5px] text-stone-600">{o.payment}</td>
                  <td className="py-3.5 pr-4 text-[13px] font-semibold">
                    ₹{o.total.toLocaleString("en-IN")}
                  </td>
                  <td className="py-3.5 pr-4">
                    <Badge tone={tone(o.status) as any} dot>{o.status}</Badge>
                  </td>
                  <td className="py-3.5 text-right">
                    <button className="rounded-lg px-2.5 py-1.5 text-[11.5px] font-medium text-[#881337] opacity-0 transition group-hover:opacity-100 hover:bg-rose-50">
                      View →
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