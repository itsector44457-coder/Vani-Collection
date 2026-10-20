"use client";

import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Badge, Card, Input, PageHeader, ButtonPrimary } from "@/lib/account-ui";
import OrderTrackingResult from "@/components/OrderTrackingResult";
import { useAuth } from "@/context/AuthContext";
import { isApiConfigured } from "@/lib/api-client";
import type { PublicOrderTracking } from "@/lib/storefront-api";
import { orderStatusLabel, type StoreOrder } from "@/lib/storefront-types";
import { useMyOrders } from "@/lib/use-storefront";

const toTracking = (order: StoreOrder): PublicOrderTracking => ({
  orderNumber: order.orderNumber,
  status: order.status,
  createdAt: order.createdAt,
  updatedAt: order.statusHistory?.at(-1)?.at ?? order.createdAt,
  items: order.items.map((item) => ({
    name: item.name || item.sku,
    image: item.image,
    size: item.size,
    color: item.color,
    quantity: item.quantity,
  })),
  total: order.amounts.total,
  paymentMethod: order.payment.method,
  shipment: order.shipment,
  statusHistory: order.statusHistory ?? [],
});

function TrackOrderContent() {
  const { isAuthenticated } = useAuth();
  const live = isApiConfigured();
  const { data: orders, loading } = useMyOrders(isAuthenticated);
  const searchParams = useSearchParams();
  const linkedOrder = searchParams.get("order") || searchParams.get("awb") || "";
  const appliedLinkRef = useRef("");
  const [query, setQuery] = useState("");
  const [match, setMatch] = useState<StoreOrder | null>(null);
  const [error, setError] = useState("");

  const findOrder = (value: string) => {
    const needle = value.trim().toLowerCase();
    setError("");
    if (!needle) {
      setError("Order ID ya AWB number likhe.");
      setMatch(null);
      return;
    }
    if (!live) {
      setError("Tracking abhi uplabdh nahi hai — thodi der baad dobara try kare.");
      setMatch(null);
      return;
    }
    if (!isAuthenticated) {
      setError("Yeh lookup sirf account orders ke liye hai. Bina login track karne ke liye neeche wala guest tracking use kare.");
      setMatch(null);
      return;
    }
    const found =
      orders.find((order) => order.orderNumber?.toLowerCase() === needle) ??
      orders.find((order) => order._id.toLowerCase() === needle) ??
      orders.find((order) => order.shipment?.awb?.toLowerCase() === needle) ??
      null;
    setMatch(found);
    if (!found) setError("Is ID/AWB se aapke account me koi order nahi mila. Guest checkout kiya tha to guest tracking try kare.");
  };

  /* Deep links from the dashboard/order list (?order=VC…) open that parcel directly. */
  useEffect(() => {
    if (!linkedOrder || !orders.length || appliedLinkRef.current === linkedOrder) return;
    appliedLinkRef.current = linkedOrder;
    const needle = linkedOrder.trim().toLowerCase();
    const found = orders.find((order) => order.orderNumber?.toLowerCase() === needle || order._id.toLowerCase() === needle || order.shipment?.awb?.toLowerCase() === needle) ?? null;
    void Promise.resolve().then(() => {
      setQuery(linkedOrder);
      setMatch(found);
      setError(found ? "" : "Is link wala order aapke account me nahi mila. Guest checkout tha to neeche guest tracking use kare.");
    });
  }, [linkedOrder, orders]);

  const recentOrders = [...orders]
    .sort((a, b) => Number(["delivered", "cancelled", "returned", "refunded"].includes(a.status)) - Number(["delivered", "cancelled", "returned", "refunded"].includes(b.status)))
    .slice(0, 5);

  return (
    <>
      <PageHeader eyebrow="Delivery status" title="Track your order" subtitle="Apne account ke order ka ID/AWB likhe, ya neeche apne recent order par tap kare." />

      <Card className="mb-5">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            findOrder(query);
          }}
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <div className="flex-1">
            <Input label="Order ID or AWB number" placeholder="Jaise VC… ya AWB number" value={query} onChange={(event) => setQuery(event.target.value)} autoComplete="off" />
          </div>
          <ButtonPrimary type="submit" className="min-h-11 sm:mb-0.5" disabled={loading}>
            {loading ? "Loading…" : "Track order"}
          </ButtonPrimary>
        </form>

        {isAuthenticated && recentOrders.length > 0 && (
          <div className="mt-4 border-t border-[#f0ebe3] pt-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-stone-400">Mere recent orders</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {recentOrders.map((order) => (
                <li key={order._id}>
                  <button
                    type="button"
                    onClick={() => {
                      setQuery(order.orderNumber);
                      setError("");
                      setMatch(order);
                    }}
                    aria-pressed={match?._id === order._id}
                    className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-3 text-[12px] font-semibold transition ${match?._id === order._id ? "border-[#881337] bg-[#881337] text-white" : "border-[#ebe6de] bg-white text-stone-700 hover:border-[#881337] hover:text-[#881337]"}`}
                  >
                    #{order.orderNumber}
                    <Badge tone={order.status === "delivered" ? "success" : "info"}>{orderStatusLabel(order.status)}</Badge>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="mt-4 text-[12.5px] leading-relaxed text-stone-500">
          Bina account ke order kiya tha? <Link href="/track-order" className="font-semibold text-[#881337] hover:underline">Guest tracking (bina login)</Link> use kare — sirf order number aur mobile chahiye.
          {!isAuthenticated && <> Account orders ke liye <Link href="/login?redirect=/account/track" className="font-semibold text-[#881337] hover:underline">sign in kare</Link>.</>}
        </p>
      </Card>

      <div aria-live="polite">
        {error && <p role="alert" className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[12.5px] leading-relaxed text-rose-700">{error}</p>}
        {match ? (
          <div className="space-y-4">
            <OrderTrackingResult tracking={toTracking(match)} />
            <p className="text-right">
              <Link href={`/account/orders/${match._id}`} className="text-[13px] font-semibold text-[#881337] hover:underline">Poora order detail dekhe →</Link>
            </p>
          </div>
        ) : !error && (
          <Card><p className="text-[12.5px] text-stone-500">Order ID/AWB likhe ya recent order chune — parcel ki live sthiti yahan dikhegi.</p></Card>
        )}
      </div>
    </>
  );
}


export default function TrackOrderPage() {
  return (
    <Suspense fallback={<Card><p className="text-[12.5px] text-stone-500">Tracking load ho raha hai…</p></Card>}>
      <TrackOrderContent />
    </Suspense>
  );
}
