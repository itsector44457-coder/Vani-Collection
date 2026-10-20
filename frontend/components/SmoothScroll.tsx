"use client";

import { useSyncExternalStore } from "react";
import { ReactLenis, useLenis } from "lenis/react";

export { useLenis };

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function getReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

export default function SmoothScroll({
  children,
}: {
  children: React.ReactNode;
}) {
  // Respect the shopper's reduced-motion setting: smooth-wheel hijacking is exactly the kind of
  // vestibular trigger that setting exists to disable, so Lenis is not mounted at all for them.
  const reducedMotion = useSyncExternalStore(subscribeReducedMotion, getReducedMotion, () => false);

  if (reducedMotion) return <>{children}</>;

  return (
    <ReactLenis
      root
      options={{
        lerp: 0.08,
        duration: 1.2,
        smoothWheel: true,
      }}
    >
      {children}
    </ReactLenis>
  );
}
