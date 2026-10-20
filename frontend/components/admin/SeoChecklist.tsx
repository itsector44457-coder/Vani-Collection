"use client";

export interface SeoCheck {
  label: string;
  pass: boolean;
  hint?: string;
}

/**
 * Live "before you publish" checklist for editors. It only *warns* — saving is never blocked —
 * but it makes the common SEO misses (no meta description, title too long, missing image alt,
 * thin copy) visible at the moment they can still be fixed in ten seconds.
 */
export default function SeoChecklist({ checks, title = "SEO checklist" }: { checks: SeoCheck[]; title?: string }) {
  const passed = checks.filter((check) => check.pass).length;
  const complete = passed === checks.length;

  return (
    <section aria-label={title} className={`rounded-2xl border p-4 ${complete ? "border-emerald-200 bg-emerald-50/60" : "border-amber-200 bg-amber-50/60"}`}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[12px] font-bold uppercase tracking-[0.12em] text-stone-700">{title}</h3>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${complete ? "bg-emerald-600 text-white" : "bg-amber-500 text-white"}`}>
          {passed}/{checks.length} ready
        </span>
      </div>
      <ul className="mt-3 space-y-2">
        {checks.map((check) => (
          <li key={check.label} className="flex items-start gap-2.5 text-[12.5px]">
            <span
              aria-hidden="true"
              className={`mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ${check.pass ? "bg-emerald-600" : "bg-amber-500"}`}
            >
              {check.pass ? "✓" : "!"}
            </span>
            <span className={check.pass ? "text-stone-600" : "font-medium text-stone-800"}>
              {check.label}
              {!check.pass && check.hint ? <span className="block text-[11.5px] font-normal text-stone-500">{check.hint}</span> : null}
            </span>
            <span className="sr-only">{check.pass ? "Done" : "Needs attention"}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
