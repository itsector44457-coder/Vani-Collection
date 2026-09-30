"use client";

import Link from "next/link";
import { useState } from "react";
import { ButtonPrimary, Card, EmptyState, IconHeart, IconTrash, PageHeader } from "@/lib/account-ui";

const INITIAL = [
  { id: "VC-1042", name: "Gulab Bagh Handblock Mul Cotton Saree", price: 2499, category: "Sarees", inStock: true },
  { id: "VC-1038", name: "Rani Bagru Silk Saree", price: 4299, category: "Sarees", inStock: true },
  { id: "VC-1015", name: "Ivory Chikankari Anarkali", price: 3799, category: "Anarkalis", inStock: false },
  { id: "VC-0972", name: "Madhubani Handpainted Dupatta", price: 1299, category: "Dupattas", inStock: true },
];

export default function WishlistPage() {
  const [items, setItems] = useState(INITIAL);

  const remove = (id: string) => setItems((arr) => arr.filter((x) => x.id !== id));

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
        subtitle={`${items.length} item${items.length > 1 ? "s" : ""} saved`}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((it) => (
          <Card key={it.id} className="overflow-hidden !p-0">
            <div className="relative aspect-[4/5] bg-gradient-to-br from-[#faf7f2] to-[#f0ebe3]">
              <div className="absolute inset-0 flex items-center justify-center text-[46px] font-serif text-[#881337]/20">
                {it.name.charAt(0)}
              </div>
              <button
                onClick={() => remove(it.id)}
                aria-label="Remove"
                className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-stone-600 shadow-sm ring-1 ring-black/5 backdrop-blur transition hover:text-rose-600"
              >
                <IconTrash />
              </button>
              {!it.inStock && (
                <span className="absolute left-3 top-3 rounded-full bg-stone-900/80 px-2.5 py-0.5 text-[10.5px] font-semibold text-white">
                  Out of stock
                </span>
              )}
            </div>
            <div className="p-4">
              <p className="text-[10.5px] font-semibold uppercase tracking-wider text-stone-400">
                {it.category}
              </p>
              <p className="mt-1 line-clamp-2 text-[13px] font-semibold text-stone-900">
                {it.name}
              </p>
              <p className="mt-2 font-serif text-[16px] font-semibold">
                ₹{it.price.toLocaleString("en-IN")}
              </p>
              <div className="mt-4">
                <ButtonPrimary disabled={!it.inStock} className="w-full">
                  {it.inStock ? "Move to bag" : "Notify me"}
                </ButtonPrimary>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}