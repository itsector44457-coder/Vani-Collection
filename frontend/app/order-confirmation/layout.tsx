import type { Metadata } from "next";
import { privatePageMetadata } from "../../lib/private-page";

export const metadata: Metadata = privatePageMetadata("Order confirmation", "Your Demo Collection order confirmation.");

export default function OrderConfirmationLayout({ children }: { children: React.ReactNode }) {
  return children;
}
