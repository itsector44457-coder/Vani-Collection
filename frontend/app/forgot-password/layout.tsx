import type { Metadata } from "next";
import { privatePageMetadata } from "../../lib/private-page";

export const metadata: Metadata = privatePageMetadata("Forgot your password", "Request a password reset link for your Demo Collection account.");

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
