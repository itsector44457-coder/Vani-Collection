"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { checkServiceability, type Serviceability } from "../lib/storefront-api";

const CACHE_KEY = "vani_user_pincode";

export default function PincodeDeliveryChecker() {
  const [pincode, setPincode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Serviceability | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const calculateDeliveryDate = (days: number): string => {
    const target = new Date();
    target.setDate(target.getDate() + days);
    return target.toLocaleDateString("en-IN", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const handleCheck = useCallback(async (pin: string) => {
    const cleaned = pin.trim().replace(/\D/g, "");
    if (cleaned.length !== 6) {
      setError("Please enter a valid 6-digit Indian PIN code.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await checkServiceability(cleaned);
      if (data.serviceable) {
        setResult(data);
        setIsEditing(false);
        try {
          localStorage.setItem(CACHE_KEY, cleaned);
        } catch {
          /* ignore private mode storage failures */
        }
      } else {
        setResult(null);
        setError("Delivery is currently unavailable to this PIN code.");
      }
    } catch {
      setResult(null);
      setError("Unable to check delivery at this moment. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Restore cached pincode on mount
  useEffect(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached && /^[1-9]\d{5}$/.test(cached)) {
        setPincode(cached);
        handleCheck(cached);
      }
    } catch {
      /* ignore */
    }
  }, [handleCheck]);

  const handleReset = () => {
    setIsEditing(true);
    setResult(null);
    setError(null);
  };

  return (
    <div className="rounded-2xl border border-stone-200/80 bg-white/70 p-4.5 shadow-sm backdrop-blur-sm sm:p-5">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#881337]/10 text-[#881337]">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </span>
          <span className="font-serif text-sm font-semibold tracking-wide text-stone-900">
            Delivery & COD Availability
          </span>
        </div>
        {result && !isEditing && (
          <button
            type="button"
            onClick={handleReset}
            className="text-xs font-medium text-[#881337] hover:underline"
          >
            Change Pincode
          </button>
        )}
      </div>

      {(!result || isEditing) ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleCheck(pincode);
          }}
          className="space-y-2.5"
        >
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={pincode}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setPincode(val);
                  if (error) setError(null);
                }}
                placeholder="Enter 6-digit Pincode"
                className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm tracking-wider text-stone-900 placeholder:text-stone-400 focus:border-[#881337] focus:outline-none focus:ring-1 focus:ring-[#881337]"
              />
            </div>
            <button
              type="submit"
              disabled={loading || pincode.trim().length !== 6}
              className="inline-flex items-center justify-center rounded-xl bg-[#881337] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#701a35] disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-500"
            >
              {loading ? (
                <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              ) : (
                "Check"
              )}
            </button>
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs text-rose-600 flex items-center gap-1.5"
            >
              <span>⚠️</span> {error}
            </motion.p>
          )}

          <p className="text-[11.5px] text-stone-500">
            Check real-time dispatch schedule and payment options for your location.
          </p>
        </form>
      ) : (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-2.5"
          >
            <div className="flex items-center justify-between rounded-xl bg-stone-50/90 px-3.5 py-2 border border-stone-200/60 text-xs">
              <span className="text-stone-600">
                Delivering to: <strong className="font-semibold text-stone-900 tracking-wider">{result.pincode}</strong>
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Serviceable
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {/* Delivery ETA */}
              <div className="flex items-start gap-2 rounded-xl bg-white p-2.5 border border-stone-200/70">
                <span className="mt-0.5 text-base">🚚</span>
                <div>
                  <div className="font-semibold text-stone-900">
                    Est. Delivery by {calculateDeliveryDate(result.etaDays)}
                  </div>
                  <div className="text-[11px] text-stone-500">
                    Dispatched within 24–48 hrs
                  </div>
                </div>
              </div>

              {/* COD Availability */}
              <div className="flex items-start gap-2 rounded-xl bg-white p-2.5 border border-stone-200/70">
                <span className="mt-0.5 text-base">{result.cod ? "💵" : "💳"}</span>
                <div>
                  <div className="font-semibold text-stone-900">
                    {result.cod ? "Cash on Delivery Available" : "Prepaid Only"}
                  </div>
                  <div className="text-[11px] text-stone-500">
                    {result.cod ? "Pay via cash/UPI at doorstep" : "Online UPI / Cards accepted"}
                  </div>
                </div>
              </div>
            </div>

            {/* Free shipping banner */}
            <div className="flex items-center justify-between text-[11.5px] text-stone-600 pt-1 border-t border-stone-100">
              <span className="flex items-center gap-1">
                <span>✨</span>
                <span>Free shipping on all orders above <strong>₹{result.freeAbove.toLocaleString("en-IN")}</strong></span>
              </span>
              <span className="text-stone-400">Guna Atelier Dispatch</span>
            </div>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
