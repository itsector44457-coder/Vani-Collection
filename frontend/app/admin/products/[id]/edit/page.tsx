"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Alert, ButtonGhost, ButtonPrimary, Card, Field, Select, Textarea, TextInput } from "@/lib/admin-ui";
import { api, apiFetch, ApiError, isApiConfigured, type AdminEditableProduct, type StoreCategory } from "@/lib/api-client";
import MediaUploadField from "@/components/admin/MediaUploadField";
import ColorSelect from "@/components/admin/ColorSelect";

type EditableVariant = AdminEditableProduct["variants"][number];
type EditableField = "name" | "slug" | "category" | "images" | "videos" | "gstRate" | "variants";

const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const isWebUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

function serverFieldErrors(cause: unknown): Record<string, string> {
  if (!(cause instanceof ApiError) || cause.status !== 422 || !cause.details || typeof cause.details !== "object") return {};
  const fields = (cause.details as { fieldErrors?: unknown }).fieldErrors;
  if (!fields || typeof fields !== "object") return {};
  return Object.fromEntries(
    Object.entries(fields)
      .filter((entry): entry is [string, string[]] => Array.isArray(entry[1]))
      .map(([field, messages]) => [field.split(".")[0], messages.join(" ")]),
  );
}

export default function EditProductPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const configured = isApiConfigured();
  const [product, setProduct] = useState<AdminEditableProduct | null>(null);
  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const [imagesText, setImagesText] = useState("");
  const [videosText, setVideosText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const formRef = useRef<HTMLFormElement>(null);
  const hoverImageChoices = imagesText.split(/\r?\n|,/).map((url) => url.trim()).filter(Boolean);

  useEffect(() => {
    const controller = new AbortController();
    void Promise.all([api.editableProduct(params.id, controller.signal), api.managedCategories(controller.signal)])
      .then(([{ data }, categoryResult]) => {
        setProduct(data);
        setCategories(categoryResult.data);
        setImagesText(data.images.map((image) => image.url).join("\n"));
        setVideosText(data.videos.map((video) => video.url).join("\n"));
        if (data.hoverImage === undefined && data.images[1]) {
          setProduct((current) => current ? { ...current, hoverImage: data.images[1].url } : current);
        }
      })
      .catch((cause: unknown) => {
        if ((cause as Error)?.name !== "AbortError") {
          setError(cause instanceof ApiError ? cause.message : "Could not load this product.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [params.id]);

  const setProductField = <K extends keyof AdminEditableProduct>(field: K, value: AdminEditableProduct[K]) => {
    setProduct((current) => current ? { ...current, [field]: value } : current);
    setFieldErrors((current) => ({ ...current, [field]: "" }));
  };

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!product) return;
    setError(null);
    setFieldErrors({});

    const nextErrors: Record<string, string> = {};
    const slug = slugify(product.slug || product.name);
    const imageUrls = imagesText.split(/\r?\n|,/).map((url) => url.trim()).filter(Boolean);
    const videoUrls = videosText.split(/\r?\n|,/).map((url) => url.trim()).filter(Boolean);
    if (product.name.trim().length < 2) nextErrors.name = "Product name must contain at least 2 characters.";
    if (!slug) nextErrors.slug = "Enter a valid product name or slug.";
    if (!categories.some((category) => category.slug === product.category && category.isActive)) nextErrors.category = "Choose an active category.";
    if (!Number.isFinite(product.gstRate ?? 5) || (product.gstRate ?? 5) < 0 || (product.gstRate ?? 5) > 28) nextErrors.gstRate = "GST must be between 0% and 28%.";
    if (imageUrls.some((url) => !isWebUrl(url))) nextErrors.images = "Use a valid HTTP or HTTPS URL for every image.";
    if (product.hoverImage && !imageUrls.includes(product.hoverImage)) nextErrors.images = "Choose the hover photo from the product’s current image list.";
    if (videoUrls.some((url) => !isWebUrl(url))) nextErrors.videos = "Use a valid HTTP or HTTPS URL for every video.";
    if (!product.variants.length) nextErrors.variants = "At least one variant is required.";
    product.variants.forEach((variant, index) => {
      if (!Number.isFinite(variant.price) || variant.price < 0 || !Number.isFinite(variant.mrp) || variant.mrp < 0) {
        nextErrors.variants = `Variant ${index + 1} prices must be zero or more.`;
      }
      if ((variant.images ?? []).some((image) => !isWebUrl(image.url))) {
        nextErrors.variants = `Variant ${index + 1} color photos must use valid HTTP or HTTPS URLs.`;
      }
    });
    if (Object.keys(nextErrors).length) {
      setFieldErrors(nextErrors);
      setError("Please correct the highlighted fields.");
      const firstInvalid = ["name", "slug", "category", "gstRate", "images", "videos", "variants"].find((field) => nextErrors[field]);
      if (firstInvalid) requestAnimationFrame(() => {
        const target = formRef.current?.querySelector<HTMLElement>(`[data-field="${firstInvalid}"]`);
        target?.focus();
        target?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
      return;
    }

    setSaving(true);
    try {
      await apiFetch(`/api/products/${encodeURIComponent(product._id)}`, {
        method: "PATCH",
        body: {
          name: product.name.trim(),
          slug,
          category: product.category.trim(),
          subcategory: product.subcategory || undefined,
          brand: product.brand || undefined,
          fabric: product.fabric || undefined,
          craft: product.craft || undefined,
          hsnCode: product.hsnCode || undefined,
          gstRate: product.gstRate,
          shortDescription: product.shortDescription || undefined,
          description: product.description || undefined,
          sizeGuide: product.sizeGuide?.trim() ?? "",
          images: imageUrls.map((url, position) => ({ url, alt: product.name, position })),
          hoverImage: imageUrls.includes(product.hoverImage || "") ? product.hoverImage : "",
          videos: videoUrls.map((url) => ({ url })),
          tags: product.tags,
          badges: product.badges,
          status: product.status,
          featured: product.featured,
          seo: product.seo,
          variants: product.variants,
        },
      });
      router.push("/admin/products");
    } catch (cause) {
      const errors = serverFieldErrors(cause);
      if (Object.keys(errors).length) {
        setFieldErrors(errors);
        setError("The API rejected some product fields. Review the highlighted values.");
      } else {
        setError(cause instanceof ApiError ? cause.message : "Could not save this product.");
      }
    } finally {
      setSaving(false);
    }
  };

  const updateVariant = (index: number, changes: Partial<EditableVariant>) => {
    if (!product) return;
    setProductField("variants", product.variants.map((variant, itemIndex) => itemIndex === index ? { ...variant, ...changes } : variant));
  };
  if (loading) return <p className="p-6 text-sm text-stone-500">Loading product…</p>;
  if (!product) return <div className="space-y-4 p-6"><Alert>{error || "Product not found."}</Alert><Link href="/admin/products" className="text-sm text-[#881337] hover:underline">Back to products</Link></div>;

  const variantsByColor = Array.from(new Set(product.variants.map((variant) => variant.color || "As shown")));
  const colorImages = (color: string) => product.variants.find((variant) => (variant.color || "As shown") === color)?.images ?? [];
  const updateColorImages = (color: string, urls: string[]) => {
    setProductField("variants", product.variants.map((variant) =>
      (variant.color || "As shown") === color
        ? { ...variant, images: urls.map((url, position) => ({ url, alt: `${product.name} ${color}`, position })) }
        : variant,
    ));
  };

  const fieldClass = (field: EditableField) => fieldErrors[field] ? "!border-rose-500 !ring-2 !ring-rose-100" : "";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-400">Catalogue</p>
          <h1 className="mt-1 font-serif text-[26px] font-semibold tracking-tight">Edit product</h1>
          <p className="mt-1 text-[13px] text-stone-500">Update catalogue information, images, variants, or publishing status. Manage stock in Inventory.</p>
        </div>
        <Link href="/admin/products" className="text-[12px] font-semibold text-[#881337] hover:underline">← Back to products</Link>
      </div>
      {!configured && <Alert tone="warning">The API is not configured; product edits cannot be saved.</Alert>}
      {error && <Alert>{error}</Alert>}

      <form ref={formRef} onSubmit={save} className="space-y-5" noValidate>
        <Card title="Product details">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Product name" htmlFor="edit-name">
              <TextInput id="edit-name" data-field="name" aria-invalid={Boolean(fieldErrors.name)} value={product.name} onChange={(event) => setProductField("name", event.target.value)} className={fieldClass("name")} />
              {fieldErrors.name && <p className="mt-1 text-xs text-rose-700">{fieldErrors.name}</p>}
            </Field>
            <Field label="URL slug" htmlFor="edit-slug" hint="Lowercase letters, numbers and hyphens">
              <TextInput id="edit-slug" data-field="slug" aria-invalid={Boolean(fieldErrors.slug)} value={product.slug} onChange={(event) => setProductField("slug", event.target.value)} onBlur={() => setProductField("slug", slugify(product.slug || product.name))} className={fieldClass("slug")} />
              {fieldErrors.slug && <p className="mt-1 text-xs text-rose-700">{fieldErrors.slug}</p>}
            </Field>
            <Field label="Category" htmlFor="edit-category">
              <Select id="edit-category" data-field="category" aria-invalid={Boolean(fieldErrors.category)} value={product.category} onChange={(event) => setProductField("category", event.target.value)} className={fieldClass("category")}>
                {categories.filter((category) => category.isActive).map((category) => <option key={category.slug} value={category.slug}>{category.name}</option>)}
              </Select>
              {fieldErrors.category && <p className="mt-1 text-xs text-rose-700">{fieldErrors.category}</p>}
            </Field>
            <Field label="Subcategory" htmlFor="edit-subcategory"><TextInput id="edit-subcategory" value={product.subcategory || ""} onChange={(event) => setProductField("subcategory", event.target.value)} /></Field>
            <Field label="Brand" htmlFor="edit-brand"><TextInput id="edit-brand" value={product.brand || ""} onChange={(event) => setProductField("brand", event.target.value)} /></Field>
            <Field label="Fabric" htmlFor="edit-fabric"><TextInput id="edit-fabric" value={product.fabric || ""} onChange={(event) => setProductField("fabric", event.target.value)} /></Field>
            <Field label="Craft" htmlFor="edit-craft"><TextInput id="edit-craft" value={product.craft || ""} onChange={(event) => setProductField("craft", event.target.value)} /></Field>
            <Field label="HSN code" htmlFor="edit-hsn"><TextInput id="edit-hsn" value={product.hsnCode || ""} onChange={(event) => setProductField("hsnCode", event.target.value)} /></Field>
            <Field label="GST rate" htmlFor="edit-gst">
              <Select id="edit-gst" data-field="gstRate" value={product.gstRate ?? 5} onChange={(event) => setProductField("gstRate", Number(event.target.value))} className={fieldClass("gstRate")}>
                {[0, 5, 12, 18, 28].map((rate) => <option key={rate} value={rate}>{rate}%</option>)}
              </Select>
              {fieldErrors.gstRate && <p className="mt-1 text-xs text-rose-700">{fieldErrors.gstRate}</p>}
            </Field>
          </div>
          <div className="mt-4 grid gap-4">
            <Field label="Short description" htmlFor="edit-short"><TextInput id="edit-short" value={product.shortDescription || ""} onChange={(event) => setProductField("shortDescription", event.target.value)} /></Field>
            <Field label="Full description" htmlFor="edit-description"><Textarea id="edit-description" rows={5} value={product.description || ""} onChange={(event) => setProductField("description", event.target.value)} /></Field>
            <Field label="Product-specific size guide" htmlFor="edit-size-guide" hint="Shown only for this product. Leave blank to use the standard size guide.">
              <Textarea id="edit-size-guide" rows={6} maxLength={5000} value={product.sizeGuide || ""} onChange={(event) => setProductField("sizeGuide", event.target.value)} placeholder={"Measurements in inches\nS — Bust 34, Waist 28, Length 44\nM — Bust 36, Waist 30, Length 45"} />
            </Field>
          </div>
        </Card>

        <Card title="Images & videos">
          <div className="grid gap-4">
            {variantsByColor.map((color) => {
              const images = colorImages(color);
              return (
                <Field key={color} label={`Photos for ${color}`} hint="These photos appear when shoppers choose this color.">
                  <Textarea
                    rows={2}
                    value={images.map((image) => image.url).join("\n")}
                    onChange={(event) => updateColorImages(color, event.target.value.split(/\r?\n|,/).map((url) => url.trim()).filter(Boolean))}
                  />
                  <MediaUploadField type="image" onUploaded={(urls) => updateColorImages(color, [...images.map((image) => image.url), ...urls])} disabled={saving} />
                </Field>
              );
            })}
            <Field label="Image URLs" htmlFor="edit-images" hint="One HTTP(S) URL per line">
              <Textarea id="edit-images" data-field="images" aria-invalid={Boolean(fieldErrors.images)} rows={4} value={imagesText} onChange={(event) => { setImagesText(event.target.value); setFieldErrors((current) => ({ ...current, images: "" })); }} className={fieldClass("images")} />
              <MediaUploadField type="image" onUploaded={(urls) => setImagesText((current) => [current, ...urls].filter(Boolean).join("\n"))} disabled={saving} />
              <Field label="Photo shown on hover" htmlFor="edit-hover-image" hint="Select one of this product’s uploaded photos for the product-card hover preview.">
                <Select
                  id="edit-hover-image"
                  value={product.hoverImage || ""}
                  onChange={(event) => setProductField("hoverImage", event.target.value)}
                >
                  <option value="">No alternate photo</option>
                  {hoverImageChoices.map((url, index) => (
                    <option key={`${url}-${index}`} value={url}>Photo {index + 1} · {url}</option>
                  ))}
                </Select>
                <div className="mt-2 flex flex-wrap gap-2">
                  {hoverImageChoices.map((url, index) => (
                    <button key={`${url}-preview-${index}`} type="button" onClick={() => setProductField("hoverImage", url)} aria-label={`Choose photo ${index + 1} for hover`} aria-pressed={product.hoverImage === url} className={`overflow-hidden rounded-lg border-2 ${product.hoverImage === url ? "border-[#881337]" : "border-transparent"}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={`Product photo ${index + 1}`} className="h-16 w-12 object-cover" />
                    </button>
                  ))}
                </div>
              </Field>
              {fieldErrors.images && <p className="mt-1 text-xs text-rose-700">{fieldErrors.images}</p>}
            </Field>
            <Field label="Video URLs" htmlFor="edit-videos" hint="Optional; one HTTP(S) URL per line">
              <Textarea id="edit-videos" data-field="videos" aria-invalid={Boolean(fieldErrors.videos)} rows={2} value={videosText} onChange={(event) => { setVideosText(event.target.value); setFieldErrors((current) => ({ ...current, videos: "" })); }} className={fieldClass("videos")} />
              <MediaUploadField type="video" onUploaded={(urls) => setVideosText((current) => [current, ...urls].filter(Boolean).join("\n"))} disabled={saving} />
              {fieldErrors.videos && <p className="mt-1 text-xs text-rose-700">{fieldErrors.videos}</p>}
            </Field>
          </div>
        </Card>

        <Card title="Variants">
          <p className="mb-4 text-xs text-stone-500">SKU is read-only to protect inventory references. Change stock from Inventory.</p>
          {product.variants.map((variant, index) => (
            <div key={variant.sku} className="mb-3 grid gap-3 rounded-xl border border-[#ebe6de] p-3 sm:grid-cols-5">
              <Field label="SKU" htmlFor={`edit-sku-${index}`}><TextInput id={`edit-sku-${index}`} value={variant.sku} disabled /></Field>
              <Field label="Size" htmlFor={`edit-size-${index}`}><TextInput id={`edit-size-${index}`} value={variant.size || ""} onChange={(event) => updateVariant(index, { size: event.target.value })} /></Field>
              <Field label="Color" htmlFor={`edit-color-${index}`}>
                <ColorSelect
                  id={`edit-color-${index}`}
                  value={variant.color || "As shown"}
                  additionalOptions={variantsByColor}
                  onChange={(color) => updateVariant(index, { color })}
                />
              </Field>
              <Field label="MRP (₹)" htmlFor={`edit-mrp-${index}`}><TextInput id={`edit-mrp-${index}`} type="number" min="0" value={variant.mrp} onChange={(event) => updateVariant(index, { mrp: Number(event.target.value) })} /></Field>
              <Field label="Price (₹)" htmlFor={`edit-price-${index}`}><TextInput id={`edit-price-${index}`} type="number" min="0" value={variant.price} onChange={(event) => updateVariant(index, { price: Number(event.target.value) })} /></Field>
            </div>
          ))}
          {fieldErrors.variants && <p data-field="variants" tabIndex={-1} className="text-xs text-rose-700">{fieldErrors.variants}</p>}
        </Card>

        <Card title="Publishing">
          <div className="flex flex-wrap items-end gap-5">
            <Field label="Status" htmlFor="edit-status">
              <Select id="edit-status" value={product.status} onChange={(event) => setProductField("status", event.target.value as AdminEditableProduct["status"])}>
                <option value="draft">Draft (hidden)</option>
                <option value="active">Active (live)</option>
                <option value="archived">Archived</option>
              </Select>
            </Field>
            <label className="flex items-center gap-2 pb-2 text-sm text-stone-600">
              <input type="checkbox" checked={product.featured} onChange={(event) => setProductField("featured", event.target.checked)} className="h-4 w-4 accent-[#881337]" />
              Featured
            </label>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <ButtonGhost type="button" onClick={() => router.push("/admin/products")}>Cancel</ButtonGhost>
            <ButtonPrimary type="submit" disabled={saving || !configured}>{saving ? "Saving…" : "Save changes"}</ButtonPrimary>
          </div>
        </Card>
      </form>
    </div>
  );
}
