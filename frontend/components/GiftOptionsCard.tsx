"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { GiftOptions } from "../lib/storefront-types";

interface GiftOptionsCardProps {
  value: GiftOptions;
  onChange: (options: GiftOptions) => void;
}

const GIFT_PRESETS = [
  { label: "💍 Wedding & Sangeet", text: "Wishing you a lifetime of love, laughter, and timeless celebrations! Radiant wishes for your special days." },
  { label: "❤️ Happy Anniversary", text: "To many more years of love, cherished memories, and elegance together. Happy Anniversary!" },
  { label: "🎉 Happy Birthday", text: "Wishing you a truly joyous birthday filled with beauty, laughter, and wonderful memories!" },
  { label: "🪔 Festive Blessings", text: "May this festive season illuminate your life with joy, prosperity, and timeless grace." },
];

export default function GiftOptionsCard({ value, onChange }: GiftOptionsCardProps) {
  const isGift = value.isGift;

  const toggleGift = (enabled: boolean) => {
    onChange({
      ...value,
      isGift: enabled,
      packaging: enabled ? (value.packaging ?? true) : false,
      hidePriceTag: enabled ? (value.hidePriceTag ?? true) : true,
    });
  };

  const handlePackagingChange = (packaging: boolean) => {
    onChange({ ...value, packaging });
  };

  const handleMessageChange = (message: string) => {
    onChange({ ...value, message });
  };

  const handleRecipientChange = (recipientName: string) => {
    onChange({ ...value, recipientName });
  };

  const handleSenderChange = (senderName: string) => {
    onChange({ ...value, senderName });
  };

  const handleHidePriceTag = (hidePriceTag: boolean) => {
    onChange({ ...value, hidePriceTag });
  };

  return (
    <div className="rounded-2xl border border-stone-200/90 bg-white/80 p-5 shadow-sm transition">
      {/* Header with Switch */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-800 border border-amber-200/50">
            <svg className="w-5 h-5 text-amber-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 12 20 22 4 22 4 12" />
              <rect x="2" y="7" width="20" height="5" />
              <line x1="12" y1="22" x2="12" y2="7" />
              <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
              <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-serif text-base font-bold text-stone-900">
                Send as a Royal Gift
              </h3>
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-800">
                Atelier Gifting
              </span>
            </div>
            <p className="mt-0.5 text-xs text-stone-500 leading-relaxed">
              Surprise a loved one with bespoke gift packaging and a personalized handwritten card.
            </p>
          </div>
        </div>

        {/* Toggle Switch */}
        <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
          <input
            type="checkbox"
            checked={isGift}
            onChange={(e) => toggleGift(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#881337]"></div>
        </label>
      </div>

      {/* Expandable Gift Customizer */}
      <AnimatePresence>
        {isGift && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="mt-5 pt-5 border-t border-stone-100 space-y-4">
              {/* Packaging selection card */}
              <div
                onClick={() => handlePackagingChange(!value.packaging)}
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition ${
                  value.packaging
                    ? "border-amber-400/80 bg-amber-50/40"
                    : "border-stone-200 bg-stone-50/50 hover:border-stone-300"
                }`}
              >
                <input
                  type="checkbox"
                  checked={Boolean(value.packaging)}
                  onChange={() => {}} // handled by parent div
                  className="mt-1 h-4 w-4 rounded border-stone-300 text-[#881337] focus:ring-[#881337]"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-stone-900">
                      Bespoke Royal Gift Packaging
                    </span>
                    <span className="text-xs font-bold text-amber-900">
                      +₹149
                    </span>
                  </div>
                  <p className="text-xs text-stone-600 mt-0.5">
                    Rigid burgundy heirloom box, gold-foiled crest, butter paper wrap & crimson satin bow ribbon.
                  </p>
                </div>
              </div>

              {/* Handwritten Note Details */}
              <div className="rounded-xl border border-stone-200 bg-stone-50/40 p-4 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-800">
                  <span>✍️</span>
                  <span>Personalized Handwritten Calligraphy Note (Included Free)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">
                      To (Recipient&apos;s Name)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Dearest Priya"
                      value={value.recipientName || ""}
                      onChange={(e) => handleRecipientChange(e.target.value)}
                      className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:border-[#881337] focus:outline-none focus:ring-1 focus:ring-[#881337]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">
                      From (Your Name / Sender)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. With love, Rahul"
                      value={value.senderName || ""}
                      onChange={(e) => handleSenderChange(e.target.value)}
                      className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:border-[#881337] focus:outline-none focus:ring-1 focus:ring-[#881337]"
                    />
                  </div>
                </div>

                {/* Message Presets */}
                <div>
                  <span className="block text-[11px] font-medium text-stone-500 mb-1.5">
                    Quick Wishes & Occasions:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {GIFT_PRESETS.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => handleMessageChange(preset.text)}
                        className="rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-[11px] font-medium text-stone-700 hover:border-stone-400 hover:bg-stone-50 transition"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Message Textarea */}
                <div>
                  <div className="flex items-center justify-between text-xs text-stone-700 mb-1">
                    <label className="font-medium">Your Personal Note</label>
                    <span className="text-[10px] text-stone-400">
                      {(value.message || "").length}/250 chars
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    maxLength={250}
                    placeholder="Write a warm note to be hand-written on a gold-embossed card…"
                    value={value.message || ""}
                    onChange={(e) => handleMessageChange(e.target.value)}
                    className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:border-[#881337] focus:outline-none focus:ring-1 focus:ring-[#881337]"
                  />
                </div>
              </div>

              {/* Hide Price Tag Checkbox */}
              <label className="flex items-center gap-2 cursor-pointer text-xs text-stone-700">
                <input
                  type="checkbox"
                  checked={Boolean(value.hidePriceTag)}
                  onChange={(e) => handleHidePriceTag(e.target.checked)}
                  className="h-4 w-4 rounded border-stone-300 text-[#881337] focus:ring-[#881337]"
                />
                <span>
                  <strong>Gift Confidentiality:</strong> Do not print prices on garment tags or enclose invoice in the box (invoice will be sent via email to you only).
                </span>
              </label>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
