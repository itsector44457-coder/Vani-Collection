"use client";

import { useMemo, useState } from "react";
import {
  Alert,
  Badge,
  ButtonDanger,
  ButtonGhost,
  ButtonPrimary,
  Card,
  EmptyState,
  Field,
  Modal,
  PageHeading,
  Select,
  StatCard,
  Textarea,
  TextInput,
  type BadgeTone,
} from "@/lib/admin-ui";
import AdminDataBadge from "@/components/admin/AdminDataBadge";
import ContentPageManager from "@/components/admin/ContentPageManager";
import MediaUploadField from "@/components/admin/MediaUploadField";
import {
  api,
  ApiError,
  formatRelativeTime,
  type ContentDoc,
  type ContentInput,
} from "@/lib/api-client";
import { CONTENT_KINDS, type ContentKind } from "@/lib/content";
import { useApiResource } from "@/lib/use-api";

const DEMO_CONTENT: ContentDoc[] = [
  { _id: "c1", key: "home.banner.1", kind: "banner", title: "Poetry in Pure Mul Cotton", subtitle: "The Summer Bagru Edit 2026", body: "Featherlight 100-count handspun cotton woven for everyday grace.", ctaLabel: "Shop Pure Mul Sets", ctaHref: "#products", media: [{ url: "/vani-store-front.jpg", alt: "Vani Collection storefront" }], position: 0, status: "published", updatedAt: new Date(Date.now() - 86400e3 * 2).toISOString() },
  { _id: "c2", key: "home.banner.2", kind: "banner", title: "Gulmohar Festive Heirlooms", subtitle: "Chanderi Silk & Zari Soiree", body: "A timeless ode to royal celebrations.", ctaLabel: "Discover Festive Edit", ctaHref: "#products", position: 1, status: "published", updatedAt: new Date(Date.now() - 86400e3 * 2).toISOString() },
  { _id: "c3", key: "home.testimonial.ananya", kind: "testimonial", title: "Softest Mul Cotton I Have Ever Worn!", body: "The Gulab Bagh Anarkali is pure bliss in summer heat.", blocks: { name: "Dr. Ananya Roy", city: "Bengaluru", rating: 5, verified: true, product: "Gulab Bagh Anarkali Set" }, position: 0, status: "published", updatedAt: new Date(Date.now() - 86400e3 * 6).toISOString() },
  { _id: "c4", key: "home.faq.shipping", kind: "faq", title: "How long does delivery take?", body: "Orders are dispatched within 2–3 working days from Jaipur and usually arrive in 3–7 days. You get a tracking link by email the moment the courier picks it up.", position: 0, status: "published", updatedAt: new Date(Date.now() - 86400e3 * 9).toISOString() },
  { _id: "c5", key: "home.faq.fabric", kind: "faq", title: "What exactly is mul cotton?", body: "Mul cotton is a fine, handspun weaving native to Jaipur — breathable and lightweight, softer with every wash. We use 100-count mul for most of our everyday pieces.", position: 1, status: "draft", updatedAt: new Date(Date.now() - 86400e3 * 1).toISOString() },
];

/** What each kind actually drives, so an editor knows the consequence of a change. */
const KIND_HINTS: Record<string, string> = {
  banner: "Homepage hero slides, in `position` order",
  testimonial: "Homepage customer reviews",
  lookbook: "Homepage shoppable lookbook (first published block only)",
  faq: "Homepage FAQ accordion + FAQPage structured data",
  section: "Homepage category story tiles",
  page: "Standalone page copy",
  policy: "Shipping / returns / privacy policy copy",
  product_collection: "Homepage product selection and display order",
};

const KIND_TONES: Record<string, BadgeTone> = {
  banner: "gold",
  testimonial: "info",
  lookbook: "success",
  faq: "warning",
  section: "neutral",
  page: "neutral",
  policy: "neutral",
};

type KindFilter = "all" | ContentKind;
const KIND_OPTIONS: KindFilter[] = ["all", ...CONTENT_KINDS];

/** `url | alt | kind`, one per line — friendlier than asking an editor to write JSON for media. */
const mediaToText = (media?: ContentDoc["media"]): string =>
  (media ?? []).map((item) => [item.url, item.alt, item.kind].filter(Boolean).join(" | ")).join("\n");

const textToMedia = (text: string): { url: string; alt?: string; kind?: string }[] =>
  text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [url, alt, kind] = line.split("|").map((part) => part.trim());
      return { url, ...(alt ? { alt } : {}), ...(kind ? { kind } : {}) };
    })
    .filter((item) => Boolean(item.url));

const blocksToText = (blocks: unknown): string => {
  if (blocks === undefined || blocks === null) return "";
  try {
    return JSON.stringify(blocks, null, 2);
  } catch {
    return "";
  }
};

interface FormPin {
  id: string;
  title: string;
  price: string;
  tag: string;
  top: number;
  left: number;
}

interface FormState {
  key: string;
  kind: ContentKind;
  title: string;
  subtitle: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
  position: string;
  status: "draft" | "published";
  mediaText: string;
  blocksText: string;
  heroTag: string;
  focalPosition: string;
  // Testimonial-specific dedicated fields
  testiName: string;
  testiCity: string;
  testiRating: string;
  testiVerified: boolean;
  testiProduct: string;
  testiDate: string;
  // Section / Story specific fields
  sectionFilterKey: string;
  sectionCount: string;
  // Page SEO fields
  seoTitle: string;
  seoDescription: string;
  // Product collection
  collectionProductIds: string;
  // Lookbook Hotspot Pins (friendly visual list, no raw JSON)
  lookbookPins: FormPin[];
}

const EMPTY_FORM: FormState = {
  key: "",
  kind: "banner",
  title: "",
  subtitle: "",
  body: "",
  ctaLabel: "",
  ctaHref: "",
  position: "0",
  status: "published",
  mediaText: "",
  blocksText: "",
  heroTag: "",
  focalPosition: "object-center",
  testiName: "",
  testiCity: "",
  testiRating: "5",
  testiVerified: true,
  testiProduct: "",
  testiDate: "",
  sectionFilterKey: "",
  sectionCount: "",
  seoTitle: "",
  seoDescription: "",
  collectionProductIds: "",
  lookbookPins: [
    { id: "pin-1", title: "", price: "", tag: "", top: 35, left: 50 },
  ],
};

const toForm = (doc: ContentDoc): FormState => {
  const blocks = doc.blocks && typeof doc.blocks === "object" && !Array.isArray(doc.blocks)
    ? doc.blocks as Record<string, unknown>
    : {};
  const rawPins = Array.isArray(blocks.pins) ? (blocks.pins as Record<string, unknown>[]) : [];
  const lookbookPins: FormPin[] = rawPins.length
    ? rawPins.map((p, idx) => ({
        id: typeof p.id === "string" ? p.id : `pin-${idx + 1}`,
        title: typeof p.title === "string" ? p.title : "",
        price: typeof p.price === "string" ? p.price : "",
        tag: typeof p.tag === "string" ? p.tag : "",
        top: typeof p.top === "string" ? parseInt(p.top, 10) || 50 : typeof p.top === "number" ? p.top : 50,
        left: typeof p.left === "string" ? parseInt(p.left, 10) || 50 : typeof p.left === "number" ? p.left : 50,
      }))
    : [{ id: "pin-1", title: "", price: "", tag: "", top: 35, left: 50 }];

  return {
    key: doc.key,
    kind: doc.kind,
    title: doc.title ?? "",
    subtitle: doc.subtitle ?? "",
    body: doc.body ?? "",
    ctaLabel: doc.ctaLabel ?? "",
    ctaHref: doc.ctaHref ?? "",
    position: String(doc.position ?? 0),
    status: doc.status === "draft" ? "draft" : "published",
    mediaText: mediaToText(doc.media),
    blocksText: blocksToText(doc.blocks),
    heroTag: typeof blocks.tag === "string" ? blocks.tag : "",
    focalPosition: typeof blocks.position === "string" ? blocks.position : "object-center",
    // Testimonial fields
    testiName: typeof blocks.name === "string" ? blocks.name : (doc.title ?? ""),
    testiCity: typeof blocks.city === "string" ? blocks.city : "",
    testiRating: typeof blocks.rating === "number" ? String(blocks.rating) : "5",
    testiVerified: typeof blocks.verified === "boolean" ? blocks.verified : true,
    testiProduct: typeof blocks.product === "string" ? blocks.product : "",
    testiDate: typeof blocks.date === "string" ? blocks.date : "",
    // Section / Story fields
    sectionFilterKey: typeof blocks.filterKey === "string" ? blocks.filterKey : "",
    sectionCount: typeof blocks.count === "string" ? blocks.count : "",
    // Page SEO fields
    seoTitle: typeof blocks.seoTitle === "string" ? blocks.seoTitle : "",
    seoDescription: typeof blocks.seoDescription === "string" ? blocks.seoDescription : "",
    // Product collection
    collectionProductIds: Array.isArray(blocks.productIds) ? blocks.productIds.join(", ") : "",
    lookbookPins,
  };
};

export default function ContentPage() {
  const [kind, setKind] = useState<KindFilter>("all");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<ContentDoc | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [pendingDelete, setPendingDelete] = useState<ContentDoc | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const content = useApiResource<{ data: ContentDoc[] }>((signal) => api.managedContent(signal), { data: DEMO_CONTENT });
  const all = content.data.data;

  const counts = useMemo(() => {
    const byKind: Record<string, number> = { all: all.length };
    for (const value of CONTENT_KINDS) byKind[value] = all.filter((doc) => doc.kind === value).length;
    return byKind;
  }, [all]);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return all
      .filter((doc) => (kind === "all" ? true : doc.kind === kind))
      .filter((doc) => (term ? `${doc.key} ${doc.title ?? ""} ${doc.body ?? ""}`.toLowerCase().includes(term) : true))
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0) || a.key.localeCompare(b.key));
  }, [all, kind, search]);

  const stats = useMemo(() => {
    const published = all.filter((doc) => doc.status === "published");
    const drafts = all.length - published.length;
    return { total: all.length, published: published.length, drafts, faqs: counts.faq ?? 0 };
  }, [all, counts]);

  const set = <K extends keyof FormState>(field: K, value: FormState[K]) => setForm((current) => ({ ...current, [field]: value }));

  const updatePin = (index: number, changes: Partial<FormPin>) => {
    setForm((current) => {
      const nextPins = [...current.lookbookPins];
      if (nextPins[index]) {
        nextPins[index] = { ...nextPins[index], ...changes };
      }
      return { ...current, lookbookPins: nextPins };
    });
  };

  const addPin = () => {
    setForm((current) => ({
      ...current,
      lookbookPins: [
        ...current.lookbookPins,
        {
          id: `pin-${current.lookbookPins.length + 1}`,
          title: "",
          price: "",
          tag: "",
          top: 50,
          left: 50,
        },
      ],
    }));
  };

  const removePin = (index: number) => {
    setForm((current) => ({
      ...current,
      lookbookPins: current.lookbookPins.filter((_, i) => i !== index),
    }));
  };

  const nextKeyForKind = (k: ContentKind) => {
    const prefix = k === "page" ? "page." : k === "policy" ? "policy." : `home.${k}.`;
    const matching = all.filter((doc) => doc.kind === k).map((doc) => doc.key);
    const used = new Set(matching);
    let number = 1;
    while (used.has(`${prefix}${number}`)) number += 1;
    return `${prefix}${number}`;
  };

  const openCreate = () => {
    setEditing(null);
    const nextKind = kind === "all" ? "banner" : kind;
    setForm({
      ...EMPTY_FORM,
      kind: nextKind,
      key: nextKeyForKind(nextKind),
      position: String(all.filter((doc) => doc.kind === nextKind).length),
    });
    setError(null);
    setFormOpen(true);
  };

  const openCreateBanner = () => {
    setEditing(null);
    setForm({
      ...EMPTY_FORM,
      kind: "banner",
      key: nextKeyForKind("banner"),
      position: String(all.filter((doc) => doc.kind === "banner").length),
    });
    setError(null);
    setFormOpen(true);
  };

  const onKindChange = (newKind: ContentKind) => {
    setForm((current) => ({
      ...current,
      kind: newKind,
      key: editing ? current.key : nextKeyForKind(newKind),
    }));
  };

  const openEdit = (doc: ContentDoc) => {
    setEditing(doc);
    setForm(toForm(doc));
    setError(null);
    setFormOpen(true);
  };

  const submit = async () => {
    const key = form.key.trim();
    if (!editing && key.length < 2) {
      setError("A block needs a key of at least 2 characters — it is the stable id the storefront reads.");
      return;
    }
    if (!/^[a-z0-9._-]+$/i.test(key)) {
      setError("Use letters, numbers, dots, dashes and underscores only, e.g. `home.banner.1`.");
      return;
    }

    let blocks: unknown;

    if (form.kind === "testimonial") {
      if (!form.testiName.trim()) {
        setError("Customer name is required.");
        return;
      }
      if (!form.body.trim()) {
        setError("Review text / comment is required.");
        return;
      }
      const rating = Number(form.testiRating);
      blocks = {
        name: form.testiName.trim(),
        city: form.testiCity.trim() || undefined,
        rating: Number.isFinite(rating) ? Math.min(5, Math.max(1, rating)) : 5,
        verified: form.testiVerified,
        product: form.testiProduct.trim() || undefined,
        date: form.testiDate.trim() || undefined,
      };
    } else if (form.kind === "faq") {
      if (!form.title.trim()) {
        setError("Question is required.");
        return;
      }
      if (!form.body.trim()) {
        setError("Answer is required.");
        return;
      }
      blocks = undefined;
    } else if (form.kind === "banner") {
      if (!form.title.trim()) {
        setError("Headline / Title is required.");
        return;
      }
      blocks = {
        tag: form.heroTag.trim() || undefined,
        position: form.focalPosition || "object-center",
      };
    } else if (form.kind === "section") {
      if (!form.title.trim()) {
        setError("Collection / Story name is required.");
        return;
      }
      blocks = {
        filterKey: form.sectionFilterKey.trim() || undefined,
        count: form.sectionCount.trim() || undefined,
        tagline: form.subtitle.trim() || undefined,
        description: form.body.trim() || undefined,
      };
    } else if (form.kind === "page") {
      if (!form.title.trim()) {
        setError("Page title is required.");
        return;
      }
      blocks = {
        ...(form.seoTitle.trim() ? { seoTitle: form.seoTitle.trim() } : {}),
        ...(form.seoDescription.trim() ? { seoDescription: form.seoDescription.trim() } : {}),
      };
    } else if (form.kind === "policy") {
      if (!form.title.trim()) {
        setError("Policy title is required.");
        return;
      }
      if (!form.body.trim()) {
        setError("Policy content is required.");
        return;
      }
      blocks = undefined;
    } else if (form.kind === "product_collection") {
      if (!form.title.trim()) {
        setError("Collection title is required.");
        return;
      }
      const productIds = form.collectionProductIds
        .split(/[\n,]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      blocks = { productIds };
    } else if (form.kind === "lookbook") {
      if (!form.title.trim()) {
        setError("Lookbook title is required.");
        return;
      }
      const pins = form.lookbookPins
        .filter((p) => p.title.trim())
        .map((p, idx) => ({
          id: p.id || `pin-${idx + 1}`,
          title: p.title.trim(),
          price: p.price.trim(),
          tag: p.tag.trim(),
          top: `${Math.min(100, Math.max(0, p.top))}%`,
          left: `${Math.min(100, Math.max(0, p.left))}%`,
        }));
      blocks = { pins };
    }

    const media = textToMedia(form.mediaText);
    const position = Number(form.position);
    if (!Number.isFinite(position)) {
      setError("Position must be a number.");
      return;
    }

    const payload: ContentInput = {
      kind: form.kind,
      title: form.title.trim() || undefined,
      subtitle: (form.kind === "banner" || form.kind === "section" || form.kind === "page" || form.kind === "policy" || form.kind === "product_collection" || form.kind === "lookbook")
        ? (form.subtitle.trim() || undefined)
        : undefined,
      body: (form.kind === "banner" || form.kind === "faq" || form.kind === "section" || form.kind === "page" || form.kind === "policy" || form.kind === "testimonial")
        ? (form.body.trim() || undefined)
        : undefined,
      ctaLabel: (form.kind === "banner" || form.kind === "section" || form.kind === "page")
        ? (form.ctaLabel.trim() || undefined)
        : undefined,
      ctaHref: (form.kind === "banner" || form.kind === "page")
        ? (form.ctaHref.trim() || undefined)
        : undefined,
      position,
      status: form.status,
      ...(blocks !== undefined ? { blocks } : {}),
      ...(form.kind === "banner" || form.kind === "section" || form.kind === "lookbook" || form.kind === "page"
        ? (media.length ? { media } : {})
        : {}),
    };

    setBusy(true);
    setError(null);
    try {
      await api.upsertContent(key, payload);
      setNotice(`${key} saved. The storefront picks it up within five minutes.`);
      setFormOpen(false);
      content.refresh();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Could not save this block");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!pendingDelete) return;
    setBusy(true);
    setError(null);
    try {
      await api.deleteContent(pendingDelete.key);
      setNotice(`${pendingDelete.key} deleted.`);
      setPendingDelete(null);
      content.refresh();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Could not delete this block");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeading
        eyebrow="Content"
        title="Website content"
        subtitle="Manage structured storefront pages, homepage product placement, banners, testimonials, the lookbook and FAQs. Product details and inventory stay in the product catalogue."
        action={
          <ButtonPrimary onClick={openCreate} disabled={content.source !== "live"}>
            New block
          </ButtonPrimary>
        }
      />
      <div className="flex justify-end">
        <AdminDataBadge resource={content} />
      </div>

      <ContentPageManager
        documents={all}
        enabled={content.source === "live"}
        onSaved={content.refresh}
      />

      {content.source !== "live" && (
        <Alert tone="warning">
          Demo blocks. Connect the backend and sign in as a catalogue manager or admin to edit real content.
        </Alert>
      )}
      {error && <Alert>{error}</Alert>}
      {notice && <Alert tone="success">{notice}</Alert>}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Blocks" value={String(stats.total)} hint="Across every kind" />
        <StatCard label="Published" value={String(stats.published)} hint="Live on the storefront" tone="success" />
        <StatCard label="Drafts" value={String(stats.drafts)} hint="Saved but hidden" tone={stats.drafts ? "warning" : undefined} />
        <StatCard label="FAQ entries" value={String(stats.faqs)} hint="Also emitted as FAQPage data" tone="info" />
      </div>

      <Card title="What each kind drives" className="!p-4">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {CONTENT_KINDS.map((value) => (
            <div key={value} className="flex items-start gap-2 rounded-xl bg-[#faf7f2]/70 px-3 py-2">
              <Badge tone={KIND_TONES[value] ?? "neutral"}>{value}</Badge>
              <span className="text-[11.5px] leading-snug text-stone-600">{KIND_HINTS[value]}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card
        title="Blocks"
        action={
          <div className="flex items-center gap-2">
            <ButtonGhost onClick={openCreateBanner} disabled={content.source !== "live"}>Add hero slide</ButtonGhost>
            <label className="sr-only" htmlFor="content-search">Search content</label>
            <TextInput
              id="content-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search key, title or body…"
              className="!w-64 !py-1.5 !text-[12px]"
            />
          </div>
        }
      >
        <div className="mb-4 flex flex-wrap gap-1.5">
          {KIND_OPTIONS.map((option) => {
            const active = option === kind;
            return (
              <button
                key={option}
                type="button"
                onClick={() => setKind(option)}
                aria-pressed={active}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12px] font-semibold transition ${
                  active ? "border-[#881337] bg-[#881337] text-white" : "border-[#ebe6de] bg-white text-stone-600 hover:border-[#dfc28c] hover:text-[#881337]"
                }`}
              >
                {option}
                <span className={`rounded-full px-1.5 text-[10px] font-bold ${active ? "bg-white/20 text-white" : "bg-stone-100 text-stone-500"}`}>
                  {counts[option] ?? 0}
                </span>
              </button>
            );
          })}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#f0ebe3] text-[10.5px] font-semibold uppercase tracking-[0.12em] text-stone-400">
                <th className="pb-3 pr-4">Key</th>
                <th className="pb-3 pr-4">Kind</th>
                <th className="pb-3 pr-4 min-w-[220px]">Title</th>
                <th className="pb-3 pr-4">Position</th>
                <th className="pb-3 pr-4">Status</th>
                <th className="pb-3 pr-4">Updated</th>
                <th className="pb-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0ebe3]">
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    <EmptyState
                      title="No content blocks"
                      hint="Create one, or leave it empty — the storefront falls back to its bundled copy."
                    />
                  </td>
                </tr>
              )}
              {rows.map((doc) => (
                <tr key={doc._id || doc.key} className="align-top transition hover:bg-[#faf7f2]/60">
                  <td className="py-3.5 pr-4">
                    <code className="font-mono text-[12px] font-semibold text-[#881337]">{doc.key}</code>
                  </td>
                  <td className="py-3.5 pr-4">
                    <Badge tone={KIND_TONES[doc.kind] ?? "neutral"}>{doc.kind}</Badge>
                  </td>
                  <td className="py-3.5 pr-4">
                    <p className="text-[12.5px] font-medium text-[#14100f]">{doc.title || <span className="text-stone-400">Untitled</span>}</p>
                    {doc.body && <p className="mt-0.5 max-w-[380px] truncate text-[11.5px] text-stone-500">{doc.body}</p>}
                    {doc.media?.length ? <p className="mt-1 text-[11px] text-stone-400">{doc.media.length} media</p> : null}
                  </td>
                  <td className="py-3.5 pr-4 text-[12.5px] text-stone-600">{doc.position ?? 0}</td>
                  <td className="py-3.5 pr-4">
                    <Badge tone={doc.status === "published" ? "success" : "warning"} dot>
                      {doc.status === "published" ? "Published" : "Draft"}
                    </Badge>
                  </td>
                  <td className="py-3.5 pr-4 text-[12px] text-stone-500">
                    {doc.updatedAt ? formatRelativeTime(doc.updatedAt) : "—"}
                  </td>
                  <td className="py-3.5 text-right">
                    <div className="flex justify-end gap-2">
                      <ButtonGhost onClick={() => openEdit(doc)} disabled={content.source !== "live"}>
                        Edit
                      </ButtonGhost>
                      <ButtonDanger onClick={() => setPendingDelete(doc)} disabled={content.source !== "live"}>
                        Delete
                      </ButtonDanger>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 border-t border-[#f0ebe3] pt-4 text-[11.5px] text-stone-500">
          Backed by <code>GET /api/admin/content</code>, <code>PUT /api/content/:key</code> (upsert) and{" "}
          <code>DELETE /api/content/:key</code>. Writes need the catalogue manager, admin or super admin role.
        </p>
      </Card>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? `Edit ${editing.key}` : "New content block"}
        description={KIND_HINTS[form.kind]}
        footer={
          <>
            <ButtonGhost onClick={() => setFormOpen(false)}>Cancel</ButtonGhost>
            <ButtonPrimary onClick={() => void submit()} disabled={busy}>
              {busy ? "Saving…" : "Save block"}
            </ButtonPrimary>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Key" htmlFor="content-key" hint={editing ? "Cannot be changed" : "e.g. home.banner.1"}>
              <TextInput
                id="content-key"
                value={form.key}
                onChange={(event) => set("key", event.target.value)}
                placeholder="home.banner.1"
                disabled={Boolean(editing)}
                className="font-mono"
              />
            </Field>
            <Field label="Kind" htmlFor="content-kind">
              <Select id="content-kind" value={form.kind} onChange={(event) => set("kind", event.target.value as ContentKind)}>
                {CONTENT_KINDS.map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </Select>
            </Field>
          </div>

          {/* ================= 1. TESTIMONIAL ================= */}
          {form.kind === "testimonial" && (
            <div className="space-y-4 rounded-xl border border-[#ebe6de] bg-[#faf7f2]/80 p-4">
              <div className="flex items-center justify-between border-b border-[#ebe6de] pb-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#881337]">Customer Review Details</p>
                <span className="text-[11px] text-stone-500">Homepage testimonial card</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Customer Name *" htmlFor="testi-name" hint="Full name of reviewer">
                  <TextInput id="testi-name" value={form.testiName} onChange={(e) => set("testiName", e.target.value)} placeholder="e.g. Dr. Ananya Roy" />
                </Field>
                <Field label="City" htmlFor="testi-city" hint="Customer location">
                  <TextInput id="testi-city" value={form.testiCity} onChange={(e) => set("testiCity", e.target.value)} placeholder="e.g. Bengaluru" />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Rating (1–5 Stars)" htmlFor="testi-rating">
                  <Select id="testi-rating" value={form.testiRating} onChange={(e) => set("testiRating", e.target.value)}>
                    <option value="5">⭐⭐⭐⭐⭐ — 5 Stars</option>
                    <option value="4">⭐⭐⭐⭐ — 4 Stars</option>
                    <option value="3">⭐⭐⭐ — 3 Stars</option>
                    <option value="2">⭐⭐ — 2 Stars</option>
                    <option value="1">⭐ — 1 Star</option>
                  </Select>
                </Field>
                <Field label="Date" htmlFor="testi-date" hint="Display date (e.g. Oct 2026)">
                  <TextInput id="testi-date" value={form.testiDate} onChange={(e) => set("testiDate", e.target.value)} placeholder="e.g. Oct 2026" />
                </Field>
              </div>

              <Field label="Review Headline" htmlFor="content-title" hint="Catchy headline / title (optional)">
                <TextInput id="content-title" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Softest Mul Cotton I Have Ever Worn!" />
              </Field>

              <Field label="Review Text / Comment *" htmlFor="content-body" hint="Full customer feedback">
                <Textarea id="content-body" rows={4} value={form.body} onChange={(e) => set("body", e.target.value)} placeholder="The Gulab Bagh Anarkali is pure bliss in summer heat. Featherlight fabric and stunning finish!" />
              </Field>

              <Field label="Product Purchased" htmlFor="testi-product" hint="Which product did they buy? (optional)">
                <TextInput id="testi-product" value={form.testiProduct} onChange={(e) => set("testiProduct", e.target.value)} placeholder="e.g. Gulab Bagh Anarkali Set" />
              </Field>

              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#ebe6de] bg-white px-4 py-3" htmlFor="testi-verified">
                <input
                  id="testi-verified"
                  type="checkbox"
                  checked={form.testiVerified}
                  onChange={(e) => set("testiVerified", e.target.checked)}
                  className="h-4 w-4 accent-[#881337]"
                />
                <span className="text-[13px] font-medium text-stone-700">Mark as Verified Buyer ✓</span>
                <span className="text-[11px] text-stone-400">(shows a green badge on the review card)</span>
              </label>
            </div>
          )}

          {/* ================= 2. FAQ ================= */}
          {form.kind === "faq" && (
            <div className="space-y-4">
              <Field label="Question *" htmlFor="content-title" hint="Question displayed in the accordion">
                <TextInput id="content-title" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. How long does delivery take?" />
              </Field>
              <Field label="Answer *" htmlFor="content-body" hint="Answer shown in the accordion and in Google FAQPage structured data">
                <Textarea id="content-body" rows={5} value={form.body} onChange={(e) => set("body", e.target.value)} placeholder="Orders are dispatched within 2–3 working days from Jaipur and usually arrive in 3–7 days..." />
              </Field>
            </div>
          )}

          {/* ================= 3. BANNER (HERO SLIDE) ================= */}
          {form.kind === "banner" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Eyebrow / Tag" htmlFor="content-hero-tag" hint="Small label above the headline">
                  <TextInput id="content-hero-tag" value={form.heroTag} onChange={(e) => set("heroTag", e.target.value)} placeholder="e.g. The Summer Bagru Edit 2026" />
                </Field>
                <Field label="Image Focal Point" htmlFor="content-hero-position" hint="Where the slide image is focused">
                  <Select id="content-hero-position" value={form.focalPosition} onChange={(e) => set("focalPosition", e.target.value)}>
                    <option value="object-center">Center</option>
                    <option value="object-top">Top</option>
                    <option value="object-bottom">Bottom</option>
                    <option value="object-left">Left</option>
                    <option value="object-right">Right</option>
                  </Select>
                </Field>
              </div>

              <Field label="Headline *" htmlFor="content-title" hint="Main headline">
                <TextInput id="content-title" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Poetry in Pure Mul Cotton" />
              </Field>

              <Field label="Subtitle" htmlFor="content-subtitle" hint="Secondary tagline">
                <TextInput id="content-subtitle" value={form.subtitle} onChange={(e) => set("subtitle", e.target.value)} placeholder="e.g. Handcrafted Jaipur Weaves" />
              </Field>

              <Field label="Description" htmlFor="content-body" hint="Brief summary copy below the headline">
                <Textarea id="content-body" rows={3} value={form.body} onChange={(e) => set("body", e.target.value)} placeholder="e.g. Featherlight 100-count handspun cotton woven for everyday grace." />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="CTA Button Label" htmlFor="content-cta-label">
                  <TextInput id="content-cta-label" value={form.ctaLabel} onChange={(e) => set("ctaLabel", e.target.value)} placeholder="Shop Pure Mul Sets" />
                </Field>
                <Field label="CTA Button Link" htmlFor="content-cta-href">
                  <TextInput id="content-cta-href" value={form.ctaHref} onChange={(e) => set("ctaHref", e.target.value)} placeholder="#products" />
                </Field>
              </div>

              <Field label="Hero Slide Media" htmlFor="content-media" hint="Upload photos or add image/video URLs (one per line). Format: url | alt text | image/video">
                <Textarea id="content-media" rows={3} value={form.mediaText} onChange={(e) => set("mediaText", e.target.value)} placeholder={"https://cdn.example.com/hero.jpg | Hero photo | image"} className="font-mono !text-[12px]" />
                <div className="flex flex-wrap gap-4 mt-2">
                  <MediaUploadField type="image" multiple onUploaded={(urls) => set("mediaText", [form.mediaText, ...urls.map((url) => `${url} | | image`)].filter(Boolean).join("\n"))} disabled={busy} />
                  <MediaUploadField type="video" onUploaded={(urls) => set("mediaText", [form.mediaText, ...urls.map((url) => `${url} | | video`)].filter(Boolean).join("\n"))} disabled={busy} />
                </div>
                {textToMedia(form.mediaText).length > 0 && (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {textToMedia(form.mediaText).filter((item) => item.kind === "image").map((item) => (
                      <div key={item.url} className="overflow-hidden rounded-xl border border-[#ebe6de]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={item.url} alt={item.alt || "Hero slide preview"} className="h-32 w-full object-cover" />
                        <p className="truncate px-3 py-1.5 text-[11px] text-stone-500">{item.alt || "Hero image"}</p>
                      </div>
                    ))}
                    {textToMedia(form.mediaText).filter((item) => item.kind === "video").map((item) => (
                      <div key={item.url} className="overflow-hidden rounded-xl border border-[#ebe6de]">
                        <video src={item.url} controls muted playsInline preload="metadata" className="h-32 w-full bg-black object-cover" />
                        <p className="truncate px-3 py-1.5 text-[11px] text-stone-500">{item.alt || "Hero video"}</p>
                      </div>
                    ))}
                  </div>
                )}
              </Field>
            </div>
          )}

          {/* ================= 4. CATEGORY STORY TILE (SECTION) ================= */}
          {form.kind === "section" && (
            <div className="space-y-4">
              <Field label="Category / Story Name *" htmlFor="content-title" hint="Title on the story tile (e.g. Pure Mul Cotton)">
                <TextInput id="content-title" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Pure Mul Cotton" />
              </Field>

              <Field label="Tagline" htmlFor="content-subtitle" hint="Short tagline shown below name">
                <TextInput id="content-subtitle" value={form.subtitle} onChange={(e) => set("subtitle", e.target.value)} placeholder="e.g. Handcrafted everyday grace" />
              </Field>

              <Field label="Description" htmlFor="content-body" hint="Story copy displayed inside the reel modal">
                <Textarea id="content-body" rows={3} value={form.body} onChange={(e) => set("body", e.target.value)} placeholder="Description displayed when story is opened..." />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Category Filter Key *" htmlFor="section-filter-key" hint="Matches category tab (e.g. mul-cotton, festive, anarkali, suits)">
                  <TextInput id="section-filter-key" value={form.sectionFilterKey} onChange={(e) => set("sectionFilterKey", e.target.value)} placeholder="e.g. mul-cotton" />
                </Field>
                <Field label="Badge / Count" htmlFor="section-count" hint="Tag on tile (e.g. 18 Styles or New Arrival)">
                  <TextInput id="section-count" value={form.sectionCount} onChange={(e) => set("sectionCount", e.target.value)} placeholder="e.g. 18 Styles" />
                </Field>
              </div>

              <Field label="CTA Button Label" htmlFor="content-cta-label" hint="Button text inside the story reel">
                <TextInput id="content-cta-label" value={form.ctaLabel} onChange={(e) => set("ctaLabel", e.target.value)} placeholder="Shop this collection" />
              </Field>

              <Field label="Story Media (Cover Photo & Optional Video)" htmlFor="content-media" hint="Upload cover photo and optional video (first image is cover).">
                <Textarea id="content-media" rows={3} value={form.mediaText} onChange={(e) => set("mediaText", e.target.value)} placeholder={"https://cdn.example.com/story.jpg | Story cover | image"} className="font-mono !text-[12px]" />
                <div className="flex flex-wrap gap-4 mt-2">
                  <MediaUploadField type="image" onUploaded={(urls) => set("mediaText", [form.mediaText, ...urls.map((url) => `${url} | | image`)].filter(Boolean).join("\n"))} disabled={busy} />
                  <MediaUploadField type="video" onUploaded={(urls) => set("mediaText", [form.mediaText, ...urls.map((url) => `${url} | | video`)].filter(Boolean).join("\n"))} disabled={busy} />
                </div>
                {textToMedia(form.mediaText).length > 0 && (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {textToMedia(form.mediaText).filter((item) => item.kind !== "video").map((item) => (
                      <div key={item.url} className="overflow-hidden rounded-xl border border-[#ebe6de]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={item.url} alt={item.alt || "Story cover preview"} className="h-32 w-full object-cover" />
                        <p className="truncate px-3 py-1.5 text-[11px] text-stone-500">{item.alt || "Story cover photo"}</p>
                      </div>
                    ))}
                    {textToMedia(form.mediaText).filter((item) => item.kind === "video").map((item) => (
                      <div key={item.url} className="overflow-hidden rounded-xl border border-[#ebe6de]">
                        <video src={item.url} controls muted playsInline preload="metadata" className="h-32 w-full object-cover" />
                        <p className="truncate px-3 py-1.5 text-[11px] text-stone-500">{item.alt || "Story video"}</p>
                      </div>
                    ))}
                  </div>
                )}
              </Field>
            </div>
          )}

          {/* ================= 5. SHOPPABLE LOOKBOOK ================= */}
          {form.kind === "lookbook" && (
            <div className="space-y-4">
              <Field label="Lookbook Title *" htmlFor="content-title" hint="Headline on the lookbook banner (e.g. The Royal Bagru Edit)">
                <TextInput id="content-title" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. The Royal Bagru Edit" />
              </Field>

              <Field label="Lookbook Subtitle" htmlFor="content-subtitle" hint="Subheading badge (e.g. Summer Festive Edit 2026)">
                <TextInput id="content-subtitle" value={form.subtitle} onChange={(e) => set("subtitle", e.target.value)} placeholder="e.g. Summer Festive Edit 2026" />
              </Field>

              <Field label="Lookbook Editorial Image *" htmlFor="content-media" hint="Upload image or paste image URL">
                <Textarea id="content-media" rows={2} value={form.mediaText} onChange={(e) => set("mediaText", e.target.value)} placeholder="https://cdn.example.com/lookbook.jpg | Lookbook photo | image" className="font-mono !text-[12px]" />
                <div className="mt-2">
                  <MediaUploadField type="image" onUploaded={(urls) => set("mediaText", [form.mediaText, ...urls.map((url) => `${url} | | image`)].filter(Boolean).join("\n"))} disabled={busy} />
                </div>
              </Field>

              {/* Visual Lookbook Image Preview with Interactive Hotspot Pins */}
              {textToMedia(form.mediaText).filter((item) => item.kind !== "video")[0]?.url && (
                <div className="rounded-xl border border-[#ebe6de] bg-[#faf7f2] p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[#881337]">Live Lookbook Preview (Hotspot Pins)</p>
                    <span className="text-[11px] text-stone-500">Gold dots show where pins appear on the site</span>
                  </div>
                  <div className="relative overflow-hidden rounded-xl border border-[#ebe6de] bg-black/5 aspect-4/3 max-h-[300px] w-full flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={textToMedia(form.mediaText).filter((item) => item.kind !== "video")[0]?.url}
                      alt="Lookbook preview"
                      className="h-full w-full object-cover"
                    />
                    {/* Pins rendered over image */}
                    {form.lookbookPins.map((pin, index) => (
                      <div
                        key={pin.id || index}
                        style={{ top: `${pin.top}%`, left: `${pin.left}%` }}
                        className="absolute -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center pointer-events-none"
                      >
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#dfc28c] text-[#1c1917] font-bold text-xs shadow-lg ring-4 ring-[#dfc28c]/40 animate-pulse">
                          +
                        </div>
                        {pin.title && (
                          <div className="mt-1 rounded bg-black/85 px-2 py-0.5 text-[10px] font-medium text-white shadow backdrop-blur whitespace-nowrap">
                            {pin.title} {pin.price ? `(${pin.price})` : ""}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Friendly Pins Builder (NO JSON REQUIRED) */}
              <div className="space-y-3 rounded-xl border border-[#ebe6de] bg-[#faf7f2]/80 p-4">
                <div className="flex items-center justify-between border-b border-[#ebe6de] pb-2">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[#881337]">Shoppable Hotspot Pins</p>
                    <p className="text-[11px] text-stone-500">Tag products on this photo. No code or JSON needed!</p>
                  </div>
                  <button
                    type="button"
                    onClick={addPin}
                    className="inline-flex items-center gap-1 rounded-lg bg-[#881337] px-3 py-1.5 text-[11px] font-semibold text-white shadow-xs hover:bg-[#9f1239] transition"
                  >
                    + Add Hotspot Pin
                  </button>
                </div>

                {form.lookbookPins.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[#ebe6de] p-6 text-center">
                    <p className="text-xs text-stone-500">No hotspot pins added yet.</p>
                    <button
                      type="button"
                      onClick={addPin}
                      className="mt-2 inline-flex items-center gap-1 rounded-lg border border-[#ebe6de] bg-white px-3 py-1.5 text-xs font-semibold text-[#881337] hover:border-[#881337]"
                    >
                      + Add first pin
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {form.lookbookPins.map((pin, index) => (
                      <div key={pin.id || index} className="rounded-xl border border-[#ebe6de] bg-white p-3.5 shadow-2xs space-y-3">
                        <div className="flex items-center justify-between border-b border-[#f0ebe3] pb-2">
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#881337]">
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#881337] text-[10px] font-bold text-white">
                              {index + 1}
                            </span>
                            Hotspot Pin #{index + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => removePin(index)}
                            className="text-xs font-semibold text-rose-600 hover:text-rose-800"
                          >
                            ✕ Remove
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <Field label="Product Name *" htmlFor={`pin-title-${index}`} hint="e.g. Mul Anarkali">
                            <TextInput
                              id={`pin-title-${index}`}
                              value={pin.title}
                              onChange={(e) => updatePin(index, { title: e.target.value })}
                              placeholder="e.g. Mul Anarkali"
                            />
                          </Field>
                          <Field label="Price" htmlFor={`pin-price-${index}`} hint="e.g. ₹1,899">
                            <TextInput
                              id={`pin-price-${index}`}
                              value={pin.price}
                              onChange={(e) => updatePin(index, { price: e.target.value })}
                              placeholder="e.g. ₹1,899"
                            />
                          </Field>
                          <Field label="Badge / Tag" htmlFor={`pin-tag-${index}`} hint="e.g. Pure Mul">
                            <TextInput
                              id={`pin-tag-${index}`}
                              value={pin.tag}
                              onChange={(e) => updatePin(index, { tag: e.target.value })}
                              placeholder="e.g. Pure Mul"
                            />
                          </Field>
                        </div>

                        {/* Position sliders */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-[#f7f4ee]">
                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <label className="text-[11px] font-semibold text-stone-600" htmlFor={`pin-top-${index}`}>
                                Top Position (Vertical)
                              </label>
                              <span className="text-[11px] font-mono font-bold text-[#881337]">{pin.top}%</span>
                            </div>
                            <input
                              id={`pin-top-${index}`}
                              type="range"
                              min="0"
                              max="100"
                              value={pin.top}
                              onChange={(e) => updatePin(index, { top: Number(e.target.value) })}
                              className="w-full accent-[#881337]"
                            />
                            <p className="text-[10px] text-stone-400">0% = Top edge, 100% = Bottom edge</p>
                          </div>
                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <label className="text-[11px] font-semibold text-stone-600" htmlFor={`pin-left-${index}`}>
                                Left Position (Horizontal)
                              </label>
                              <span className="text-[11px] font-mono font-bold text-[#881337]">{pin.left}%</span>
                            </div>
                            <input
                              id={`pin-left-${index}`}
                              type="range"
                              min="0"
                              max="100"
                              value={pin.left}
                              onChange={(e) => updatePin(index, { left: Number(e.target.value) })}
                              className="w-full accent-[#881337]"
                            />
                            <p className="text-[10px] text-stone-400">0% = Left edge, 100% = Right edge</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================= 6. STANDALONE PAGE ================= */}
          {form.kind === "page" && (
            <div className="space-y-4">
              <Field label="Page Title *" htmlFor="content-title">
                <TextInput id="content-title" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Our Heritage & Craft" />
              </Field>

              <Field label="Subtitle" htmlFor="content-subtitle">
                <TextInput id="content-subtitle" value={form.subtitle} onChange={(e) => set("subtitle", e.target.value)} placeholder="e.g. Handcrafted in Jaipur since 2018" />
              </Field>

              <Field label="Page Content *" htmlFor="content-body" hint="Full body copy / story">
                <Textarea id="content-body" rows={6} value={form.body} onChange={(e) => set("body", e.target.value)} placeholder="Write page content here..." />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="SEO Meta Title" htmlFor="seo-title" hint="Browser tab & Google title">
                  <TextInput id="seo-title" value={form.seoTitle} onChange={(e) => set("seoTitle", e.target.value)} placeholder="e.g. Heritage | Vani Collection" />
                </Field>
                <Field label="SEO Meta Description" htmlFor="seo-desc" hint="Google search snippet">
                  <TextInput id="seo-desc" value={form.seoDescription} onChange={(e) => set("seoDescription", e.target.value)} placeholder="e.g. Explore our traditional artisanal weaving..." />
                </Field>
              </div>

              <Field label="Page Banner Image (Optional)" htmlFor="content-media">
                <Textarea id="content-media" rows={2} value={form.mediaText} onChange={(e) => set("mediaText", e.target.value)} placeholder="https://cdn.example.com/banner.jpg | Header photo | image" className="font-mono !text-[12px]" />
                <div className="mt-2">
                  <MediaUploadField type="image" onUploaded={(urls) => set("mediaText", [form.mediaText, ...urls.map((url) => `${url} | | image`)].filter(Boolean).join("\n"))} disabled={busy} />
                </div>
              </Field>
            </div>
          )}

          {/* ================= 7. POLICY ================= */}
          {form.kind === "policy" && (
            <div className="space-y-4">
              <Field label="Policy Heading *" htmlFor="content-title" hint="Name of the policy (e.g. Shipping Policy, Returns & Refund Policy)">
                <TextInput id="content-title" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Shipping & Delivery Policy" />
              </Field>

              <Field label="Last Updated / Subtitle" htmlFor="content-subtitle" hint="Display date or tagline">
                <TextInput id="content-subtitle" value={form.subtitle} onChange={(e) => set("subtitle", e.target.value)} placeholder="e.g. Last updated October 2026" />
              </Field>

              <Field label="Policy Terms & Guidelines *" htmlFor="content-body" hint="Full policy text">
                <Textarea id="content-body" rows={8} value={form.body} onChange={(e) => set("body", e.target.value)} placeholder="Write full policy terms, conditions, timelines, and guidelines here..." />
              </Field>
            </div>
          )}

          {/* ================= 8. PRODUCT COLLECTION ================= */}
          {form.kind === "product_collection" && (
            <div className="space-y-4">
              <Field label="Section Title *" htmlFor="content-title" hint="Heading on homepage (e.g. Curated Festive Edit)">
                <TextInput id="content-title" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Curated Festive Edit" />
              </Field>

              <Field label="Section Subtitle" htmlFor="content-subtitle" hint="Subheading text">
                <TextInput id="content-subtitle" value={form.subtitle} onChange={(e) => set("subtitle", e.target.value)} placeholder="e.g. Pure Mul Cotton & Festive Weaves" />
              </Field>

              <Field label="Featured Product IDs / Slugs" htmlFor="collection-products" hint="Enter product IDs or slugs separated by commas or line breaks">
                <Textarea id="collection-products" rows={3} value={form.collectionProductIds} onChange={(e) => set("collectionProductIds", e.target.value)} placeholder="prod_1, prod_2, prod_3" className="font-mono !text-[12px]" />
              </Field>
            </div>
          )}

          {/* Common Sort Order & Status */}
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-[#ebe6de]">
            <Field label="Sort Position" htmlFor="content-position" hint="Order number (0 sorts first)">
              <TextInput id="content-position" type="number" step={1} value={form.position} onChange={(event) => set("position", event.target.value)} />
            </Field>
            <Field label="Publish Status" htmlFor="content-status" hint="Live or draft">
              <Select id="content-status" value={form.status} onChange={(event) => set("status", event.target.value as "draft" | "published")}>
                <option value="published">Published (Visible on site)</option>
                <option value="draft">Draft (Hidden)</option>
              </Select>
            </Field>
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        title={`Delete ${pendingDelete?.key ?? ""}?`}
        description="The storefront falls back to its bundled copy for this block, so nothing breaks — but the edit is gone."
        footer={
          <>
            <ButtonGhost onClick={() => setPendingDelete(null)}>Keep it</ButtonGhost>
            <ButtonDanger onClick={() => void remove()} disabled={busy}>
              {busy ? "Deleting…" : "Delete block"}
            </ButtonDanger>
          </>
        }
      >
        <p className="text-[13px] text-stone-600">
          Set the status to <strong>draft</strong> instead if you might want this copy back later.
        </p>
      </Modal>
    </div>
  );
}
