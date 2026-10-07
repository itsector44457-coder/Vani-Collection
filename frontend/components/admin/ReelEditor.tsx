"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { api, ApiError, isApiConfigured, type AdminCatalogueProduct } from "@/lib/api-client";
import {
  createReel,
  formatDuration,
  formatMegabytes,
  updateReel,
  uploadToCloudinary,
  type Reel,
  type ReelDraft,
} from "@/lib/reels-api";

interface Props {
  open: boolean;
  /** `null` creates a new reel; passing one edits it. */
  reel: Reel | null;
  onClose: () => void;
  onSaved: (reel: Reel) => void;
}

const inputClass =
  "w-full rounded-xl border border-[#ebe6de] bg-white px-3.5 py-2.5 text-[13px] text-[#14100f] outline-none transition placeholder:text-stone-400 focus:border-[#dfc28c] focus:ring-2 focus:ring-[#dfc28c]/25";
const labelClass = "mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500";

/**
 * The form is a keyed child rather than a `useEffect`-hydrated one, so opening a different reel
 * gives genuinely fresh state instead of a render that has to overwrite the previous reel's values.
 */
export default function ReelEditor({ open, reel, onClose, onSaved }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-[#14100f]/60 p-4 backdrop-blur-sm sm:items-center"
          onClick={onClose}
        >
          <motion.div
            key={reel?._id ?? "new"}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-4xl"
          >
            <ReelForm reel={reel} onClose={onClose} onSaved={onSaved} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ------------------------------------------------------------------ */
/*  Form                                                              */
/* ------------------------------------------------------------------ */

interface Media {
  videoUrl: string;
  videoPublicId?: string;
  posterUrl?: string;
  durationSec?: number;
  width?: number;
  height?: number;
  bytes?: number;
  format?: string;
}

function ReelForm({ reel, onClose, onSaved }: { reel: Reel | null; onClose: () => void; onSaved: (reel: Reel) => void }) {
  const configured = isApiConfigured();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isEdit = Boolean(reel?._id);

  const [media, setMedia] = useState<Media>(() =>
    reel
      ? {
          videoUrl: reel.videoUrl,
          videoPublicId: reel.videoPublicId,
          posterUrl: reel.posterUrl,
          durationSec: reel.durationSec,
          width: reel.width,
          height: reel.height,
          bytes: reel.bytes,
          format: reel.format,
        }
      : { videoUrl: "" }
  );
  const [title, setTitle] = useState(reel?.title ?? "");
  const [caption, setCaption] = useState(reel?.caption ?? "");
  const [tag, setTag] = useState(reel?.tag ?? "");
  const [productId, setProductId] = useState(reel?.productId ?? "");
  const [status, setStatus] = useState<"draft" | "published">(reel?.status ?? "published");
  const [uploading, setUploading] = useState(false);
  const [percent, setPercent] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [products, setProducts] = useState<AdminCatalogueProduct[]>([]);

  /* The product picker is a real catalogue read; it is optional, so a failure just leaves it empty. */
  useEffect(() => {
    if (!configured) return;
    const controller = new AbortController();
    api
      .catalogue({ limit: 100 }, controller.signal)
      .then((response) => setProducts(response.data.filter((product) => product.status !== "archived")))
      .catch(() => setProducts([]));
    return () => controller.abort();
  }, [configured]);

  const selectedProduct = useMemo(() => products.find((product) => product._id === productId), [products, productId]);
  const cheapestPrice = selectedProduct?.variants?.length
    ? Math.min(...selectedProduct.variants.map((variant) => variant.price))
    : 0;

  const runUpload = async (file: File) => {
    setError(null);
    if (!configured) {
      setError("Set NEXT_PUBLIC_API_URL to upload to Cloudinary.");
      return;
    }
    if (!file.type.startsWith("video/")) {
      setError("That is not a video file. Upload an MP4, MOV or WebM clip.");
      return;
    }
    setUploading(true);
    setPercent(0);
    try {
      const result = await uploadToCloudinary(file, {
        type: "video",
        folder: "reels",
        onProgress: (value) => setPercent(value),
      });
      setMedia({
        videoUrl: result.url,
        videoPublicId: result.publicId,
        posterUrl: result.posterUrl,
        durationSec: result.durationSec,
        width: result.width,
        height: result.height,
        bytes: result.bytes,
        format: result.format,
      });
      if (!title) setTitle(file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").slice(0, 80));
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "The upload did not finish — please try again");
    } finally {
      setUploading(false);
    }
  };

  const onDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void runUpload(file);
  };

  const save = async () => {
    setError(null);
    if (!media.videoUrl) {
      setError("Add a video first — upload a clip or paste a hosted URL.");
      return;
    }
    if (title.trim().length < 2) {
      setError("Give the reel a title of at least 2 characters.");
      return;
    }
    setSaving(true);
    const draft: ReelDraft = {
      title: title.trim(),
      caption: caption.trim() || undefined,
      tag: tag.trim() || undefined,
      videoUrl: media.videoUrl,
      videoPublicId: media.videoPublicId,
      posterUrl: media.posterUrl,
      provider: media.videoPublicId ? "cloudinary" : "external",
      durationSec: media.durationSec,
      width: media.width,
      height: media.height,
      bytes: media.bytes,
      format: media.format,
      productId: productId || null,
      status,
    };
    try {
      const saved = reel?._id ? await updateReel(reel._id, draft) : await createReel(draft);
      onSaved(saved);
      onClose();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Could not save the reel");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-3xl border border-[#ebe6de] bg-[#faf7f2] shadow-2xl">
      {/* header */}
      <div className="flex items-center justify-between border-b border-[#ebe6de] bg-white px-6 py-4">
        <div className="min-w-0">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-stone-400">
            {isEdit ? "Edit reel" : "New reel"}
          </p>
          <h2 className="mt-0.5 truncate font-serif text-[19px] font-semibold tracking-tight text-[#14100f]">
            {isEdit ? title || "Untitled reel" : "Upload a shoppable reel"}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#ebe6de] text-stone-500 transition hover:border-[#dfc28c] hover:text-[#881337]"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_260px]">
        {/* ---------------- form ---------------- */}
        <div className="min-w-0 space-y-5">
          {/* uploader */}
          <div>
            <span className={labelClass}>Reel video</span>
            <div
              onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className={`rounded-2xl border-2 border-dashed p-5 text-center transition ${
                dragging ? "border-[#dfc28c] bg-[#dfc28c]/10" : "border-[#e2dbd0] bg-white"
              }`}
            >
              {uploading ? (
                <div className="py-3">
                  <p className="text-[12.5px] font-semibold text-[#14100f]">Uploading to Cloudinary… {percent}%</p>
                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[#ebe6de]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#c9a56b] to-[#881337] transition-[width] duration-200"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <p className="mt-2 text-[11px] text-stone-400">Streaming straight from your browser — keep this tab open.</p>
                </div>
              ) : media.videoUrl ? (
                <div className="space-y-2">
                  <p className="flex items-center justify-center gap-1.5 text-[12.5px] font-semibold text-emerald-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Video ready
                  </p>
                  <p className="break-all text-[11px] text-stone-400">{media.videoUrl}</p>
                  {media.bytes ? (
                    <p className="text-[11px] text-stone-500">
                      {formatMegabytes(media.bytes)}
                      {media.durationSec ? ` · ${formatDuration(media.durationSec)}` : ""}
                      {media.width ? ` · ${media.width}×${media.height}` : ""}
                    </p>
                  ) : null}
                  <div className="flex flex-wrap justify-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="min-h-9 rounded-full border border-[#ebe6de] bg-white px-3.5 text-[11.5px] font-semibold text-stone-600 transition hover:border-[#dfc28c] hover:text-[#881337]"
                    >
                      Replace
                    </button>
                    <button
                      type="button"
                      onClick={() => setMedia({ videoUrl: "" })}
                      className="min-h-9 rounded-full border border-rose-200 bg-rose-50 px-3.5 text-[11.5px] font-semibold text-rose-700 transition hover:bg-rose-100"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 py-2">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="mx-auto text-[#c9a56b]">
                    <path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5" /><path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
                  </svg>
                  <p className="text-[13px] font-semibold text-[#14100f]">Drop a video here</p>
                  <p className="text-[11.5px] text-stone-500">MP4, MOV or WebM · 9:16 portrait works best · up to 300 MB</p>
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="min-h-9 rounded-full bg-[#881337] px-4 text-[11.5px] font-semibold text-white transition hover:bg-[#6b0f2b]"
                    >
                      Choose file
                    </button>
                    <span className="text-[11px] text-stone-400">or paste a URL below</span>
                  </div>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void runUpload(file);
                event.target.value = "";
              }}
            />
            <label htmlFor="reel-video-url" className="sr-only">Video URL</label>
            <input
              id="reel-video-url"
              value={media.videoUrl}
              onChange={(event) => setMedia({ videoUrl: event.target.value.trim() })}
              placeholder="https://res.cloudinary.com/…/reels/clip.mp4"
              className={`${inputClass} mt-2`}
            />
          </div>

          <div>
            <label htmlFor="reel-title" className={labelClass}>Title</label>
            <input
              id="reel-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={160}
              placeholder="Pure Mul Cotton — Featherlight for Summer"
              className={inputClass}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="reel-tag" className={labelClass}>Tag / pill</label>
              <input id="reel-tag" value={tag} onChange={(event) => setTag(event.target.value)} maxLength={60} placeholder="Bagru Handblock" className={inputClass} />
            </div>
            <div>
              <label htmlFor="reel-product" className={labelClass}>Linked product</label>
              <select id="reel-product" value={productId} onChange={(event) => setProductId(event.target.value)} className={inputClass}>
                <option value="">No product (lookbook only)</option>
                {products.map((product) => (
                  <option key={product._id} value={product._id}>{product.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="reel-caption" className={labelClass}>Caption</label>
            <textarea
              id="reel-caption"
              rows={3}
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
              maxLength={500}
              placeholder="100-count mul cotton, handblock printed in Bagru."
              className={`${inputClass} resize-none`}
            />
            <p className="mt-1 text-right text-[10.5px] text-stone-400">{caption.length}/500</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className={labelClass}>Visibility</span>
            {(["published", "draft"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setStatus(option)}
                aria-pressed={status === option}
                className={`min-h-9 rounded-full px-4 text-[12px] font-semibold capitalize transition ${
                  status === option ? "bg-[#14100f] text-white" : "bg-white text-stone-600 ring-1 ring-[#ebe6de] hover:bg-[#f0ebe3]"
                }`}
              >
                {option}
              </button>
            ))}
          </div>

          {error && (
            <p role="alert" className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-[12.5px] text-rose-700 ring-1 ring-rose-200">
              {error}
            </p>
          )}
          {!configured && (
            <p className="rounded-xl bg-amber-50 px-3.5 py-2.5 text-[12.5px] text-amber-800 ring-1 ring-amber-200">
              NEXT_PUBLIC_API_URL is not set — you can still paste a hosted video URL, but uploads and saving need the API.
            </p>
          )}
        </div>

        {/* ---------------- preview ---------------- */}
        <div className="min-w-0 space-y-3">
          <p className={labelClass}>Preview</p>
          <div className="relative aspect-[9/16] w-full overflow-hidden rounded-2xl bg-[#14100f] ring-1 ring-[#ebe6de]">
            {media.videoUrl ? (
              <video src={media.videoUrl} poster={media.posterUrl} controls muted loop playsInline className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white/25">
                  <rect x="3" y="3" width="18" height="18" rx="3.5" />
                  <path d="m11 12.5 4.5 2.6-4.5 2.6z" fill="currentColor" stroke="none" />
                </svg>
                <p className="px-6 text-[11.5px] text-white/35">Your reel preview appears here</p>
              </div>
            )}

            {/* overlay mock */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-3">
              {tag && (
                <span className="mb-1 inline-block rounded-full bg-[#881337] px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-white">
                  {tag}
                </span>
              )}
              <p className="line-clamp-2 font-serif text-[12.5px] font-semibold leading-snug text-white">{title || "Reel title"}</p>
              {selectedProduct && (
                <div className="mt-2 flex items-center gap-2 rounded-xl bg-white/10 p-1.5 backdrop-blur-sm">
                  {selectedProduct.images?.[0]?.url ? (
                    // eslint-disable-next-line @next/next/no-img-element -- staff preview thumbnail
                    <img src={selectedProduct.images[0].url} alt="" className="h-8 w-8 rounded-lg object-cover" />
                  ) : (
                    <span className="h-8 w-8 shrink-0 rounded-lg bg-white/15" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[10px] font-semibold text-white">{selectedProduct.name}</p>
                    <p className="text-[10px] font-bold text-[#dfc28c]">₹{cheapestPrice.toLocaleString("en-IN")}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
          <p className="text-[10.5px] leading-relaxed text-stone-400">
            This mirrors the storefront card: tag, title, caption and the linked product a shopper can add to bag.
          </p>
        </div>
      </div>

      {/* footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#ebe6de] bg-white px-6 py-4">
        <p className="text-[11.5px] text-stone-400">
          {status === "published" ? "Publishing shows this reel on /reels immediately." : "Drafts stay hidden from shoppers."}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-10 rounded-full border border-[#ebe6de] px-4 text-[12.5px] font-semibold text-stone-600 transition hover:bg-[#faf7f2]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving || uploading}
            className="min-h-10 rounded-full bg-[#881337] px-5 text-[12.5px] font-semibold text-white transition hover:bg-[#6b0f2b] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving…" : isEdit ? "Save changes" : "Publish reel"}
          </button>
        </div>
      </div>
    </div>
  );
}
