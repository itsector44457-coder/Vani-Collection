import type { Metadata, Viewport } from "next";
import "lenis/dist/lenis.css";
import "./globals.css";
import SmoothScroll from "../components/SmoothScroll";
import { CartProvider } from "../context/CartContext";
import { AuthProvider } from "../context/AuthContext";
import CartDrawer from "../components/CartDrawer";
import QuickViewModal from "../components/QuickViewModal";
import SiteSchema from "../components/seo/site-schema";
import { SITE_LOCALE, SITE_NAME, SITE_TAGLINE, SITE_URL } from "../lib/seo";

const SITE_DESCRIPTION =
  "Discover handcrafted luxury in 100-count pure Mul Cotton, Bagru handblock prints, royal Anarkalis, and festive heirlooms by Vani Collection Atelier, Jaipur.";

export const metadata: Metadata = {
  // Every relative URL in `openGraph`, `twitter` and `alternates` resolves against this, so it has
  // to be the canonical public origin rather than a preview host.
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} | ${SITE_TAGLINE}`,
    // Product and category pages set their own `title`; this keeps the brand on the end of it.
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: "mul cotton suits, bagru handblock print, anarkali sets, festive suits, women ethnic wear, jaipur atelier",
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: "shopping",
  formatDetection: { email: false, address: false, telephone: false },
  // Deliberately NO `alternates.canonical` here. A canonical set in the root layout is inherited by
  // every route that does not declare its own, which would tell Google that /admin, /account,
  // /checkout, /login and the noindex search pages are all duplicates of the homepage — a wrong
  // canonical is more damaging than none. Each indexable page sets its own in `generateMetadata`.
  openGraph: {
    type: "website",
    locale: SITE_LOCALE,
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} | ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    // `images` is supplied by app/opengraph-image.tsx, which takes precedence over this object.
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} | ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    site: "@vanicollection",
    creator: "@vanicollection",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      {
        url: '/favicon.svg',
        type: 'image/svg+xml',
      },
      {
        url: '/favicon.ico',
        sizes: '32x32',
      },
    ],
    apple: {
      url: '/favicon.svg',
      type: 'image/svg+xml',
    },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#faf7f2",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-IN" className="antialiased">
      <body className="min-h-screen flex flex-col bg-[#faf7f2] text-[#1c1917] selection:bg-[#881337] selection:text-white">
        {/* Organization + WebSite/SearchAction, emitted once for the whole site. Every Product,
            CollectionPage and BreadcrumbList node points back at these two by @id. */}
        <SiteSchema />
        <AuthProvider>
          <CartProvider>
            <SmoothScroll>
              {children}
              <CartDrawer />
              <QuickViewModal />
            </SmoothScroll>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}