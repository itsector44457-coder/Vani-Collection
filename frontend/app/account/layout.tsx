import type { Metadata } from "next";
import AccountShell from "./account-shell";

/**
 * The signed-in account area is per-shopper and login-gated, so indexing it would only put thin,
 * duplicate URLs in the SERP. Marked `noindex, nofollow` here and `Disallow`-ed in `app/robots.ts`
 * (see the note in `app/admin/layout.tsx` for how those two interact).
 *
 * Server Component for the metadata export; the client chrome lives in `account-shell.tsx`.
 */
export const metadata: Metadata = {
  title: {
    default: "My Account",
    template: "%s · My Account",
  },
  description: "Manage your Vani Collection orders, wishlist, addresses and rewards.",
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return <AccountShell>{children}</AccountShell>;
}
