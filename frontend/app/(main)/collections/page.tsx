import type { Metadata } from "next";
import BreadcrumbSchema from "@/components/seo/breadcrumb-schema";
import { JsonLd } from "@/components/seo/json-ld";
import { collectionPageSchema } from "@/components/seo/schema";
import { absoluteUrl, SITE_NAME } from "@/lib/seo";
import CollectionsView from "./collections-view";

const title = `Shop by Collection | ${SITE_NAME}`;
const description = `Explore handcrafted collections from ${SITE_NAME}, Guna — from breathable Mul Cotton and everyday Kurta Sets to festive heirlooms and Sarees.`;

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical: absoluteUrl("/collections") },
  openGraph: {
    type: "website",
    url: absoluteUrl("/collections"),
    siteName: SITE_NAME,
    title,
    description,
    locale: "en_IN",
  },
  twitter: { card: "summary_large_image", title, description },
};

export default function CollectionsPage() {
  return (
    <>
      <JsonLd data={collectionPageSchema(title, description, "/collections")} />
      <BreadcrumbSchema
        items={[
          { name: "Home", path: "/" },
          { name: "Collections", path: "/collections" },
        ]}
      />
      <CollectionsView />
    </>
  );
}
