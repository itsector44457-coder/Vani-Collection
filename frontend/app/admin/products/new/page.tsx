"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Card } from "@/lib/admin-ui";
import { api, apiFetch, ApiError, isApiConfigured, type StoreCategory } from "@/lib/api-client";
import MediaUploadField from "@/components/admin/MediaUploadField";
import ColorSelect from "@/components/admin/ColorSelect";
import ProductSeoPanel from "@/components/admin/ProductSeoPanel";

interface VariantDraft {
  size: string;
  sku: string;
  stock: number;
  priceDelta: number;
}

interface ColorDraft {
  name: string;
  images: string[];
}

const SIZE_PRESETS = ["XS", "S", "M", "L", "XL", "XXL"];

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const isValidWebUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
};

type ProductField = "name" | "slug" | "category" | "gstRate" | "images" | "videos" | "variants";

function validationErrorsFrom(cause: unknown): Record<string, string> {
  if (!(cause instanceof ApiError) || cause.status !== 422 || !cause.details || typeof cause.details !== "object") return {};
  const fieldErrors = (cause.details as { fieldErrors?: unknown }).fieldErrors;
  if (!fieldErrors || typeof fieldErrors !== "object") return {};
  return Object.fromEntries(
    Object.entries(fieldErrors)
      .filter((entry): entry is [string, string[]] => Array.isArray(entry[1]) && entry[1].some((message) => typeof message === "string"))
      .map(([field, messages]) => [field, messages.join(" ")]),
  );
}

const skuPrefix = (name: string) =>
  `VC-${name
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.slice(0, 4))
    .join("")}`;

export default function NewProductPage() {
  const router = useRouter();
  const configured = isApiConfigured();
  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(configured);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [category, setCategory] = useState("mul-cotton");
  const [fabric, setFabric] = useState("");
  const [craft, setCraft] = useState("Handblock");
  const [hsnCode, setHsnCode] = useState("6211");
  const [gstRate, setGstRate] = useState(5);
  const [shortDescription, setShortDescription] = useState("");
  const [description, setDescription] = useState("");
  const [sizeGuide, setSizeGuide] = useState("");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [imageUrls, setImageUrls] = useState("");
  const [hoverImageUrl, setHoverImageUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [mrp, setMrp] = useState(3499);
  const [price, setPrice] = useState(2499);
  const [sizes, setSizes] = useState<VariantDraft[]>(
    SIZE_PRESETS.slice(1, 5).map((size) => ({ size, sku: "", stock: 8, priceDelta: size === "XL" ? 100 : size === "XXL" ? 200 : 0 }))
  );
  const [colors, setColors] = useState<ColorDraft[]>([{ name: "As shown", images: [] }]);
  const [status, setStatus] = useState<"draft" | "active">("draft");
  const [featured, setFeatured] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const formRef = useRef<HTMLFormElement>(null);
  const hoverImageChoices = imageUrls.split(/[\n,]/).map((url) => url.trim()).filter(Boolean);

  useEffect(() => {
    if (!configured) return;
    const controller = new AbortController();
    void api.categories(controller.signal)
      .then(({ data }) => {
        setCategories(data);
        setCategory((current) => data.some((item) => item.slug === current) ? current : data[0]?.slug || "");
      })
      .catch((cause: unknown) => {
        if ((cause as Error)?.name !== "AbortError") setCategoriesError(cause instanceof ApiError ? cause.message : "Could not load product categories.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setCategoriesLoading(false);
      });
    return () => controller.abort();
  }, [configured]);

  const effectiveSlug = slug || slugify(name);
  const prefix = skuPrefix(name || "VC ITEM");

  const toggleSize = (size: string) => {
    setSizes((current) =>
      current.some((variant) => variant.size === size)
        ? current.filter((variant) => variant.size !== size)
        : [...current, { size, sku: "", stock: 8, priceDelta: size === "XL" ? 100 : size === "XXL" ? 200 : 0 }]
    );
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setFieldErrors({});
    if (!configured) {
      setError("NEXT_PUBLIC_API_URL is not configured, so the catalogue cannot be saved yet.");
      return;
    }
    const normalizedSlug = slugify(slug.trim() || name);
    const parsedImageUrls = imageUrls
      .split(/[\n,]/)
      .map((url) => url.trim())
      .filter(Boolean);
    const nextFieldErrors: Record<string, string> = {};
    if (name.trim().length < 2) nextFieldErrors.name = "Enter a product name with at least 2 characters.";
    if (!normalizedSlug) nextFieldErrors.slug = "Enter a name that can be converted to a URL slug.";
    if (!category.trim() || !categories.some((item) => item.slug === category)) nextFieldErrors.category = "Choose an active product category from the list.";
    if (!Number.isFinite(gstRate) || gstRate < 0 || gstRate > 28) nextFieldErrors.gstRate = "GST must be between 0% and 28%.";
    if (!Number.isFinite(mrp) || mrp < 0) nextFieldErrors.mrp = "MRP must be zero or more.";
    if (!Number.isFinite(price) || price < 0) nextFieldErrors.price = "Selling price must be zero or more.";
    if (sizes.length === 0) nextFieldErrors.variants = "Select at least one size.";
    const normalizedColors = colors.map((color) => ({ ...color, name: color.name.trim() }));
    if (normalizedColors.some((color) => !color.name)) nextFieldErrors.variants = "Every color variant needs a color name.";
    if (new Set(normalizedColors.map((color) => color.name.toLowerCase())).size !== normalizedColors.length) {
      nextFieldErrors.variants = "Each color name must be unique.";
    }
    if (normalizedColors.some((color) => color.images.some((url) => !isValidWebUrl(url)))) {
      nextFieldErrors.variants = "Each color photo must be a valid HTTP or HTTPS URL.";
    }
    if (sizes.some((variant) => !Number.isFinite(variant.priceDelta) || price + variant.priceDelta < 0 || mrp + variant.priceDelta < 0)) {
      nextFieldErrors.variants = "Variant price adjustments must not make the MRP or selling price negative.";
    }
    if (sizes.some((variant) => !Number.isFinite(variant.stock) || variant.stock < 0)) {
      nextFieldErrors.variants = "Opening stock must be a number greater than or equal to zero.";
    }
    if (parsedImageUrls.some((url) => !isValidWebUrl(url))) nextFieldErrors.images = "Each image must be a valid HTTP or HTTPS URL.";
    if (videoUrl.trim() && !isValidWebUrl(videoUrl.trim())) nextFieldErrors.videos = "Enter a valid HTTP or HTTPS video URL.";
    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      setError("Please correct the highlighted fields before saving.");
      const firstInvalid = ["name", "slug", "category", "mrp", "price", "gstRate", "variants", "images", "videos"]
        .find((field) => nextFieldErrors[field]);
      if (firstInvalid) requestAnimationFrame(() => {
        const element = formRef.current?.querySelector<HTMLElement>(`[data-field="${firstInvalid}"]`);
        element?.focus();
        element?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
      return;
    }
    if (slug !== normalizedSlug) setSlug(normalizedSlug);
    const variants = sizes.flatMap((variant) => normalizedColors.map((color, colorIndex) => {
      const baseSku = variant.sku || `${prefix}-${variant.size}`;
      const colorSku = slugify(color.name).replace(/-/g, "") || `COLOR${colorIndex + 1}`;
      const colorSuffix = normalizedColors.length > 1 ? `-${colorSku}` : "";
      return {
        sku: `${baseSku}${colorSuffix}`.toUpperCase(),
        size: variant.size,
        mrp: mrp + variant.priceDelta,
        price: price + variant.priceDelta,
        color: color.name,
        images: color.images.map((url, position) => ({ url, alt: `${name} in ${color.name} — photo ${position + 1}`, position })),
        weightGrams: 700,
        stock: variant.stock,
      };
    }));
    if (new Set(variants.map((variant) => variant.sku)).size !== variants.length) {
      setFieldErrors({ variants: "Generated SKUs must be unique. Change the size SKU or color name." });
      setError("Please correct the highlighted variant SKUs before saving.");
      return;
    }
    const variantPayload = variants.map((variant) => ({
      sku: variant.sku,
      size: variant.size,
      mrp: variant.mrp,
      price: variant.price,
      color: variant.color,
      images: variant.images,
      weightGrams: variant.weightGrams,
    }));
    setSaving(true);
    try {
      await apiFetch("/api/products", {
        method: "POST",
        body: {
          name,
          slug: normalizedSlug,
          category,
          fabric: fabric || undefined,
          craft: craft || undefined,
          hsnCode: hsnCode || undefined,
          gstRate,
          shortDescription: shortDescription || undefined,
          description: description || name,
          sizeGuide: sizeGuide.trim(),
          images: imageUrls
            .split(/[\n,]/)
            .map((url) => url.trim())
            .filter(Boolean)
            .map((url, position) => ({ url, alt: `${name} — photo ${position + 1}`, position })),
          hoverImage: parsedImageUrls.includes(hoverImageUrl) ? hoverImageUrl : "",
          videos: videoUrl.trim() ? [{ url: videoUrl.trim(), kind: "loom" }] : [],
          variants: variantPayload,
          seo: { title: seoTitle.trim() || undefined, description: seoDescription.trim() || undefined },
          status,
          featured,
          tags: [category, "handcrafted"],
        },
      });

      const failures: string[] = [];
      for (const variant of variants) {
        const sku = variant.sku;
        try {
          await apiFetch(`/api/inventory/${sku}`, { method: "PATCH", body: { onHand: variant.stock, reorderLevel: 3, reason: "Initial stock from admin console" } });
        } catch {
          failures.push(sku);
        }
      }
      setNotice(failures.length ? `Product created. Set stock for ${failures.join(", ")} from the inventory screen.` : "Product created with initial stock.");
      router.push("/admin/products");
    } catch (cause) {
      const serverFieldErrors = validationErrorsFrom(cause);
      if (Object.keys(serverFieldErrors).length > 0) {
        setFieldErrors(serverFieldErrors);
        setError("The API rejected some product fields. Review the highlighted values.");
        const firstInvalid = ["name", "slug", "category", "gstRate", "images", "videos", "variants"]
          .find((field) => serverFieldErrors[field]);
        if (firstInvalid) requestAnimationFrame(() => {
          const element = formRef.current?.querySelector<HTMLElement>(`[data-field="${firstInvalid}"]`);
          element?.focus();
          element?.scrollIntoView({ behavior: "smooth", block: "center" });
        });
      } else {
        setError(cause instanceof ApiError ? cause.message : "Could not create the product");
      }
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "mt-1.5 w-full rounded-xl border border-[#ebe6de] bg-white px-3.5 py-2.5 text-[13px] outline-none transition focus:border-[#dfc28c]";
  const labelClass = "text-[12px] font-semibold text-stone-600";
  const fieldClass = (field: ProductField | "mrp" | "price") =>
    `${inputClass} ${fieldErrors[field] ? "!border-rose-500 !ring-2 !ring-rose-100" : ""}`;
  const fieldMessage = (field: ProductField | "mrp" | "price") =>
    fieldErrors[field] ? <p className="mt-1 text-xs text-rose-700">{fieldErrors[field]}</p> : null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-400">Catalogue</p>
          <h1 className="mt-1 font-serif text-[26px] font-semibold tracking-tight">Add product</h1>
          <p className="mt-1 text-[13px] text-stone-500">Creates the product, its SKUs and opening stock in the backend.</p>
        </div>
        <Link href="/admin/products" className="text-[12px] font-semibold text-[#881337] hover:underline">
          ← Back to products
        </Link>
      </div>

      {!configured && (
        <p className="rounded-xl bg-amber-50 px-3.5 py-3 text-[12.5px] text-amber-800 ring-1 ring-amber-200">
          Set <code className="font-semibold">NEXT_PUBLIC_API_URL</code> to the backend host to enable saving.
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-[12.5px] text-rose-700 ring-1 ring-rose-200">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="rounded-xl bg-emerald-50 px-3.5 py-2.5 text-[12.5px] text-emerald-700 ring-1 ring-emerald-200">
          {notice}
        </p>
      )}

      <form ref={formRef} onSubmit={submit} className="space-y-5" noValidate>
        <Card title="Basics">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label htmlFor="p-name" className={labelClass}>
                Product name
              </label>
              <input id="p-name" data-field="name" aria-invalid={Boolean(fieldErrors.name)} aria-describedby={fieldErrors.name ? "p-name-error" : undefined} required value={name} onChange={(event) => { setName(event.target.value); setFieldErrors((current) => ({ ...current, name: "" })); }} className={fieldClass("name")} placeholder="Gulab Bagh Handblock Mul Cotton Anarkali" />
              {fieldErrors.name && <p id="p-name-error" className="mt-1 text-xs text-rose-700">{fieldErrors.name}</p>}
            </div>
            <div>
              <label htmlFor="p-slug" className={labelClass}>
                URL slug
              </label>
              <input id="p-slug" data-field="slug" aria-invalid={Boolean(fieldErrors.slug)} aria-describedby={fieldErrors.slug ? "p-slug-error" : undefined} value={slug} onChange={(event) => { setSlug(event.target.value); setFieldErrors((current) => ({ ...current, slug: "" })); }} onBlur={() => setSlug(slugify(slug.trim() || name))} className={fieldClass("slug")} placeholder={effectiveSlug || "auto-generated-from-name"} />
              {fieldErrors.slug && <p id="p-slug-error" className="mt-1 text-xs text-rose-700">{fieldErrors.slug}</p>}
            </div>
            <div>
              <label htmlFor="p-category" className={labelClass}>
                Category
              </label>
              <select id="p-category" data-field="category" required disabled={categoriesLoading || categories.length === 0} aria-invalid={Boolean(fieldErrors.category)} value={category} onChange={(event) => { setCategory(event.target.value); setFieldErrors((current) => ({ ...current, category: "" })); }} className={fieldClass("category")}>
                <option value="">{categoriesLoading ? "Loading categories…" : "Choose a category"}</option>
                {categories.map((option) => (
                  <option key={option.slug} value={option.slug}>
                    {option.name}
                  </option>
                ))}
              </select>
              {categoriesError && <p role="alert" className="mt-1 text-xs text-rose-700">{categoriesError}</p>}
              {configured && !categoriesLoading && !categoriesError && categories.length === 0 && <p className="mt-1 text-xs text-rose-700">Create an active category before adding a product. <Link href="/admin/categories" className="font-semibold underline">Manage categories</Link></p>}
              {fieldMessage("category")}
            </div>
            <div>
              <label htmlFor="p-fabric" className={labelClass}>
                Fabric
              </label>
              <input id="p-fabric" value={fabric} onChange={(event) => setFabric(event.target.value)} className={inputClass} placeholder="100% Pure Mul Cotton" />
            </div>
            <div>
              <label htmlFor="p-craft" className={labelClass}>
                Craft
              </label>
              <input id="p-craft" value={craft} onChange={(event) => setCraft(event.target.value)} className={inputClass} />
            </div>
          </div>
        </Card>

        <Card title="Pricing & tax">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div>
              <label htmlFor="p-mrp" className={labelClass}>
                MRP (₹)
              </label>
              <input id="p-mrp" data-field="mrp" aria-invalid={Boolean(fieldErrors.mrp)} type="number" min={0} required value={mrp} onChange={(event) => { setMrp(Number(event.target.value)); setFieldErrors((current) => ({ ...current, mrp: "" })); }} className={fieldClass("mrp")} />
              {fieldMessage("mrp")}
            </div>
            <div>
              <label htmlFor="p-price" className={labelClass}>
                Selling price (₹)
              </label>
              <input id="p-price" data-field="price" aria-invalid={Boolean(fieldErrors.price)} type="number" min={0} required value={price} onChange={(event) => { setPrice(Number(event.target.value)); setFieldErrors((current) => ({ ...current, price: "" })); }} className={fieldClass("price")} />
              {fieldMessage("price")}
            </div>
            <div>
              <label htmlFor="p-hsn" className={labelClass}>
                HSN code
              </label>
              <input id="p-hsn" value={hsnCode} onChange={(event) => setHsnCode(event.target.value)} className={inputClass} />
            </div>
            <div>
              <label htmlFor="p-gst" className={labelClass}>
                GST %
              </label>
              <select id="p-gst" data-field="gstRate" aria-invalid={Boolean(fieldErrors.gstRate)} value={gstRate} onChange={(event) => { setGstRate(Number(event.target.value)); setFieldErrors((current) => ({ ...current, gstRate: "" })); }} className={fieldClass("gstRate")}>
                {[0, 5, 12, 18].map((rate) => (
                  <option key={rate} value={rate}>
                    {rate}%
                  </option>
                ))}
              </select>
              {fieldMessage("gstRate")}
            </div>
          </div>
        </Card>

        <div data-field="variants" tabIndex={-1} className="rounded-2xl outline-none focus:ring-2 focus:ring-rose-200">
        <Card title="Sizes & opening stock">
          <div className="flex flex-wrap gap-2">
            {SIZE_PRESETS.map((size) => {
              const active = sizes.some((variant) => variant.size === size);
              return (
                <button
                  key={size}
                  type="button"
                  onClick={() => toggleSize(size)}
                  aria-pressed={active}
                  className={`rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition ${
                    active ? "bg-[#14100f] text-white" : "bg-[#faf7f2] text-stone-600 ring-1 ring-[#ebe6de] hover:bg-[#f0ebe3]"
                  }`}
                >
                  {size}
                </button>
              );
            })}
          </div>

          {sizes.length > 0 && (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-[12.5px]">
                <thead>
                  <tr className="border-b border-[#f0ebe3] text-[10.5px] font-semibold uppercase tracking-[0.12em] text-stone-400">
                    <th className="pb-2 pr-4">Size</th>
                    <th className="pb-2 pr-4">SKU</th>
                    <th className="pb-2 pr-4">Price delta (₹)</th>
                    <th className="pb-2">Opening stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0ebe3]">
                  {sizes.map((variant, index) => (
                    <tr key={variant.size}>
                      <td className="py-2 pr-4 font-semibold">{variant.size}</td>
                      <td className="py-2 pr-4">
                        <input
                          aria-label={`SKU for ${variant.size}`}
                          value={variant.sku}
                          onChange={(event) => setSizes((current) => current.map((item, i) => (i === index ? { ...item, sku: event.target.value } : item)))}
                          placeholder={`${prefix}-${variant.size}`}
                          className="w-full rounded-lg border border-[#ebe6de] px-2.5 py-1.5 outline-none focus:border-[#dfc28c]"
                        />
                      </td>
                      <td className="py-2 pr-4">
                        <input
                          aria-label={`Price delta for ${variant.size}`}
                          type="number"
                          value={variant.priceDelta}
                          onChange={(event) => setSizes((current) => current.map((item, i) => (i === index ? { ...item, priceDelta: Number(event.target.value) } : item)))}
                          className="w-24 rounded-lg border border-[#ebe6de] px-2.5 py-1.5 outline-none focus:border-[#dfc28c]"
                        />
                      </td>
                      <td className="py-2">
                        <input
                          aria-label={`Opening stock for ${variant.size}`}
                          type="number"
                          min={0}
                          value={variant.stock}
                          onChange={(event) => setSizes((current) => current.map((item, i) => (i === index ? { ...item, stock: Number(event.target.value) } : item)))}
                          className="w-24 rounded-lg border border-[#ebe6de] px-2.5 py-1.5 outline-none focus:border-[#dfc28c]"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="mt-5 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-[12.5px] font-semibold text-stone-700">Available colors</h3>
                <p className="mt-1 text-[11px] text-stone-500">A SKU and inventory item is created for every size and color combination.</p>
              </div>
              <button type="button" onClick={() => setColors((current) => [...current, { name: "", images: [] }])} className="rounded-lg border border-[#ebe6de] px-3 py-2 text-xs font-semibold text-stone-700 hover:border-[#dfc28c]">Add color</button>
            </div>
            {colors.map((color, index) => (
              <div key={`color-${index}`} className="space-y-2 rounded-xl border border-[#ebe6de] p-3">
                <div className="flex items-center gap-2">
                  <div className="w-full max-w-sm">
                    <label htmlFor={`product-color-${index}`} className="mb-1 block text-[11px] font-semibold text-stone-600">Choose color</label>
                    <ColorSelect id={`product-color-${index}`} value={color.name} onChange={(name) => setColors((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, name } : item))} />
                  </div>
                  {colors.length > 1 && <button type="button" onClick={() => setColors((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="rounded-lg px-3 py-2 text-sm text-rose-700 hover:bg-rose-50" aria-label={`Remove color ${index + 1}`}>Remove</button>}
                </div>
                <label className="block text-[11px] font-semibold text-stone-600">Photos for {color.name || `color ${index + 1}`}</label>
                <textarea aria-label={`Photos for color ${index + 1}`} rows={2} value={color.images.join("\n")} onChange={(event) => setColors((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, images: event.target.value.split(/\r?\n|,/).map((url) => url.trim()).filter(Boolean) } : item))} className="w-full rounded-lg border border-[#ebe6de] px-3 py-2 text-xs outline-none focus:border-[#dfc28c]" placeholder="Optional: paste one image URL per line" />
                <MediaUploadField type="image" onUploaded={(urls) => setColors((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, images: [...item.images, ...urls] } : item))} disabled={saving} />
              </div>
            ))}
            <p className="text-[11px] text-stone-500">Opening stock entered above will be set for each selected size in every color. Each color’s photos appear when shoppers select that color.</p>
          </div>
          {fieldErrors.variants && <p role="alert" className="mt-3 text-xs text-rose-700">{fieldErrors.variants}</p>}
        </Card>
        </div>

        <Card title="Copy & media">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label htmlFor="p-size-guide" className={labelClass}>
                Product-specific size guide
              </label>
              <textarea id="p-size-guide" rows={6} maxLength={5000} value={sizeGuide} onChange={(event) => setSizeGuide(event.target.value)} className={inputClass} placeholder={"Example:\nMeasurements in inches\nS — Bust 34, Waist 28, Length 44\nM — Bust 36, Waist 30, Length 45"} />
              <p className="mt-1 text-[11px] text-stone-500">Shown only on this product. Leave blank to use the standard size guide.</p>
            </div>
            <div>
              <label htmlFor="p-short" className={labelClass}>
                Short description
              </label>
              <input id="p-short" value={shortDescription} onChange={(event) => setShortDescription(event.target.value)} className={inputClass} placeholder="Featherlight mul cotton with gota detailing" />
            </div>
            <div>
              <label htmlFor="p-description" className={labelClass}>
                Full description
              </label>
              <textarea id="p-description" rows={4} value={description} onChange={(event) => setDescription(event.target.value)} className={inputClass} placeholder="Handcrafted in Bagru with wooden handblock motifs…" />
            </div>
            <div>
              <label htmlFor="p-images" className={labelClass}>
                Image URLs (comma or new-line separated)
              </label>
              <textarea id="p-images" data-field="images" aria-invalid={Boolean(fieldErrors.images)} rows={3} value={imageUrls} onChange={(event) => { setImageUrls(event.target.value); setFieldErrors((current) => ({ ...current, images: "" })); }} className={fieldClass("images")} placeholder="https://res.cloudinary.com/…/front.jpg, https://res.cloudinary.com/…/detail.jpg" />
              <MediaUploadField type="image" onUploaded={(urls) => setImageUrls((current) => [current, ...urls].filter(Boolean).join("\n"))} disabled={saving} />
              <label htmlFor="p-hover-image" className={`${labelClass} mt-3 block`}>Photo shown on hover</label>
              <select id="p-hover-image" value={hoverImageUrl} onChange={(event) => setHoverImageUrl(event.target.value)} className={inputClass}>
                <option value="">No alternate photo</option>
                {hoverImageChoices.map((url, index) => (
                  <option key={`${url}-${index}`} value={url}>Photo {index + 1} · {url}</option>
                ))}
              </select>
              <div className="mt-2 flex flex-wrap gap-2">
                {hoverImageChoices.map((url, index) => (
                  <button key={`${url}-preview-${index}`} type="button" onClick={() => setHoverImageUrl(url)} aria-label={`Choose photo ${index + 1} for hover`} aria-pressed={hoverImageUrl === url} className={`overflow-hidden rounded-lg border-2 ${hoverImageUrl === url ? "border-[#881337]" : "border-transparent"}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`Product photo ${index + 1}`} className="h-16 w-12 object-cover" />
                  </button>
                ))}
              </div>
              <p className="mt-1 text-[11px] text-stone-500">Choose one of this product’s photos to show when shoppers hover over its card.</p>
              {fieldMessage("images")}
            </div>
            <div>
              <label htmlFor="p-video" className={labelClass}>
                Loom video URL (optional)
              </label>
              <input id="p-video" data-field="videos" aria-invalid={Boolean(fieldErrors.videos)} value={videoUrl} onChange={(event) => { setVideoUrl(event.target.value); setFieldErrors((current) => ({ ...current, videos: "" })); }} className={fieldClass("videos")} placeholder="https://res.cloudinary.com/…/loom.mp4" />
              <MediaUploadField type="video" onUploaded={(urls) => setVideoUrl(urls[0] ?? "")} disabled={saving} />
              {fieldMessage("videos")}
            </div>
          </div>
        </Card>

        <ProductSeoPanel
          idPrefix="new"
          productName={name}
          slug={effectiveSlug}
          shortDescription={shortDescription}
          description={description}
          fabric={fabric}
          categorySelected={categories.some((item) => item.slug === category)}
          imageCount={hoverImageChoices.length + colors.reduce((sum, color) => sum + color.images.length, 0)}
          hasSellablePrice={price > 0 && sizes.length > 0}
          seoTitle={seoTitle}
          seoDescription={seoDescription}
          onSeoTitleChange={setSeoTitle}
          onSeoDescriptionChange={setSeoDescription}
        />

        <Card title="Publishing">
          <div className="flex flex-wrap items-center gap-5">
            <div className="flex items-center gap-2">
              <label htmlFor="p-status" className={labelClass}>
                Status
              </label>
              <select id="p-status" value={status} onChange={(event) => setStatus(event.target.value as "draft" | "active")} className="rounded-xl border border-[#ebe6de] bg-white px-3 py-2 text-[13px] outline-none focus:border-[#dfc28c]">
                <option value="draft">Draft (hidden)</option>
                <option value="active">Active (live on storefront)</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-[12.5px] font-medium text-stone-600">
              <input type="checkbox" checked={featured} onChange={(event) => setFeatured(event.target.checked)} className="h-4 w-4 rounded border-[#ebe6de]" />
              Feature on the homepage
            </label>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving || !configured}
              className="rounded-xl bg-[#881337] px-5 py-2.5 text-[13px] font-semibold text-white transition hover:bg-[#6b0f2b] disabled:cursor-not-allowed disabled:bg-stone-300"
            >
              {saving ? "Saving…" : "Save product"}
            </button>
            <Link href="/admin/products" className="rounded-xl border border-[#ebe6de] bg-white px-5 py-2.5 text-[13px] font-semibold text-stone-600 transition hover:border-[#dfc28c]">
              Cancel
            </Link>
          </div>
        </Card>
      </form>
    </div>
  );
}
