import type { Metadata, Viewport } from "next";
import "lenis/dist/lenis.css";
import "./globals.css";
import SmoothScroll from "../components/SmoothScroll";
import { CartProvider } from "../context/CartContext";
import { AuthProvider } from "../context/AuthContext";
import CartDrawer from "../components/CartDrawer";
import QuickViewModal from "../components/QuickViewModal";

export const metadata: Metadata = {
  title: "Vani Collection | Artisanal Pure Mul Cotton & Festive Wear",
  description: "Discover handcrafted luxury in 100-count pure Mul Cotton, Bagru handblock prints, royal Anarkalis, and festive heirlooms by Vani Collection Atelier, Jaipur.",
  keywords: "mul cotton suits, bagru handblock print, anarkali sets, festive suits, women ethnic wear, jaipur atelier",
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
    <html lang="en" className="antialiased">
      <body className="min-h-screen flex flex-col bg-[#faf7f2] text-[#1c1917] selection:bg-[#881337] selection:text-white">
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