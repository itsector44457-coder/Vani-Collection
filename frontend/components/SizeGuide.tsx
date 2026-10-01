"use client";

import { motion, AnimatePresence } from "framer-motion";

interface SizeGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SizeGuide({ isOpen, onClose }: SizeGuideProps) {
  const sizeChart = [
    { size: "XS", bust: "32-34", waist: "26-28", hips: "34-36", length: "46" },
    { size: "S", bust: "34-36", waist: "28-30", hips: "36-38", length: "47" },
    { size: "M", bust: "36-38", waist: "30-32", hips: "38-40", length: "48" },
    { size: "L", bust: "38-40", waist: "32-34", hips: "40-42", length: "49" },
    { size: "XL", bust: "40-42", waist: "34-36", hips: "42-44", length: "50" },
    { size: "XXL", bust: "42-44", waist: "36-38", hips: "44-46", length: "51" },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">Size Guide</h3>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Measurement Instructions */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">How to Measure</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li><strong>Bust:</strong> Measure around the fullest part of your bust</li>
                  <li><strong>Waist:</strong> Measure around the narrowest part of your waist</li>
                  <li><strong>Hips:</strong> Measure around the fullest part of your hips</li>
                  <li><strong>Length:</strong> Kurta length from shoulder to hemline</li>
                </ul>
              </div>

              {/* Size Chart Table */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-200 rounded-lg">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-200 px-4 py-3 text-left font-semibold text-gray-900">Size</th>
                      <th className="border border-gray-200 px-4 py-3 text-left font-semibold text-gray-900">Bust (inches)</th>
                      <th className="border border-gray-200 px-4 py-3 text-left font-semibold text-gray-900">Waist (inches)</th>
                      <th className="border border-gray-200 px-4 py-3 text-left font-semibold text-gray-900">Hips (inches)</th>
                      <th className="border border-gray-200 px-4 py-3 text-left font-semibold text-gray-900">Length (inches)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sizeChart.map((row, index) => (
                      <tr key={row.size} className={index % 2 === 0 ? "bg-white" : "bg-gray-25"}>
                        <td className="border border-gray-200 px-4 py-3 font-medium text-gray-900">{row.size}</td>
                        <td className="border border-gray-200 px-4 py-3 text-gray-700">{row.bust}</td>
                        <td className="border border-gray-200 px-4 py-3 text-gray-700">{row.waist}</td>
                        <td className="border border-gray-200 px-4 py-3 text-gray-700">{row.hips}</td>
                        <td className="border border-gray-200 px-4 py-3 text-gray-700">{row.length}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Additional Notes */}
              <div className="bg-amber-50 p-4 rounded-lg">
                <h4 className="font-medium text-amber-900 mb-2">Important Notes</h4>
                <ul className="text-sm text-amber-800 space-y-1">
                  <li>• All measurements are in inches and may vary by ±1 inch due to handcrafted nature</li>
                  <li>• For loose fit, choose one size larger than your usual size</li>
                  <li>• Dupatta length is standard 2.5 meters for all sizes</li>
                  <li>• For custom alterations, contact our customer support after ordering</li>
                </ul>
              </div>

              {/* Contact Support */}
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-3">Still confused about sizing?</p>
                <button className="bg-[#881337] text-white px-6 py-2 rounded-lg hover:bg-[#701a35] transition">
                  Contact Support
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}