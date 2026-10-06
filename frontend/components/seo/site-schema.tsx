/**
 * Site-wide structured data: the Organization and WebSite nodes every other block points at by
 * `@id`. Rendered once from the root layout.
 */

import { JsonLdGroup } from "./json-ld";
import { organizationSchema, websiteSchema } from "./schema";

export default function SiteSchema() {
  return <JsonLdGroup items={[organizationSchema(), websiteSchema()]} />;
}
