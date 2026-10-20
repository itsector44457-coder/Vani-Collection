"use client";

import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { isApiConfigured } from "../../lib/api-client";
import { getOrder, readLastOrderSnapshot } from "../../lib/storefront-api";
import { SUPPORT_EMAIL } from "../../lib/seo";
import { whatsappShareUrl } from "../../lib/site-contact";
import { orderStatusLabel, type StoreOrder } from "../../lib/storefront-types";

const STEPS = [
  { label: "Order Confirmed", icon: "✓", statuses: ["pending_payment", "confirmed"] },
  { label: "Processing", icon: "⚙", statuses: ["processing", "packed"] },
  { label: "Dispatched", icon: "📦", statuses: ["shipped"] },
  { label: "Out for Delivery", icon: "🚚", statuses: [] },
  { label: "Delivered", icon: "🏠", statuses: ["delivered"] },
];

const ORDER_FLOW = ["pending_payment", "confirmed", "processing", "packed", "shipped", "delivered"];
const OBJECT_ID = /^[0-9a-f]{24}$/i;

function ConfirmationContent() {
  const params = useSearchParams();
  const orderId = params.get("orderId") ?? "VC-DEMO";
  const [order, setOrder] = useState<StoreOrder | null>(null);
  const [lookupNote, setLookupNote] = useState<string | null>(null);

  /*
   * Guest checkout cannot use the signed-in order API, so the confirmation first renders the
   * snapshot checkout saved in this browser session. When an account session exists, the API copy
   * then replaces it with live status; a failed lookup only becomes a note if there is no snapshot.
   */
  useEffect(() => {
    const snapshot = readLastOrderSnapshot(orderId);
    if (snapshot) {
      void Promise.resolve().then(() => setOrder(snapshot));
    }
    if (!isApiConfigured() || !OBJECT_ID.test(orderId)) return;
    const controller = new AbortController();
    getOrder(orderId, controller.signal)
      .then(setOrder)
      .catch((cause: unknown) => {
        if ((cause as Error)?.name === "AbortError" || snapshot) return;
        setLookupNote("Order ki pushti email par bhej di gayi hai. Kabhi bhi bina login kiye Track Order page par order number + mobile se sthiti dekh sakte hain.");
      });
    return () => controller.abort();
  }, [orderId]);

  const estimatedDate = order?.shipment?.estimatedDelivery ? new Date(order.shipment.estimatedDelivery) : null;
  const dateStr = estimatedDate
    ? estimatedDate.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })
    : "Dispatch: 2–3 working days";
  const reachedIndex = order ? Math.max(0, ORDER_FLOW.indexOf(order.status)) : 0;
  const isCancelled = order?.status === "cancelled" || order?.status === "refunded";

  return (
    <div className="min-h-screen bg-[#faf7f2] px-4 py-12">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* ── Success Animation ── */}
        <div className="text-center">
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-xl mb-6"
          >
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h1 className="font-serif text-3xl text-gray-900 mb-2">Order Placed!</h1>
            <p className="text-gray-500 text-sm">
              Thank you for shopping with Vani Collection 🌸
            </p>
          </motion.div>
        </div>

        {/* ── Order Card ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm"
        >
          <div className="bg-gradient-to-r from-[#1c1917] to-[#3d2012] px-6 py-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-[#dfc28c] font-semibold">Order ID</p>
              <p className="text-white font-mono text-lg font-bold mt-0.5">#{order?.orderNumber ?? orderId}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-[0.3em] text-white/50 font-semibold">{estimatedDate ? "Estimated Delivery" : "Next step"}</p>
              <p className="text-white text-sm font-medium mt-0.5">{dateStr}</p>
            </div>
          </div>

          <div className="p-6 space-y-5">
            {isCancelled && (
              <p className="rounded-xl bg-rose-50 px-4 py-3 text-xs text-rose-700 ring-1 ring-rose-200">
                This order was {orderStatusLabel(order?.status ?? "cancelled").toLowerCase()}. Refunds for prepaid orders
                reach your account in 5–7 working days.
              </p>
            )}

            {lookupNote && (
              <p className="rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-800 ring-1 ring-amber-200">{lookupNote}</p>
            )}

            {order && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Your pieces</h3>
                <ul className="divide-y divide-gray-100">
                  {order.items.map((item) => (
                    <li key={item.sku} className="flex items-center gap-3 py-3 first:pt-0">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-900">{item.name ?? item.sku}</p>
                        <p className="text-xs text-gray-500">
                          {[item.size, `Qty ${item.quantity}`, item.sku].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-gray-900">₹{item.lineTotal.toLocaleString("en-IN")}</p>
                    </li>
                  ))}
                </ul>
                <dl className="mt-3 space-y-1.5 border-t border-gray-100 pt-3 text-xs text-gray-600">
                  <div className="flex justify-between">
                    <dt>Subtotal</dt>
                    <dd>₹{order.amounts.subtotal.toLocaleString("en-IN")}</dd>
                  </div>
                  {order.amounts.discount > 0 && (
                    <div className="flex justify-between text-emerald-700">
                      <dt>Discount{order.couponCode ? ` (${order.couponCode})` : ""}</dt>
                      <dd>−₹{order.amounts.discount.toLocaleString("en-IN")}</dd>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <dt>Shipping</dt>
                    <dd>{order.amounts.shipping === 0 ? "Free" : `₹${order.amounts.shipping.toLocaleString("en-IN")}`}</dd>
                  </div>
                  <div className="flex justify-between border-t border-gray-100 pt-1.5 text-sm font-semibold text-gray-900">
                    <dt>Total</dt>
                    <dd>₹{order.amounts.total.toLocaleString("en-IN")}</dd>
                  </div>
                  <div className="flex justify-between pt-1">
                    <dt>Payment</dt>
                    <dd>
                      {order.payment.method === "cod" ? "Cash on Delivery" : "Paid online"} · {order.payment.status}
                    </dd>
                  </div>
                </dl>
              </div>
            )}

            {/* What happens next */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Order Journey</h3>
              <div className="relative">
                {/* Connector line */}
                <div className="absolute left-[15px] top-4 bottom-4 w-0.5 bg-gray-200" />
                <div className="space-y-5">
                  {STEPS.map((step, i) => {
                    const reached = order
                      ? step.statuses.some((status) => ORDER_FLOW.indexOf(status) <= reachedIndex && ORDER_FLOW.indexOf(status) >= 0)
                      : i === 0;
                    return (
                      <div key={step.label} className="flex items-center gap-4 relative">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm z-10 flex-shrink-0 ${
                          reached ? "bg-emerald-500 text-white shadow-md" : "bg-gray-100 text-gray-400"
                        }`}>
                          {step.icon}
                        </div>
                        <div>
                          <p className={`text-sm font-medium ${reached ? "text-emerald-700" : "text-gray-500"}`}>
                            {step.label}
                          </p>
                          {i === 0 && (
                            <p className="text-xs text-gray-400 mt-0.5">
                              {order ? orderStatusLabel(order.status) : "Just now — confirmation email sent"}
                            </p>
                          )}
                          {i === 1 && <p className="text-xs text-gray-400 mt-0.5">Quality check aur packing</p>}
                          {i === 2 && <p className="text-xs text-gray-400 mt-0.5">2–3 business days</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Royal Gift Confirmation */}
            {order?.giftOptions?.isGift && (
              <div className="bg-amber-50/90 rounded-xl p-4 border border-amber-200 text-sm space-y-2">
                <div className="flex items-center gap-2 text-amber-900 font-serif font-bold text-sm">
                  <svg className="w-4 h-4 text-amber-800 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 12 20 22 4 22 4 12" />
                    <rect x="2" y="7" width="20" height="5" />
                    <line x1="12" y1="22" x2="12" y2="7" />
                    <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
                    <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
                  </svg>
                  <span>Royal Atelier Gift Packaging Enclosed</span>
                </div>
                <div className="text-xs text-stone-700 space-y-1">
                  {order.giftOptions.recipientName && (
                    <p>To: <strong>{order.giftOptions.recipientName}</strong>{order.giftOptions.senderName ? ` · From: ${order.giftOptions.senderName}` : ""}</p>
                  )}
                  {order.giftOptions.message && (
                    <p className="italic text-stone-600 bg-white/80 p-2.5 rounded-lg border border-amber-200/60">
                      &ldquo;{order.giftOptions.message}&rdquo;
                    </p>
                  )}
                  <p className="text-[11px] text-amber-800 font-medium">
                    ✓ Hand-written gold calligraphy note card & rigid luxury gift box included.
                  </p>
                </div>
              </div>
            )}

            {/* Delivery Info */}
            <div className="bg-blue-50 rounded-xl p-4 text-sm space-y-1.5">
              <p className="font-semibold text-blue-900 text-xs uppercase tracking-wider mb-2">Delivery Details</p>
              <p className="text-blue-800 flex items-center gap-2">
                <span>📱</span> SMS & WhatsApp tracking updates will be sent
              </p>
              <p className="text-blue-800 flex items-center gap-2">
                <span>📧</span> Confirmation email aapke inbox me bheja gaya hai
              </p>
              <p className="text-blue-800 flex items-center gap-2">
                <span>🧾</span> Order number note kar le — tracking ke liye yahi + mobile lagega
              </p>
              <p className="text-blue-800 flex items-center gap-2">
                <span>🚚</span> Courier aur AWB dispatch ke baad bheja jayega
              </p>
            </div>

            {/* Help */}
            <div className="bg-amber-50 rounded-xl p-4 text-sm">
              <p className="font-semibold text-amber-900 text-xs uppercase tracking-wider mb-2">Need Help?</p>
              <p className="text-amber-800 text-xs leading-relaxed">
                Order me koi badlav ya sawaal ho to order number ke saath{" "}
                <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold underline">{SUPPORT_EMAIL}</a>{" "}
                par likhe, ya <Link href="/contact" className="font-semibold underline">Contact page</Link> se sampark kare. Mon–Sat, 10am–7pm.
              </p>
            </div>
          </div>
        </motion.div>

        {/* ── Actions ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-3"
        >
          <Link
            href={`/track-order?order=${encodeURIComponent(order?.orderNumber ?? "")}`}
            className="flex items-center justify-center gap-2 py-3 px-4 bg-[#881337] text-white rounded-xl font-semibold text-sm hover:bg-[#701a35] transition"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 7H4a2 2 0 00-2 2v6a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/>
            </svg>
            Track Order
          </Link>
          <Link
            href="/products"
            className="flex items-center justify-center gap-2 py-3 px-4 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-50 transition"
          >
            Continue Shopping
          </Link>
          <a
            href={whatsappShareUrl(`My Vani Collection order #${order?.orderNumber ?? orderId} is confirmed! Check it out.`)}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 text-white rounded-xl font-semibold text-sm hover:bg-emerald-700 transition"
          >
            <span>💬</span> Share on WhatsApp
          </a>
        </motion.div>

        {/* ── You may also like ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.75 }}
          className="text-center pt-4"
        >
          <p className="text-sm text-gray-500 mb-3">Complete your wardrobe</p>
          <Link
            href="/products"
            className="text-[#881337] text-sm font-semibold hover:underline"
          >
            Browse the full collection →
          </Link>
        </motion.div>
      </div>
    </div>
  );
}

export default function OrderConfirmationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#faf7f2] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#881337] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Loading your order...</p>
        </div>
      </div>
    }>
      <ConfirmationContent />
    </Suspense>
  );
}
