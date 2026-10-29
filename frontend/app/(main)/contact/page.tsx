import type { Metadata } from "next";
import ContactView from "./contact-view";
import BreadcrumbSchema from "@/components/seo/breadcrumb-schema";
import { absoluteUrl, SITE_NAME } from "@/lib/seo";

/**
 * Contact page — Server Component wrapper that exports `generateMetadata` for full SEO
 * (title, description, canonical, Open Graph, Twitter), then renders the interactive
 * `ContactView` client component.
 */

export const metadata: Metadata = {
  title: `Contact Us | ${SITE_NAME}`,
  description: `Get in touch with ${SITE_NAME} — our flagship atelier in Demo City, India. Visit us on Demo Street, call, WhatsApp or email demo@example.com for styling help, custom orders, and private appointments.`,
  alternates: { canonical: absoluteUrl("/contact") },
  keywords: [
    "Vani Collection contact",
    "Vani Collection Demo",
    "Demo store address",
    "kurta shop demo",
    "ethnic wear demo India",
    "Vani Collection phone number",
    "fancy kurties demo",
  ],
  openGraph: {
    type: "website",
    url: absoluteUrl("/contact"),
    siteName: SITE_NAME,
    title: `Contact Us | ${SITE_NAME}`,
    description: `Visit ${SITE_NAME} atelier on Demo Street, Demo City, India. Mon–Sat 10:30 AM – 7:30 PM. WhatsApp for private styling appointments.`,
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: `Contact Us | ${SITE_NAME}`,
    description: `Visit ${SITE_NAME} atelier on Demo Street, Demo City, India.`,
  },
};

export default function ContactPage() {
  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: "Home", path: "/" },
          { name: "Contact Us", path: "/contact" },
        ]}
      />
      <ContactView />
    </>
  );
}
