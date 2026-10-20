import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import BreadcrumbSchema from "@/components/seo/breadcrumb-schema";
import { absoluteUrl } from "@/lib/seo";
import { STORE_PHONE_DISPLAY, STORE_WHATSAPP_NUMBER } from "@/lib/site-contact";
import { fetchContentByKind, fetchContentByKey } from "@/lib/content";

interface CraftPillar { title: string; tagline: string; desc: string; badge: string; image: string; }
interface SustainabilityPillar { icon: string; title: string; desc: string; }
interface AtelierInfo {
  foundedBadge: string; heroSubtitle: string; location: string; hours: string;
  phone: string; waPhone: string; storyPara1: string; storyPara2: string;
  statBadgeNumber: string; statBadgeLabel: string; chapterIIISubtitle: string;
  storyImageUrl: string; storyQuote: string;
}

const DA: AtelierInfo = {
  foundedBadge: '✨ Speciality in Fancy Kurties & Party Wear Dresses · Guna',
  heroSubtitle: "Vani Collection was founded with a singular, unyielding devotion: to rescue India's most treasured handloom textiles from machine replication and restore pure, breathable luxury to the modern woman's wardrobe.",
  location: 'Station Road, Guna, Madhya Pradesh',
  hours: 'Mon \u2013 Sat \u00b7 10:30 AM \u2013 7:30 PM',
  phone: STORE_PHONE_DISPLAY,
  waPhone: STORE_WHATSAPP_NUMBER,
  storyPara1: 'In an era dominated by synthetic polyesters and cold, hurried mass-production factories, Vani Collection took the road less traveled \u2014 back to the sun-baked artisan colonies of Bagru, Sanganer, and Patan.',
  storyPara2: "We started with just three wooden looms and five fifth-generation master block carvers who feared their ancestral craft would disappear forever. We made a sacred vow: never use artificial polyester blends, never dilute our natural dyes.",
  statBadgeNumber: '1,200+',
  statBadgeLabel: 'Hand-carved block stamps on every single royal ensemble.',
  chapterIIISubtitle: 'True luxury cannot be hurried. Here is our unwavering promise to our patrons and the planet.',
  storyImageUrl: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=1200&q=85',
  storyQuote: 'A garment is not merely cloth; it is the heartbeat of hands that have sung to the wooden loom for five hundred years.',
};

const DC: CraftPillar[] = [
  { title: '100-Count Pure Mul Cotton', tagline: 'The Featherweight Muslin of Royalty', desc: 'Spun from long-staple Indian cotton into an ethereal 100-count weave. Impossibly soft and breathable, it keeps you gracefully cool in summers while draping like a gentle morning mist.', badge: 'Breathable Luxury', image: 'https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=800&q=80' },
  { title: 'Pure Gaji & Mashru Silk', tagline: 'The Royal Satin Weave of Kutch', desc: 'A legendary textile born for the royal courts: radiant high-gloss silk exterior that catches the evening light, backed by pure soft cotton inside for skin-friendly, all-day comfort.', badge: 'Heirloom Silk', image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&q=80' },
  { title: 'Double-Ikat Patola Weaves', tagline: 'Geometry of Master Weavers', desc: 'An 800-year-old craft where both warp and weft yarns are individually tied and dyed with botanical pigments before weaving. Each dupatta requires up to 35 days of mathematical alignment.', badge: 'Heritage Masterwork', image: 'https://images.unsplash.com/photo-1603189343302-e603f7add05a?w=800&q=80' },
  { title: 'Bagru Dabu Mud-Resist', tagline: 'Printed by Hand, River-Washed', desc: 'Carved teakwood blocks stamped by hand over 1,400 times per saree using black river clay, gum, and sawdust, then submerged into natural indigo dye vats under the desert sun.', badge: 'Natural Botanical', image: 'https://images.unsplash.com/photo-1609357605129-26f69add5d6e?w=800&q=80' },
];

const DS: SustainabilityPillar[] = [
  { icon: '\U0001f331', title: 'Zero Fast-Fashion Waste', desc: 'We produce in small, deliberate batches. Every scrap of leftover silk and mulmul is upcycled into potlis, pocket squares, and garment tags.' },
  { icon: '\U0001f3a8', title: 'Natural Botanical Extracts', desc: 'Our color palette draws from mother nature: natural fermented indigo leaves, wild madder root, dried pomegranate rind, and turmeric.' },
  { icon: '\U0001f932', title: 'Fair Artisan Patronage', desc: 'Over 120+ weaver and block-printer families earn dignified, transparent wages, keeping the ancient rhythm of Indian looms alive for future generations.' },
  { icon: '\U0001f451', title: 'Heirloom Durability', desc: 'Crafted with interlocking seams and pure unadulterated natural yarns designed to soften with every wash and be passed down to daughters and granddaughters.' },
];

function pb(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) return raw as Record<string, unknown>;
  return {};
}
function s(v: unknown): string { return typeof v === 'string' && v.trim() ? v.trim() : ''; }

async function load() {
  try {
    const [sec, sus, atel] = await Promise.all([
      fetchContentByKind('section'), fetchContentByKind('testimonial'), fetchContentByKey('about.atelier'),
    ]);
    const ab = pb(atel?.blocks);
    const atelier: AtelierInfo = {
      foundedBadge: s(ab.foundedBadge) || DA.foundedBadge,
      heroSubtitle: s(atel?.body) || s(ab.heroSubtitle) || DA.heroSubtitle,
      location: s(ab.location) || DA.location, hours: s(ab.hours) || DA.hours,
      phone: s(ab.phone) || DA.phone, waPhone: s(ab.waPhone) || DA.waPhone,
      storyPara1: s(ab.storyPara1) || DA.storyPara1, storyPara2: s(ab.storyPara2) || DA.storyPara2,
      statBadgeNumber: s(ab.statBadgeNumber) || DA.statBadgeNumber, statBadgeLabel: s(ab.statBadgeLabel) || DA.statBadgeLabel,
      chapterIIISubtitle: s(ab.chapterIIISubtitle) || DA.chapterIIISubtitle,
      storyImageUrl: s(ab.storyImageUrl) || (atel?.media?.[0]?.url) || DA.storyImageUrl,
      storyQuote: s(ab.storyQuote) || DA.storyQuote,
    };
    const cc = sec.filter((d) => d.key.startsWith('about.craft.'));
    const crafts: CraftPillar[] = cc.length ? cc.map((d, i) => { const b = pb(d.blocks); const df = DC[i] ?? DC[0]; return { title: s(d.title) || df.title, tagline: s(d.subtitle) || s(b.tagline) || df.tagline, desc: s(d.body) || df.desc, badge: s(b.badge) || df.badge, image: d.media?.[0]?.url || s(b.image) || df.image }; }) : DC;
    const sectionPillars = sec.filter((d) => d.key.startsWith('about.sustain.'));
    // Older saves stored these pillars as testimonials by mistake; keep reading them until staff
    // re-save (or use the migration button in Admin → Homepage reviews).
    const sc = sectionPillars.length ? sectionPillars : sus.filter((d) => d.key.startsWith('about.sustain.'));
    const sustainability: SustainabilityPillar[] = sc.length ? sc.map((d, i) => { const b = pb(d.blocks); const df = DS[i] ?? DS[0]; return { icon: s(b.icon) || df.icon, title: s(d.title) || df.title, desc: s(d.body) || df.desc }; }) : DS;
    return { atelier, crafts, sustainability };
  } catch { return { atelier: DA, crafts: DC, sustainability: DS }; }
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Our Story · The Guna Atelier Heritage | Vani Collection',
    description: 'Discover the soul of Vani Collection — born amidst the artisan guilds of Guna, Madhya Pradesh. Speciality in Fancy Kurties & Party Wear Dresses. Preserving ancient hand-block printing, pure Gaji silk, and featherweight 100-count Mulmul.',
    alternates: { canonical: absoluteUrl("/about") },
    keywords: [
      "Vani Collection story", "Vani Collection Guna", "handloom Guna",
      "mul cotton", "Bagru handblock print", "ethnic wear Madhya Pradesh",
      "fancy kurties Guna", "party wear dresses Guna", "handcrafted Indian wear",
    ],
    openGraph: {
      type: "website",
      url: absoluteUrl("/about"),
      siteName: "Vani Collection",
      title: 'Our Story · Vani Collection Atelier',
      description: 'Handcrafted luxury ethnic wear rooted in the weaving traditions of Guna, Madhya Pradesh. Speciality in Fancy Kurties & Party Wear Dresses.',
      locale: "en_IN",
    },
    twitter: {
      card: "summary_large_image",
      title: 'Our Story · Vani Collection Atelier',
      description: 'Handcrafted luxury ethnic wear rooted in the weaving traditions of Guna, Madhya Pradesh.',
    },
  };
}

export default async function AboutPage() {
  const { atelier, crafts, sustainability } = await load();
  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: "Home", path: "/" },
          { name: "Our Story", path: "/about" },
        ]}
      />
    <div className="min-h-screen bg-[#faf7f2] text-stone-900 selection:bg-[#881337] selection:text-white">
      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#1c1917] via-[#2d121c] to-[#4c0519] text-white py-24 sm:py-32 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#dfc28c_1px,transparent_1px)] [background-size:24px_24px]" />
        <div className="relative max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#dfc28c]/30 bg-[#dfc28c]/10 px-4 py-1.5 text-[11px] font-semibold tracking-[0.25em] uppercase text-[#dfc28c] mb-6">
            <span>{atelier.foundedBadge}</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-normal leading-tight tracking-tight text-white mb-6">
            Where Ancient Loom Poetry Meets{' '}
            <span className="italic font-normal text-[#dfc28c]">Contemporary Royal Grace</span>
          </h1>
          <p className="max-w-3xl mx-auto text-sm sm:text-base lg:text-lg text-white/80 leading-relaxed font-light mb-10">{atelier.heroSubtitle}</p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/products" className="rounded-xl bg-[#dfc28c] px-8 py-3.5 text-xs sm:text-sm font-bold uppercase tracking-[0.2em] text-[#1c1917] transition hover:bg-white shadow-lg shadow-black/30">Explore The Collection</Link>
            <Link href="/contact" className="rounded-xl border border-white/30 bg-white/5 backdrop-blur-sm px-8 py-3.5 text-xs sm:text-sm font-bold uppercase tracking-[0.2em] text-white transition hover:bg-white/15">Visit Our Atelier</Link>
          </div>
        </div>
      </section>

      {/* ─── Chapter 1: Genesis ─── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="relative">
            <div className="relative h-[420px] sm:h-[500px] w-full rounded-3xl overflow-hidden shadow-2xl border border-stone-200">
              <Image src={atelier.storyImageUrl} alt="Vani Collection Master Craftsman" fill priority className="object-cover" sizes="(max-width: 1024px) 100vw, 50vw" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute bottom-6 left-6 right-6 text-white">
                <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#dfc28c]">The Living Craft</p>
                <p className="font-serif text-lg sm:text-xl font-medium mt-1">&ldquo;{atelier.storyQuote}&rdquo;</p>
              </div>
            </div>
            <div className="absolute -bottom-6 -right-4 sm:-right-6 hidden sm:block bg-[#881337] text-white p-5 rounded-2xl shadow-xl border-2 border-white max-w-[210px]">
              <p className="text-2xl font-serif font-bold text-[#dfc28c]">{atelier.statBadgeNumber}</p>
              <p className="text-xs text-white/90 font-medium leading-snug mt-1">{atelier.statBadgeLabel}</p>
            </div>
          </div>
          <div className="space-y-6">
            <div className="inline-block">
              <span className="text-[11px] font-bold tracking-[0.25em] uppercase text-[#881337] bg-[#881337]/10 px-3 py-1 rounded-full">Chapter I \u00b7 The Genesis</span>
            </div>
            <h2 className="font-serif text-2xl sm:text-4xl text-stone-900 font-normal leading-tight">Rooted in the Artisan Courtyards of Guna</h2>
            <p className="text-stone-600 text-sm sm:text-base leading-relaxed">{atelier.storyPara1}</p>
            <p className="text-stone-600 text-sm sm:text-base leading-relaxed">{atelier.storyPara2}</p>
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-stone-200">
              <div className="rounded-2xl bg-white p-4 border border-stone-200/80 shadow-sm">
                <span className="text-xl">\U0001f33f</span>
                <h4 className="font-serif font-semibold text-stone-900 text-sm mt-2">100% Pure Fibers</h4>
                <p className="text-xs text-stone-500 mt-1">Pure Mulmul cotton and authentic Gaji silk that breathe effortlessly.</p>
              </div>
              <div className="rounded-2xl bg-white p-4 border border-stone-200/80 shadow-sm">
                <span className="text-xl">\u2600\ufe0f</span>
                <h4 className="font-serif font-semibold text-stone-900 text-sm mt-2">Sun-Baked Dyes</h4>
                <p className="text-xs text-stone-500 mt-1">Traditional vegetable indigo and madder dried under Madhya Pradesh sunlight.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Chapter 2: Sacred Weaves ─── */}
      <section className="bg-white py-20 lg:py-28 border-y border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-[11px] font-bold tracking-[0.25em] uppercase text-[#881337] bg-[#881337]/10 px-3 py-1 rounded-full">Chapter II \u00b7 The Pillars</span>
            <h2 className="font-serif text-3xl sm:text-4xl text-stone-900 font-normal mt-3 mb-4">The Four Sacred Weaves of Vani Collection</h2>
            <p className="text-sm sm:text-base text-stone-600">Each piece in our boutique is born from one of these time-honored artisanal disciplines.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {crafts.map((craft) => (
              <div key={craft.title} className="group rounded-2xl border border-stone-200 bg-[#faf7f2] overflow-hidden shadow-sm transition hover:shadow-xl hover:-translate-y-1 flex flex-col">
                <div className="relative h-56 w-full overflow-hidden">
                  <Image src={craft.image} alt={craft.title} fill className="object-cover transition duration-700 group-hover:scale-105" sizes="(max-width: 768px) 100vw, 25vw" />
                  <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-semibold text-white uppercase tracking-wider">{craft.badge}</div>
                </div>
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-serif text-lg font-bold text-stone-900 group-hover:text-[#881337] transition">{craft.title}</h3>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[#881337] mt-0.5 mb-2.5">{craft.tagline}</p>
                    <p className="text-xs text-stone-600 leading-relaxed">{craft.desc}</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-stone-200/60">
                    <Link href="/products" className="text-xs font-bold text-[#881337] hover:underline flex items-center gap-1"><span>Explore this weave</span><span>\u2192</span></Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Chapter 3: Slow Fashion Manifesto ─── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-[11px] font-bold tracking-[0.25em] uppercase text-[#881337] bg-[#881337]/10 px-3 py-1 rounded-full">Chapter III \u00b7 Our Vow</span>
          <h2 className="font-serif text-3xl sm:text-4xl text-stone-900 font-normal mt-3 mb-4">The Vani Slow Fashion Manifesto</h2>
          <p className="text-sm sm:text-base text-stone-600">{atelier.chapterIIISubtitle}</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {sustainability.map((item) => (
            <div key={item.title} className="rounded-2xl border border-stone-200/90 bg-white p-6 shadow-sm hover:shadow-md transition">
              <div className="text-3xl mb-4">{item.icon}</div>
              <h3 className="font-serif text-base font-bold text-stone-900 mb-2">{item.title}</h3>
              <p className="text-xs text-stone-600 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Chapter 4: Flagship Atelier ─── */}
      <section className="bg-gradient-to-br from-[#1c1917] to-[#3d2012] text-white py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto rounded-3xl border border-[#dfc28c]/20 bg-white/5 backdrop-blur-md p-8 sm:p-12 text-center">
          <span className="inline-block rounded-full bg-[#dfc28c]/15 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#dfc28c] mb-4">Flagship Atelier &amp; Studio</span>
          <h2 className="font-serif text-3xl sm:text-4xl font-normal text-white mb-4">Experience the Loom in Person</h2>
          <p className="max-w-2xl mx-auto text-sm sm:text-base text-white/80 leading-relaxed font-light mb-8">
            When you visit Guna, step into our serene atelier. Touch the raw mulmul, watch master carvers engrave teakwood blocks, and sip authentic saffron cardamom chai while our stylists curate your bridal or festive trousseau.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto text-xs text-stone-300 mb-8 border-y border-white/10 py-4">
            <div><p className="font-semibold text-white">\U0001f4cd Location</p><p className="mt-0.5 text-white/70">{atelier.location}</p></div>
            <div><p className="font-semibold text-white">\u23f0 Studio Hours</p><p className="mt-0.5 text-white/70">{atelier.hours}</p></div>
            <div><p className="font-semibold text-white">\U0001f4de Concierge</p><p className="mt-0.5 text-white/70">{atelier.phone}</p></div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/contact" className="rounded-xl bg-[#dfc28c] px-6 py-3 text-xs font-bold uppercase tracking-wider text-[#1c1917] hover:bg-white transition">Get Directions &amp; Contact</Link>
            <a
              href={`https://wa.me/${atelier.waPhone}?text=Hello%20Vani%20Collection%20Atelier,%20I%20would%20like%20to%20book%20a%20private%20styling%20appointment.`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl border border-white/30 bg-white/10 px-6 py-3 text-xs font-bold uppercase tracking-wider text-white hover:bg-white/20 transition"
            >
              Book Private Styling via WhatsApp
            </a>
          </div>
        </div>
      </section>
    </div>
    </>
  );
}
