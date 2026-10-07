/**
 * FAQPage structured data.
 *
 * Only mount this where the questions and answers are **visibly rendered** on the same page — the
 * homepage FAQ block wired to `/api/content?kind=faq`. Google treats FAQ markup for content the
 * reader cannot see as a spam signal, so an empty or mismatched list renders nothing.
 */

import { JsonLd } from "./json-ld";
import { faqSchema, type FaqEntry } from "./schema";

export default function FaqSchema({ items }: { items: FaqEntry[] }) {
  const data = faqSchema(items);
  if (!data) return null;
  return <JsonLd data={data} />;
}

export type { FaqEntry };
