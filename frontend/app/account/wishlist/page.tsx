"use client";

import Link from "next/link";
import Image from "next/image";
import { ButtonPrimary, Card, EmptyState, IconHeart, IconTrash, PageHeader } from "@/lib/account-ui";
import { useCart } from "@/context/CartContext";
import { useCatalogue } from "@/lib/use-storefront";
import { productHref } from "@/lib/utils";

/* Demo rows shown while the backend is not connected. */
const DEMO_WISHLIST = [
  { id: "VC-1042", name: "Gulab Bagh Handblock Mul Cotton Saree", price: 2499, category: "Sarees", inStock: true, image: "" },
  { id: "VC-1038", name: "Rani Bagru Silk Saree", price: 4299, category: "Sarees", inStock: true, image: "" },
  { id: "VC-1015", name: "Ivory Chikankari Anarkali", price: 3799, category: "Anarkalis", inStock: false, image: "" },
  { id: "VC-0972", name: "Madhubani Handpainted Dupatta", price: 1299, category: "Dupattas", inStock: true, image: "" },
];

export default function WishlistPage() {
  const { wishlist, toggleWishlist, addToCart } = useCart();
  const { data: products, source } = useCatalogue();

  const liveItems = products
    .filter((product) => wishlist.includes(product.productId ?? product.id) || wishlist.includes(product.id))
    .map((product) => ({
      id: product.productId ?? product.id,
      name: product.title,
      price: product.price,
      category: product.category,
      inStock: product.status ? product.status === "active" : true,
      image: product.image,
      href: productHref(product),
      size: product.sizes[0] ?? "Free Size",
      product,
    }));

  const demoItems = source === "demo" && wishlist.length > 0
    ? DEMO_WISHLIST.filter((item) => wishlist.includes(item.id)).map((item) => ({
        ...item,
        href: "/shop",
        size: "Free Size",
        product: null,
      }))
    : [];

  const items = liveItems.length > 0 ? liveItems : demoItems;
  const usingDemo = liveItems.length === 0 && demoItems.length > 0;

  if (items.length === 0) {
    return (
      <>
        <PageHeader eyebrow="Saved for later" title="My Wishlist" />
        <EmptyState
          icon={<IconHeart />}
          title="Your wishlist is empty"
          description="Tap the heart on any product to save it for later."
          action={
            <Link
              href="/shop"
              className="inline-flex items-center justify-center rounded-full bg-[#881337] px-5 py-2.5 text-[12.5px] font-semibold text-white transition hover:bg-[#6b0f2b]"
            >
              Explore collection
            </Link>
          }
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Saved for later"
        title="My Wishlist"
        subtitle={`${items.length} item${items.length === 1 ? "" : "s"} saved`}
      />

      {usingDemo && (
        <p className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12.5px] text-amber-800">
          These are sample items. Connect the backend to sync your real wishlist across devices.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <Card key={item.id} className="overflow-hidden !p-0">
            <div className="relative aspect-[4/5] bg-gradient-to-br from-[#faf7f2] to-[#f0ebe3]">
              {item.image ? (
                <Image src={item.image} alt={item.name} fill sizes="(max-width: 640px) 50vw, 33vw" className="object-cover" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-[46px] font-serif text-[#881337]/20">
                  {item.name.charAt(0)}
                </div>
              )}
              <button
                onClick={() => toggleWishlist(item.id)}
                aria-label="Remove from wishlist"
                className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-stone-600 shadow-sm ring-1 ring-black/5 backdrop-blur transition hover:text-rose-600"
              >
                <IconTrash />
              </button>
              {!item.inStock && (
                <span className="absolute left-3 top-3 rounded-full bg-stone-900/80 px-2.5 py-0.5 text-[10.5px] font-semibold text-white">
                  Out of stock
                </span>
              )}
            </div>
            <div className="p-4">
              <p className="text-[10.5px] font-semibold uppercase tracking-wider text-stone-400">{item.category}</p>
              <Link href={item.href} className="mt-1 line-clamp-2 block text-[13px] font-semibold text-stone-900 hover:text-[#881337]">
                {item.name}
              </Link>
              <p className="mt-2 font-serif text-[16px] font-semibold">₹{item.price.toLocaleString("en-IN")}</p>
              <div className="mt-4">
                <ButtonPrimary
                  disabled={!item.inStock}
                  className="w-full"
                  onClick={() => {
                    if (item.product) void addToCart(item.product, item.size, 1);
                  }}
                >
                  {item.inStock ? "Move to bag" : "Notify me"}
                </ButtonPrimary>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
