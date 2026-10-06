import type { Metadata } from "next";
import { EDITORIAL_LOOKBOOK, HERO_SLIDES, REVIEWS, STORIES_CATEGORIES } from "../../data/products";
import FaqSchema from "../../components/seo/faq-schema";
import { fetchHomepageContent, type CategoryStory, type HeroSlide, type Lookbook, type Testimonial } from "../../lib/content";
import { absoluteUrl } from "../../lib/seo";
import HomeView from "./home-view";

/**
 * CMS edits should reach shoppers without a redeploy, so the homepage revalidates every five
 * minutes. The content fetches carry their own `revalidate`, and this bounds the page itself.
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
  // The bundled demo data is the fallback for every block, so an empty CMS — or no backend at all —
  // renders exactly the site that shipped before the CMS existed.
  const content = await fetchHomepageContent({
    banners: HERO_SLIDES as HeroSlide[],
    testimonials: REVIEWS as Testimonial[],
    lookbook: EDITORIAL_LOOKBOOK as Lookbook,
    stories: STORIES_CATEGORIES as CategoryStory[],
  });

  return (
    <>
      {/* Driven by the same array the visible accordion renders, so the markup can never describe
          content the reader cannot see. Emits nothing when the CMS has no FAQ blocks. */}
      <FaqSchema items={content.faqs} />
      <HomeView
        banners={content.banners}
        testimonials={content.testimonials}
        lookbook={content.lookbook}
        stories={content.stories}
        faqs={content.faqs}
        fromCms={content.fromCms}
      />
    </>
  );
}
