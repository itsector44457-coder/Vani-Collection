"use client";

import { useEffect, useSyncExternalStore } from "react";
import { ReactLenis, useLenis } from "lenis/react";

export { useLenis };

/**
 * Number of open overlays (cart, search, mobile menu, quick view, dialogs) that want the page frozen.
 * Lenis is only stopped while at least one lock is held, so closing one overlay never restarts
 * smooth scrolling underneath another that is still open.
 */
let activeScrollLocks = 0;

/**
 * Freeze page scrolling (Lenis smooth-scroll included) while `locked` is true.
 * Without this, wheel input over an open drawer still scrolls the page behind it.
 */
export function useScrollLock(locked: boolean): void {
  const lenis = useLenis();

  useEffect(() => {
    if (!locked) return;
    activeScrollLocks += 1;
    lenis?.stop();
    return () => {
      activeScrollLocks = Math.max(0, activeScrollLocks - 1);
      if (activeScrollLocks === 0) lenis?.start();
    };
  }, [locked, lenis]);
}

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
