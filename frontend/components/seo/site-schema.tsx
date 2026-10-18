/**
 * Site-wide structured data: the Organization, WebSite, and LocalBusiness nodes every other
 * block points at by `@id`. Rendered once from the root layout.
 *
 * The LocalBusiness (ClothingStore) node is critical for local SEO — it powers the Google
 * Maps listing, knowledge panel, and "near me" searches for "Vani Collection Guna".
 */

import { JsonLdGroup } from "./json-ld";
import { localBusinessSchema, organizationSchema, websiteSchema } from "./schema";

export default function SiteSchema() {
  return <JsonLdGroup items={[organizationSchema(), websiteSchema(), localBusinessSchema()]} />;
}
