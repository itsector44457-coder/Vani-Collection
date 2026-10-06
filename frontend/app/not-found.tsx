import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page Not Found | Vani Collection",
  description: "The page you're looking for doesn't exist. Explore our beautiful collection of handcrafted ethnic wear.",
};

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#faf7f2] flex flex-col">
      {/* Simple Header */}
      <header className="border-b border-[#e8dfd5] bg-white">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center">
          <Link href="/" className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 items-center justify-center">
              <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-[#dfc28c] via-[#c9a56b] to-[#8a6d3f]" />
              <div className="absolute inset-[2px] rounded-[6px] bg-white" />
              <span className="relative font-serif text-lg font-bold text-[#881337]">V</span>
            </div>
            <div className="leading-tight">
              <div className="font-serif text-lg font-semibold text-stone-900">Vani Collection</div>
              <div className="text-[8px] font-semibold uppercase tracking-wider text-stone-400">Artisanal Luxury</div>
            </div>
          </Link>
        </div>
      </header>

      {/* 404 Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="max-w-md text-center">
          {/* Decorative Element */}
          <div className="relative mb-8">
            <div className="w-32 h-32 mx-auto relative">
              {/* Ornate Pattern Background */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#881337]/10 via-[#dfc28c]/20 to-[#881337]/10" />
              <div className="absolute inset-2 rounded-full border-2 border-dashed border-[#881337]/30" />
              
              {/* 404 Text */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-serif text-3xl font-bold text-[#881337]">404</span>
              </div>
              
              {/* Decorative Corner Elements */}
              <div className="absolute -top-2 -left-2 w-4 h-4 border-l-2 border-t-2 border-[#dfc28c]" />
              <div className="absolute -top-2 -right-2 w-4 h-4 border-r-2 border-t-2 border-[#dfc28c]" />
              <div className="absolute -bottom-2 -left-2 w-4 h-4 border-l-2 border-b-2 border-[#dfc28c]" />
              <div className="absolute -bottom-2 -right-2 w-4 h-4 border-r-2 border-b-2 border-[#dfc28c]" />
            </div>
          </div>

          {/* Main Message */}
          <h1 className="font-serif text-3xl font-light text-gray-900 mb-4">
            Page Not Found
          </h1>
          
          <p className="text-gray-600 mb-2 leading-relaxed">
            We couldn’t find the page you’re looking for. It might have been moved, deleted, or you entered an incorrect URL.
          </p>
          
          <p className="text-sm text-gray-500 mb-8">
            But don’t worry – our beautiful collection is just a click away!
          </p>

          {/* Action Buttons */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/"
                className="flex-1 bg-[#881337] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#701a35] transition text-center"
              >
                Back to Home
              </Link>
              <Link
                href="/products"
                className="flex-1 border-2 border-[#881337] text-[#881337] px-6 py-3 rounded-xl font-semibold hover:bg-[#881337] hover:text-white transition text-center"
              >
                Shop Collection
              </Link>
            </div>
            
            {/* Quick Navigation */}
            <div className="pt-4 border-t border-gray-200">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
                Popular Pages
              </p>
              <div className="flex flex-wrap justify-center gap-4 text-sm">
                <Link href="/products?category=mul-cotton" className="text-[#881337] hover:underline">
                  Mul Cotton
                </Link>
                <Link href="/products?category=festive" className="text-[#881337] hover:underline">
                  Festive Edit
                </Link>
                <Link href="/products?category=anarkalis" className="text-[#881337] hover:underline">
                  Anarkalis
                </Link>
                <Link href="/reels" className="text-[#881337] hover:underline">
                  Reels
                </Link>
              </div>
            </div>
          </div>

          {/* Help Section */}
          <div className="mt-12 p-6 bg-white rounded-2xl border border-gray-200 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-2">Need Help?</h3>
            <p className="text-sm text-gray-600 mb-4">
              Our customer support team is here to assist you
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <a
                href="mailto:support@vanicollection.com"
                className="flex-1 text-xs text-[#881337] hover:underline font-medium text-center sm:text-left"
              >
                📧 Email Support
              </a>
              <a
                href="https://wa.me/?text=Hi, I need help navigating the website"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-xs text-[#881337] hover:underline font-medium text-center sm:text-right"
              >
                💬 WhatsApp Chat
              </a>
            </div>
          </div>

          {/* Trust Indicators */}
          <div className="mt-8 flex justify-center gap-6 text-xs text-gray-400">
            <span>🔒 Secure Shopping</span>
            <span>🚚 Free Shipping</span>
            <span>↩️ Easy Returns</span>
          </div>
        </div>
      </main>

      {/* Simple Footer */}
      <footer className="border-t border-[#e8dfd5] bg-white py-6">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-xs text-gray-500">
            © {new Date().getFullYear()} Vani Collection Atelier. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}