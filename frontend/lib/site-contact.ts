/**
 * Single source for the store's customer-facing phone and WhatsApp number.
 *
 * To publish the verified real number, set these public environment variables (or replace the
 * fallbacks below) — every schema, footer, policy page and WhatsApp link reads from here:
 *
 *   NEXT_PUBLIC_STORE_PHONE="+91 XXXXX-XXXXX"
 *   NEXT_PUBLIC_STORE_WHATSAPP="91XXXXXXXXXX"
 *
 * The fallback below is the store's real customer number.
 */
// Demo Collection's live customer line. Used when the env variables above are not set.
const DEFAULT_PHONE_DISPLAY = "+91 96942 00417";
const DEFAULT_WHATSAPP_NUMBER = "919694200417";

const digitsOnly = (value?: string) => (value ?? "").replace(/\D/g, "");
const configuredWhatsApp = digitsOnly(process.env.NEXT_PUBLIC_STORE_WHATSAPP);
const configuredPhone = process.env.NEXT_PUBLIC_STORE_PHONE?.trim() ?? "";

export const STORE_PHONE_DISPLAY = configuredPhone || DEFAULT_PHONE_DISPLAY;
export const STORE_WHATSAPP_NUMBER = configuredWhatsApp.length >= 11
  ? configuredWhatsApp
  : DEFAULT_WHATSAPP_NUMBER;
export const STORE_PHONE_E164 = `+${digitsOnly(STORE_PHONE_DISPLAY) || STORE_WHATSAPP_NUMBER}`;
export const STORE_PHONE_IS_PLACEHOLDER = false;

export function storeWhatsAppUrl(message?: string): string {
  const base = `https://wa.me/${STORE_WHATSAPP_NUMBER}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

/** Recipient-less WhatsApp share intent for articles/order celebrations. */
export function whatsappShareUrl(message: string): string {
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
}
