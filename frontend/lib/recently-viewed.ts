export interface RecentlyViewedRef {
  id: string;
  slug: string;
  viewedAt: string;
}

const STORAGE_KEY = "vani_recently_viewed_v1";
const EVENT_NAME = "vani:recently-viewed";
const MAX_ITEMS = 12;
const EMPTY: RecentlyViewedRef[] = [];

let cachedRaw: string | null = null;
let cachedValue: RecentlyViewedRef[] = EMPTY;

function parse(raw: string | null): RecentlyViewedRef[] {
  if (!raw) return EMPTY;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return EMPTY;
    return parsed
      .filter((item): item is RecentlyViewedRef => (
        Boolean(item)
        && typeof item === "object"
        && typeof (item as RecentlyViewedRef).id === "string"
        && typeof (item as RecentlyViewedRef).slug === "string"
      ))
      .map((item) => ({
        id: item.id,
        slug: item.slug,
        viewedAt: typeof item.viewedAt === "string" ? item.viewedAt : "",
      }))
      .slice(0, MAX_ITEMS);
  } catch {
    return EMPTY;
  }
}

export function readRecentlyViewed(): RecentlyViewedRef[] {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw !== cachedRaw) {
      cachedRaw = raw;
      cachedValue = parse(raw);
    }
    return cachedValue;
  } catch {
    return EMPTY;
  }
}

export function getRecentlyViewedServerSnapshot(): RecentlyViewedRef[] {
  return EMPTY;
}

export function subscribeRecentlyViewed(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) onStoreChange();
  };
  window.addEventListener(EVENT_NAME, onStoreChange);
  window.addEventListener("storage", handleStorage);
  return () => {
    window.removeEventListener(EVENT_NAME, onStoreChange);
    window.removeEventListener("storage", handleStorage);
  };
}

function writeRecentlyViewed(items: RecentlyViewedRef[]) {
  if (typeof window === "undefined") return;
  try {
    const raw = JSON.stringify(items.slice(0, MAX_ITEMS));
    window.localStorage.setItem(STORAGE_KEY, raw);
    cachedRaw = raw;
    cachedValue = parse(raw);
    window.dispatchEvent(new Event(EVENT_NAME));
  } catch {
    // Private browsing/storage quota must never break shopping.
  }
}

export function recordRecentlyViewed(input: { id?: string; productId?: string; slug?: string }) {
  const id = input.productId ?? input.id ?? "";
  const slug = input.slug ?? "";
  if (!id && !slug) return;
  const next: RecentlyViewedRef = { id, slug, viewedAt: new Date().toISOString() };
  const existing = readRecentlyViewed().filter((item) => item.id !== id && item.slug !== slug);
  writeRecentlyViewed([next, ...existing]);
}

export function clearRecentlyViewed() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    cachedRaw = null;
    cachedValue = EMPTY;
    window.dispatchEvent(new Event(EVENT_NAME));
  } catch {
    // Ignore storage errors.
  }
}
