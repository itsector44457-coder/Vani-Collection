"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card } from "@/lib/admin-ui";
import { apiFetch, ApiError, isApiConfigured } from "@/lib/api-client";

interface VariantDraft {
  size: string;
  sku: string;
  stock: number;
  priceDelta: number;
}

const SIZE_PRESETS = ["XS", "S", "M", "L", "XL", "XXL"];

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

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

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [category, setCategory] = useState("mul-cotton");
  const [fabric, setFabric] = useState("");
  const [craft, setCraft] = useState("Handblock");
  const [hsnCode, setHsnCode] = useState("6211");
  const [gstRate, setGstRate] = useState(5);
  const [shortDescription, setShortDescription] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrls, setImageUrls] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [mrp, setMrp] = useState(3499);
  const [price, setPrice] = useState(2499);
  const [sizes, setSizes] = useState<VariantDraft[]>(
    SIZE_PRESETS.slice(1, 5).map((size) => ({ size, sku: "", stock: 8, priceDelta: size === "XL" ? 100 : size === "XXL" ? 200 : 0 }))
  );
  const [status, setStatus] = useState<"draft" | "active">("draft");
  const [featured, setFeatured] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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
    if (!configured) {
      setError("NEXT_PUBLIC_API_URL is not configured, so the catalogue cannot be saved yet.");
      return;
    }
    if (sizes.length === 0) {
      setError("Select at least one size.");
      return;
    }
    setSaving(true);
    const variants = sizes.map((variant) => ({
      sku: (variant.sku || `${prefix}-${variant.size}`).toUpperCase(),
      size: variant.size,
      mrp: mrp + variant.priceDelta,
      price: price + variant.priceDelta,
      color: "As shown",
      weightGrams: 700,
    }));
    try {
      await apiFetch("/api/products", {
        method: "POST",
        body: {
          name,
          slug: effectiveSlug,
          category,
          fabric: fabric || undefined,
          craft: craft || undefined,
          hsnCode: hsnCode || undefined,
          gstRate,
          shortDescription: shortDescription || undefined,
          description: description || name,
          images: imageUrls
            .split(/[\n,]/)
            .map((url) => url.trim())
            .filter(Boolean)
            .map((url, position) => ({ url, alt: name, position })),
          videos: videoUrl.trim() ? [{ url: videoUrl.trim(), kind: "loom" }] : [],
          variants,
          status,
          featured,
          tags: [category, "handcrafted"],
        },
      });

      const failures: string[] = [];
      for (const variant of sizes) {
        const sku = (variant.sku || `${prefix}-${variant.size}`).toUpperCase();
        try {
          await apiFetch(`/api/inventory/${sku}`, { method: "PATCH", body: { onHand: variant.stock, reorderLevel: 3, reason: "Initial stock from admin console" } });
        } catch {
          failures.push(sku);
        }
      }
      setNotice(failures.length ? `Product created. Set stock for ${failures.join(", ")} from the inventory screen.` : "Product created with initial stock.");
      router.push("/admin/products");
    } catch (cause) {
      setError(cause instanceof ApiError ? `${cause.message}${cause.status === 422 ? " — check the highlighted fields." : ""}` : "Could not create the product");
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "mt-1.5 w-full rounded-xl border border-[#ebe6de] bg-white px-3.5 py-2.5 text-[13px] outline-none transition focus:border-[#dfc28c]";
  const labelClass = "text-[12px] font-semibold text-stone-600";

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

      <form onSubmit={submit} className="space-y-5" noValidate>
        <Card title="Basics">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label htmlFor="p-name" className={labelClass}>
                Product name
              </label>
              <input id="p-name" required value={name} onChange={(event) => setName(event.target.value)} className={inputClass} placeholder="Gulab Bagh Handblock Mul Cotton Anarkali" />
            </div>
            <div>
              <label htmlFor="p-slug" className={labelClass}>
                URL slug
              </label>
              <input id="p-slug" value={slug} onChange={(event) => setSlug(event.target.value)} className={inputClass} placeholder={effectiveSlug || "auto-generated-from-name"} />
            </div>
            <div>
              <label htmlFor="p-category" className={labelClass}>
                Category
              </label>
              <select id="p-category" value={category} onChange={(event) => setCategory(event.target.value)} className={inputClass}>
                {["mul-cotton", "festive", "coord-sets", "anarkalis", "kurta-sets", "sarees", "dupattas"].map((option) => (
                  <option key={option} value={option}>
                    {option.replace(/-/g, " ")}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="p-fabric" className={labelClass}>
                Fabric
              </label>
              <input id="p-fabric" value={fabric} onChange={(event) => setFabric(event.target.value)} className={inputClass} placeholder="100% Pure Jaipuri Mul Cotton" />
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
              <input id="p-mrp" type="number" min={0} required value={mrp} onChange={(event) => setMrp(Number(event.target.value))} className={inputClass} />
            </div>
            <div>
              <label htmlFor="p-price" className={labelClass}>
                Selling price (₹)
              </label>
              <input id="p-price" type="number" min={0} required value={price} onChange={(event) => setPrice(Number(event.target.value))} className={inputClass} />
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
              <select id="p-gst" value={gstRate} onChange={(event) => setGstRate(Number(event.target.value))} className={inputClass}>
                {[0, 5, 12, 18].map((rate) => (
                  <option key={rate} value={rate}>
                    {rate}%
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>

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
        </Card>

        <Card title="Copy & media">
          <div className="grid grid-cols-1 gap-4">
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
              <textarea id="p-images" rows={3} value={imageUrls} onChange={(event) => setImageUrls(event.target.value)} className={inputClass} placeholder="https://res.cloudinary.com/…/front.jpg, https://res.cloudinary.com/…/detail.jpg" />
            </div>
            <div>
              <label htmlFor="p-video" className={labelClass}>
                Loom video URL (optional)
              </label>
              <input id="p-video" value={videoUrl} onChange={(event) => setVideoUrl(event.target.value)} className={inputClass} placeholder="https://res.cloudinary.com/…/loom.mp4" />
            </div>
          </div>
        </Card>

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
