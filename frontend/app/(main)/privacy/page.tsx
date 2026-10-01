import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | Vani Collection",
  description: "Learn how Vani Collection protects your privacy and handles your personal information responsibly.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#faf7f2]">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#1c1917] via-[#3d2012] to-[#881337] text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="font-serif text-4xl sm:text-5xl font-light mb-4">
            Privacy Policy
          </h1>
          <p className="text-white/60 text-sm max-w-md mx-auto">
            Your privacy matters to us. Learn how we protect your information.
          </p>
          {/* Breadcrumb */}
          <nav className="mt-6 flex items-center justify-center gap-2 text-xs text-white/50">
            <Link href="/" className="hover:text-white transition">Home</Link>
            <span>/</span>
            <span className="text-white/80">Privacy Policy</span>
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
            <h2 className="font-serif text-2xl text-[#881337] mb-4">Introduction</h2>
            <p className="text-stone-600 text-sm leading-relaxed">
              Vani Collection Atelier ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website, make a purchase, or interact with our services. Please read this privacy policy carefully.
            </p>
          </section>

          {/* Information We Collect */}
          <section>
            <h2 className="font-serif text-2xl text-[#881337] mb-6">Information We Collect</h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-stone-800 mb-3">Personal Information</h3>
                <p className="text-stone-600 text-sm mb-3">We may collect personal information that you voluntarily provide, including:</p>
                <ul className="list-disc pl-6 space-y-1 text-sm text-stone-600">
                  <li>Name and contact information (email, phone number, address)</li>
                  <li>Payment information (processed securely through payment providers)</li>
                  <li>Purchase history and preferences</li>
                  <li>Size and measurement information for custom orders</li>
                  <li>Communication preferences</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-stone-800 mb-3">Automatically Collected Information</h3>
                <p className="text-stone-600 text-sm mb-3">We automatically collect certain information when you visit our website:</p>
                <ul className="list-disc pl-6 space-y-1 text-sm text-stone-600">
                  <li>IP address and device information</li>
                  <li>Browser type and version</li>
                  <li>Pages visited and time spent on site</li>
                  <li>Referring website and search terms</li>
                  <li>Cookies and similar tracking technologies</li>
                </ul>
              </div>
            </div>
          </section>

          {/* How We Use Your Information */}
          <section>
            <h2 className="font-serif text-2xl text-[#881337] mb-6">How We Use Your Information</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-green-700">Order Processing</h3>
                <ul className="list-disc pl-6 space-y-1 text-sm text-stone-600">
                  <li>Process and fulfill your orders</li>
                  <li>Send order confirmations and updates</li>
                  <li>Handle returns and exchanges</li>
                  <li>Provide customer support</li>
                </ul>
              </div>
              <div className="space-y-4">
                <h3 className="font-semibold text-blue-700">Communication</h3>
                <ul className="list-disc pl-6 space-y-1 text-sm text-stone-600">
                  <li>Send promotional emails (with consent)</li>
                  <li>Respond to your inquiries</li>
                  <li>Notify about new collections</li>
                  <li>Provide size and styling advice</li>
                </ul>
              </div>
              <div className="space-y-4">
                <h3 className="font-semibold text-purple-700">Website Improvement</h3>
                <ul className="list-disc pl-6 space-y-1 text-sm text-stone-600">
                  <li>Analyze website usage patterns</li>
                  <li>Improve user experience</li>
                  <li>Personalize content and recommendations</li>
                  <li>Prevent fraud and ensure security</li>
                </ul>
              </div>
              <div className="space-y-4">
                <h3 className="font-semibold text-rose-700">Legal Compliance</h3>
                <ul className="list-disc pl-6 space-y-1 text-sm text-stone-600">
                  <li>Comply with legal obligations</li>
                  <li>Resolve disputes</li>
                  <li>Enforce our terms of service</li>
                  <li>Protect our rights and interests</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Information Sharing */}
          <section>
            <h2 className="font-serif text-2xl text-[#881337] mb-6">Information Sharing</h2>
            <p className="text-stone-600 text-sm mb-4">
              We do not sell, trade, or rent your personal information to third parties. We may share information in the following circumstances:
            </p>
            <div className="space-y-4">
              <div className="p-4 bg-stone-50 rounded-lg">
                <h3 className="font-semibold text-stone-800 mb-2">Service Providers</h3>
                <p className="text-stone-600 text-sm">
                  We work with trusted third-party service providers for payment processing, shipping, email marketing, and website analytics. These providers are bound by confidentiality agreements.
                </p>
              </div>
              <div className="p-4 bg-stone-50 rounded-lg">
                <h3 className="font-semibold text-stone-800 mb-2">Legal Requirements</h3>
                <p className="text-stone-600 text-sm">
                  We may disclose information if required by law, court order, or to protect our rights, safety, or the rights and safety of others.
                </p>
              </div>
            </div>
          </section>

          {/* Cookies and Tracking */}
          <section>
            <h2 className="font-serif text-2xl text-[#881337] mb-6">Cookies and Tracking Technologies</h2>
            <div className="space-y-4">
              <p className="text-stone-600 text-sm">
                We use cookies and similar technologies to enhance your browsing experience. You can control cookie preferences through your browser settings.
              </p>
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="p-4 border border-stone-200 rounded-lg">
                  <h4 className="font-semibold text-stone-800 mb-2">Essential Cookies</h4>
                  <p className="text-xs text-stone-600">Required for website functionality and security</p>
                </div>
                <div className="p-4 border border-stone-200 rounded-lg">
                  <h4 className="font-semibold text-stone-800 mb-2">Analytics Cookies</h4>
                  <p className="text-xs text-stone-600">Help us understand how visitors use our site</p>
                </div>
                <div className="p-4 border border-stone-200 rounded-lg">
                  <h4 className="font-semibold text-stone-800 mb-2">Marketing Cookies</h4>
                  <p className="text-xs text-stone-600">Used to personalize ads and track campaign performance</p>
                </div>
              </div>
            </div>
          </section>

          {/* Data Security */}
          <section>
            <h2 className="font-serif text-2xl text-[#881337] mb-6">Data Security</h2>
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h3 className="font-semibold text-green-800 mb-3">Security Measures</h3>
              <p className="text-green-700 text-sm mb-4">
                We implement appropriate technical and organizational security measures to protect your information:
              </p>
              <div className="grid sm:grid-cols-2 gap-4 text-sm text-green-600">
                <ul className="list-disc pl-4 space-y-1">
                  <li>SSL encryption for data transmission</li>
                  <li>Secure payment processing</li>
                  <li>Regular security assessments</li>
                </ul>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Access controls and authentication</li>
                  <li>Data backup and recovery procedures</li>
                  <li>Staff training on data protection</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Your Rights */}
          <section>
            <h2 className="font-serif text-2xl text-[#881337] mb-6">Your Privacy Rights</h2>
            <p className="text-stone-600 text-sm mb-4">You have the following rights regarding your personal information:</p>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center">→</span>
                  <div>
                    <h4 className="font-semibold text-stone-800">Access</h4>
                    <p className="text-xs text-stone-600">Request a copy of your personal data</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-green-600 text-white text-xs flex items-center justify-center">✓</span>
                  <div>
                    <h4 className="font-semibold text-stone-800">Correction</h4>
                    <p className="text-xs text-stone-600">Update or correct your information</p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-red-600 text-white text-xs flex items-center justify-center">✕</span>
                  <div>
                    <h4 className="font-semibold text-stone-800">Deletion</h4>
                    <p className="text-xs text-stone-600">Request deletion of your data</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs flex items-center justify-center">◐</span>
                  <div>
                    <h4 className="font-semibold text-stone-800">Portability</h4>
                    <p className="text-xs text-stone-600">Export your data in a usable format</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Data Retention */}
          <section>
            <h2 className="font-serif text-2xl text-[#881337] mb-6">Data Retention</h2>
            <p className="text-stone-600 text-sm mb-4">
              We retain your information only as long as necessary for the purposes outlined in this policy:
            </p>
            <div className="space-y-2 text-sm text-stone-600">
              <p>• <strong>Order Information:</strong> 7 years for tax and accounting purposes</p>
              <p>• <strong>Account Information:</strong> Until account deletion or 3 years of inactivity</p>
              <p>• <strong>Marketing Data:</strong> Until you unsubscribe or 2 years of inactivity</p>
              <p>• <strong>Website Analytics:</strong> 26 months maximum</p>
            </div>
          </section>

          {/* Third-Party Links */}
          <section>
            <h2 className="font-serif text-2xl text-[#881337] mb-6">Third-Party Links</h2>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <p className="text-yellow-800 text-sm">
                Our website may contain links to third-party websites. We are not responsible for the privacy practices of these external sites. We encourage you to review their privacy policies before providing any personal information.
              </p>
            </div>
          </section>

          {/* Children's Privacy */}
          <section>
            <h2 className="font-serif text-2xl text-[#881337] mb-6">Children's Privacy</h2>
            <p className="text-stone-600 text-sm">
              Our services are not directed to children under 13 years of age. We do not knowingly collect personal information from children under 13. If we become aware that we have collected such information, we will take steps to delete it promptly.
            </p>
          </section>

          {/* Changes to Policy */}
          <section>
            <h2 className="font-serif text-2xl text-[#881337] mb-6">Changes to This Privacy Policy</h2>
            <p className="text-stone-600 text-sm">
              We may update this Privacy Policy from time to time. Any changes will be posted on this page with an updated "Last Updated" date. We encourage you to review this policy periodically to stay informed about how we protect your information.
            </p>
          </section>

          {/* Contact Information */}
          <section className="border-t border-stone-200 pt-8">
            <h2 className="font-serif text-2xl text-[#881337] mb-4">Contact Us</h2>
            <p className="text-stone-600 text-sm mb-6">
              If you have any questions about this Privacy Policy or our data practices, please contact us:
            </p>
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="bg-stone-50 p-4 rounded-lg">
                <h4 className="font-semibold text-stone-800 mb-2">Privacy Officer</h4>
                <p className="text-sm text-stone-600 mb-1">📧 privacy@vanicollection.com</p>
                <p className="text-sm text-stone-600">📱 +91-XXX-XXX-XXXX</p>
              </div>
              <div className="bg-stone-50 p-4 rounded-lg">
                <h4 className="font-semibold text-stone-800 mb-2">Mailing Address</h4>
                <p className="text-sm text-stone-600">
                  Vani Collection Atelier<br />
                  Jaipur, Rajasthan, India<br />
                  PIN: XXXXXX
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}