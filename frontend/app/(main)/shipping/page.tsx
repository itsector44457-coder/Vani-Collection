import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Shipping Information | Vani Collection",
  description: "Learn about our shipping policies, delivery times, and shipping charges for Vani Collection products across India.",
};

export default function ShippingPage() {
  return (
    <div className="min-h-screen bg-[#faf7f2]">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#1c1917] via-[#3d2012] to-[#881337] text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="font-serif text-4xl sm:text-5xl font-light mb-4">
            Shipping Information
          </h1>
          <p className="text-white/60 text-sm max-w-md mx-auto">
            Everything you need to know about our delivery services
          </p>
          {/* Breadcrumb */}
          <nav className="mt-6 flex items-center justify-center gap-2 text-xs text-white/50">
            <Link href="/" className="hover:text-white transition">Home</Link>
            <span>/</span>
            <span className="text-white/80">Shipping</span>
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-xl shadow-sm border border-[#e8dfd5] p-8 md:p-12 space-y-8">
          
          {/* Shipping Zones */}
          <section>
            <h2 className="font-serif text-2xl text-[#881337] mb-6">Shipping Zones & Charges</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-[#f8f7f4] p-6 rounded-lg">
                <h3 className="font-semibold text-lg mb-3 text-stone-800">Free Shipping</h3>
                <p className="text-sm text-stone-600 mb-2">Orders above ₹1,999</p>
                <p className="text-xs text-stone-500">Available across India</p>
              </div>
              <div className="bg-[#f8f7f4] p-6 rounded-lg">
                <h3 className="font-semibold text-lg mb-3 text-stone-800">Express Shipping</h3>
                <p className="text-sm text-stone-600 mb-2">₹149 for orders below ₹1,999</p>
                <p className="text-xs text-stone-500">1-3 business days delivery</p>
              </div>
            </div>
          </section>

          {/* Delivery Timeline */}
          <section>
            <h2 className="font-serif text-2xl text-[#881337] mb-6">Delivery Timeline</h2>
            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 bg-green-50 rounded-lg">
                <span className="w-6 h-6 rounded-full bg-green-600 text-white text-xs flex items-center justify-center font-bold">1</span>
                <div>
                  <h4 className="font-semibold text-stone-800">Order Processing</h4>
                  <p className="text-sm text-stone-600">1-2 business days for handcrafted items</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-lg">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">2</span>
                <div>
                  <h4 className="font-semibold text-stone-800">Dispatch</h4>
                  <p className="text-sm text-stone-600">Orders dispatched from our Jaipur atelier</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 bg-purple-50 rounded-lg">
                <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-white text-xs flex items-center justify-center font-bold">3</span>
                <div>
                  <h4 className="font-semibold text-stone-800">Delivery</h4>
                  <p className="text-sm text-stone-600">Metro cities: 2-4 days | Other cities: 5-7 days</p>
                </div>
              </div>
            </div>
          </section>

          {/* Shipping Partners */}
          <section>
            <h2 className="font-serif text-2xl text-[#881337] mb-6">Shipping Partners</h2>
            <p className="text-stone-600 mb-4">We work with trusted logistics partners to ensure safe delivery:</p>
            <div className="flex flex-wrap gap-4">
              {["BlueDart", "FedEx", "Delhivery", "DTDC"].map((partner) => (
                <span key={partner} className="px-4 py-2 bg-stone-100 text-stone-700 rounded-full text-sm font-medium">
                  {partner}
                </span>
              ))}
            </div>
          </section>

          {/* COD Information */}
          <section>
            <h2 className="font-serif text-2xl text-[#881337] mb-6">Cash on Delivery (COD)</h2>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
              <h3 className="font-semibold text-amber-800 mb-2">COD Available</h3>
              <p className="text-amber-700 text-sm mb-2">Additional charges: ₹50 for COD orders</p>
              <p className="text-amber-600 text-xs">Available for orders up to ₹15,000</p>
            </div>
          </section>

          {/* International Shipping */}
          <section>
            <h2 className="font-serif text-2xl text-[#881337] mb-6">International Shipping</h2>
            <p className="text-stone-600 mb-4">We ship worldwide! Contact us for international shipping quotes:</p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <p className="text-blue-800 text-sm mb-2">📧 Email: international@vanicollection.com</p>
              <p className="text-blue-800 text-sm">📱 WhatsApp: +91-XXX-XXX-XXXX</p>
            </div>
          </section>

          {/* Contact for Questions */}
          <section className="border-t border-stone-200 pt-8">
            <h2 className="font-serif text-2xl text-[#881337] mb-4">Questions about Shipping?</h2>
            <p className="text-stone-600 mb-4">Our customer support team is here to help:</p>
            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href="mailto:support@vanicollection.com"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#881337] text-white rounded-full text-sm font-medium hover:bg-[#701a35] transition"
              >
                📧 Email Support
              </a>
              <a
                href="https://wa.me/?text=Hi, I have a question about shipping"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#25D366] text-white rounded-full text-sm font-medium hover:bg-[#1ea952] transition"
              >
                💬 WhatsApp Chat
              </a>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}