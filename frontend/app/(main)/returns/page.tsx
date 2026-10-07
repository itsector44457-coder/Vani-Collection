import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Returns & Exchanges | Vani Collection",
  description: "Easy returns and exchanges within 7 days. Learn about our hassle-free return policy for Vani Collection products.",
};

export default function ReturnsPage() {
  return (
    <div className="min-h-screen bg-[#faf7f2]">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#1c1917] via-[#3d2012] to-[#881337] text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="font-serif text-4xl sm:text-5xl font-light mb-4">
            Returns & Exchanges
          </h1>
          <p className="text-white/60 text-sm max-w-md mx-auto">
            Hassle-free returns within 7 days of delivery
          </p>
          {/* Breadcrumb */}
          <nav className="mt-6 flex items-center justify-center gap-2 text-xs text-white/50">
            <Link href="/" className="hover:text-white transition">Home</Link>
            <span>/</span>
            <span className="text-white/80">Returns</span>
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-xl shadow-sm border border-[#e8dfd5] p-8 md:p-12 space-y-8">
          
          {/* Return Policy Overview */}
          <section>
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
              <h2 className="font-serif text-xl text-green-800 mb-2">✓ 7-Day Return Policy</h2>
              <p className="text-green-700 text-sm">
                We offer easy returns and exchanges within 7 days of delivery. Your satisfaction is our priority.
              </p>
            </div>
          </section>

          {/* What Can Be Returned */}
          <section>
            <h2 className="font-serif text-2xl text-[#881337] mb-6">What Can Be Returned?</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-green-700 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-green-600 text-white text-xs flex items-center justify-center">✓</span>
                  Eligible for Return
                </h3>
                <ul className="space-y-2 text-sm text-stone-600 ml-7">
                  <li>• Items with manufacturing defects</li>
                  <li>• Wrong size received</li>
                  <li>• Damaged during shipping</li>
                  <li>• Items not matching product description</li>
                  <li>• Unworn items with original tags</li>
                </ul>
              </div>
              <div className="space-y-4">
                <h3 className="font-semibold text-red-700 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-red-600 text-white text-xs flex items-center justify-center">✕</span>
                  Not Eligible for Return
                </h3>
                <ul className="space-y-2 text-sm text-stone-600 ml-7">
                  <li>• Items worn or washed</li>
                  <li>• Items without original tags</li>
                  <li>• Customized or altered items</li>
                  <li>• Items damaged by customer</li>
                  <li>• Return request after 7 days</li>
                </ul>
              </div>
            </div>
          </section>

          {/* How to Return */}
          <section>
            <h2 className="font-serif text-2xl text-[#881337] mb-6">How to Return an Item</h2>
            <div className="space-y-6">
              <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-lg">
                <span className="w-8 h-8 rounded-full bg-blue-600 text-white text-sm flex items-center justify-center font-bold">1</span>
                <div>
                  <h4 className="font-semibold text-stone-800 mb-2">Initiate Return Request</h4>
                  <p className="text-sm text-stone-600 mb-2">Contact us within 7 days of delivery</p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <a href="mailto:returns@vanicollection.com" className="text-xs text-blue-600 hover:underline">
                      📧 returns@vanicollection.com
                    </a>
                    <span className="hidden sm:block text-stone-400">|</span>
                    <a href="https://wa.me/" className="text-xs text-blue-600 hover:underline">
                      💬 WhatsApp Support
                    </a>
                  </div>
                </div>
              </div>
              
              <div className="flex items-start gap-4 p-4 bg-purple-50 rounded-lg">
                <span className="w-8 h-8 rounded-full bg-purple-600 text-white text-sm flex items-center justify-center font-bold">2</span>
                <div>
                  <h4 className="font-semibold text-stone-800 mb-2">Pack the Item</h4>
                  <p className="text-sm text-stone-600">Pack in original packaging with tags attached. Include order invoice.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4 p-4 bg-green-50 rounded-lg">
                <span className="w-8 h-8 rounded-full bg-green-600 text-white text-sm flex items-center justify-center font-bold">3</span>
                <div>
                  <h4 className="font-semibold text-stone-800 mb-2">Free Pickup</h4>
                  <p className="text-sm text-stone-600">We’ll arrange free pickup from your address within 2-3 business days.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4 p-4 bg-yellow-50 rounded-lg">
                <span className="w-8 h-8 rounded-full bg-yellow-600 text-white text-sm flex items-center justify-center font-bold">4</span>
                <div>
                  <h4 className="font-semibold text-stone-800 mb-2">Refund Processing</h4>
                  <p className="text-sm text-stone-600">Refund processed within 5-7 business days after we receive the item.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Exchange Process */}
          <section>
            <h2 className="font-serif text-2xl text-[#881337] mb-6">Size Exchange</h2>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
              <h3 className="font-semibold text-amber-800 mb-3">Need a Different Size?</h3>
              <p className="text-amber-700 text-sm mb-3">
                We offer one free size exchange within 7 days of delivery, subject to availability.
              </p>
              <ul className="text-amber-600 text-xs space-y-1">
                <li>• Exchange item must be unworn with original tags</li>
                <li>• We’ll arrange pickup and delivery of the new size</li>
                <li>• No additional shipping charges for size exchange</li>
                <li>• If exact size unavailable, we’ll process a full refund</li>
              </ul>
            </div>
          </section>

          {/* Refund Methods */}
          <section>
            <h2 className="font-serif text-2xl text-[#881337] mb-6">Refund Methods</h2>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-4 border border-stone-200 rounded-lg text-center">
                <div className="text-2xl mb-2">💳</div>
                <h4 className="font-semibold text-sm text-stone-800 mb-1">Online Payment</h4>
                <p className="text-xs text-stone-600">Refunded to original payment method</p>
              </div>
              <div className="p-4 border border-stone-200 rounded-lg text-center">
                <div className="text-2xl mb-2">💰</div>
                <h4 className="font-semibold text-sm text-stone-800 mb-1">COD Orders</h4>
                <p className="text-xs text-stone-600">Bank transfer or store credit</p>
              </div>
              <div className="p-4 border border-stone-200 rounded-lg text-center">
                <div className="text-2xl mb-2">🎁</div>
                <h4 className="font-semibold text-sm text-stone-800 mb-1">Store Credit</h4>
                <p className="text-xs text-stone-600">Never expires, 110% value</p>
              </div>
            </div>
          </section>

          {/* Quality Assurance */}
          <section>
            <h2 className="font-serif text-2xl text-[#881337] mb-6">Quality Assurance</h2>
            <div className="bg-rose-50 border border-rose-200 rounded-lg p-6">
              <h3 className="font-semibold text-rose-800 mb-2">Manufacturing Defect?</h3>
              <p className="text-rose-700 text-sm mb-3">
                If you receive an item with a manufacturing defect, we’ll provide a full refund plus compensation for the inconvenience.
              </p>
              <p className="text-rose-600 text-xs">
                Every piece is handcrafted with care. If we fall short, we make it right.
              </p>
            </div>
          </section>

          {/* Contact Information */}
          <section className="border-t border-stone-200 pt-8">
            <h2 className="font-serif text-2xl text-[#881337] mb-4">Need Help with Returns?</h2>
            <p className="text-stone-600 mb-6">Our dedicated returns team is here to assist you:</p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="bg-stone-50 p-4 rounded-lg">
                <h4 className="font-semibold text-stone-800 mb-2">Email Support</h4>
                <p className="text-sm text-stone-600 mb-2">returns@vanicollection.com</p>
                <p className="text-xs text-stone-500">Response within 24 hours</p>
              </div>
              <div className="bg-stone-50 p-4 rounded-lg">
                <h4 className="font-semibold text-stone-800 mb-2">WhatsApp Support</h4>
                <p className="text-sm text-stone-600 mb-2">+91-XXX-XXX-XXXX</p>
                <p className="text-xs text-stone-500">Mon-Sat, 10 AM - 6 PM</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}