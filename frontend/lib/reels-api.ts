/**
 * Reels data layer.
 *
 * The storefront feed, the admin console and the Cloudinary upload all go through here. When
 * NEXT_PUBLIC_API_URL is unset the feed falls back to bundled demo reels so the page still renders
 * (and says so), exactly like the rest of the storefront.
 */
import { apiFetch, ApiError, isApiConfigured } from "./api-client";

export interface ReelProductVariant {
  sku: string;
  size?: string;
  color?: string;
  price: number;
  mrp: number;
}

export interface ReelProduct {
  id: string;
  name: string;
  slug: string;
  category: string;
  image: string;
  price: number;
  mrp: number;
  sizes: string[];
  /** Sellable variants — lets the reel add to the real cart without another request. */
  variants?: ReelProductVariant[];
  status?: string;
}

export interface Reel {
  _id: string;
  title: string;
  caption?: string;
  tag?: string;
  videoUrl: string;
  videoPublicId?: string;
  posterUrl?: string;
  posterPublicId?: string;
  provider?: "cloudinary" | "external";
  durationSec?: number;
  width?: number;
  height?: number;
  bytes?: number;
  format?: string;
  productId?: string | null;
  product?: ReelProduct | null;
  position: number;
  status: "draft" | "published";
  likes: number;
  views: number;
  shares: number;
  cartAdds?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ReelDraft {
  title: string;
  caption?: string;
  tag?: string;
  videoUrl: string;
  videoPublicId?: string;
  posterUrl?: string;
  posterPublicId?: string;
  provider?: "cloudinary" | "external";
  durationSec?: number;
  width?: number;
  height?: number;
  bytes?: number;
  format?: string;
  productId?: string | null;
  position?: number;
  status?: "draft" | "published";
}

export interface ReelEngagement {
  liked: boolean;
  likes: number;
  views: number;
  shares: number;
  cartAdds: number;
}

export type ReelAction = "like" | "unlike" | "view" | "share" | "cart_add";

/* ------------------------------------------------------------------ identity */

const IDENTITY_KEY = "vani_reel_identity";
const MUTED_KEY = "vani_reels_muted";
const LIKED_KEY = "vani_reels_liked";

/**
 * Stable per-browser id so a guest's like is recorded once and views dedupe server-side.
 * Stored in localStorage; a fresh browser simply counts as a new viewer.
 */
/** Per-tab fallback for private-browsing sessions where localStorage throws. */
let tabIdentity = "";

export function getReelIdentity(): string {
  if (typeof window === "undefined") return "";
  const generate = () =>
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `id-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  try {
    const existing = window.localStorage.getItem(IDENTITY_KEY);
    if (existing) return existing;
    const generated = generate();
    window.localStorage.setItem(IDENTITY_KEY, generated);
    return generated;
  } catch {
    /* Storage blocked — still identify the tab so a like dedupes for this session. */
    if (!tabIdentity) tabIdentity = generate();
    return tabIdentity;
  }
}

export function readMutedPreference(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(MUTED_KEY) !== "off";
  } catch {
    return true;
  }
}

export function writeMutedPreference(muted: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MUTED_KEY, muted ? "on" : "off");
  } catch {
    /* private mode */
  }
}

/** Locally remembered likes so the heart stays filled after a refresh (server is the source of truth). */
export function readLikedReels(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LIKED_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function writeLikedReels(ids: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LIKED_KEY, JSON.stringify(ids.slice(-200)));
  } catch {
    /* private mode */
  }
}

/* ---------------------------------------------------------------------- feed */

export async function fetchReels(limit = 30, signal?: AbortSignal): Promise<Reel[]> {
  const response = await apiFetch<{ data: Reel[] }>(`/api/reels?limit=${limit}`, { signal });
  return response.data;
}

export async function fetchAdminReels(params: { q?: string; status?: string } = {}, signal?: AbortSignal) {
  const query = new URLSearchParams();
  query.set("limit", "100");
  if (params.q) query.set("q", params.q);
  if (params.status && params.status !== "all") query.set("status", params.status);
  const response = await apiFetch<{ data: Reel[]; meta?: { total?: number; published?: number; drafts?: number } }>(
    `/api/reels/admin?${query.toString()}`,
    { signal }
  );
  return { reels: response.data, meta: response.meta ?? {} };
}

export async function createReel(draft: ReelDraft): Promise<Reel> {
  const response = await apiFetch<{ data: Reel }>("/api/reels", { method: "POST", body: draft });
  return response.data;
}

export async function updateReel(id: string, draft: Partial<ReelDraft>): Promise<Reel> {
  const response = await apiFetch<{ data: Reel }>(`/api/reels/${id}`, { method: "PATCH", body: draft });
  return response.data;
}

export async function deleteReel(id: string): Promise<void> {
  await apiFetch<void>(`/api/reels/${id}`, { method: "DELETE" });
}

export async function reorderReels(order: string[]): Promise<Reel[]> {
  const response = await apiFetch<{ data: Reel[] }>("/api/reels/reorder", { method: "PATCH", body: { order } });
  return response.data;
}

/**
 * Fire-and-forget engagement ping. Failures are swallowed on purpose — a lost like must never
 * break the feed the shopper is watching.
 */
export async function engageReel(id: string, action: ReelAction): Promise<ReelEngagement | null> {
  if (!isApiConfigured()) return null;
  try {
    const response = await apiFetch<{ data: ReelEngagement }>(`/api/reels/${id}/engage`, {
      method: "POST",
      body: { action, identity: getReelIdentity() },
    });
    return response.data;
  } catch {
    return null;
  }
}

/* ---------------------------------------------------------------- cloudinary */

interface UploadSignature {
  cloudName: string;
  apiKey: string;
  signature: string;
  timestamp: number;
  folder: string;
  resourceType: "video" | "image";
  uploadUrl: string;
  maxBytes: number;
}

export interface CloudinaryUploadResult {
  url: string;
  publicId: string;
  width: number;
  height: number;
  bytes: number;
  format: string;
  durationSec?: number;
  /** Poster frame derived from the Cloudinary asset (videos only). */
  posterUrl?: string;
  posterPublicId?: string;
}

async function getUploadSignature(type: "video" | "image", folder: "reels" | "products" | "content"): Promise<UploadSignature> {
  const response = await apiFetch<{ data: UploadSignature }>(`/api/uploads/signature?type=${type}&folder=${folder}`);
  return response.data;
}

/** Turns `…/upload/v123/folder/clip.mp4` into a still frame at 0.5s for the poster. */
export function cloudinaryVideoPoster(videoUrl: string): string {
  if (!videoUrl.includes("/upload/")) return videoUrl.replace(/\.[a-z0-9]+$/i, ".jpg");
  return videoUrl.replace("/upload/", "/upload/so_0.5,c_fill,q_auto,f_auto/").replace(/\.[a-z0-9]+$/i, ".jpg");
}

/**
 * Uploads a file straight to Cloudinary using a signature minted by our API.
 *
 * Uses XHR rather than fetch so real upload progress can be shown for multi-hundred-MB clips.
 */
export function uploadToCloudinary(
  file: File,
  options: { type?: "video" | "image"; folder?: "reels" | "products" | "content"; onProgress?: (percent: number) => void } = {}
): Promise<CloudinaryUploadResult> {
  const { type = "video", folder = "reels", onProgress } = options;

  return getUploadSignature(type, folder).then(
    (signature) =>
      new Promise<CloudinaryUploadResult>((resolve, reject) => {
        if (file.size > signature.maxBytes) {
          reject(new ApiError(413, "FILE_TOO_LARGE", `That file is ${formatMegabytes(file.size)} — the limit is ${formatMegabytes(signature.maxBytes)}`));
          return;
        }

        const form = new FormData();
        form.append("file", file);
        form.append("api_key", signature.apiKey);
        form.append("timestamp", String(signature.timestamp));
        form.append("signature", signature.signature);
        form.append("folder", signature.folder);

        const request = new XMLHttpRequest();
        request.open("POST", signature.uploadUrl);
        request.upload.onprogress = (event) => {
          if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100));
        };
        request.onerror = () => reject(new ApiError(0, "UPLOAD_FAILED", "Could not reach Cloudinary — check the network and try again"));
        request.onload = () => {
          let payload: Record<string, unknown> = {};
          try {
            payload = JSON.parse(request.responseText || "{}");
          } catch {
            /* Cloudinary always answers JSON; anything else is a proxy error page */
          }
          if (request.status < 200 || request.status >= 300) {
            const error = payload.error as { message?: string } | undefined;
            reject(new ApiError(request.status, "UPLOAD_FAILED", error?.message || `Cloudinary rejected the upload (${request.status})`));
            return;
          }
          const secureUrl = String(payload.secure_url || "");
          const publicId = String(payload.public_id || "");
          onProgress?.(100);
          resolve({
            url: secureUrl,
            publicId,
            width: Number(payload.width || 0),
            height: Number(payload.height || 0),
            bytes: Number(payload.bytes || file.size),
            format: String(payload.format || file.name.split(".").pop() || ""),
            durationSec: payload.duration !== undefined ? Number(payload.duration) : undefined,
            posterUrl: signature.resourceType === "video" ? cloudinaryVideoPoster(secureUrl) : secureUrl,
            posterPublicId: signature.resourceType === "video" ? publicId : undefined,
          });
        };
        request.send(form);
      })
  );
}

export function formatMegabytes(bytes: number): string {
  return `${Math.round((bytes / (1024 * 1024)) * 10) / 10} MB`;
}

export function formatDuration(seconds?: number): string {
  if (!seconds || !Number.isFinite(seconds)) return "—";
  const total = Math.round(seconds);
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return minutes > 0 ? `${minutes}:${String(rest).padStart(2, "0")}` : `0:${String(rest).padStart(2, "0")}`;
}

export function formatCount(value: number): string {
  if (value >= 10_000_000) return `${Math.round(value / 1_000_000)}M`;
  if (value >= 1_000_000) return `${Math.round((value / 1_000_000) * 10) / 10}M`;
  if (value >= 10_000) return `${Math.round(value / 1_000)}K`;
  if (value >= 1_000) return `${Math.round((value / 1_000) * 10) / 10}K`;
  return String(value ?? 0);
}

export { isApiConfigured, ApiError };
