import type { NextConfig } from "next";

/**
 * Hosts `next/image` is allowed to optimise.
 *
 * `res.cloudinary.com` is where the backend's `POST /api/uploads/images` route stores product
 * photography, so without it every real catalogue image is rejected and only the demo assets load.
 * The Unsplash/Pexels/Shopify entries cover the bundled demo catalogue and any imagery an editor
 * pastes in from a stock library.
 */
const remotePatterns = [
  { protocol: "https" as const, hostname: "res.cloudinary.com" },
  // A cloud name is a path segment, so one entry covers every Vani Collection Cloudinary account.
  { protocol: "https" as const, hostname: "images.unsplash.com" },
  { protocol: "https" as const, hostname: "images.pexels.com" },
  { protocol: "https" as const, hostname: "cdn.shopify.com" },
  { protocol: "https" as const, hostname: "m.media-amazon.com" },
];

const nextConfig: NextConfig = {
  // The Arena preview is served from a per-session *.e2b.app origin.
  allowedDevOrigins: ["*.e2b.app"],
  images: {
    remotePatterns,
  },
};

export default nextConfig;
