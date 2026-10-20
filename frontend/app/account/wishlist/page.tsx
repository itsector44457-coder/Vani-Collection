"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { Badge, ButtonGhost, ButtonPrimary, Card, EmptyState, IconHeart, IconTrash, PageHeader } from "@/lib/account-ui";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { isApiConfigured } from "@/lib/api-client";
import { fetchWishlistRows, toStoreProduct, type WishlistRow } from "@/lib/storefront-api";
import type { Product } from "@/lib/storefront-types";
import { useCatalogue } from "@/lib/use-storefront";
import { formatPrice, productHref } from "@/lib/utils";

type SortKey = "recent" | "price-low" | "price-high" | "discount";

const SORT_LABELS: Record<SortKey, string> = {
  recent: "Haal me save kiye",
  "price-low": "Keemat: kam se zyada",
  "price-high": "Keemat: zyada se kam",
  discount: "Sabse zyada discount",
};

function productFromRow(row: WishlistRow): Product | null {
  if (!row.product || typeof row.product !== "object") return null;
  const candidate = row.product as { _id?: unknown; variants?: unknown };
  if (typeof candidate._id !== "string" || !Array.isArray(candidate.variants)) return null;
  try {
    return toStoreProduct(row.product as Parameters<typeof toStoreProduct>[0]);
  } catch {
    return null;
  }
}

const productKey = (product: Product) => product.productId ?? product.id;
const discountFor = (product: Product) => product.originalPrice > product.price ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) : 0;

export default function WishlistPage() {
  const [wishlistItemsRef] = useAutoAnimate<HTMLDivElement>();
  const { wishlist, toggleWishlist, addToCart, cartCount } = useCart();
  const { user, isAuthenticated } = useAuth();
  const live = isApiConfigured();
  const catalogue = useCatalogue({ limit: 100 });
  const [rows, setRows] = useState<WishlistRow[]>([]);
  const [rowsLoading, setRowsLoading] = useState(false);
  const [rowsError, setRowsError] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("recent");
  const [selectedSizes, setSelectedSizes] = useState<Record<string, string>>({});
  const [selectedColors, setSelectedColors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);

  const handleAddToBag = async (product: Product, size: string, color: string) => {
    const id = productKey(product);
    setAddingId(id);
    setActionError(null);
    setNotice(null);
    try {
      const added = await addToCart(product, size || "Free Size", 1, color || undefined);
      if (added) setNotice(`“${product.title}” bag me jud gaya hai.`);
      else setActionError(`“${product.title}” bag me nahi jud paya. Cart me dikhi stock jaankari jaanche.`);
    } finally {
      setAddingId(null);
    }
  };

  /*
   * Signed-in shoppers read their saved rows (populated products in one request). The catalogue is
   * only the guest/fallback path — filtering page one of the catalogue used to "lose" every saved
   * piece that happened to sit beyond the first hundred products.
   */
  useEffect(() => {
    if (!live || !isAuthenticated) return;
    const controller = new AbortController();
    void Promise.resolve().then(() => setRowsLoading(true));
    fetchWishlistRows(controller.signal)
      .then((result) => {
        setRows(result);
        setRowsError(null);
      })
      .catch((cause: unknown) => {
        if ((cause as Error)?.name !== "AbortError") setRowsError("Saved wishlist load nahi ho payi — catalogue se mila hua hissa dikha rahe hain.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setRowsLoading(false);
      });
    return () => controller.abort();
  }, [isAuthenticated, live, wishlist.length]);

  const { products, missingIds } = useMemo(() => {
    const byId = new Map<string, Product>();

    for (const row of rows) {
      const product = productFromRow(row);
      if (product) byId.set(productKey(product), product);
    }
    for (const product of catalogue.data) {
      const id = productKey(product);
      if (wishlist.includes(id) || wishlist.includes(product.id)) byId.set(id, product);
    }

    const newestFirstIds = [...wishlist].reverse();
    const ordered = newestFirstIds.map((id) => byId.get(id)).filter((product): product is Product => Boolean(product));
    const missing = wishlist.filter((id) => !byId.has(id));
    return { products: ordered, missingIds: missing };
  }, [catalogue.data, rows, wishlist]);

  const sortedProducts = useMemo(() => {
    const list = [...products];
    if (sort === "price-low") list.sort((a, b) => a.price - b.price);
    else if (sort === "price-high") list.sort((a, b) => b.price - a.price);
    else if (sort === "discount") list.sort((a, b) => discountFor(b) - discountFor(a));
    return list;
  }, [products, sort]);

  const loading = rowsLoading || catalogue.loading;
  const error = rowsError || catalogue.error;

  if (loading && products.length === 0) {
    return (
      <>
        <PageHeader eyebrow="Saved for later" title="My Wishlist" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Wishlist load ho rahi hai">
          {[0, 1, 2].map((key) => <div key={key} className="h-80 animate-pulse rounded-2xl bg-white ring-1 ring-[#ebe6de]" />)}
        </div>
      </>
    );
  }

  if (wishlist.length === 0) {
    return (
      <>
        <PageHeader eyebrow="Saved for later" title="My Wishlist" />
        <EmptyState
          icon={<IconHeart />}
          title="Wishlist khaali hai"
          description="Kisi bhi product par ♡ dabakar use baad ke liye save kare."
          action={<Link href="/products" className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#881337] px-5 text-[12.5px] font-semibold text-white transition hover:bg-[#6b0f2b]">Collection dekhe</Link>}
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Saved for later"
        title="My Wishlist"
        subtitle={`${wishlist.length} saved item${wishlist.length === 1 ? "" : "s"}${cartCount ? ` · Bag me ${cartCount} item${cartCount === 1 ? "" : "s"}` : ""}`}
        action={(
          <label className="flex items-center gap-2 text-[12px] font-semibold text-stone-600">
            <span className="sr-only">Wishlist sort kare</span>
            <select value={sort} onChange={(event) => setSort(event.target.value as SortKey)} className="min-h-11 rounded-full border border-stone-300 bg-white px-3.5 text-[12.5px] font-semibold text-stone-700 outline-none focus:border-[#881337]">
 {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => <option key={key} value={key}>{SORT_LABELS[key]}</option>)}
            </select>
          </label>
        )}
      />

      <div aria-live="polite">
        {error && products.length > 0 && <p className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12.5px] leading-relaxed text-amber-800">{error}</p>}
        {notice && <p className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[12.5px] leading-relaxed text-emerald-800">{notice}</p>}
        {actionError && <p role="alert" className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[12.5px] leading-relaxed text-rose-700">{actionError}</p>}
        {missingIds.length > 0 && !loading && (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12.5px] leading-relaxed text-amber-900">
            <span>{missingIds.length} saved item ab catalogue me uplabdh nahi lag raha (ho sakta hai band ho gaya ho).</span>
            <button type="button" onClick={() => { missingIds.forEach((id) => toggleWishlist(id)); setNotice("Uplabdh nahi items wishlist se hata diye gaye."); }} className="min-h-10 shrink-0 rounded-full bg-white px-4 font-bold text-amber-900 ring-1 ring-amber-300">Unhe hataye</button>
          </div>
        )}
      </div>

      {products.length === 0 ? (
        <EmptyState icon={<IconHeart />} title="Saved items load nahi ho paye" description={error || "Thodi der baad dobara khole, ya collection browse kare."} action={<Link href="/products" className="inline-flex min-h-11 items-center rounded-full bg-[#881337] px-5 text-[12.5px] font-semibold text-white">Collection dekhe</Link>} />
      ) : (
        <div ref={wishlistItemsRef} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {sortedProducts.map((product) => {
            const id = productKey(product);
            const sizes = product.sizes;
            const preferred = user?.preferences?.preferredSize;
            const selectedSize = selectedSizes[id] ?? (preferred && sizes.includes(preferred) ? preferred : sizes.length === 1 ? sizes[0] : "");
            const variantsForSize = (product.variants ?? []).filter((variant) => !selectedSize || variant.size === selectedSize);
            const colors = [...new Set(variantsForSize.map((variant) => variant.color).filter((color): color is string => Boolean(color)))];
            const selectedColor = selectedColors[id] && colors.includes(selectedColors[id]) ? selectedColors[id] : colors.length === 1 ? colors[0] : "";
            const selectedVariant = variantsForSize.find((variant) => !selectedColor || variant.color === selectedColor) ?? variantsForSize[0];
            const price = selectedVariant?.price ?? product.price;
            const mrp = selectedVariant?.mrp ?? product.originalPrice;
            const discount = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
            const knownAvailable = selectedVariant?.available;
            const sizeUnavailable = Boolean(selectedSize && variantsForSize.length > 0 && variantsForSize.every((variant) => variant.available !== undefined && variant.available <= 0));
            const productUnavailable = product.status ? product.status !== "active" : false;
            const needsSize = sizes.length > 1 && !selectedSize;
            const needsColor = colors.length > 1 && !selectedColor;
            const canAdd = !productUnavailable && !sizeUnavailable && !needsSize && !needsColor && knownAvailable !== 0;

            return (
              <Card key={id} className="overflow-hidden !p-0">
                <div className="relative aspect-[4/5] bg-gradient-to-br from-[#faf7f2] to-[#f0ebe3]">
                  {product.image ? (
                    <Image src={product.image} alt="" fill unoptimized sizes="(max-width: 640px) 50vw, 33vw" className="object-cover object-top" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-[46px] font-serif text-[#881337]/20">{product.title.charAt(0)}</div>
                  )}
                  <Link href={productHref(product)} aria-label={`${product.title} dekhe`} className="absolute inset-0" />
                  <button
                    type="button"
                    onClick={() => { toggleWishlist(id); setNotice(`“${product.title}” wishlist se hata diya gaya.`); }}
                    aria-label={`${product.title} wishlist se hataye`}
                    className="absolute right-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/95 text-stone-600 shadow-sm ring-1 ring-black/5 backdrop-blur transition hover:text-rose-600"
                  >
                    <IconTrash />
                  </button>
                  <div className="absolute left-3 top-3 flex flex-col gap-1.5">
                    {discount > 0 && <Badge tone="success">{discount}% off</Badge>}
                    {(productUnavailable || sizeUnavailable) && <Badge tone="danger">{productUnavailable ? "Ab uplabdh nahi" : "Is size me khatm"}</Badge>}
                  </div>
                </div>

                <div className="p-4">
                  <p className="text-[10.5px] font-semibold uppercase tracking-wider text-stone-400">{product.category}{product.fabric ? ` · ${product.fabric}` : ""}</p>
                  <Link href={productHref(product)} className="mt-1 line-clamp-2 block text-[13px] font-semibold leading-snug text-stone-900 hover:text-[#881337]">{product.title}</Link>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="font-serif text-[16px] font-semibold">{formatPrice(price)}</span>
                    {mrp > price && <span className="text-[12px] text-stone-400 line-through">{formatPrice(mrp)}</span>}
                    {product.reviewsCount > 0 && product.rating > 0 && <span className="text-[11px] font-semibold text-amber-600">★ {product.rating.toFixed(1)} ({product.reviewsCount})</span>}
                  </div>

                  {sizes.length > 0 && (
                    <fieldset className="mt-3">
                      <legend className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Size {preferred && sizes.includes(preferred) ? `(aapki pasand: ${preferred})` : "chune"}</legend>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {sizes.map((size) => {
                          const unavailable = (product.variants ?? []).filter((variant) => variant.size === size).every((variant) => variant.available !== undefined && variant.available <= 0);
                          return (
                            <button key={size} type="button" aria-pressed={selectedSize === size} onClick={() => { setSelectedSizes((previous) => ({ ...previous, [id]: size })); setSelectedColors((previous) => ({ ...previous, [id]: "" })); }} className={`min-h-10 min-w-10 rounded-full px-3 text-[12px] font-bold ring-1 transition ${selectedSize === size ? "bg-[#881337] text-white ring-[#881337]" : "bg-white text-stone-700 ring-stone-300 hover:ring-[#881337]"} ${unavailable ? "opacity-50 line-through" : ""}`}>
                              {size}
                            </button>
                          );
                        })}
                      </div>
                    </fieldset>
                  )}

                  {colors.length > 1 && (
                    <fieldset className="mt-3">
                      <legend className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Rang chune</legend>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {colors.map((color) => (
                          <button key={color} type="button" aria-pressed={selectedColor === color} onClick={() => setSelectedColors((previous) => ({ ...previous, [id]: color }))} className={`min-h-10 rounded-full px-3 text-[12px] font-semibold ring-1 transition ${selectedColor === color ? "bg-stone-900 text-white ring-stone-900" : "bg-white text-stone-700 ring-stone-300 hover:ring-stone-500"}`}>{color}</button>
                        ))}
                      </div>
                    </fieldset>
                  )}

                  <div aria-live="polite">
                    {needsSize && <p className="mt-3 text-[11.5px] font-medium text-amber-700">Bag me daalne se pehle size chune.</p>}
                    {!needsSize && needsColor && <p className="mt-3 text-[11.5px] font-medium text-amber-700">Bag me daalne se pehle rang chune.</p>}
                    {typeof knownAvailable === "number" && knownAvailable > 0 && knownAvailable <= 3 && <p className="mt-3 text-[11.5px] font-semibold text-amber-700">Is size me sirf {knownAvailable} bache hain.</p>}
                  </div>

                  <div className="mt-4 space-y-2">
                    <ButtonPrimary disabled={!canAdd || addingId === id} className="min-h-11 w-full" onClick={() => { void handleAddToBag(product, selectedSize, selectedColor); }}>
                      {addingId === id ? "Bag me jud raha…" : productUnavailable ? "Ab uplabdh nahi" : sizeUnavailable ? "Is size me uplabdh nahi" : "Bag me jode"}
                    </ButtonPrimary>
                    <ButtonGhost type="button" className="min-h-11 w-full" onClick={() => { toggleWishlist(id); setNotice(`“${product.title}” wishlist se hata diya gaya.`); }}>
                      Wishlist se hataye
                    </ButtonGhost>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
