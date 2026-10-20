"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { apiFetch } from "@/lib/api-client";
import { STORE_PHONE_DISPLAY, STORE_PHONE_E164, storeWhatsAppUrl } from "@/lib/site-contact";

export default function ContactView() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError("");
    try {
      await apiFetch("/api/contact", {
        method: "POST",
        body: JSON.stringify({ name, email, phone, message }),
      });
      setSent(true);
      setName("");
      setEmail("");
      setPhone("");
      setMessage("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to send message. Please try again.";
      setError(msg);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-white text-[#1c1917] min-h-screen">
      {/* ---------------- Main Editorial Contact Container ---------------- */}
      <div className="mx-auto max-w-[960px] px-6 py-16 sm:py-20 lg:py-24">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12 sm:mb-16"
        >
          <h1 className="font-serif text-3xl sm:text-4xl lg:text-[42px] font-light tracking-[0.22em] uppercase text-[#1c1917]">
            Contact
          </h1>
        </motion.div>

        {/* 3-Column Info Grid */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8 text-[12.5px] leading-relaxed text-[#292524] mb-12 sm:mb-14 px-2"
        >
          {/* Column 1: Inquiries */}
          <div className="space-y-1">
            <p>
              <a
                href="mailto:Vanicollectionguna@gmail.com"
                className="hover:underline transition underline-offset-4"
              >
                Vanicollectionguna@gmail.com
              </a>
            </p>
            <p>
              <a
                href={`tel:${STORE_PHONE_E164}`}
                className="hover:underline transition underline-offset-4"
              >
                {STORE_PHONE_DISPLAY}
              </a>
            </p>
            <p className="text-stone-500 pt-0.5">10 am - 8 pm IST</p>
          </div>

          {/* Column 2: Atelier Address */}
          <div className="space-y-1">
            <p className="font-medium text-[#1c1917]">Vani Collection Flagship Atelier</p>
            <p>Station Road</p>
            <p className="text-stone-500">473001 Guna, Madhya Pradesh</p>
          </div>

          {/* Column 3: Social & Concierge */}
          <div className="space-y-2.5 md:text-right flex flex-col md:items-end">
            <p>
              <a
                href="https://instagram.com/vanicollection"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 hover:text-[#881337] transition font-medium"
              >
                <svg className="w-4 h-4 text-pink-600 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
                <span>Instagram</span>
              </a>
            </p>
            <p>
              <a
                href={storeWhatsAppUrl("Hello Vani Collection")}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 hover:text-[#25D366] transition font-medium"
              >
                <svg className="w-4 h-4 text-[#25D366] shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                </svg>
                <span>WhatsApp Concierge</span>
              </a>
            </p>
            <p>
              <a
                href="https://facebook.com/vanicollection"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-stone-500 hover:text-[#1877F2] transition font-medium"
              >
                <svg className="w-4 h-4 text-[#1877F2] shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M22.675 0h-21.35c-.732 0-1.325.593-1.325 1.325v21.351c0 .731.593 1.324 1.325 1.324h11.495v-9.294h-3.128v-3.622h3.128v-2.671c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12v9.293h6.116c.73 0 1.323-.593 1.323-1.325v-21.35c0-.732-.593-1.325-1.325-1.325z" />
                </svg>
                <span>Facebook</span>
              </a>
            </p>
          </div>
        </motion.div>

        {/* Centerpiece Editorial Image */}
        <motion.div
          initial={{ opacity: 0, scale: 0.99 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative w-full aspect-[4/3] overflow-hidden bg-stone-100 shadow-xs mb-12 sm:mb-16"
        >
          <Image
            src="/contact-editorial.jpg"
            alt="Vani Collection Artisanal Editorial Craft"
            fill
            sizes="(max-width: 1024px) 100vw, 960px"
            className="object-cover object-center"
            priority
          />
        </motion.div>

        {/* Footer Statement & CTA */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-center max-w-xl mx-auto space-y-7"
        >
          <p className="text-[13px] leading-relaxed text-stone-600 font-light">
            Our products are available on our website and at our physical atelier location in Guna, Madhya Pradesh.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link
              href="/products"
              className="inline-block bg-[#1c1917] hover:bg-[#881337] text-white px-10 py-3.5 text-[11px] font-medium tracking-[0.2em] uppercase transition-all duration-300 shadow-sm"
            >
              Go to shop
            </Link>

            <button
              type="button"
              onClick={() => setFormOpen((prev) => !prev)}
              className="inline-block border border-stone-300 hover:border-stone-500 text-stone-800 px-8 py-3.5 text-[11px] font-medium tracking-[0.2em] uppercase transition-all duration-300"
            >
              {formOpen ? "Close message form" : "Send us a message"}
            </button>
          </div>
        </motion.div>

        {/* ---------------- Interactive Message Form (Expandable) ---------------- */}
        {formOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.4 }}
            className="mt-14 pt-10 border-t border-stone-200 max-w-lg mx-auto"
          >
            <div className="text-center mb-6">
              <h2 className="font-serif text-xl tracking-[0.12em] uppercase text-stone-900 font-light">
                Write to the Atelier
              </h2>
              <p className="text-[12px] text-stone-500 mt-1">
                We respond to all inquiries within one business day.
              </p>
            </div>

            {sent ? (
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-6 text-center text-emerald-800 text-sm">
                <p className="font-semibold mb-1">Thank you for your message</p>
                <p className="text-xs text-emerald-700">
                  Our atelier concierge has received your request and will get back to you shortly.
                </p>
                <button
                  type="button"
                  onClick={() => setSent(false)}
                  className="mt-4 text-xs font-semibold text-emerald-900 underline"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-600 mb-1">
                    Your Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Priya Sharma"
                    className="w-full border border-stone-300 px-3.5 py-2.5 text-xs text-stone-900 placeholder:text-stone-400 outline-none focus:border-[#881337] transition"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-600 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. priya@example.com"
                      className="w-full border border-stone-300 px-3.5 py-2.5 text-xs text-stone-900 placeholder:text-stone-400 outline-none focus:border-[#881337] transition"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-600 mb-1">
                      Phone (Optional)
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="10-digit number"
                      className="w-full border border-stone-300 px-3.5 py-2.5 text-xs text-stone-900 placeholder:text-stone-400 outline-none focus:border-[#881337] transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-600 mb-1">
                    Message
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="How may our concierge assist you?"
                    className="w-full border border-stone-300 px-3.5 py-2.5 text-xs text-stone-900 placeholder:text-stone-400 outline-none focus:border-[#881337] transition resize-none"
                  />
                </div>

                {error && (
                  <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 px-3 py-2 rounded">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={sending}
                  className="w-full bg-[#1c1917] hover:bg-[#881337] text-white py-3 text-[11px] font-semibold tracking-[0.2em] uppercase transition duration-200 disabled:opacity-50"
                >
                  {sending ? "Sending…" : "Submit Inquiry"}
                </button>
              </form>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
