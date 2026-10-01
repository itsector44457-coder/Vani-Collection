"use client";

import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { Suspense } from "react";

const STEPS = [
  { label: "Order Confirmed", icon: "✓", done: true },
  { label: "Processing", icon: "⚙", done: false },
  { label: "Dispatched", icon: "📦", done: false },
  { label: "Out for Delivery", icon: "🚚", done: false },
  { label: "Delivered", icon: "🏠", done: false },
];

function ConfirmationContent() {
  const params = useSearchParams();
  const orderId = params.get("orderId") ?? "VC" + Date.now().toString().slice(-6);

  const estimatedDate = new Date();
  estimatedDate.setDate(estimatedDate.getDate() + 6);
  const dateStr = estimatedDate.toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long",
  });

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
              <p className="text-white font-mono text-lg font-bold mt-0.5">#{orderId}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-[0.3em] text-white/50 font-semibold">Estimated Delivery</p>
              <p className="text-white text-sm font-medium mt-0.5">{dateStr}</p>
            </div>
          </div>

          <div className="p-6 space-y-5">
            {/* What happens next */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Order Journey</h3>
              <div className="relative">
                {/* Connector line */}
                <div className="absolute left-[15px] top-4 bottom-4 w-0.5 bg-gray-200" />
                <div className="space-y-5">
                  {STEPS.map((s, i) => (
                    <div key={s.label} className="flex items-center gap-4 relative">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm z-10 flex-shrink-0 ${
                        i === 0
                          ? "bg-emerald-500 text-white shadow-md"
                          : "bg-gray-100 text-gray-400"
                      }`}>
                        {s.icon}
                      </div>
                      <div>
                        <p className={`text-sm font-medium ${i === 0 ? "text-emerald-700" : "text-gray-500"}`}>
                          {s.label}
                        </p>
                        {i === 0 && (
                          <p className="text-xs text-gray-400 mt-0.5">Just now — confirmation email sent</p>
                        )}
                        {i === 1 && (
                          <p className="text-xs text-gray-400 mt-0.5">Within 24 hours</p>
                        )}
                        {i === 2 && (
                          <p className="text-xs text-gray-400 mt-0.5">2–3 business days</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Delivery Info */}
            <div className="bg-blue-50 rounded-xl p-4 text-sm space-y-1.5">
              <p className="font-semibold text-blue-900 text-xs uppercase tracking-wider mb-2">Delivery Details</p>
              <p className="text-blue-800 flex items-center gap-2">
                <span>📱</span> SMS & WhatsApp tracking updates will be sent
              </p>
              <p className="text-blue-800 flex items-center gap-2">
                <span>📧</span> Confirmation email dispatched to your inbox
              </p>
              <p className="text-blue-800 flex items-center gap-2">
                <span>🚚</span> Shipped via Blue Dart / Delhivery / DTDC
              </p>
            </div>

            {/* Help */}
            <div className="bg-amber-50 rounded-xl p-4 text-sm">
              <p className="font-semibold text-amber-900 text-xs uppercase tracking-wider mb-2">Need Help?</p>
              <p className="text-amber-800 text-xs leading-relaxed">
                For queries about your order, call us at{" "}
                <a href="tel:+919001234567" className="font-semibold underline">+91 90012 34567</a>{" "}
                or WhatsApp us. We're available Mon–Sat, 10am–7pm IST.
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
            href="/account"
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
            href={`https://wa.me/?text=My%20Vani%20Collection%20order%20%23${orderId}%20is%20confirmed!%20Check%20it%20out.`}
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
