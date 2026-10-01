"use client";

import { PRODUCTS } from "../data/products";
import LivingProductCard from "./LivingProductCard";
import { useCart } from "../context/CartContext";
import { useState } from "react";

interface RelatedProductsProps {
  currentProduct: any; // Product type from context
}

export default function RelatedProducts({ currentProduct }: RelatedProductsProps) {
  const { addToCart, toggleWishlist, isInWishlist, setQuickViewProduct } = useCart();
  const [selectedSizes, setSelectedSizes] = useState<{ [key: string]: string }>({});

  // Get related products from same category, excluding current product
  const relatedProducts = PRODUCTS.filter(product => 
    product.category === currentProduct.category && product.id !== currentProduct.id
  ).slice(0, 4);

  // If not enough products in same category, add from other categories
  if (relatedProducts.length < 4) {
    const additionalProducts = PRODUCTS.filter(product => 
      product.id !== currentProduct.id && 
      !relatedProducts.some(rp => rp.id === product.id)
    ).slice(0, 4 - relatedProducts.length);
    
    relatedProducts.push(...additionalProducts);
  }

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
        <button className="bg-white border-2 border-[#881337] text-[#881337] px-8 py-3 rounded-xl font-semibold hover:bg-[#881337] hover:text-white transition">
          View All Products
        </button>
      </div>
    </div>
  );
}