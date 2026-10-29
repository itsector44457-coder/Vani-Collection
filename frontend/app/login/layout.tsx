import type { Metadata } from "next";
import { privatePageMetadata } from "../../lib/private-page";

export const metadata: Metadata = privatePageMetadata("Sign in", "Sign in to your Demo Collection account.");

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
