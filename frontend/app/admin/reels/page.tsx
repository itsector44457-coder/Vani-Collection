import type { Metadata } from "next";
import ReelsView from "./reels-view";

export const metadata: Metadata = {
  title: "Reels",
  description: "Manage reels content for the Vani Collection storefront.",
};

export default function ReelsPage() {
  return <ReelsView />;
}