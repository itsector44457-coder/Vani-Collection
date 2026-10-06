"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { Badge, ButtonGhost, ButtonPrimary, Card, PageHeader } from "@/lib/account-ui";
import { ApiError, api, isApiConfigured } from "@/lib/api-client";
import { cancelOrder, getOrder } from "@/lib/storefront-api";
import { orderStatusLabel, type OrderAddress, type OrderLine, type StoreOrder } from "@/lib/storefront-types";

/* Fallback so the page still renders when the backend is not configured. */
const DEMO_ADDRESS: OrderAddress = {
  fullName: "Priya Sharma",
  phone: "+91 98XXX 12345",
  line1: "42, Vasant Vihar",
  city: "New Delhi",
  state: "Delhi",
  pincode: "110057",
};

const DEMO_ORDER = {
  number: "VC-4821",
  date: "12 Oct 2024, 4:32 PM",
  status: "Shipped",
  eta: "16 Oct 2024",
  address: DEMO_ADDRESS,
  payment: { method: "UPI", status: "Paid", subtotal: 4299, discount: 0, shipping: 0, total: 4299 },
  items: [
    { name: "Gulab Bagh Handblock Mul Cotton Saree", size: "Free Size", quantity: 1, unitPrice: 2499, lineTotal: 2499, sku: "VC-1042" },
    { name: "Madhubani Handpainted Dupatta", size: "Free Size", quantity: 1, unitPrice: 1800, lineTotal: 1800, sku: "VC-0972" },
  ],
};

const FLOW = ["pending_payment", "confirmed", "processing", "packed", "shipped", "delivered"];
const CANCELABLE = ["pending_payment", "confirmed", "processing"];

const statusTone = (status: string) =>
  status === "delivered"
    ? "success"
    : status === "shipped" || status === "packed"
      ? "info"
      : status === "cancelled" || status === "refunded" || status === "returned"
        ? "danger"
        : "warning";

const money = (value: number) => `₹${value.toLocaleString("en-IN")}`;

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const live = isApiConfigured();
  const [order, setOrder] = useState<StoreOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!live) return;
    const controller = new AbortController();
    getOrder(id, controller.signal)
      .then((result) => {
        setOrder(result);
        setError(null);
      })
      .catch((cause: unknown) => {
        if ((cause as Error)?.name === "AbortError") return;
        setError((cause as Error)?.message || "We could not find this order.");
      });
    return () => controller.abort();
  }, [id, live]);

  const handleCancel = async () => {
    setBusy(true);
    setNotice(null);
    try {
      setOrder(await cancelOrder(id, "Cancelled from the customer account"));
      setNotice("Order cancelled. Prepaid refunds arrive in 5–7 working days.");
    } catch (cause) {
      setNotice((cause as Error)?.message || "We could not cancel this order. Please contact support.");
    } finally {
      setBusy(false);
    }
  };

  /**
   * The GST invoice is generated server-side from the order snapshot, so it always shows what was
   * actually charged. Downloaded as a blob because the API client's JSON path would corrupt a PDF.
   */
  const handleDownloadInvoice = async () => {
    setDownloading(true);
    setError(null);
    try {
      await api.downloadInvoice(id);
    } catch (cause) {
      setError(
        cause instanceof ApiError && cause.status === 404
          ? "We could not find an invoice for this order."
          : cause instanceof Error
            ? cause.message
            : "We could not download the invoice. Please try again."
      );
    } finally {
      setDownloading(false);
    }
  };

  const status = order?.status ?? (live ? "pending_payment" : "shipped");
  const reachedIndex = Math.max(0, FLOW.indexOf(status));
  const isCancelled = ["cancelled", "refunded", "returned", "return_requested"].includes(status);
  const placedOn = order
    ? new Date(order.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" })
    : DEMO_ORDER.date;
  const eta = order?.shipment?.estimatedDelivery
    ? new Date(order.shipment.estimatedDelivery).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : DEMO_ORDER.eta;
  const items: OrderLine[] = order?.items ?? DEMO_ORDER.items;
  const amounts = order?.amounts ?? { subtotal: DEMO_ORDER.payment.subtotal, discount: 0, shipping: 0, total: DEMO_ORDER.payment.total, tax: 0 };
  const address = order?.shippingAddress ?? DEMO_ORDER.address;
  const paymentMethod = order ? (order.payment.method === "cod" ? "Cash on Delivery" : "Paid online") : DEMO_ORDER.payment.method;

  if (live && !order && !error) {
    return (
      <div className="space-y-4">
        <div className="h-24 animate-pulse rounded-2xl bg-white ring-1 ring-[#ebe6de]" />
        <div className="h-64 animate-pulse rounded-2xl bg-white ring-1 ring-[#ebe6de]" />
      </div>
    );
  }

  return (
    <>
      <div className="mb-4">
        <Link href="/account/orders" className="text-[12px] font-semibold text-stone-500 hover:text-stone-800">
          ← Back to orders
        </Link>
      </div>

      <PageHeader
        eyebrow={`Order #${order?.orderNumber ?? id}`}
        title="Order Details"
        subtitle={`Placed on ${placedOn}`}
        action={
          <Badge tone={statusTone(status) as never} dot>
            {orderStatusLabel(status)}
          </Badge>
        }
      />

      {error && (
        <p className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[12.5px] text-rose-700">{error}</p>
      )}
      {notice && (
        <p className="mb-5 rounded-xl border border-[#ebe6de] bg-white px-4 py-3 text-[12.5px] text-stone-700">{notice}</p>
      )}

      {/* Progress tracker */}
      <Card className="mb-5">
        {isCancelled ? (
          <p className="text-center text-[12.5px] text-rose-700">
            This order was {orderStatusLabel(status).toLowerCase()}. Prepaid refunds are credited within 5–7 working days.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-4 gap-2">
              {["Ordered", "Packed", "Shipped", "Delivered"].map((step, index) => {
                const thresholds = [1, 4, 5, 6];
                const active = reachedIndex >= thresholds[index] - 1;
                return (
                  <div key={step} className="flex flex-col items-center text-center">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold ${
                        active ? "bg-[#881337] text-white" : "bg-stone-100 text-stone-400"
                      }`}
                    >
                      {active ? "✓" : index + 1}
                    </div>
                    <p className={`mt-2 text-[11.5px] font-medium ${active ? "text-[#881337]" : "text-stone-400"}`}>{step}</p>
                  </div>
                );
              })}
            </div>
            <p className="mt-5 text-center text-[12.5px] text-stone-600">
              {order?.shipment?.awb ? (
                <>
                  {order.shipment.courier ?? "Courier"} · AWB <span className="font-semibold text-stone-900">{order.shipment.awb}</span>
                  {order.shipment.trackingUrl && (
                    <>
                      {" · "}
                      <a href={order.shipment.trackingUrl} target="_blank" rel="noreferrer" className="font-semibold underline">
                        live tracking
                      </a>
                    </>
                  )}
                </>
              ) : (
                <>
                  Estimated delivery by <span className="font-semibold text-stone-900">{eta}</span>
                </>
              )}
            </p>
          </>
        )}
      </Card>

      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        {/* Items */}
        <Card title="Items in this order">
          <ul className="divide-y divide-[#f0ebe3]">
            {items.map((item) => (
              <li key={item.sku} className="flex items-start gap-4 py-4 first:pt-0 last:pb-0">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#faf7f2] to-[#f0ebe3] text-[20px] font-bold text-[#881337] ring-1 ring-[#ebe6de]">
                  {(item.name ?? item.sku).charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-semibold text-stone-900">{item.name ?? item.sku}</p>
                  <p className="mt-0.5 text-[11.5px] text-stone-500">
                    SKU {item.sku}
                    {item.size ? ` · Size ${item.size}` : ""} · Qty {item.quantity}
                  </p>
                  <p className="mt-2 text-[13px] font-semibold">{money(item.lineTotal)}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-5 border-t border-[#f0ebe3] pt-4">
            <div className="flex justify-between text-[12.5px] text-stone-600">
              <span>Subtotal</span>
              <span>{money(amounts.subtotal)}</span>
            </div>
            {amounts.discount > 0 && (
              <div className="mt-2 flex justify-between text-[12.5px] text-emerald-700">
                <span>Discount{order?.couponCode ? ` (${order.couponCode})` : ""}</span>
                <span>−{money(amounts.discount)}</span>
              </div>
            )}
            <div className="mt-2 flex justify-between text-[12.5px] text-stone-600">
              <span>Shipping</span>
              <span className={amounts.shipping === 0 ? "font-semibold text-emerald-600" : ""}>
                {amounts.shipping === 0 ? "FREE" : money(amounts.shipping)}
              </span>
            </div>
            <div className="mt-3 flex justify-between border-t border-[#f0ebe3] pt-3 text-[15px] font-semibold">
              <span>Total</span>
              <span>{money(amounts.total)}</span>
            </div>
          </div>
        </Card>

        {/* Sidebar */}
        <div className="space-y-5">
          <Card title="Shipping address">
            <p className="text-[13px] font-semibold text-stone-900">{address.fullName ?? "—"}</p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-stone-600">
              {address.line1}
              {address.line2 && (
                <>
                  <br />
                  {address.line2}
                </>
              )}
              <br />
              {[address.city, address.state, address.pincode].filter(Boolean).join(", ")}
              <br />
              {address.phone}
            </p>
          </Card>

          <Card title="Payment">
            <p className="text-[12.5px] text-stone-600">{paymentMethod}</p>
            <div className="mt-2 flex items-center gap-2">
              <Badge tone={order?.payment.status === "paid" ? "success" : "warning"} dot>
                {order ? order.payment.status : DEMO_ORDER.payment.status}
              </Badge>
            </div>
          </Card>

          <Card title="Need help?">
            <p className="text-[12.5px] text-stone-600">Questions about this order? We&apos;re here to help.</p>
            <div className="mt-4 flex flex-col gap-2">
              <ButtonPrimary>Contact support</ButtonPrimary>
              {live && order && CANCELABLE.includes(order.status) && (
                <ButtonGhost onClick={() => void handleCancel()} disabled={busy}>
                  {busy ? "Cancelling…" : "Cancel order"}
                </ButtonGhost>
              )}
              {/* Only meaningful against a real order: the demo has nothing to generate from. */}
              {live && order && (
                <ButtonGhost onClick={() => void handleDownloadInvoice()} disabled={downloading}>
                  {downloading ? "Preparing invoice…" : "Download invoice"}
                </ButtonGhost>
              )}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
