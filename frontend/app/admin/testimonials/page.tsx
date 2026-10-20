"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import {
  Alert,
  Badge,
  ButtonDanger,
  ButtonGhost,
  ButtonPrimary,
  Card,
  Checkbox,
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
import MediaUploadField from "@/components/admin/MediaUploadField";
import { api, ApiError, type ContentDoc, type ContentInput } from "@/lib/api-client";
import { useApiResource } from "@/lib/use-api";

interface TestimonialForm {
  key: string;
  name: string;
  city: string;
  rating: number;
  headline: string;
  comment: string;
  product: string;
  date: string;
  verified: boolean;
  orderRef: string;
  image: string;
  position: string;
  status: "draft" | "published";
  consentConfirmed: boolean;
  consentSource: string;
}

type StatusFilter = "all" | "published" | "draft";

const blankForm = (position = 0): TestimonialForm => ({
  key: "",
  name: "",
  city: "",
  rating: 5,
  headline: "",
  comment: "",
  product: "",
  date: new Date().toISOString().slice(0, 10),
  verified: false,
  orderRef: "",
  image: "",
  position: String(position),
  status: "draft",
  consentConfirmed: false,
  consentSource: "",
});

const asObject = (value: ContentDoc["blocks"]): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

const text = (value: unknown): string => (typeof value === "string" ? value : "");
const isLegacyAboutPillar = (doc: ContentDoc) => doc.key.startsWith("about.sustain.");

function formFromDoc(doc: ContentDoc): TestimonialForm {
  const blocks = asObject(doc.blocks);
  const rating = typeof blocks.rating === "number" ? blocks.rating : Number(blocks.rating) || 5;
  return {
    key: doc.key,
    name: text(blocks.name) || text(blocks.author),
    city: text(blocks.city) || text(blocks.location),
    rating: Math.min(5, Math.max(1, Math.round(rating))),
    headline: doc.title || "",
    comment: doc.body || text(blocks.comment),
    product: text(blocks.product),
    date: text(blocks.date).slice(0, 10),
    verified: blocks.verified === true,
    orderRef: text(blocks.orderRef),
    image: text(blocks.image) || text(blocks.avatar) || text(blocks.photo) || doc.media?.[0]?.url || "",
    position: String(doc.position ?? 0),
    status: doc.status === "published" ? "published" : "draft",
    consentConfirmed: blocks.consentConfirmed === true,
    consentSource: text(blocks.consentSource),
  };
}

const nameOf = (doc: ContentDoc): string => {
  const blocks = asObject(doc.blocks);
  return text(blocks.name) || text(blocks.author) || "Unnamed customer";
};

const ratingOf = (doc: ContentDoc): number => {
  const blocks = asObject(doc.blocks);
  const rating = typeof blocks.rating === "number" ? blocks.rating : Number(blocks.rating) || 0;
  return Math.min(5, Math.max(0, Math.round(rating)));
};

const slugify = (value: string): string =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "customer";

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <svg key={star} width="14" height="14" viewBox="0 0 24 24" fill={star <= rating ? "#c9a227" : "none"} stroke={star <= rating ? "#c9a227" : "#d6d3d1"} strokeWidth="1.6" aria-hidden="true">
          <path d="M12 2l2.9 6.3 6.8.8-5 4.7 1.3 6.7L12 17.3 6 20.5l1.3-6.7-5-4.7 6.8-.8L12 2z" strokeLinejoin="round" />
        </svg>
      ))}
    </span>
  );
}

export default function AdminTestimonialsPage() {
  const content = useApiResource<{ data: ContentDoc[] }>((signal) => api.managedContent(signal), { data: [] });
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ContentDoc | null>(null);
  const [form, setForm] = useState<TestimonialForm>(blankForm());
  const [deleting, setDeleting] = useState<ContentDoc | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const allDocs = useMemo(
    () => content.data.data.filter((doc) => doc.kind === "testimonial"),
    [content.data.data]
  );
  const legacyPillars = useMemo(() => allDocs.filter(isLegacyAboutPillar), [allDocs]);
  const testimonials = useMemo(
    () => allDocs.filter((doc) => !isLegacyAboutPillar(doc)).sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
    [allDocs]
  );
  const published = testimonials.filter((doc) => doc.status === "published");
  const average = published.length
    ? published.reduce((sum, doc) => sum + ratingOf(doc), 0) / published.length
    : 0;

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return testimonials.filter((doc) => {
      if (statusFilter !== "all" && doc.status !== statusFilter) return false;
      if (!query) return true;
      const blocks = asObject(doc.blocks);
      return [nameOf(doc), doc.title, doc.body, text(blocks.city), text(blocks.product)]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [testimonials, statusFilter, search]);

  const update = <K extends keyof TestimonialForm>(field: K, value: TestimonialForm[K]) =>
    setForm((current) => ({ ...current, [field]: value }));

  const openCreate = () => {
    setEditing(null);
    setForm(blankForm(testimonials.length));
    setError(null);
    setFormOpen(true);
  };

  const openEdit = (doc: ContentDoc) => {
    setEditing(doc);
    setForm(formFromDoc(doc));
    setError(null);
    setFormOpen(true);
  };

  const save = async () => {
    const name = form.name.trim();
    const comment = form.comment.trim();
    if (form.status === "published") {
      if (!name || !comment) {
        setError("A published review needs the customer name and review text. Save it as a draft if it is not ready yet.");
        return;
      }
      if (!form.consentConfirmed) {
        setError("Please confirm the customer gave this review and agreed to it being shown on the website.");
        return;
      }
      if (form.verified && !form.orderRef.trim()) {
        setError("“Verified purchase” needs the order number/reference you checked. It stays private — customers never see it.");
        return;
      }
    }
    const position = Number(form.position);
    if (!Number.isFinite(position)) {
      setError("Display order must be a number.");
      return;
    }

    let key = form.key.trim();
    if (!editing && !key) {
      key = `home.testimonial.${slugify(name || "customer")}.${Date.now().toString(36)}`;
    }

    const existingBlocks = editing ? asObject(editing.blocks) : {};
    const payload: ContentInput = {
      kind: "testimonial",
      title: form.headline.trim() || undefined,
      body: comment || undefined,
      blocks: {
        ...existingBlocks,
        name,
        city: form.city.trim(),
        rating: form.rating,
        verified: form.verified,
        orderRef: form.orderRef.trim(),
        product: form.product.trim(),
        date: form.date,
        image: form.image.trim(),
        consentConfirmed: form.consentConfirmed,
        consentSource: form.consentSource.trim(),
      },
      media: form.image.trim() ? [{ url: form.image.trim(), alt: name || "Customer photo", kind: "image" }] : [],
      position,
      status: form.status,
    };

    setBusy(true);
    setError(null);
    try {
      await api.upsertContent(key, payload);
      setNotice(
        form.status === "published"
          ? `“${name || "Review"}” is published — it will appear in the homepage review section within a few minutes.`
          : "Draft saved. It will not show on the website until you publish it."
      );
      setFormOpen(false);
      setEditing(null);
      content.refresh();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Could not save this review.");
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
      setNotice(next === "published" ? `Published ${nameOf(doc)}’s review.` : `Unpublished ${nameOf(doc)}’s review — it is hidden from the website now.`);
      content.refresh();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Could not change this review’s status.");
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
      setNotice(`Deleted ${nameOf(deleting)}’s review permanently.`);
      setDeleting(null);
      content.refresh();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Could not delete this review.");
    } finally {
      setBusy(false);
    }
  };

  const migrateLegacy = async () => {
    setBusy(true);
    setError(null);
    try {
      await Promise.all(
        legacyPillars.map((doc) =>
          api.upsertContent(doc.key, {
            kind: "section",
            title: doc.title,
            body: doc.body,
            blocks: doc.blocks,
            media: doc.media,
            position: doc.position,
            status: doc.status,
          })
        )
      );
      setNotice("About-page pillars moved out of Customer reviews. They still appear on the About page as before.");
      content.refresh();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Could not move the About-page records.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeading
        eyebrow="Content"
        title="Customer reviews (Homepage)"
        subtitle="Only the reviews you create and publish here appear on the website. There are no built-in or sample reviews anymore — if this list is empty, the homepage simply hides the review section."
        action={<ButtonPrimary onClick={openCreate} className="min-h-11">+ Add customer review</ButtonPrimary>}
      />
      <div className="flex justify-end"><AdminDataBadge resource={content} /></div>

      {error && <Alert>{error}</Alert>}
      {notice && <Alert tone="success">{notice}</Alert>}
      <Alert tone="info">
        Add only real customer words — copied from WhatsApp, Google reviews, order feedback or the shop counter — with the customer’s permission. Fake or stock-photo reviews can get the store penalised by Google and damage customer trust.
      </Alert>

      {legacyPillars.length > 0 && (
        <Alert tone="warning">
          {legacyPillars.length} About-page record{legacyPillars.length === 1 ? " is" : "s are"} stored in the old reviews list. They are not shown as homepage reviews.{" "}
          <button type="button" disabled={busy} onClick={migrateLegacy} className="font-bold underline underline-offset-2 disabled:opacity-50">
            Move them to About sections
          </button>
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Published on homepage" value={String(published.length)} hint="Visible to shoppers" tone="success" />
        <StatCard label="Drafts" value={String(testimonials.length - published.length)} hint="Hidden until published" />
        <StatCard label="Average rating" value={average ? average.toFixed(1) : "—"} hint="Published reviews only" tone="gold" />
        <StatCard label="Total managed" value={String(testimonials.length)} hint="Excluding About-page records" />
      </div>

      <Card title="Find a review" className="!p-4">
        <div className="flex flex-wrap items-center gap-4">
          <FilterTabs
            options={["all", "published", "draft"] as const}
            value={statusFilter}
            onChange={setStatusFilter}
            counts={{ all: testimonials.length, published: published.length, draft: testimonials.length - published.length }}
          />
          <div className="min-w-56 flex-1">
            <label htmlFor="testimonial-search" className="sr-only">Search reviews</label>
            <TextInput id="testimonial-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name, city, product or words…" />
          </div>
        </div>
      </Card>

      {content.loading ? (
        <Card><EmptyState title="Loading customer reviews…" /></Card>
      ) : rows.length === 0 ? (
        <Card>
          <EmptyState
            title={testimonials.length ? "No reviews match this filter" : "No customer reviews yet"}
            hint={testimonials.length ? "Try another status or search." : "Add your first real customer review and publish it — the homepage section appears automatically."}
          />
          {!testimonials.length && (
            <div className="pb-8 text-center"><ButtonPrimary onClick={openCreate}>Add the first review</ButtonPrimary></div>
          )}
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2" aria-live="polite">
          {rows.map((doc) => {
            const blocks = asObject(doc.blocks);
            const image = text(blocks.image) || doc.media?.[0]?.url;
            const isPublished = doc.status === "published";
            return (
              <Card
                key={doc.key}
                title={nameOf(doc)}
                badge={<Badge tone={isPublished ? "success" : "warning"} dot>{isPublished ? "Published · live" : "Draft · hidden"}</Badge>}
                action={<span className="text-[11px] text-stone-400">Order #{doc.position ?? 0}</span>}
              >
                <div className="flex gap-4">
                  {image ? (
                    <Image src={image} alt="" width={56} height={56} unoptimized className="h-14 w-14 shrink-0 rounded-full object-cover" />
                  ) : (
                    <span aria-hidden="true" className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#f4e4de] font-serif text-lg text-[#881337]">
                      {nameOf(doc).charAt(0).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Stars rating={ratingOf(doc)} />
                      {blocks.verified === true && <Badge tone="success">Verified purchase</Badge>}
                      {text(blocks.city) && <span className="text-[12px] text-stone-500">{text(blocks.city)}</span>}
                    </div>
                    {doc.title && <p className="mt-2 text-[13.5px] font-semibold text-[#14100f]">{doc.title}</p>}
                    <p className="mt-1 line-clamp-4 text-[13px] leading-relaxed text-stone-600">{doc.body || text(blocks.comment) || "No review text yet."}</p>
                    <p className="mt-2 text-[11.5px] text-stone-400">
                      {text(blocks.product) ? `Product: ${text(blocks.product)}` : "No product linked"}
                      {text(blocks.date) ? ` · ${text(blocks.date)}` : ""}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 border-t border-[#f0ebe3] pt-4">
                  <ButtonGhost onClick={() => openEdit(doc)} className="min-h-10">Edit</ButtonGhost>
                  <ButtonGhost disabled={busy} onClick={() => void toggleStatus(doc)} className="min-h-10">
                    {isPublished ? "Unpublish" : "Publish"}
                  </ButtonGhost>
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
        title={editing ? "Edit customer review" : "Add customer review"}
        description="Published reviews appear in the homepage customer-love section. Drafts stay visible only here."
        size="2xl"
        footer={
          <>
            <ButtonGhost disabled={busy} onClick={() => setFormOpen(false)}>Cancel</ButtonGhost>
            <ButtonPrimary disabled={busy} onClick={() => void save()}>{busy ? "Saving…" : form.status === "published" ? "Save & publish" : "Save draft"}</ButtonPrimary>
          </>
        }
      >
        <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Customer name *">
                <TextInput value={form.name} onChange={(event) => update("name", event.target.value)} placeholder="e.g. yadav" autoComplete="off" />
              </Field>
              <Field label="City">
                <TextInput value={form.city} onChange={(event) => update("city", event.target.value)} placeholder="e.g. Indore" autoComplete="off" />
              </Field>
            </div>

            <Field label="Review headline">
              <TextInput value={form.headline} onChange={(event) => update("headline", event.target.value)} placeholder="e.g. Softest mul cotton I have worn" />
            </Field>
            <Field label="Review text *" hint="Paste the customer’s own words. Light spelling fixes are fine; do not change the meaning.">
              <Textarea rows={5} value={form.comment} onChange={(event) => update("comment", event.target.value)} placeholder="The customer’s review…" />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Product purchased">
                <TextInput value={form.product} onChange={(event) => update("product", event.target.value)} placeholder="Product name" />
              </Field>
              <Field label="Review date">
                <TextInput type="date" value={form.date} onChange={(event) => update("date", event.target.value)} />
              </Field>
            </div>

            <Field label="Customer photo (optional)" hint="Only use a photo the customer shared for the website. Never use a stock/model photo as a customer.">
              <TextInput value={form.image} onChange={(event) => update("image", event.target.value)} placeholder="Paste image URL or upload below" />
              <MediaUploadField type="image" multiple={false} onUploaded={(urls) => urls[0] && update("image", urls[0])} />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Display order">
                <TextInput type="number" value={form.position} onChange={(event) => update("position", event.target.value)} />
              </Field>
              <Field label="Status">
                <Select value={form.status} onChange={(event) => update("status", event.target.value as TestimonialForm["status"])}>
                  <option value="draft">Draft — hidden</option>
                  <option value="published">Published — show on homepage</option>
                </Select>
              </Field>
            </div>
          </div>

          <div className="space-y-4">
            <fieldset>
              <legend className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">Rating *</legend>
              <div className="flex gap-1" role="radiogroup" aria-label="Customer rating">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    role="radio"
                    aria-checked={form.rating === star}
                    aria-label={`${star} star${star === 1 ? "" : "s"}`}
                    onClick={() => update("rating", star)}
                    className={`flex h-11 w-11 items-center justify-center rounded-xl border text-xl transition ${star <= form.rating ? "border-[#dfc28c] bg-[#fdf8ee] text-[#c9a227]" : "border-[#ebe6de] bg-white text-stone-300"}`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="space-y-3 rounded-2xl bg-[#faf7f2] p-4">
              <Checkbox
                label="Customer gave this review and agreed to show it on the website *"
                checked={form.consentConfirmed}
                onChange={(event) => update("consentConfirmed", event.target.checked)}
              />
              <Field label="Where did it come from? (private note)">
                <TextInput value={form.consentSource} onChange={(event) => update("consentSource", event.target.value)} placeholder="WhatsApp / Google / shop counter…" />
              </Field>
              <Checkbox
                label="Verified purchase — I checked the order record"
                checked={form.verified}
                onChange={(event) => update("verified", event.target.checked)}
              />
              {form.verified && (
                <Field label="Order number/reference (private) *">
                  <TextInput value={form.orderRef} onChange={(event) => update("orderRef", event.target.value)} placeholder="Order no. you checked" />
                </Field>
              )}
            </div>

            <section aria-label="Homepage preview" className="rounded-2xl border border-[#ebe6de] bg-white p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-stone-400">Homepage preview</p>
              <div className="mt-3 flex items-center gap-3">
                {form.image ? (
                  <Image src={form.image} alt="" width={48} height={48} unoptimized className="h-12 w-12 rounded-full object-cover" />
                ) : (
                  <span aria-hidden="true" className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f4e4de] font-serif text-[#881337]">{(form.name || "?").charAt(0).toUpperCase()}</span>
                )}
                <div>
                  <p className="text-[13px] font-semibold">{form.name || "Customer name"}</p>
                  <p className="text-[11px] text-stone-400">{form.city || "City"}{form.verified ? " · Verified purchase" : ""}</p>
                </div>
                <span className="ml-auto"><Stars rating={form.rating} /></span>
              </div>
              {form.headline && <p className="mt-3 text-[13px] font-semibold">{form.headline}</p>}
              <p className="mt-1 text-[12.5px] leading-relaxed text-stone-600">{form.comment || "The review text will appear here…"}</p>
            </section>
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(deleting)}
        onClose={() => !busy && setDeleting(null)}
        title="Delete this review?"
        description={deleting ? `“${nameOf(deleting)}” will be removed permanently and will disappear from the homepage. This cannot be undone.` : undefined}
        size="sm"
        footer={
          <>
            <ButtonGhost disabled={busy} onClick={() => setDeleting(null)}>Keep review</ButtonGhost>
            <ButtonDanger disabled={busy} onClick={() => void remove()}>{busy ? "Deleting…" : "Delete permanently"}</ButtonDanger>
          </>
        }
      >
        <p className="text-[13px] leading-relaxed text-stone-600">If you only want to hide it for now, cancel and use <strong>Unpublish</strong> instead.</p>
      </Modal>
    </div>
  );
}
