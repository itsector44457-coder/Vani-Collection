"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "../../../context/CartContext";
import { notFound, useRouter } from "next/navigation";
import Link from "next/link";
import { calculateDiscount, generateBreadcrumbs } from "../../../lib/utils";
import { useStoreProduct } from "../../../lib/use-storefront";
import ProductImageGallery from "../../../components/ProductImageGallery";
import SizeGuide from "../../../components/SizeGuide";
import ProductReviews from "../../../components/ProductReviews";
import RelatedProducts from "../../../components/RelatedProducts";
import PincodeDeliveryChecker from "../../../components/PincodeDeliveryChecker";

type ProductTab = "description" | "details" | "reviews";

const COLOR_SWATCHES: Record<string, string> = {
  black: "#171717",
  white: "#ffffff",
  red: "#dc2626",
  maroon: "#881337",
  pink: "#ec4899",
  "hot pink": "#db2777",
  yellow: "#facc15",
  orange: "#f97316",
  green: "#16a34a",
  olive: "#737c26",
  teal: "#0d9488",
  blue: "#2563eb",
  navy: "#1e3a8a",
  purple: "#9333ea",
  lavender: "#c4b5fd",
  brown: "#854d0e",
  beige: "#d6c2a1",
  cream: "#fff7dc",
  grey: "#6b7280",
  gray: "#6b7280",
  silver: "#cbd5e1",
  gold: "#d4a72c",
};

const swatchBackground = (color: string) =>
  /^#[\da-f]{6}$/i.test(color)
    ? color
    : color.toLowerCase() === "multicolor"
      ? "linear-gradient(135deg, #e11d48, #facc15, #16a34a, #2563eb, #9333ea)"
      : COLOR_SWATCHES[color.toLowerCase()] ?? "#a8a29e";

/**
 * The interactive product page.
 *
 * Split out of `page.tsx` so that file can be a Server Component and export `generateMetadata` and
 * the JSON-LD markup — neither of which is possible from a `"use client"` module. The slug arrives
 * already resolved; this component owns everything that needs the browser (cart, wishlist, tabs,
 * size guide, toasts) and loads product data from the storefront API.
 */
export default function ProductView({ slug }: { slug: string }) {
  const storeProduct = useStoreProduct(slug);
  const { addToCart, toggleWishlist, isInWishlist, error: cartError } = useCart();
  const router = useRouter();

  const product = storeProduct.data;
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<ProductTab>("description");
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const [showAddedToast, setShowAddedToast] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const getWhatsAppShareUrl = () => {
    if (!product) return "#";
    const currentUrl = typeof window !== "undefined" ? window.location.href : "";
    const text =
      `Namaste Vani Collection Atelier! 🌸\n\n` +
      `I am interested in:\n*${product.title}*\n` +
      `• Price: ₹${product.price.toLocaleString("en-IN")}\n` +
      (activeSize ? `• Selected Size: ${activeSize}\n` : "") +
      (activeColor ? `• Color: ${activeColor}\n` : "") +
      (activeVariant?.sku ? `• SKU: ${activeVariant.sku}\n` : "") +
      `• Product Link: ${currentUrl}\n\n` +
      `Could you please assist me with availability, delivery schedule, or custom styling?`;
    return `https://wa.me/919876543210?text=${encodeURIComponent(text)}`;
  };

  const handleCopyLink = async () => {
    if (typeof window === "undefined") return;
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      /* ignore */
    }
  };

  const productColors = Array.from(new Set((product?.variants ?? [])
    .map((variant) => variant.color)
    .filter((color): color is string => typeof color === "string" && Boolean(color) && color.toLowerCase() !== "as shown")));
  const activeColor = productColors.includes(selectedColor) ? selectedColor : (productColors[0] ?? "");
  const colorVariants = (product?.variants ?? []).filter((variant) => !activeColor || variant.color === activeColor);
  const colorSizes = Array.from(new Set(colorVariants.map((variant) => variant.size).filter((size): size is string => Boolean(size))));
  /* The first available size/color pair is the default; the visitor's explicit pick wins. */
  const activeSize = colorSizes.includes(selectedSize) ? selectedSize : (colorSizes[0] ?? product?.sizes[0] ?? "");
  const activeVariant = colorVariants.find((variant) => variant.size === activeSize);
  const galleryImages = activeVariant?.images?.length
    ? activeVariant.images
    : product ? Array.from(new Set([product.image, product.hoverImage].filter(Boolean))) : [];

  if (!product) {
    if (storeProduct.loading) {
      return (
        <div className="min-h-screen bg-[#faf7f2] flex items-center justify-center">
          <p className="text-sm text-stone-500">Loading this piece…</p>
        </div>
      );
    }
    if (storeProduct.error) {
      return (
        <main className="flex min-h-[55vh] flex-col items-center justify-center px-4 text-center">
          <h1 className="font-serif text-2xl text-stone-900">Product unavailable</h1>
          <p className="mt-3 max-w-md text-sm text-stone-600">{storeProduct.error}</p>
          <button
            type="button"
            onClick={storeProduct.refresh}
            className="mt-5 rounded-xl bg-[#881337] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#701a35]"
          >
            Try again
          </button>
          <Link href="/products" className="mt-3 text-sm font-semibold text-[#881337] hover:underline">
            Browse Products
          </Link>
        </main>
      );
    }
    notFound();
  }

  const isWishlisted = isInWishlist(product.id);
  const handleAddToCart = async () => {
    await addToCart(product, activeSize, quantity, activeColor || undefined);
    setShowAddedToast(true);
    setTimeout(() => setShowAddedToast(false), 3000);
  };

  const handleBuyNow = async () => {
    await addToCart(product, activeSize, quantity, activeColor || undefined);
    router.push("/checkout");
  };

  const handleWishlistToggle = () => {
    toggleWishlist(product.id);
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
              key={galleryImages.join("\u0000")}
              images={galleryImages}
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
                  aria-label={isWishlisted ? `Remove ${product.title} from wishlist` : `Add ${product.title} to wishlist`}
                  aria-pressed={isWishlisted}
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
                <span className="text-3xl font-bold text-gray-900">₹{(activeVariant?.price ?? product.price).toLocaleString()}</span>
                <span className="text-lg text-gray-500 line-through">₹{(activeVariant?.mrp ?? product.originalPrice).toLocaleString()}</span>
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm font-semibold">
                  {discountPercentage}% OFF
                </span>
              </div>
              <p className="text-sm text-gray-600">Inclusive of all taxes • Free shipping above ₹1,999</p>
            </div>

            {productColors.length > 0 && (
              <div className="space-y-3">
                <span className="font-medium text-gray-900">Color:</span>
                <div className="flex flex-wrap items-center gap-3">
                  {productColors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setSelectedColor(color)}
                      aria-pressed={activeColor === color}
                      aria-label={`Choose ${color} color`}
                      title={color}
                      className={`h-9 w-9 rounded-full border border-black/15 transition ${
                        activeColor === color ? "ring-2 ring-[#881337] ring-offset-2" : "hover:ring-2 hover:ring-stone-300 hover:ring-offset-1"
                      }`}
                      style={{ background: swatchBackground(color) }}
                    >
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Size Selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-900">Size:</span>
                <button 
                  onClick={() => setShowSizeGuide(true)}
                  className="text-sm text-[#881337] hover:underline font-medium inline-flex items-center gap-1.5"
                >
                  <svg className="w-4 h-4 text-[#881337]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.3 8.7l-6-6a1 1 0 0 0-1.4 0l-11 11a1 1 0 0 0 0 1.4l6 6a1 1 0 0 0 1.4 0l11-11a1 1 0 0 0 0-1.4z" />
                    <line x1="14.5" y1="5.5" x2="16.5" y2="7.5" />
                    <line x1="11.5" y1="8.5" x2="14.5" y2="11.5" />
                    <line x1="8.5" y1="11.5" x2="10.5" y2="13.5" />
                    <line x1="5.5" y1="14.5" x2="8.5" y2="17.5" />
                  </svg>
                  <span>Size Guide</span>
                </button>
              </div>
              <div className="grid grid-cols-6 gap-2">
                {colorSizes.map((size) => {
                  const matchingVariant = colorVariants.find((variant) => variant.size === size);
                  const available = matchingVariant?.available;
                  const soldOut = available !== undefined && available <= 0;
                  return (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      disabled={soldOut}
                      title={soldOut ? `${size} is sold out` : available !== undefined ? `${available} left in ${size}` : undefined}
                      className={`relative py-3 px-4 border rounded-lg text-sm font-medium transition ${
                        activeSize === size
                          ? 'border-[#881337] bg-[#881337] text-white'
                          : soldOut
                          ? 'border-gray-200 text-gray-300 cursor-not-allowed line-through'
                          : 'border-gray-300 text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
              {product.sizes.length === 0 && (
                <p className="text-sm text-stone-500">This piece is available on request — please contact the atelier.</p>
              )}
            </div>

            {/* Quantity Selection */}
            <div className="space-y-3">
              <span className="font-medium text-gray-900">Quantity:</span>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition"
                  aria-label="Decrease quantity"
                  disabled={quantity === 1}
                >
                  −
                </button>
                <span className="w-12 text-center font-medium">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition"
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
            </div>

            {cartError && (
              <p role="alert" className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-[12.5px] text-rose-700 ring-1 ring-rose-200">
                {cartError}
              </p>
            )}

            {/* Add to Cart & Buy Now */}
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={handleAddToCart}
                className="py-4 px-6 bg-white border-2 border-[#881337] text-[#881337] font-semibold rounded-xl hover:bg-[#881337] hover:text-white transition shadow-sm text-center"
              >
                Add to Cart
              </button>
              <button 
                onClick={handleBuyNow}
                className="py-4 px-6 bg-[#881337] text-white font-semibold rounded-xl hover:bg-[#701a35] transition shadow-md shadow-[#881337]/15 text-center"
              >
                Buy Now
              </button>
            </div>

            {/* WhatsApp Atelier Inquiries & Share */}
            <div className="flex items-center gap-2.5">
              <a
                href={getWhatsAppShareUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl border border-emerald-600/30 bg-emerald-50/70 text-emerald-900 font-medium text-xs sm:text-sm hover:bg-emerald-100/80 hover:border-emerald-600/50 transition shadow-sm"
              >
                <svg className="w-4 h-4 text-emerald-600 shrink-0 fill-current" viewBox="0 0 24 24">
                  <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.667-.698c.969.586 1.761.859 2.793.859 3.179 0 5.767-2.587 5.767-5.766.001-3.18-2.585-5.766-5.767-5.766zm10.158 5.765c-.004 5.618-4.577 10.19-10.19 10.19-1.782 0-3.488-.466-4.986-1.334l-5.513 1.446 1.472-5.378c-.952-1.57-1.475-3.376-1.475-5.234.004-5.618 4.578-10.19 10.192-10.19 5.613 0 10.194 4.572 10.196 10.191z" />
                </svg>
                <span>Order / Inquire via WhatsApp</span>
              </a>

              <button
                type="button"
                onClick={handleCopyLink}
                title={copiedLink ? "Link copied to clipboard!" : "Share this piece"}
                aria-label="Share this piece"
                className="inline-flex items-center justify-center h-11 w-11 rounded-xl border border-stone-200 bg-white text-stone-600 hover:text-stone-900 hover:border-stone-400 transition shrink-0 relative"
              >
                {copiedLink ? (
                  <svg className="w-4 h-4 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="18" cy="5" r="3" />
                    <circle cx="6" cy="12" r="3" />
                    <circle cx="18" cy="19" r="3" />
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                  </svg>
                )}
                {copiedLink && (
                  <span className="absolute -top-7 right-0 text-[10px] font-medium bg-stone-900 text-white px-2 py-0.5 rounded shadow whitespace-nowrap">
                    Link Copied!
                  </span>
                )}
              </button>
            </div>

            {/* Pincode & Delivery Estimator */}
            <PincodeDeliveryChecker />

            {/* Key Features */}
            <div className="border-t border-gray-200 pt-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="9" />
                    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                  </svg>
                  <span className="font-medium text-stone-900">No Return &amp; Exchange</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="1" y="3" width="15" height="13" />
                    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                    <circle cx="5.5" cy="18.5" r="2.5" />
                    <circle cx="18.5" cy="18.5" r="2.5" />
                  </svg>
                  <span>Free Shipping</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <span>100% Secure Payment</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <span>24/7 Customers Support</span>
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
                onClick={() => setActiveTab(tab.key as ProductTab)}
                role="tab"
                aria-selected={activeTab === tab.key}
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
              <ProductReviews productId={product.id} apiProductId={product.productId} />
            )}
          </div>
        </div>

        {/* Related Products */}
        <div className="mt-16">
          <RelatedProducts currentProduct={product} />
        </div>
      </div>

      {/* Size Guide Modal */}
      <SizeGuide
        isOpen={showSizeGuide}
        onClose={() => setShowSizeGuide(false)}
        productName={product.title}
        customGuide={product.sizeGuide}
      />

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