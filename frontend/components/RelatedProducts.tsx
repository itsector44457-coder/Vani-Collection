"use client";

import { useRef } from "react";
import Link from "next/link";
import type { Product } from "../lib/storefront-types";
import { useCatalogue } from "../lib/use-storefront";
import LivingProductCard from "./LivingProductCard";
import { useCart } from "../context/CartContext";

interface RelatedProductsProps {
  /** The product being viewed; related items prioritize same category, then backfill from the catalogue. */
  currentProduct: Product;
}

export default function RelatedProducts({ currentProduct }: RelatedProductsProps) {
  const { toggleWishlist, isInWishlist } = useCart();
  const scrollRef = useRef<HTMLDivElement>(null);

  // 1. Fetch products from the same category
  const categoryCatalogue = useCatalogue({ category: currentProduct.category, limit: 12 });
  // 2. Fetch general catalogue products to backfill
  const generalCatalogue = useCatalogue({ limit: 16 });

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = direction === "left" ? -300 : 300;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  // Same category items (excluding current product)
  const sameCategoryProducts = (categoryCatalogue.data || []).filter(
    (product) => product.id !== currentProduct.id && product.slug !== currentProduct.slug
  );

  // Other items from general collection to complete recommendations
  const backfillProducts = (generalCatalogue.data || []).filter(
    (product) =>
      product.id !== currentProduct.id &&
      product.slug !== currentProduct.slug &&
      !sameCategoryProducts.some((sc) => sc.id === product.id)
  );

  const relatedProducts = [...sameCategoryProducts, ...backfillProducts].slice(0, 10);

  // Skeleton state while loading
  if (categoryCatalogue.loading && generalCatalogue.loading && relatedProducts.length === 0) {
    return (
      <div className="space-y-6 pt-10">
        <div className="text-center">
          <div className="h-6 w-40 mx-auto bg-stone-200 animate-pulse rounded-md mb-2" />
          <div className="h-4 w-64 mx-auto bg-stone-100 animate-pulse rounded-md" />
        </div>
        <div className="flex gap-4 overflow-x-hidden pt-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="w-[220px] sm:w-[260px] aspect-[3/4] bg-stone-100 animate-pulse rounded-2xl border border-stone-200 shrink-0" />
          ))}
        </div>
      </div>
    );
  }

  if (relatedProducts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6 pt-12 border-t border-stone-200/70">
      {/* Header with Title and Scroll Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="text-[10px] uppercase font-semibold tracking-[0.3em] text-[#881337] block mb-1">
            Curated For You
          </span>
          <h3 className="text-2xl sm:text-3xl font-serif text-gray-900 font-normal">
            You May Also Like
          </h3>
          <p className="text-xs sm:text-sm text-gray-500 font-light mt-0.5">
            Swipe to explore matching handcrafted pieces
          </p>
        </div>

        {/* Scroll Arrows */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => scroll("left")}
            aria-label="Scroll left"
            className="w-10 h-10 rounded-full border border-stone-300 hover:border-stone-500 bg-white hover:bg-stone-50 flex items-center justify-center text-stone-700 transition shadow-xs active:scale-95"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => scroll("right")}
            aria-label="Scroll right"
            className="w-10 h-10 rounded-full border border-stone-300 hover:border-stone-500 bg-white hover:bg-stone-50 flex items-center justify-center text-stone-700 transition shadow-xs active:scale-95"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Side-Scrollable Horizontal Carousel */}
      <div className="relative -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div
          ref={scrollRef}
          className="flex gap-4 sm:gap-5 overflow-x-auto pb-4 pt-1 scroll-smooth snap-x snap-mandatory"
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {relatedProducts.map((product) => (
            <div
              key={product.id}
              className="w-[170px] sm:w-[200px] md:w-[220px] lg:w-[240px] shrink-0 snap-start flex flex-col"
            >
              <LivingProductCard
                product={product}
                isWish={isInWishlist(product.id)}
                toggleWishlist={toggleWishlist}
                minimal={true}
              />
            </div>
          ))}
        </div>
      </div>

      {/* View All Link */}
      <div className="text-center pt-2">
        <Link
          href="/products"
          className="inline-block bg-white border border-[#881337] text-[#881337] px-8 py-2.5 rounded-full text-xs font-semibold tracking-wider uppercase hover:bg-[#881337] hover:text-white transition shadow-xs"
        >
          View Entire Collection →
        </Link>
      </div>
    </div>
  );
}