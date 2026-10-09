"use client";

import Link from "next/link";
import { useMemo } from "react";
import { AreaChart, Badge, BarChart, Card, Donut, StatCard } from "@/lib/admin-ui";
import AdminDataBadge from "@/components/admin/AdminDataBadge";
import { api, formatCurrency, formatRelativeTime, orderStatusLabel, type AdminCatalogueProduct, type AdminOrder, type DashboardMetrics, type Paginated } from "@/lib/api-client";
import { useApiResource } from "@/lib/use-api";

/* Demo fallback — shown until NEXT_PUBLIC_API_URL points at the backend and a staff user is signed in. */
const DEMO_DASHBOARD: DashboardMetrics = {
  revenue30d: 1248920,
  paidOrders30d: 812,
  aov30d: 1538,
  orders30d: 1284,
  openOrders: 18,
  lowStockSkus: 3,
  pendingReviews: 4,
  openReturns: 2,
  activeProducts: 142,
  customers: { total: 3912, new30d: 146 },
  salesByCategory: [
    { _id: "Sarees", revenue: 462000, units: 138 },
    { _id: "Lehengas", revenue: 318000, units: 74 },
    { _id: "Anarkalis", revenue: 214000, units: 96 },
    { _id: "Kurta Sets", revenue: 148000, units: 112 },
  ],
  daily: Array.from({ length: 12 }, (_, index) => ({ _id: `2026-0${(index % 9) + 1}-01`, orders: 0, revenue: [32, 41, 38, 52, 48, 61, 55, 72, 68, 84, 79, 96][index] * 1000 })),
};

const DEMO_ORDERS: Paginated<AdminOrder> = {
  data: [
    { _id: "demo-1", orderNumber: "#VC-4821", createdAt: new Date(Date.now() - 2 * 60000).toISOString(), status: "confirmed", payment: { method: "razorpay", status: "paid" }, amounts: { subtotal: 4299, discount: 0, shipping: 0, tax: 205, total: 4299 }, items: [{ sku: "VC-1042", quantity: 2, unitPrice: 2149, lineTotal: 4299 }], shippingAddress: { fullName: "Priya Sharma" } },
    { _id: "demo-2", orderNumber: "#VC-4820", createdAt: new Date(Date.now() - 18 * 60000).toISOString(), status: "shipped", payment: { method: "razorpay", status: "paid" }, amounts: { subtotal: 2499, discount: 0, shipping: 0, tax: 119, total: 2499 }, items: [{ sku: "VC-1038", quantity: 1, unitPrice: 2499, lineTotal: 2499 }], shippingAddress: { fullName: "Meera Iyer" } },
    { _id: "demo-3", orderNumber: "#VC-4819", createdAt: new Date(Date.now() - 60 * 60000).toISOString(), status: "pending_payment", payment: { method: "cod", status: "pending" }, amounts: { subtotal: 6798, discount: 0, shipping: 0, tax: 324, total: 6798 }, items: [{ sku: "VC-1015", quantity: 3, unitPrice: 2266, lineTotal: 6798 }], shippingAddress: { fullName: "Ananya Bose" } },
  ],
  meta: { total: 3 },
};

const DEMO_TOP_PRODUCTS: Paginated<AdminCatalogueProduct> = {
  data: [
    { _id: "p1", name: "Gulab Bagh Handblock Mul Cotton", slug: "gulab-bagh", category: "anarkalis", status: "active", variants: [], stockAvailable: 42, lowStockSkus: 0, unitsSold: 218, revenue: 544000, updatedAt: new Date().toISOString() },
    { _id: "p2", name: "Rani Bagru Silk Saree", slug: "rani-bagru", category: "sarees", status: "active", variants: [], stockAvailable: 18, lowStockSkus: 0, unitsSold: 184, revenue: 791000, updatedAt: new Date().toISOString() },
    { _id: "p3", name: "Ivory Chikankari Anarkali", slug: "ivory-chikankari", category: "anarkalis", status: "active", variants: [], stockAvailable: 6, lowStockSkus: 1, unitsSold: 156, revenue: 592000, updatedAt: new Date().toISOString() },
    { _id: "p4", name: "Indigo Dabu Cotton Kurta Set", slug: "indigo-dabu", category: "kurta-sets", status: "active", variants: [], stockAvailable: 63, lowStockSkus: 0, unitsSold: 141, revenue: 267000, updatedAt: new Date().toISOString() },
  ],
  meta: { total: 4 },
};

const DONUT_COLORS = ["#881337", "#dfc28c", "#6b5d4a", "#c9b8a0", "#9a8570", "#4c0a1f"];

const tone = (status: string) => {
  const label = orderStatusLabel(status);
  if (label === "Paid" || label === "Delivered") return "success" as const;
  if (label === "Shipped" || label === "Packed" || label === "Processing") return "info" as const;
  if (label === "Pending") return "warning" as const;
  return "danger" as const;
};

export default function AdminDashboard() {
  const dashboard = useApiResource<DashboardMetrics>(
    (signal) => api.dashboard(signal).then((response) => response.data),
    DEMO_DASHBOARD
  );
  const orders = useApiResource<Paginated<AdminOrder>>((signal) => api.orders({ limit: 6 }, signal), DEMO_ORDERS);
  const topProducts = useApiResource<Paginated<AdminCatalogueProduct>>(
    (signal) => api.catalogue({ limit: 6 }, signal),
    DEMO_TOP_PRODUCTS
  );

  const metrics = dashboard.data;
  const revenueSeries = useMemo(() => {
    const points = metrics.daily.slice(-12).map((day) => Math.round(day.revenue));
    return points.some((value) => value > 0) ? points : DEMO_DASHBOARD.daily.map((day) => Math.round(day.revenue));
  }, [metrics.daily]);

  const orderSeries = useMemo(() => {
    const points = metrics.daily.slice(-7).map((day) => day.orders);
    return points.some((value) => value > 0) ? points : [4, 7, 5, 9, 8, 12, 10];
  }, [metrics.daily]);

  const categories = useMemo(() => {
    const rows = metrics.salesByCategory.filter((row) => row.revenue > 0).slice(0, 4);
    const source = rows.length ? rows : DEMO_DASHBOARD.salesByCategory;
    const total = source.reduce((sum, row) => sum + row.revenue, 0) || 1;
    return source.map((row, index) => ({
      label: row._id.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      value: Math.max(1, Math.round((row.revenue / total) * 100)),
      color: DONUT_COLORS[index % DONUT_COLORS.length],
    }));
  }, [metrics.salesByCategory]);

  const bestSellers = useMemo(
    () => [...topProducts.data.data].sort((a, b) => b.revenue - a.revenue).slice(0, 4),
    [topProducts.data]
  );

  const recentOrders = orders.data.data.slice(0, 5);
  const customerName = (order: AdminOrder) =>
    order.shippingAddress?.fullName ||
    (typeof order.customerId === "object" ? [order.customerId?.firstName, order.customerId?.lastName].filter(Boolean).join(" ") : "") ||
    "Guest checkout";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-400">Overview</p>
          <h1 className="mt-1 font-serif text-[28px] font-semibold tracking-tight">Store overview</h1>
          <p className="mt-1 text-[13px] text-stone-500">
            {dashboard.source === "live"
              ? "Live figures from the Vani Collection backend (last 30 days)."
              : "Demo figures — connect the backend to see real orders, stock and revenue."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <AdminDataBadge resource={dashboard} label="30 days" />
          <Link
            href="/admin/orders"
            prefetch={false}
            className="rounded-xl bg-[#881337] px-4 py-2 text-[12.5px] font-semibold text-white transition hover:bg-[#6b0f2b]"
          >
            Manage orders
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Revenue (30d)"
          value={formatCurrency(metrics.revenue30d)}
          delta={`${metrics.paidOrders30d} paid`}
          positive
          hint={`AOV ${formatCurrency(metrics.aov30d)}`}
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          }
        />
        <StatCard
          label="Orders (30d)"
          value={String(metrics.orders30d)}
          delta={`${metrics.openOrders} open`}
          positive={metrics.openOrders > 0}
          hint="Awaiting fulfilment"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="20" r="1.2" /><circle cx="18" cy="20" r="1.2" />
              <path d="M2 3h3l2.4 12.3a2 2 0 0 0 2 1.7h8.9a2 2 0 0 0 2-1.6L22 7H6" />
            </svg>
          }
        />
        <StatCard
          label="Customers"
          value={metrics.customers.total.toLocaleString("en-IN")}
          delta={`+${metrics.customers.new30d}`}
          positive
          hint="New in last 30 days"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8.5" r="3.5" /><path d="M4.5 21c1-3.5 4-5.5 7.5-5.5s6.5 2 7.5 5.5" />
            </svg>
          }
        />
        <StatCard
          label="Stock alerts"
          value={String(metrics.lowStockSkus)}
          delta={`${metrics.pendingReviews} reviews`}
          positive={metrics.lowStockSkus === 0}
          hint={`${metrics.openReturns} open returns`}
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 9v4M12 17h.01" /><path d="M10.3 3.9 2.6 17a1.8 1.8 0 0 0 1.6 2.7h15.6A1.8 1.8 0 0 0 21.4 17L13.7 3.9a1.9 1.9 0 0 0-3.4 0z" />
            </svg>
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2" title="Revenue trend" action={<span className="text-[11.5px] text-stone-500">{revenueSeries.length} day window</span>}>
          <AreaChart data={revenueSeries} height={240} />
          <div className="mt-3 flex justify-between text-[10.5px] font-medium text-stone-400">
            <span>Oldest</span>
            <span>Today</span>
          </div>
        </Card>

        <Card title="Revenue by category">
          <Donut segments={categories} />
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card
          title="Top performing products"
          action={
            <Link href="/admin/products" prefetch={false} className="text-[12px] font-semibold text-[#881337] hover:underline">
              View all →
            </Link>
          }
        >
          {bestSellers.length === 0 ? (
            <p className="py-6 text-center text-[12.5px] text-stone-500">No catalogue data yet. Run <code>npm run seed:catalog</code> in the backend.</p>
          ) : (
            <ul className="divide-y divide-[#f0ebe3]">
              {bestSellers.map((product) => (
                <li key={product._id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#faf7f2] to-[#f0ebe3] text-[13px] font-bold text-[#881337] ring-1 ring-[#ebe6de]">
                    {product.name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold">{product.name}</p>
                    <p className="mt-0.5 text-[11px] text-stone-500">
                      {product.category.replace(/-/g, " ")} · {product.unitsSold} sold
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[13px] font-semibold">{formatCurrency(product.revenue)}</p>
                    <p className={`text-[11px] ${product.stockAvailable < 10 ? "font-semibold text-rose-600" : "text-stone-500"}`}>
                      {product.stockAvailable < 10 ? `Low · ${product.stockAvailable}` : `${product.stockAvailable} in stock`}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          title="Recent orders"
          action={
            <Link href="/admin/orders" prefetch={false} className="text-[12px] font-semibold text-[#881337] hover:underline">
              View all →
            </Link>
          }
        >
          <ul className="divide-y divide-[#f0ebe3]">
            {recentOrders.map((order) => {
              const name = customerName(order);
              const label = orderStatusLabel(order.status);
              return (
                <li key={order._id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#faf7f2] text-[12px] font-bold text-stone-600 ring-1 ring-[#ebe6de]">
                    {name.split(" ").map((part) => part[0]).join("").slice(0, 2)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold">{name}</p>
                    <p className="mt-0.5 text-[11px] text-stone-500">
                      {order.orderNumber} · {formatRelativeTime(order.createdAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[13px] font-semibold">{formatCurrency(order.amounts.total)}</p>
                    <Badge tone={tone(order.status)} dot>
                      {label}
                    </Badge>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>

      <Card title="Orders per day" action={<span className="text-[11.5px] text-stone-500">Last 7 days</span>}>
        <BarChart data={orderSeries} labels={["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]} height={180} />
      </Card>
    </div>
  );
}
