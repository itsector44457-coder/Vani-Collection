import type { Metadata } from "next";
import ShopFromVideoView from "./shop-from-video-view";

export const metadata: Metadata = {
  title: "Shop From The Video",
  description: "Manage the shoppable videos shown directly below the Vani Collection homepage banner.",
};

export default function ShopFromVideoPage() {
  return <ShopFromVideoView />;
}
