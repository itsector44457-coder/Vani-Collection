import type { Metadata } from "next";
import { privatePageMetadata } from "../../lib/private-page";

export const metadata: Metadata = privatePageMetadata("Create an account", "Create a Demo Collection account for faster checkout, order tracking and rewards.");

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
