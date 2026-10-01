import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Size Guide | Vani Collection",
  description: "Find your perfect fit with our comprehensive size guide for ethnic wear, including measurements for kurtas, anarkalis, and more.",
};

export default function SizeGuidePage() {
  return (
    <div className="min-h-screen bg-[#faf7f2]">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#1c1917] via-[#3d2012] to-[#881337] text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="font-serif text-4xl sm:text-5xl font-light mb-4">
            Size Guide
          </h1>
          <p className="text-white/60 text-sm max-w-md mx-auto">
            Find your perfect fit with our detailed measurement guide
          </p>
          {/* Breadcrumb */}
          <nav className="mt-6 flex items-center justify-center gap-2 text-xs text-white/50">
            <Link href="/" className="hover:text-white transition">Home</Link>
            <span>/</span>
            <span className="text-white/80">Size Guide</span>
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-xl shadow-sm border border-[#e8dfd5] p-8 md:p-12 space-y-8">
          
          {/* How to Measure */}
          <section>
            <h2 className="font-serif text-2xl text-[#881337] mb-6">How to Measure Yourself</h2>
            <div className="grid md:grid-cols-2 gap-8 mb-8">
              <div className="space-y-4">
                <h3 className="font-semibold text-stone-800 mb-4">Measurement Tips</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-[#881337] text-white text-xs flex items-center justify-center">1</span>
                    <p className="text-sm text-stone-600">Use a soft measuring tape for accurate measurements</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-[#881337] text-white text-xs flex items-center justify-center">2</span>
                    <p className="text-sm text-stone-600">Wear well-fitted undergarments while measuring</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-[#881337] text-white text-xs flex items-center justify-center">3</span>
                    <p className="text-sm text-stone-600">Keep the tape snug but not tight against your body</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-[#881337] text-white text-xs flex items-center justify-center">4</span>
                    <p className="text-sm text-stone-600">Ask someone to help you for more accurate measurements</p>
                  </div>
                </div>
              </div>
              <div className="bg-stone-50 p-6 rounded-lg">
                <h3 className="font-semibold text-stone-800 mb-4">Key Measurements</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-stone-600">Bust/Chest:</span>
                    <span className="text-stone-800">Fullest part of chest</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-600">Waist:</span>
                    <span className="text-stone-800">Narrowest part of torso</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-600">Hips:</span>
                    <span className="text-stone-800">Fullest part of hips</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-600">Length:</span>
                    <span className="text-stone-800">Shoulder to desired hem</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Size Chart - Kurtas & Suits */}
          <section>
            <h2 className="font-serif text-2xl text-[#881337] mb-6">Kurtas & Suit Sets</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-stone-200 rounded-lg overflow-hidden">
                <thead className="bg-[#881337] text-white">
                  <tr>
                    <th className="p-3 text-left">Size</th>
                    <th className="p-3 text-center">Bust (inches)</th>
                    <th className="p-3 text-center">Waist (inches)</th>
                    <th className="p-3 text-center">Hips (inches)</th>
                    <th className="p-3 text-center">Length (inches)</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  <tr className="border-b border-stone-200">
                    <td className="p-3 font-semibold">XS</td>
                    <td className="p-3 text-center">32-34</td>
                    <td className="p-3 text-center">26-28</td>
                    <td className="p-3 text-center">34-36</td>
                    <td className="p-3 text-center">42-44</td>
                  </tr>
                  <tr className="border-b border-stone-200 bg-stone-50">
                    <td className="p-3 font-semibold">S</td>
                    <td className="p-3 text-center">34-36</td>
                    <td className="p-3 text-center">28-30</td>
                    <td className="p-3 text-center">36-38</td>
                    <td className="p-3 text-center">42-44</td>
                  </tr>
                  <tr className="border-b border-stone-200">
                    <td className="p-3 font-semibold">M</td>
                    <td className="p-3 text-center">36-38</td>
                    <td className="p-3 text-center">30-32</td>
                    <td className="p-3 text-center">38-40</td>
                    <td className="p-3 text-center">44-46</td>
                  </tr>
                  <tr className="border-b border-stone-200 bg-stone-50">
                    <td className="p-3 font-semibold">L</td>
                    <td className="p-3 text-center">38-40</td>
                    <td className="p-3 text-center">32-34</td>
                    <td className="p-3 text-center">40-42</td>
                    <td className="p-3 text-center">44-46</td>
                  </tr>
                  <tr className="border-b border-stone-200">
                    <td className="p-3 font-semibold">XL</td>
                    <td className="p-3 text-center">40-42</td>
                    <td className="p-3 text-center">34-36</td>
                    <td className="p-3 text-center">42-44</td>
                    <td className="p-3 text-center">46-48</td>
                  </tr>
                  <tr className="bg-stone-50">
                    <td className="p-3 font-semibold">XXL</td>
                    <td className="p-3 text-center">42-44</td>
                    <td className="p-3 text-center">36-38</td>
                    <td className="p-3 text-center">44-46</td>
                    <td className="p-3 text-center">46-48</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Size Chart - Anarkalis */}
          <section>
            <h2 className="font-serif text-2xl text-[#881337] mb-6">Anarkali Suits</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-stone-200 rounded-lg overflow-hidden">
                <thead className="bg-[#881337] text-white">
                  <tr>
                    <th className="p-3 text-left">Size</th>
                    <th className="p-3 text-center">Bust (inches)</th>
                    <th className="p-3 text-center">Waist (inches)</th>
                    <th className="p-3 text-center">Flare (inches)</th>
                    <th className="p-3 text-center">Length (inches)</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  <tr className="border-b border-stone-200">
                    <td className="p-3 font-semibold">XS</td>
                    <td className="p-3 text-center">32-34</td>
                    <td className="p-3 text-center">26-28</td>
                    <td className="p-3 text-center">58-60</td>
                    <td className="p-3 text-center">52-54</td>
                  </tr>
                  <tr className="border-b border-stone-200 bg-stone-50">
                    <td className="p-3 font-semibold">S</td>
                    <td className="p-3 text-center">34-36</td>
                    <td className="p-3 text-center">28-30</td>
                    <td className="p-3 text-center">60-62</td>
                    <td className="p-3 text-center">52-54</td>
                  </tr>
                  <tr className="border-b border-stone-200">
                    <td className="p-3 font-semibold">M</td>
                    <td className="p-3 text-center">36-38</td>
                    <td className="p-3 text-center">30-32</td>
                    <td className="p-3 text-center">62-64</td>
                    <td className="p-3 text-center">54-56</td>
                  </tr>
                  <tr className="border-b border-stone-200 bg-stone-50">
                    <td className="p-3 font-semibold">L</td>
                    <td className="p-3 text-center">38-40</td>
                    <td className="p-3 text-center">32-34</td>
                    <td className="p-3 text-center">64-66</td>
                    <td className="p-3 text-center">54-56</td>
                  </tr>
                  <tr className="border-b border-stone-200">
                    <td className="p-3 font-semibold">XL</td>
                    <td className="p-3 text-center">40-42</td>
                    <td className="p-3 text-center">34-36</td>
                    <td className="p-3 text-center">66-68</td>
                    <td className="p-3 text-center">56-58</td>
                  </tr>
                  <tr className="bg-stone-50">
                    <td className="p-3 font-semibold">XXL</td>
                    <td className="p-3 text-center">42-44</td>
                    <td className="p-3 text-center">36-38</td>
                    <td className="p-3 text-center">68-70</td>
                    <td className="p-3 text-center">56-58</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Bottom Wear Sizes */}
          <section>
            <h2 className="font-serif text-2xl text-[#881337] mb-6">Bottom Wear (Pants, Palazzos, Churidars)</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-stone-200 rounded-lg overflow-hidden">
                <thead className="bg-[#881337] text-white">
                  <tr>
                    <th className="p-3 text-left">Size</th>
                    <th className="p-3 text-center">Waist (inches)</th>
                    <th className="p-3 text-center">Hips (inches)</th>
                    <th className="p-3 text-center">Length (inches)</th>
                    <th className="p-3 text-center">Thigh (inches)</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  <tr className="border-b border-stone-200">
                    <td className="p-3 font-semibold">XS</td>
                    <td className="p-3 text-center">26-28</td>
                    <td className="p-3 text-center">34-36</td>
                    <td className="p-3 text-center">37-39</td>
                    <td className="p-3 text-center">20-22</td>
                  </tr>
                  <tr className="border-b border-stone-200 bg-stone-50">
                    <td className="p-3 font-semibold">S</td>
                    <td className="p-3 text-center">28-30</td>
                    <td className="p-3 text-center">36-38</td>
                    <td className="p-3 text-center">37-39</td>
                    <td className="p-3 text-center">21-23</td>
                  </tr>
                  <tr className="border-b border-stone-200">
                    <td className="p-3 font-semibold">M</td>
                    <td className="p-3 text-center">30-32</td>
                    <td className="p-3 text-center">38-40</td>
                    <td className="p-3 text-center">39-41</td>
                    <td className="p-3 text-center">22-24</td>
                  </tr>
                  <tr className="border-b border-stone-200 bg-stone-50">
                    <td className="p-3 font-semibold">L</td>
                    <td className="p-3 text-center">32-34</td>
                    <td className="p-3 text-center">40-42</td>
                    <td className="p-3 text-center">39-41</td>
                    <td className="p-3 text-center">23-25</td>
                  </tr>
                  <tr className="border-b border-stone-200">
                    <td className="p-3 font-semibold">XL</td>
                    <td className="p-3 text-center">34-36</td>
                    <td className="p-3 text-center">42-44</td>
                    <td className="p-3 text-center">41-43</td>
                    <td className="p-3 text-center">24-26</td>
                  </tr>
                  <tr className="bg-stone-50">
                    <td className="p-3 font-semibold">XXL</td>
                    <td className="p-3 text-center">36-38</td>
                    <td className="p-3 text-center">44-46</td>
                    <td className="p-3 text-center">41-43</td>
                    <td className="p-3 text-center">25-27</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Fit Guide */}
          <section>
            <h2 className="font-serif text-2xl text-[#881337] mb-6">Fit Guide</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="p-6 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-blue-800 mb-3">Regular Fit</h3>
                <p className="text-blue-700 text-sm mb-2">Relaxed, comfortable fit with room to move</p>
                <p className="text-blue-600 text-xs">Best for: Daily wear, casual occasions</p>
              </div>
              <div className="p-6 bg-purple-50 rounded-lg border border-purple-200">
                <h3 className="font-semibold text-purple-800 mb-3">Slim Fit</h3>
                <p className="text-purple-700 text-sm mb-2">Close-fitting silhouette, follows body shape</p>
                <p className="text-purple-600 text-xs">Best for: Formal events, fitted look</p>
              </div>
              <div className="p-6 bg-rose-50 rounded-lg border border-rose-200">
                <h3 className="font-semibold text-rose-800 mb-3">Flowy Fit</h3>
                <p className="text-rose-700 text-sm mb-2">Loose, airy fit with graceful drape</p>
                <p className="text-rose-600 text-xs">Best for: Anarkalis, palazzo sets</p>
              </div>
            </div>
          </section>

          {/* Alteration Services */}
          <section>
            <h2 className="font-serif text-2xl text-[#881337] mb-6">Alteration Services</h2>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
              <h3 className="font-semibold text-amber-800 mb-3">Custom Alterations Available</h3>
              <p className="text-amber-700 text-sm mb-4">
                Need a perfect fit? Our skilled tailors can customize any garment to your exact measurements.
              </p>
              <div className="grid sm:grid-cols-2 gap-4 text-sm text-amber-600">
                <div>
                  <h4 className="font-medium mb-2">Available Alterations:</h4>
                  <ul className="space-y-1 text-xs">
                    <li>• Length adjustments</li>
                    <li>• Sleeve length modifications</li>
                    <li>• Waist adjustments</li>
                    <li>• Neckline alterations</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Pricing:</h4>
                  <ul className="space-y-1 text-xs">
                    <li>• Length: ₹200-500</li>
                    <li>• Sleeves: ₹150-350</li>
                    <li>• Waist: ₹300-600</li>
                    <li>• Complex: ₹500-1200</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Contact for Size Help */}
          <section className="border-t border-stone-200 pt-8">
            <h2 className="font-serif text-2xl text-[#881337] mb-4">Still Confused About Sizing?</h2>
            <p className="text-stone-600 mb-6">Our style consultants are here to help you find the perfect fit:</p>
            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href="https://wa.me/?text=Hi, I need help with sizing"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#25D366] text-white rounded-full text-sm font-medium hover:bg-[#1ea952] transition"
              >
                💬 WhatsApp Size Consultant
              </a>
              <a
                href="mailto:sizing@vanicollection.com"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#881337] text-white rounded-full text-sm font-medium hover:bg-[#701a35] transition"
              >
                📧 Email Size Guide
              </a>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}