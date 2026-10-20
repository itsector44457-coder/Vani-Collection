import type { Metadata } from "next";
import FaqSchema from "../../components/seo/faq-schema";
import { fetchHomepageContent, fetchPublishedReels } from "../../lib/content";
import { fetchServerProducts } from "../../lib/server-catalogue";
import { absoluteUrl } from "../../lib/seo";
import HomeView from "./home-view";

/**
 * ISR: the homepage is regenerated at most every five minutes. CMS edits and price/stock changes
 * appear within that window; in return shoppers and crawlers get a cached page whose product grid
 * is already rendered in the HTML (see `fetchServerProducts` below) instead of a per-request build.
 */
export const revalidate = 300;

/**
 * The homepage is the one route whose canonical is unambiguous, so it is declared here rather than
 * in the root layout — a canonical in a layout is inherited by every child route, which would mark
 * the whole site as a duplicate of `/`.
 */
export const metadata: Metadata = {
  alternates: { canonical: absoluteUrl("/") },
  openGraph: { url: absoluteUrl("/"), type: "website" },
};

export default async function HomePage() {
  const [content, reels, initialCatalogue] = await Promise.all([
    fetchHomepageContent({
      banners: [],
      lookbook: { title: "", subtitle: "", image: "", pins: [] },
    }),
    fetchPublishedReels(),
    // Server-rendered first paint for the shop-the-look grid; `null` (catalogue unreachable) keeps
    // the previous client-fetch behaviour inside HomeView.
    fetchServerProducts({ limit: 60 }),
  ]);

  return (
    <>
      {/* Driven by the same array the visible accordion renders, so the markup can never describe
          content the reader cannot see. Emits nothing when the CMS has no FAQ blocks. */}
      <FaqSchema items={content.faqs} />
      <HomeView
        founder={content.founder}
        testimonials={content.testimonials}
        lookbook={content.lookbook}
        lookbooks={content.lookbooks}
        faqs={content.faqs}
        productCollection={content.productCollection}
        fromCms={content.fromCms}
        reels={reels}
        initialProducts={initialCatalogue?.products}
      />
    </>
  );
}
