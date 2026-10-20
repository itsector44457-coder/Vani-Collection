import StorefrontShell from "../../components/StorefrontShell";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <StorefrontShell>{children}</StorefrontShell>;
}
