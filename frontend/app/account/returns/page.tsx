"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge, ButtonGhost, ButtonPrimary, Card, EmptyState, IconReturn, PageHeader } from "@/lib/account-ui";
import { useAuth } from "@/context/AuthContext";
import { isApiConfigured } from "@/lib/api-client";
import { requestReturn } from "@/lib/storefront-api";
import { orderStatusLabel } from "@/lib/storefront-types";
import { useMyOrders } from "@/lib/use-storefront";

type Tone = "success" | "warning" | "danger" | "info";

const DEMO_RETURNS = [
  {
    id: "RT-2410-882",
    orderId: "VC-4602",
    item: "Indigo Dabu Cotton Kurta Set",
    reason: "Size too small",
    status: "Refund processed",
    amount: 1899,
    date: "25 Aug 2024",
    refunded: true,
  },
  {
    id: "RT-2409-771",
    orderId: "VC-4655",
    item: "Chanderi Zari Kurta",
    reason: "Received damaged",
    status: "Under review",
    amount: 2199,
    date: "18 Sep 2024",
    refunded: false,
  },
];

const tone = (status: string): Tone =>
  status === "Refund processed" || status === "refunded" || status === "returned"
    ? "success"
    : status === "Under review" || status === "return_requested"
      ? "warning"
      : status === "Rejected" || status === "cancelled"
        ? "danger"
        : "info";

const REASONS = ["Size too small", "Size too large", "Received damaged", "Not as described", "Changed my mind"];

const money = (value: number) => `₹${value.toLocaleString("en-IN")}`;

export default function ReturnsPage() {
  const { isAuthenticated } = useAuth();
  const live = isApiConfigured();
  const { data: orders, refresh } = useMyOrders(isAuthenticated);

  const [formOpen, setFormOpen] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [sku, setSku] = useState("");
  const [reason, setReason] = useState(REASONS[0]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState("");

  const eligible = orders.filter((order) => order.status === "delivered");
  const selectedOrder = eligible.find((order) => order._id === orderId) ?? eligible[0] ?? null;

  const liveRows = orders
    .filter((order) => ["return_requested", "returned", "refunded"].includes(order.status))
    .map((order) => ({
      id: order.orderNumber,
      orderId: order.orderNumber,
      item: order.items.map((item) => item.name ?? item.sku).join(", "),
      reason: "Submitted from your account",
      status: orderStatusLabel(order.status),
      amount: order.amounts.total,
      date: new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
      refunded: order.payment.status === "refunded" || order.status === "refunded",
    }));

  const rows = live ? liveRows : DEMO_RETURNS;

  const handleSubmit = async () => {
    setError("");
    setNotice(null);
    if (!selectedOrder) {
      setError("Pick a delivered order to return.");
      return;
    }
    const line = selectedOrder.items.find((item) => item.sku === sku) ?? selectedOrder.items[0];
    if (!line) {
      setError("That order has no returnable pieces.");
      return;
    }
    setBusy(true);
    try {
      await requestReturn({
        orderId: selectedOrder._id,
        type: "return",
        items: [{ sku: line.sku, quantity: line.quantity, reason }],
      });
      setNotice(`Return requested for ${line.name ?? line.sku}. Our team will arrange the pickup within 48 hours.`);
      setFormOpen(false);
      refresh();
    } catch (cause) {
      setError((cause as Error)?.message || "We could not start this return. Please contact support.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="After sales"
        title="Returns & Refunds"
        subtitle="Track and manage your returns. Free pickup on all orders."
        action={
          <ButtonPrimary onClick={() => setFormOpen((value) => !value)}>
            {formOpen ? "Close" : "Start a return"}
          </ButtonPrimary>
        }
      />

      {notice && (
        <p className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[12.5px] text-emerald-800">{notice}</p>
      )}
      {(error || (!live && formOpen)) && (
        <p className={`mb-5 rounded-xl px-4 py-3 text-[12.5px] ${error ? "border border-rose-200 bg-rose-50 text-rose-700" : "border border-amber-200 bg-amber-50 text-amber-800"}`}>
          {error || "Connect the backend to raise real return requests — the list below is sample data."}
        </p>
      )}

      {formOpen && live && (
        <Card title="Start a return" className="mb-5">
          {eligible.length === 0 ? (
            <p className="text-[12.5px] text-stone-600">
              Only delivered orders can be returned.{" "}
              <Link href="/account/orders" className="font-semibold text-[#881337] hover:underline">
                View your orders
              </Link>
              .
            </p>
          ) : (
            <>
              <label className="block text-[12.5px] font-semibold text-stone-800" htmlFor="return-order">
                Delivered order
              </label>
              <select
                id="return-order"
                value={selectedOrder?._id ?? ""}
                onChange={(event) => {
                  setOrderId(event.target.value);
                  setSku("");
                }}
                className="mt-1.5 w-full rounded-lg border border-stone-300 bg-white px-3.5 py-2.5 text-[13.5px] outline-none focus:border-[#881337]"
              >
                {eligible.map((order) => (
                  <option key={order._id} value={order._id}>
                    #{order.orderNumber} · {money(order.amounts.total)}
                  </option>
                ))}
              </select>

              <label className="mt-4 block text-[12.5px] font-semibold text-stone-800" htmlFor="return-item">
                Piece
              </label>
              <select
                id="return-item"
                value={sku || selectedOrder?.items[0]?.sku || ""}
                onChange={(event) => setSku(event.target.value)}
                className="mt-1.5 w-full rounded-lg border border-stone-300 bg-white px-3.5 py-2.5 text-[13.5px] outline-none focus:border-[#881337]"
              >
                {selectedOrder?.items.map((item) => (
                  <option key={item.sku} value={item.sku}>
                    {item.name ?? item.sku} · Qty {item.quantity}
                  </option>
                ))}
              </select>

              <label className="mt-4 block text-[12.5px] font-semibold text-stone-800" htmlFor="return-reason">
                Reason
              </label>
              <select
                id="return-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                className="mt-1.5 w-full rounded-lg border border-stone-300 bg-white px-3.5 py-2.5 text-[13.5px] outline-none focus:border-[#881337]"
              >
                {REASONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>

              <div className="mt-5">
                <ButtonPrimary onClick={() => void handleSubmit()} disabled={busy}>
                  {busy ? "Submitting…" : "Submit return request"}
                </ButtonPrimary>
              </div>
            </>
          )}
        </Card>
      )}

      {rows.length === 0 ? (
        <EmptyState
          icon={<IconReturn />}
          title="No returns yet"
          description="Any returns you initiate will appear here."
        />
      ) : (
        <div className="space-y-4">
          {rows.map((row) => (
            <Card key={row.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-3">
                    <p className="text-[14px] font-semibold">#{row.id}</p>
                    <Badge tone={tone(row.status)} dot>
                      {row.status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-[12px] text-stone-500">
                    Order #{row.orderId} · Initiated on {row.date}
                  </p>
                </div>
                <p className="font-serif text-[18px] font-semibold">{money(row.amount)}</p>
              </div>

              <div className="mt-5 flex items-start gap-4 border-t border-[#f0ebe3] pt-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#faf7f2] to-[#f0ebe3] text-[18px] font-bold text-[#881337] ring-1 ring-[#ebe6de]">
                  {row.item.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold">{row.item}</p>
                  <p className="mt-0.5 text-[11.5px] text-stone-500">Reason: {row.reason}</p>
                  {row.refunded && (
                    <p className="mt-1 text-[11.5px] font-semibold text-emerald-600">
                      Refund credited to original payment method
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <ButtonGhost>View details</ButtonGhost>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
