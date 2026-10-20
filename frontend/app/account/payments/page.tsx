"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge, Card, EmptyState, IconCard, PageHeader } from "@/lib/account-ui";
import { useAuth } from "@/context/AuthContext";
import { isApiConfigured } from "@/lib/api-client";
import type { StoreOrder } from "@/lib/storefront-types";
import { orderStatusLabel } from "@/lib/storefront-types";
import { useMyOrders } from "@/lib/use-storefront";

type PaymentFilter = "all" | "online" | "cod" | "action" | "refunded";
type Tone = "success" | "neutral" | "gold" | "warning" | "danger" | "info";

const money = (value: number) => `₹${value.toLocaleString("en-IN")}`;
const formatDate = (value?: string) => value
  ? new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
  : "—";
const formatDateTime = (value?: string) => value
  ? new Date(value).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" })
  : "—";

const maskReference = (value?: string) => {
  if (!value) return "";
  return value.length <= 8 ? value : `${value.slice(0, 4)}…${value.slice(-6)}`;
};

const paymentMeta = (order: StoreOrder): { label: string; tone: Tone; note: string; needsAction: boolean; refunded: boolean } => {
  const refunded = order.payment.status === "refunded" || order.status === "refunded";
  if (refunded) {
    return {
      label: "Refunded",
      tone: "info",
      note: "Refund status order record ke anusar hai. Asal refund rakam aur reference order/return detail me dekhe.",
      needsAction: false,
      refunded: true,
    };
  }

  if (order.payment.method === "cod") {
    if (order.status === "cancelled") {
      return { label: "Kuch dena nahi", tone: "neutral", note: "Order cancel hai, isliye COD rakam deni nahi hai.", needsAction: false, refunded: false };
    }
    if (["delivered", "return_requested", "returned"].includes(order.status) || order.statusHistory?.some((entry) => entry.status === "delivered")) {
      return { label: "COD — delivery complete", tone: "success", note: "COD rakam delivery ke samay courier ko di jati hai.", needsAction: false, refunded: false };
    }
    return { label: "Delivery par dena hai", tone: "gold", note: "Order milne par kul rakam cash/UPI se courier ko de.", needsAction: false, refunded: false };
  }

  if (order.payment.status === "expired") {
    return { label: "Payment expired", tone: "danger", note: "Online payment nirdharit samay me poora nahi hua, isliye reservation khatm karke stock chhod diya gaya. Khareed ke liye naya order bane.", needsAction: false, refunded: false };
  }
  if (order.status === "cancelled" && order.payment.status === "paid") {
    return { label: "Refund jaanch baaki hai", tone: "danger", note: "Is cancelled order par online payment record hai. Refund sthiti ke liye order detail aur support se pushti kare.", needsAction: true, refunded: false };
  }
  if (order.payment.status === "paid") {
    return { label: "Paid", tone: "success", note: "Online payment Razorpay dwara safal roop se liya gaya hai.", needsAction: false, refunded: false };
  }
  if (order.payment.status === "authorized") {
    return { label: "Payment authorized", tone: "info", note: "Payment authorized hai; final capture status order detail me update hoga.", needsAction: order.status === "pending_payment", refunded: false };
  }
  if (order.payment.status === "failed") {
    return { label: "Payment failed", tone: "danger", note: "Payment poora nahi hua. Order detail se dobara koshish kar sakte hai, yadi order ab bhi pending hai.", needsAction: order.status === "pending_payment", refunded: false };
  }
  if (order.status === "pending_payment") {
    return { label: "Payment baaki hai", tone: "warning", note: "Order confirm karne ke liye online payment poora kare.", needsAction: true, refunded: false };
  }
  return { label: "Payment pending", tone: "warning", note: "Payment status abhi confirm nahi hai.", needsAction: false, refunded: false };
};

const methodLabel = (order: StoreOrder) => order.payment.method === "cod" ? "Cash on Delivery" : "Razorpay online";

export default function PaymentsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const live = isApiConfigured();
  const { data: orders, loading, error, refresh } = useMyOrders(isAuthenticated);
  const [filter, setFilter] = useState<PaymentFilter>("all");
  const [query, setQuery] = useState("");

  const sortedOrders = useMemo(() => [...orders].sort((a, b) => new Date(b.payment.paidAt ?? b.createdAt).getTime() - new Date(a.payment.paidAt ?? a.createdAt).getTime()), [orders]);

  const summary = useMemo(() => {
    const onlinePaid = sortedOrders.filter((order) => order.payment.method !== "cod" && ["paid", "refunded"].includes(order.payment.status));
    const actionNeeded = sortedOrders.filter((order) => paymentMeta(order).needsAction);
    const refunded = sortedOrders.filter((order) => paymentMeta(order).refunded);
    const codDue = sortedOrders.filter((order) => paymentMeta(order).label === "Delivery par dena hai");
    return {
      onlinePaidTotal: onlinePaid.reduce((sum, order) => sum + order.amounts.total, 0),
      onlinePaidCount: onlinePaid.length,
      actionNeeded,
      refunded,
      codDueTotal: codDue.reduce((sum, order) => sum + order.amounts.total, 0),
      codDueCount: codDue.length,
    };
  }, [sortedOrders]);

  const counts: Record<PaymentFilter, number> = {
    all: sortedOrders.length,
    online: sortedOrders.filter((order) => order.payment.method !== "cod").length,
    cod: sortedOrders.filter((order) => order.payment.method === "cod").length,
    action: summary.actionNeeded.length,
    refunded: summary.refunded.length,
  };

  const visibleOrders = sortedOrders.filter((order) => {
    const meta = paymentMeta(order);
    const matchesFilter = filter === "all"
      || (filter === "online" && order.payment.method !== "cod")
      || (filter === "cod" && order.payment.method === "cod")
      || (filter === "action" && meta.needsAction)
      || (filter === "refunded" && meta.refunded);
    if (!matchesFilter) return false;
    const term = query.trim().toLowerCase();
    if (!term) return true;
    return [order.orderNumber, order.payment.providerPaymentId, methodLabel(order), meta.label, ...order.items.map((item) => item.name ?? item.sku)]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(term));
  });

  return (
    <>
      <PageHeader
        eyebrow="Billing"
        title="Payments"
        subtitle="Orders ke saath jude asal payment records yahi milenge. Card ya UPI details Vani Collection save nahi karti."
      />

      <div aria-live="polite">
        {!live && <p className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12.5px] text-amber-800">Payment history uplabdh nahi hai.</p>}
        {live && !authLoading && !isAuthenticated && <p className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12.5px] text-amber-800">Payment history dekhne ke liye sign in kare.</p>}
        {error && (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[12.5px] text-rose-700">
            <span>Payment history load nahi ho payi: {error}</span>
            <button type="button" onClick={refresh} className="min-h-10 font-semibold underline">Retry</button>
          </div>
        )}
      </div>

      <section aria-label="Payment summary" className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-[#ebe6de] bg-white p-4">
          <p className="font-serif text-xl font-semibold text-stone-900">{money(summary.onlinePaidTotal)}</p>
          <p className="mt-1 text-[12px] leading-relaxed text-stone-500">Online paid orders ki kul rakam · {summary.onlinePaidCount} orders</p>
        </div>
        <div className="rounded-2xl border border-[#ebe6de] bg-white p-4">
          <p className="font-serif text-xl font-semibold text-stone-900">{summary.actionNeeded.length}</p>
          <p className="mt-1 text-[12px] leading-relaxed text-stone-500">Payment poora karne wale orders</p>
        </div>
        <div className="rounded-2xl border border-[#ebe6de] bg-white p-4">
          <p className="font-serif text-xl font-semibold text-stone-900">{money(summary.codDueTotal)}</p>
          <p className="mt-1 text-[12px] leading-relaxed text-stone-500">COD par delivery ke samay deni hai · {summary.codDueCount} orders</p>
        </div>
        <div className="rounded-2xl border border-[#ebe6de] bg-white p-4">
          <p className="font-serif text-xl font-semibold text-stone-900">{summary.refunded.length}</p>
          <p className="mt-1 text-[12px] leading-relaxed text-stone-500">Refund status wale orders</p>
        </div>
      </section>

      <Card title="Saved payment methods" description="Suraksha ke liye card, UPI ID ya bank detail hamare server par save nahi hoti." className="mb-6">
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#faf7f2] text-[#881337] ring-1 ring-[#ebe6de]"><IconCard /></div>
          <div className="min-w-0 flex-1 text-[13px] leading-relaxed text-stone-600">
            <p><strong className="text-stone-900">Koi saved card/UPI nahi hai.</strong> Online payment har baar Razorpay ke secure checkout par hota hai. COD order me koi payment detail pehle deni nahi padti.</p>
            <p className="mt-2">Payment fail ho jaye to pehle niche same order ka status dekhe; dobara payment tabhi kare jab order ab bhi pending dikh raha ho.</p>
          </div>
        </div>
      </Card>

      <section aria-labelledby="payment-history-heading">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="payment-history-heading" className="font-serif text-[20px] font-semibold text-stone-900">Payment history</h2>
            <p className="mt-1 text-[12.5px] text-stone-500">Har record ek order se juda hai — invoice order detail me milega.</p>
          </div>
          <div className="w-full sm:w-64">
            <label htmlFor="payment-search" className="sr-only">Order ya payment khoje</label>
            <input id="payment-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Order / payment ID khoje…" className="min-h-11 w-full rounded-full border border-stone-300 bg-white px-4 text-[13px] outline-none focus:border-[#881337] focus:ring-2 focus:ring-[#881337]/15" />
          </div>
        </div>

        <div className="mb-5 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Payment filter">
          {(["all", "online", "cod", "action", "refunded"] as const).map((item) => (
            <button key={item} type="button" role="tab" aria-selected={filter === item} onClick={() => setFilter(item)} className={`min-h-11 shrink-0 rounded-full px-4 text-[12px] font-semibold ring-1 ${filter === item ? "bg-[#881337] text-white ring-[#881337]" : "bg-white text-stone-600 ring-stone-300"}`}>
              {item === "all" ? "Sab" : item === "online" ? "Online" : item === "cod" ? "COD" : item === "action" ? "Action chahiye" : "Refunded"} · {counts[item]}
            </button>
          ))}
        </div>

        {loading || authLoading ? (
          <div className="space-y-4" aria-label="Payment history load ho rahi hai">
            {[0, 1, 2].map((item) => <div key={item} className="h-36 animate-pulse rounded-2xl border border-[#ebe6de] bg-white" />)}
          </div>
        ) : sortedOrders.length === 0 ? (
          <EmptyState icon={<IconCard />} title="Abhi koi payment record nahi hai" description="Aapke orders ka online ya COD payment status yahi dikhega." action={<Link href="/products" className="inline-flex min-h-11 items-center rounded-full bg-[#881337] px-5 text-[12.5px] font-semibold text-white">Shopping shuru kare</Link>} />
        ) : visibleOrders.length === 0 ? (
          <Card>
            <p className="text-[13px] text-stone-600">Is filter/search me koi payment record nahi mila.</p>
            <button type="button" onClick={() => { setFilter("all"); setQuery(""); }} className="mt-2 min-h-10 text-[12.5px] font-semibold text-[#881337] hover:underline">Filter saaf kare</button>
          </Card>
        ) : (
          <div className="space-y-4">
            {visibleOrders.map((order) => {
              const meta = paymentMeta(order);
              const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
              return (
                <Card key={order._id}>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-[15px] font-semibold text-stone-900">Order #{order.orderNumber}</h3>
                        <Badge tone={meta.tone} dot>{meta.label}</Badge>
                        <Badge tone="neutral">{methodLabel(order)}</Badge>
                      </div>
                      <p className="mt-1.5 text-[12px] leading-relaxed text-stone-500">
                        Order: {formatDate(order.createdAt)} · Status: {orderStatusLabel(order.status)} · {itemCount} item{itemCount === 1 ? "" : "s"}
                      </p>
                      {order.payment.paidAt && <p className="mt-0.5 text-[12px] text-stone-500">Paid: {formatDateTime(order.payment.paidAt)}</p>}
                      {order.payment.providerPaymentId && <p className="mt-0.5 text-[12px] text-stone-500">Payment ref: <span className="break-all font-medium text-stone-700">{maskReference(order.payment.providerPaymentId)}</span></p>}
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] font-medium text-stone-500">Order amount</p>
                      <p className="font-serif text-[21px] font-semibold text-stone-900">{money(order.amounts.total)}</p>
                      {order.couponCode && <p className="text-[11px] text-stone-500">Coupon: {order.couponCode}</p>}
                    </div>
                  </div>

                  <p className="mt-4 rounded-xl bg-[#faf7f2] px-4 py-3 text-[12.5px] leading-relaxed text-stone-600">{meta.note}</p>

                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#f0ebe3] pt-4">
                    {meta.needsAction && (
                      <Link href={`/account/orders/${order._id}`} className="inline-flex min-h-11 items-center rounded-full bg-[#881337] px-5 text-[12.5px] font-semibold text-white hover:bg-[#701a35]">Payment poora kare</Link>
                    )}
                    <Link href={`/account/orders/${order._id}`} className="inline-flex min-h-11 items-center rounded-full border border-stone-300 px-5 text-[12.5px] font-semibold text-stone-700 hover:border-[#881337] hover:text-[#881337]">Order aur invoice dekhe</Link>
                    {meta.refunded && <Link href="/account/returns" className="inline-flex min-h-11 items-center px-3 text-[12.5px] font-semibold text-[#881337] hover:underline">Return detail dekhe</Link>}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <p className="mt-6 rounded-2xl border border-[#ebe6de] bg-[#faf7f2] px-4 py-3 text-[12.5px] leading-relaxed text-stone-600">
        Payment kat gaya ho lekin yaha pending dikh raha ho, to turant dobara pay na kare. Order number aur payment reference ke saath{" "}
        <Link href="/contact" className="font-semibold text-[#881337] hover:underline">support se sampark kare</Link>.
      </p>
    </>
  );
}
