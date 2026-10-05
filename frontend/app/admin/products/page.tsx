"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge, Card } from "@/lib/admin-ui";
import AdminDataBadge from "@/components/admin/AdminDataBadge";
import { api, apiFetch, ApiError, formatCurrency, type AdminCatalogueProduct, type Paginated } from "@/lib/api-client";
import { useApiResource } from "@/lib/use-api";

const DEMO_PRODUCTS: Paginated<AdminCatalogueProduct> = {
  data: [
    { _id: "p1", name: "Gulab Bagh Handblock Mul Cotton", slug: "gulab-bagh", category: "anarkalis", status: "active", variants: [{ sku: "VC-1042-M", size: "M", price: 2499, mrp: 3499, available: 42, onHand: 42, reorderLevel: 3, low: false }], stockAvailable: 42, lowStockSkus: 0, unitsSold: 218, revenue: 544000, updatedAt: new Date().toISOString() },
    { _id: "p2", name: "Rani Bagru Silk Saree", slug: "rani-bagru", category: "sarees", status: "active", variants: [{ sku: "VC-1038-M", size: "M", price: 4299, mrp: 5499, available: 18, onHand: 18, reorderLevel: 3, low: false }], stockAvailable: 18, lowStockSkus: 0, unitsSold: 184, revenue: 791000, updatedAt: new Date().toISOString() },
    { _id: "p3", name: "Ivory Chikankari Anarkali", slug: "ivory-chikankari", category: "anarkalis", status: "active", variants: [{ sku: "VC-1015-M", size: "M", price: 3799, mrp: 4599, available: 6, onHand: 6, reorderLevel: 8, low: true }], stockAvailable: 6, lowStockSkus: 1, unitsSold: 156, revenue: 592000, updatedAt: new Date().toISOString() },
    { _id: "p4", name: "Indigo Dabu Cotton Kurta Set", slug: "indigo-dabu", category: "kurta-sets", status: "active", variants: [{ sku: "VC-1002-M", size: "M", price: 1899, mrp: 2499, available: 63, onHand: 63, reorderLevel: 3, low: false }], stockAvailable: 63, lowStockSkus: 0, unitsSold: 141, revenue: 267000, updatedAt: new Date().toISOString() },
  ],
  meta: { total: 4 },
};

const titleCase = (value: string) => value.replace(/-/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());

export default function ProductsPage() {
  const [cat, setCat] = useState("All");
  const [q, setQ] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const catalogue = useApiResource<Paginated<AdminCatalogueProduct>>((signal) => api.catalogue({ limit: 100 }, signal), DEMO_PRODUCTS);

  const products = catalogue.data.data;
  const categories = useMemo(() => ["All", ...Array.from(new Set(products.map((product) => product.category)))], [products]);

  const filtered = useMemo(
    () =>
      products.filter(
        (product) =>
          (cat === "All" || product.category === cat) &&
          (q === "" ||
            product.name.toLowerCase().includes(q.toLowerCase()) ||
            product.variants.some((variant) => variant.sku.toLowerCase().includes(q.toLowerCase())))
      ),
    [products, cat, q]
  );

  const priceRange = (product: AdminCatalogueProduct) => {
    const prices = product.variants.map((variant) => variant.price);
    if (prices.length === 0) return "—";
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return min === max ? formatCurrency(min) : `${formatCurrency(min)} – ${formatCurrency(max)}`;
  };

  const statusOf = (product: AdminCatalogueProduct) => {
    if (product.status !== "active") return titleCase(product.status);
    if (product.stockAvailable === 0) return "Out of stock";
    if (product.lowStockSkus > 0) return "Low stock";
    return "Active";
  };

  const tone = (label: string) => (label === "Active" ? ("success" as const) : label === "Low stock" ? ("warning" as const) : ("danger" as const));

  const archive = async (product: AdminCatalogueProduct) => {
    if (!window.confirm(`Archive “${product.name}”? It will be hidden from the storefront.`)) return;
    setBusyId(product._id);
    setError(null);
    try {
      await apiFetch(`/api/products/${product._id}`, { method: "DELETE" });
      catalogue.refresh();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Could not archive the product");
    } finally {
      setBusyId(null);
    }
  };

  const lowStockCount = products.reduce((sum, product) => sum + product.lowStockSkus, 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-400">Catalogue</p>
          <h1 className="mt-1 font-serif text-[26px] font-semibold tracking-tight">Products</h1>
          <p className="mt-1 text-[13px] text-stone-500">
            {products.length} products · {lowStockCount} SKUs need restocking
          </p>
        </div>
        <div className="flex items-center gap-2">
          <AdminDataBadge resource={catalogue} />
          <Link
            href="/admin/products/new"
            className="rounded-xl bg-[#881337] px-4 py-2 text-[12.5px] font-semibold text-white transition hover:bg-[#6b0f2b]"
          >
            + Add product
          </Link>
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-[12.5px] text-rose-700 ring-1 ring-rose-200">
          {error}
        </p>
      )}

      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-[#ebe6de] bg-white px-3 py-2 focus-within:border-[#dfc28c] sm:max-w-xs">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-stone-400">
              <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
            </svg>
            <label htmlFor="catalogue-search" className="sr-only">
              Search products
            </label>
            <input
              id="catalogue-search"
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="Search by name or SKU…"
              className="w-full bg-transparent text-[13px] outline-none placeholder:text-stone-400"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setCat(category)}
                aria-pressed={cat === category}
                className={`rounded-full px-3 py-1.5 text-[12px] font-medium transition ${
                  cat === category ? "bg-[#14100f] text-white" : "bg-[#faf7f2] text-stone-600 hover:bg-[#f0ebe3]"
                }`}
              >
                {titleCase(category)}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#f0ebe3] text-[10.5px] font-semibold uppercase tracking-[0.12em] text-stone-400">
                <th className="pb-3 pr-4">Product</th>
                <th className="pb-3 pr-4">Category</th>
                <th className="pb-3 pr-4">Price</th>
                <th className="pb-3 pr-4">Stock</th>
                <th className="pb-3 pr-4">Sold</th>
                <th className="pb-3 pr-4">Status</th>
                <th className="pb-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0ebe3]">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-[12.5px] text-stone-500">
                    No products match this filter.
                  </td>
                </tr>
              )}
              {filtered.map((product) => {
                const label = statusOf(product);
                return (
                  <tr key={product._id} className="group transition hover:bg-[#faf7f2]/60">
                    <td className="py-3.5 pr-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#faf7f2] to-[#f0ebe3] text-[12px] font-bold text-[#881337] ring-1 ring-[#ebe6de]">
                          {product.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-semibold">{product.name}</p>
                          <p className="text-[11px] text-stone-500">
                            {product.variants.length} SKUs · {product.variants.slice(0, 3).map((variant) => variant.sku).join(", ")}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 pr-4 text-[12.5px] text-stone-600">{titleCase(product.category)}</td>
                    <td className="py-3.5 pr-4 text-[13px] font-semibold">{priceRange(product)}</td>
                    <td className="py-3.5 pr-4">
                      <span className={`text-[12.5px] font-medium ${product.stockAvailable === 0 ? "text-rose-600" : product.lowStockSkus > 0 ? "text-amber-600" : "text-stone-700"}`}>
                        {product.stockAvailable}
                      </span>
                    </td>
                    <td className="py-3.5 pr-4 text-[12.5px] text-stone-600">{product.unitsSold}</td>
                    <td className="py-3.5 pr-4">
                      <Badge tone={tone(label)} dot>
                        {label}
                      </Badge>
                    </td>
                    <td className="py-3.5 text-right">
                      <div className="flex justify-end gap-1 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
                        <Link
                          href={`/product/${product.slug}`}
                          className="rounded-lg px-2.5 py-1.5 text-[11.5px] font-medium text-stone-600 hover:bg-[#f0ebe3]"
                        >
                          View
                        </Link>
                        {catalogue.source === "live" && (
                          <button
                            disabled={busyId === product._id}
                            onClick={() => void archive(product)}
                            className="rounded-lg px-2.5 py-1.5 text-[11.5px] font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                          >
                            {busyId === product._id ? "…" : "Archive"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-[#f0ebe3] pt-4 text-[12px] text-stone-500">
          <span>
            Showing {filtered.length} of {products.length}
          </span>
          <span>{catalogue.source === "live" ? "Live inventory from the backend" : "Demo catalogue"}</span>
        </div>
      </Card>
    </div>
  );
}
