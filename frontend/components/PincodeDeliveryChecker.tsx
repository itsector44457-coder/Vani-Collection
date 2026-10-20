"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { isApiConfigured } from "../lib/api-client";
import { FREE_SHIPPING_THRESHOLD, readSavedPincode, savePincode, shippingFeeFor, SHIPPING_FEE_LABEL } from "../lib/pricing";
import { checkServiceability, type Serviceability } from "../lib/storefront-api";

const PINCODE_RE = /^[1-9]\d{5}$/;

const subscribeSavedPincode = (onStoreChange: () => void) => {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener("storage", onStoreChange);
  return () => window.removeEventListener("storage", onStoreChange);
};
const savedPincodeServerSnapshot = () => "";

const money = (value: number) => `₹${value.toLocaleString("en-IN")}`;

/**
 * Product-page delivery check. The price shown here always comes from the serviceability response
 * plus the shared free-shipping rule — never from a hard-coded second pricing table.
 */
export default function PincodeDeliveryChecker({ subtotal }: { subtotal?: number }) {
  const savedPincode = useSyncExternalStore(subscribeSavedPincode, readSavedPincode, savedPincodeServerSnapshot);
  const [draftPincode, setDraftPincode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Serviceability | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const requestRef = useRef(0);
  const autoCheckedRef = useRef("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  const pincode = draftPincode ?? savedPincode;
  const live = isApiConfigured();

  const handleCheck = useCallback(async (pin: string) => {
    const cleaned = pin.trim().replace(/\D/g, "").slice(0, 6);
    if (!PINCODE_RE.test(cleaned)) {
      setError("Sahi 6-digit Bharatiya pincode likhe (pehla ank 0 nahi hona chahiye).");
      return;
    }
    if (!live) {
      setError("Delivery jaanch abhi uplabdh nahi hai. Checkout par pincode se final charge confirm hoga.");
      return;
    }

    const request = ++requestRef.current;
    setLoading(true);
    setError(null);
    try {
      const data = await checkServiceability(cleaned);
      if (requestRef.current !== request) return;
      if (!data.serviceable) {
        setResult(null);
        setError("Is pincode par abhi delivery uplabdh nahi hai. Koi aur pincode jaanche ya support se sampark kare.");
        return;
      }
      setResult(data);
      setDraftPincode(cleaned);
      setIsEditing(false);
      savePincode(cleaned);
    } catch {
      if (requestRef.current !== request) return;
      setResult(null);
      setError("Delivery jaanch nahi ho payi. Pincode dobara jaanch kar koshish kare.");
    } finally {
      if (requestRef.current === request) setLoading(false);
    }
  }, [live]);

  useEffect(() => {
    if (!live || !PINCODE_RE.test(savedPincode) || autoCheckedRef.current === savedPincode) return;
    autoCheckedRef.current = savedPincode;
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) void handleCheck(savedPincode);
    });
    return () => {
      cancelled = true;
    };
  }, [handleCheck, live, savedPincode]);

  const handleReset = () => {
    setIsEditing(true);
    setError(null);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const feeForThisItem = result && typeof subtotal === "number"
    ? shippingFeeFor(subtotal, result.shippingFee)
    : null;
  const amountToFree = result && typeof subtotal === "number"
    ? Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal)
    : null;

  return (
    <section aria-labelledby="pincode-checker-heading" className="rounded-2xl border border-stone-200/80 bg-white/70 p-4 shadow-sm backdrop-blur-sm sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id="pincode-checker-heading" className="flex items-center gap-2 font-serif text-sm font-semibold tracking-wide text-stone-900">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#881337]/10 text-[#881337]" aria-hidden="true">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </span>
          Delivery, shipping aur COD
        </h2>
        {result && !isEditing && (
          <button type="button" onClick={handleReset} className="inline-flex min-h-11 items-center px-2 text-xs font-semibold text-[#881337] hover:underline">
            Pincode badle
          </button>
        )}
      </div>

      {!result || isEditing ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void handleCheck(pincode);
          }}
          className="space-y-2.5"
          noValidate
        >
          <label htmlFor="pdp-pincode" className="sr-only">Delivery pincode</label>
          <div className="flex items-stretch gap-2">
            <input
              ref={inputRef}
              id="pdp-pincode"
              name="pincode"
              type="text"
              inputMode="numeric"
              autoComplete="postal-code"
              maxLength={6}
              value={pincode}
              onChange={(event) => {
                setDraftPincode(event.target.value.replace(/\D/g, "").slice(0, 6));
                if (error) setError(null);
              }}
              placeholder="6-digit pincode"
              aria-invalid={Boolean(error)}
              aria-describedby={`${error ? "pdp-pincode-error " : ""}pdp-pincode-hint`}
              className="min-h-12 min-w-0 flex-1 rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm tracking-wider text-stone-900 placeholder:text-stone-400 focus:border-[#881337] focus:outline-none focus:ring-2 focus:ring-[#881337]/20"
            />
            <button
              type="submit"
              disabled={loading || pincode.length !== 6}
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#881337] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#701a35] disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-500"
            >
              {loading ? "Jaanch…" : "Check"}
            </button>
          </div>

          <div aria-live="polite">
            {loading && <p className="text-xs text-sky-700">Delivery, COD aur shipping charge jaanch ho raha hai…</p>}
            {error && <p id="pdp-pincode-error" role="alert" className="text-xs leading-relaxed text-rose-700">{error}</p>}
          </div>

          <p id="pdp-pincode-hint" className="text-[11.5px] leading-relaxed text-stone-500">
            Pincode jaanchne par sahi zone charge dikhega ({SHIPPING_FEE_LABEL}); discount ke baad {money(FREE_SHIPPING_THRESHOLD)}+ par delivery FREE hai. Dispatch aam taur par 2–3 working days me hota hai.
          </p>
        </form>
      ) : (
        <div className="space-y-2.5" aria-live="polite">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-stone-200/60 bg-stone-50/90 px-3.5 py-2.5 text-xs">
            <span className="text-stone-600">Delivery pincode: <strong className="font-semibold tracking-wider text-stone-900">{result.pincode}</strong></span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-semibold text-emerald-800">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
              Delivery uplabdh
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
            <div className="flex items-start gap-2 rounded-xl border border-stone-200/70 bg-white p-3">
              <span className="mt-0.5" aria-hidden="true">🚚</span>
              <div>
                <p className="font-semibold leading-snug text-stone-900">Lagbhag {result.etaDays} din me pahunch</p>
                <p className="mt-1 text-[11px] leading-relaxed text-stone-500">Dispatch 2–3 working days; final date AWB ke saath confirm hogi.</p>
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-xl border border-stone-200/70 bg-white p-3">
              <span className="mt-0.5" aria-hidden="true">✨</span>
              <div>
                <p className="font-semibold leading-snug text-stone-900">
                  {feeForThisItem === null
                    ? `Shipping ${money(result.shippingFee)}`
                    : feeForThisItem === 0
                      ? "Is khareed par FREE shipping"
                      : `Is khareed par shipping ${money(feeForThisItem)}`}
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-stone-500">
                  {amountToFree === null
                    ? `${money(FREE_SHIPPING_THRESHOLD)}+ (discount ke baad) par FREE.`
                    : amountToFree > 0
                      ? `${money(amountToFree)} aur ki khareed par FREE ho jayegi.`
                      : "Free-shipping seema poori ho gayi hai."}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-xl border border-stone-200/70 bg-white p-3">
              <span className="mt-0.5" aria-hidden="true">{result.cod ? "💵" : "💳"}</span>
              <div>
                <p className="font-semibold leading-snug text-stone-900">{result.cod ? "COD uplabdh hai" : "Sirf online payment"}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-stone-500">{result.cod ? "Delivery par cash/UPI se bhugtan kare." : "Is zone me order Razorpay online payment se hoga."}</p>
              </div>
            </div>
          </div>

          <p className="border-t border-stone-100 pt-2 text-[11.5px] leading-relaxed text-stone-500">
            Final shipping checkout par cart ke discounted kul aur isi pincode zone se confirm hoga — koi chhupa charge nahi.
          </p>
        </div>
      )}
    </section>
  );
}
