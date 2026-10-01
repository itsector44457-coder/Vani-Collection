"use client";

import Link from "next/link";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#1c1917] text-white">
      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          
          {/* Brand Section */}
          <div className="lg:col-span-1">
            <div className="mb-6">
              <h3 className="font-serif text-2xl text-[#dfc28c] mb-2">Vani Collection</h3>
              <p className="text-[10px] uppercase tracking-[0.3em] text-white/60 mb-4">Atelier</p>
              <p className="text-sm text-white/80 leading-relaxed">
                Handcrafted luxury in 100-count pure Mul Cotton, Bagru handblock prints, and royal Anarkalis from our Jaipur atelier.
              </p>
            </div>
            
            {/* Social Links */}
            <div className="flex gap-3">
              <a 
                href="https://instagram.com/vanicollection" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition"
                aria-label="Instagram"
              >
                <span className="text-sm">📷</span>
              </a>
              <a 
                href="https://facebook.com/vanicollection" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition"
                aria-label="Facebook"
              >
                <span className="text-sm">👥</span>
              </a>
              <a 
                href="https://wa.me/?text=Hello%20Vani%20Collection!" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition"
                aria-label="WhatsApp"
              >
                <span className="text-sm">💬</span>
              </a>
            </div>
          </div>

          {/* Shop Links */}
          <div>
            <h4 className="font-semibold text-white mb-4">Shop</h4>
            <ul className="space-y-3">
              <li>
                <Link 
                  href="/products?category=mul-cotton" 
                  className="text-sm text-white/70 hover:text-[#dfc28c] transition"
                >
                  Mul Cotton Collection
                </Link>
              </li>
              <li>
                <Link 
                  href="/products?category=festive" 
                  className="text-sm text-white/70 hover:text-[#dfc28c] transition"
                >
                  Festive Edit
                </Link>
              </li>
              <li>
                <Link 
                  href="/products?category=anarkalis" 
                  className="text-sm text-white/70 hover:text-[#dfc28c] transition"
                >
                  Anarkali Suits
                </Link>
              </li>
              <li>
                <Link 
                  href="/products?category=coord-sets" 
                  className="text-sm text-white/70 hover:text-[#dfc28c] transition"
                >
                  Co-ord Sets
                </Link>
              </li>
              <li>
                <Link 
                  href="/products" 
                  className="text-sm text-white/70 hover:text-[#dfc28c] transition"
                >
                  All Products
                </Link>
              </li>
            </ul>
          </div>

          {/* Customer Care */}
          <div>
            <h4 className="font-semibold text-white mb-4">Customer Care</h4>
            <ul className="space-y-3">
              <li>
                <Link 
                  href="/shipping" 
                  className="text-sm text-white/70 hover:text-[#dfc28c] transition"
                >
                  Shipping Information
                </Link>
              </li>
              <li>
                <Link 
                  href="/returns" 
                  className="text-sm text-white/70 hover:text-[#dfc28c] transition"
                >
                  Returns & Exchanges
                </Link>
              </li>
              <li>
                <Link 
                  href="/size-guide" 
                  className="text-sm text-white/70 hover:text-[#dfc28c] transition"
                >
                  Size Guide
                </Link>
              </li>
              <li>
                <a 
                  href="mailto:support@vanicollection.com"
                  className="text-sm text-white/70 hover:text-[#dfc28c] transition"
                >
                  Contact Support
                </a>
              </li>
              <li>
                <a 
                  href="https://wa.me/?text=Hi, I need help"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-white/70 hover:text-[#dfc28c] transition"
                >
                  WhatsApp Help
                </a>
              </li>
            </ul>
          </div>

          {/* About & Legal */}
          <div>
            <h4 className="font-semibold text-white mb-4">About</h4>
            <ul className="space-y-3">
              <li>
                <Link 
                  href="/about" 
                  className="text-sm text-white/70 hover:text-[#dfc28c] transition"
                >
                  Our Story
                </Link>
              </li>
              <li>
                <Link 
                  href="/craftsmanship" 
                  className="text-sm text-white/70 hover:text-[#dfc28c] transition"
                >
                  Craftsmanship
                </Link>
              </li>
              <li>
                <Link 
                  href="/privacy" 
                  className="text-sm text-white/70 hover:text-[#dfc28c] transition"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link 
                  href="/terms" 
                  className="text-sm text-white/70 hover:text-[#dfc28c] transition"
                >
                  Terms & Conditions
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Newsletter Signup */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h4 className="font-semibold text-white mb-2">Stay Connected</h4>
              <p className="text-sm text-white/70">
                Be the first to know about new collections and exclusive offers
              </p>
            </div>
            <div className="flex gap-3 w-full md:w-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 md:w-64 px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#dfc28c]/50 focus:border-[#dfc28c]"
              />
              <button className="px-6 py-2.5 bg-[#881337] hover:bg-[#701a35] text-white rounded-lg text-sm font-medium transition whitespace-nowrap">
                Subscribe
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Trust Badges & Certifications */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-white/60">
            <span className="flex items-center gap-2">
              <span>🔒</span>
              SSL Secured
            </span>
            <span className="flex items-center gap-2">
              <span>✓</span>
              100% Authentic
            </span>
            <span className="flex items-center gap-2">
              <span>🚚</span>
              Free Shipping ₹1,999+
            </span>
            <span className="flex items-center gap-2">
              <span>💎</span>
              Handcrafted in Jaipur
            </span>
            <span className="flex items-center gap-2">
              <span>↩️</span>
              7-Day Returns
            </span>
          </div>
        </div>
      </div>

      {/* Copyright */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-white/60">
              © {currentYear} Vani Collection Atelier. All rights reserved.
            </p>
            <div className="flex gap-4">
              <span className="text-xs text-white/40">Made with ♥ in Jaipur</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}