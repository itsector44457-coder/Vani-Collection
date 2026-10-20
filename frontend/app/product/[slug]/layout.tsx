import type { ReactNode } from "react";
import { notFound, permanentRedirect } from "next/navigation";
import { fetchServerProduct } from "@/lib/server-catalogue";

interface ProductSlugLayoutProps {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}

/**
 * Resolve existence before the route's loading shell is streamed.
 *
 * The page itself also resolves the product for its initial props, but that work sits behind
 * `loading.tsx`: a `notFound()` thrown there only swaps the streamed segment and leaves the HTTP
 * status at 200. Doing the same catalogue check in the segment layout (outside that Suspense
 * boundary) lets a definite API 404 become a real HTTP 404 and an old slug become a real 308.
 * An unreachable API remains non-fatal — the page/client can still recover instead of incorrectly
 * declaring a live product missing during an outage.
 */
export default async function ProductSlugLayout({ children, params }: ProductSlugLayoutProps) {
  const { slug } = await params;
  const result = await fetchServerProduct(slug);

  if (result.status === "not_found") notFound();
  if (result.status === "found" && result.product.slug && result.product.slug !== slug) {
    permanentRedirect(`/product/${result.product.slug}`);
  }

  return children;
}
