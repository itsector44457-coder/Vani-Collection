"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge, Card } from "@/lib/admin-ui";
import AdminDataBadge from "@/components/admin/AdminDataBadge";
import { api, ApiError, formatCurrency, type AdminCatalogueProduct, type Paginated } from "@/lib/api-client";
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
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Single delete modal state
  const [deleteTarget, setDeleteTarget] = useState<AdminCatalogueProduct | null>(null);
  const [deleteType, setDeleteType] = useState<"permanent" | "archive">("permanent");
  const [deleting, setDeleting] = useState(false);

  // Multi-select bulk delete state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkDeleteType, setBulkDeleteType] = useState<"permanent" | "archive">("permanent");
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const catalogue = useApiResource<Paginated<AdminCatalogueProduct>>(
    (signal) => api.catalogue({ limit: 100 }, signal),
    DEMO_PRODUCTS
  );

  const products = catalogue.data.data;
  const categories = useMemo(
    () => ["All", ...Array.from(new Set(products.map((product) => product.category)))],
    [products]
  );

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

  // Multi-selection helpers
  const allFilteredSelected = filtered.length > 0 && filtered.every((p) => selectedIds.has(p._id));
  const someFilteredSelected = filtered.some((p) => selectedIds.has(p._id)) && !allFilteredSelected;

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filtered.forEach((p) => next.delete(p._id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filtered.forEach((p) => next.add(p._id));
        return next;
      });
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

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

  const tone = (label: string) =>
    label === "Active" ? ("success" as const) : label === "Low stock" ? ("warning" as const) : ("danger" as const);

  // Single delete execution
  const executeDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setError(null);
    try {
      const isPermanent = deleteType === "permanent";
      await api.deleteProduct(deleteTarget._id, isPermanent);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(deleteTarget._id);
        return next;
      });
      setSuccessMessage(
        isPermanent
          ? `Product “${deleteTarget.name}” has been permanently deleted.`
          : `Product “${deleteTarget.name}” has been archived.`
      );
      setTimeout(() => setSuccessMessage(null), 5000);
      setDeleteTarget(null);
      catalogue.refresh();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Could not delete the product");
    } finally {
      setDeleting(false);
    }
  };

  // Bulk delete execution
  const executeBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setBulkDeleting(true);
    setError(null);
    try {
      const isPermanent = bulkDeleteType === "permanent";
      const result = await api.bulkDeleteProducts(ids, isPermanent);
      setSuccessMessage(
        result.message ||
          (isPermanent
            ? `${ids.length} products have been permanently deleted.`
            : `${ids.length} products have been archived.`)
      );
      setTimeout(() => setSuccessMessage(null), 5000);
      setSelectedIds(new Set());
      setBulkModalOpen(false);
      catalogue.refresh();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Bulk deletion failed");
    } finally {
      setBulkDeleting(false);
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
            className="rounded-xl bg-[#881337] px-4 py-2 text-[12.5px] font-semibold text-white transition hover:bg-[#6b0f2b] shadow-sm"
          >
            + Add product
          </Link>
        </div>
      </div>

      {error && (
        <div role="alert" className="flex items-center justify-between rounded-xl bg-rose-50 px-3.5 py-2.5 text-[12.5px] text-rose-700 ring-1 ring-rose-200">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} className="font-semibold text-rose-800 hover:underline">
            ✕
          </button>
        </div>
      )}

      {successMessage && (
        <div role="status" className="flex items-center justify-between rounded-xl bg-emerald-50 px-3.5 py-2.5 text-[12.5px] text-emerald-800 ring-1 ring-emerald-200 animate-in fade-in duration-200">
          <span className="flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-emerald-600">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {successMessage}
          </span>
          <button type="button" onClick={() => setSuccessMessage(null)} className="font-semibold text-emerald-800 hover:underline">
            ✕
          </button>
        </div>
      )}

      {/* Floating / Sticky Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50/90 p-3.5 shadow-lg backdrop-blur-md animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-[#881337] text-[13px] font-bold text-white shadow-xs">
              {selectedIds.size}
            </span>
            <div>
              <p className="text-[13px] font-semibold text-stone-900">
                {selectedIds.size} product{selectedIds.size > 1 ? "s" : ""} selected
              </p>
              <p className="text-[11px] text-stone-500">
                You can delete or archive all selected products together.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={clearSelection}
              className="rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-[12px] font-medium text-stone-700 hover:bg-stone-50 transition"
            >
              Deselect All
            </button>
            <button
              type="button"
              onClick={() => {
                setBulkDeleteType("permanent");
                setBulkModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-[12px] font-semibold text-white shadow-sm hover:bg-rose-700 transition"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
              Delete Selected ({selectedIds.size})
            </button>
          </div>
        </div>
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
                <th className="w-10 pb-3 pr-2 text-center">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someFilteredSelected;
                    }}
                    onChange={toggleSelectAll}
                    title="Select All Products"
                    className="h-4 w-4 rounded border-stone-300 text-[#881337] focus:ring-[#881337] cursor-pointer"
                  />
                </th>
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
                  <td colSpan={8} className="py-10 text-center text-[12.5px] text-stone-500">
                    No products match this filter.
                  </td>
                </tr>
              )}
              {filtered.map((product) => {
                const label = statusOf(product);
                const isSelected = selectedIds.has(product._id);
                return (
                  <tr
                    key={product._id}
                    className={`group transition ${
                      isSelected ? "bg-rose-50/40" : "hover:bg-[#faf7f2]/60"
                    }`}
                  >
                    <td className="w-10 py-3.5 pr-2 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectOne(product._id)}
                        className="h-4 w-4 rounded border-stone-300 text-[#881337] focus:ring-[#881337] cursor-pointer"
                      />
                    </td>
                    <td className="py-3.5 pr-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#faf7f2] to-[#f0ebe3] text-[12px] font-bold text-[#881337] ring-1 ring-[#ebe6de]">
                          {product.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-semibold text-stone-900">{product.name}</p>
                          <p className="text-[11px] text-stone-500">
                            {product.variants.length} SKUs · {product.variants.slice(0, 3).map((variant) => variant.sku).join(", ")}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 pr-4 text-[12.5px] text-stone-600">{titleCase(product.category)}</td>
                    <td className="py-3.5 pr-4 text-[13px] font-semibold text-stone-900">{priceRange(product)}</td>
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
                      <div className="flex justify-end items-center gap-1.5">
                        <Link
                          href={`/product/${product.slug}`}
                          target="_blank"
                          className="rounded-lg px-2.5 py-1.5 text-[11.5px] font-medium text-stone-600 hover:bg-[#f0ebe3] transition"
                        >
                          View
                        </Link>
                        <Link
                          href={`/admin/products/${product._id}/edit`}
                          className="rounded-lg px-2.5 py-1.5 text-[11.5px] font-medium text-[#881337] hover:bg-rose-50 transition"
                        >
                          Edit
                        </Link>
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteTarget(product);
                            setDeleteType("permanent");
                          }}
                          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11.5px] font-medium text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition"
                          title="Delete or archive product"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            <line x1="10" y1="11" x2="10" y2="17" />
                            <line x1="14" y1="11" x2="14" y2="17" />
                          </svg>
                          Delete
                        </button>
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
            Showing {filtered.length} of {products.length} products
            {selectedIds.size > 0 && ` (${selectedIds.size} selected)`}
          </span>
          <span>{catalogue.source === "live" ? "Live inventory from MongoDB backend" : "Live catalogue unavailable"}</span>
        </div>
      </Card>

      {/* Single Delete / Archive Modal */}
      {deleteTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-[#ebe6de] bg-white shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="p-5 sm:p-6">
              <div className="flex items-start gap-3.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 ring-1 ring-rose-200">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    <line x1="10" y1="11" x2="10" y2="17" />
                    <line x1="14" y1="11" x2="14" y2="17" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 id="delete-dialog-title" className="font-serif text-[18px] font-semibold text-[#14100f]">
                    Delete Product
                  </h3>
                  <p className="mt-1 text-[13px] text-stone-600 line-clamp-2">
                    Are you sure you want to delete <span className="font-semibold text-stone-900">“{deleteTarget.name}”</span>?
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-stone-200 bg-[#faf7f2] p-3 text-[12px] space-y-1.5 text-stone-600">
                <div className="flex justify-between">
                  <span className="text-stone-500">Category:</span>
                  <span className="font-medium text-stone-900">{titleCase(deleteTarget.category)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Variants / SKUs:</span>
                  <span className="font-medium text-stone-900">{deleteTarget.variants.length} SKUs</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Stock on hand:</span>
                  <span className="font-medium text-stone-900">{deleteTarget.stockAvailable} units</span>
                </div>
              </div>

              <div className="mt-4 space-y-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-400">
                  Select Action
                </p>

                <label
                  className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition ${
                    deleteType === "permanent"
                      ? "border-rose-400 bg-rose-50/60 ring-1 ring-rose-300"
                      : "border-stone-200 hover:bg-stone-50/70"
                  }`}
                >
                  <input
                    type="radio"
                    name="singleDeleteChoice"
                    value="permanent"
                    checked={deleteType === "permanent"}
                    onChange={() => setDeleteType("permanent")}
                    className="mt-0.5 text-rose-600 focus:ring-rose-500"
                  />
                  <div className="text-[12px]">
                    <p className="font-semibold text-stone-900">Delete Permanently (Hard Delete)</p>
                    <p className="text-stone-500 mt-0.5">
                      Completely removes this product and all variant SKUs from MongoDB.
                    </p>
                  </div>
                </label>

                <label
                  className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition ${
                    deleteType === "archive"
                      ? "border-amber-400 bg-amber-50/60 ring-1 ring-amber-300"
                      : "border-stone-200 hover:bg-stone-50/70"
                  }`}
                >
                  <input
                    type="radio"
                    name="singleDeleteChoice"
                    value="archive"
                    checked={deleteType === "archive"}
                    onChange={() => setDeleteType("archive")}
                    className="mt-0.5 text-amber-600 focus:ring-amber-500"
                  />
                  <div className="text-[12px]">
                    <p className="font-semibold text-stone-900">Archive Product (Soft Delete)</p>
                    <p className="text-stone-500 mt-0.5">
                      Hides from the storefront immediately while preserving order history and reports.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-[#f0ebe3] bg-[#faf7f2]/90 px-5 py-3.5 sm:px-6">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
                className="rounded-xl px-4 py-2 text-[12.5px] font-medium text-stone-600 hover:bg-stone-200/60 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={() => void executeDelete()}
                className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-[12.5px] font-semibold text-white shadow-sm transition disabled:opacity-50 ${
                  deleteType === "permanent"
                    ? "bg-rose-600 hover:bg-rose-700"
                    : "bg-amber-600 hover:bg-amber-700"
                }`}
              >
                {deleting && (
                  <svg className="animate-spin h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
                {deleting
                  ? "Processing…"
                  : deleteType === "permanent"
                    ? "Delete Permanently"
                    : "Archive Product"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {bulkModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="bulk-delete-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-[#ebe6de] bg-white shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="p-5 sm:p-6">
              <div className="flex items-start gap-3.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 ring-1 ring-rose-200">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    <line x1="10" y1="11" x2="10" y2="17" />
                    <line x1="14" y1="11" x2="14" y2="17" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 id="bulk-delete-dialog-title" className="font-serif text-[18px] font-semibold text-[#14100f]">
                    Bulk Delete Products
                  </h3>
                  <p className="mt-1 text-[13px] text-stone-600">
                    You have selected <span className="font-semibold text-stone-900">{selectedIds.size} products</span>. What would you like to do?
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-2.5">
                <label
                  className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition ${
                    bulkDeleteType === "permanent"
                      ? "border-rose-400 bg-rose-50/60 ring-1 ring-rose-300"
                      : "border-stone-200 hover:bg-stone-50/70"
                  }`}
                >
                  <input
                    type="radio"
                    name="bulkDeleteChoice"
                    value="permanent"
                    checked={bulkDeleteType === "permanent"}
                    onChange={() => setBulkDeleteType("permanent")}
                    className="mt-0.5 text-rose-600 focus:ring-rose-500"
                  />
                  <div className="text-[12px]">
                    <p className="font-semibold text-stone-900">Delete Permanently ({selectedIds.size} Products)</p>
                    <p className="text-stone-500 mt-0.5">
                      Completely purges these {selectedIds.size} products and all their variant SKUs from MongoDB.
                    </p>
                  </div>
                </label>

                <label
                  className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition ${
                    bulkDeleteType === "archive"
                      ? "border-amber-400 bg-amber-50/60 ring-1 ring-amber-300"
                      : "border-stone-200 hover:bg-stone-50/70"
                  }`}
                >
                  <input
                    type="radio"
                    name="bulkDeleteChoice"
                    value="archive"
                    checked={bulkDeleteType === "archive"}
                    onChange={() => setBulkDeleteType("archive")}
                    className="mt-0.5 text-amber-600 focus:ring-amber-500"
                  />
                  <div className="text-[12px]">
                    <p className="font-semibold text-stone-900">Archive ({selectedIds.size} Products)</p>
                    <p className="text-stone-500 mt-0.5">
                      Hides all {selectedIds.size} products from the storefront while keeping previous order references safe.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-[#f0ebe3] bg-[#faf7f2]/90 px-5 py-3.5 sm:px-6">
              <button
                type="button"
                disabled={bulkDeleting}
                onClick={() => setBulkModalOpen(false)}
                className="rounded-xl px-4 py-2 text-[12.5px] font-medium text-stone-600 hover:bg-stone-200/60 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={bulkDeleting}
                onClick={() => void executeBulkDelete()}
                className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-[12.5px] font-semibold text-white shadow-sm transition disabled:opacity-50 ${
                  bulkDeleteType === "permanent"
                    ? "bg-rose-600 hover:bg-rose-700"
                    : "bg-amber-600 hover:bg-amber-700"
                }`}
              >
                {bulkDeleting && (
                  <svg className="animate-spin h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
                {bulkDeleting
                  ? "Processing…"
                  : bulkDeleteType === "permanent"
                    ? `Delete ${selectedIds.size} Products`
                    : `Archive ${selectedIds.size} Products`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
