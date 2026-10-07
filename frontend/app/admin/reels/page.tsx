"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import AdminDataBadge from "@/components/admin/AdminDataBadge";
import ReelEditor from "@/components/admin/ReelEditor";
import { Badge, Card, StatCard } from "@/lib/admin-ui";
import { ApiError, isApiConfigured } from "@/lib/api-client";
import { useApiResource } from "@/lib/use-api";
import {
  deleteReel,
  fetchAdminReels,
  formatCount,
  formatDuration,
  reorderReels,
  updateReel,
  type Reel,
} from "@/lib/reels-api";

const DEMO_REELS: Reel[] = [
  {
    _id: "demo-1",
    title: "Pure Mul Cotton — Featherlight for Summer Days",
    caption: "100-count mul cotton, handblock printed in Bagru.",
    tag: "Bagru Handblock",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    posterUrl: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=400&q=80",
    durationSec: 18,
    provider: "external",
    position: 0,
    status: "published",
    likes: 1842,
    views: 24310,
    shares: 241,
    cartAdds: 96,
    product: { id: "demo-p1", name: "Gulab Bagh Handblock Anarkali", slug: "gulab-bagh", category: "anarkalis", image: "", price: 2499, mrp: 3499, sizes: ["S", "M", "L"] },
  },
  {
    _id: "demo-2",
    title: "Festive Chanderi Silk — Craft the Perfect Heirloom Look",
    caption: "Gota patti zari work, done by hand over eleven days.",
    tag: "Gota Patti Zari",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    posterUrl: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=400&q=80",
    durationSec: 24,
    provider: "external",
    position: 1,
    status: "draft",
    likes: 0,
    views: 0,
    shares: 0,
    cartAdds: 0,
    product: null,
  },
];

type StatusFilter = "all" | "published" | "draft";

const FILTERS: { id: StatusFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "published", label: "Published" },
  { id: "draft", label: "Drafts" },
];

export default function AdminReelsPage() {
  const configured = isApiConfigured();
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Reel | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const resource = useApiResource<{ reels: Reel[]; meta: Record<string, number> }>(
    (signal) => fetchAdminReels({}, signal).then(({ reels, meta }) => ({ reels, meta: meta as Record<string, number> })),
    { reels: DEMO_REELS, meta: { total: DEMO_REELS.length, published: 1, drafts: 1 } },
    []
  );

  const reels = resource.data.reels;

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    return reels.filter(
      (reel) =>
        (filter === "all" || reel.status === filter) &&
        (term === "" ||
          reel.title.toLowerCase().includes(term) ||
          (reel.tag ?? "").toLowerCase().includes(term) ||
          (reel.product?.name ?? "").toLowerCase().includes(term))
    );
  }, [reels, filter, query]);

  const totals = useMemo(
    () => ({
      published: reels.filter((reel) => reel.status === "published").length,
      drafts: reels.filter((reel) => reel.status === "draft").length,
      views: reels.reduce((sum, reel) => sum + (reel.views || 0), 0),
      likes: reels.reduce((sum, reel) => sum + (reel.likes || 0), 0),
      cartAdds: reels.reduce((sum, reel) => sum + (reel.cartAdds || 0), 0),
    }),
    [reels]
  );

  const openNew = () => {
    setEditing(null);
    setEditorOpen(true);
  };

  const openEdit = (reel: Reel) => {
    setEditing(reel);
    setEditorOpen(true);
  };

  const flash = (message: string) => {
    setNotice(message);
    setError(null);
    setTimeout(() => setNotice(null), 3500);
  };

  const toggleStatus = async (reel: Reel) => {
    setBusyId(reel._id);
    setError(null);
    try {
      await updateReel(reel._id, { status: reel.status === "published" ? "draft" : "published" });
      flash(reel.status === "published" ? `“${reel.title}” moved to drafts` : `“${reel.title}” is now live on /reels`);
      resource.refresh();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Could not update the reel");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (reel: Reel) => {
    if (!window.confirm(`Delete “${reel.title}”? The Cloudinary video is removed too.`)) return;
    setBusyId(reel._id);
    setError(null);
    try {
      await deleteReel(reel._id);
      flash("Reel deleted");
      resource.refresh();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Could not delete the reel");
    } finally {
      setBusyId(null);
    }
  };

  /* Position swaps are pushed as one reorder call so the feed order never flickers. */
  const move = async (reel: Reel, direction: -1 | 1) => {
    const target = visible.findIndex((item) => item._id === reel._id) + direction;
    if (target < 0 || target >= visible.length) return;
    const order = [...reels];
    const from = order.findIndex((item) => item._id === reel._id);
    const swapWith = order.findIndex((item) => item._id === visible[target]._id);
    if (from < 0 || swapWith < 0) return;
    [order[from], order[swapWith]] = [order[swapWith], order[from]];
    setBusyId(reel._id);
    setError(null);
    try {
      await reorderReels(order.map((item) => item._id));
      resource.refresh();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Could not reorder the feed");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-400">Content</p>
          <h1 className="mt-1 font-serif text-[26px] font-semibold tracking-tight">Reels</h1>
          <p className="mt-1 text-[13px] text-stone-500">
            {totals.published} live on <Link href="/reels" className="font-semibold text-[#881337] underline decoration-[#dfc28c] underline-offset-2 hover:text-[#b91c1c]">/reels</Link>
            {totals.drafts > 0 && ` · ${totals.drafts} draft${totals.drafts > 1 ? "s" : ""}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <AdminDataBadge resource={resource} label="reels" />
          <button
            type="button"
            onClick={openNew}
            className="rounded-xl bg-[#881337] px-4 py-2 text-[12.5px] font-semibold text-white transition hover:bg-[#6b0f2b]"
          >
            + New reel
          </button>
        </div>
      </div>

      {/* stats */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Published" value={String(totals.published)} hint="Visible to shoppers" icon={<IconPlay />} />
        <StatCard label="Drafts" value={String(totals.drafts)} hint="Hidden from the feed" icon={<IconDraft />} />
        <StatCard label="Views" value={formatCount(totals.views)} hint={`${formatCount(totals.likes)} likes across the feed`} icon={<IconEye />} />
        <StatCard label="Add to bag" value={formatCount(totals.cartAdds)} hint="Driven by reels" icon={<IconBag />} />
      </div>

      {error && (
        <p role="alert" className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-[12.5px] text-rose-700 ring-1 ring-rose-200">{error}</p>
      )}
      {notice && (
        <p className="rounded-xl bg-emerald-50 px-3.5 py-2.5 text-[12.5px] text-emerald-700 ring-1 ring-emerald-200">{notice}</p>
      )}
      {!configured && (
        <p className="rounded-xl bg-amber-50 px-3.5 py-2.5 text-[12.5px] text-amber-800 ring-1 ring-amber-200">
          Demo data — set <code className="font-semibold">NEXT_PUBLIC_API_URL</code> to manage real reels and upload to Cloudinary.
        </p>
      )}

      {/* toolbar */}
      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-[#ebe6de] bg-white px-3 py-2 focus-within:border-[#dfc28c] sm:max-w-xs">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-stone-400">
              <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
            </svg>
            <label htmlFor="reel-search" className="sr-only">Search reels</label>
            <input
              id="reel-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by title, tag or product…"
              className="w-full bg-transparent text-[13px] outline-none placeholder:text-stone-400"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setFilter(option.id)}
                aria-pressed={filter === option.id}
                className={`rounded-full px-3 py-1.5 text-[12px] font-medium transition ${
                  filter === option.id ? "bg-[#14100f] text-white" : "bg-[#faf7f2] text-stone-600 hover:bg-[#f0ebe3]"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* grid */}
      {visible.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#faf7f2] text-[#c9a56b] ring-1 ring-[#ebe6de]">
              <IconPlay />
            </span>
            <div>
              <p className="font-serif text-[17px] font-semibold text-[#14100f]">
                {reels.length === 0 ? "No reels yet" : "Nothing matches that filter"}
              </p>
              <p className="mt-1 text-[12.5px] text-stone-500">
                {reels.length === 0
                  ? "Upload your first clip — it streams to Cloudinary and appears on /reels the moment you publish."
                  : "Try a different status filter or clear the search."}
              </p>
            </div>
            {reels.length === 0 && (
              <button type="button" onClick={openNew} className="mt-1 rounded-xl bg-[#881337] px-4 py-2 text-[12.5px] font-semibold text-white transition hover:bg-[#6b0f2b]">
                + Upload a reel
              </button>
            )}
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((reel, index) => {
            const busy = busyId === reel._id;
            const published = reel.status === "published";
            return (
              <Card key={reel._id} className={`transition ${busy ? "opacity-60" : ""}`}>
                <div className="flex gap-3.5">
                  {/* thumbnail */}
                  <div className="relative aspect-[9/16] w-[86px] shrink-0 overflow-hidden rounded-xl bg-[#14100f]">
                    {reel.posterUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- Cloudinary thumbnail
                      <img src={reel.posterUrl} alt="" className="h-full w-full object-cover" />
                    ) : reel.videoUrl ? (
                      <video src={reel.videoUrl} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-white/25"><IconPlay /></div>
                    )}
                    <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1.5 py-0.5 text-[9px] font-semibold text-white">
                      {formatDuration(reel.durationSec)}
                    </span>
                    <span className="absolute left-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-semibold text-white/80">
                      #{index + 1}
                    </span>
                  </div>

                  {/* meta */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="line-clamp-2 text-[13.5px] font-semibold leading-snug tracking-tight text-[#14100f]">{reel.title}</h3>
                      <Badge tone={published ? "success" : "neutral"} dot>
                        {published ? "Live" : "Draft"}
                      </Badge>
                    </div>

                    {reel.tag && <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#881337]">{reel.tag}</p>}

                    {reel.product ? (
                      <Link
                        href={reel.product.slug ? `/product/${reel.product.slug}` : "/admin/products"}
                        className="mt-1.5 flex items-center gap-1.5 text-[11.5px] text-stone-500 transition hover:text-[#881337]"
                      >
                        <IconLink />
                        <span className="truncate">{reel.product.name}</span>
                      </Link>
                    ) : (
                      <p className="mt-1.5 text-[11.5px] text-stone-400">No product linked</p>
                    )}

                    <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-stone-500">
                      <span className="inline-flex items-center gap-1"><IconEye small /> {formatCount(reel.views)}</span>
                      <span className="inline-flex items-center gap-1"><IconHeart small /> {formatCount(reel.likes)}</span>
                      <span className="inline-flex items-center gap-1"><IconShare small /> {formatCount(reel.shares)}</span>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => openEdit(reel)}
                        className="min-h-8 rounded-lg border border-[#ebe6de] bg-white px-2.5 text-[11.5px] font-semibold text-stone-600 transition hover:border-[#dfc28c] hover:text-[#881337] disabled:opacity-50"
                        disabled={busy}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void toggleStatus(reel)}
                        disabled={busy || !configured}
                        className={`min-h-8 rounded-lg px-2.5 text-[11.5px] font-semibold transition disabled:opacity-50 ${
                          published
                            ? "border border-[#ebe6de] bg-white text-stone-600 hover:border-[#dfc28c] hover:text-[#881337]"
                            : "bg-[#881337] text-white hover:bg-[#6b0f2b]"
                        }`}
                      >
                        {published ? "Unpublish" : "Publish"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void remove(reel)}
                        disabled={busy || !configured}
                        aria-label={`Delete ${reel.title}`}
                        className="min-h-8 rounded-lg border border-[#ebe6de] bg-white px-2 text-stone-400 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50"
                      >
                        <IconTrash />
                      </button>

                      <span className="ml-auto flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => void move(reel, -1)}
                          disabled={busy || !configured || index === 0}
                          aria-label="Move earlier in the feed"
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#ebe6de] bg-white text-stone-500 transition hover:border-[#dfc28c] hover:text-[#881337] disabled:opacity-40"
                        >
                          <IconChevron direction="up" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void move(reel, 1)}
                          disabled={busy || !configured || index === visible.length - 1}
                          aria-label="Move later in the feed"
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#ebe6de] bg-white text-stone-500 transition hover:border-[#dfc28c] hover:text-[#881337] disabled:opacity-40"
                        >
                          <IconChevron direction="down" />
                        </button>
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <ReelEditor
        open={editorOpen}
        reel={editing}
        onClose={() => setEditorOpen(false)}
        onSaved={(reel) => {
          flash(editing ? `“${reel.title}” updated` : `“${reel.title}” ${reel.status === "published" ? "is live on /reels" : "saved as a draft"}`);
          resource.refresh();
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Icons                                                             */
/* ------------------------------------------------------------------ */
const iconProps = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

const IconPlay = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" {...iconProps}>
    <rect x="3" y="3" width="18" height="18" rx="3.5" /><path d="M3 8.5h18M9 3v5.5" />
    <path d="m11 12.5 4.5 2.6-4.5 2.6z" fill="currentColor" stroke="none" />
  </svg>
);

const IconDraft = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" {...iconProps}>
    <path d="M4 20h16M6 16.5 16.5 6a2.1 2.1 0 0 1 3 3L9 19.5l-4 1z" />
  </svg>
);

const IconEye = ({ small = false }: { small?: boolean }) => (
  <svg width={small ? 12 : 17} height={small ? 12 : 17} viewBox="0 0 24 24" {...iconProps}>
    <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" /><circle cx="12" cy="12" r="2.6" />
  </svg>
);

const IconBag = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" {...iconProps}>
    <path d="M5.5 8h13l-1.1 11.1A2 2 0 0 1 15.4 21H8.6a2 2 0 0 1-2-1.9z" /><path d="M8.75 8V6.5a3.25 3.25 0 1 1 6.5 0V8" />
  </svg>
);

const IconHeart = ({ small = false }: { small?: boolean }) => (
  <svg width={small ? 12 : 15} height={small ? 12 : 15} viewBox="0 0 24 24" {...iconProps}>
    <path d="M20.8 5.6a5.2 5.2 0 0 0-7.4 0L12 7l-1.4-1.4a5.2 5.2 0 0 0-7.4 7.4L12 21l8.8-8a5.2 5.2 0 0 0 0-7.4z" />
  </svg>
);

const IconShare = ({ small = false }: { small?: boolean }) => (
  <svg width={small ? 12 : 15} height={small ? 12 : 15} viewBox="0 0 24 24" {...iconProps}>
    <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
    <path d="m8.59 13.51 6.83 3.98M15.41 6.51 8.59 10.49" />
  </svg>
);

const IconTrash = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" {...iconProps} strokeWidth={1.8}>
    <path d="M4 7h16M9.5 7V5.5A1.5 1.5 0 0 1 11 4h2a1.5 1.5 0 0 1 1.5 1.5V7M6.5 7l.8 12.1A2 2 0 0 0 9.3 21h5.4a2 2 0 0 0 2-1.9L17.5 7" />
  </svg>
);

const IconLink = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" {...iconProps} strokeWidth={1.8}>
    <path d="M10 13.5a4 4 0 0 0 5.7 0l2.8-2.8a4 4 0 0 0-5.7-5.7L11.5 6.3" />
    <path d="M14 10.5a4 4 0 0 0-5.7 0l-2.8 2.8a4 4 0 0 0 5.7 5.7l1.3-1.3" />
  </svg>
);

const IconChevron = ({ direction }: { direction: "up" | "down" }) => (
  <svg width="13" height="13" viewBox="0 0 24 24" {...iconProps} strokeWidth={2}>
    <path d={direction === "up" ? "m6 15 6-6 6 6" : "m6 9 6 6 6-6"} />
  </svg>
);
