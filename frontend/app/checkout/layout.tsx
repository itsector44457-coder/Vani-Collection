import type { Metadata } from "next";
import { privatePageMetadata } from "../../lib/private-page";

export const metadata: Metadata = privatePageMetadata("Checkout", "Complete your Vani Collection order securely.");

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
