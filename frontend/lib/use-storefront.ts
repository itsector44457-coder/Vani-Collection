"use client";

import { useCallback, useEffect, useState } from "react";
import { isApiConfigured } from "./api-client";
import { getMyOrders, getProduct, listProducts } from "./storefront-api";
import { PRODUCTS } from "../data/products";
import { generateProductSlug } from "./utils";
import type { Product, StoreOrder } from "./storefront-types";

export type DataSource = "live" | "demo";

/** Demo rows are flagged so the UI can be honest about what is real. */
export const DEMO_PRODUCTS: Product[] = PRODUCTS.map((product) => ({ ...product, isDemo: true }));

const bySlug = (slug: string) => DEMO_PRODUCTS.find((product) => generateProductSlug(product.title) === slug);

interface Resource<T> {
  data: T;
  source: DataSource;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

/** Catalogue for grids and listings: live API first, bundled demo data as the fallback. */
export function useCatalogue(params: { category?: string; q?: string; limit?: number } = {}): Resource<Product[]> {
  const configured = isApiConfigured();
  const [state, setState] = useState<{ data: Product[]; source: DataSource; error: string | null }>({
    data: DEMO_PRODUCTS,
    source: "demo",
    error: configured ? null : "Demo catalogue — set NEXT_PUBLIC_API_URL to load live products",
  });
  const [loading, setLoading] = useState(configured);
  const [nonce, setNonce] = useState(0);
  const { category, q, limit } = params;

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
        const result = await listProducts({ category, q, limit }, controller.signal);
        if (!cancelled) setState({ data: result.products, source: result.products.length ? "live" : "demo", error: null });
      } catch (cause) {
        if ((cause as Error)?.name === "AbortError") return;
        if (!cancelled) {
          setState({ data: DEMO_PRODUCTS, source: "demo", error: (cause as Error)?.message ?? "Could not load the live catalogue" });
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
  }, [configured, category, q, limit, nonce]);

  return { ...state, loading, refresh: useCallback(() => setNonce((value) => value + 1), []) };
}

/** Single product page: tries the API slug first, then the demo catalogue of the same slug. */
export function useStoreProduct(slug: string): Resource<Product | null> {
  const configured = isApiConfigured();
  const [state, setState] = useState<{ data: Product | null; source: DataSource; error: string | null }>(() => ({
    data: bySlug(slug) ?? null,
    source: "demo",
    error: null,
  }));
  const [loading, setLoading] = useState(configured);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    /* The demo catalogue is bundled, so there is nothing to fetch while the API is unset. */
    if (!configured) return;
    const controller = new AbortController();
    let cancelled = false;
    const load = async () => {
      await Promise.resolve();
      if (cancelled) return;
      const demoProduct = bySlug(slug) ?? null;
      setLoading(true);
      try {
        const product = await getProduct(slug, controller.signal);
        if (!cancelled) setState({ data: product, source: "live", error: null });
      } catch (cause) {
        if ((cause as Error)?.name === "AbortError") return;
        if (!cancelled) {
          setState({ data: demoProduct, source: "demo", error: (cause as Error)?.message ?? "Could not load this product" });
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

  /* Without the API, always answer from the bundled catalogue so the slug stays in sync. */
  const resolved = configured
    ? state
    : { data: bySlug(slug) ?? null, source: "demo" as DataSource, error: null };

  return { ...resolved, loading: configured && loading, refresh: useCallback(() => setNonce((value) => value + 1), []) };
}

/** Signed-in customer's orders. Requires a session; returns an empty list for guests. */
export function useMyOrders(enabled: boolean): Resource<StoreOrder[]> {
  const configured = isApiConfigured();
  const [state, setState] = useState<{ data: StoreOrder[]; source: DataSource; error: string | null }>({ data: [], source: "demo", error: null });
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
        if (!cancelled) setState({ data: [], source: "demo", error: (cause as Error)?.message ?? "Could not load your orders" });
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
