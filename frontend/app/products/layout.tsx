import StorefrontShell from "../../components/StorefrontShell";

/** Catalogue listing chrome — same shell as the (main) group (navigation, footer, skip link). */
export default function ProductsLayout({ children }: { children: React.ReactNode }) {
  return <StorefrontShell>{children}</StorefrontShell>;
}
