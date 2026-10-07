"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  engageReel,
  fetchReels,
  isApiConfigured,
  readLikedReels,
  writeLikedReels,
  type Reel,
} from "./reels-api";

export type ReelsSource = "live" | "demo";

/**
 * Bundled demo reels — used only when NEXT_PUBLIC_API_URL is unset or the API is unreachable, and
 * the UI labels them as demo so nobody mistakes them for published content.
 */
export const DEMO_REELS: Reel[] = [
  {
    _id: "demo-reel-1",
    title: "Pure Mul Cotton — Featherlight for Summer Days",
    caption: "100-count mul cotton, handblock printed in Bagru. Breathable enough for a Ujjain May.",
    tag: "Bagru Handblock",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    posterUrl: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=720&q=85",
    provider: "external",
    position: 0,
    status: "published",
    likes: 1842,
    views: 24310,
    shares: 241,
    cartAdds: 96,
    product: {
      id: "demo-product-1",
      name: "Gulab Bagh Handblock Anarkali",
      slug: "gulab-bagh-handblock-anarkali",
      category: "anarkalis",
      image: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=400&q=80",
      price: 2499,
      mrp: 3499,
      sizes: ["S", "M", "L"],
    },
  },
  {
    _id: "demo-reel-2",
    title: "Festive Chanderi Silk — Craft the Perfect Heirloom Look",
    caption: "Gota patti zari work, done by hand over eleven days.",
    tag: "Gota Patti Zari",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    posterUrl: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=720&q=85",
    provider: "external",
    position: 1,
    status: "published",
    likes: 3241,
    views: 41208,
    shares: 542,
    cartAdds: 173,
    product: {
      id: "demo-product-2",
      name: "Rani Bagru Chanderi Saree",
      slug: "rani-bagru-chanderi-saree",
      category: "festive",
      image: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=400&q=80",
      price: 3999,
      mrp: 5299,
      sizes: ["Free Size"],
    },
  },
  {
    _id: "demo-reel-3",
    title: "Effortless Indo-Western Co-ords — Airport to Brunch",
    caption: "One set, three ways to wear it.",
    tag: "Modern Comfort",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    posterUrl: "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=720&q=85",
    provider: "external",
    position: 2,
    status: "published",
    likes: 2103,
    views: 19877,
    shares: 318,
    cartAdds: 88,
    product: {
      id: "demo-product-3",
      name: "Indigo Dabu Co-ord Set",
      slug: "indigo-dabu-co-ord-set",
      category: "coord-sets",
      image: "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=400&q=80",
      price: 1899,
      mrp: 2599,
      sizes: ["S", "M", "L", "XL"],
    },
  },
];

interface ReelsState {
  reels: Reel[];
  source: ReelsSource;
  error: string | null;
}

export interface UseReels {
  reels: Reel[];
  source: ReelsSource;
  loading: boolean;
  error: string | null;
  refresh: () => void;
  likedIds: Set<string>;
  /** Returns the new liked state; the optimistic value is applied immediately. */
  toggleLike: (id: string) => boolean;
  registerView: (id: string) => void;
  registerShare: (id: string) => void;
  registerCartAdd: (id: string) => void;
  counters: Record<string, { likes: number; views: number; shares: number }>;
}

/**
 * Published reels for the `/reels` feed, plus optimistic engagement.
 *
 * Counts start from the server value and are adjusted locally the moment the shopper taps, so the
 * UI never waits on the network; the server response reconciles the number afterwards.
 */
export function useReels(): UseReels {
  const configured = isApiConfigured();
  /** `null` until the first fetch settles — that is what drives the loading skeleton. */
  const [remote, setRemote] = useState<ReelsState | null>(null);
  const [nonce, setNonce] = useState(0);
  const [likedIds, setLikedIds] = useState<Set<string>>(() => new Set(readLikedReels()));
  const [counters, setCounters] = useState<Record<string, { likes: number; views: number; shares: number }>>({});
  const countedViews = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!configured) return;
    const controller = new AbortController();
    let cancelled = false;
    /* State updates start after the first await so they never run synchronously inside the effect. */
    const load = async () => {
      await Promise.resolve();
      if (cancelled) return;
      try {
        const reels = await fetchReels(30, controller.signal);
        if (cancelled) return;
        setRemote({ reels, source: "live", error: reels.length ? null : "No reels have been published yet" });
        setCounters(Object.fromEntries(reels.map((reel) => [reel._id, { likes: reel.likes, views: reel.views, shares: reel.shares }])));
      } catch (cause) {
        if (cancelled || (cause as Error)?.name === "AbortError") return;
        setRemote({ reels: DEMO_REELS, source: "demo", error: (cause as Error)?.message || "Could not load the reels feed" });
        setCounters(Object.fromEntries(DEMO_REELS.map((reel) => [reel._id, { likes: reel.likes, views: reel.views, shares: reel.shares }])));
      }
    };
    void load();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [configured, nonce]);

  const state: ReelsState = remote ?? {
    reels: DEMO_REELS,
    source: "demo",
    error: configured ? null : "Demo reels — set NEXT_PUBLIC_API_URL to load published content",
  };
  const loading = configured && remote === null;

  const bump = useCallback((id: string, field: "likes" | "views" | "shares", delta: number) => {
    setCounters((previous) => {
      const current = previous[id];
      if (!current) return previous;
      return { ...previous, [id]: { ...current, [field]: Math.max(0, current[field] + delta) } };
    });
  }, []);

  const toggleLike = useCallback(
    (id: string) => {
      let nextLiked = false;
      setLikedIds((previous) => {
        const next = new Set(previous);
        if (next.has(id)) {
          next.delete(id);
          nextLiked = false;
        } else {
          next.add(id);
          nextLiked = true;
        }
        writeLikedReels([...next]);
        return next;
      });
      bump(id, "likes", nextLiked ? 1 : -1);
      void engageReel(id, nextLiked ? "like" : "unlike").then((result) => {
        if (result) setCounters((previous) => ({ ...previous, [id]: { ...(previous[id] ?? { likes: 0, views: 0, shares: 0 }), likes: result.likes } }));
      });
      return nextLiked;
    },
    [bump]
  );

  const registerView = useCallback(
    (id: string) => {
      if (countedViews.current.has(id)) return;
      countedViews.current.add(id);
      bump(id, "views", 1);
      void engageReel(id, "view").then((result) => {
        if (result) setCounters((previous) => ({ ...previous, [id]: { ...(previous[id] ?? { likes: 0, views: 0, shares: 0 }), views: result.views } }));
      });
    },
    [bump]
  );

  const registerShare = useCallback(
    (id: string) => {
      bump(id, "shares", 1);
      void engageReel(id, "share");
    },
    [bump]
  );

  const registerCartAdd = useCallback((id: string) => {
    void engageReel(id, "cart_add");
  }, []);

  const merged = useMemo(
    () =>
      state.reels.map((reel) => {
        const override = counters[reel._id];
        return override ? { ...reel, likes: override.likes, views: override.views, shares: override.shares } : reel;
      }),
    [state.reels, counters]
  );

  return {
    reels: merged,
    source: state.source,
    loading,
    error: state.error,
    refresh: useCallback(() => setNonce((value) => value + 1), []),
    likedIds,
    toggleLike,
    registerView,
    registerShare,
    registerCartAdd,
    counters,
  };
}
