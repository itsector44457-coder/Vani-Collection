"use client";

import Image from "next/image";
import PaymentIcons from "./PaymentIcons";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api, isApiConfigured, type StoreCategory } from "../lib/api-client";

const FALLBACK_CATEGORIES = [
  { name: "Mul Cotton", slug: "mul-cotton" },
  { name: "Festive Edit", slug: "festive" },
  { name: "Co-ord Sets", slug: "coord-sets" },
  { name: "Anarkalis", slug: "anarkalis" },
];

const FOOTER_LINKS = {
  help: [
    { label: "Shipping & delivery", href: "/shipping" },
    { label: "Returns & exchanges", href: "/returns" },
    { label: "Size guide", href: "/size-guide" },
    { label: "Track your order", href: "/account/track" },
    { label: "Get in touch", href: "/contact" },
  ],
  about: [
    { label: "Our story", href: "/about" },
    { label: "Lookbook", href: "/collections" },
    { label: "Privacy policy", href: "/privacy" },
    { label: "Terms & conditions", href: "/terms" },
  ],
};

function ArrowIcon({ direction = "right" }: { direction?: "right" | "up" }) {
  return (
    <svg
      aria-hidden="true"
      className={`h-4 w-4 transition-transform duration-200 ${direction === "right" ? "group-hover:translate-x-0.5" : ""}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {direction === "up" ? <path d="m6 14 6-6 6 6" /> : <path d="M5 12h14m-6-6 6 6-6 6" />}
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg aria-hidden="true" className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r=".8" fill="currentColor" stroke="none" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg aria-hidden="true" className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.5 3.5A11.8 11.8 0 0 0 12.1 0C5.5 0 .2 5.3.2 11.9c0 2.1.6 4.1 1.6 5.9L.1 24l6.3-1.7a11.8 11.8 0 0 0 5.7 1.5h.1c6.6 0 11.9-5.3 11.9-11.9 0-3.2-1.2-6.2-3.6-8.4ZM12.1 21.8c-1.8 0-3.5-.5-5-1.4l-.4-.2-3.7 1 1-3.7-.2-.4a9.8 9.8 0 0 1-1.5-5.2c0-5.4 4.4-9.9 9.8-9.9 2.6 0 5.1 1 7 2.9a9.8 9.8 0 0 1 2.9 7c0 5.4-4.4 9.9-9.9 9.9Zm5.4-7.4c-.3-.1-1.7-.8-2-.9s-.5-.1-.7.2l-.9 1.1c-.2.2-.3.3-.6.1-.3-.1-1.2-.5-2.3-1.4-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6l.5-.5c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4s-1 1-1 2.5 1.1 2.9 1.2 3.1c.2.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.8-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.2-.3-.3-.6-.4Z" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 3h4l2 5-2.5 1.5a15 15 0 0 0 7 7L16 14l5 2v4a1 1 0 0 1-1 1A18 18 0 0 1 3 4a1 1 0 0 1 1-1Z" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  );
}

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
    window.setTimeout(() => {
      setSubscribed(true);
      setSubscribing(false);
      setEmail("");
    }, 450);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const shopCategories = (categories.length ? categories : FALLBACK_CATEGORIES).slice(0, 4);

  return (
    <footer className="relative z-20 overflow-hidden bg-[#f5efe6] text-[#2b211e]">
      {/* A warm, editorial sign-off with a little woven texture */}
      <section className="relative isolate overflow-hidden bg-[#35131f] text-[#fffaf1]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "radial-gradient(ellipse at 16% 35%, rgba(190, 127, 91, .25), transparent 38%), radial-gradient(ellipse at 80% 15%, rgba(223, 194, 140, .12), transparent 28%)",
          }}
        />
        <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.055]" preserveAspectRatio="none">
          <defs>
            <pattern id="vani-footer-weave" width="18" height="18" patternUnits="userSpaceOnUse">
              <path d="M0 3h18M0 12h18M3 0v18M12 0v18" stroke="#f7e9d1" strokeWidth=".6" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#vani-footer-weave)" />
        </svg>
        <div aria-hidden="true" className="pointer-events-none absolute -left-40 top-16 h-96 w-96 rounded-full border border-white/[0.07]" />
        <div aria-hidden="true" className="pointer-events-none absolute -left-24 top-32 h-64 w-64 rounded-full border border-white/[0.05]" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 pb-16 pt-14 sm:px-6 sm:pb-20 sm:pt-16 lg:grid-cols-12 lg:gap-12 lg:px-8 lg:pb-24 lg:pt-20">
          <div className="lg:col-span-7">
            <div className="mb-6 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.27em] text-[#e7c990] sm:text-[11px]">
              <span className="h-px w-8 bg-[#d7b978]" />
              Vani Collection <span className="text-white/35">·</span> Guna, India
            </div>
            <h2 className="font-serif text-[clamp(2.5rem,7vw,5.25rem)] font-normal leading-[0.95] tracking-[-0.045em] text-[#fffaf1]">
              A little tradition.
              <br />
              <span className="font-normal italic text-[#e6c88f]">A lot of you.</span>
            </h2>
            <p className="mt-6 max-w-lg text-sm leading-relaxed text-white/70 sm:text-base">
              Indian wear for slow mornings, big celebrations and every moment in between. Find the piece that feels like yours.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/collections"
                className="group inline-flex min-h-12 items-center justify-center gap-3 rounded-full bg-[#e4c68c] px-6 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#2d1820] shadow-[0_8px_28px_rgba(0,0,0,0.18)] transition hover:bg-[#f0d9aa]"
              >
                Explore the collection <ArrowIcon />
              </Link>
              <Link
                href="/about"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/20 px-6 py-3 text-xs font-medium uppercase tracking-[0.12em] text-white/85 transition hover:border-[#e4c68c]/70 hover:text-[#f0d9aa]"
              >
                The Vani story
              </Link>
            </div>
          </div>

          <div className="lg:col-span-5">
            <Link href="/contact" aria-label="Visit the Vani Collection boutique in Guna" className="group relative block">
              <div className="relative aspect-[1.18] overflow-hidden rounded-[1.65rem] border border-white/20 bg-[#50313a] shadow-[0_28px_70px_rgba(0,0,0,0.32)] sm:aspect-[1.35] lg:aspect-[1.08]">
                <Image
                  src="/vani-store-front.jpg"
                  alt="Vani Collection boutique on Station Road in Guna"
                  fill
                  sizes="(max-width: 1023px) 100vw, 42vw"
                  className="object-cover object-center transition duration-700 group-hover:scale-[1.035]"
                />
                <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-[#160b10]/90 via-[#160b10]/10 to-black/5" />
                <span className="absolute left-5 top-5 rounded-full border border-white/35 bg-[#28131d]/45 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-white backdrop-blur-sm sm:left-6 sm:top-6">
                  Our Guna boutique
                </span>
                <div className="absolute inset-x-5 bottom-5 flex items-end justify-between gap-4 sm:inset-x-6 sm:bottom-6">
                  <div>
                    <p className="font-serif text-2xl text-white sm:text-3xl">Come say hello.</p>
                    <p className="mt-1 text-xs text-white/75 sm:text-sm">Station Road · Guna, Madhya Pradesh</p>
                  </div>
                  <span className="mb-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#f3dfb3] text-[#36131f] transition-transform duration-300 group-hover:translate-x-1">
                    <ArrowIcon />
                  </span>
                </div>
              </div>
            </Link>
          </div>
        </div>

        <div className="relative border-t border-white/10">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-4 text-[10px] uppercase tracking-[0.17em] text-white/50 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
            <span>Guna · Madhya Pradesh · India</span>
            <span className="font-serif text-sm normal-case tracking-wide text-[#e6c88f]">Made to feel like you.</span>
          </div>
        </div>
      </section>

      {/* Newsletter card sits across the two colour fields */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="-mt-7 grid gap-5 rounded-2xl border border-[#d8c7ae] bg-[#eadfce] px-5 py-6 shadow-[0_18px_48px_rgba(54,32,25,0.12)] sm:-mt-8 sm:grid-cols-2 sm:items-center sm:gap-8 sm:px-8 sm:py-8 lg:px-10">
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#8b273e]">The Vani letter</p>
            <h3 className="font-serif text-2xl leading-tight text-[#2d211d] sm:text-[1.75rem]">A note worth opening.</h3>
            <p className="mt-2 max-w-md text-xs leading-relaxed text-[#6f6256] sm:text-sm">
              New arrivals, styling notes and stories from Guna — shared every now and then.
            </p>
          </div>

          <form onSubmit={handleSubscribe}>
            <label htmlFor="footer-email" className="sr-only">Email address</label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                id="footer-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setSubscribed(false);
                }}
                placeholder="Your email address"
                className="min-w-0 flex-1 rounded-full border border-[#d3c4b1] bg-[#fffdf9] px-4 py-3 text-sm text-[#2b211e] placeholder:text-[#8c8075] focus:border-[#8b273e] focus:outline-none focus:ring-2 focus:ring-[#8b273e]/15"
              />
              <button
                type="submit"
                disabled={subscribing}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#781e36] px-5 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-white transition hover:bg-[#5d172b] disabled:cursor-wait disabled:opacity-70"
              >
                {subscribing ? "Joining…" : "Sign me up"}
                <ArrowIcon />
              </button>
            </div>
            <p aria-live="polite" className={`mt-2 min-h-4 px-2 text-[11px] ${subscribed ? "text-emerald-800" : "text-[#76695d]"}`}>
              {subscribed ? "Thank you — look out for our next note." : "Only the good stuff. Unsubscribe whenever you like."}
            </p>
          </form>
        </div>
      </div>

      {/* Useful links and direct contact */}
      <div className="mx-auto max-w-7xl px-4 pb-10 pt-12 sm:px-6 sm:pb-12 sm:pt-14 lg:px-8">
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 sm:gap-x-8 lg:grid-cols-12 lg:gap-x-10">
          <div className="col-span-2 sm:col-span-3 lg:col-span-4">
            <Link href="/" aria-label="Vani Collection home" className="inline-flex flex-col">
              <span className="font-serif text-[2rem] leading-none tracking-[-0.035em] text-[#781e36] sm:text-4xl">Vani Collection</span>
              <span className="mt-2 text-[9px] font-semibold uppercase tracking-[0.23em] text-[#8b7b6d]">A little tradition, a lot of you</span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-[#6f6258]">
              Thoughtfully chosen Indian wear for everyday moments, celebrations and everything in between.
            </p>
            <div className="mt-5 flex items-center gap-2.5">
              <a
                href="https://www.instagram.com/vanicollection_guna"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Vani Collection on Instagram"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[#d6c8b7] text-[#781e36] transition hover:border-[#781e36] hover:bg-[#781e36] hover:text-white"
              >
                <InstagramIcon />
              </a>
              <a
                href="https://wa.me/919876543210?text=Hi%20Vani%20Collection%2C%20I%20need%20help%20choosing%20an%20outfit."
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Chat with Vani Collection on WhatsApp"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[#d6c8b7] text-[#781e36] transition hover:border-[#781e36] hover:bg-[#781e36] hover:text-white"
              >
                <WhatsAppIcon />
              </a>
            </div>
          </div>

          <nav aria-label="Shop collections" className="lg:col-span-3">
            <h3 className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-[#8b273e]">Explore</h3>
            <ul className="space-y-3">
              {shopCategories.map((category) => (
                <li key={category.slug}>
                  <Link href={`/products?category=${encodeURIComponent(category.slug)}`} className="group inline-flex items-center gap-2 text-sm text-[#51463e] transition hover:text-[#781e36]">
                    <span className="h-px w-0 bg-[#8b273e] transition-all group-hover:w-3" />
                    {category.name}
                  </Link>
                </li>
              ))}
              <li className="pt-1">
                <Link href="/collections" className="group inline-flex items-center gap-2 text-sm font-semibold text-[#781e36]">
                  All collections <ArrowIcon />
                </Link>
              </li>
            </ul>
          </nav>

          <nav aria-label="Customer care and company information" className="lg:col-span-2">
            <h3 className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-[#8b273e]">Good to know</h3>
            <ul className="space-y-3">
              {[...FOOTER_LINKS.help.slice(0, 4), ...FOOTER_LINKS.about.slice(0, 1)].map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-sm text-[#51463e] transition hover:text-[#781e36]">{item.label}</Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="col-span-2 sm:col-span-3 lg:col-span-3">
            <h3 className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-[#8b273e]">Come by or say hello</h3>
            <Link href="/contact" className="group flex items-start gap-3 text-sm leading-relaxed text-[#51463e] transition hover:text-[#781e36]">
              <span className="mt-0.5 text-[#8b273e]"><PinIcon /></span>
              <span>Station Road<br />Guna, Madhya Pradesh 473001</span>
            </Link>
            <div className="mt-4 space-y-3">
              <a href="tel:+919876543210" className="flex items-center gap-3 text-sm text-[#51463e] transition hover:text-[#781e36]">
                <span className="text-[#8b273e]"><PhoneIcon /></span>
                <span>+91 98765-43210</span>
              </a>
              <a href="mailto:Vanicollectionguna@gmail.com" className="flex items-center gap-3 break-all text-sm text-[#51463e] transition hover:text-[#781e36]">
                <span className="text-[#8b273e]"><MailIcon /></span>
                <span>Vanicollectionguna@gmail.com</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* A quiet, useful sign-off */}
      <div className="bg-[#29161d] text-white/75">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 pb-20 sm:px-6 sm:py-5 lg:flex-row lg:items-center lg:justify-between lg:px-8 lg:pb-6">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px]">
            <span>© {currentYear} Vani Collection</span>
            <span className="hidden text-white/25 sm:inline">|</span>
            <span className="text-white/50">Made with care in Guna, Madhya Pradesh</span>
          </div>
          <PaymentIcons />
          <div className="flex items-center gap-4 text-[11px]">
            <Link href="/privacy" className="transition hover:text-[#e6c88f]">Privacy</Link>
            <Link href="/terms" className="transition hover:text-[#e6c88f]">Terms</Link>
            <button type="button" onClick={scrollToTop} className="group inline-flex items-center gap-1.5 transition hover:text-[#e6c88f]" aria-label="Back to top of page">
              Back to top <ArrowIcon direction="up" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
