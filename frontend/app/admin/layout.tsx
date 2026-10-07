import type { Metadata } from "next";
import AdminShell from "./admin-shell";

/**
 * The admin console is private, so it is marked `noindex, nofollow` here and also `Disallow`-ed in
 * `app/robots.ts`.
 *
 * Worth being precise about what each one does, because they interact:
 * - `Disallow` stops crawlers *fetching* the page, which saves crawl budget but does not deindex a
 *   URL — Google can still list `/admin` from external links, with no snippet.
 * - `noindex` deindexes it, but Google can only read the tag if it is allowed to fetch the page.
 *
 * So with both in place the tag is belt-and-braces rather than the primary control: the console sits
 * behind staff authentication, an unauthenticated crawler is redirected to `/admin/login`, and the
 * `Disallow` keeps it out of the crawl entirely. If this console were ever made publicly reachable,
 * the `/admin` entries should come out of `robots.ts` so the `noindex` tag can actually be seen.
 *
 * This file has to be a Server Component to export metadata at all, which is why the client chrome
 * moved to `admin-shell.tsx`.
 */
export const metadata: Metadata = {
  title: {
    default: "Admin Console",
    template: "%s · Admin Console",
  },
  description: "Vani Collection staff console.",
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
  // No canonical: these URLs must never be presented as the preferred version of anything.
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
