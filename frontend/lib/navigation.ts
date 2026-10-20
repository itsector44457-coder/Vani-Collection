import type { NavigationSettings } from "./api-client";

type NavigationLink = NavigationSettings["links"][number];

const SHOP_FROM_VIDEO_LINK: NavigationLink = {
  label: "Shop From The Video",
  href: "/#shop-from-video",
  isActive: true,
};

/**
 * Remove persisted links for the retired Stories/Reels experiences, and ensure the retained
 * Shop From The Video section remains discoverable in the storefront navigation.
 */
export function normalizeNavigationLinks(links: NavigationSettings["links"]): NavigationLink[] {
  const savedLinks = Array.isArray(links) ? links : [];
  const visibleLinks = savedLinks.filter((link) => {
    const label = String(link?.label ?? "").trim().toLowerCase();
    const href = String(link?.href ?? "");
    const [path = ""] = href.split(/[?#]/, 1);
    const hash = href.match(/#([^?]*)/)?.[1]?.toLowerCase();

    return !(
      label === "stories" ||
      label === "story highlights" ||
      label === "reels" ||
      path.toLowerCase() === "/reels" ||
      path.toLowerCase().startsWith("/reels/") ||
      hash === "stories"
    );
  });

  const hasVideoLink = visibleLinks.some((link) => String(link?.href ?? "").split("#")[1]?.split("?")[0] === "shop-from-video");
  if (!hasVideoLink && visibleLinks.length < 8) return [SHOP_FROM_VIDEO_LINK, ...visibleLinks];
  return visibleLinks;
}
