/**
 * BreadcrumbList for any page that renders a visible breadcrumb trail. Keep the `items` in sync
 * with what is on screen — markup that disagrees with the rendered trail is worse than none.
 */

import { JsonLd } from "./json-ld";
import { breadcrumbSchema, type BreadcrumbEntry } from "./schema";

export default function BreadcrumbSchema({ items }: { items: BreadcrumbEntry[] }) {
  const data = breadcrumbSchema(items);
  if (!data) return null;
  return <JsonLd data={data} />;
}
