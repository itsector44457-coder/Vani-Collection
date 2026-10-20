import Link from "next/link";
/** The fields a category tile needs — satisfied by both API categories and the demo fallback. */
export interface CategoryTile {
  slug: string;
  name: string;
  bannerImage?: string;
}

export interface ShopByCategoryItem {
  category: CategoryTile;
  /** Number of live products in this category (0 when the catalogue is still loading). */
  count: number;
  /** Image for the tile: category banner, else the first product photo, else a neutral panel. */
  image?: string;
}

/**
 * "Shop By Categories" — a row of rounded tiles on mobile (horizontal snap scroll) and a grid on
 * desktop. Each tile links to the category page and shows how many pieces it holds.
 */
export default function ShopByCategory({ items }: { items: ShopByCategoryItem[] }) {
  if (items.length === 0) return null;

  return (
    <section id="categories" aria-labelledby="shop-by-category-heading" className="py-12 sm:py-20 bg-[#faf7f2] border-b border-[#e8dfd5]">
      <div className="max-w-[1500px] mx-auto px-4 sm:px-8 lg:px-12">
        <div className="mb-6 sm:mb-10 text-center">
          <span className="text-[9.5px] sm:text-[10px] font-semibold uppercase tracking-[0.35em] text-[#b8935a]">
            Browse by Style &amp; Need
          </span>
          <h2 id="shop-by-category-heading" className="font-serif text-2xl sm:text-3xl lg:text-4xl text-stone-900 mt-1">
            Shop By Categories
          </h2>
          <p className="mt-2 text-sm text-stone-600">Easily find what you&apos;re looking for, neatly sorted by category.</p>
        </div>

        <ul className="flex gap-3 sm:gap-5 overflow-x-auto snap-x snap-mandatory pb-3 -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-3 md:grid-cols-5 sm:overflow-visible scrollbar-none">
          {items.map(({ category, count, image }) => (
            <li key={category.slug} className="snap-start shrink-0 w-[44vw] max-w-[220px] sm:w-auto sm:max-w-none">
              <Link
                href={`/collections/${encodeURIComponent(category.slug)}`}
                className="group block text-center"
              >
                <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-gradient-to-br from-[#f3e7d6] to-[#e7d3b8] shadow-sm">
                  {image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={image}
                      alt={category.name}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  ) : (
                    <span className="absolute inset-0 flex items-center justify-center font-serif text-3xl text-[#881337]/60">
                      {category.name.charAt(0)}
                    </span>
                  )}
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent h-1/3" aria-hidden="true" />
                </div>
                <h3 className="mt-3 font-serif text-sm sm:text-base text-stone-900 group-hover:text-[#881337] transition-colors">
                  {category.name}
                </h3>
                <p className="text-[11px] sm:text-xs text-[#b8935a] font-semibold mt-0.5">
                  {count > 0 ? `${count} ${count === 1 ? "piece" : "pieces"}` : "View collection"}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
