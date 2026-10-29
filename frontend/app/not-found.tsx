import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  // Absolute prevents the root `%s | Demo Collection` template from branding the title twice.
  title: { absolute: "Page Not Found | Demo Collection" },
  description: "The page you’re looking for could not be found.",
};

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#faf7f2] px-4 py-12 text-center">
      <Image
        src="/product-not-found.jpg"
        alt="Product not found"
        width={640}
        height={480}
        priority
        className="mb-8 max-h-[min(48vh,420px)] w-auto max-w-full rounded-2xl object-contain"
      />
      <p className="mb-3 font-serif text-5xl font-semibold text-[#881337]">404</p>
      <h1 className="mb-3 font-serif text-3xl font-medium text-stone-900">Page Not Found</h1>
      <p className="mb-8 max-w-md text-sm leading-relaxed text-stone-600">
        We couldn’t find the page you’re looking for. It may have moved or the address may be incorrect.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link href="/" className="rounded-xl bg-[#881337] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#701a35]">
          Back to Home
        </Link>
        <Link href="/products" className="rounded-xl border-2 border-[#881337] px-6 py-3 text-sm font-semibold text-[#881337] transition hover:bg-[#881337] hover:text-white">
          Browse Products
        </Link>
      </div>
    </main>
  );
}
