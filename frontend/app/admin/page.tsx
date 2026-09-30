"use client";

import Link from "next/link";
import {
  AreaChart,
  BarChart,
  Badge,
  Card,
  Donut,
  StatCard,
} from "@/lib/admin-ui";

/* 🔌 API: replace with fetch("/api/admin/dashboard") */
const KPIS = {
  revenue: { value: "₹12,48,920", delta: "18.2%", positive: true },
  orders: { value: "1,284", delta: "9.4%", positive: true },
  customers: { value: "3,912", delta: "4.1%", positive: true },
  conversion: { value: "3.42%", delta: "0.8%", positive: false },
};

const REVENUE = [32, 41, 38, 52, 48, 61, 55, 72, 68, 84, 79, 96];
const MONTHS = ["J","F","M","A","M","J","J","A","S","O","N","D"];

const CATEGORIES = [
  { label: "Sarees", value: 42, color: "#881337" },
  { label: "Lehengas", value: 28, color: "#dfc28c" },
  { label: "Anarkalis", value: 18, color: "#6b5d4a" },
  { label: "Kurta Sets", value: 12, color: "#c9b8a0" },
];

const TOP_PRODUCTS = [
  { name: "Gulab Bagh Handblock Mul Cotton", sku: "VC-1042", sales: 218, price: 2499, stock: 42 },
  { name: "Rani Bagru Silk Saree", sku: "VC-1038", sales: 184, price: 4299, stock: 18 },
  { name: "Ivory Chikankari Anarkali", sku: "VC-1015", sales: 156, price: 3799, stock: 6 },
  { name: "Indigo Dabu Cotton Kurta Set", sku: "VC-1002", sales: 141, price: 1899, stock: 63 },
];

const RECENT_ORDERS = [
  { id: "#VC-4821", customer: "Priya Sharma", total: 4299, status: "Paid", date: "2 min ago" },
  { id: "#VC-4820", customer: "Meera Iyer", total: 2499, status: "Shipped", date: "18 min ago" },
  { id: "#VC-4819", customer: "Ananya Bose", total: 6798, status: "Pending", date: "1 h ago" },
  { id: "#VC-4818", customer: "Riya Kapoor", total: 1899, status: "Paid", date: "2 h ago" },
  { id: "#VC-4817", customer: "Sneha Reddy", total: 3799, status: "Refunded", date: "4 h ago" },
];

const statusTone = (s: string) =>
  s === "Paid" ? "success" : s === "Shipped" ? "info" : s === "Pending" ? "warning" : "danger";

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-400">
            Overview
          </p>
          <h1 className="mt-1 font-serif text-[28px] font-semibold tracking-tight">
            Good evening, Arjun
          </h1>
          <p className="mt-1 text-[13px] text-stone-500">
            Here's what's happening across Vani Collection today.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select className="rounded-xl border border-[#ebe6de] bg-white px-3 py-2 text-[12.5px] font-medium outline-none focus:border-[#dfc28c]">
            <option>Last 30 days</option>
            <option>Last 7 days</option>
            <option>Last 90 days</option>
            <option>This year</option>
          </select>
          <button className="rounded-xl bg-[#881337] px-4 py-2 text-[12.5px] font-semibold text-white transition hover:bg-[#6b0f2b]">
            Export report
          </button>
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Revenue"
          value={KPIS.revenue.value}
          delta={KPIS.revenue.delta}
          positive={KPIS.revenue.positive}
          hint="vs. previous 30 days"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          }
        />
        <StatCard
          label="Orders"
          value={KPIS.orders.value}
          delta={KPIS.orders.delta}
          positive={KPIS.orders.positive}
          hint="18 awaiting fulfilment"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="20" r="1.2" /><circle cx="18" cy="20" r="1.2" />
              <path d="M2 3h3l2.4 12.3a2 2 0 0 0 2 1.7h8.9a2 2 0 0 0 2-1.6L22 7H6" />
            </svg>
          }
        />
        <StatCard
          label="Customers"
          value={KPIS.customers.value}
          delta={KPIS.customers.delta}
          positive={KPIS.customers.positive}
          hint="+146 new this month"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8.5" r="3.5" /><path d="M4.5 21c1-3.5 4-5.5 7.5-5.5s6.5 2 7.5 5.5" />
            </svg>
          }
        />
        <StatCard
          label="Conversion"
          value={KPIS.conversion.value}
          delta={KPIS.conversion.delta}
          positive={KPIS.conversion.positive}
          hint="Checkout → purchase"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 17l6-6 4 4 8-8" /><path d="M14 7h7v7" />
            </svg>
          }
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card
          className="lg:col-span-2"
          title="Revenue trend"
          action={
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-[11.5px] text-stone-500">
                <span className="h-2 w-2 rounded-full bg-[#881337]" />
                This year
              </div>
              <div className="flex items-center gap-1.5 text-[11.5px] text-stone-500">
                <span className="h-2 w-2 rounded-full bg-[#dfc28c]" />
                Last year
              </div>
            </div>
          }
        >
          <AreaChart data={REVENUE} height={240} />
          <div className="mt-3 flex justify-between text-[10.5px] font-medium text-stone-400">
            {MONTHS.map((m, i) => (
              <span key={i}>{m}</span>
            ))}
          </div>
        </Card>

        <Card title="Sales by category">
          <Donut segments={CATEGORIES} />
        </Card>
      </div>

      {/* Tables row */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card
          title="Top performing products"
          action={
            <Link href="/admin/products" className="text-[12px] font-semibold text-[#881337] hover:underline">
              View all →
            </Link>
          }
        >
          <ul className="divide-y divide-[#f0ebe3]">
            {TOP_PRODUCTS.map((p) => (
              <li key={p.sku} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#faf7f2] to-[#f0ebe3] text-[13px] font-bold text-[#881337] ring-1 ring-[#ebe6de]">
                  {p.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold">{p.name}</p>
                  <p className="mt-0.5 text-[11px] text-stone-500">
                    {p.sku} · {p.sales} sold
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[13px] font-semibold">₹{p.price.toLocaleString("en-IN")}</p>
                  <p className={`text-[11px] ${p.stock < 10 ? "text-rose-600 font-semibold" : "text-stone-500"}`}>
                    {p.stock < 10 ? `Low · ${p.stock}` : `${p.stock} in stock`}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card
          title="Recent orders"
          action={
            <Link href="/admin/orders" className="text-[12px] font-semibold text-[#881337] hover:underline">
              View all →
            </Link>
          }
        >
          <ul className="divide-y divide-[#f0ebe3]">
            {RECENT_ORDERS.map((o) => (
              <li key={o.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#faf7f2] text-[12px] font-bold text-stone-600 ring-1 ring-[#ebe6de]">
                  {o.customer.split(" ").map((n) => n[0]).join("")}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold">{o.customer}</p>
                  <p className="mt-0.5 text-[11px] text-stone-500">
                    {o.id} · {o.date}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[13px] font-semibold">₹{o.total.toLocaleString("en-IN")}</p>
                  <Badge tone={statusTone(o.status) as any} dot>{o.status}</Badge>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* Traffic */}
      <Card title="Weekly visitors" action={<span className="text-[11.5px] text-stone-500">Last 7 days</span>}>
        <BarChart
          data={[420, 680, 512, 890, 745, 1020, 968]}
          labels={["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]}
          height={180}
        />
      </Card>
    </div>
  );
}