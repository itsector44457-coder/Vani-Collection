import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms & Conditions | Vani Collection",
  description: "Read our terms and conditions for using Vani Collection services and making purchases.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#faf7f2]">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#1c1917] via-[#3d2012] to-[#881337] text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="font-serif text-4xl sm:text-5xl font-light mb-4">
            Terms & Conditions
          </h1>
          <p className="text-white/60 text-sm max-w-md mx-auto">
            Please read these terms carefully before using our services
          </p>
          {/* Breadcrumb */}
          <nav className="mt-6 flex items-center justify-center gap-2 text-xs text-white/50">
            <Link href="/" className="hover:text-white transition">Home</Link>
            <span>/</span>
            <span className="text-white/80">Terms & Conditions</span>
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-xl shadow-sm border border-[#e8dfd5] p-8 md:p-12 space-y-8">
          
          {/* Last Updated */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-800 text-sm">
              <strong>Last Updated:</strong> December 2024
            </p>
          </div>

          {/* Introduction */}
          <section>
            <h2 className="font-serif text-2xl text-[#881337] mb-4">Agreement to Terms</h2>
            <p className="text-stone-600 text-sm leading-relaxed">
              These Terms and Conditions ("Terms") govern your use of the Vani Collection Atelier website and services. By accessing or using our website, making a purchase, or engaging with our services, you agree to be bound by these Terms. If you do not agree to these Terms, please do not use our services.
            </p>
          </section>

          {/* Company Information */}
          <section>
            <h2 className="font-serif text-2xl text-[#881337] mb-6">About Vani Collection</h2>
            <div className="bg-stone-50 p-6 rounded-lg">
              <p className="text-stone-600 text-sm leading-relaxed">
                Vani Collection Atelier is a boutique fashion brand specializing in handcrafted ethnic wear, including Mul Cotton suits, Anarkalis, and festive ensembles. We are based in Jaipur, Rajasthan, India, and serve customers across India and internationally.
              </p>
            </div>
          </section>

          {/* Use of Website */}
          <section>
            <h2 className="font-serif text-2xl text-[#881337] mb-6">Use of Website</h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-stone-800 mb-3">Permitted Use</h3>
                <ul className="list-disc pl-6 space-y-1 text-sm text-stone-600">
                  <li>Browse and purchase products for personal use</li>
                  <li>Create an account and manage your orders</li>
                  <li>Access customer support services</li>
                  <li>Share our content with proper attribution</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-stone-800 mb-3">Prohibited Activities</h3>
                <ul className="list-disc pl-6 space-y-1 text-sm text-stone-600">
                  <li>Using our website for any illegal or unauthorized purpose</li>
                  <li>Attempting to hack, disrupt, or damage our website</li>
                  <li>Copying, reproducing, or distributing our content without permission</li>
                  <li>Creating false accounts or providing misleading information</li>
                  <li>Interfering with other users' access to the website</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Products and Services */}
          <section>
            <h2 className="font-serif text-2xl text-[#881337] mb-6">Products and Services</h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-green-700">Product Information</h3>
                <ul className="list-disc pl-6 space-y-1 text-sm text-stone-600">
                  <li>All products are handcrafted and may have slight variations</li>
                  <li>Colors may appear different on different screens</li>
                  <li>We strive for accuracy in product descriptions</li>
                  <li>Product availability is subject to stock</li>
                </ul>
              </div>
              <div className="space-y-4">
                <h3 className="font-semibold text-blue-700">Pricing</h3>
                <ul className="list-disc pl-6 space-y-1 text-sm text-stone-600">
                  <li>All prices are in Indian Rupees (INR)</li>
                  <li>Prices are subject to change without notice</li>
                  <li>Shipping charges are additional where applicable</li>
                  <li>Taxes are included in displayed prices</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Orders and Payment */}
          <section>
            <h2 className="font-serif text-2xl text-[#881337] mb-6">Orders and Payment</h2>
            
            <div className="space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <h3 className="font-semibold text-green-800 mb-3">Order Process</h3>
                <ol className="list-decimal pl-6 space-y-2 text-sm text-green-700">
                  <li>Add items to your cart and proceed to checkout</li>
                  <li>Provide accurate shipping and billing information</li>
                  <li>Choose your preferred payment method</li>
                  <li>Review and confirm your order</li>
                  <li>Receive order confirmation via email</li>
                </ol>
              </div>

              <div>
                <h3 className="font-semibold text-stone-800 mb-3">Payment Terms</h3>
                <ul className="list-disc pl-6 space-y-1 text-sm text-stone-600">
                  <li>We accept major credit cards, debit cards, UPI, and net banking</li>
                  <li>Cash on Delivery (COD) available for eligible orders</li>
                  <li>Payment must be completed before order processing</li>
                  <li>We reserve the right to refuse or cancel orders</li>
                  <li>All transactions are processed securely</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Shipping and Delivery */}
          <section>
            <h2 className="font-serif text-2xl text-[#881337] mb-6">Shipping and Delivery</h2>
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-blue-800 mb-2">Delivery Timeline</h4>
                <p className="text-blue-700 text-sm">
                  Processing: 1-2 business days | Delivery: 2-7 business days depending on location
                </p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <h4 className="font-semibold text-purple-800 mb-2">Shipping Responsibility</h4>
                <p className="text-purple-700 text-sm">
                  Risk of loss passes to you upon delivery to the carrier. We are not responsible for delays caused by shipping carriers.
                </p>
              </div>
            </div>
          </section>

          {/* Returns and Refunds */}
          <section>
            <h2 className="font-serif text-2xl text-[#881337] mb-6">Returns and Refunds</h2>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
              <h3 className="font-semibold text-amber-800 mb-3">Return Policy</h3>
              <p className="text-amber-700 text-sm mb-3">
                We accept returns within 7 days of delivery for unworn items with original tags. See our detailed Return Policy for complete terms.
              </p>
              <div className="grid sm:grid-cols-2 gap-4 text-sm text-amber-600">
                <div>
                  <h4 className="font-medium mb-2">Refund Timeline:</h4>
                  <p className="text-xs">5-7 business days after we receive the returned item</p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Refund Method:</h4>
                  <p className="text-xs">Original payment method or store credit</p>
                </div>
              </div>
            </div>
          </section>

          {/* Intellectual Property */}
          <section>
            <h2 className="font-serif text-2xl text-[#881337] mb-6">Intellectual Property</h2>
            <div className="space-y-4">
              <p className="text-stone-600 text-sm">
                All content on this website, including designs, images, text, logos, and graphics, is the property of Vani Collection Atelier and is protected by copyright and trademark laws.
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="p-4 border border-stone-200 rounded-lg">
                  <h4 className="font-semibold text-stone-800 mb-2">Our Rights</h4>
                  <p className="text-xs text-stone-600">We own all original designs, patterns, and creative content on our website</p>
                </div>
                <div className="p-4 border border-stone-200 rounded-lg">
                  <h4 className="font-semibold text-stone-800 mb-2">Your Rights</h4>
                  <p className="text-xs text-stone-600">Limited license to use our website for personal, non-commercial purposes</p>
                </div>
              </div>
            </div>
          </section>

          {/* User Accounts */}
          <section>
            <h2 className="font-serif text-2xl text-[#881337] mb-6">User Accounts</h2>
            <div className="space-y-4">
              <h3 className="font-semibold text-stone-800">Account Responsibilities</h3>
              <ul className="list-disc pl-6 space-y-1 text-sm text-stone-600">
                <li>Provide accurate and up-to-date information</li>
                <li>Maintain the security of your account credentials</li>
                <li>Notify us immediately of any unauthorized access</li>
                <li>You are responsible for all activities under your account</li>
                <li>We may suspend or terminate accounts that violate these terms</li>
              </ul>
            </div>
          </section>

          {/* Liability and Disclaimers */}
          <section>
            <h2 className="font-serif text-2xl text-[#881337] mb-6">Liability and Disclaimers</h2>
            <div className="space-y-6">
              <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <h3 className="font-semibold text-red-800 mb-3">Limitation of Liability</h3>
                <p className="text-red-700 text-sm mb-3">
                  To the maximum extent permitted by law, Vani Collection Atelier shall not be liable for any indirect, incidental, special, or consequential damages.
                </p>
                <p className="text-red-600 text-xs">
                  Our total liability shall not exceed the amount paid by you for the specific product or service in question.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-stone-800 mb-3">Disclaimers</h3>
                <ul className="list-disc pl-6 space-y-1 text-sm text-stone-600">
                  <li>Our website and services are provided "as is" without warranties</li>
                  <li>We do not guarantee uninterrupted or error-free service</li>
                  <li>Product colors may vary due to screen settings and lighting</li>
                  <li>Handcrafted items may have natural variations</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Force Majeure */}
          <section>
            <h2 className="font-serif text-2xl text-[#881337] mb-6">Force Majeure</h2>
            <p className="text-stone-600 text-sm">
              We shall not be liable for any delay or failure to perform our obligations due to circumstances beyond our reasonable control, including but not limited to natural disasters, government regulations, strikes, or pandemics.
            </p>
          </section>

          {/* Governing Law */}
          <section>
            <h2 className="font-serif text-2xl text-[#881337] mb-6">Governing Law</h2>
            <div className="bg-stone-50 p-6 rounded-lg">
              <p className="text-stone-600 text-sm">
                These Terms shall be governed by and construed in accordance with the laws of India. Any disputes arising under these Terms shall be subject to the exclusive jurisdiction of the courts in Jaipur, Rajasthan.
              </p>
            </div>
          </section>

          {/* Changes to Terms */}
          <section>
            <h2 className="font-serif text-2xl text-[#881337] mb-6">Changes to Terms</h2>
            <p className="text-stone-600 text-sm">
              We reserve the right to modify these Terms at any time. Changes will be effective immediately upon posting on our website. Your continued use of our services after any changes constitutes acceptance of the new Terms.
            </p>
          </section>

          {/* Contact Information */}
          <section className="border-t border-stone-200 pt-8">
            <h2 className="font-serif text-2xl text-[#881337] mb-4">Contact Us</h2>
            <p className="text-stone-600 text-sm mb-6">
              If you have any questions about these Terms and Conditions, please contact us:
            </p>
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="bg-stone-50 p-4 rounded-lg">
                <h4 className="font-semibold text-stone-800 mb-2">Legal Department</h4>
                <p className="text-sm text-stone-600 mb-1">📧 legal@vanicollection.com</p>
                <p className="text-sm text-stone-600">📱 +91-XXX-XXX-XXXX</p>
              </div>
              <div className="bg-stone-50 p-4 rounded-lg">
                <h4 className="font-semibold text-stone-800 mb-2">Customer Support</h4>
                <p className="text-sm text-stone-600 mb-1">📧 support@vanicollection.com</p>
                <p className="text-sm text-stone-600">💬 WhatsApp Support Available</p>
              </div>
            </div>
          </section>

          {/* Severability */}
          <section>
            <h2 className="font-serif text-2xl text-[#881337] mb-4">Severability</h2>
            <p className="text-stone-600 text-sm">
              If any provision of these Terms is found to be unenforceable or invalid, the remaining provisions shall continue to be valid and enforceable to the fullest extent permitted by law.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}