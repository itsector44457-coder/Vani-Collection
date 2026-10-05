"use client";

import type { ApiResource } from "@/lib/use-api";

interface Props {
  resource: { source: "live" | "demo"; loading: boolean; error: string | null; refresh: () => void };
  label?: string;
}

/** Small, honest indicator telling staff whether a screen is showing backend data or demo data. */
export default function AdminDataBadge({ resource, label }: Props) {
  const { source, loading, error, refresh } = resource as ApiResource<unknown>;
  const live = source === "live";
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold ${
          live ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
        }`}
        title={error ?? undefined}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${live ? "bg-emerald-500" : "bg-amber-500"}`} />
        {loading ? "Syncing…" : live ? (label ? `Live · ${label}` : "Live API") : "Demo data"}
      </span>
      <button
        type="button"
        onClick={refresh}
        className="rounded-full border border-[#ebe6de] bg-white px-2.5 py-1 font-semibold text-stone-500 transition hover:border-[#dfc28c] hover:text-[#881337]"
      >
        Refresh
      </button>
    </div>
  );
}
