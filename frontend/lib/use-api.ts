"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, isApiConfigured } from "./api-client";

export type DataSource = "live" | "unavailable";

export interface ApiResource<T> {
  data: T;
  /** `live` when the value came from the backend, otherwise `unavailable`. */
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

function emptyShape<T>(template: T): T {
  if (template instanceof Date) return "" as T;
  if (Array.isArray(template)) return [] as T;
  if (template && typeof template === "object") {
    return Object.fromEntries(
      Object.entries(template).map(([key, value]) => [key, emptyShape(value)]),
    ) as T;
  }
  if (typeof template === "number") return 0 as T;
  if (typeof template === "string") return "" as T;
  if (typeof template === "boolean") return false as T;
  return template;
}

/**
 * Loads data from the backend when configured. The demo payload is used only as a shape template
 * to produce an empty value; sample records are never displayed.
 */
export function useApiResource<T>(
  loader: ((signal: AbortSignal) => Promise<T>) | null,
  demoData: T,
  deps: unknown[] = []
): ApiResource<T> {
  const configured = isApiConfigured();
  const [state, setState] = useState<ResourceState<T>>({ data: emptyShape(demoData), source: "unavailable", error: null });
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
      setState({
        data: emptyShape(demoRef.current),
        source: "unavailable",
        error: isApiConfigured()
          ? "This live data source is not available."
          : "The API is not configured. Live records are unavailable.",
      });
      setLoading(false);
      return () => controller.abort();
    }
    setLoading(true);
    activeLoader(controller.signal)
      .then((result) => setState({ data: result, source: "live", error: null }))
      .catch((cause: unknown) => {
        if ((cause as Error)?.name === "AbortError") return;
        setState({
          data: emptyShape(demoRef.current),
          source: "unavailable",
          error: cause instanceof ApiError ? `${cause.message} (${cause.status || "network"})` : "Could not load live data",
        });
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nonce, configured, ...deps]);

  return { data: state.data, source: state.source, error: state.error, loading, refresh };
}
