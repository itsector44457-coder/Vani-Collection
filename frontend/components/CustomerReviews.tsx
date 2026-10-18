"use client";

import { useEffect, useRef, useState } from "react";
import type { Testimonial } from "@/lib/content";

export default function CustomerReviews({ reviews }: { reviews: Testimonial[] }) {
  const track = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });
  const [expanded, setExpanded] = useState<(string | number)[]>([]);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const element = track.current;
    if (!element) return;
    const update = () => setEdges({
      left: element.scrollLeft > 4,
      right: element.scrollLeft + element.clientWidth < element.scrollWidth - 4,
    });
    update();
    element.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => { element.removeEventListener("scroll", update); observer.disconnect(); };
  }, [reviews, showAll]);

  if (!reviews.length) return null;
  const average = (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1);
  const verifiedCount = reviews.filter((review) => review.verified).length;

  return (
    <section id="customer-reviews" aria-labelledby="customer-reviews-title" className="border-y border-[#eddbd5] bg-[#fff8f5] px-4 py-10 sm:px-8 sm:py-14 lg:px-12">
      <div className="mx-auto max-w-[1400px]">
        <header className="mb-8 text-center sm:mb-10">
          <p className="text-[9px] font-medium uppercase tracking-[0.25em] text-[#bd883b] sm:text-[10px]">
            {average} ★ · {verifiedCount > 0 ? `${verifiedCount.toLocaleString("en-IN")} verified reviews` : `${reviews.length} customer reviews`}
          </p>
          <div className="mt-3 flex items-center justify-center gap-4 sm:gap-5">
            <span aria-hidden="true" className="h-px w-7 bg-[#c49958] sm:w-16" />
            <h2 id="customer-reviews-title" className="font-serif text-[22px] font-normal uppercase tracking-[0.13em] text-[#8b293f] sm:text-3xl sm:tracking-[0.18em]">Customer Reviews</h2>
            <span aria-hidden="true" className="h-px w-7 bg-[#c49958] sm:w-16" />
          </div>
          <p className="mt-3 text-[11px] text-stone-500 sm:text-xs">Real stories. Beautiful moments. From our community to you.</p>
        </header>

        <div className="relative">
          <div ref={track} className={showAll ? "grid grid-cols-1 gap-5 min-[480px]:grid-cols-2 lg:grid-cols-4" : "scrollbar-none flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth"}>
            {reviews.map((review) => {
              const isExpanded = expanded.includes(review.id);
              const stars = Math.max(0, Math.min(5, Math.round(review.rating)));
              return (
                <article key={review.id} className={`overflow-hidden rounded-lg border border-[#efdcd4] bg-white ${showAll ? "" : "w-[80%] shrink-0 snap-start min-[480px]:w-[calc((100%-20px)/2)] lg:w-[calc((100%-60px)/4)]"}`}>
                  <div className="relative aspect-[4/5] overflow-hidden bg-[#f0e5df]">
                    <div aria-hidden="true" className="absolute inset-0 flex items-center justify-center font-serif text-7xl text-[#b58b79]">{review.name.charAt(0)}</div>
                    {review.image && (
                      // CMS customer photography is deliberately shown at full card width.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={review.image} alt={`${review.name} — customer photo`} loading="lazy" className="relative h-full w-full object-cover" onError={(event) => { event.currentTarget.style.visibility = "hidden"; }} />
                    )}
                  </div>
                  <div className="px-4 pb-4 pt-4 text-center">
                    <p aria-label={`${review.rating} out of 5 stars`} className="text-xs tracking-[0.12em] text-[#c7973e]">{"★".repeat(stars)}<span className="text-stone-200">{"★".repeat(5 - stars)}</span></p>
                    <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
                      <h3 className="text-xs font-semibold text-stone-800">{review.name}</h3>
                      {review.verified && <span className="rounded-[2px] bg-[#84354a] px-1.5 py-0.5 text-[8px] font-semibold uppercase text-white">Verified</span>}
                    </div>
                    <p id={`review-${review.id}`} className={`mt-2 text-[11px] leading-[1.7] text-stone-500 ${isExpanded ? "" : "line-clamp-2 min-h-[38px]"}`}>{review.comment}</p>
                    {isExpanded && <p className="mt-2 text-[10px] text-stone-400">{[review.product, review.city, review.date].filter(Boolean).join(" · ")}</p>}
                    <button type="button" aria-expanded={isExpanded} aria-controls={`review-${review.id}`} onClick={() => setExpanded((current) => isExpanded ? current.filter((id) => id !== review.id) : [...current, review.id])} className="mt-4 min-h-9 border-b border-[#8b293f] px-1 text-[9px] font-medium uppercase tracking-wide text-[#8b293f] transition hover:text-black">
                      {isExpanded ? "Read less" : "Read more"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
          {!showAll && (["left", "right"] as const).map((direction) => (
            <button key={direction} type="button" disabled={!edges[direction]} aria-label={direction === "left" ? "Previous customer review" : "Next customer review"} onClick={() => { const element = track.current; if (element) element.scrollBy({ left: (direction === "left" ? -1 : 1) * (element.firstElementChild?.getBoundingClientRect().width || element.clientWidth) + (direction === "left" ? -20 : 20), behavior: "smooth" }); }} className={`absolute top-[43%] flex h-9 w-9 items-center justify-center rounded-full border border-[#efdcd4] bg-white text-[#8b293f] shadow-sm transition hover:bg-[#f8eee8] disabled:hidden ${direction === "left" ? "-left-3 sm:-left-4" : "-right-3 sm:-right-4"}`}>
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d={direction === "left" ? "m14 6-6 6 6 6" : "m10 6 6 6-6 6"} /></svg>
            </button>
          ))}
        </div>
        <div className="mt-7 text-center">
          <button type="button" aria-expanded={showAll} onClick={() => setShowAll((value) => !value)} className="min-h-11 border border-[#8b293f] px-7 text-[10px] uppercase tracking-[0.2em] text-[#8b293f] transition hover:bg-[#8b293f] hover:text-white">{showAll ? "Show fewer reviews" : "Read all reviews"}</button>
        </div>
      </div>
    </section>
  );
}
