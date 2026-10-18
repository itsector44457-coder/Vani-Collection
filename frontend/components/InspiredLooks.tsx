"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/context/CartContext";
import type { Product } from "@/lib/storefront-types";
import { calculateDiscount, formatPrice, productHref } from "@/lib/utils";

export default function InspiredLooks({ products, image, loading = false }: { products: Product[]; image?: string; loading?: boolean }) {
  const { setQuickViewProduct, toggleWishlist, isInWishlist } = useCart();
  const [activeId, setActiveId] = useState<string | null>(null);
  const selection = products.slice(0, 5);
  const active = selection.find((product) => product.id === activeId) ?? selection[0];
  const featureImage = activeId ? active?.image : image || active?.image;

  return (
    <section aria-labelledby="inspired-looks-title" className="bg-[#fff8f5] px-4 py-10 sm:px-8 sm:py-14 lg:px-12">
      <div className="mx-auto max-w-[1180px]">
        <h2 id="inspired-looks-title" className="mb-7 text-center font-serif text-3xl font-normal text-[#29161d] sm:text-4xl">Inspired <em className="font-normal text-[#8b293f]">Looks</em></h2>
        {active ? (
          <div className="grid gap-5 md:grid-cols-2 md:gap-6">
            <div className="relative aspect-[2/3] overflow-hidden bg-[#eee3db] md:aspect-auto md:min-h-[640px]">
              {featureImage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={featureImage} src={featureImage} alt={activeId || !image ? active.title : "Vani Collection — inspired occasionwear styling"} loading="lazy" className="absolute inset-0 h-full w-full object-cover" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = "/product-not-found.jpg"; }} />
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent px-6 pb-6 pt-16 text-white">
                <span className="text-[9px] uppercase tracking-[0.22em]">The occasion edit</span>
                <p className="mt-2 font-serif text-2xl">A look to make your own.</p>
              </div>
            </div>
            <div className="scrollbar-none max-h-[720px] overflow-y-auto md:h-[min(60vw,720px)] md:min-h-[640px]" aria-label="Shop the inspired looks" tabIndex={0}>
              {selection.map((product) => {
                const wished = isInWishlist(product.id);
                const discount = product.originalPrice > product.price ? calculateDiscount(product.originalPrice, product.price) : 0;
                return (
                  <article key={product.id} className="grid grid-cols-[88px_1fr] gap-4 border-b border-[#dfd3cd] py-4 first:pt-0 sm:grid-cols-[106px_1fr]">
                    <div className="relative self-start overflow-hidden rounded-md bg-[#eee3db]">
                      <button type="button" aria-label={`Preview ${product.title}`} aria-pressed={active?.id === product.id} onClick={() => setActiveId(product.id)} className="block aspect-[2/3] w-full">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={product.image} alt={product.title} loading="lazy" className="h-full w-full object-cover transition duration-500 hover:scale-105" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = "/product-not-found.jpg"; }} />
                      </button>
                      <button type="button" onClick={() => toggleWishlist(product.id)} aria-label={`${wished ? "Remove" : "Add"} ${product.title} ${wished ? "from" : "to"} wishlist`} aria-pressed={wished} className="absolute right-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#84354a] shadow-sm">
                        <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill={wished ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" /></svg>
                      </button>
                    </div>
                    <div className="flex min-w-0 flex-col">
                      <h3 className="text-xs font-medium leading-relaxed text-stone-900"><Link href={productHref(product)} className="hover:text-[#8b293f]">{product.title}</Link></h3>
                      {product.reviewsCount > 0 && <p className="mt-2 text-[10px] tracking-wide" aria-label={`${product.rating} out of 5, ${product.reviewsCount} reviews`}>{"★".repeat(Math.max(0, Math.min(5, Math.round(product.rating))))}<span className="ml-1 tracking-normal text-stone-500">({product.reviewsCount})</span></p>}
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] sm:text-[11px]">
                        <span className="font-semibold">{formatPrice(product.price)}</span>
                        {discount > 0 && <><del className="text-stone-400">{formatPrice(product.originalPrice)}</del><span className="text-[#8b293f]">{discount}% OFF</span></>}
                      </div>
                      <div className="mt-auto space-y-2 pt-4">
                        <button type="button" onClick={() => setQuickViewProduct(product)} className="min-h-9 w-full bg-black px-3 py-2 text-[10px] font-medium text-white transition hover:bg-[#84354a]">Select options</button>
                        <Link href={productHref(product)} className="flex min-h-9 w-full items-center justify-center rounded-md border border-[#d8cec9] px-3 py-2 text-[10px] text-stone-700 transition hover:border-[#84354a] hover:text-[#84354a]">Details</Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="border border-[#eddbd5] px-6 py-12 text-center text-sm text-stone-500" role="status">
            <p>{loading ? "Curating your inspired looks…" : "Our next edit is on its way. Explore the collection for more inspiration."}</p>
            {!loading && <Link href="/collections" className="mt-5 inline-block border-b border-[#8b293f] pb-1 text-xs text-[#8b293f]">Explore the collection</Link>}
          </div>
        )}
      </div>
    </section>
  );
}
