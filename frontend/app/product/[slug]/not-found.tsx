"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export default function ProductNotFound() {
  return (
    <div className="min-h-screen bg-[#faf7f2] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-md mx-auto"
      >
        {/* 404 Illustration */}
        <div className="mb-8">
          <div className="text-8xl font-serif text-[#881337] mb-4">404</div>
          <div className="w-32 h-32 mx-auto bg-gradient-to-br from-[#881337] to-[#b91c1c] rounded-full flex items-center justify-center text-white text-4xl">
            👗
          </div>
        </div>

        {/* Error Message */}
        <h1 className="text-2xl font-serif text-gray-900 mb-4">
          Product Not Found
        </h1>
        <p className="text-gray-600 mb-8 leading-relaxed">
          Oops! The product you’re looking for doesn’t exist or may have been moved. 
          Let’s get you back to our beautiful collection.
        </p>

        {/* Action Buttons */}
        <div className="space-y-4">
          <Link 
            href="/"
            className="block w-full bg-[#881337] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#701a35] transition"
          >
            Back to Home
          </Link>
          <Link 
            href="/products"
            className="block w-full bg-white border-2 border-[#881337] text-[#881337] px-6 py-3 rounded-xl font-semibold hover:bg-[#881337] hover:text-white transition"
          >
            Browse All Products
          </Link>
        </div>

        {/* Suggested Products */}
        <div className="mt-12">
          <p className="text-sm text-gray-500 mb-4">You might also like:</p>
          <div className="flex justify-center space-x-4">
            <Link href="/product/gulab-bagh-handblock-pure-mul-cotton-anarkali-set" className="text-sm text-[#881337] hover:underline">
              Gulab Bagh Anarkali
            </Link>
            <Link href="/product/chandni-ivory-chanderi-silk-zari-sharara-set" className="text-sm text-[#881337] hover:underline">
              Chandni Silk Set
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}