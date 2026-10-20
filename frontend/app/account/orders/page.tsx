"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Badge, Card, EmptyState, IconBox, Input, PageHeader } from "@/lib/account-ui";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { isApiConfigured } from "@/lib/api-client";
import { addCartItem, cancelOrder } from "@/lib/storefront-api";
import { orderStatusLabel, type StoreOrder } from "@/lib/storefront-types";
import { useMyOrders } from "@/lib/use-storefront";
import { formatPrice } from "@/lib/utils";

const TABS = ["All", "Active", "Delivered", "Cancelled"] as const;
type Tab = (typeof TABS)[number];

const ACTIVE_STATUSES = ["pending_payment", "confirmed", "processing", "packed", "shipped"];
const CLOSED_STATUSES = ["cancelled", "return_requested", "returned", "refunded"];
/** Must mirror the backend rule — packed/processing orders can no longer be self-cancelled. */
const CANCELABLE = ["pending_payment", "confirmed"];
const CANCEL_REASONS = ["Size galat chuna tha", "Address/phone galat hai", "Ab zarurat nahi hai", "Duplicate order ban gaya", "Koi aur kaaran"];

const tone = (status: string) => status === "delivered" ? "success" : ACTIVE_STATUSES.includes(status) ? "info" : CLOSED_STATUSES.includes(status) ? "danger" : "warning";
const formatDate = (value: string) => new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
const matchesTab = (order: StoreOrder, tab: Tab) => tab === "All" ? true : tab === "Active" ? ACTIVE_STATUSES.includes(order.status) : tab === "Delivered" ? order.status === "delivered" : CLOSED_STATUSES.includes(order.status);

export default function OrdersPage() {
  const { isAuthenticated } = useAuth();
  const { refreshCart, setIsCartOpen } = useCart();
  const live = isApiConfigured();
  const { data: orders, loading, error, refresh } = useMyOrders(isAuthenticated);
  const [tab, setTab] = useState<Tab>("All");
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [cancelTarget, setCancelTarget] = useState<StoreOrder | null>(null);
  const [cancelReason, setCancelReason] = useState(CANCEL_REASONS[0]);

  const needle = search.trim().toLowerCase();
  const filtered = orders.filter((order) => {
    if (!matchesTab(order, tab)) return false;
    if (!needle) return true;
    return order.orderNumber.toLowerCase().includes(needle)
      || order._id.toLowerCase().includes(needle)
      || (order.shipment?.awb ?? "").toLowerCase().includes(needle)
      || order.items.some((item) => (item.name ?? "").toLowerCase().includes(needle) || item.sku.toLowerCase().includes(needle));
  });
  const countFor = (item: Tab) => orders.filter((order) => matchesTab(order, item)).length;
  const inProgress = orders.filter((order) => ACTIVE_STATUSES.includes(order.status)).length;

  const confirmCancel = async () => {
    if (!cancelTarget) return;
    setBusyId(cancelTarget._id);
    setNotice(null);
    try {
      await cancelOrder(cancelTarget._id, cancelReason);
      setNotice({ tone: "success", text: `Order #${cancelTarget.orderNumber} cancel ho gaya. Prepaid refund aam taur par 5–7 working days me mool payment method par aata hai.` });
      setCancelTarget(null);
      refresh();
    } catch (cause) {
      setNotice({ tone: "error", text: (cause as Error)?.message || "Order cancel nahi ho paya. Kripya support se sampark kare." });
    } finally {
      setBusyId(null);
    }
  };

  const buyAgain = async (order: StoreOrder) => {
    setBusyId(order._id);
    setNotice(null);
    const added: string[] = [];
    const failed: string[] = [];
    for (const item of order.items) {
      try {
        await addCartItem(item.sku, item.quantity);
        added.push(item.name ?? item.sku);
      } catch {
        failed.push(item.name ?? item.sku);
      }
    }
    setBusyId(null);
    if (added.length) {
      refreshCart();
      setIsCartOpen(true);
    }
    setNotice(
      failed.length
        ? { tone: added.length ? "success" : "error", text: `${added.length ? `${added.length} item bag me jod diye. ` : ""}Yeh abhi uplabdh nahi hai: ${failed.join(", ")}.` }
        : { tone: "success", text: "Saare items bag me dobara jod diye gaye hain." },
    );
  };

  return (
    <>
      <PageHeader eyebrow="My purchases" title="My Orders" subtitle={`${orders.length} kul orders · ${inProgress} chal rahe hain`} />

      <div aria-live="polite">
        {notice && <p role={notice.tone === "error" ? "alert" : undefined} className={`mb-5 rounded-xl border px-4 py-3 text-[12.5px] leading-relaxed ${notice.tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-700"}`}>{notice.text}</p>}
        {live && error && <p role="alert" className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[12.5px] text-rose-700">{error} <button type="button" onClick={refresh} className="font-bold underline underline-offset-2">Dobara try kare</button></p>}
      </div>

      {live && !isAuthenticated && (
        <p className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12.5px] leading-relaxed text-amber-800">
          Account orders dekhne ke liye <Link href="/login?redirect=/account/orders" className="font-semibold underline">sign in kare</Link>. Guest checkout wala order <Link href="/track-order" className="font-semibold underline">bina login track</Link> kare.
        </p>
      )}

      <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <Input label="Order khoje" placeholder="Order number, AWB, product ya SKU…" value={search} onChange={(event) => setSearch(event.target.value)} autoComplete="off" />
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Order ke prakaar">
          {TABS.map((item) => (
            <button key={item} type="button" aria-pressed={tab === item} onClick={() => setTab(item)} className={`min-h-11 rounded-full px-4 py-2 text-[12.5px] font-semibold transition ${tab === item ? "bg-[#14100f] text-white" : "bg-white text-stone-600 ring-1 ring-[#ebe6de] hover:bg-[#faf7f2]"}`}>
              {item} <span className="opacity-70">({countFor(item)})</span>
            </button>
          ))}
        </div>
      </div>

      {loading && live && isAuthenticated ? (
        <div className="space-y-4" aria-label="Orders load ho rahe hain">{[0, 1, 2].map((key) => <div key={key} className="h-36 animate-pulse rounded-2xl bg-white ring-1 ring-[#ebe6de]" />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<IconBox />}
          title={needle ? "Is khoj se koi order nahi mila" : "Yahan koi order nahi hai"}
          description={needle ? "Order number ya product ka naam dobara jaanche, ya khoj saaf kare." : "Order place karte hi woh yahan dikhega. Guest order account history me nahi aata."}
          action={needle ? <button type="button" onClick={() => setSearch("")} className="inline-flex min-h-11 items-center rounded-full bg-[#881337] px-5 text-[12.5px] font-semibold text-white">Khoj saaf kare</button> : <Link href="/products" className="inline-flex min-h-11 items-center rounded-full bg-[#881337] px-5 text-[12.5px] font-semibold text-white hover:bg-[#6b0f2b]">Shopping shuru kare</Link>}
        />
      ) : (
        <div className="space-y-4">
          {filtered.map((order) => {
            const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
            const canCancel = live && CANCELABLE.includes(order.status);
            const canBuyAgain = live && ["delivered", "cancelled", "returned", "refunded"].includes(order.status);
            const isCancellingThis = cancelTarget?._id === order._id;
            return (
              <Card key={order._id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <p className="text-[14px] font-semibold">#{order.orderNumber}</p>
                      <Badge tone={tone(order.status) as never} dot>{orderStatusLabel(order.status)}</Badge>
                      {order.payment.method !== "cod" && order.payment.status === "pending" && order.status === "pending_payment" && <Badge tone="warning">Payment baaki hai</Badge>}
                    </div>
                    <p className="mt-1 text-[12px] text-stone-500">{formatDate(order.createdAt)} · {itemCount} item{itemCount === 1 ? "" : "s"} · {order.payment.method === "cod" ? "COD" : "Online payment"}</p>
                  </div>
                  <p className="font-serif text-[18px] font-semibold">{formatPrice(order.amounts.total)}</p>
                </div>

                <div className="mt-4 flex gap-2 overflow-x-auto pb-1" aria-label="Order items">
                  {order.items.map((item) => (
                    <div key={item.sku} className="flex min-w-52 items-center gap-3 rounded-xl bg-stone-50 p-2.5 ring-1 ring-stone-100">
                      <span className="relative h-12 w-10 shrink-0 overflow-hidden rounded-lg bg-stone-200">{item.image && <Image src={item.image} alt="" fill unoptimized sizes="40px" className="object-cover object-top" />}</span>
                      <span className="min-w-0">
                        <span className="block truncate text-[12px] font-semibold text-stone-800">{item.name ?? item.sku}</span>
                        <span className="mt-0.5 block text-[11px] text-stone-500">{[item.size && `Size ${item.size}`, item.color, `Qty ${item.quantity}`].filter(Boolean).join(" · ")}</span>
                      </span>
                    </div>
                  ))}
                </div>

                {order.shipment?.estimatedDelivery && ACTIVE_STATUSES.includes(order.status) && <p className="mt-3 text-[12px] text-stone-500">Anumanit delivery: <strong className="text-stone-800">{formatDate(order.shipment.estimatedDelivery)}</strong>{order.shipment.awb ? <> · AWB <strong className="text-stone-800">{order.shipment.awb}</strong></> : null}</p>}

                {isCancellingThis ? (
                  <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4" role="group" aria-label={`Order ${order.orderNumber} cancel confirm kare`}>
                    <p className="text-[13px] font-semibold text-rose-900">Kya aap pakka is order ko cancel karna chahte hain?</p>
                    <label className="mt-3 block text-[12px] font-semibold text-rose-900" htmlFor={`cancel-reason-${order._id}`}>Kaaran (hamari seva behtar karne ke liye)</label>
                    <select id={`cancel-reason-${order._id}`} value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} className="mt-1.5 min-h-11 w-full rounded-lg border border-rose-200 bg-white px-3 text-[13px] outline-none focus:border-rose-400">
                      {CANCEL_REASONS.map((reason) => <option key={reason} value={reason}>{reason}</option>)}
                    </select>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button type="button" onClick={() => void confirmCancel()} disabled={busyId === order._id} className="min-h-11 rounded-full bg-rose-700 px-5 text-[12.5px] font-semibold text-white disabled:opacity-50">{busyId === order._id ? "Cancel ho raha hai…" : "Ha, order cancel kare"}</button>
                      <button type="button" onClick={() => setCancelTarget(null)} disabled={busyId === order._id} className="min-h-11 rounded-full border border-rose-200 bg-white px-5 text-[12.5px] font-semibold text-rose-800">Nahi, order rakhe</button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 flex flex-wrap gap-2 border-t border-[#f0ebe3] pt-4">
                    <Link href={`/account/orders/${order._id}`} className="inline-flex min-h-11 items-center rounded-full border border-stone-300 bg-white px-4 text-[12px] font-semibold text-stone-700 hover:border-[#881337] hover:text-[#881337]">View details</Link>
                    {ACTIVE_STATUSES.includes(order.status) && <Link href={`/account/track?order=${encodeURIComponent(order.orderNumber)}`} className="inline-flex min-h-11 items-center rounded-full bg-[#881337] px-4 text-[12px] font-semibold text-white hover:bg-[#6b0f2b]">Track order</Link>}
                    {order.status === "delivered" && <Link href={`/account/returns?order=${order._id}`} className="inline-flex min-h-11 items-center rounded-full border border-stone-300 bg-white px-4 text-[12px] font-semibold text-stone-700 hover:border-[#881337] hover:text-[#881337]">Return / exchange</Link>}
                    {canBuyAgain && <button type="button" onClick={() => void buyAgain(order)} disabled={busyId === order._id} className="min-h-11 rounded-full border border-stone-300 bg-white px-4 text-[12px] font-semibold text-stone-700 disabled:opacity-50">{busyId === order._id ? "Bag me jod rahe…" : "Dobara bag me jode"}</button>}
                    {canCancel && <button type="button" onClick={() => { setCancelTarget(order); setCancelReason(CANCEL_REASONS[0]); }} className="min-h-11 rounded-full px-3 text-[12px] font-semibold text-rose-700 hover:bg-rose-50">Cancel order</button>}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
