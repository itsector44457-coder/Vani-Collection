"use client";

import type { Product } from "../lib/storefront-types";
import { useCatalogue } from "../lib/use-storefront";
import LivingProductCard from "./LivingProductCard";
import { useCart } from "../context/CartContext";
import { useState } from "react";

interface RelatedProductsProps {
  /** The product being viewed; related items are drawn from the same category. */
  currentProduct: Product;
}

export default function RelatedProducts({ currentProduct }: RelatedProductsProps) {
  const { addToCart, toggleWishlist, isInWishlist, setQuickViewProduct } = useCart();
  const [selectedSizes, setSelectedSizes] = useState<{ [key: string]: string }>({});
  const { data } = useCatalogue({ category: currentProduct.category, limit: 5 });
  const relatedProducts = data.filter((product) => product.id !== currentProduct.id).slice(0, 4);

  const handleSizeChange = (productId: string, size: string) => {
    setSelectedSizes(prev => ({ ...prev, [productId]: size }));
  };

  if (relatedProducts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="text-center">
        <h3 className="text-2xl font-serif text-gray-900 mb-2">You May Also Like</h3>
        <p className="text-gray-600">Discover more handcrafted pieces from our collection</p>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6">
        {relatedProducts.map((product) => (
          <LivingProductCard
            key={product.id}
            product={product}
            isWish={isInWishlist(product.id)}
            toggleWishlist={toggleWishlist}
            onQuickView={setQuickViewProduct}
            onAddToCart={addToCart}
            selectedSize={selectedSizes[product.id] || product.sizes[0]}
            onSelectSize={handleSizeChange}
          />
        ))}
      </div>

      {/* View All Link */}
      <div className="text-center">
        <a href="/products" className="inline-block bg-white border-2 border-[#881337] text-[#881337] px-8 py-3 rounded-xl font-semibold hover:bg-[#881337] hover:text-white transition">
          View All Products
        </a>
      </div>
    </div>
  );
}