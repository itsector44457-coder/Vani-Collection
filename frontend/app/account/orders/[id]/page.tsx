"use client";

import Image from "next/image";
import Link from "next/link";
import { use, useEffect, useState } from "react";
import { Badge, ButtonGhost, ButtonPrimary, Card, PageHeader } from "@/lib/account-ui";
import { ApiError, api, isApiConfigured } from "@/lib/api-client";
import { addCartItem, cancelOrder, createOrderPaymentSession, getOrder, loadRazorpay, verifyRazorpayPayment } from "@/lib/storefront-api";
import { useCart } from "@/context/CartContext";
import { orderStatusLabel, type OrderAddress, type OrderLine, type StoreOrder } from "@/lib/storefront-types";

const FLOW = ["pending_payment", "confirmed", "processing", "packed", "shipped", "delivered"];
const CANCELABLE = ["pending_payment", "confirmed"];
const CANCEL_REASONS = ["Size galat chuna tha", "Address/phone galat hai", "Ab zarurat nahi hai", "Duplicate order ban gaya", "Koi aur kaaran"];

const statusTone = (status: string) =>
  status === "delivered"
    ? "success"
    : status === "shipped" || status === "packed"
      ? "info"
      : status === "cancelled" || status === "refunded" || status === "returned"
        ? "danger"
        : "warning";

const money = (value: number) => `₹${value.toLocaleString("en-IN")}`;
const paymentStatusLabel = (status?: string) => ({
  pending: "Payment pending",
  authorized: "Payment authorized",
  paid: "Paid",
  failed: "Payment failed",
  expired: "Payment expired",
  refunded: "Refunded",
}[status ?? ""] ?? "Unavailable");
const paymentStatusTone = (status?: string) => status === "paid"
  ? "success"
  : status === "failed" || status === "expired"
    ? "danger"
    : status === "refunded"
      ? "info"
      : "warning";

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const live = isApiConfigured();
  const [order, setOrder] = useState<StoreOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState(CANCEL_REASONS[0]);
  const [paying, setPaying] = useState(false);
  const [buyingAgain, setBuyingAgain] = useState(false);
  const { refreshCart, setIsCartOpen } = useCart();

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
    setError(null);
    try {
      setOrder(await cancelOrder(id, cancelReason));
      setCancelOpen(false);
      setNotice("Order cancel ho gaya hai. Prepaid refund aam taur par 5–7 working days me mool payment method par aata hai.");
    } catch (cause) {
      setError((cause as Error)?.message || "Order cancel nahi ho paya. Kripya support se sampark kare.");
    } finally {
      setBusy(false);
    }
  };

  const handleResumePayment = async () => {
    if (!order || paying) return;
    setPaying(true);
    setError(null);
    setNotice(null);
    try {
      const payment = await createOrderPaymentSession(order._id);
      const ready = await loadRazorpay();
      if (!ready || !window.Razorpay) {
        setError("Payment window nahi khul paya. Connection jaanch kar dobara koshish kare — naya order nahi banega.");
        setPaying(false);
        return;
      }
      const shippingAddress = order.shippingAddress;
      const checkout = new window.Razorpay({
        key: payment.keyId,
        amount: payment.amount,
        currency: payment.currency,
        name: "Demo Collection",
        description: `Order ${order.orderNumber}`,
        order_id: payment.id,
        prefill: { name: shippingAddress?.fullName ?? "", email: shippingAddress?.email ?? "", contact: shippingAddress?.phone ?? "" },
        notes: { orderNumber: order.orderNumber },
        theme: { color: "#881337" },
        handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          try {
            await verifyRazorpayPayment({ orderId: order._id, ...response });
            setOrder(await getOrder(order._id));
            setNotice("Payment safal ho gaya hai. Order confirm kar diya gaya hai.");
          } catch {
            setError("Payment ho sakta hai, lekin abhi pushti nahi mili. Kripya dobara payment na kare — email/order status kuch minute baad jaanche.");
          } finally {
            setPaying(false);
          }
        },
        modal: {
          ondismiss: () => {
            setPaying(false);
            setNotice("Payment adhura reh gaya hai. Isi order ke liye yahan se dobara payment ho sakta hai.");
          },
        },
      });
      checkout.open();
    } catch (cause) {
      setError((cause as Error)?.message || "Payment shuru nahi ho paya. Kripya dobara koshish kare.");
      setPaying(false);
    }
  };

  const handleBuyAgain = async () => {
    if (!order || buyingAgain) return;
    setBuyingAgain(true);
    setError(null);
    setNotice(null);
    const failed: string[] = [];
    let added = 0;
    for (const item of order.items) {
      try {
        await addCartItem(item.sku, item.quantity);
        added += 1;
      } catch {
        failed.push(item.name ?? item.sku);
      }
    }
    setBuyingAgain(false);
    if (added) {
      refreshCart();
      setIsCartOpen(true);
      setNotice(failed.length ? `Kuch items bag me jod diye gaye hain. Yeh abhi uplabdh nahi hai: ${failed.join(", ")}.` : "Saare items dobara bag me jod diye gaye hain.");
    } else {
      setError(`Koi item abhi uplabdh nahi hai: ${failed.join(", ")}.`);
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

  const status = order?.status ?? "pending_payment";
  const reachedIndex = Math.max(0, FLOW.indexOf(status));
  const isCancelled = ["cancelled", "refunded", "returned", "return_requested"].includes(status);
  const placedOn = order
    ? new Date(order.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" })
    : "";
  const eta = order?.shipment?.estimatedDelivery
    ? new Date(order.shipment.estimatedDelivery).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : null;
  const items: OrderLine[] = order?.items ?? [];
  const amounts = order?.amounts ?? { subtotal: 0, discount: 0, shipping: 0, total: 0, tax: 0 };
  const address: OrderAddress | undefined = order?.shippingAddress;
  const paymentMethod = order ? (order.payment.method === "cod" ? "Cash on Delivery" : "Online payment (Razorpay)") : "";
  const canResumePayment = Boolean(order && order.status === "pending_payment" && order.payment.method === "razorpay" && ["pending", "failed"].includes(order.payment.status));
  const canBuyAgain = Boolean(order && ["delivered", "cancelled", "returned", "refunded"].includes(order.status));
  const history = [...(order?.statusHistory ?? [])].reverse();

  if (!live) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
        Order details are unavailable because the storefront API is not configured.
      </div>
    );
  }

  if (live && !order && !error) {
    return (
      <div className="space-y-4">
        <div className="h-24 animate-pulse rounded-2xl bg-white ring-1 ring-[#ebe6de]" />
        <div className="h-64 animate-pulse rounded-2xl bg-white ring-1 ring-[#ebe6de]" />
      </div>
    );
  }

  if (live && !order && error) {
    return (
      <div className="space-y-4">
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
        <Link href="/account/orders" className="text-sm font-semibold text-[#881337] hover:underline">
          ← Back to orders
        </Link>
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
        subtitle={placedOn ? `Placed on ${placedOn}` : "Order details"}
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
              ) : eta ? (
                <>
                  Estimated delivery by <span className="font-semibold text-stone-900">{eta}</span>
                </>
              ) : status === "delivered" ? (
                "Yeh order delivered ho chuka hai."
              ) : status === "shipped" ? (
                "Parcel dispatch ho chuka hai — AWB jaankari jald yahan aur email par milegi."
              ) : (
                "Dispatch aam taur par 2–3 working days me hota hai. AWB milte hi tracking yahan dikhegi."
              )}
            </p>
          </>
        )}
      </Card>

      {history.length > 0 && (
        <Card title="Order history" className="mb-5">
          <ol className="space-y-4">
            {history.map((entry, index) => (
              <li key={`${entry.status}-${entry.at}-${index}`} className="relative flex gap-3">
                <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${index === 0 ? "bg-[#881337] text-white" : "bg-stone-100 text-stone-400"}`}>✓</span>
                <span>
                  <span className="block text-[13px] font-semibold text-stone-900">{orderStatusLabel(entry.status)}</span>
                  <span className="mt-0.5 block text-[11.5px] text-stone-500">{new Date(entry.at).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" })}{entry.note ? ` · ${entry.note}` : ""}</span>
                </span>
              </li>
            ))}
          </ol>
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        {/* Items */}
        <Card title="Items in this order">
          <ul className="divide-y divide-[#f0ebe3]">
            {items.map((item) => (
              <li key={item.sku} className="flex items-start gap-4 py-4 first:pt-0 last:pb-0">
                <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-[#faf7f2] to-[#f0ebe3] text-[20px] font-bold text-[#881337] ring-1 ring-[#ebe6de]">
                  {item.image ? <Image src={item.image} alt="" fill unoptimized sizes="64px" className="object-cover object-top" /> : (item.name ?? item.sku).charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-semibold text-stone-900">{item.name ?? item.sku}</p>
                  <p className="mt-0.5 text-[11.5px] text-stone-500">
                    SKU {item.sku}
                    {item.size ? ` · Size ${item.size}` : ""}{item.color ? ` · ${item.color}` : ""} · Qty {item.quantity}
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
            {(amounts.giftFee ?? 0) > 0 && (
              <div className="mt-2 flex justify-between text-[12.5px] text-amber-900">
                <span>Gift packaging</span>
                <span>{money(amounts.giftFee ?? 0)}</span>
              </div>
            )}
            <div className="mt-3 flex justify-between border-t border-[#f0ebe3] pt-3 text-[15px] font-semibold">
              <span>Total</span>
              <span>{money(amounts.total)}</span>
            </div>
          </div>
        </Card>

        {/* Sidebar */}
        <div className="space-y-5">
          <Card title="Shipping address">
            <p className="text-[13px] font-semibold text-stone-900">{address?.fullName ?? "—"}</p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-stone-600">
              {address?.line1}
              {address?.line2 && (
                <>
                  <br />
                  {address.line2}
                </>
              )}
              <br />
              {[address?.city, address?.state, address?.pincode].filter(Boolean).join(", ")}
              <br />
              {address?.phone}
            </p>
          </Card>

          <Card title="Payment">
            <p className="text-[12.5px] text-stone-600">{paymentMethod}</p>
            <div className="mt-2 flex items-center gap-2">
              <Badge tone={paymentStatusTone(order?.payment.status)} dot>
                {paymentStatusLabel(order?.payment.status)}
              </Badge>
            </div>
            {order?.payment.status === "expired" && (
              <p className="mt-3 text-[12px] leading-relaxed text-rose-800">Payment ka samay khatm ho gaya aur reserved stock chhod diya gaya hai. Khareed ke liye kripya naya order bane.</p>
            )}
            {order?.status === "cancelled" && order.payment.status === "paid" && (
              <p className="mt-3 text-[12px] leading-relaxed text-rose-800">Is cancelled order par payment record mila hai. Dobara payment na kare — refund jaanch ke liye support se sampark kare.</p>
            )}
            {canResumePayment && (
              <>
                <p className="mt-3 text-[12px] leading-relaxed text-amber-800">Is order ka online payment adhura hai. Yahi se payment pura kare — naya order nahi banega.</p>
                <ButtonPrimary onClick={() => void handleResumePayment()} disabled={paying} className="mt-3 w-full">
                  {paying ? "Payment khul raha hai…" : "Payment pura kare"}
                </ButtonPrimary>
              </>
            )}
          </Card>

          <Card title="Need help?">
            <p className="text-[12.5px] text-stone-600">Questions about this order? We&apos;re here to help.</p>
            <div className="mt-4 flex flex-col gap-2">
              <Link href="/contact" className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#881337] px-5 py-2.5 text-[12.5px] font-semibold text-white transition hover:bg-[#6b0f2b] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#881337]/25">
                Contact support
              </Link>
              {order?.status === "delivered" && (
                <>
                  <Link href="/account/reviews" className="inline-flex min-h-11 items-center justify-center rounded-full border border-stone-300 bg-white px-5 py-2.5 text-[12.5px] font-semibold text-stone-700 transition hover:border-[#881337] hover:text-[#881337]">Review likhe</Link>
                  <Link href={`/account/returns?order=${order._id}`} className="inline-flex min-h-11 items-center justify-center rounded-full border border-stone-300 bg-white px-5 py-2.5 text-[12.5px] font-semibold text-stone-700 transition hover:border-[#881337] hover:text-[#881337]">Return / size exchange</Link>
                </>
              )}
              {canBuyAgain && (
                <ButtonGhost onClick={() => void handleBuyAgain()} disabled={buyingAgain}>
                  {buyingAgain ? "Bag me jod rahe…" : "Dobara bag me jode"}
                </ButtonGhost>
              )}
              {live && order && CANCELABLE.includes(order.status) && !cancelOpen && (
                <ButtonGhost onClick={() => setCancelOpen(true)} disabled={busy || paying}>
                  Cancel order
                </ButtonGhost>
              )}
              {live && order && CANCELABLE.includes(order.status) && cancelOpen && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4" role="group" aria-label="Order cancel confirm kare">
                  <p className="text-[12.5px] font-semibold text-rose-900">Pakka cancel karna hai?</p>
                  <label className="mt-3 block text-[11.5px] font-semibold text-rose-900" htmlFor="order-cancel-reason">Kaaran</label>
                  <select id="order-cancel-reason" value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} className="mt-1.5 min-h-11 w-full rounded-lg border border-rose-200 bg-white px-3 text-[12.5px] outline-none focus:border-rose-400">
                    {CANCEL_REASONS.map((reason) => <option key={reason} value={reason}>{reason}</option>)}
                  </select>
                  <button type="button" onClick={() => void handleCancel()} disabled={busy} className="mt-3 min-h-11 w-full rounded-full bg-rose-700 px-4 text-[12.5px] font-semibold text-white disabled:opacity-50">
                    {busy ? "Cancel ho raha hai…" : "Ha, order cancel kare"}
                  </button>
                  <button type="button" onClick={() => setCancelOpen(false)} disabled={busy} className="mt-2 min-h-11 w-full rounded-full border border-rose-200 bg-white px-4 text-[12.5px] font-semibold text-rose-800">
                    Nahi, order rakhe
                  </button>
                </div>
              )}
              {/* Invoices are generated only for real backend orders. */}
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
