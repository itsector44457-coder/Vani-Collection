"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge, Card, PageHeading, Alert, FilterTabs, Modal, Field, TextInput, Textarea, Select, ButtonPrimary, ButtonGhost, ButtonDanger } from "@/lib/admin-ui";
import AdminDataBadge from "@/components/admin/AdminDataBadge";
import { api, apiFetch, ApiError, type AdminReel, type AdminCatalogueProduct, type Paginated, type ReelInput } from "@/lib/api-client";
import { useApiResource } from "@/lib/use-api";
import { useAdminSession } from "@/lib/use-admin-session";

const DEMO_REELS: Paginated<AdminReel> = {
  data: [
    {
      _id: "r1",
      title: "Gulab Bagh Summer Collection",
      description: "Experience the elegance of our signature handblock print collection",
      videoUrl: "/videos/hero-video.mp4",
      thumbnailUrl: "/images/products/gulab-bagh-thumb.jpg",
      productId: { 
        _id: "p1", 
        name: "Gulab Bagh Handblock Mul Cotton", 
        slug: "gulab-bagh",
        images: [{ url: "/images/products/gulab-bagh.jpg", alt: "Gulab Bagh Anarkali" }]
      },
      position: 1,
      isActive: true,
      createdBy: { _id: "u1", email: "admin@vanicollection.in", firstName: "Admin", lastName: "User" },
      updatedBy: { _id: "u1", email: "admin@vanicollection.in", firstName: "Admin", lastName: "User" },
      createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
      updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
    {
      _id: "r2", 
      title: "Rani Bagru Silk Elegance",
      description: "Showcase our luxurious silk saree collection",
      videoUrl: "/videos/hero-video.mp4",
      thumbnailUrl: "/images/products/rani-bagru-thumb.jpg",
      productId: {
        _id: "p2",
        name: "Rani Bagru Silk Saree",
        slug: "rani-bagru",
        images: [{ url: "/images/products/rani-bagru.jpg", alt: "Rani Bagru Saree" }]
      },
      position: 2,
      isActive: true,
      createdBy: { _id: "u1", email: "admin@vanicollection.in", firstName: "Admin", lastName: "User" },
      updatedBy: { _id: "u1", email: "admin@vanicollection.in", firstName: "Admin", lastName: "User" },
      createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
      updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    },
    {
      _id: "r3",
      title: "Chikankari Heritage",
      description: "Traditional embroidery meets modern styling",
      videoUrl: "/videos/hero-video.mp4",
      thumbnailUrl: "/images/products/ivory-chikankari-thumb.jpg",
      productId: {
        _id: "p3",
        name: "Ivory Chikankari Anarkali",
        slug: "ivory-chikankari",
        images: [{ url: "/images/products/ivory-chikankari.jpg", alt: "Ivory Chikankari Anarkali" }]
      },
      position: 3,
      isActive: false,
      createdBy: { _id: "u1", email: "admin@vanicollection.in", firstName: "Admin", lastName: "User" },
      updatedBy: { _id: "u1", email: "admin@vanicollection.in", firstName: "Admin", lastName: "User" },
      createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    },
  ],
  meta: { total: 3 },
};

const DEMO_PRODUCTS: Paginated<AdminCatalogueProduct> = {
  data: [
    { _id: "p1", name: "Gulab Bagh Handblock Mul Cotton", slug: "gulab-bagh", category: "anarkalis", status: "active", variants: [{ sku: "VC-1042-M", size: "M", price: 2499, mrp: 3499, available: 42, onHand: 42, reorderLevel: 3, low: false }], stockAvailable: 42, lowStockSkus: 0, unitsSold: 218, revenue: 544000, updatedAt: new Date().toISOString() },
    { _id: "p2", name: "Rani Bagru Silk Saree", slug: "rani-bagru", category: "sarees", status: "active", variants: [{ sku: "VC-1038-M", size: "M", price: 4299, mrp: 5499, available: 18, onHand: 18, reorderLevel: 3, low: false }], stockAvailable: 18, lowStockSkus: 0, unitsSold: 184, revenue: 791000, updatedAt: new Date().toISOString() },
    { _id: "p3", name: "Ivory Chikankari Anarkali", slug: "ivory-chikankari", category: "anarkalis", status: "active", variants: [{ sku: "VC-1015-M", size: "M", price: 3799, mrp: 4599, available: 6, onHand: 6, reorderLevel: 8, low: true }], stockAvailable: 6, lowStockSkus: 1, unitsSold: 156, revenue: 592000, updatedAt: new Date().toISOString() },
    { _id: "p4", name: "Indigo Dabu Cotton Kurta Set", slug: "indigo-dabu", category: "kurta-sets", status: "active", variants: [{ sku: "VC-1002-M", size: "M", price: 1899, mrp: 2499, available: 63, onHand: 63, reorderLevel: 3, low: false }], stockAvailable: 63, lowStockSkus: 0, unitsSold: 141, revenue: 267000, updatedAt: new Date().toISOString() },
  ],
  meta: { total: 4 },
};

const STATUS_FILTERS = ["All", "Active", "Inactive"] as const;

export default function ReelsView() {
  const session = useAdminSession();
  const [statusFilter, setStatusFilter] = useState<typeof STATUS_FILTERS[number]>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Check if user has required role for reels management
  const hasReelsAccess = Boolean(
    session.user?.roles?.some(role => 
      ['catalog_manager', 'admin', 'super_admin'].includes(role)
    )
  );

  // Show access denied message if user lacks required role
  if (session.authenticated && !hasReelsAccess) {
    return (
      <div className="space-y-5">
        <PageHeading
          eyebrow="Content"
          title="Reels"
          subtitle="Access restricted"
        />
        <Alert tone="warning">
          <strong>Access denied.</strong> Reels management requires catalog_manager, admin, or super_admin role.
        </Alert>
      </div>
    );
  }

  // Create/Edit modal state
  const [showModal, setShowModal] = useState(false);
  const [editingReel, setEditingReel] = useState<AdminReel | null>(null);
  const [formData, setFormData] = useState<ReelInput>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // API resources
  const reels = useApiResource<Paginated<AdminReel>>((signal) => api.reels({ limit: 100 }, signal), DEMO_REELS);
  const products = useApiResource<Paginated<AdminCatalogueProduct>>((signal) => api.catalogue({ limit: 100 }, signal), DEMO_PRODUCTS);

  const reelsList = reels.data.data;
  const productsList = products.data.data;

  // Filtered reels
  const filtered = useMemo(
    () =>
      reelsList.filter((reel) => {
        const matchesStatus = statusFilter === "All" || 
          (statusFilter === "Active" && reel.isActive) ||
          (statusFilter === "Inactive" && !reel.isActive);
        
        const matchesSearch = searchQuery === "" ||
          reel.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (typeof reel.productId !== "string" && reel.productId?.name?.toLowerCase().includes(searchQuery.toLowerCase()));
        
        return matchesStatus && matchesSearch;
      }),
    [reelsList, statusFilter, searchQuery]
  );

  // Status counts for filter tabs
  const statusCounts = useMemo(() => {
    const counts = { All: reelsList.length, Active: 0, Inactive: 0 };
    reelsList.forEach((reel) => {
      if (reel.isActive) counts.Active++;
      else counts.Inactive++;
    });
    return counts;
  }, [reelsList]);

  const productName = (reel: AdminReel) => {
    if (typeof reel.productId === "string") return "Product not found";
    return reel.productId?.name || "Product not found";
  };

  const productImage = (reel: AdminReel) => {
    if (typeof reel.productId === "string") return null;
    return reel.productId?.images?.[0]?.url || null;
  };

  const statusBadge = (reel: AdminReel) => {
    if (reel.isActive) return <Badge tone="success" dot>Active</Badge>;
    return <Badge tone="neutral" dot>Inactive</Badge>;
  };

  const openCreateModal = () => {
    setEditingReel(null);
    setFormData({ isActive: true, position: 0 });
    setFormErrors({});
    setShowModal(true);
  };

  const openEditModal = (reel: AdminReel) => {
    setEditingReel(reel);
    setFormData({
      title: reel.title,
      description: reel.description || "",
      videoUrl: reel.videoUrl,
      thumbnailUrl: reel.thumbnailUrl || "",
      productId: typeof reel.productId === "string" ? reel.productId : reel.productId._id,
      position: reel.position,
      isActive: reel.isActive,
    });
    setFormErrors({});
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingReel(null);
    setFormData({});
    setFormErrors({});
    setSubmitting(false);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!formData.title?.trim()) errors.title = "Title is required";
    if (!formData.videoUrl?.trim()) errors.videoUrl = "Video URL is required";
    if (formData.videoUrl && !/^https?:\/\/.+/.test(formData.videoUrl)) {
      errors.videoUrl = "Please enter a valid URL";
    }
    if (formData.thumbnailUrl && !/^https?:\/\/.+/.test(formData.thumbnailUrl)) {
      errors.thumbnailUrl = "Please enter a valid URL";
    }
    if (!formData.productId) errors.productId = "Product is required";
    if (formData.position !== undefined && formData.position < 0) {
      errors.position = "Position must be 0 or greater";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setSubmitting(true);
    setError(null);

    try {
      if (editingReel) {
        await api.updateReel(editingReel._id, formData);
      } else {
        await api.createReel(formData);
      }
      reels.refresh();
      closeModal();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Could not save the reel");
    } finally {
      setSubmitting(false);
    }
  };

  const deleteReel = async (reel: AdminReel) => {
    if (!window.confirm(`Delete "${reel.title}"? This will set it as inactive.`)) return;
    
    setBusyId(reel._id);
    setError(null);
    
    try {
      await api.deleteReel(reel._id);
      reels.refresh();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Could not delete the reel");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeading
        eyebrow="Content"
        title="Reels"
        subtitle={`${reelsList.length} reels · ${statusCounts.Active} active · ${statusCounts.Inactive} inactive`}
        action={
          <div className="flex items-center gap-2">
            <AdminDataBadge resource={reels} />
            <ButtonPrimary onClick={openCreateModal}>
              + Add reel
            </ButtonPrimary>
          </div>
        }
      />

      {error && <Alert tone="danger">{error}</Alert>}

      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-[#ebe6de] bg-white px-3 py-2 focus-within:border-[#dfc28c] sm:max-w-xs">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-stone-400">
              <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
            </svg>
            <label htmlFor="reel-search" className="sr-only">Search reels</label>
            <input
              id="reel-search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by title or product…"
              className="w-full bg-transparent text-[13px] outline-none placeholder:text-stone-400"
            />
          </div>

          <FilterTabs
            options={STATUS_FILTERS}
            value={statusFilter}
            onChange={setStatusFilter}
            counts={statusCounts}
          />
        </div>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#f0ebe3] text-[10.5px] font-semibold uppercase tracking-[0.12em] text-stone-400">
                <th className="pb-3 pr-4">Reel</th>
                <th className="pb-3 pr-4">Product</th>
                <th className="pb-3 pr-4">Position</th>
                <th className="pb-3 pr-4">Status</th>
                <th className="pb-3 pr-4">Created</th>
                <th className="pb-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0ebe3]">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-[12.5px] text-stone-500">
                    No reels match this filter.
                  </td>
                </tr>
              )}
              {filtered.map((reel) => {
                const productImg = productImage(reel);
                return (
                  <tr key={reel._id} className="group transition hover:bg-[#faf7f2]/60">
                    <td className="py-3.5 pr-4">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-[#faf7f2] to-[#f0ebe3] ring-1 ring-[#ebe6de]">
                          {reel.thumbnailUrl || productImg ? (
                            <img
                              src={reel.thumbnailUrl || productImg || ""}
                              alt={reel.title}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[#881337]">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                <rect x="3" y="3" width="18" height="18" rx="3.5" />
                                <polygon points="10,8 16,12 10,16" fill="currentColor" stroke="none" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-semibold">{reel.title}</p>
                          {reel.description && (
                            <p className="truncate text-[11px] text-stone-500">{reel.description}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 pr-4">
                      <div className="flex items-center gap-2">
                        {productImg && (
                          <img
                            src={productImg}
                            alt=""
                            className="h-6 w-6 rounded object-cover ring-1 ring-[#ebe6de]"
                          />
                        )}
                        <span className="text-[12.5px] text-stone-600">{productName(reel)}</span>
                      </div>
                    </td>
                    <td className="py-3.5 pr-4 text-[12.5px] text-stone-600">{reel.position}</td>
                    <td className="py-3.5 pr-4">{statusBadge(reel)}</td>
                    <td className="py-3.5 pr-4 text-[12.5px] text-stone-600">
                      {new Date(reel.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    <td className="py-3.5 text-right">
                      <div className="flex justify-end gap-1 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
                        <Link
                          href={`/reels#${reel._id}`}
                          className="rounded-lg px-2.5 py-1.5 text-[11.5px] font-medium text-stone-600 hover:bg-[#f0ebe3]"
                        >
                          View
                        </Link>
                        <button
                          onClick={() => openEditModal(reel)}
                          className="rounded-lg px-2.5 py-1.5 text-[11.5px] font-medium text-stone-600 hover:bg-[#f0ebe3]"
                        >
                          Edit
                        </button>
                        {reels.source === "live" && (
                          <button
                            disabled={busyId === reel._id}
                            onClick={() => void deleteReel(reel)}
                            className="rounded-lg px-2.5 py-1.5 text-[11.5px] font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                          >
                            {busyId === reel._id ? "…" : "Delete"}
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
          <span>Showing {filtered.length} of {reelsList.length}</span>
          <span>{reels.source === "live" ? "Live data from the backend" : "Demo reels"}</span>
        </div>
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        open={showModal}
        onClose={closeModal}
        title={editingReel ? "Edit reel" : "Create reel"}
        description={editingReel ? "Update reel information and settings" : "Add a new reel to your content collection"}
        footer={
          <>
            <ButtonGhost onClick={closeModal} disabled={submitting}>
              Cancel
            </ButtonGhost>
            <ButtonPrimary onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Saving…" : editingReel ? "Update reel" : "Create reel"}
            </ButtonPrimary>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Title" htmlFor="reel-title">
            <TextInput
              id="reel-title"
              value={formData.title || ""}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter reel title"
              required
            />
            {formErrors.title && <span className="text-[11px] text-rose-600">{formErrors.title}</span>}
          </Field>

          <Field label="Description" htmlFor="reel-description" hint="Optional description for the reel">
            <Textarea
              id="reel-description"
              value={formData.description || ""}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter reel description"
              rows={3}
            />
            {formErrors.description && <span className="text-[11px] text-rose-600">{formErrors.description}</span>}
          </Field>

          <Field label="Video URL" htmlFor="reel-video">
            <TextInput
              id="reel-video"
              type="url"
              value={formData.videoUrl || ""}
              onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
              placeholder="https://example.com/video.mp4"
              required
            />
            {formErrors.videoUrl && <span className="text-[11px] text-rose-600">{formErrors.videoUrl}</span>}
          </Field>

          <Field label="Thumbnail URL" htmlFor="reel-thumbnail" hint="Optional custom thumbnail image">
            <TextInput
              id="reel-thumbnail"
              type="url"
              value={formData.thumbnailUrl || ""}
              onChange={(e) => setFormData({ ...formData, thumbnailUrl: e.target.value })}
              placeholder="https://example.com/thumbnail.jpg"
            />
            {formErrors.thumbnailUrl && <span className="text-[11px] text-rose-600">{formErrors.thumbnailUrl}</span>}
          </Field>

          <Field label="Linked Product" htmlFor="reel-product">
            <Select
              id="reel-product"
              value={formData.productId || ""}
              onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
              required
            >
              <option value="">Select a product</option>
              {productsList.map((product) => (
                <option key={product._id} value={product._id}>
                  {product.name}
                </option>
              ))}
            </Select>
            {formErrors.productId && <span className="text-[11px] text-rose-600">{formErrors.productId}</span>}
          </Field>

          <Field label="Position" htmlFor="reel-position" hint="Display order (0 = first)">
            <TextInput
              id="reel-position"
              type="number"
              min="0"
              value={formData.position ?? ""}
              onChange={(e) => setFormData({ ...formData, position: parseInt(e.target.value) || 0 })}
              placeholder="0"
            />
            {formErrors.position && <span className="text-[11px] text-rose-600">{formErrors.position}</span>}
          </Field>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="reel-active"
              checked={formData.isActive ?? false}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="h-4 w-4 rounded border-[#ebe6de] accent-[#881337]"
            />
            <label htmlFor="reel-active" className="text-[12.5px] font-medium text-stone-700">
              Active (visible to customers)
            </label>
          </div>
        </div>
      </Modal>
    </div>
  );
}