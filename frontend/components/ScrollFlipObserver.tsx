"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const FLIP_TARGET_SELECTOR = "section, article, [data-scroll-flip]";

/**
 * Adds a lightweight, one-time 3D reveal to storefront sections/cards as they enter the viewport.
 * IntersectionObserver does the work only at the viewport edge; reduced-motion users are opted out.
 */
export default function ScrollFlipObserver() {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.getElementById("main-content");
    if (
      !root ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      typeof IntersectionObserver === "undefined"
    ) {
      return;
    }

    const activeAnimations = new Map<HTMLElement, (event: AnimationEvent) => void>();
    const flipObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting || !(entry.target instanceof HTMLElement)) return;

          const target = entry.target;
          flipObserver.unobserve(target);
          target.dataset.scrollFlipState = "animating";
          target.classList.remove("scroll-flip-pending");
          target.classList.add("scroll-flip-active");

          const finishAnimation = (event: AnimationEvent) => {
            if (event.target !== target || event.animationName !== "scroll-page-flip") return;
            target.classList.remove("scroll-flip-active");
            target.dataset.scrollFlipState = "visible";
            target.removeEventListener("animationend", finishAnimation);
            activeAnimations.delete(target);
          };

          activeAnimations.set(target, finishAnimation);
          target.addEventListener("animationend", finishAnimation);
        });
      },
      {
        rootMargin: "0px 0px -40px 0px",
        threshold: 0.02,
      },
    );

    const prepareTarget = (target: HTMLElement) => {
      if (target.dataset.scrollFlipState) return;

      const bounds = target.getBoundingClientRect();
      const alreadyOnScreen = bounds.bottom <= 0 || (bounds.top < window.innerHeight * 0.86 && bounds.bottom > 0);
      if (alreadyOnScreen) {
        target.dataset.scrollFlipState = "visible";
        return;
      }

      target.dataset.scrollFlipState = "pending";
      target.classList.add("scroll-flip-pending");
      flipObserver.observe(target);
    };

    const watchTargets = (scope: ParentNode) => {
      if (scope instanceof Element && scope.matches(FLIP_TARGET_SELECTOR)) {
        prepareTarget(scope as HTMLElement);
      }

      scope.querySelectorAll(FLIP_TARGET_SELECTOR).forEach((element) => {
        if (element instanceof HTMLElement) prepareTarget(element);
      });
    };

    watchTargets(root);

    // Catalogue cards can arrive after hydration or be replaced by filters, so observe newly added
    // content too. Attribute/class changes from the reveal itself are intentionally ignored.
    const contentObserver = new MutationObserver((records) => {
      records.forEach((record) => {
        record.addedNodes.forEach((node) => {
          if (node instanceof Element) watchTargets(node);
        });
      });
    });
    contentObserver.observe(root, { childList: true, subtree: true });

    return () => {
      contentObserver.disconnect();
      flipObserver.disconnect();
      activeAnimations.forEach((finishAnimation, target) => {
        target.removeEventListener("animationend", finishAnimation);
      });
      root.querySelectorAll<HTMLElement>(".scroll-flip-pending, .scroll-flip-active").forEach((target) => {
        target.classList.remove("scroll-flip-pending", "scroll-flip-active");
        delete target.dataset.scrollFlipState;
      });
    };
  }, [pathname]);

  return null;
}
