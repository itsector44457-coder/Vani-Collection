import Navbar from "./Navbar";
import Footer from "./Footer";
import FloatingContactMenu from "./FloatingContactMenu";
import ScrollFlipObserver from "./ScrollFlipObserver";

/**
 * The one storefront chrome: skip link, navigation, main landmark, footer, floating contact.
 *
 * Every shopping surface renders through this shell — the (main) group, the catalogue listing and
 * product pages. Product and listing routes previously lived outside the (main) layout and shipped
 * with no navigation or footer at all, so a shopper landing from search had no way to browse,
 * search, or reach the cart from the two pages that matter most.
 */
export default function StorefrontShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <Navbar />
      <main id="main-content" tabIndex={-1} className="flex-grow pb-16 outline-none lg:pb-0">
        {children}
        <ScrollFlipObserver />
      </main>
      <Footer />
      <FloatingContactMenu />
    </>
  );
}
