import type { Metadata } from "next";
import FaqSchema from "../../components/seo/faq-schema";
import { fetchHomepageContent, fetchPublishedReels, DEFAULT_TESTIMONIALS } from "../../lib/content";
import { absoluteUrl } from "../../lib/seo";
import HomeView from "./home-view";

/** Published CMS changes are read on the next homepage request; do not cache the page output. */
export const revalidate = 0;

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
  const [content, reels] = await Promise.all([
    fetchHomepageContent({
      banners: [],
      testimonials: DEFAULT_TESTIMONIALS,
      lookbook: { title: "", subtitle: "", image: "", pins: [] },
      stories: [],
    }),
    fetchPublishedReels(),
  ]);

  return (
    <>
      {/* Driven by the same array the visible accordion renders, so the markup can never describe
          content the reader cannot see. Emits nothing when the CMS has no FAQ blocks. */}
      <FaqSchema items={content.faqs} />
      <HomeView
        banners={content.banners}
        testimonials={content.testimonials}
        lookbook={content.lookbook}
        lookbooks={content.lookbooks}
        stories={content.stories}
        faqs={content.faqs}
        productCollection={content.productCollection}
        fromCms={content.fromCms}
        reels={reels}
      />
    </>
  );
}
