import Link from "next/link";
import { STORE_PHONE_DISPLAY, storeWhatsAppUrl } from "@/lib/site-contact";

/**
 * Two high-contrast strips that sit between the product grid and the footer:
 *   1. Live video shopping with stylists on call (WhatsApp video call).
 *   2. Order status — a direct WhatsApp line plus the track-order page.
 *
 * Hours and languages are presentation copy; change them here if the store's schedule differs.
 */
export const LIVE_SHOPPING_HOURS = "11 AM – 7 PM";

export default function StylistConciergeBand() {
  return (
    <>
      <section aria-labelledby="live-shopping-heading" className="bg-[#38131f] text-[#f8efdf] py-12 sm:py-16 px-4 sm:px-8">
        <div className="max-w-[1100px] mx-auto text-center">
          <span className="text-[10px] font-semibold uppercase tracking-[0.35em] text-[#dfc28c]">
            Live Video Shopping
          </span>
          <h2 id="live-shopping-heading" className="font-serif text-2xl sm:text-4xl mt-2">
            Shop from anywhere, anytime
          </h2>
          <p className="mt-3 text-sm sm:text-base text-[#f8efdf]/80 max-w-xl mx-auto">
            Video call our stylists live from {LIVE_SHOPPING_HOURS} to see fabrics, drape and colours before you order.
          </p>
          <p className="mt-2 text-xs uppercase tracking-[0.2em] text-[#dfc28c]">Stylists on call · Hindi &amp; English</p>
          <a
            href={storeWhatsAppUrl("Hi! I would like a live video call with a stylist.")}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-7 inline-flex items-center gap-2 bg-[#dfc28c] hover:bg-[#f0d9a6] text-[#38131f] text-xs font-bold tracking-[0.18em] uppercase px-7 py-4 rounded-full transition shadow-md"
          >
            WhatsApp Video Call Now
          </a>
        </div>
      </section>

      <section aria-labelledby="order-status-heading" className="bg-[#faf7f2] border-y border-[#e8dfd5] py-8 sm:py-10 px-4 sm:px-8">
        <div className="max-w-[1100px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-5 text-center sm:text-left">
          <div>
            <h2 id="order-status-heading" className="font-serif text-xl sm:text-2xl text-stone-900">
              Order status? Message us on WhatsApp
            </h2>
            <p className="mt-1 text-sm text-stone-600">
              Share your order ID and we&apos;ll send you the latest update.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <a
              href={storeWhatsAppUrl("Hi! I want to check my order status.")}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center bg-[#1c1917] hover:bg-[#881337] text-white text-xs font-semibold tracking-[0.15em] uppercase px-6 py-3.5 rounded-full transition"
            >
              {STORE_PHONE_DISPLAY}
            </a>
            <Link
              href="/track-order"
              className="inline-flex items-center border border-stone-300 hover:border-stone-500 text-stone-800 text-xs font-semibold tracking-[0.15em] uppercase px-6 py-3.5 rounded-full transition"
            >
              Track your order
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
