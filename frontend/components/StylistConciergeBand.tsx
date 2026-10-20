import { storeWhatsAppUrl } from "@/lib/site-contact";

/**
 * Live video shopping. Hours and language availability are presentation copy;
 * update them here if the store's schedule changes.
 */
export const LIVE_SHOPPING_HOURS = "11 AM – 7 PM";

export default function StylistConciergeBand() {
  return (
    <section aria-labelledby="live-shopping-heading" className="relative isolate overflow-hidden bg-[#2b0d18] text-[#f8efdf]">
      {/* Text-free generated alternative; the supplied Shutterstock image is Editorial Use Only. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[url('/live-video-shopping-bg.jpg')] bg-cover bg-[position:65%_center] md:bg-center"
      />
      <div aria-hidden="true" className="absolute inset-0 bg-black/40 md:hidden" />
      <div aria-hidden="true" className="absolute inset-0 hidden bg-gradient-to-r from-[#260c16]/95 via-[#260c16]/85 to-[#260c16]/15 md:block" />
      <div aria-hidden="true" className="absolute inset-0 hidden bg-gradient-to-t from-[#260c16]/25 to-transparent md:block" />
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-[#260c16]/55 via-[#260c16]/45 to-[#260c16]/90 md:hidden" />

      <div className="relative mx-auto flex min-h-[510px] max-w-[1320px] items-center px-5 py-14 sm:px-8 md:min-h-[480px] lg:min-h-[540px]">
        <div className="mx-auto max-w-[590px] text-center md:mx-0 md:text-left">
          <span className="text-[10px] font-semibold uppercase tracking-[0.35em] text-[#dfc28c]">
            Live Video Shopping
          </span>
          <h2 id="live-shopping-heading" className="mt-3 font-serif text-3xl leading-tight sm:text-4xl lg:text-5xl">
            Shop from anywhere, anytime
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-[#f8efdf]/90 sm:text-base md:mx-0">
            Video call our stylists live from {LIVE_SHOPPING_HOURS} to see fabrics, drape and colours before you order.
          </p>
          <p className="mt-3 text-xs font-medium uppercase tracking-[0.18em] text-[#f1d69f]">
            Stylists on call · Hindi &amp; English
          </p>
          <a
            href={storeWhatsAppUrl("Hi! I would like a live video call with a stylist.")}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-7 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[#dfc28c] px-7 py-4 text-xs font-bold uppercase tracking-[0.15em] text-[#38131f] shadow-lg transition hover:bg-[#f0d9a6] sm:w-auto"
          >
            WhatsApp Video Call Now
          </a>
        </div>
      </div>
    </section>
  );
}
