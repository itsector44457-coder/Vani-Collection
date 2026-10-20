"use client";

import { useState } from "react";
import Link from "next/link";
import LivingProductCard from "./LivingProductCard";
import { useCart, type Product } from "../context/CartContext";

/**
 * Product grid for a `/collections/[slug]` landing page. Products arrive server-rendered from the
 * route (so names, prices and links are in the first HTML for crawlers); this client wrapper only
 * adds wishlist + quick-add behaviour on top.
 */
export default function CategoryProductGrid({ products, categorySlug, categoryLabel }: { products: Product[]; categorySlug: string; categoryLabel: string }) {
  const { wishlist, toggleWishlist } = useCart();
  const [selectedSizeMap, setSelectedSizeMap] = useState<Record<string, string>>({});

  if (!products.length) {
    return (
      <div className="rounded-3xl border border-dashed border-stone-300 bg-white px-6 py-14 text-center">
        <p className="font-serif text-2xl text-stone-900">New {categoryLabel} pieces are on the way</p>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-stone-600">
          This collection is being refreshed right now. Meanwhile, explore the full catalogue — fresh pieces are added every week.
        </p>
        <Link href="/products" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#781e36] px-6 text-sm font-semibold text-white transition hover:bg-[#64182c]">
          Shop all products <span aria-hidden="true">→</span>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
        {products.map((product) => (
          <LivingProductCard
            key={product.id}
            product={product}
            isWish={wishlist.includes(product.id)}
            toggleWishlist={toggleWishlist}
            selectedSize={selectedSizeMap[product.id] || product.sizes?.[0] || ""}
            onSelectSize={(id, size) => setSelectedSizeMap((current) => ({ ...current, [id]: size }))}
            minimal
          />
        ))}
      </div>
      <div className="mt-10 text-center">
        <Link
          href={`/products?category=${encodeURIComponent(categorySlug)}&view=all`}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#781e36] px-6 text-sm font-semibold text-[#781e36] transition hover:bg-[#781e36] hover:text-white"
        >
          See all {categoryLabel} with filters <span aria-hidden="true">→</span>
        </Link>
      </div>
    </div>
  );
}
