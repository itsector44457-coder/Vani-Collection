import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/Skeletons";
import TrackOrderView from "./track-order-view";

export const metadata: Metadata = {
  title: "Track Your Order",
  description: "Track your Demo Collection parcel with your order number or AWB and the mobile number used on the order — no login needed.",
  // A personal lookup tool, not landing content: keep it out of the index but let crawlers follow
  // the help links out of it.
  robots: { index: false, follow: true },
};

export default function TrackOrderPage() {
  return (
    <Suspense fallback={<PageSkeleton label="Loading order tracking…" />}>
      <TrackOrderView />
    </Suspense>
  );
}
