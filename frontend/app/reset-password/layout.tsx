import type { Metadata } from "next";
import { privatePageMetadata } from "../../lib/private-page";

export const metadata: Metadata = privatePageMetadata("Reset your password", "Choose a new password for your Vani Collection account.");

export default function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
