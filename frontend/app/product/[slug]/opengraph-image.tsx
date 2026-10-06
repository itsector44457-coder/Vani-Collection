import { ImageResponse } from "next/og";
import { brandCard, fetchCardImage, OG_SIZE, productCard } from "@/components/seo/og-card";
import { fetchSeoProduct, lowestVariant, productImageUrls } from "@/lib/seo";

/**
 * Per-product social card.
 *
 * Rendered on demand and cached for an hour, so a price or photograph change reaches shared links
 * without a redeploy. The product photo is fetched as bytes *before* handing the card to satori: a
 * URL passed straight to `<img>` would make an unreachable CDN throw and turn this route into a 500,
 * whereas a failed fetch simply produces the text-only card.
 *
 * When the catalogue has no record of the slug the brand card is used instead. Inventing a price or
 * a product name on a shared link would be worse than showing no product at all.
 */

export const revalidate = 3600;

export const alt = "Vani Collection — handcrafted pure mul cotton and festive wear from Jaipur";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function ProductOpenGraphImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await fetchSeoProduct(slug);
  if (!product) return new ImageResponse(brandCard(), { ...size });

  const cheapest = lowestVariant(product);
  const image = await fetchCardImage(productImageUrls(product)[0]);

  return new ImageResponse(
    productCard({
      name: product.name,
      category: product.category,
      price: cheapest?.price,
      mrp: cheapest && cheapest.mrp > cheapest.price ? cheapest.mrp : undefined,
      fabric: product.fabric || product.craft,
      image,
    }),
    { ...size }
  );
}
