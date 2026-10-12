"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Alert, ButtonGhost, Card, EmptyState, PageHeading, StatCard, TextInput } from "@/lib/admin-ui";
import { api, ApiError, type CloudinaryMediaAsset } from "@/lib/api-client";

type MediaType = "image" | "video";

const formatBytes = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`;
};

const formatDate = (value: string): string => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(date);
};

export default function MediaLibraryPage() {
  const [type, setType] = useState<MediaType>("image");
  const [assets, setAssets] = useState<CloudinaryMediaAsset[]>([]);
  const [counts, setCounts] = useState({ images: 0, videos: 0, total: 0 });
  const [total, setTotal] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [loadedType, setLoadedType] = useState<MediaType | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const loading = loadedType !== type;

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      api.cloudinaryAssets({ type }, controller.signal),
      api.cloudinaryAssetCounts(controller.signal),
    ]).then(([listing, countResult]) => {
      setAssets(listing.data);
      setTotal(listing.meta.total);
      setNextCursor(listing.meta.nextCursor);
      setCounts(countResult.data);
      setError(null);
      setLoadedType(type);
    }).catch((cause: unknown) => {
      if ((cause as Error)?.name !== "AbortError") {
        setError(cause instanceof ApiError ? cause.message : "Could not load Cloudinary media.");
        setLoadedType(type);
      }
    });
    return () => controller.abort();
  }, [type, refreshKey]);

  const visibleAssets = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return assets;
    return assets.filter((asset) => `${asset.publicId} ${asset.format}`.toLowerCase().includes(term));
  }, [assets, search]);

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    setError(null);
    try {
      const result = await api.cloudinaryAssets({ type, cursor: nextCursor });
      setAssets((current) => {
        const knownIds = new Set(current.map((asset) => asset.assetId));
        return [...current, ...result.data.filter((asset) => !knownIds.has(asset.assetId))];
      });
      setNextCursor(result.meta.nextCursor);
      setTotal(result.meta.total);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Could not load more media.");
    } finally {
      setLoadingMore(false);
    }
  };

  const copyLink = async (asset: CloudinaryMediaAsset) => {
    setError(null);
    try {
      await navigator.clipboard.writeText(asset.url);
      setCopiedId(asset.assetId);
      window.setTimeout(() => setCopiedId((current) => current === asset.assetId ? null : current), 1800);
    } catch {
      setError("Could not copy the link. Check browser clipboard permissions and try again.");
    }
  };

  return (
    <div className="space-y-5">
      <PageHeading
        eyebrow="Content"
        title="Media library"
        subtitle="Browse files stored in Cloudinary, check when they were uploaded, and copy their delivery links."
      />

      {error && <Alert>{error}</Alert>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="All media" value={counts.total.toLocaleString("en-IN")} hint="Images and videos in the Vani Collection folders" />
        <StatCard label="Images" value={counts.images.toLocaleString("en-IN")} hint="Product and content images" />
        <StatCard label="Videos" value={counts.videos.toLocaleString("en-IN")} hint="Uploaded video files" tone="gold" />
      </div>

      <Card className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex w-fit rounded-xl border border-stone-200 bg-stone-50 p-1" aria-label="Media type">
            {(["image", "video"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setType(value);
                  setAssets([]);
                  setTotal(0);
                  setNextCursor(null);
                  setSearch("");
                  setError(null);
                }}
                aria-pressed={type === value}
                className={`rounded-lg px-4 py-2 text-sm font-medium capitalize transition ${type === value ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-800"}`}
              >
                {value === "image" ? `Images (${counts.images})` : `Videos (${counts.videos})`}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <TextInput
              aria-label="Search loaded media"
              placeholder="Search loaded files"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <ButtonGhost onClick={() => { setLoadedType(null); setRefreshKey((value) => value + 1); }} disabled={loading}>
              Refresh
            </ButtonGhost>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-stone-500">
          <span>{type === "image" ? "Images" : "Videos"} stored in Cloudinary</span>
          <span>{assets.length.toLocaleString("en-IN")} of {total.toLocaleString("en-IN")} loaded</span>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4" aria-label="Loading media">
            {Array.from({ length: 8 }, (_, index) => <div key={index} className="aspect-[4/3] animate-pulse rounded-xl bg-stone-100" />)}
          </div>
        ) : visibleAssets.length === 0 ? (
          <EmptyState
            title={assets.length ? "No files match your search" : "No media found"}
            hint={assets.length ? "Try another file name or format." : "Files uploaded through the admin uploader will appear here."}
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
            {visibleAssets.map((asset) => (
              <article key={asset.assetId} className="min-w-0 overflow-hidden rounded-xl border border-stone-200 bg-white">
                <div className="relative aspect-[4/3] bg-stone-100">
                  {asset.resourceType === "video" ? (
                    <video src={asset.url} className="h-full w-full object-cover" controls preload="metadata" playsInline />
                  ) : (
                    <Image
                      src={asset.url}
                      alt={asset.publicId.split("/").at(-1) || "Cloudinary image"}
                      fill
                      unoptimized
                      sizes="(max-width: 768px) 50vw, (max-width: 1280px) 33vw, 25vw"
                      className="object-cover"
                    />
                  )}
                  <span className="absolute left-2 top-2 rounded-full bg-black/65 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
                    {asset.format}
                  </span>
                </div>
                <div className="space-y-2 p-3">
                  <p className="truncate text-xs font-medium text-stone-800" title={asset.publicId}>{asset.publicId}</p>
                  <p className="text-[11px] leading-4 text-stone-500">
                    {formatDate(asset.createdAt)}
                    <span className="mx-1.5">·</span>
                    {formatBytes(asset.bytes)}
                    {asset.width && asset.height ? <><span className="mx-1.5">·</span>{asset.width} × {asset.height}</> : null}
                  </p>
                  <button
                    type="button"
                    onClick={() => void copyLink(asset)}
                    className="w-full rounded-lg border border-stone-200 px-3 py-2 text-xs font-semibold text-stone-700 transition hover:border-stone-400 hover:bg-stone-50"
                  >
                    {copiedId === asset.assetId ? "Link copied" : "Copy link"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}

        {nextCursor && !loading && (
          <div className="flex justify-center pt-1">
            <ButtonGhost onClick={() => void loadMore()} disabled={loadingMore}>
              {loadingMore ? "Loading…" : "Load more"}
            </ButtonGhost>
          </div>
        )}
      </Card>
    </div>
  );
}
