import type { Metadata, Viewport } from "next";
import { Playfair_Display, Plus_Jakarta_Sans } from "next/font/google";
import "lenis/dist/lenis.css";
import "./globals.css";
import Navbar from "../components/Navbar";
import SmoothScroll from "../components/SmoothScroll";
import { CartProvider } from "../context/CartContext";
import CartDrawer from "../components/CartDrawer";
import QuickViewModal from "../components/QuickViewModal";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Vani Collection | Artisanal Pure Mul Cotton & Festive Wear",
  description: "Discover handcrafted luxury in 100-count pure Mul Cotton, Bagru handblock prints, royal Anarkalis, and festive heirlooms by Vani Collection Atelier, Jaipur.",
  keywords: "mul cotton suits, bagru handblock print, anarkali sets, festive suits, women ethnic wear, jaipur atelier",
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
    <html
      lang="en"
      className={`${playfair.variable} ${plusJakarta.variable} antialiased`}
    >
      <body className="min-h-screen flex flex-col bg-[#faf7f2] text-[#1c1917] selection:bg-[#881337] selection:text-white">
        <CartProvider>
          <SmoothScroll>
            <Navbar />
            <main className="flex-grow">{children}</main>
            <CartDrawer />
            <QuickViewModal />
          </SmoothScroll>
        </CartProvider>
      </body>
    </html>
  );
}