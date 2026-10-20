import Link from "next/link";
import { STORE_PHONE_DISPLAY, storeWhatsAppUrl } from "@/lib/site-contact";

/** The decorative reference frame is layered behind real, accessible HTML content. */
export default function OrderStatusBand() {
  return (
    <section
      aria-labelledby="order-status-heading"
      className="relative isolate overflow-hidden border-y border-[#e8dfd5] bg-[#faf7f2]"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 hidden bg-center bg-no-repeat md:block"
        style={{
          backgroundImage: "url('/order-status-floral-frame.jpg')",
          backgroundSize: "100% 100%",
        }}
      />

      {/* On narrow screens, keep the floral detail as a slim frame so the message stays compact. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-2 md:hidden"
        style={{
          backgroundImage: "url('/order-status-floral-frame.jpg')",
          backgroundPosition: "center top",
          backgroundRepeat: "no-repeat",
          backgroundSize: "300% auto",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-2 md:hidden"
        style={{
          backgroundImage: "url('/order-status-floral-frame.jpg')",
          backgroundPosition: "center bottom",
          backgroundRepeat: "no-repeat",
          backgroundSize: "300% auto",
        }}
      />

      <div className="relative mx-auto flex max-w-[1120px] flex-col gap-4 px-4 py-7 sm:px-8 md:min-h-[172px] md:flex-row md:items-center md:justify-between md:gap-8 md:py-6 lg:px-0">
        <div className="max-w-2xl text-left">
          <h2 id="order-status-heading" className="font-serif text-lg leading-snug text-stone-900 sm:text-xl md:text-2xl">
            Order status? Message us on WhatsApp
          </h2>
          <p className="mt-1 text-[13px] leading-relaxed text-stone-600 sm:text-sm">
            Share your order ID and we&apos;ll send you the latest update.
          </p>
        </div>

        <div className="grid w-full grid-cols-2 gap-2 sm:gap-3 md:w-auto md:shrink-0">
          <a
            href={storeWhatsAppUrl("Hi! I want to check my order status.")}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 w-full items-center justify-center whitespace-nowrap rounded-full bg-[#1c1917] px-2 py-3 text-[9px] font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-[#881337] sm:px-4 sm:text-[10px] md:w-auto md:px-6 md:text-xs md:tracking-[0.15em]"
          >
            {STORE_PHONE_DISPLAY}
          </a>
          <Link
            href="/track-order"
            className="inline-flex min-h-11 w-full items-center justify-center whitespace-nowrap rounded-full border border-stone-400 px-2 py-3 text-[9px] font-semibold uppercase tracking-[0.08em] text-stone-800 transition hover:border-stone-600 sm:px-4 sm:text-[10px] md:w-auto md:px-6 md:text-xs md:tracking-[0.15em]"
          >
            TRACK YOUR ORDER
          </Link>
        </div>
      </div>
    </section>
  );
}
