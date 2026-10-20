"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Alert,
  Badge,
  ButtonDanger,
  ButtonGhost,
  ButtonPrimary,
  Card,
  EmptyState,
  Field,
  FilterTabs,
  Modal,
  PageHeading,
  Select,
  StatCard,
  Textarea,
  TextInput,
} from "@/lib/admin-ui";
import AdminDataBadge from "@/components/admin/AdminDataBadge";
import JournalBody from "@/components/JournalBody";
import MediaUploadField from "@/components/admin/MediaUploadField";
import SeoChecklist, { type SeoCheck } from "@/components/admin/SeoChecklist";
import { api, ApiError, type ContentDoc, type ContentInput } from "@/lib/api-client";
import { useApiResource } from "@/lib/use-api";

interface JournalForm {
  key: string;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  coverImage: string;
  coverAlt: string;
  author: string;
  category: string;
  tags: string;
  seoTitle: string;
  seoDescription: string;
  publishedAt: string;
  position: string;
  status: "draft" | "published";
}

type StatusFilter = "all" | "published" | "draft";

const CATEGORY_SUGGESTIONS = ["Fabric Guide", "Buying Guide", "Care & Styling", "Craft Stories", "Festive Edit", "Size & Fit"];

const STARTER_IDEAS: { title: string; category: string; outline: string }[] = [
  {
    title: "Mul Cotton Kya Hota Hai? Garmiyon Ke Liye Sabse Accha Fabric",
    category: "Fabric Guide",
    outline: "## Mul cotton hota kya hai\n\nYahan simple words me samjhaye…\n\n## asli mul cotton kaise pehchane\n\n- Point 1\n- Point 2\n\n## Dekhbhaal (care)\n\nWash, dry aur iron tips…",
  },
  {
    title: "Kurta Set Size Guide: Online Sahi Size Kaise Choose Kare",
    category: "Size & Fit",
    outline: "## Apna size ghar par kaise naape\n\nBust, waist aur hip naapna…\n\n## Do size ke beech me ho to?\n\nSalah yahan…\n\n## Humari size chart samjhe\n\n[Size Guide dekhe](/size-guide)",
  },
  {
    title: "Handblock Print ki asal Pehchan: Bagru aur Dabu",
    category: "Craft Stories",
    outline: "## Handblock print kaise banta hai\n\nLakdi ke block se chaap…\n\n## Machine print se fark\n\n- Fark 1\n- Fark 2",
  },
  {
    title: "Festive Season ke Liye 5 Kurta Set Styling Ideas",
    category: "Festive Edit",
    outline: "## Pooja ke liye halka-phulka look\n\nStyling tip…\n\n## Shaam ke function ke liye\n\nDupatta aur jewellery salah…",
  },
];

const blankForm = (position = 0): JournalForm => ({
  key: "",
  title: "",
  slug: "",
  excerpt: "",
  body: "",
  coverImage: "",
  coverAlt: "",
  author: "yadav",
  category: "Fabric Guide",
  tags: "",
  seoTitle: "",
  seoDescription: "",
  publishedAt: new Date().toISOString().slice(0, 10),
  position: String(position),
  status: "draft",
});

const asObject = (value: ContentDoc["blocks"]): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
const text = (value: unknown): string => (typeof value === "string" ? value : "");
const slugify = (value: string): string =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
const validSlug = (value: string): boolean => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
const wordCount = (value: string): number => value.split(/\s+/).filter(Boolean).length;

function slugOf(doc: ContentDoc): string {
  const blocks = asObject(doc.blocks);
  return text(blocks.slug).toLowerCase() || doc.key.replace(/^journal\./, "").toLowerCase();
}

function formFromDoc(doc: ContentDoc): JournalForm {
  const blocks = asObject(doc.blocks);
  const tags = Array.isArray(blocks.tags)
    ? blocks.tags.filter((tag): tag is string => typeof tag === "string").join(", ")
    : text(blocks.tags);
  return {
    key: doc.key,
    title: doc.title || "",
    slug: slugOf(doc),
    excerpt: doc.subtitle || text(blocks.excerpt),
    body: doc.body || "",
    coverImage: doc.media?.[0]?.url || text(blocks.coverImage) || text(blocks.image),
    coverAlt: doc.media?.[0]?.alt || text(blocks.coverAlt),
    author: text(blocks.author) || "yadav",
    category: text(blocks.category) || "Journal",
    tags,
    seoTitle: text(blocks.seoTitle),
    seoDescription: text(blocks.seoDescription),
    publishedAt: (text(blocks.publishedAt) || doc.createdAt || "").slice(0, 10),
    position: String(doc.position ?? 0),
    status: doc.status === "published" ? "published" : "draft",
  };
}

export default function AdminJournalPage() {
  const content = useApiResource<{ data: ContentDoc[] }>((signal) => api.managedContent(signal), { data: [] });
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ContentDoc | null>(null);
  const [form, setForm] = useState<JournalForm>(blankForm());
  const [slugTouched, setSlugTouched] = useState(false);
  const [preview, setPreview] = useState(false);
  const [deleting, setDeleting] = useState<ContentDoc | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const articles = useMemo(
    () => content.data.data.filter((doc) => doc.kind === "journal").sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
    [content.data.data]
  );
  const published = articles.filter((doc) => doc.status === "published");

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return articles.filter((doc) => {
      if (statusFilter !== "all" && doc.status !== statusFilter) return false;
      if (!query) return true;
      const blocks = asObject(doc.blocks);
      return [doc.title, doc.subtitle, doc.body, text(blocks.category), slugOf(doc)].join(" ").toLowerCase().includes(query);
    });
  }, [articles, statusFilter, search]);

  const update = <K extends keyof JournalForm>(field: K, value: JournalForm[K]) => {
    setForm((current) => {
      const next = { ...current, [field]: value };
      if (field === "title" && !editing && !slugTouched) next.slug = slugify(String(value));
      return next;
    });
  };

  const openCreate = (starter?: (typeof STARTER_IDEAS)[number]) => {
    setEditing(null);
    setSlugTouched(false);
    setPreview(false);
    setForm({
      ...blankForm(articles.length),
      ...(starter ? { title: starter.title, slug: slugify(starter.title), category: starter.category, body: starter.outline } : {}),
    });
    setError(null);
    setFormOpen(true);
  };

  const openEdit = (doc: ContentDoc) => {
    setEditing(doc);
    setSlugTouched(true);
    setPreview(false);
    setForm(formFromDoc(doc));
    setError(null);
    setFormOpen(true);
  };

  const seoChecks: SeoCheck[] = useMemo(() => {
    const words = wordCount(form.body);
    const metaDescription = form.seoDescription.trim() || form.excerpt.trim();
    const tags = form.tags.split(",").map((tag) => tag.trim()).filter(Boolean);
    return [
      { label: "Title is clear and under 70 characters", pass: form.title.trim().length >= 12 && form.title.trim().length <= 70, hint: `Now ${form.title.trim().length} characters. Searchers should understand the topic in one line.` },
      { label: "URL slug is short and valid", pass: validSlug(form.slug), hint: "Use small English words with hyphens — e.g. mul-cotton-guide." },
      { label: "Summary/excerpt written (80–180 characters)", pass: form.excerpt.trim().length >= 80 && form.excerpt.trim().length <= 180, hint: `Now ${form.excerpt.trim().length} characters. This line sells the article on cards and search.` },
      { label: "Article has at least 300 words", pass: words >= 300, hint: `Now ${words} words. Thin articles rarely rank or help shoppers.` },
      { label: "Cover photo with description (alt text)", pass: Boolean(form.coverImage.trim() && form.coverAlt.trim()), hint: "Alt text helps Google Images and screen-reader users." },
      { label: "Search description is 120–160 characters", pass: metaDescription.length >= 120 && metaDescription.length <= 160, hint: `Now ${metaDescription.length} characters (SEO description, or the excerpt if blank).` },
      { label: "Links to at least one shop page inside the article", pass: /\]\(\//.test(form.body), hint: "Add e.g. [Mul Cotton collection dekhe](/collections/mul-cotton) where it naturally fits." },
      { label: "2–6 topic tags added", pass: tags.length >= 2 && tags.length <= 6, hint: `Now ${tags.length}. Tags group related reading.` },
    ];
  }, [form]);

  const save = async () => {
    const title = form.title.trim();
    const slug = form.slug.trim().toLowerCase();
    const position = Number(form.position);
    if (!Number.isFinite(position)) {
      setError("Display order must be a number.");
      return;
    }
    if (slug && !validSlug(slug)) {
      setError("URL slug can use only small letters, numbers and hyphens — e.g. mul-cotton-guide.");
      return;
    }
    if (form.status === "published" && (!title || !form.body.trim() || !slug)) {
      setError("To publish, add a title, article body and URL slug. Otherwise save it as a draft.");
      return;
    }
    const conflict = articles.find((doc) => doc.key !== editing?.key && slugOf(doc) === slug && slug);
    if (conflict) {
      setError(`The URL /journal/${slug} is already used by “${conflict.title || conflict.key}”. Choose a different slug.`);
      return;
    }

    const key = editing ? editing.key : `journal.${slug || `draft-${Date.now().toString(36)}`}`;
    if (!editing && articles.some((doc) => doc.key === key)) {
      setError("An article with this URL key already exists. Change the slug.");
      return;
    }

    const tags = form.tags.split(",").map((tag) => tag.trim()).filter(Boolean);
    const payload: ContentInput = {
      kind: "journal",
      title: title || undefined,
      subtitle: form.excerpt.trim() || undefined,
      body: form.body,
      blocks: {
        ...(editing ? asObject(editing.blocks) : {}),
        slug,
        excerpt: form.excerpt.trim(),
        author: form.author.trim() || "yadav",
        category: form.category.trim() || "Journal",
        tags,
        coverImage: form.coverImage.trim(),
        coverAlt: form.coverAlt.trim(),
        seoTitle: form.seoTitle.trim(),
        seoDescription: form.seoDescription.trim(),
        publishedAt: form.publishedAt || new Date().toISOString().slice(0, 10),
      },
      media: form.coverImage.trim() ? [{ url: form.coverImage.trim(), alt: form.coverAlt.trim() || title, kind: "image" }] : [],
      position,
      status: form.status,
    };

    setBusy(true);
    setError(null);
    try {
      await api.upsertContent(key, payload);
      setNotice(form.status === "published" ? `Published — /journal/${slug} will be live within a few minutes.` : "Draft saved. Only staff can see it here.");
      setFormOpen(false);
      setEditing(null);
      content.refresh();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Could not save this article.");
    } finally {
      setBusy(false);
    }
  };

  const toggleStatus = async (doc: ContentDoc) => {
    const next = doc.status === "published" ? "draft" : "published";
    setBusy(true);
    setError(null);
    try {
      await api.upsertContent(doc.key, { status: next });
      setNotice(next === "published" ? `Published “${doc.title || slugOf(doc)}”.` : `Moved “${doc.title || slugOf(doc)}” back to drafts.`);
      content.refresh();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Could not change the article status.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!deleting) return;
    setBusy(true);
    setError(null);
    try {
      await api.deleteContent(deleting.key);
      setNotice(`Deleted “${deleting.title || slugOf(deleting)}” permanently.`);
      setDeleting(null);
      content.refresh();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Could not delete this article.");
    } finally {
      setBusy(false);
    }
  };

  const slugLocked = editing?.status === "published";

  return (
    <div className="space-y-5">
      <PageHeading
        eyebrow="Content"
        title="Journal / Blog"
        subtitle="Write fabric guides, sizing help and craft stories here. Published articles appear at /journal and in the sitemap automatically — no developer needed."
        action={<ButtonPrimary onClick={() => openCreate()} className="min-h-11">+ New article</ButtonPrimary>}
      />
      <div className="flex justify-end"><AdminDataBadge resource={content} /></div>
      {error && <Alert>{error}</Alert>}
      {notice && <Alert tone="success">{notice}</Alert>}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Published articles" value={String(published.length)} hint="Live at /journal" tone="success" />
        <StatCard label="Drafts" value={String(articles.length - published.length)} hint="Staff only" />
        <StatCard label="Words published" value={String(published.reduce((sum, doc) => sum + wordCount(doc.body || ""), 0))} hint="Across live articles" tone="gold" />
        <StatCard label="Total articles" value={String(articles.length)} hint="Drafts + published" />
      </div>

      <Card title="Find an article" className="!p-4">
        <div className="flex flex-wrap items-center gap-4">
          <FilterTabs options={["all", "published", "draft"] as const} value={statusFilter} onChange={setStatusFilter} counts={{ all: articles.length, published: published.length, draft: articles.length - published.length }} />
          <div className="min-w-56 flex-1">
            <label htmlFor="journal-search" className="sr-only">Search articles</label>
            <TextInput id="journal-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search title, category or words…" />
          </div>
        </div>
      </Card>

      {content.loading ? (
        <Card><EmptyState title="Loading journal articles…" /></Card>
      ) : rows.length === 0 ? (
        <div className="space-y-4">
          <Card>
            <EmptyState title={articles.length ? "No articles match this filter" : "No journal articles yet"} hint={articles.length ? "Try another status or search." : "Start with one useful guide. These starter outlines open as drafts — publish only when the article is complete."} />
          </Card>
          {!articles.length && (
            <div className="grid gap-4 md:grid-cols-2">
              {STARTER_IDEAS.map((idea) => (
                <Card key={idea.title} title={idea.title} badge={<Badge tone="gold">{idea.category}</Badge>}>
                  <p className="text-[13px] leading-relaxed text-stone-600">A ready outline with headings — replace the helper lines with your own shop-floor knowledge.</p>
                  <ButtonGhost className="mt-4 min-h-10" onClick={() => openCreate(idea)}>Start this draft</ButtonGhost>
                </Card>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2" aria-live="polite">
          {rows.map((doc) => {
            const blocks = asObject(doc.blocks);
            const cover = doc.media?.[0]?.url || text(blocks.coverImage);
            const slug = slugOf(doc);
            const isPublished = doc.status === "published";
            return (
              <Card key={doc.key} title={doc.title || "Untitled draft"} badge={<Badge tone={isPublished ? "success" : "warning"} dot>{isPublished ? "Published" : "Draft"}</Badge>}>
                <div className="flex gap-4">
                  {cover ? (
                    <Image src={cover} alt="" width={128} height={96} unoptimized className="h-24 w-32 shrink-0 rounded-xl object-cover" />
                  ) : (
                    <span aria-hidden="true" className="flex h-24 w-32 shrink-0 items-center justify-center rounded-xl bg-[#f4e4de] text-[11px] font-semibold text-[#881337]">No cover</span>
                  )}
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8a6d2f]">{text(blocks.category) || "Journal"}</p>
                    <p className="mt-1 line-clamp-3 text-[13px] leading-relaxed text-stone-600">{doc.subtitle || "No summary yet — add an excerpt so readers and Google know what this article gives them."}</p>
                    <p className="mt-2 text-[11.5px] text-stone-400">/journal/{slug} · {wordCount(doc.body || "")} words</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 border-t border-[#f0ebe3] pt-4">
                  <ButtonGhost onClick={() => openEdit(doc)} className="min-h-10">Edit</ButtonGhost>
                  <ButtonGhost disabled={busy} onClick={() => void toggleStatus(doc)} className="min-h-10">{isPublished ? "Unpublish" : "Publish"}</ButtonGhost>
                  {isPublished && (
                    <Link href={`/journal/${slug}`} target="_blank" className="inline-flex min-h-10 items-center rounded-full border border-[#ebe6de] px-4 text-[12.5px] font-semibold text-stone-700 transition hover:border-[#dfc28c] hover:text-[#881337]">View live ↗</Link>
                  )}
                  <ButtonDanger onClick={() => setDeleting(doc)} className="ml-auto min-h-10">Delete</ButtonDanger>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={formOpen}
        onClose={() => !busy && setFormOpen(false)}
        title={editing ? "Edit journal article" : "New journal article"}
        description="Simple format: blank line = new paragraph · ## heading · - list · **bold** · [link text](/collections/mul-cotton)"
        size="full"
        footer={
          <>
            <ButtonGhost disabled={busy} onClick={() => setFormOpen(false)}>Cancel</ButtonGhost>
            <ButtonPrimary disabled={busy} onClick={() => void save()}>{busy ? "Saving…" : form.status === "published" ? "Save & publish" : "Save draft"}</ButtonPrimary>
          </>
        }
      >
        <div className="grid gap-6 xl:grid-cols-[1.65fr_1fr]">
          <div className="space-y-4">
            <Field label="Article title *">
              <TextInput value={form.title} onChange={(event) => update("title", event.target.value)} placeholder="Mul Cotton Kya Hota Hai? Poori Guide" />
            </Field>
            <Field label="Summary / excerpt" hint="One or two lines shown on the Journal card and used as the search description when SEO description is blank.">
              <Textarea rows={3} value={form.excerpt} onChange={(event) => update("excerpt", event.target.value)} placeholder="Is guide me jaane mul cotton ki pehchan, fayde aur sahi dekhbhaal…" />
            </Field>

            <div>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">Article body *</span>
                <div className="flex rounded-full border border-[#ebe6de] bg-white p-1" role="group" aria-label="Editor view">
                  <button type="button" aria-pressed={!preview} onClick={() => setPreview(false)} className={`rounded-full px-3 py-1.5 text-[12px] font-semibold ${!preview ? "bg-[#881337] text-white" : "text-stone-600"}`}>Write</button>
                  <button type="button" aria-pressed={preview} onClick={() => setPreview(true)} className={`rounded-full px-3 py-1.5 text-[12px] font-semibold ${preview ? "bg-[#881337] text-white" : "text-stone-600"}`}>Preview</button>
                </div>
              </div>
              {preview ? (
                <div className="max-h-[520px] overflow-y-auto rounded-2xl border border-[#ebe6de] bg-[#fbf7f1] p-5">
                  {form.body.trim() ? <JournalBody body={form.body} /> : <p className="text-sm text-stone-400">Write something first — the preview will appear here.</p>}
                </div>
              ) : (
                <Textarea rows={20} value={form.body} onChange={(event) => update("body", event.target.value)} placeholder={"## Pehla heading\n\nApna anubhav simple words me likhe…\n\n- Ek fayda\n- Doosra fayda\n\n[Mul Cotton collection dekhe](/collections/mul-cotton)"} className="font-mono !text-[12.5px] leading-relaxed" />
              )}
              <p className="mt-1 text-[11px] text-stone-400">{wordCount(form.body)} words · about {Math.max(1, Math.round(wordCount(form.body) / 200))} min read</p>
            </div>
          </div>

          <div className="space-y-4">
            <Field label="URL slug *" hint={slugLocked ? "Locked after publishing so Google links and WhatsApp shares never break." : "Final address: /journal/your-slug"}>
              <TextInput value={form.slug} disabled={slugLocked} onChange={(event) => { setSlugTouched(true); update("slug", slugify(event.target.value)); }} placeholder="mul-cotton-guide" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <Field label="Author">
                <TextInput value={form.author} onChange={(event) => update("author", event.target.value)} />
              </Field>
              <Field label="Category">
                <TextInput list="journal-category-suggestions" value={form.category} onChange={(event) => update("category", event.target.value)} />
                <datalist id="journal-category-suggestions">
                  {CATEGORY_SUGGESTIONS.map((category) => <option key={category} value={category} />)}
                </datalist>
              </Field>
            </div>
            <Field label="Tags (comma separated)">
              <TextInput value={form.tags} onChange={(event) => update("tags", event.target.value)} placeholder="mul cotton, summer care, fabric guide" />
            </Field>
            <Field label="Cover photo">
              <TextInput value={form.coverImage} onChange={(event) => update("coverImage", event.target.value)} placeholder="Paste image URL or upload below" />
              <MediaUploadField type="image" multiple={false} onUploaded={(urls) => urls[0] && update("coverImage", urls[0])} />
            </Field>
            {form.coverImage && (
              <Image src={form.coverImage} alt="" width={640} height={360} unoptimized className="aspect-video w-full rounded-2xl object-cover" />
            )}
            <Field label="Cover photo description (alt text)">
              <TextInput value={form.coverAlt} onChange={(event) => update("coverAlt", event.target.value)} placeholder="Mul cotton kurta set in soft daylight" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Publish date">
                <TextInput type="date" value={form.publishedAt} onChange={(event) => update("publishedAt", event.target.value)} />
              </Field>
              <Field label="Order">
                <TextInput type="number" value={form.position} onChange={(event) => update("position", event.target.value)} />
              </Field>
              <Field label="Status">
                <Select value={form.status} onChange={(event) => update("status", event.target.value as JournalForm["status"])}>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </Select>
              </Field>
            </div>

            <div className="space-y-4 rounded-2xl bg-[#faf7f2] p-4">
              <h3 className="text-[12px] font-bold uppercase tracking-[0.12em] text-stone-700">Google search fields</h3>
              <Field label="SEO title (optional)" hint="Blank = article title is used.">
                <TextInput value={form.seoTitle} onChange={(event) => update("seoTitle", event.target.value)} />
              </Field>
              <Field label="SEO description (optional)" hint={`${form.seoDescription.trim().length}/160 characters. Blank = excerpt is used.`}>
                <Textarea rows={3} maxLength={180} value={form.seoDescription} onChange={(event) => update("seoDescription", event.target.value)} />
              </Field>
            </div>

            <SeoChecklist checks={seoChecks} />
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(deleting)}
        onClose={() => !busy && setDeleting(null)}
        title="Delete this article?"
        description={deleting ? `“${deleting.title || slugOf(deleting)}” and its /journal/${slugOf(deleting)} URL will be removed permanently.` : undefined}
        size="sm"
        footer={
          <>
            <ButtonGhost disabled={busy} onClick={() => setDeleting(null)}>Keep article</ButtonGhost>
            <ButtonDanger disabled={busy} onClick={() => void remove()}>{busy ? "Deleting…" : "Delete permanently"}</ButtonDanger>
          </>
        }
      >
        <p className="text-[13px] leading-relaxed text-stone-600">If people have shared this link, use <strong>Unpublish</strong> first and consider updating the article instead of deleting it.</p>
      </Modal>
    </div>
  );
}
