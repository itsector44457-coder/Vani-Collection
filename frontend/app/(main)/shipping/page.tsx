import type { Metadata } from "next";
import Link from "next/link";
import ManagedContentPage from "../../../components/ManagedContentPage";
import BreadcrumbSchema from "@/components/seo/breadcrumb-schema";
import { fetchManagedPage, managedPageMetadata } from "../../../lib/content";
import { STORE_PHONE_DISPLAY, storeWhatsAppUrl } from "../../../lib/site-contact";

const DEFAULT_METADATA: Metadata = {
  title: "Shipping & Delivery Policy | Demo Collection",
  description: "Learn about our shipping policies, express delivery times across India, and free shipping over ₹1,999 for Demo Collection artisanal kurties and dresses.",
};

export async function generateMetadata(): Promise<Metadata> {
  return managedPageMetadata(await fetchManagedPage("shipping"), DEFAULT_METADATA, "shipping");
}

export default async function ShippingPage() {
  const managed = await fetchManagedPage("shipping");
  if (managed) return <ManagedContentPage document={managed} breadcrumb="Shipping" slug="shipping" />;

  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: "Home", path: "/" },
          { name: "Shipping & Delivery", path: "/shipping" },
        ]}
      />
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
                <p className="text-sm text-stone-600 mb-2">Orders of ₹1,999 or more (after discount)</p>
                <p className="text-xs text-stone-500">Available across India</p>
              </div>
              <div className="bg-[#f8f7f4] p-6 rounded-lg">
                <h3 className="font-semibold text-lg mb-3 text-stone-800">Standard Shipping</h3>
                <p className="text-sm text-stone-600 mb-2">₹79–₹99 for orders below ₹1,999, by delivery pincode</p>
                <p className="text-xs text-stone-500">Sahi charge checkout par pincode likhne par confirm hota hai — wahi charge lagega jo wahan dikhega.</p>
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
                  <p className="text-sm text-stone-600">Handcrafted pieces aam taur par 2–3 working days me taiyaar karke dispatch kiye jate hain.</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-lg">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">2</span>
                <div>
                  <h4 className="font-semibold text-stone-800">Dispatch</h4>
                  <p className="text-sm text-stone-600">Orders Demo atelier se dispatch hote hain; AWB SMS, WhatsApp aur email par bheja jata hai.</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 bg-purple-50 rounded-lg">
                <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-white text-xs flex items-center justify-center font-bold">3</span>
                <div>
                  <h4 className="font-semibold text-stone-800">Delivery</h4>
                  <p className="text-sm text-stone-600">Aapke pincode ki estimated delivery date product page aur checkout par pincode check karne par dikhti hai.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Shipping Partners */}
          <section>
            <h2 className="font-serif text-2xl text-[#881337] mb-6">Shipping Partners</h2>
            <p className="text-stone-600 mb-4">Har order ke liye courier partner pincode aur service ke hisab se chuna jata hai. Dispatch ke samay courier ka naam aur AWB number SMS, WhatsApp aur email par confirm kiya jata hai — parcel bina login ke hamare <a href="/track-order" className="font-semibold text-[#881337] underline">Track Order page</a> se bhi track hota hai.</p>
          </section>

          {/* COD Information */}
          <section>
            <h2 className="font-serif text-2xl text-[#881337] mb-6">Cash on Delivery (COD)</h2>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
              <h3 className="font-semibold text-amber-800 mb-2">COD Available</h3>
              <p className="text-amber-700 text-sm mb-2">COD par koi extra charge nahi hai — delivery par wahi order total dena hota hai jo checkout par dikha tha.</p>
              <p className="text-amber-600 text-xs">COD chune hue pincodes par milta hai; checkout par pincode check karke confirm ho jata hai.</p>
            </div>
          </section>

          {/* International Shipping */}
          <section>
            <h2 className="font-serif text-2xl text-[#881337] mb-6">International Shipping</h2>
            <p className="text-stone-600 mb-4">Online checkout abhi sirf India ke liye hai. Bharat ke bahar delivery ke liye pehle humse sampark kare — hum jaanch karke sahi shipping quote denge:</p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <p className="text-blue-800 text-sm mb-2">📧 Email: demo@example.com</p>
              <p className="text-blue-800 text-sm">📱 WhatsApp: {STORE_PHONE_DISPLAY}</p>
            </div>
          </section>

          {/* Contact for Questions */}
          <section className="border-t border-stone-200 pt-8">
            <h2 className="font-serif text-2xl text-[#881337] mb-4">Questions about Shipping?</h2>
            <p className="text-stone-600 mb-4">Our customer support team is here to help:</p>
            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href="mailto:demo@example.com"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#881337] text-white rounded-full text-sm font-medium hover:bg-[#701a35] transition"
              >
                📧 Email Support
              </a>
              <a
                href={storeWhatsAppUrl("Hi, I have a question about shipping")}
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
    </>
  );
}