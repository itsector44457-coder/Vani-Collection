import type { Metadata } from "next";
import Link from "next/link";
import ManagedContentPage from "../../../components/ManagedContentPage";
import BreadcrumbSchema from "@/components/seo/breadcrumb-schema";
import { fetchManagedPage, managedPageMetadata } from "../../../lib/content";
import { storeWhatsAppUrl } from "../../../lib/site-contact";

const DEFAULT_METADATA: Metadata = {
  title: "Returns & Exchanges Policy | Vani Collection",
  description: "Easy returns and 7-day hassle-free exchanges for handcrafted kurties and suits. Read our transparent exchange and refund process.",
};

export async function generateMetadata(): Promise<Metadata> {
  return managedPageMetadata(await fetchManagedPage("returns"), DEFAULT_METADATA, "returns");
}

export default async function ReturnsPage() {
  const managed = await fetchManagedPage("returns");
  if (managed) return <ManagedContentPage document={managed} breadcrumb="Returns & Exchanges" slug="returns" />;

  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: "Home", path: "/" },
          { name: "Returns & Exchanges", path: "/returns" },
        ]}
      />
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
                    <a href="mailto:demo@example.com" className="text-xs text-blue-600 hover:underline flex items-center gap-1.5 font-medium">
                      <svg className="w-3.5 h-3.5 text-stone-500 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                      </svg>
                      <span>demo@example.com</span>
                    </a>
                    <span className="hidden sm:block text-stone-400">|</span>
                    <a href={storeWhatsAppUrl()} className="text-xs text-[#25D366] hover:underline flex items-center gap-1.5 font-medium mt-1">
                      <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                      </svg>
                      <span>WhatsApp Support</span>
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
            <h2 className="font-serif text-2xl text-[#881337] mb-6">Refund &amp; Store Credit Methods</h2>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-5 border border-stone-200 rounded-xl text-center bg-white shadow-xs">
                <div className="w-10 h-10 mx-auto rounded-full bg-blue-50 text-blue-700 flex items-center justify-center mb-3">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                    <line x1="1" y1="10" x2="23" y2="10" />
                  </svg>
                </div>
                <h4 className="font-semibold text-sm text-stone-800 mb-1">Online Payment</h4>
                <p className="text-xs text-stone-500">Refunded to original UPI/Card account</p>
              </div>
              <div className="p-5 border border-stone-200 rounded-xl text-center bg-white shadow-xs">
                <div className="w-10 h-10 mx-auto rounded-full bg-amber-50 text-amber-700 flex items-center justify-center mb-3">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="6" width="20" height="12" rx="2" />
                    <circle cx="12" cy="12" r="2" />
                    <path d="M6 12h.01M18 12h.01" />
                  </svg>
                </div>
                <h4 className="font-semibold text-sm text-stone-800 mb-1">COD Orders</h4>
                <p className="text-xs text-stone-500">Direct NEFT/IMPS bank transfer</p>
              </div>
              <div className="p-5 border border-stone-200 rounded-xl text-center bg-white shadow-xs">
                <div className="w-10 h-10 mx-auto rounded-full bg-[#881337]/10 text-[#881337] flex items-center justify-center mb-3">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 12 20 22 4 22 4 12" />
                    <rect x="2" y="7" width="20" height="5" />
                    <line x1="12" y1="22" x2="12" y2="7" />
                    <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
                    <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
                  </svg>
                </div>
                <h4 className="font-semibold text-sm text-stone-800 mb-1">Atelier Credit</h4>
                <p className="text-xs text-stone-500">Instant credit code with no expiry</p>
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
                <p className="text-sm text-stone-600 mb-2">demo@example.com</p>
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
    </>
  );
}