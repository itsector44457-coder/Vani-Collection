"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, isApiConfigured } from "./api-client";

export type DataSource = "live" | "demo";

export interface ApiResource<T> {
  data: T;
  /** `live` when the value came from the backend, `demo` when the bundled demo data is shown. */
  source: DataSource;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

interface ResourceState<T> {
  data: T;
  source: DataSource;
  error: string | null;
}

/**
 * Loads data from the backend when NEXT_PUBLIC_API_URL is configured and falls back to the demo
 * payload otherwise (or when the request fails), so the admin console never shows a blank screen.
 */
export function useApiResource<T>(
  loader: ((signal: AbortSignal) => Promise<T>) | null,
  demoData: T,
  deps: unknown[] = []
): ApiResource<T> {
  const configured = isApiConfigured();
  const [state, setState] = useState<ResourceState<T>>({ data: demoData, source: "demo", error: null });
  const [loading, setLoading] = useState<boolean>(Boolean(loader) && configured);
  const [nonce, setNonce] = useState(0);

  // Latest values are mirrored into refs after render so the effect below can stay stable.
  const loaderRef = useRef(loader);
  const demoRef = useRef(demoData);
  useEffect(() => {
    loaderRef.current = loader;
    demoRef.current = demoData;
  });

  const refresh = useCallback(() => setNonce((value) => value + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    const activeLoader = loaderRef.current;
    if (!activeLoader || !isApiConfigured()) {
      setState({ data: demoRef.current, source: "demo", error: isApiConfigured() ? null : "Demo data — set NEXT_PUBLIC_API_URL to load live records" });
      setLoading(false);
      return () => controller.abort();
    }
    setLoading(true);
    activeLoader(controller.signal)
      .then((result) => setState({ data: result, source: "live", error: null }))
      .catch((cause: unknown) => {
        if ((cause as Error)?.name === "AbortError") return;
        setState({
          data: demoRef.current,
          source: "demo",
          error: cause instanceof ApiError ? `${cause.message} (${cause.status || "network"})` : "Could not load live data",
        });
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nonce, configured, ...deps]);

  return { data: state.data, source: state.source, error: state.error, loading, refresh };
}
