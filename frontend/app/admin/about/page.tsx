"use client";

import { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import {
  Alert,
  ButtonPrimary,
  Card,
  Field,
  PageHeading,
  Textarea,
  TextInput,
} from "@/lib/admin-ui";
import MediaUploadField from "@/components/admin/MediaUploadField";
import { api, ApiError } from "@/lib/api-client";
import { STORE_PHONE_DISPLAY, STORE_WHATSAPP_NUMBER } from "@/lib/site-contact";

/* ─── Types ─── */
interface AtelierBlocks {
  foundedBadge: string;
  heroSubtitle: string;
  location: string;
  hours: string;
  phone: string;
  waPhone: string;
  storyPara1: string;
  storyPara2: string;
  statBadgeNumber: string;
  statBadgeLabel: string;
  chapterIIISubtitle: string;
  storyImageUrl: string;
  storyQuote: string;
}

interface CraftForm {
  key: string;
  title: string;
  tagline: string;
  desc: string;
  badge: string;
  image: string;
}

interface SustainForm {
  key: string;
  icon: string;
  title: string;
  desc: string;
}

const DEFAULT_CRAFTS: Omit<CraftForm, "key">[] = [
  { title: "100-Count Pure Mul Cotton", tagline: "The Featherweight Muslin of Royalty", desc: "Spun from long-staple Indian cotton into an ethereal 100-count weave. Impossibly soft and breathable, it keeps you gracefully cool in summers while draping like a gentle morning mist.", badge: "Breathable Luxury", image: "https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=800&q=80" },
  { title: "Pure Gaji & Mashru Silk", tagline: "The Royal Satin Weave of Kutch", desc: "A legendary textile born for the royal courts: radiant high-gloss silk exterior that catches the evening light, backed by pure soft cotton inside for skin-friendly, all-day comfort.", badge: "Heirloom Silk", image: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&q=80" },
  { title: "Double-Ikat Patola Weaves", tagline: "Geometry of Master Weavers", desc: "An 800-year-old craft where both warp and weft yarns are individually tied and dyed with botanical pigments before weaving. Each dupatta requires up to 35 days of mathematical alignment.", badge: "Heritage Masterwork", image: "https://images.unsplash.com/photo-1603189343302-e603f7add05a?w=800&q=80" },
  { title: "Bagru Dabu Mud-Resist", tagline: "Printed by Hand, River-Washed", desc: "Carved teakwood blocks stamped by hand over 1,400 times per saree using black river clay, gum, and sawdust, then submerged into natural indigo dye vats under the desert sun.", badge: "Natural Botanical", image: "https://images.unsplash.com/photo-1609357605129-26f69add5d6e?w=800&q=80" },
];

const DEFAULT_SUSTAIN: Omit<SustainForm, "key">[] = [
  { icon: "🌱", title: "Zero Fast-Fashion Waste", desc: "We produce in small, deliberate batches. Every scrap of leftover silk and mulmul is upcycled into potlis, pocket squares, and garment tags." },
  { icon: "🎨", title: "Natural Botanical Extracts", desc: "Our color palette draws from mother nature: natural fermented indigo leaves, wild madder root, dried pomegranate rind, and turmeric." },
  { icon: "🤲", title: "Fair Artisan Patronage", desc: "Over 120+ weaver and block-printer families earn dignified, transparent wages, keeping the ancient rhythm of Indian looms alive for future generations." },
  { icon: "👑", title: "Heirloom Durability", desc: "Crafted with interlocking seams and pure unadulterated natural yarns designed to soften with every wash and be passed down to daughters and granddaughters." },
];

const CRAFT_KEYS = ["about.craft.1", "about.craft.2", "about.craft.3", "about.craft.4"];
const SUSTAIN_KEYS = ["about.sustain.1", "about.sustain.2", "about.sustain.3", "about.sustain.4"];

/* ─── Section Tab ─── */
type Tab = "atelier" | "crafts" | "sustainability";

export default function AdminAboutPage() {
  const [tab, setTab] = useState<Tab>("atelier");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ kind: "success" | "danger"; msg: string } | null>(null);

  /* ─── Atelier / Hero state ─── */
  const [atelier, setAtelier] = useState<AtelierBlocks>({
    foundedBadge: "\u2728 Demo City Atelier \u00b7 Est. 2018 \u00b7 India",
    heroSubtitle: "Demo Collection was founded with a singular, unyielding devotion: to rescue India's most treasured handloom textiles from machine replication and restore pure, breathable luxury to the modern woman's wardrobe.",
    location: "Demo Street, Demo City, India",
    hours: "Mon \u2013 Sat \u00b7 10:30 AM \u2013 7:30 PM",
    phone: STORE_PHONE_DISPLAY,
    waPhone: STORE_WHATSAPP_NUMBER,
    storyPara1: "In an era dominated by synthetic polyesters and cold, hurried mass-production factories, Demo Collection took the road less traveled \u2014 back to the sun-baked artisan colonies of Bagru, Sanganer, and Patan.",
    storyPara2: "We started with just three wooden looms and five fifth-generation master block carvers who feared their ancestral craft would disappear forever.",
    statBadgeNumber: "1,200+",
    statBadgeLabel: "Hand-carved block stamps on every single royal ensemble.",
    chapterIIISubtitle: "True luxury cannot be hurried. Here is our unwavering promise to our patrons and the planet.",
    storyImageUrl: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=1200&q=85",
    storyQuote: "A garment is not merely cloth; it is the heartbeat of hands that have sung to the wooden loom for five hundred years.",
  });

  // Load existing CMS data on mount
  useEffect(() => {
    api.contentByKey("about.atelier").then((res) => {
      const blocks = (res?.data?.blocks ?? {}) as Partial<AtelierBlocks>;
      if (Object.keys(blocks).length > 0) setAtelier((prev) => ({ ...prev, ...blocks }));
    }).catch(() => {/* no saved data yet — defaults are fine */});
  }, []);

  /* ─── Craft pillars state ─── */
  const [crafts, setCrafts] = useState<CraftForm[]>(
    CRAFT_KEYS.map((key, i) => ({ key, ...DEFAULT_CRAFTS[i] }))
  );

  /* ─── Sustainability pillars state ─── */
  const [sustain, setSustain] = useState<SustainForm[]>(
    SUSTAIN_KEYS.map((key, i) => ({ key, ...DEFAULT_SUSTAIN[i] }))
  );

  const show = (kind: "success" | "danger", msg: string) => {
    setNotice({ kind, msg });
    setTimeout(() => setNotice(null), 4000);
  };

  /* ─── Save Atelier ─── */
  const saveAtelier = async () => {
    setBusy(true);
    try {
      await api.upsertContent("about.atelier", {
        kind: "page",
        title: "About Page — Atelier Info",
        body: atelier.heroSubtitle,
        blocks: atelier,
        status: "published",
      });
      show("success", "Atelier info saved! Changes live on /about immediately.");
    } catch (e) {
      show("danger", e instanceof ApiError ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  /* ─── Save Crafts ─── */
  const saveCrafts = async () => {
    setBusy(true);
    try {
      await Promise.all(
        crafts.map((c) =>
          api.upsertContent(c.key, {
            kind: "section",
            title: c.title, subtitle: c.tagline,
            body: c.desc,
            media: c.image ? [{ url: c.image, alt: c.title, kind: "image" }] : [],
            blocks: { badge: c.badge, image: c.image, tagline: c.tagline },
            status: "published",
          })
        )
      );
      show("success", "Craft pillars saved! Live on /about immediately.");
    } catch (e) {
      show("danger", e instanceof ApiError ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  /* ─── Save Sustainability ─── */
  const saveSustain = async () => {
    setBusy(true);
    try {
      await Promise.all(
        sustain.map((s) =>
          api.upsertContent(s.key, {
            kind: "section",
            title: s.title, body: s.desc,
            blocks: { icon: s.icon },
            status: "published",
          })
        )
      );
      show("success", "Sustainability pillars saved! Live on /about immediately.");
    } catch (e) {
      show("danger", e instanceof ApiError ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const updateCraft = useCallback((i: number, field: keyof CraftForm, val: string) => {
    setCrafts((prev) => prev.map((c, idx) => idx === i ? { ...c, [field]: val } : c));
  }, []);

  const updateSustain = useCallback((i: number, field: keyof SustainForm, val: string) => {
    setSustain((prev) => prev.map((s, idx) => idx === i ? { ...s, [field]: val } : s));
  }, []);

  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="Content Management"
        title="About Page Editor"
        subtitle="Edit every section of /about — changes go live instantly without a deploy."
        action={
          <a href="/about" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-[#ebe6de] bg-white px-3 py-2 text-xs font-semibold text-stone-700 hover:border-[#dfc28c] transition">
            <span>Preview /about</span>
            <span className="text-stone-400">↗</span>
          </a>
        }
      />

      {notice && (
        <Alert tone={notice.kind}>{notice.msg}</Alert>
      )}

      {/* ─── Tabs ─── */}
      <div className="flex gap-1 rounded-xl bg-[#f5f0e8] p-1 w-fit">
        {(["atelier", "crafts", "sustainability"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-2 text-xs font-semibold capitalize transition ${tab === t ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-700"}`}
          >
            {t === "atelier" ? "Hero & Atelier" : t === "crafts" ? "Craft Pillars" : "Sustainability"}
          </button>
        ))}
      </div>

      {/* ─── Atelier Tab ─── */}
      {tab === "atelier" && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-5">
            <Card className="p-6 space-y-5">
              <h3 className="font-serif text-lg font-semibold text-stone-900">Hero Section</h3>
              <Field label="Founded Badge Text" hint="Shown in the pill above the hero headline">
                <TextInput id="foundedBadge" value={atelier.foundedBadge} onChange={(e) => setAtelier({ ...atelier, foundedBadge: e.target.value })} disabled={busy} />
              </Field>
              <Field label="Hero Subtitle" hint="The paragraph below the headline">
                <Textarea id="heroSubtitle" rows={3} value={atelier.heroSubtitle} onChange={(e) => setAtelier({ ...atelier, heroSubtitle: e.target.value })} disabled={busy} />
              </Field>
            </Card>

            <Card className="p-6 space-y-5">
              <h3 className="font-serif text-lg font-semibold text-stone-900">Chapter I — Genesis Story</h3>
              <Field label="Story Image URL" hint="Main left-side image in the genesis section">
                <TextInput id="storyImageUrl" value={atelier.storyImageUrl} onChange={(e) => setAtelier({ ...atelier, storyImageUrl: e.target.value })} disabled={busy} placeholder="https://..." />
                <MediaUploadField type="image" multiple={false} disabled={busy} onUploaded={(urls) => setAtelier({ ...atelier, storyImageUrl: urls[0] ?? atelier.storyImageUrl })} />
                {atelier.storyImageUrl && (
                  <div className="mt-2 relative h-28 w-full rounded-xl overflow-hidden border border-stone-200">
                    <Image src={atelier.storyImageUrl} alt="Story preview" fill className="object-cover" />
                  </div>
                )}
              </Field>
              <Field label="Story Quote" hint="Overlaid text on the image">
                <Textarea id="storyQuote" rows={2} value={atelier.storyQuote} onChange={(e) => setAtelier({ ...atelier, storyQuote: e.target.value })} disabled={busy} />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Stat Badge Number">
                  <TextInput id="statBadgeNumber" value={atelier.statBadgeNumber} onChange={(e) => setAtelier({ ...atelier, statBadgeNumber: e.target.value })} disabled={busy} />
                </Field>
                <Field label="Stat Badge Label">
                  <TextInput id="statBadgeLabel" value={atelier.statBadgeLabel} onChange={(e) => setAtelier({ ...atelier, statBadgeLabel: e.target.value })} disabled={busy} />
                </Field>
              </div>
              <Field label="Story Paragraph 1">
                <Textarea id="storyPara1" rows={3} value={atelier.storyPara1} onChange={(e) => setAtelier({ ...atelier, storyPara1: e.target.value })} disabled={busy} />
              </Field>
              <Field label="Story Paragraph 2">
                <Textarea id="storyPara2" rows={3} value={atelier.storyPara2} onChange={(e) => setAtelier({ ...atelier, storyPara2: e.target.value })} disabled={busy} />
              </Field>
            </Card>

            <Card className="p-6 space-y-5">
              <h3 className="font-serif text-lg font-semibold text-stone-900">Chapter III — Manifesto Subtitle</h3>
              <Field label="Sustainability Chapter Subtitle">
                <Textarea id="chapterIIISubtitle" rows={2} value={atelier.chapterIIISubtitle} onChange={(e) => setAtelier({ ...atelier, chapterIIISubtitle: e.target.value })} disabled={busy} />
              </Field>
            </Card>
          </div>

          {/* Right panel — Atelier Details */}
          <div className="space-y-5">
            <Card className="p-6 space-y-5">
              <h3 className="font-serif text-lg font-semibold text-stone-900">Flagship Atelier Details</h3>
              <Field label="Location">
                <TextInput id="location" value={atelier.location} onChange={(e) => setAtelier({ ...atelier, location: e.target.value })} disabled={busy} />
              </Field>
              <Field label="Studio Hours">
                <TextInput id="hours" value={atelier.hours} onChange={(e) => setAtelier({ ...atelier, hours: e.target.value })} disabled={busy} />
              </Field>
              <Field label="Phone (display)">
                <TextInput id="phone" value={atelier.phone} onChange={(e) => setAtelier({ ...atelier, phone: e.target.value })} disabled={busy} />
              </Field>
              <Field label="WhatsApp Number" hint={`Country code ke saath sirf numbers, e.g. ${STORE_WHATSAPP_NUMBER}`}>
                <TextInput id="waPhone" value={atelier.waPhone} onChange={(e) => setAtelier({ ...atelier, waPhone: e.target.value })} disabled={busy} />
              </Field>
            </Card>

            <ButtonPrimary onClick={saveAtelier} disabled={busy} className="w-full justify-center">
              {busy ? "Saving…" : "Save Atelier & Hero"}
            </ButtonPrimary>
          </div>
        </div>
      )}

      {/* ─── Craft Pillars Tab ─── */}
      {tab === "crafts" && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {crafts.map((craft, i) => (
              <Card key={craft.key} className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#881337]/10 text-xs font-bold text-[#881337]">{i + 1}</span>
                  <h4 className="font-serif font-semibold text-stone-900">{craft.title || `Craft Pillar ${i + 1}`}</h4>
                </div>
                {craft.image && (
                  <div className="relative h-32 w-full rounded-xl overflow-hidden border border-stone-200">
                    <Image src={craft.image} alt={craft.title} fill className="object-cover" />
                  </div>
                )}
                <Field label="Image URL">
                  <TextInput id={`craft-img-${i}`} value={craft.image} onChange={(e) => updateCraft(i, "image", e.target.value)} disabled={busy} placeholder="https://..." />
                  <MediaUploadField type="image" multiple={false} disabled={busy} onUploaded={(urls) => updateCraft(i, "image", urls[0] ?? craft.image)} />
                </Field>
                <Field label="Title">
                  <TextInput id={`craft-title-${i}`} value={craft.title} onChange={(e) => updateCraft(i, "title", e.target.value)} disabled={busy} />
                </Field>
                <Field label="Tagline (small red text)">
                  <TextInput id={`craft-tagline-${i}`} value={craft.tagline} onChange={(e) => updateCraft(i, "tagline", e.target.value)} disabled={busy} />
                </Field>
                <Field label="Badge (top-right chip)">
                  <TextInput id={`craft-badge-${i}`} value={craft.badge} onChange={(e) => updateCraft(i, "badge", e.target.value)} disabled={busy} />
                </Field>
                <Field label="Description">
                  <Textarea id={`craft-desc-${i}`} rows={3} value={craft.desc} onChange={(e) => updateCraft(i, "desc", e.target.value)} disabled={busy} />
                </Field>
              </Card>
            ))}
          </div>
          <ButtonPrimary onClick={saveCrafts} disabled={busy} className="w-full justify-center">
            {busy ? "Saving…" : "Save All Craft Pillars"}
          </ButtonPrimary>
        </div>
      )}

      {/* ─── Sustainability Tab ─── */}
      {tab === "sustainability" && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {sustain.map((item, i) => (
              <Card key={item.key} className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{item.icon || "📌"}</span>
                  <h4 className="font-serif font-semibold text-stone-900">{item.title || `Pillar ${i + 1}`}</h4>
                </div>
                <Field label="Emoji Icon" hint="Paste a single emoji e.g. 🌱">
                  <TextInput id={`sus-icon-${i}`} value={item.icon} onChange={(e) => updateSustain(i, "icon", e.target.value)} disabled={busy} />
                </Field>
                <Field label="Title">
                  <TextInput id={`sus-title-${i}`} value={item.title} onChange={(e) => updateSustain(i, "title", e.target.value)} disabled={busy} />
                </Field>
                <Field label="Description">
                  <Textarea id={`sus-desc-${i}`} rows={3} value={item.desc} onChange={(e) => updateSustain(i, "desc", e.target.value)} disabled={busy} />
                </Field>
              </Card>
            ))}
          </div>
          <ButtonPrimary onClick={saveSustain} disabled={busy} className="w-full justify-center">
            {busy ? "Saving…" : "Save All Sustainability Pillars"}
          </ButtonPrimary>
        </div>
      )}
    </div>
  );
}
