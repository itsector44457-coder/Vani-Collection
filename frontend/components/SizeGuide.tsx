"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useModalDialog } from "../lib/use-modal-dialog";

interface SizeGuideProps {
  isOpen: boolean;
  onClose: () => void;
  productName?: string;
  customGuide?: string;
}

export default function SizeGuide({ isOpen, onClose, productName, customGuide }: SizeGuideProps) {
  const dialogRef = useModalDialog<HTMLDivElement>(isOpen, onClose);
  const productGuide = customGuide?.trim();
  // Body-size ranges only. Garment length and cut differ by design, so a universal length column
  // would dress a short kurta and a floor-length Anarkali in the same false promise.
  const sizeChart = [
    { size: "XS", bust: "32-34", waist: "26-28", hips: "34-36" },
    { size: "S", bust: "34-36", waist: "28-30", hips: "36-38" },
    { size: "M", bust: "36-38", waist: "30-32", hips: "38-40" },
    { size: "L", bust: "38-40", waist: "32-34", hips: "40-42" },
    { size: "XL", bust: "40-42", waist: "34-36", hips: "42-44" },
    { size: "XXL", bust: "42-44", waist: "36-38", hips: "44-46" },
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
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="size-guide-title"
            tabIndex={-1}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-auto outline-none"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 id="size-guide-title" className="text-xl font-semibold text-gray-900">{productName ? `${productName} Size Guide` : "Size Guide"}</h3>
              <button
                type="button"
                onClick={onClose}
                aria-label="Size guide band kare"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#881337]"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {productGuide ? (
                <div className="whitespace-pre-wrap break-words text-sm leading-7 text-gray-700">{productGuide}</div>
              ) : (
                <>
              {/* Measurement Instructions */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">How to Measure</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li><strong>Bust:</strong> Measure around the fullest part of your bust</li>
                  <li><strong>Waist:</strong> Measure around the narrowest part of your waist</li>
                  <li><strong>Hips:</strong> Measure around the fullest part of your hips</li>
                  <li><strong>Length:</strong> Garment ki lambai design par nirbhar karti hai — product details me di lambai ko antim maane.</li>
                </ul>
              </div>

              {/* Size Chart Table */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-200 rounded-lg">
                  <thead>
                    <tr className="bg-gray-50">
                      <th scope="col" className="border border-gray-200 px-4 py-3 text-left font-semibold text-gray-900">Size</th>
                      <th scope="col" className="border border-gray-200 px-4 py-3 text-left font-semibold text-gray-900">Bust (inches)</th>
                      <th scope="col" className="border border-gray-200 px-4 py-3 text-left font-semibold text-gray-900">Waist (inches)</th>
                      <th scope="col" className="border border-gray-200 px-4 py-3 text-left font-semibold text-gray-900">Hips (inches)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sizeChart.map((row, index) => (
                      <tr key={row.size} className={index % 2 === 0 ? "bg-white" : "bg-gray-25"}>
                        <td className="border border-gray-200 px-4 py-3 font-medium text-gray-900">{row.size}</td>
                        <td className="border border-gray-200 px-4 py-3 text-gray-700">{row.bust}</td>
                        <td className="border border-gray-200 px-4 py-3 text-gray-700">{row.waist}</td>
                        <td className="border border-gray-200 px-4 py-3 text-gray-700">{row.hips}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Additional Notes */}
              <div className="bg-amber-50 p-4 rounded-lg">
                <h4 className="font-medium text-amber-900 mb-2">Important Notes</h4>
                <ul className="space-y-1.5 text-sm leading-relaxed text-amber-800">
                  <li>• Yeh aam body-size chart hai; har design ka cut aur lambai alag ho sakta hai.</li>
                  <li>• Product page par custom size guide ya details di ho to wahi antim maane.</li>
                  <li>• Do size ke beech ho to order se pehle support se is design ka exact garment naap puche.</li>
                  <li>• Silai aur haath ke naap me halka antar ho sakta hai.</li>
                </ul>
              </div>

              {/* Contact Support */}
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-3">Still confused about sizing?</p>
                <Link href="/contact" onClick={onClose} className="inline-flex min-h-11 items-center rounded-lg bg-[#881337] px-6 py-2 text-white transition hover:bg-[#701a35]">
                  Contact Support
                </Link>
              </div>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}