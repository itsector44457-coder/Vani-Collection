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
};

const toForm = (doc: ContentDoc): FormState => ({
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
});

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

  const content = useApiResource<{ data: ContentDoc[] }>((signal) => api.content(undefined, signal), { data: DEMO_CONTENT });
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

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, kind: kind === "all" ? "banner" : kind, position: String(all.length) });
    setError(null);
    setFormOpen(true);
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
    // Validate the JSON before sending: a malformed `blocks` string would otherwise be stored as a
    // string and silently stop driving the section it configures.
    let blocks: unknown;
    if (form.blocksText.trim()) {
      try {
        blocks = JSON.parse(form.blocksText);
      } catch {
        setError("The blocks field is not valid JSON.");
        return;
      }
    }
    const media = textToMedia(form.mediaText);
    if (media.some((item) => !/^(https?:\/\/|\/)/i.test(item.url))) {
      setError("Every media entry needs an absolute URL or a path starting with /.");
      return;
    }
    const position = Number(form.position);
    if (!Number.isFinite(position)) {
      setError("Position must be a number.");
      return;
    }

    const payload: ContentInput = {
      kind: form.kind,
      title: form.title.trim() || undefined,
      subtitle: form.subtitle.trim() || undefined,
      body: form.body.trim() || undefined,
      ctaLabel: form.ctaLabel.trim() || undefined,
      ctaHref: form.ctaHref.trim() || undefined,
      position,
      status: form.status,
      ...(blocks !== undefined ? { blocks } : {}),
      ...(media.length ? { media } : {}),
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
        title="Homepage content"
        subtitle="Banners, testimonials, the lookbook and the FAQ are stored as content blocks. Anything not published here falls back to the bundled copy, so the storefront never renders empty."
        action={
          <ButtonPrimary onClick={openCreate} disabled={content.source !== "live"}>
            New block
          </ButtonPrimary>
        }
      />
      <div className="flex justify-end">
        <AdminDataBadge resource={content} />
      </div>

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
          <>
            <label className="sr-only" htmlFor="content-search">Search content</label>
            <TextInput
              id="content-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search key, title or body…"
              className="!w-64 !py-1.5 !text-[12px]"
            />
          </>
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
          Backed by <code>GET /api/content?kind=…</code>, <code>PUT /api/content/:key</code> (upsert) and{" "}
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

          <Field label="Title" htmlFor="content-title" hint={form.kind === "faq" ? "The question" : "Heading"}>
            <TextInput id="content-title" value={form.title} onChange={(event) => set("title", event.target.value)} />
          </Field>

          <Field label="Subtitle" htmlFor="content-subtitle">
            <TextInput id="content-subtitle" value={form.subtitle} onChange={(event) => set("subtitle", event.target.value)} />
          </Field>

          <Field label="Body" htmlFor="content-body" hint={form.kind === "faq" ? "The answer — shown in the accordion and in FAQPage structured data" : "Copy"}>
            <Textarea id="content-body" rows={4} value={form.body} onChange={(event) => set("body", event.target.value)} />
          </Field>

          {(form.kind === "banner" || form.kind === "page" || form.kind === "section") && (
            <div className="grid grid-cols-2 gap-4">
              <Field label="CTA label" htmlFor="content-cta-label">
                <TextInput id="content-cta-label" value={form.ctaLabel} onChange={(event) => set("ctaLabel", event.target.value)} placeholder="Shop the edit" />
              </Field>
              <Field label="CTA link" htmlFor="content-cta-href">
                <TextInput id="content-cta-href" value={form.ctaHref} onChange={(event) => set("ctaHref", event.target.value)} placeholder="#products" />
              </Field>
            </div>
          )}

          <Field
            label="Media"
            htmlFor="content-media"
            hint="One per line: url | alt text | kind. The first entry is the main image."
          >
            <Textarea id="content-media" rows={3} value={form.mediaText} onChange={(event) => set("mediaText", event.target.value)} placeholder={"https://cdn.example.com/hero.jpg | Hero shot | hero"} className="font-mono !text-[12px]" />
          </Field>

          <Field
            label="Blocks (JSON)"
            htmlFor="content-blocks"
            hint={form.kind === "testimonial" ? '{ "name": "…", "city": "…", "rating": 5, "verified": true, "product": "…" }' : form.kind === "lookbook" ? '{ "pins": [{ "id": "pin-1", "top": "28%", "left": "48%", "title": "…", "price": "₹1,899", "tag": "…" }] }' : "Optional free-form JSON"}
          >
            <Textarea id="content-blocks" rows={5} value={form.blocksText} onChange={(event) => set("blocksText", event.target.value)} className="font-mono !text-[12px]" />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Position" htmlFor="content-position" hint="Lower sorts first">
              <TextInput id="content-position" type="number" step={1} value={form.position} onChange={(event) => set("position", event.target.value)} />
            </Field>
            <Field label="Status" htmlFor="content-status">
              <Select id="content-status" value={form.status} onChange={(event) => set("status", event.target.value as "draft" | "published")}>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
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
