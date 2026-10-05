"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge, ButtonGhost, Card, EmptyState, IconBox, PageHeader } from "@/lib/account-ui";
import { useAuth } from "@/context/AuthContext";
import { isApiConfigured } from "@/lib/api-client";
import { cancelOrder } from "@/lib/storefront-api";
import { orderStatusLabel, type StoreOrder } from "@/lib/storefront-types";
import { useMyOrders } from "@/lib/use-storefront";

/** Ordered sample data so the account area still reads well without the backend. */
const DEMO_ORDERS = [
  { id: "VC-4821", date: "12 Oct 2024", items: 2, total: 4299, status: "Shipped", eta: "16 Oct" },
  { id: "VC-4790", date: "28 Sep 2024", items: 1, total: 2499, status: "Delivered", eta: null },
  { id: "VC-4712", date: "05 Sep 2024", items: 3, total: 6798, status: "Delivered", eta: null },
  { id: "VC-4655", date: "21 Aug 2024", items: 1, total: 1899, status: "Cancelled", eta: null },
  { id: "VC-4602", date: "10 Aug 2024", items: 2, total: 3799, status: "Returned", eta: null },
];

const TABS = ["All", "Active", "Delivered", "Cancelled"] as const;

const ACTIVE_STATUSES = ["pending_payment", "confirmed", "processing", "packed", "shipped"];
const CLOSED_STATUSES = ["cancelled", "return_requested", "returned", "refunded"];

const tone = (status: string) =>
  status === "delivered"
    ? "success"
    : status === "shipped" || status === "packed" || status === "processing" || status === "Shipped"
      ? "info"
      : CLOSED_STATUSES.includes(status) || status === "Cancelled" || status === "Returned"
        ? "danger"
        : "warning";

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

const CANCELABLE = ["pending_payment", "confirmed", "processing"];

export default function OrdersPage() {
  const { isAuthenticated } = useAuth();
  const live = isApiConfigured();
  const { data: orders, loading, error, refresh } = useMyOrders(isAuthenticated);
  const [tab, setTab] = useState<(typeof TABS)[number]>("All");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const rows = live
    ? orders.map((order: StoreOrder) => ({
        id: order._id,
        number: order.orderNumber,
        date: formatDate(order.createdAt),
        items: order.items.reduce((sum, item) => sum + item.quantity, 0),
        total: order.amounts.total,
        status: order.status,
        label: orderStatusLabel(order.status),
        eta: order.shipment?.estimatedDelivery ? formatDate(order.shipment.estimatedDelivery) : null,
        raw: order,
      }))
    : DEMO_ORDERS.map((order) => ({ ...order, number: order.id, label: order.status, raw: null }));

  const filtered = rows.filter((order) => {
    if (tab === "All") return true;
    if (tab === "Active") return ACTIVE_STATUSES.includes(order.status) || order.status === "Shipped";
    if (tab === "Delivered") return order.status === "delivered" || order.status === "Delivered";
    return CLOSED_STATUSES.includes(order.status) || order.status === "Cancelled" || order.status === "Returned";
  });

  const handleCancel = async (orderId: string, orderNumber: string) => {
    setBusyId(orderId);
    setNotice(null);
    try {
      await cancelOrder(orderId, "Cancelled from the customer account");
      setNotice(`Order ${orderNumber} has been cancelled. Prepaid refunds arrive in 5–7 working days.`);
      refresh();
    } catch (cause) {
      setNotice((cause as Error)?.message || "We could not cancel this order. Please contact support.");
    } finally {
      setBusyId(null);
    }
  };

  const inTransit = rows.filter((order) => ACTIVE_STATUSES.includes(order.status) || order.status === "Shipped").length;

  return (
    <>
      <PageHeader
        eyebrow="My purchases"
        title="My Orders"
        subtitle={`${rows.length} total orders · ${inTransit} in progress`}
      />

      {notice && (
        <p className="mb-5 rounded-xl border border-[#ebe6de] bg-white px-4 py-3 text-[12.5px] text-stone-700">{notice}</p>
      )}

      {live && !isAuthenticated && (
        <p className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12.5px] text-amber-800">
          <Link href="/login?redirect=/account/orders" className="font-semibold underline">
            Sign in
          </Link>{" "}
          to see the orders placed with your account. The list below is sample data.
        </p>
      )}

      {live && error && (
        <p className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[12.5px] text-rose-700">
          {error}
        </p>
      )}

      {/* Tabs */}
      <div className="mb-5 flex flex-wrap gap-1.5">
        {TABS.map((item) => (
          <button
            key={item}
            onClick={() => setTab(item)}
            className={`rounded-full px-4 py-1.5 text-[12.5px] font-medium transition ${
              tab === item
                ? "bg-[#14100f] text-white"
                : "bg-white text-stone-600 ring-1 ring-[#ebe6de] hover:bg-[#faf7f2]"
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      {loading && live && isAuthenticated ? (
        <div className="space-y-4">
          {[0, 1, 2].map((key) => (
            <div key={key} className="h-32 animate-pulse rounded-2xl bg-white ring-1 ring-[#ebe6de]" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<IconBox />}
          title="No orders here"
          description="Once you place an order it will appear here."
          action={
            <Link
              href="/shop"
              className="inline-flex items-center justify-center rounded-full bg-[#881337] px-5 py-2.5 text-[12.5px] font-semibold text-white transition hover:bg-[#6b0f2b]"
            >
              Start shopping
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {filtered.map((order) => (
            <Card key={order.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-3">
                    <p className="text-[14px] font-semibold">#{order.number}</p>
                    <Badge tone={tone(order.status) as never} dot>
                      {order.label}
                    </Badge>
                  </div>
                  <p className="mt-1 text-[12px] text-stone-500">
                    Placed on {order.date} · {order.items} item{order.items > 1 ? "s" : ""}
                  </p>
                </div>
                <p className="font-serif text-[18px] font-semibold">₹{order.total.toLocaleString("en-IN")}</p>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-[#f0ebe3] pt-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-to-br from-[#faf7f2] to-[#f0ebe3] text-[14px] font-bold text-[#881337] ring-1 ring-[#ebe6de]">
                    V
                  </div>
                  <div>
                    <p className="text-[12.5px] font-medium text-stone-700">
                      {order.items} {order.items === 1 ? "piece" : "pieces"}
                    </p>
                    {order.eta && <p className="text-[11px] text-stone-500">Arriving by {order.eta}</p>}
                  </div>
                </div>

                <div className="ml-auto flex flex-wrap gap-2">
                  <Link
                    href={`/account/orders/${order.id}`}
                    className="inline-flex items-center justify-center rounded-full border border-stone-300 bg-white px-4 py-2 text-[12px] font-semibold text-stone-700 transition hover:border-stone-400"
                  >
                    View details
                  </Link>
                  {(order.status === "shipped" || order.status === "Shipped") && (
                    <Link
                      href="/account/track"
                      className="inline-flex items-center justify-center rounded-full bg-[#881337] px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-[#6b0f2b]"
                    >
                      Track order
                    </Link>
                  )}
                  {live && order.raw && CANCELABLE.includes(order.status) && (
                    <ButtonGhost
                      onClick={() => void handleCancel(order.id, order.number)}
                      disabled={busyId === order.id}
                    >
                      {busyId === order.id ? "Cancelling…" : "Cancel order"}
                    </ButtonGhost>
                  )}
                  {(order.status === "delivered" || order.status === "Delivered") && <ButtonGhost>Buy again</ButtonGhost>}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
