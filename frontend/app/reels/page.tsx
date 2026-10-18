import type { Metadata } from "next";
import Link from "next/link";
import ReelsExperience from "../../components/ReelsExperience";
import BreadcrumbSchema from "@/components/seo/breadcrumb-schema";
import { fetchPublishedReels } from "../../lib/content";
import { absoluteUrl, SITE_NAME } from "@/lib/seo";

export const revalidate = 30;

export async function generateMetadata(): Promise<Metadata> {
  const canonical = absoluteUrl("/reels");
  return {
    title: `Fashion Reels & Style Video Guides | ${SITE_NAME}`,
    description: `Watch styling showcases, drape guides, and handcrafted Kurti & festive wear video reels from ${SITE_NAME}, Guna. Speciality in Fancy Kurties & Party Wear Dresses.`,
    alternates: { canonical },
    keywords: [
      "vani collection reels",
      "kurti styling reels",
      "suit set video",
      "party wear dresses video",
      "ethnic wear instagram reels",
      "anarkali video styling",
    ],
    openGraph: {
      type: "website",
      url: canonical,
      siteName: SITE_NAME,
      title: `Fashion Reels & Style Guides | ${SITE_NAME}`,
      description: `Watch styling showcases, drape guides, and handcrafted Kurti & festive wear video reels from ${SITE_NAME}, Guna.`,
      locale: "en_IN",
    },
    twitter: {
      card: "summary_large_image",
      title: `Fashion Reels & Style Guides | ${SITE_NAME}`,
      description: `Watch styling showcases, drape guides, and handcrafted Kurti & festive wear video reels from ${SITE_NAME}, Guna.`,
    },
  };
}

export default async function ReelsPage() {
  const reels = await fetchPublishedReels();

  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: "Home", path: "/" },
          { name: "Fashion Reels", path: "/reels" },
        ]}
      />
      {!reels.length ? (
        <main className="flex min-h-[80vh] flex-col items-center justify-center bg-[#faf7f2] px-4 py-16 text-center">
          <h1 className="font-serif text-3xl text-stone-900">Reels are unavailable</h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-stone-600">
            There are no active reels linked to available products right now.
          </p>
          <Link
            href="/products"
            className="mt-6 rounded-xl bg-[#881337] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#701a35]"
          >
            Browse Products
          </Link>
        </main>
      ) : (
        <ReelsExperience reels={reels} />
      )}
    </>
  );
}
