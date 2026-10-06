/**
 * The single way structured data reaches the document.
 *
 * A plain `<script type="application/ld+json">` is what Google's own guidance recommends — *not*
 * `next/script`, which defers execution and can leave a crawler with no structured data in the
 * initial HTML. `<` is escaped to `\u003c` so product copy containing `</script>` cannot break out
 * of the tag.
 */

import type { ReactElement } from "react";

export type JsonLdValue = string | number | boolean | null | undefined | JsonLdValue[] | { [key: string]: JsonLdValue };

/** Serialises structured data, escaping the one sequence that can terminate a script tag. */
export function serialiseJsonLd(data: JsonLdValue): string {
  return JSON.stringify(data ?? null).replace(/</g, "\\u003c");
}

/** Drops keys whose value is `undefined` or `null` so the emitted JSON stays clean and valid. */
export function compact<T extends Record<string, unknown>>(input: T): Partial<T> {
  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value) && value.length === 0) continue;
    output[key] = value;
  }
  return output as Partial<T>;
}

export function JsonLd({ data }: { data: JsonLdValue }): ReactElement | null {
  if (!data) return null;
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serialiseJsonLd(data) }} />;
}

/** Emits several blocks at once — a `@graph` is not required and separate blocks are simpler to debug. */
export function JsonLdGroup({ items }: { items: (JsonLdValue | null | undefined)[] }): ReactElement {
  return (
    <>
      {items.filter(Boolean).map((item, index) => (
        <JsonLd key={index} data={item as JsonLdValue} />
      ))}
    </>
  );
}
