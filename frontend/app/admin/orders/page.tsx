"use client";

import { useMemo, useState } from "react";
import { Badge, Card } from "@/lib/admin-ui";
import AdminDataBadge from "@/components/admin/AdminDataBadge";
import { api, ApiError, formatCurrency, formatRelativeTime, orderStatusLabel, type AdminOrder, type Paginated } from "@/lib/api-client";
import { useApiResource } from "@/lib/use-api";

const TABS = ["All", "Pending", "Paid", "Processing", "Packed", "Shipped", "Delivered", "Refunded"] as const;
type Tab = (typeof TABS)[number];

const DEMO_ORDERS: Paginated<AdminOrder> = {
  data: [
    { _id: "demo-1", orderNumber: "#VC-4821", createdAt: new Date(Date.now() - 2 * 60000).toISOString(), status: "confirmed", payment: { method: "razorpay", status: "paid" }, amounts: { subtotal: 4299, discount: 0, shipping: 0, tax: 205, total: 4299 }, items: [{ sku: "VC-1042", quantity: 2, unitPrice: 2149, lineTotal: 4299 }], shippingAddress: { fullName: "Priya Sharma", city: "Indore" } },
    { _id: "demo-2", orderNumber: "#VC-4820", createdAt: new Date(Date.now() - 18 * 60000).toISOString(), status: "shipped", payment: { method: "razorpay", status: "paid" }, amounts: { subtotal: 2499, discount: 0, shipping: 0, tax: 119, total: 2499 }, items: [{ sku: "VC-1038", quantity: 1, unitPrice: 2499, lineTotal: 2499 }], shippingAddress: { fullName: "Meera Iyer", city: "Mumbai" } },
    { _id: "demo-3", orderNumber: "#VC-4819", createdAt: new Date(Date.now() - 60 * 60000).toISOString(), status: "pending_payment", payment: { method: "cod", status: "pending" }, amounts: { subtotal: 6798, discount: 0, shipping: 0, tax: 324, total: 6798 }, items: [{ sku: "VC-1015", quantity: 3, unitPrice: 2266, lineTotal: 6798 }], shippingAddress: { fullName: "Ananya Bose", city: "Kolkata" } },
    { _id: "demo-4", orderNumber: "#VC-4818", createdAt: new Date(Date.now() - 2 * 3600000).toISOString(), status: "delivered", payment: { method: "razorpay", status: "paid" }, amounts: { subtotal: 1899, discount: 100, shipping: 0, tax: 86, total: 1799 }, items: [{ sku: "VC-1002", quantity: 1, unitPrice: 1899, lineTotal: 1899 }], shippingAddress: { fullName: "Riya Kapoor", city: "Ujjain" } },
  ],
  meta: { total: 4 },
};

const NEXT_STATUS: Record<string, { value: string; label: string }[]> = {
  pending_payment: [{ value: "confirmed", label: "Mark paid" }, { value: "cancelled", label: "Cancel" }],
  confirmed: [{ value: "processing", label: "Start processing" }, { value: "cancelled", label: "Cancel" }],
  processing: [{ value: "packed", label: "Mark packed" }],
  packed: [{ value: "shipped", label: "Mark shipped" }],
  shipped: [{ value: "delivered", label: "Mark delivered" }],
  delivered: [],
};

const tone = (status: string) => {
  const label = orderStatusLabel(status);
  if (label === "Paid" || label === "Delivered") return "success" as const;
  if (label === "Shipped" || label === "Packed" || label === "Processing") return "info" as const;
  if (label === "Pending") return "warning" as const;
  return "danger" as const;
};

export default function OrdersPage() {
  const [tab, setTab] = useState<Tab>("All");
  const [busyOrder, setBusyOrder] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const orders = useApiResource<Paginated<AdminOrder>>((signal) => api.orders({ limit: 100 }, signal), DEMO_ORDERS);

  const decorated = useMemo(
    () => orders.data.data.map((order) => ({ ...order, label: orderStatusLabel(order.status) })),
    [orders.data]
  );

  const counts = useMemo(() => {
    const result: Record<string, number> = { All: decorated.length };
    TABS.slice(1).forEach((name) => {
      result[name] = decorated.filter((order) => order.label === name).length;
    });
    return result;
  }, [decorated]);

  const filtered = useMemo(() => (tab === "All" ? decorated : decorated.filter((order) => order.label === tab)), [decorated, tab]);

  const customerName = (order: AdminOrder) =>
    order.shippingAddress?.fullName ||
    (typeof order.customerId === "object" ? [order.customerId?.firstName, order.customerId?.lastName].filter(Boolean).join(" ") : "") ||
    "Guest checkout";

  const advance = async (order: AdminOrder, status: string) => {
    setBusyOrder(order._id);
    setActionError(null);
    try {
      await api.updateOrderStatus(order._id, status, `Updated from admin console`);
      orders.refresh();
    } catch (cause) {
      setActionError(cause instanceof ApiError ? cause.message : "Could not update the order status");
    } finally {
      setBusyOrder(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-400">Commerce</p>
          <h1 className="mt-1 font-serif text-[26px] font-semibold tracking-tight">Orders</h1>
          <p className="mt-1 text-[13px] text-stone-500">Track, fulfil, and manage every customer purchase.</p>
        </div>
        <AdminDataBadge resource={orders} />
      </div>

      {actionError && (
        <p role="alert" className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-[12.5px] text-rose-700 ring-1 ring-rose-200">
          {actionError}
        </p>
      )}

      <div className="flex flex-wrap gap-1.5">
        {TABS.map((name) => (
          <button
            key={name}
            onClick={() => setTab(name)}
            aria-pressed={tab === name}
            className={`flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[12.5px] font-medium transition ${
              tab === name ? "bg-[#14100f] text-white" : "bg-white text-stone-600 ring-1 ring-[#ebe6de] hover:bg-[#faf7f2]"
            }`}
          >
            {name}
            <span className={`rounded-full px-1.5 py-px text-[10px] font-bold ${tab === name ? "bg-white/15 text-white" : "bg-[#faf7f2] text-stone-500"}`}>
              {counts[name] ?? 0}
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
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-[12.5px] text-stone-500">
                    No orders in this view yet.
                  </td>
                </tr>
              )}
              {filtered.map((order) => {
                const name = customerName(order);
                const transitions = NEXT_STATUS[order.status] ?? [];
                return (
                  <tr key={order._id} className="group transition hover:bg-[#faf7f2]/60">
                    <td className="py-3.5 pr-4">
                      <p className="text-[13px] font-semibold">{order.orderNumber}</p>
                      <p className="text-[11px] text-stone-500">
                        {formatRelativeTime(order.createdAt)}
                        {order.erpSyncStatus ? ` · ERP ${order.erpSyncStatus}` : ""}
                      </p>
                    </td>
                    <td className="py-3.5 pr-4">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#faf7f2] text-[10.5px] font-bold text-stone-600 ring-1 ring-[#ebe6de]">
                          {name.split(" ").map((part) => part[0]).join("").slice(0, 2)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-medium">{name}</p>
                          {order.shippingAddress?.city && <p className="text-[11px] text-stone-500">{order.shippingAddress.city}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 pr-4 text-[12.5px] text-stone-600">
                      {order.items.reduce((sum, item) => sum + item.quantity, 0)}
                      <span className="ml-1 text-[11px] text-stone-400">{order.items.map((item) => item.sku).join(", ").slice(0, 24)}</span>
                    </td>
                    <td className="py-3.5 pr-4 text-[12.5px] text-stone-600">
                      {order.payment.method === "cod" ? "COD" : "Online"}
                      <span className={`ml-1.5 text-[11px] font-semibold ${order.payment.status === "paid" ? "text-emerald-600" : "text-stone-400"}`}>
                        {order.payment.status}
                      </span>
                    </td>
                    <td className="py-3.5 pr-4 text-[13px] font-semibold">{formatCurrency(order.amounts.total)}</td>
                    <td className="py-3.5 pr-4">
                      <Badge tone={tone(order.status)} dot>
                        {orderStatusLabel(order.status)}
                      </Badge>
                    </td>
                    <td className="py-3.5 text-right">
                      {orders.source === "live" && transitions.length > 0 ? (
                        <div className="flex justify-end gap-1">
                          {transitions.map((transition) => (
                            <button
                              key={transition.value}
                              disabled={busyOrder === order._id}
                              onClick={() => void advance(order, transition.value)}
                              className="rounded-lg px-2.5 py-1.5 text-[11.5px] font-semibold text-[#881337] transition hover:bg-rose-50 disabled:opacity-50"
                            >
                              {busyOrder === order._id ? "…" : transition.label}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[11.5px] text-stone-400">{orders.source === "live" ? "No action" : "Demo row"}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
