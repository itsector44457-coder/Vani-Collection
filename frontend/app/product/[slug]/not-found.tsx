"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";

export default function ProductNotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#faf7f2] px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-md text-center"
      >
        <Image
          src="/product-not-found.jpg"
          alt="Product not found"
          width={640}
          height={480}
          priority
          className="mx-auto mb-8 max-h-[min(48vh,420px)] w-auto max-w-full rounded-2xl object-contain"
        />
        <p className="mb-3 font-serif text-5xl font-semibold text-[#881337]">404</p>
        <h1 className="mb-4 font-serif text-2xl text-stone-900">Product Not Found</h1>
        <p className="mb-8 leading-relaxed text-stone-600">
          This product may have been removed or the link may be incorrect.
        </p>
        <div className="space-y-3">
          <Link href="/products" className="block w-full rounded-xl bg-[#881337] px-6 py-3 font-semibold text-white transition hover:bg-[#701a35]">
            Browse Products
          </Link>
          <Link href="/" className="block w-full rounded-xl border-2 border-[#881337] bg-white px-6 py-3 font-semibold text-[#881337] transition hover:bg-[#881337] hover:text-white">
            Back to Home
          </Link>
        </div>
      </motion.div>
    </main>
  );
}
