"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import OrderTrackingResult from "@/components/OrderTrackingResult";
import { ApiError, isApiConfigured } from "@/lib/api-client";
import { trackOrderPublic, type PublicOrderTracking } from "@/lib/storefront-api";

const indianMobile = (value: string): string => value.replace(/\D/g, "").slice(-10);

export default function TrackOrderView() {
  const searchParams = useSearchParams();
  const [identifier, setIdentifier] = useState(() => searchParams.get("order") || searchParams.get("awb") || "");
  const [phone, setPhone] = useState("");
  const [tracking, setTracking] = useState<PublicOrderTracking | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const id = identifier.trim();
    const mobile = indianMobile(phone);
    setTracking(null);
    if (id.length < 4) {
      setError("Order number ya AWB sahi se likhe — yeh aapke order confirmation, SMS ya WhatsApp message me milega.");
      return;
    }
    if (!/^[6-9]\d{9}$/.test(mobile)) {
      setError("Wohi 10-digit mobile number likhe jo order karte samay diya tha.");
      return;
    }
    if (!isApiConfigured()) {
      setError("Tracking abhi uplabdh nahi hai. Kripya thodi der baad koshish kare ya hamari team se sampark kare.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      setTracking(await trackOrderPublic(id, mobile));
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 429) {
        setError("bahut koshishe ho gayi hain — kripya 15 minute baad dobara try kare.");
      } else if (cause instanceof ApiError && cause.status === 404) {
        setError("In details se koi order nahi mila. Order number/AWB aur order wala mobile number dobara check kare. (Galti kis field me hai, suraksha ke liye hum nahi batate.)");
      } else {
        setError("Tracking load nahi ho payi. Internet check karke dobara try kare.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-[#fbf7f1]">
      <section className="bg-gradient-to-b from-[#f7e9e3] to-[#fbf7f1]">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-stone-500 sm:text-sm">
            <Link href="/" className="hover:underline">Home</Link>
            <span aria-hidden="true">›</span>
            <span aria-current="page" className="font-medium text-[#781e36]">Track order</span>
          </nav>
          <h1 className="mt-5 font-serif text-4xl text-stone-900 sm:text-5xl">Apna order track kare</h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-stone-600 sm:text-base">
            Login ki zaroorat nahi. Bas order number (ya courier AWB) aur order par diya gaya mobile number likhe — parcel kahan hai, turant dikh jayega.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-3xl px-4 pb-16 sm:px-6">
        <form onSubmit={submit} className="rounded-3xl bg-white p-5 shadow-2xs ring-1 ring-stone-200/70 sm:p-7" aria-describedby="track-help">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="track-identifier" className="text-sm font-semibold text-stone-800">Order number ya AWB</label>
              <input
                id="track-identifier"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                placeholder="Jaise VC… ya AWB number"
                autoComplete="off"
                autoCapitalize="characters"
                className="mt-1.5 min-h-12 w-full rounded-xl border border-stone-300 px-3.5 text-[15px] uppercase outline-none transition placeholder:normal-case focus:border-[#781e36] focus:ring-2 focus:ring-[#781e36]/20"
              />
            </div>
            <div>
              <label htmlFor="track-phone" className="text-sm font-semibold text-stone-800">Order wala mobile number</label>
              <input
                id="track-phone"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="10-digit mobile"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                className="mt-1.5 min-h-12 w-full rounded-xl border border-stone-300 px-3.5 text-[15px] outline-none transition focus:border-[#781e36] focus:ring-2 focus:ring-[#781e36]/20"
              />
            </div>
          </div>
          <p id="track-help" className="mt-3 text-xs leading-relaxed text-stone-500">
            Order number aapke confirmation page, email, SMS ya WhatsApp message me hota hai. Mobile number sirf isiliye maanga jata hai taaki koi aur aapka order na dekh sake — hum isse kahin save ya share nahi karte.
          </p>
          <button type="submit" disabled={busy} className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[#781e36] px-6 text-sm font-bold text-white transition hover:bg-[#64182c] disabled:cursor-wait disabled:opacity-60 sm:w-auto">
            {busy ? "Dhoondh rahe hain…" : "Mera parcel kahan hai?"}
          </button>
          <p className="mt-4 text-sm text-stone-500">
            Account se order kiya tha? <Link href="/account/orders" className="font-semibold text-[#781e36] hover:underline">Mere orders dekhe</Link>
          </p>
        </form>

        <div aria-live="polite" className="mt-6">
          {error && (
            <p role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-relaxed text-rose-800">{error}</p>
          )}
          {tracking && <OrderTrackingResult tracking={tracking} />}
        </div>

        <section className="mt-8 grid gap-4 sm:grid-cols-3" aria-label="Tracking help">
          {[
            ["AWB kab milta hai?", "Order dispatch hote hi AWB SMS/WhatsApp par bheja jata hai aur yahan bhi dikhne lagta hai."],
            ["Delivery me der ho rahi hai?", "Pehle courier live tracking dekhe. Expected date nikal jaane par hamari team turant madad karegi."],
            ["COD order hai?", "Delivery ke samay cash ya UPI se bhugtan kare. Amount upar result me saaf dikhta hai."],
          ].map(([title, body]) => (
            <article key={title} className="rounded-2xl bg-white p-4 ring-1 ring-stone-200/70">
              <h2 className="text-sm font-bold text-stone-800">{title}</h2>
              <p className="mt-1.5 text-[13px] leading-relaxed text-stone-600">{body}</p>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}
