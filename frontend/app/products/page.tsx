import type { Metadata } from "next";
import ProductsView from "./products-view";
import BreadcrumbSchema from "@/components/seo/breadcrumb-schema";
import { JsonLd } from "@/components/seo/json-ld";
import { collectionPageSchema } from "@/components/seo/schema";
import { fetchServerProducts } from "@/lib/server-catalogue";
import {
  absoluteUrl,
  categoryLabel,
  categoryUrl,
  fetchSeoCategories,
  fetchSeoCategory,
  SITE_NAME,
  SITE_TAGLINE,
  truncate,
} from "@/lib/seo";

interface ProductsPageProps {
  searchParams: Promise<{ category?: string; search?: string; sort?: string; price?: string; fabric?: string; sizes?: string; color?: string; availability?: string; offer?: string }>;
}

/** The listing HTML (grid included) is regenerated at most every five minutes. */
export const revalidate = 300;

/**
 * The listing mirrors `price`, `fabric`, `sort` and `search` into the URL, which would otherwise
 * create an unbounded set of duplicate indexable pages for one catalogue.
 *
 * - The canonical consolidates every filtered permutation onto the clean category landing page
 *   (`/collections/<slug>`); this faceted view stays fully usable for shoppers.
 * - A `search` query is `noindex` outright: results pages are thin, near-duplicate and not something
 *   a shopper should land on from Google.
 */
function canonicalFor(category?: string): string {
  return category && category !== "all" ? categoryUrl(category) : absoluteUrl("/products");
}

const COLLECTION_DESCRIPTION = `Shop handcrafted pure mul cotton, Bagru handblock prints, co-ord sets, Anarkalis and festive heirlooms from ${SITE_NAME}, Guna. ${SITE_TAGLINE}.`;

export async function generateMetadata({ searchParams }: ProductsPageProps): Promise<Metadata> {
  const params = await searchParams;
  const category = params.category && params.category !== "all" ? params.category : undefined;
  const isSearch = Boolean(params.search?.trim());
  const canonical = canonicalFor(category);

  if (isSearch) {
    const term = truncate(params.search, 60);
    return {
      title: { absolute: `Search: ${term} | ${SITE_NAME}` },
      description: `Results for “${term}” in the ${SITE_NAME} catalogue.`,
      // Not canonicalised to /products — a search page is simply kept out of the index.
      robots: { index: false, follow: true },
    };
  }

  const label = categoryLabel(category);
  const title = category ? `${label} | ${SITE_NAME}` : `Our Collection | ${SITE_NAME}`;
  const description = category
    ? truncate(`${label} handcrafted in Guna by ${SITE_NAME} — pure mul cotton, handblock prints and festive weaves. Free shipping over ₹1,999.`, 158)
    : truncate(COLLECTION_DESCRIPTION, 158);

  return {
    // `absolute` for the same reason as the product page: these titles are already branded, and the
    // root template would double the suffix.
    title: { absolute: title },
    description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      url: canonical,
      siteName: SITE_NAME,
      title,
      description,
      locale: "en_IN",
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = await searchParams;
  const category = params.category && params.category !== "all" ? params.category : undefined;
  const isSearch = Boolean(params.search?.trim());

  // Server-rendered first paint: the grid below arrives as real HTML (names, prices, photos, links)
  // for crawlers and slow phones; the client view then owns filtering/sorting without refetching.
  const [initialCatalogue, seoCategories] = await Promise.all([
    fetchServerProducts({ category, q: params.search, limit: 100, maxProducts: 500 }),
    fetchSeoCategories(),
  ]);
  const initialCategories = seoCategories.map((item, index) => ({
    name: item.name,
    slug: item.slug,
    description: item.description,
    guideContent: item.guideContent,
    seo: item.seo,
    faqs: item.faqs,
    bannerImage: item.bannerImage,
    navigationGroup: item.navigationGroup ?? "Collections",
    position: item.position ?? index,
    isActive: true,
  }));

  // Search pages are noindex, so there is no point marking them up.
  if (isSearch) {
    return <ProductsView initialProducts={initialCatalogue?.products} initialCategories={initialCategories} />;
  }

  const label = categoryLabel(category);
  const title = category ? `${label} | ${SITE_NAME}` : `Our Collection | ${SITE_NAME}`;
  const description = category
    ? `${label} handcrafted in Guna by ${SITE_NAME}.`
    : COLLECTION_DESCRIPTION;

  const products = await fetchSeoCategory(category, 30);
  const path = category ? `/collections/${encodeURIComponent(category)}` : "/products";

  return (
    <>
      <JsonLd
        data={collectionPageSchema(
          title,
          truncate(description, 300),
          path,
          products.map((product) => product.name),
          products.filter((product) => product.slug).map((product) => ({ name: product.name, slug: product.slug }))
        )}
      />
      <BreadcrumbSchema
        items={
          category
            ? [
                { name: "Home", path: "/" },
                { name: "Our Collection", path: "/products" },
                { name: label, path },
              ]
            : [
                { name: "Home", path: "/" },
                { name: "Our Collection", path: "/products" },
              ]
        }
      />
      <ProductsView initialProducts={initialCatalogue?.products} initialCategories={initialCategories} />
    </>
  );
}
