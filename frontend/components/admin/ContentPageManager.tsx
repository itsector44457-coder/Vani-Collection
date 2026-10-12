"use client";

import { useMemo, useState } from "react";
import { Alert, Badge, ButtonGhost, ButtonPrimary, Card, Field, Modal, Select, Textarea, TextInput } from "@/lib/admin-ui";
import { api, ApiError, formatRelativeTime, type AdminCatalogueProduct, type ContentInput, type ContentDoc, type Paginated } from "@/lib/api-client";
import { useApiResource } from "@/lib/use-api";
import MediaUploadField from "@/components/admin/MediaUploadField";

const PAGE_OPTIONS = [
  { key: "collections", label: "Homepage product collection", path: "/#products" },
  { key: "shipping", label: "Shipping information", path: "/shipping" },
  { key: "returns", label: "Returns & exchanges", path: "/returns" },
  { key: "privacy", label: "Privacy policy", path: "/privacy" },
  { key: "terms", label: "Terms & conditions", path: "/terms" },
  { key: "size-guide", label: "Size guide", path: "/size-guide" },
] as const;

interface PageSection {
  heading: string;
  body: string;
}

interface PageForm {
  title: string;
  subtitle: string;
  body: string;
  imageUrl: string;
  seoTitle: string;
  seoDescription: string;
  status: "draft" | "published";
  sections: PageSection[];
  productIds: string[];
}

const asString = (value: unknown) => typeof value === "string" ? value : "";
const objectValue = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};

function pageForm(document?: ContentDoc): PageForm {
  const blocks = objectValue(document?.blocks);
  const sections = Array.isArray(blocks.sections)
    ? blocks.sections.filter((section): section is PageSection =>
      Boolean(section && typeof section === "object" && typeof (section as PageSection).heading === "string" && typeof (section as PageSection).body === "string"))
      .map((section) => ({ heading: section.heading, body: section.body }))
    : [];
  return {
    title: document?.title ?? "",
    subtitle: document?.subtitle ?? "",
    body: document?.body ?? "",
    imageUrl: document?.media?.[0]?.url ?? "",
    seoTitle: asString(blocks.seoTitle),
    seoDescription: asString(blocks.seoDescription),
    status: document?.status === "published" ? "published" : "draft",
    sections,
    productIds: Array.isArray(blocks.productIds) ? blocks.productIds.filter((id): id is string => typeof id === "string") : [],
  };
}

const escapePreviewText = (value: string) => value.split("\n").filter(Boolean);

export default function ContentPageManager({
  documents,
  enabled,
  onSaved,
}: {
  documents: ContentDoc[];
  enabled: boolean;
  onSaved: () => void;
}) {
  const [selected, setSelected] = useState<string>("collections");
  const [drafts, setDrafts] = useState<Record<string, PageForm>>({});
  const [previewOpen, setPreviewOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<{ createdAt: string; changedBy?: { email?: string; firstName?: string; lastName?: string }; changes: { field: string; before?: unknown; after?: unknown }[] }[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const page = PAGE_OPTIONS.find((item) => item.key === selected) ?? PAGE_OPTIONS[0];
  const isCollection = selected === "collections";
  const docKey = isCollection ? "home.products.featured" : `page.${selected}`;
  const document = documents.find((item) => item.key === docKey);
  const form = drafts[selected] ?? pageForm(document);
  const catalogue = useApiResource<Paginated<AdminCatalogueProduct>>(
    (signal) => api.catalogue({ limit: 100 }, signal),
    { data: [], meta: { total: 0 } },
  );
  const products = useMemo(
    () => catalogue.data.data.filter((product) => product.status === "active"),
    [catalogue.data.data],
  );
  const selectedProducts = form.productIds
    .map((id) => products.find((product) => product._id === id))
    .filter((product): product is AdminCatalogueProduct => Boolean(product));

  const update = (changes: Partial<PageForm>) => {
    setDrafts((current) => ({ ...current, [selected]: { ...form, ...changes } }));
  };

  const save = async (status: "draft" | "published") => {
    if (!form.title.trim()) {
      setError(isCollection ? "Add a title for the homepage product section." : "Add a page title.");
      return;
    }
    if (isCollection && form.productIds.length === 0) {
      setError("Select at least one active product for this homepage collection.");
      return;
    }
    if (!isCollection && !form.body.trim() && form.sections.every((section) => !section.heading.trim() && !section.body.trim())) {
      setError("Add page copy or at least one section before saving.");
      return;
    }
    if (form.imageUrl && !/^(https?:\/\/|\/)/i.test(form.imageUrl)) {
      setError("The page image must be an HTTPS URL or a local path beginning with /.");
      return;
    }
    const body: ContentInput = isCollection
      ? {
        kind: "product_collection",
        title: form.title.trim(),
        subtitle: form.subtitle.trim() || undefined,
        blocks: { productIds: form.productIds },
        position: 0,
        status,
      }
      : {
        kind: "page",
        title: form.title.trim(),
        subtitle: form.subtitle.trim() || undefined,
        body: form.body.trim() || undefined,
        media: form.imageUrl ? [{ url: form.imageUrl, alt: form.title.trim(), kind: "hero" }] : [],
        blocks: {
          sections: form.sections.filter((section) => section.heading.trim() || section.body.trim()),
          seoTitle: form.seoTitle.trim() || undefined,
          seoDescription: form.seoDescription.trim() || undefined,
        },
        status,
      };

    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await api.upsertContent(docKey, body);
      setDrafts((current) => ({ ...current, [selected]: { ...form, status } }));
      setNotice(status === "published" ? `${page.label} published to ${page.path}.` : `${page.label} saved as a draft.`);
      onSaved();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Could not save this page.");
    } finally {
      setBusy(false);
    }
  };

  const loadHistory = async () => {
    try {
      const result = await api.contentRevisions(docKey);
      setHistory(result.data);
      setError(null);
      setHistoryOpen(true);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Could not load edit history.");
    }
  };

  const toggleProduct = (id: string) => {
    const productIds = form.productIds.includes(id)
      ? form.productIds.filter((value) => value !== id)
      : [...form.productIds, id];
    update({ productIds });
  };

  const moveProduct = (id: string, offset: -1 | 1) => {
    const from = form.productIds.indexOf(id);
    const to = from + offset;
    if (from < 0 || to < 0 || to >= form.productIds.length) return;
    const productIds = [...form.productIds];
    [productIds[from], productIds[to]] = [productIds[to], productIds[from]];
    update({ productIds });
  };

  return (
    <>
      <Card
        title="Manage a storefront page"
        action={
          <div className="flex gap-2">
            <ButtonGhost onClick={() => void loadHistory()} disabled={!document}>Edit history</ButtonGhost>
            <ButtonGhost onClick={() => setPreviewOpen(true)}>Preview</ButtonGhost>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-[minmax(220px,1fr)_2fr]">
            <Field label="Page or placement" htmlFor="managed-page">
              <Select id="managed-page" value={selected} onChange={(event) => { setSelected(event.target.value); setError(null); setNotice(null); }}>
                {PAGE_OPTIONS.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
              </Select>
            </Field>
            <div className="flex items-end justify-between gap-3 rounded-xl bg-[#faf7f2] px-4 py-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">Storefront path</p>
                <p className="mt-1 font-mono text-sm text-[#881337]">{page.path}</p>
              </div>
              <Badge tone={document?.status === "published" ? "success" : document ? "warning" : "neutral"} dot>
                {document?.status === "published" ? "Published" : document ? "Draft" : "Using current storefront content"}
              </Badge>
            </div>
          </div>

          {error && <Alert>{error}</Alert>}
          {notice && <Alert tone="success">{notice}</Alert>}
          {!document && (
            <Alert tone="info">
              This page still uses its existing built-in content. Save a draft to prepare a CMS version, then preview and publish it when ready.
            </Alert>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <Field label={isCollection ? "Section heading" : "Page heading"} htmlFor="managed-title">
              <TextInput id="managed-title" value={form.title} onChange={(event) => update({ title: event.target.value })} placeholder={page.label} />
            </Field>
            <Field label="Subtitle" htmlFor="managed-subtitle">
              <TextInput id="managed-subtitle" value={form.subtitle} onChange={(event) => update({ subtitle: event.target.value })} />
            </Field>
          </div>

          {isCollection ? (
            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <div>
                  <h4 className="text-sm font-semibold text-stone-800">Choose products and their display order</h4>
                  <p className="mt-1 text-xs text-stone-500">Product names, prices and availability still come from the product catalog.</p>
                </div>
                <Badge tone="info">{form.productIds.length} selected</Badge>
              </div>
              {catalogue.error && <Alert>{catalogue.error}</Alert>}
              <div className="max-h-80 space-y-2 overflow-y-auto rounded-xl border border-[#ebe6de] p-3">
                {products.map((product) => {
                  const order = form.productIds.indexOf(product._id);
                  return (
                    <label key={product._id} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-[#faf7f2]">
                      <input type="checkbox" checked={order >= 0} onChange={() => toggleProduct(product._id)} className="h-4 w-4 accent-[#881337]" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-stone-800">{product.name}</span>
                        <span className="block text-xs text-stone-500">{product.category} · {product.status}</span>
                      </span>
                      {order >= 0 && (
                        <span className="flex items-center gap-1">
                          <span className="mr-1 text-xs font-semibold text-[#881337]">{order + 1}</span>
                          <ButtonGhost onClick={(event) => { event.preventDefault(); moveProduct(product._id, -1); }} disabled={order === 0} aria-label={`Move ${product.name} up`}>↑</ButtonGhost>
                          <ButtonGhost onClick={(event) => { event.preventDefault(); moveProduct(product._id, 1); }} disabled={order === form.productIds.length - 1} aria-label={`Move ${product.name} down`}>↓</ButtonGhost>
                        </span>
                      )}
                    </label>
                  );
                })}
                {products.length === 0 && <p className="p-3 text-sm text-stone-500">No active catalog products are available.</p>}
              </div>
              {selectedProducts.length > 0 && (
                <p className="mt-2 text-xs text-stone-500">Homepage order: {selectedProducts.map((product) => product.name).join(" → ")}</p>
              )}
            </div>
          ) : (
            <>
              <Field label="Page introduction" htmlFor="managed-body" hint="Plain text; line breaks become paragraphs.">
                <Textarea id="managed-body" rows={4} value={form.body} onChange={(event) => update({ body: event.target.value })} />
              </Field>
              <Field label="Page header image" htmlFor="managed-image" hint="Optional HTTPS image URL or /local-image.jpg">
                <TextInput id="managed-image" value={form.imageUrl} onChange={(event) => update({ imageUrl: event.target.value })} />
                <MediaUploadField type="image" multiple={false} onUploaded={(urls) => update({ imageUrl: urls[0] ?? form.imageUrl })} disabled={busy} />
              </Field>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-stone-800">Page sections</h4>
                  <ButtonGhost onClick={() => update({ sections: [...form.sections, { heading: "", body: "" }] })}>Add section</ButtonGhost>
                </div>
                {form.sections.map((section, index) => (
                  <div key={`${selected}-section-${index}`} className="grid gap-3 rounded-xl border border-[#ebe6de] p-3 md:grid-cols-[1fr_2fr_auto]">
                    <Field label={`Section ${index + 1} heading`} htmlFor={`managed-section-title-${index}`}>
                      <TextInput id={`managed-section-title-${index}`} value={section.heading} onChange={(event) => update({ sections: form.sections.map((item, itemIndex) => itemIndex === index ? { ...item, heading: event.target.value } : item) })} />
                    </Field>
                    <Field label="Copy" htmlFor={`managed-section-body-${index}`}>
                      <Textarea id={`managed-section-body-${index}`} rows={3} value={section.body} onChange={(event) => update({ sections: form.sections.map((item, itemIndex) => itemIndex === index ? { ...item, body: event.target.value } : item) })} />
                    </Field>
                    <div className="flex items-end gap-1">
                      <ButtonGhost onClick={() => update({ sections: form.sections.map((item, itemIndex) => itemIndex === index && index > 0 ? form.sections[index - 1] : itemIndex === index - 1 ? form.sections[index] : item) })} disabled={index === 0} aria-label="Move section up">↑</ButtonGhost>
                      <ButtonGhost onClick={() => update({ sections: form.sections.filter((_, itemIndex) => itemIndex !== index) })} aria-label="Remove section">×</ButtonGhost>
                    </div>
                  </div>
                ))}
              </div>
              <details className="rounded-xl border border-[#ebe6de] p-4">
                <summary className="cursor-pointer text-sm font-semibold text-stone-700">Search preview (SEO)</summary>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <Field label="Search title" htmlFor="managed-seo-title">
                    <TextInput id="managed-seo-title" value={form.seoTitle} onChange={(event) => update({ seoTitle: event.target.value })} />
                  </Field>
                  <Field label="Search description" htmlFor="managed-seo-description">
                    <Textarea id="managed-seo-description" rows={2} value={form.seoDescription} onChange={(event) => update({ seoDescription: event.target.value })} />
                  </Field>
                </div>
              </details>
            </>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#f0ebe3] pt-4">
            <p className="text-xs text-stone-500">
              {document?.updatedAt ? `Last edited ${formatRelativeTime(document.updatedAt)}${document.updatedBy?.email ? ` by ${document.updatedBy.email}` : ""}` : "Product catalog details are edited separately under Products."}
            </p>
            <div className="flex gap-2">
              <ButtonGhost onClick={() => void save("draft")} disabled={busy || !enabled}>{busy ? "Saving…" : "Save draft"}</ButtonGhost>
              <ButtonPrimary onClick={() => void save("published")} disabled={busy || !enabled}>{busy ? "Saving…" : "Publish changes"}</ButtonPrimary>
            </div>
          </div>
        </div>
      </Card>

      <Modal open={previewOpen} onClose={() => setPreviewOpen(false)} title={`Preview: ${page.label}`} description="Preview of the structured content currently in the editor. Not visible to shoppers until published.">
        <div className="max-h-[65vh] overflow-y-auto rounded-xl bg-[#faf7f2] p-5">
          <div className="rounded-xl bg-gradient-to-br from-[#1c1917] via-[#3d2012] to-[#881337] px-5 py-10 text-center text-white">
            <h2 className="font-serif text-3xl">{form.title || page.label}</h2>
            {form.subtitle && <p className="mx-auto mt-3 max-w-lg text-sm text-white/75">{form.subtitle}</p>}
          </div>
          {isCollection ? (
            <div className="mt-4 space-y-2">
              {selectedProducts.map((product, index) => <p key={product._id} className="rounded-lg bg-white p-3 text-sm">{index + 1}. {product.name}</p>)}
              {selectedProducts.length === 0 && <p className="py-5 text-center text-sm text-stone-500">No products selected.</p>}
            </div>
          ) : (
            <div className="mt-4 space-y-4 rounded-xl bg-white p-5">
              {escapePreviewText(form.body).map((paragraph, index) => <p key={`body-${index}`} className="text-sm leading-7 text-stone-600">{paragraph}</p>)}
              {form.sections.map((section, index) => (
                <section key={`preview-${index}`} className="border-t border-stone-100 pt-4">
                  <h3 className="font-serif text-xl text-[#881337]">{section.heading || "Section heading"}</h3>
                  {escapePreviewText(section.body).map((paragraph, paragraphIndex) => <p key={paragraphIndex} className="mt-2 text-sm leading-7 text-stone-600">{paragraph}</p>)}
                </section>
              ))}
            </div>
          )}
        </div>
      </Modal>

      <Modal open={historyOpen} onClose={() => setHistoryOpen(false)} title={`Edit history: ${page.label}`} description="Recent saved changes and who made them.">
        <div className="max-h-[60vh] space-y-3 overflow-y-auto">
          {history.map((revision, index) => (
            <div key={`${revision.createdAt}-${index}`} className="rounded-xl border border-[#ebe6de] p-3">
              <p className="text-xs font-semibold text-stone-700">
                {new Date(revision.createdAt).toLocaleString("en-IN")} · {revision.changedBy?.firstName || revision.changedBy?.email || "Staff"}
              </p>
              <ul className="mt-2 space-y-1">
                {revision.changes.map((change) => (
                  <li key={change.field} className="text-xs text-stone-600">
                    <span className="font-semibold">{change.field}</span>
                    {change.field === "blocks" ? " updated" : ` changed from “${String(change.before ?? "—").slice(0, 80)}” to “${String(change.after ?? "—").slice(0, 80)}”`}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {history.length === 0 && <p className="py-6 text-center text-sm text-stone-500">No saved edits yet.</p>}
        </div>
      </Modal>
    </>
  );
}
