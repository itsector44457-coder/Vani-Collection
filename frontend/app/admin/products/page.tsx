"use client";

import { useMemo, useState } from "react";
import { Badge, Card } from "@/lib/admin-ui";

/* 🔌 API: GET /api/admin/products */
const PRODUCTS = [
  { id: "VC-1042", name: "Gulab Bagh Handblock Mul Cotton", category: "Sarees", price: 2499, stock: 42, status: "Active", sold: 218 },
  { id: "VC-1038", name: "Rani Bagru Silk Saree", category: "Sarees", price: 4299, stock: 18, status: "Active", sold: 184 },
  { id: "VC-1015", name: "Ivory Chikankari Anarkali", category: "Anarkalis", price: 3799, stock: 6, status: "Low stock", sold: 156 },
  { id: "VC-1002", name: "Indigo Dabu Cotton Kurta Set", category: "Kurta Sets", price: 1899, stock: 63, status: "Active", sold: 141 },
  { id: "VC-0998", name: "Banarasi Katan Silk Lehenga", category: "Lehengas", price: 12999, stock: 0, status: "Out of stock", sold: 98 },
  { id: "VC-0972", name: "Madhubani Handpainted Dupatta", category: "Dupattas", price: 1299, stock: 88, status: "Active", sold: 82 },
  { id: "VC-0954", name: "Chanderi Zari Kurta", category: "Kurta Sets", price: 2199, stock: 24, status: "Active", sold: 76 },
];

const CATS = ["All", "Sarees", "Lehengas", "Anarkalis", "Kurta Sets", "Dupattas"];

export default function ProductsPage() {
  const [cat, setCat] = useState("All");
  const [q, setQ] = useState("");

  const filtered = useMemo(
    () =>
      PRODUCTS.filter(
        (p) =>
          (cat === "All" || p.category === cat) &&
          (q === "" || p.name.toLowerCase().includes(q.toLowerCase()) || p.id.toLowerCase().includes(q.toLowerCase()))
      ),
    [cat, q]
  );

  const tone = (s: string) =>
    s === "Active" ? "success" : s === "Low stock" ? "warning" : "danger";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-400">
            Catalogue
          </p>
          <h1 className="mt-1 font-serif text-[26px] font-semibold tracking-tight">
            Products
          </h1>
          <p className="mt-1 text-[13px] text-stone-500">
            {PRODUCTS.length} total · {PRODUCTS.filter((p) => p.stock < 10).length} need restocking
          </p>
        </div>
        <button className="rounded-xl bg-[#881337] px-4 py-2 text-[12.5px] font-semibold text-white transition hover:bg-[#6b0f2b]">
          + Add product
        </button>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-[#ebe6de] bg-white px-3 py-2 focus-within:border-[#dfc28c] sm:max-w-xs">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-stone-400">
              <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
            </svg>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name or SKU…"
              className="w-full bg-transparent text-[13px] outline-none placeholder:text-stone-400"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {CATS.map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={`rounded-full px-3 py-1.5 text-[12px] font-medium transition ${
                  cat === c
                    ? "bg-[#14100f] text-white"
                    : "bg-[#faf7f2] text-stone-600 hover:bg-[#f0ebe3]"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Table */}
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
              {filtered.map((p) => (
                <tr key={p.id} className="group transition hover:bg-[#faf7f2]/60">
                  <td className="py-3.5 pr-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#faf7f2] to-[#f0ebe3] text-[12px] font-bold text-[#881337] ring-1 ring-[#ebe6de]">
                        {p.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold">{p.name}</p>
                        <p className="text-[11px] text-stone-500">{p.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 pr-4 text-[12.5px] text-stone-600">{p.category}</td>
                  <td className="py-3.5 pr-4 text-[13px] font-semibold">₹{p.price.toLocaleString("en-IN")}</td>
                  <td className="py-3.5 pr-4">
                    <span className={`text-[12.5px] font-medium ${p.stock === 0 ? "text-rose-600" : p.stock < 10 ? "text-amber-600" : "text-stone-700"}`}>
                      {p.stock}
                    </span>
                  </td>
                  <td className="py-3.5 pr-4 text-[12.5px] text-stone-600">{p.sold}</td>
                  <td className="py-3.5 pr-4">
                    <Badge tone={tone(p.status) as any} dot>{p.status}</Badge>
                  </td>
                  <td className="py-3.5 text-right">
                    <div className="flex justify-end gap-1 opacity-0 transition group-hover:opacity-100">
                      <button className="rounded-lg px-2.5 py-1.5 text-[11.5px] font-medium text-stone-600 hover:bg-[#f0ebe3]">
                        Edit
                      </button>
                      <button className="rounded-lg px-2.5 py-1.5 text-[11.5px] font-medium text-rose-600 hover:bg-rose-50">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="mt-4 flex items-center justify-between border-t border-[#f0ebe3] pt-4 text-[12px] text-stone-500">
          <span>Showing {filtered.length} of {PRODUCTS.length}</span>
          <div className="flex gap-1">
            <button className="rounded-lg border border-[#ebe6de] px-3 py-1.5 hover:bg-[#faf7f2]">Prev</button>
            <button className="rounded-lg bg-[#14100f] px-3 py-1.5 text-white">1</button>
            <button className="rounded-lg border border-[#ebe6de] px-3 py-1.5 hover:bg-[#faf7f2]">2</button>
            <button className="rounded-lg border border-[#ebe6de] px-3 py-1.5 hover:bg-[#faf7f2]">Next</button>
          </div>
        </div>
      </Card>
    </div>
  );
}