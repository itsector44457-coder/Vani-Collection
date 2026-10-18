"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, isApiConfigured, type StoreCategory } from "../lib/api-client";

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [categories, setCategories] = useState<StoreCategory[]>([]);

  useEffect(() => {
    if (!isApiConfigured()) return;
    const controller = new AbortController();
    void api
      .categories(controller.signal)
      .then(({ data }) => setCategories(data))
      .catch((cause: unknown) => {
        if ((cause as Error)?.name !== "AbortError") {
          console.error("Could not load footer categories", cause);
        }
      });
    return () => controller.abort();
  }, []);

  const handleSubscribe = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim()) return;
    setSubscribing(true);
    setTimeout(() => {
      setSubscribed(true);
      setSubscribing(false);
      setEmail("");
    }, 450);
  };

  const scrollToTop = () => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <footer className="bg-[#0f0d0c] text-stone-200 border-t border-[#dfc28c]/20 relative z-20">
      {/* ─── 1. CORE PROMISES STRIP (Exact Brand Badges from Screenshot) ─── */}
      <div className="bg-white text-stone-900 border-b border-stone-200 py-6 sm:py-7 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 items-center">
          {/* 1. No Return & Exchange */}
          <div className="flex items-center gap-3.5 sm:gap-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border border-dashed border-stone-300 flex items-center justify-center shrink-0 bg-white">
              <svg className="w-6 h-6 sm:w-7 sm:h-7 text-stone-900" viewBox="0 0 512 512" fill="currentColor">
                <path d="M498.1 5.6c10.1 7 15.4 19.1 13.5 31.2l-64 416c-1.5 9.7-7.4 18.2-16 23s-18.9 5.4-28 1.6L284 427.7l-68.5 74.1c-8.9 9.7-22.9 12.9-35.2 8.1S160 493.2 160 480V396.4c0-4 1.5-7.8 4.2-10.7L331.8 202.8c5.8-6.3 5.6-16-.4-22s-15.7-6.2-22-.4L104.9 366.1 16.7 329.8c-10.4-4.3-17-14.2-16.6-25.5s7.4-20.9 17.9-24.7l448-160c10.6-3.8 22.4-1.2 30.1 5.6z" />
              </svg>
            </div>
            <div>
              <p className="font-bold text-stone-900 text-sm leading-snug">
                No Return &amp; Exchange
              </p>
            </div>
          </div>

          {/* 2. Free Shipping */}
          <div className="flex items-center gap-3.5 sm:gap-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border border-dashed border-stone-300 flex items-center justify-center shrink-0 bg-white">
              <svg className="w-7 h-7 sm:w-8 sm:h-8 text-stone-900" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 3h13v12H1z" />
                <path d="M14 7h4l3 3v5h-7V7z" />
                <circle cx="5" cy="18" r="2.5" />
                <circle cx="17" cy="18" r="2.5" />
                <line x1="4" y1="7" x2="10" y2="7" />
                <line x1="4" y1="10" x2="8" y2="10" />
              </svg>
            </div>
            <div>
              <p className="font-bold text-stone-900 text-sm leading-snug">
                Free Shipping
              </p>
              <p className="text-xs text-stone-400 mt-0.5 leading-snug font-normal">
                Free Shipping
              </p>
            </div>
          </div>

          {/* 3. 100% Secure Payment */}
          <div className="flex items-center gap-3.5 sm:gap-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border border-dashed border-stone-300 flex items-center justify-center shrink-0 bg-white">
              <svg className="w-6 h-6 sm:w-7 sm:h-7 text-stone-900" viewBox="0 0 24 24" fill="currentColor">
                <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3H6a2.25 2.25 0 00-2.25 2.25v8.5A2.25 2.25 0 006 22.75h12a2.25 2.25 0 002.25-2.25v-8.5A2.25 2.25 0 0018 9.75h-.75v-3A5.25 5.25 0 0012 1.5zm-3.25 5.25a3.25 3.25 0 016.5 0v3h-6.5v-3zM12 13a1.5 1.5 0 00-1 2.618V18a1 1 0 102 0v-2.382A1.5 1.5 0 0012 13z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <p className="font-bold text-stone-900 text-sm leading-snug">
                100% Secure Payment
              </p>
            </div>
          </div>

          {/* 4. 24/7 Customers Support */}
          <div className="flex items-center gap-3.5 sm:gap-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border border-dashed border-stone-300 flex items-center justify-center shrink-0 bg-white">
              <svg className="w-6 h-6 sm:w-7 sm:h-7 text-stone-900" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
              </svg>
            </div>
            <div>
              <p className="font-bold text-stone-900 text-sm leading-snug">
                24/7 Customers Support
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 2. VIP NEWSLETTER & PATRON CIRCLE CARD ─── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-4">
        <div className="relative rounded-3xl border border-[#dfc28c]/30 bg-gradient-to-br from-[#1a1512] via-[#241c17] to-[#1a1512] p-8 sm:p-10 lg:p-12 overflow-hidden shadow-2xl">
          {/* Subtle Ambient Radial Lighting */}
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#dfc28c]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-[#881337]/15 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Copy */}
            <div className="lg:col-span-7 space-y-3 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#dfc28c]/30 bg-[#dfc28c]/10 px-3 py-1 text-[10px] font-semibold tracking-[0.25em] uppercase text-[#dfc28c]">
                <span>✦ The Atelier Patron Circle</span>
              </div>
              <h3 className="font-serif text-2xl sm:text-3xl lg:text-4xl text-white font-normal leading-tight">
                Be the First to Behold Our New Loom Edits
              </h3>
              <p className="text-xs sm:text-sm text-stone-300 font-light max-w-xl leading-relaxed">
                Receive private invitations to seasonal festival drops, private salon trunk shows in Guna, and bespoke bridal styling consultations.
              </p>
            </div>

            {/* Right Form */}
            <div className="lg:col-span-5">
              <form onSubmit={handleSubscribe} className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <div className="relative flex-1">
                    <input
                      id="footer-patron-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setSubscribed(false);
                      }}
                      placeholder="Enter your email address"
                      className="w-full px-4 py-3.5 bg-black/40 border border-white/20 focus:border-[#dfc28c] rounded-xl text-white placeholder-stone-400 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#dfc28c]/30 transition shadow-inner"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={subscribing}
                    className="inline-flex items-center justify-center gap-2 bg-[#dfc28c] hover:bg-[#eed7a8] text-[#1c1917] px-6 py-3.5 rounded-xl text-xs font-bold uppercase tracking-[0.15em] transition shadow-lg hover:shadow-[#dfc28c]/20 whitespace-nowrap active:scale-95 disabled:opacity-75"
                  >
                    <span>{subscribing ? "Joining…" : "Join Circle"}</span>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </button>
                </div>

                {subscribed ? (
                  <p className="text-xs text-emerald-400 flex items-center gap-1.5 font-medium animate-fadeIn">
                    <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Welcome to the Patron Circle. An exclusive welcome curio awaits in your inbox.
                  </p>
                ) : (
                  <p className="text-[11px] text-stone-400 flex items-center gap-1.5 justify-center lg:justify-start">
                    <svg className="w-3.5 h-3.5 text-[#dfc28c]" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                    We honor your peace. No spam, only rare handloom stories.
                  </p>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 3. MAIN NAVIGATION & BRAND INFORMATION ─── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8">
          {/* Brand & Flagship Concierge (Col 1 - span 4) */}
          <div className="lg:col-span-4 space-y-6">
            <div>
              <Link href="/" className="inline-block group">
                <span className="font-serif text-2xl sm:text-3xl tracking-[0.08em] text-[#dfc28c] font-light block group-hover:text-white transition">
                  Vani Collection
                </span>
                <span className="text-[9.5px] uppercase tracking-[0.35em] text-stone-400 font-semibold block mt-1">
                  Atelier · Guna, Madhya Pradesh
                </span>
              </Link>
              <p className="text-xs sm:text-[13px] text-stone-300 leading-relaxed font-light mt-3.5 max-w-sm">
                Speciality in fancy kurties and party wear dresses. Handcrafting pure 100-count Mul Cotton, royal Anarkalis, and festive ensembles in our Guna atelier since 2018.
              </p>
            </div>

            {/* Physical Atelier Card */}
            <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-4 space-y-2.5 text-xs text-stone-300">
              <div className="flex items-start gap-2.5">
                <svg className="w-4 h-4 text-[#dfc28c] shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
                <div>
                  <p className="font-medium text-white">Flagship Atelier &amp; Studio</p>
                  <p className="text-stone-400 mt-0.5">Station Road, Guna, Madhya Pradesh 473001</p>
                  <p className="text-[11px] text-[#dfc28c] mt-0.5">Mon – Sat · 10:30 am – 7:30 pm IST</p>
                </div>
              </div>

              <div className="border-t border-white/5 pt-2 flex flex-col gap-1 text-[11.5px]">
                <a href="tel:+919876543210" className="flex items-center gap-2 hover:text-[#dfc28c] transition">
                  <svg className="w-3.5 h-3.5 text-[#dfc28c]" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                  </svg>
                  <span>+91 98765-43210 (Concierge)</span>
                </a>
                <a href="mailto:Vanicollectionguna@gmail.com" className="flex items-center gap-2 hover:text-[#dfc28c] transition">
                  <svg className="w-3.5 h-3.5 text-[#dfc28c]" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                  </svg>
                  <span>Vanicollectionguna@gmail.com</span>
                </a>
              </div>
            </div>

            {/* Social Icons */}
            <div className="flex items-center gap-3">
              <a
                href="https://instagram.com/vanicollection"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="w-9 h-9 rounded-full bg-white/5 hover:bg-[#dfc28c] hover:text-[#1c1917] border border-white/10 hover:border-[#dfc28c] flex items-center justify-center transition text-stone-300"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>
              <a
                href="https://facebook.com/vanicollection"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="w-9 h-9 rounded-full bg-white/5 hover:bg-[#dfc28c] hover:text-[#1c1917] border border-white/10 hover:border-[#dfc28c] flex items-center justify-center transition text-stone-300"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M22.675 0h-21.35c-.732 0-1.325.593-1.325 1.325v21.351c0 .731.593 1.324 1.325 1.324h11.495v-9.294h-3.128v-3.622h3.128v-2.671c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12v9.293h6.116c.73 0 1.323-.593 1.323-1.325v-21.35c0-.732-.593-1.325-1.325-1.325z" />
                </svg>
              </a>
              <a
                href="https://wa.me/919876543210?text=Hello%20Vani%20Collection%20Atelier!"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
                className="w-9 h-9 rounded-full bg-white/5 hover:bg-[#25D366] hover:text-white border border-white/10 hover:border-[#25D366] flex items-center justify-center transition text-stone-300"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                </svg>
              </a>
              <Link
                href="/contact"
                className="text-[11px] uppercase tracking-wider text-[#dfc28c] hover:text-white font-medium ml-2 underline underline-offset-4"
              >
                Book Atelier Visit →
              </Link>
            </div>
          </div>

          {/* Shop & Collections (Col 2 - span 3) */}
          <div className="lg:col-span-3">
            <h4 className="font-serif text-base text-white tracking-wide mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#dfc28c]" />
              <span>Collections &amp; Weaves</span>
            </h4>
            <ul className="space-y-2.5 text-xs sm:text-[13px] text-stone-300">
              {(categories.length
                ? categories
                : [
                    { name: "100-Count Mul Cotton", slug: "mul-cotton" },
                    { name: "Royal Anarkali Suits", slug: "anarkalis" },
                    { name: "Festive & Bridal Edit", slug: "festive" },
                    { name: "Pure Chanderi Silk", slug: "chanderi" },
                    { name: "Co-ord Sets & Tunics", slug: "coord-sets" },
                    { name: "Bagru Handblock Sarees", slug: "handblock-sarees" },
                  ]
              )
                .slice(0, 7)
                .map((category) => (
                  <li key={category.slug}>
                    <Link
                      href={`/products?category=${encodeURIComponent(category.slug)}`}
                      className="hover:text-[#dfc28c] transition flex items-center gap-1.5 hover:translate-x-1 duration-150"
                    >
                      <span className="text-stone-500 text-[10px]">›</span>
                      <span>{category.name}</span>
                    </Link>
                  </li>
                ))}
              <li className="pt-1">
                <Link
                  href="/products"
                  className="font-medium text-[#dfc28c] hover:text-white transition flex items-center gap-1"
                >
                  <span>Explore All Ensembles</span>
                  <span>→</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Concierge & Client Care (Col 3 - span 3) */}
          <div className="lg:col-span-3">
            <h4 className="font-serif text-base text-white tracking-wide mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#dfc28c]" />
              <span>Concierge &amp; Care</span>
            </h4>
            <ul className="space-y-2.5 text-xs sm:text-[13px] text-stone-300">
              <li>
                <Link href="/shipping" className="hover:text-[#dfc28c] transition flex items-center gap-1.5 hover:translate-x-1 duration-150">
                  <span className="text-stone-500 text-[10px]">›</span>
                  <span>Shipping &amp; Delivery Info</span>
                </Link>
              </li>
              <li>
                <Link href="/returns" className="hover:text-[#dfc28c] transition flex items-center gap-1.5 hover:translate-x-1 duration-150">
                  <span className="text-stone-500 text-[10px]">›</span>
                  <span>Returns &amp; Sizing Exchange</span>
                </Link>
              </li>
              <li>
                <Link href="/size-guide" className="hover:text-[#dfc28c] transition flex items-center gap-1.5 hover:translate-x-1 duration-150">
                  <span className="text-stone-500 text-[10px]">›</span>
                  <span>Atelier Size &amp; Fit Guide</span>
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-[#dfc28c] transition flex items-center gap-1.5 hover:translate-x-1 duration-150">
                  <span className="text-stone-500 text-[10px]">›</span>
                  <span>Book Private Styling Desk</span>
                </Link>
              </li>
              <li>
                <a
                  href="https://wa.me/919876543210?text=Hello%20Vani%20Collection%20Atelier,%20I%20need%20assistance%20with%20my%20order."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#dfc28c] transition flex items-center gap-1.5 text-emerald-300 font-medium hover:translate-x-1 duration-150"
                >
                  <span className="text-emerald-400 text-[10px]">●</span>
                  <span>WhatsApp Live Stylist</span>
                </a>
              </li>
              <li>
                <Link href="/contact" className="hover:text-[#dfc28c] transition flex items-center gap-1.5 hover:translate-x-1 duration-150">
                  <span className="text-stone-500 text-[10px]">›</span>
                  <span>Track Consignment</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* The House & Heritage (Col 4 - span 2) */}
          <div className="lg:col-span-2">
            <h4 className="font-serif text-base text-white tracking-wide mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#dfc28c]" />
              <span>The House</span>
            </h4>
            <ul className="space-y-2.5 text-xs sm:text-[13px] text-stone-300">
              <li>
                <Link href="/about" className="hover:text-[#dfc28c] transition flex items-center gap-1.5 hover:translate-x-1 duration-150">
                  <span className="text-stone-500 text-[10px]">›</span>
                  <span>The Guna Genesis</span>
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-[#dfc28c] transition flex items-center gap-1.5 hover:translate-x-1 duration-150">
                  <span className="text-stone-500 text-[10px]">›</span>
                  <span>Four Sacred Weaves</span>
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-[#dfc28c] transition flex items-center gap-1.5 hover:translate-x-1 duration-150">
                  <span className="text-stone-500 text-[10px]">›</span>
                  <span>Slow Fashion Manifesto</span>
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-[#dfc28c] transition flex items-center gap-1.5 hover:translate-x-1 duration-150">
                  <span className="text-stone-500 text-[10px]">›</span>
                  <span>Privacy Policy</span>
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-[#dfc28c] transition flex items-center gap-1.5 hover:translate-x-1 duration-150">
                  <span className="text-stone-500 text-[10px]">›</span>
                  <span>Terms of Patronage</span>
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* ─── 4. INDIAN SECURE PAYMENT GATEWAYS & ACCEPTANCE STRIP ─── */}
      <div className="border-t border-white/10 bg-[#0a0807] py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-2.5 text-xs text-stone-400 text-center md:text-left">
            <svg className="w-4 h-4 text-[#dfc28c] shrink-0" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
            <span>100% Certified Safe &amp; Encrypted Payment Modes Accepted</span>
          </div>

          {/* Payment Badges with Real Authentic Logos */}
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-2.5">
            {/* 1. UPI */}
            <div className="h-7 sm:h-8 px-2.5 rounded bg-white border border-stone-200 flex items-center justify-center shadow-xs hover:scale-105 transition-transform" title="Unified Payments Interface (UPI)">
              <svg className="h-4 w-auto" viewBox="0 0 70 24" fill="none">
                <path d="M7.5 4L13 14H2L7.5 4Z" fill="#097939" />
                <path d="M11 9.5L16.5 19.5H5.5L11 9.5Z" fill="#ED752E" />
                <text x="21" y="17" fontFamily="sans-serif" fontSize="13" fontWeight="800" fill="#2E2E2E">UPI</text>
              </svg>
            </div>

            {/* 2. Google Pay */}
            <div className="h-7 sm:h-8 px-2.5 rounded bg-white border border-stone-200 flex items-center justify-center shadow-xs hover:scale-105 transition-transform" title="Google Pay">
              <svg className="h-4.5 w-auto" viewBox="0 0 48 20" fill="none">
                <path d="M7.8 8.8v2.4h3.9c-.2 1-.8 1.9-1.7 2.5v2.1h2.8c1.6-1.5 2.5-3.7 2.5-6.3 0-.6-.1-1.2-.2-1.7H7.8z" fill="#4285F4"/>
                <path d="M7.8 14.5c2.3 0 4.2-.8 5.6-2.1l-2.8-2.1c-.8.5-1.7.8-2.8.8-2.2 0-4-1.5-4.7-3.5H.3v2.2C1.7 12.6 4.5 14.5 7.8 14.5z" fill="#34A853"/>
                <path d="M3.1 7.6c-.2-.6-.3-1.2-.3-1.8s.1-1.2.3-1.8V1.8H.3C-.2 2.9-.5 4.3-.5 5.8s.3 2.9.8 4l2.8-2.2z" fill="#FBBC04"/>
                <path d="M7.8 2.9c1.2 0 2.3.4 3.2 1.2l2.4-2.4C12 .6 10.1 0 7.8 0 4.5 0 1.7 1.9.3 4.8l2.8 2.2C3.8 4.4 5.6 2.9 7.8 2.9z" fill="#EA4335"/>
                <path d="M22 4.5h-3.8V16h2.2v-4.2h1.6c2.4 0 4.2-1.6 4.2-3.6s-1.8-3.7-4.2-3.7zm0 5.2h-1.6V6.6h1.6c1.2 0 2 .8 2 1.6s-.8 1.5-2 1.5zm11.1.2c-1.3 0-2.3.5-2.8 1.4V10h-2.1v6h2.1v-3.4c0-1.1.8-1.8 1.8-1.8s1.6.7 1.6 1.8V16H38v-3.7c0-1.7-1.3-2.6-2.9-2.6zm6.8 5.7c-.5 0-.9-.1-1.2-.3l-.4 1.7c.5.2 1.2.3 1.8.3 2.1 0 3.3-1 3.8-2.8l2.5-7.5H44l-1.6 5.3-1.6-5.3h-2.3l2.8 7.2c-.4 1-1 1.4-2 1.4z" fill="#5F6368"/>
              </svg>
            </div>

            {/* 3. PhonePe */}
            <div className="h-7 sm:h-8 px-2.5 rounded bg-white border border-stone-200 flex items-center justify-center shadow-xs hover:scale-105 transition-transform" title="PhonePe">
              <svg className="h-4.5 w-auto" viewBox="0 0 85 24" fill="none">
                <circle cx="12" cy="12" r="10" fill="#5f259f"/>
                <path d="M14.5 7.5H9.5v9h2.3v-3.2h2.7c2.2 0 3.5-1.2 3.5-2.9s-1.3-2.9-3.5-2.9zm-.1 3.8h-2.6V9.4h2.6c.9 0 1.4.4 1.4 1s-.5.9-1.4.9z" fill="#fff"/>
                <path d="M12.8 9.8l-2.4 4.5" stroke="#fff" strokeWidth="1.2" strokeLinecap="round"/>
                <text x="26" y="17" fontFamily="sans-serif" fontSize="13" fontWeight="800" fill="#5f259f">PhonePe</text>
              </svg>
            </div>

            {/* 4. Paytm */}
            <div className="h-7 sm:h-8 px-2.5 rounded bg-white border border-stone-200 flex items-center justify-center shadow-xs hover:scale-105 transition-transform" title="Paytm">
              <svg className="h-4.5 w-auto" viewBox="0 0 68 22" fill="none">
                <text x="0" y="16.5" fontFamily="sans-serif" fontSize="15" fontWeight="900" fill="#002970" letterSpacing="-0.5">Pay</text>
                <text x="30" y="16.5" fontFamily="sans-serif" fontSize="15" fontWeight="900" fill="#00BAF2" letterSpacing="-0.5">tm</text>
              </svg>
            </div>

            {/* 5. RuPay */}
            <div className="h-7 sm:h-8 px-2.5 rounded bg-white border border-stone-200 flex items-center justify-center shadow-xs hover:scale-105 transition-transform" title="RuPay">
              <svg className="h-4.5 w-auto" viewBox="0 0 72 22" fill="none">
                <text x="1" y="16" fontFamily="sans-serif" fontSize="14" fontWeight="900" fill="#002B49" letterSpacing="-0.5">Ru</text>
                <text x="23" y="16" fontFamily="sans-serif" fontSize="14" fontWeight="900" fill="#097939" letterSpacing="-0.5">Pay</text>
                <path d="M54 5l3.5 12h-3.5l-3.5-12h3.5z" fill="#F47920"/>
                <path d="M60 5l3.5 12h-3.5l-3.5-12h3.5z" fill="#00A4E4"/>
              </svg>
            </div>

            {/* 6. Visa */}
            <div className="h-7 sm:h-8 px-2.5 rounded bg-white border border-stone-200 flex items-center justify-center shadow-xs hover:scale-105 transition-transform" title="Visa">
              <svg className="h-4 w-auto" viewBox="0 0 52 18" fill="none">
                <path d="M20.5 1.5l-4.2 14.8h-3.4L8.7 5.2c-.3-.9-.6-1.2-1.3-1.6C5.9 2.8 4 2.2 2.2 1.8l.2-.7h6.8c1 0 1.8.6 2 1.8l1.7 8.9 4.1-10.3h3.5zm15.4 10c0-3.9-5.4-4.1-5.4-5.9 0-.6.6-1.2 1.8-1.4.6-.1 2.2-.2 4 .7l.7-3.3c-1-.4-2.3-.7-3.9-.7-4.1 0-7 2.2-7 5.3 0 2.3 2 3.6 3.6 4.4 1.6.8 2.2 1.3 2.2 2 0 1.1-1.3 1.6-2.6 1.6-1.7 0-2.7-.3-4.1-.9l-.7 3.4c1 .5 2.8.8 4.7.8 4.4 0 7.3-2.2 7.3-5.2zM45.5 16.3h3.2L45.9 1.5h-2.9c-.8 0-1.4.4-1.7 1.1l-6 13.7h3.6l.7-2h4.4l.6 2zm-3.8-4.7l1.8-4.9 1 4.9h-2.8zM27.2 1.5l-2.7 14.8h-3.4L23.8 1.5h3.4z" fill="#1A1F71"/>
              </svg>
            </div>

            {/* 7. Mastercard */}
            <div className="h-7 sm:h-8 px-2.5 rounded bg-white border border-stone-200 flex items-center justify-center shadow-xs hover:scale-105 transition-transform" title="Mastercard">
              <svg className="h-4.5 w-auto" viewBox="0 0 34 22" fill="none">
                <circle cx="11" cy="11" r="9" fill="#EB001B"/>
                <circle cx="23" cy="11" r="9" fill="#F79E1B"/>
                <path d="M17 4.1a8.98 8.98 0 0 1 3.5 6.9 8.98 8.98 0 0 1-3.5 6.9 8.98 8.98 0 0 1-3.5-6.9 8.98 8.98 0 0 1 3.5-6.9z" fill="#FF5F00"/>
              </svg>
            </div>

            {/* 8. NetBanking */}
            <div className="h-7 sm:h-8 px-2.5 rounded bg-white border border-stone-200 flex items-center gap-1.5 shadow-xs hover:scale-105 transition-transform" title="All Major Indian Banks NetBanking">
              <svg className="w-3.5 h-3.5 text-stone-700 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3" />
              </svg>
              <span className="text-[11px] font-bold text-stone-800 tracking-tight">NetBanking</span>
            </div>

            {/* 9. Cash on Delivery (COD) */}
            <div className="h-7 sm:h-8 px-2.5 rounded bg-[#dfc28c]/15 border border-[#dfc28c]/40 flex items-center gap-1.5 text-[#dfc28c] shadow-xs hover:scale-105 transition-transform" title="Cash on Delivery Available Across India">
              <svg className="w-3.5 h-3.5 text-[#dfc28c] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="6" width="20" height="12" rx="2" />
                <circle cx="12" cy="12" r="2" />
                <path d="M6 12h.01M18 12h.01" />
              </svg>
              <span className="text-[11px] font-bold tracking-tight">Cash on Delivery</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 5. BOTTOM BAR & HERITAGE SIGNOFF ─── */}
      <div className="border-t border-white/10 bg-black py-5 px-4 sm:px-6 lg:px-8 pb-20 lg:pb-5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-400">
          <div className="text-center sm:text-left">
            <p>
              © {currentYear} Vani Collection Atelier. All rights reserved.
            </p>
            <p className="text-[11px] text-stone-500 mt-0.5">
              Woven with reverence &amp; devotion in Guna, Madhya Pradesh, India.
            </p>
          </div>

          {/* Back to top button */}
          <div className="flex items-center gap-4">
            <button
              onClick={scrollToTop}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/5 hover:bg-[#dfc28c] hover:text-[#1c1917] border border-white/15 text-stone-300 text-xs transition duration-200"
              aria-label="Back to top of page"
            >
              <span>Back to Top</span>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
