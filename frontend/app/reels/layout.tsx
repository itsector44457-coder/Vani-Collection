import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reels · Vani Collection",
  description: "Shoppable short films from the Vani Collection atelier — handblock, chanderi and co-ord drops you can buy straight from the feed.",
};

/**
 * Full-bleed reels experience: no storefront navbar, no page padding. The page itself renders a
 * `position: fixed` stage sized to the dynamic viewport, so this wrapper stays out of the way.
 */
export default function ReelsLayout({ children }: { children: React.ReactNode }) {
  return <div className="bg-[#0a0807]">{children}</div>;
}
