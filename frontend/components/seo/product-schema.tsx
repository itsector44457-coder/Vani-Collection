/**
 * Product structured data for `/product/[slug]`.
 *
 * An async Server Component so the markup is built from the same live catalogue the page renders:
 * the product (with its real `inventory` map), the published-review aggregate behind
 * `aggregateRating`, and the reviews themselves behind `review`.
 *
 * Renders nothing when the product cannot be fetched. Emitting a `Product` node with a guessed
 * price, a guessed `availability` or a fabricated rating is a rich-result violation, whereas
 * omitting it merely forfeits the enhancement until the backend is reachable again.
 */

import { fetchSeoProduct, fetchSeoReviews, fetchSeoReviewSummary } from "@/lib/seo";
import { JsonLdGroup } from "./json-ld";
import { itemPageSchema, productBreadcrumbSchema, breadcrumbSchema, productSchema } from "./schema";
import { productDescription, productTitle } from "@/lib/seo";

export default async function ProductSchema({ slug }: { slug: string }) {
  const product = await fetchSeoProduct(slug);
  if (!product) return null;

  // Both calls are memoised against the identical fetches `generateMetadata` makes for this
  // request, so the product is only retrieved once per render.
  const [reviewSummary, reviews] = await Promise.all([
    fetchSeoReviewSummary(product._id),
    fetchSeoReviews(product._id),
  ]);

  return (
    <JsonLdGroup
      items={[
        itemPageSchema(product, productTitle(product), productDescription(product)),
        breadcrumbSchema(productBreadcrumbSchema(product)),
        productSchema({ product, reviewSummary, reviews }),
      ]}
    />
  );
}
