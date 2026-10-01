"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "../../../context/CartContext";
import { PRODUCTS } from "../../../data/products";
import { notFound } from "next/navigation";
import Link from "next/link";
import { generateProductSlug, calculateDiscount, generateBreadcrumbs } from "../../../lib/utils";
import ProductImageGallery from "../../../components/ProductImageGallery";
import SizeGuide from "../../../components/SizeGuide";
import ProductReviews from "../../../components/ProductReviews";
import RelatedProducts from "../../../components/RelatedProducts";

interface ProductPageProps {
  params: { slug: string };
}

export default function ProductPage({ params }: ProductPageProps) {
  const { slug } = params;
  
  // Find product by slug (using utility function)
  const product = PRODUCTS.find(p => generateProductSlug(p.title) === slug);

  if (!product) {
    notFound();
  }

  const { addToCart, toggleWishlist, isInWishlist } = useCart();
  const [selectedSize, setSelectedSize] = useState(product.sizes[0]);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'description' | 'details' | 'reviews'>('description');
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const [showAddedToast, setShowAddedToast] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);

  useEffect(() => {
    setIsWishlisted(isInWishlist(product.id));
  }, [isInWishlist, product.id]);

  const handleAddToCart = () => {
    addToCart(product, selectedSize, quantity);
    setShowAddedToast(true);
    setTimeout(() => setShowAddedToast(false), 3000);
  };

  const handleBuyNow = () => {
    // Add to cart and redirect to checkout
    addToCart(product, selectedSize, quantity);
    // Use window.location to navigate to checkout immediately
    window.location.href = "/checkout";
  };

  const handleWishlistToggle = () => {
    toggleWishlist(product.id);
    setIsWishlisted(!isWishlisted);
  };

  const discountPercentage = calculateDiscount(product.originalPrice, product.price);
  const breadcrumbs = generateBreadcrumbs(product);

  return (
    <div className="min-h-screen bg-[#faf7f2]">
      {/* Breadcrumb Navigation */}
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center space-x-2 text-sm">
          {breadcrumbs.map((crumb, index) => (
            <div key={index} className="flex items-center">
              {index > 0 && <span className="mx-2 text-gray-400">/</span>}
              {crumb.href ? (
                <Link href={crumb.href} className="text-gray-600 hover:text-[#881337] transition">
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-gray-900 font-medium">{crumb.label}</span>
              )}
            </div>
          ))}
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">
          {/* Product Images */}
          <div className="space-y-4">
            <ProductImageGallery 
              images={[product.image, product.hoverImage]} 
              productTitle={product.title}
              videoUrl={product.videoUrl}
            />
          </div>

          {/* Product Information */}
          <div className="space-y-6">
            {/* Product Badge */}
            {product.badge && (
              <div className="flex justify-between items-start">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  product.badgeType === 'bestseller' 
                    ? 'bg-[#881337] text-white' 
                    : product.badgeType === 'sale'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-amber-500 text-white'
                }`}>
                  {product.badge}
                </span>
                <button
                  onClick={handleWishlistToggle}
                  className="p-2 rounded-full hover:bg-gray-100 transition"
                >
                  <svg 
                    width="24" 
                    height="24" 
                    viewBox="0 0 24 24" 
                    fill={isWishlisted ? "#881337" : "none"} 
                    stroke="#881337" 
                    strokeWidth="2"
                  >
                    <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
                  </svg>
                </button>
              </div>
            )}

            {/* Product Title & Rating */}
            <div>
              <h1 className="text-2xl lg:text-3xl font-serif text-gray-900 leading-tight">
                {product.title}
              </h1>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-1">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <svg 
                        key={i} 
                        width="16" 
                        height="16" 
                        viewBox="0 0 24 24" 
                        fill={i < Math.floor(product.rating) ? "#fbbf24" : "#e5e7eb"}
                      >
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                    ))}
                  </div>
                  <span className="text-sm font-medium text-gray-700">
                    {product.rating} ({product.reviewsCount} reviews)
                  </span>
                </div>
              </div>
            </div>

            {/* Fabric Info */}
            <div className="text-sm text-gray-600">
              <span className="font-medium">Fabric: </span>
              {product.fabric}
            </div>

            {/* Pricing */}
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <span className="text-3xl font-bold text-gray-900">₹{product.price.toLocaleString()}</span>
                <span className="text-lg text-gray-500 line-through">₹{product.originalPrice.toLocaleString()}</span>
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm font-semibold">
                  {discountPercentage}% OFF
                </span>
              </div>
              <p className="text-sm text-gray-600">Inclusive of all taxes • Free shipping above ₹1,999</p>
            </div>

            {/* Size Selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-900">Size:</span>
                <button 
                  onClick={() => setShowSizeGuide(true)}
                  className="text-sm text-[#881337] hover:underline font-medium"
                >
                  Size Guide
                </button>
              </div>
              <div className="grid grid-cols-6 gap-2">
                {product.sizes.map((size) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`py-3 px-4 border rounded-lg text-sm font-medium transition ${
                      selectedSize === size
                        ? 'border-[#881337] bg-[#881337] text-white'
                        : 'border-gray-300 text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity Selection */}
            <div className="space-y-3">
              <span className="font-medium text-gray-900">Quantity:</span>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition"
                >
                  −
                </button>
                <span className="w-12 text-center font-medium">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition"
                >
                  +
                </button>
              </div>
            </div>

            {/* Add to Cart & Buy Now */}
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={handleAddToCart}
                className="py-4 px-6 bg-white border-2 border-[#881337] text-[#881337] font-semibold rounded-xl hover:bg-[#881337] hover:text-white transition"
              >
                Add to Cart
              </button>
              <button 
                onClick={handleBuyNow}
                className="py-4 px-6 bg-[#881337] text-white font-semibold rounded-xl hover:bg-[#701a35] transition"
              >
                Buy Now
              </button>
            </div>

            {/* Key Features */}
            <div className="border-t border-gray-200 pt-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 12l2 2 4-4" />
                    <circle cx="12" cy="12" r="9" />
                  </svg>
                  <span>7-Day Free Exchange</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  <span>Pan India Delivery</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  <span>Secure Payments</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z" />
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                  <span>Handcrafted Quality</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Product Details Tabs */}
        <div className="mt-16 border-t border-gray-200 pt-16">
          <div className="flex space-x-8 border-b border-gray-200">
            {[
              { key: 'description', label: 'Description' },
              { key: 'details', label: 'Product Details' },
              { key: 'reviews', label: 'Reviews' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`pb-4 text-sm font-medium border-b-2 transition ${
                  activeTab === tab.key
                    ? 'border-[#881337] text-[#881337]'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="mt-8">
            {activeTab === 'description' && (
              <div className="max-w-4xl">
                <p className="text-gray-700 leading-relaxed">{product.description}</p>
              </div>
            )}
            {activeTab === 'details' && (
              <div className="max-w-4xl">
                <ul className="space-y-2">
                  {product.details.map((detail, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 bg-[#881337] rounded-full mt-2 flex-shrink-0" />
                      <span className="text-gray-700">{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {activeTab === 'reviews' && (
              <ProductReviews productId={product.id} />
            )}
          </div>
        </div>

        {/* Related Products */}
        <div className="mt-16">
          <RelatedProducts currentProduct={product} />
        </div>
      </div>

      {/* Size Guide Modal */}
      <SizeGuide isOpen={showSizeGuide} onClose={() => setShowSizeGuide(false)} />

      {/* Added to Cart Toast */}
      <AnimatePresence>
        {showAddedToast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50"
          >
            <div className="flex items-center gap-2">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 12l2 2 4-4" />
                <circle cx="12" cy="12" r="9" />
              </svg>
              <span>Added to cart!</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}