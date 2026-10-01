"use client";

import { useEffect } from "react";
import Link from "next/link";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Application error:", error);
  }, [error]);

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

      {/* Error Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="max-w-md text-center">
          {/* Decorative Element */}
          <div className="relative mb-8">
            <div className="w-32 h-32 mx-auto relative">
              {/* Error Pattern Background */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-red-100 via-orange-50 to-red-100" />
              <div className="absolute inset-2 rounded-full border-2 border-dashed border-red-300" />
              
              {/* Error Icon */}
              <div className="absolute inset-0 flex items-center justify-center">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              
              {/* Decorative Corner Elements */}
              <div className="absolute -top-2 -left-2 w-4 h-4 border-l-2 border-t-2 border-red-300" />
              <div className="absolute -top-2 -right-2 w-4 h-4 border-r-2 border-t-2 border-red-300" />
              <div className="absolute -bottom-2 -left-2 w-4 h-4 border-l-2 border-b-2 border-red-300" />
              <div className="absolute -bottom-2 -right-2 w-4 h-4 border-r-2 border-b-2 border-red-300" />
            </div>
          </div>

          {/* Main Message */}
          <h1 className="font-serif text-3xl font-light text-gray-900 mb-4">
            Something Went Wrong
          </h1>
          
          <p className="text-gray-600 mb-2 leading-relaxed">
            We encountered an unexpected error while processing your request. Our team has been notified and is working to fix this issue.
          </p>
          
          <p className="text-sm text-gray-500 mb-8">
            Please try again, or contact us if the problem persists.
          </p>

          {/* Technical Details (Development) */}
          {process.env.NODE_ENV === 'development' && (
            <details className="mb-8 text-left bg-red-50 border border-red-200 rounded-lg p-4">
              <summary className="text-sm font-semibold text-red-800 cursor-pointer mb-2">
                Technical Details (Development Mode)
              </summary>
              <pre className="text-xs text-red-700 overflow-auto">
                {error.message}
                {error.stack && '\n\n' + error.stack}
              </pre>
            </details>
          )}

          {/* Action Buttons */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={reset}
                className="flex-1 bg-[#881337] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#701a35] transition"
              >
                Try Again
              </button>
              <Link
                href="/"
                className="flex-1 border-2 border-[#881337] text-[#881337] px-6 py-3 rounded-xl font-semibold hover:bg-[#881337] hover:text-white transition text-center"
              >
                Back to Home
              </Link>
            </div>
            
            {/* Quick Navigation */}
            <div className="pt-4 border-t border-gray-200">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
                Or Continue Shopping
              </p>
              <div className="flex flex-wrap justify-center gap-4 text-sm">
                <Link href="/products" className="text-[#881337] hover:underline">
                  All Products
                </Link>
                <Link href="/products?category=mul-cotton" className="text-[#881337] hover:underline">
                  Mul Cotton
                </Link>
                <Link href="/products?category=festive" className="text-[#881337] hover:underline">
                  Festive Edit
                </Link>
                <Link href="/account" className="text-[#881337] hover:underline">
                  My Account
                </Link>
              </div>
            </div>
          </div>

          {/* Help Section */}
          <div className="mt-12 p-6 bg-white rounded-2xl border border-gray-200 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-2">Still Having Issues?</h3>
            <p className="text-sm text-gray-600 mb-4">
              Our customer support team is here to help resolve any problems
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <a
                href="mailto:support@vanicollection.com?subject=Website Error"
                className="flex-1 text-xs text-[#881337] hover:underline font-medium text-center sm:text-left"
              >
                📧 Report Issue via Email
              </a>
              <a
                href="https://wa.me/?text=Hi, I encountered an error on the website and need help"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-xs text-[#881337] hover:underline font-medium text-center sm:text-right"
              >
                💬 Get Help on WhatsApp
              </a>
            </div>
          </div>

          {/* Error ID for Support */}
          {error.digest && (
            <div className="mt-6 text-xs text-gray-400">
              Error ID: {error.digest}
            </div>
          )}
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