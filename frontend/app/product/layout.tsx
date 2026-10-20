import StorefrontShell from "../../components/StorefrontShell";

/** Product-page chrome — same shell as the (main) group (navigation, footer, skip link). */
export default function ProductLayout({ children }: { children: React.ReactNode }) {
  return <StorefrontShell>{children}</StorefrontShell>;
}
