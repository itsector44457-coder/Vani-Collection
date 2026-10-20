"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api, isApiConfigured, type StoreCategory } from "@/lib/api-client";
import { listProducts } from "@/lib/storefront-api";

const FALLBACK_CATEGORIES: StoreCategory[] = [
  { name: "Mul Cotton", slug: "mul-cotton", navigationGroup: "By Fabric", position: 0, isActive: true },
  { name: "Festive Edit", slug: "festive", navigationGroup: "By Occasion", position: 1, isActive: true },
  { name: "Co-ord Sets", slug: "coord-sets", navigationGroup: "By Style", position: 2, isActive: true },
  { name: "Anarkalis", slug: "anarkalis", navigationGroup: "By Style", position: 3, isActive: true },
  { name: "Kurta Sets", slug: "kurta-sets", navigationGroup: "By Style", position: 4, isActive: true },
  { name: "Sarees", slug: "sarees", navigationGroup: "By Style", position: 5, isActive: true },
  { name: "Dupattas", slug: "dupattas", navigationGroup: "By Style", position: 6, isActive: true },
];

const CATEGORY_IMAGES: Record<string, string> = {
  "mul-cotton": "https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=900&q=85",
  festive: "https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?w=900&q=85",
  "coord-sets": "https://images.unsplash.com/photo-1558171813-0d31c0166a8d?w=900&q=85",
  anarkalis: "https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?w=900&q=85",
  "kurta-sets": "https://images.unsplash.com/photo-1536901035427-0a3f1a9cc92d?w=900&q=85",
  sarees: "https://images.unsplash.com/photo-1603189343302-e603f7add05a?w=900&q=85",
  dupattas: "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=900&q=85",
};

const EXTRA_IMAGES = [
  "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=900&q=85",
  "https://images.unsplash.com/photo-1606744888344-493238951221?w=900&q=85",
  "https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?w=900&q=85",
  "https://images.unsplash.com/photo-1607748851687-ba9a10438621?w=900&q=85",
];

function categoryImage(category: StoreCategory, index: number): string {
  return category.bannerImage?.trim() || CATEGORY_IMAGES[category.slug] || EXTRA_IMAGES[index % EXTRA_IMAGES.length];
}

export default function CollectionsView() {
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const [categories, setCategories] = useState(FALLBACK_CATEGORIES);
  const [productCounts, setProductCounts] = useState<Record<string, number>>({});
  const [countsLoading, setCountsLoading] = useState(isApiConfigured());

  useEffect(() => {
    if (!isApiConfigured()) return;

    const controller = new AbortController();
    let cancelled = false;

    const loadCategories = async () => {
      try {
        const { data } = await api.categories(controller.signal);
        const activeCategories = data
          .filter((category) => category.isActive)
          .sort((a, b) => a.position - b.position || a.name.localeCompare(b.name));
        const categoriesToCount = activeCategories.length ? activeCategories : FALLBACK_CATEGORIES;

        if (!cancelled && activeCategories.length) setCategories(activeCategories);

        const results = await Promise.allSettled(
          categoriesToCount.map(async (category) => {
            const result = await listProducts({ category: category.slug, limit: 1 }, controller.signal);
            return [category.slug, result.total] as const;
          }),
        );

        if (cancelled) return;
        const counts: Record<string, number> = {};
        results.forEach((result) => {
          if (result.status === "fulfilled") counts[result.value[0]] = result.value[1];
        });
        setProductCounts(counts);
      } catch (cause) {
        if ((cause as Error)?.name !== "AbortError") {
          console.error("Could not load collection categories", cause);
        }
      } finally {
        if (!cancelled) setCountsLoading(false);
      }
    };

    void loadCategories();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#fffdf9] pb-20 text-[#1c1917] sm:pb-14">
      <section className="px-4 pb-7 pt-6 sm:px-6 sm:pb-10 sm:pt-9">
        <div className="mx-auto max-w-7xl">
          <nav aria-label="Breadcrumb" className="mb-7 flex items-center justify-center gap-2 text-[10px] text-stone-400 sm:mb-9 sm:text-xs">
            <Link href="/" className="transition-colors hover:text-[#881337]">Home</Link>
            <span aria-hidden="true">/</span>
            <span className="text-stone-700">Collections</span>
          </nav>

          <div className="mx-auto max-w-2xl text-center">
            <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.32em] text-[#a47c42] sm:mb-3 sm:text-[10px]">
              The Vani edit · Guna
            </p>
            <h1 className="font-serif text-[29px] font-medium leading-tight text-[#292524] sm:text-4xl md:text-[42px]">
              Shop by collection
            </h1>
            <p className="mx-auto mt-2.5 max-w-lg text-[11px] leading-relaxed text-stone-500 sm:mt-3 sm:text-sm">
              Find your next favourite — thoughtfully made styles for everyday moments and celebrations.
            </p>
          </div>

          <div className="mx-auto mt-7 flex max-w-6xl items-center justify-between border-t border-[#eee6db] pt-4 sm:mt-9 sm:pt-5">
            <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-stone-500 sm:text-[10px]">
              Explore the collections
            </p>
            <Link
              href="/products"
              className="group inline-flex items-center gap-1.5 text-[10px] font-semibold text-[#881337] transition-colors hover:text-[#551025] sm:text-xs"
            >
              Shop all products
              <svg className="transition-transform group-hover:translate-x-0.5" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      <section aria-label="Product collections" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.055 } },
          }}
          className="grid grid-cols-2 gap-x-3 gap-y-6 min-[480px]:grid-cols-3 min-[480px]:gap-x-4 sm:gap-x-6 sm:gap-y-9 xl:grid-cols-4"
        >
          {categories.map((category, index) => {
            const count = productCounts[category.slug];
            const countLabel = count !== undefined
              ? `${count.toLocaleString("en-IN")} ${count === 1 ? "product" : "products"}`
              : countsLoading
                ? "Loading pieces…"
                : "Explore collection";

            return (
              <motion.article
                key={category.slug}
                variants={{
                  hidden: { opacity: 0, y: 14 },
                  visible: { opacity: 1, y: 0 },
                }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              >
                <Link
                  href={`/collections/${encodeURIComponent(category.slug)}`}
                  aria-label={`Shop ${category.name}${count !== undefined ? `, ${count} ${count === 1 ? "product" : "products"}` : ""}`}
                  className="group block rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#881337]"
                >
                  <div className="relative aspect-square overflow-hidden bg-[#eee8df]">
                    <Image
                      src={failedImages[category.slug] ? "/product-not-found.jpg" : categoryImage(category, index)}
                      onError={() => setFailedImages((current) => current[category.slug] ? current : { ...current, [category.slug]: true })}
                      alt={`${category.name} collection`}
                      fill
                      unoptimized
                      sizes="(max-width: 479px) 46vw, (max-width: 1279px) 30vw, 23vw"
                      className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.045]"
                    />
                    <span className="absolute bottom-2.5 right-2.5 grid h-8 w-8 translate-y-1 place-items-center rounded-full bg-white/95 text-[#881337] opacity-0 shadow-sm transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100" aria-hidden="true">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </span>
                  </div>
                  <div className="px-1 pb-0.5 pt-2.5 text-center sm:pt-3">
                    <h2 className="line-clamp-1 text-[9px] font-semibold uppercase leading-snug tracking-[0.06em] text-[#292524] transition-colors group-hover:text-[#881337] sm:text-[11px]">
                      {category.name}
                    </h2>
                    <p className="mt-1 text-[8px] text-stone-400 sm:text-[10px]">
                      {countLabel}
                    </p>
                  </div>
                </Link>
              </motion.article>
            );
          })}
        </motion.div>
      </section>
    </div>
  );
}
