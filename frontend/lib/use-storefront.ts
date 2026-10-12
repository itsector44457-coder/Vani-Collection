"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError, isApiConfigured } from "./api-client";
import { getMyOrders, getProduct, listProducts } from "./storefront-api";
import type { Product, StoreOrder } from "./storefront-types";

export type DataSource = "live" | "unavailable";

interface Resource<T> {
  data: T;
  source: DataSource;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

/** Catalogue for grids and listings; never substitutes bundled sample products. */
export function useCatalogue(params: { category?: string; q?: string; limit?: number; allPages?: boolean } = {}): Resource<Product[]> {
  const configured = isApiConfigured();
  const [state, setState] = useState<{ data: Product[]; source: DataSource; error: string | null }>({
    data: [],
    source: "unavailable",
    error: configured ? null : "The product catalogue is unavailable because the storefront API is not configured.",
  });
  const [loading, setLoading] = useState(configured);
  const [nonce, setNonce] = useState(0);
  const { category, q, limit, allPages = false } = params;

  useEffect(() => {
    if (!configured) return;
    const controller = new AbortController();
    let cancelled = false;
    /* State updates start after the first await so they never run synchronously inside the effect. */
    const load = async () => {
      await Promise.resolve();
      if (cancelled) return;
      setLoading(true);
      try {
        const pageSize = allPages ? 100 : limit;
        const firstPage = await listProducts({ category, q, limit: pageSize, page: 1 }, controller.signal);
        const allProducts = [...firstPage.products];
        for (let page = 2; allPages && page <= firstPage.pages; page += 1) {
          const result = await listProducts({ category, q, limit: pageSize, page }, controller.signal);
          allProducts.push(...result.products);
        }
        if (!cancelled) setState({ data: allProducts, source: "live", error: null });
      } catch (cause) {
        if ((cause as Error)?.name === "AbortError") return;
        if (!cancelled) {
          setState({ data: [], source: "unavailable", error: (cause as Error)?.message ?? "Could not load the live catalogue" });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [configured, category, q, limit, allPages, nonce]);

  return { ...state, loading, refresh: useCallback(() => setNonce((value) => value + 1), []) };
}

/** Single product page: resolves products only from the live catalogue API. */
export function useStoreProduct(slug: string): Resource<Product | null> {
  const configured = isApiConfigured();
  const [state, setState] = useState<{ data: Product | null; source: DataSource; error: string | null }>(() => ({
    data: null,
    source: "unavailable",
    error: configured ? null : "The storefront API is not configured.",
  }));
  const [loading, setLoading] = useState(configured);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!configured) return;
    const controller = new AbortController();
    let cancelled = false;
    const load = async () => {
      await Promise.resolve();
      if (cancelled) return;
      setLoading(true);
      try {
        const product = await getProduct(slug, controller.signal);
        if (!cancelled) setState({ data: product, source: "live", error: null });
      } catch (cause) {
        if ((cause as Error)?.name === "AbortError") return;
        if (!cancelled) {
          if (cause instanceof ApiError && cause.status === 404) {
            setState({ data: null, source: "live", error: null });
          } else {
            setState({ data: null, source: "unavailable", error: (cause as Error)?.message ?? "Could not load this product" });
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [configured, slug, nonce]);

  return { ...state, loading: configured && loading, refresh: useCallback(() => setNonce((value) => value + 1), []) };
}

/** Signed-in customer's orders. Requires a session; returns an empty list for guests. */
export function useMyOrders(enabled: boolean): Resource<StoreOrder[]> {
  const configured = isApiConfigured();
  const [state, setState] = useState<{ data: StoreOrder[]; source: DataSource; error: string | null }>({ data: [], source: "unavailable", error: null });
  const [loading, setLoading] = useState(false);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!configured || !enabled) return;
    const controller = new AbortController();
    let cancelled = false;
    const load = async () => {
      await Promise.resolve();
      if (cancelled) return;
      setLoading(true);
      try {
        const orders = await getMyOrders(controller.signal);
        if (!cancelled) setState({ data: orders, source: "live", error: null });
      } catch (cause) {
        if ((cause as Error)?.name === "AbortError") return;
        if (!cancelled) setState({ data: [], source: "unavailable", error: (cause as Error)?.message ?? "Could not load your orders" });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [configured, enabled, nonce]);

  return { ...state, loading, refresh: useCallback(() => setNonce((value) => value + 1), []) };
}
