/**
 * Single source for the store's customer-facing phone and WhatsApp number.
 *
 * To publish the verified real number, set these public environment variables (or replace the
 * fallbacks below) — every schema, footer, policy page and WhatsApp link reads from here:
 *
 *   NEXT_PUBLIC_STORE_PHONE="+91 XXXXX-XXXXX"
 *   NEXT_PUBLIC_STORE_WHATSAPP="91XXXXXXXXXX"
 *
 * The fallback below is the long-standing dummy-looking number already present in the codebase.
 * It must be verified before launch; Admin → SEO Health deliberately flags the placeholder.
 */
const PLACEHOLDER_PHONE_DISPLAY = "+91 98765-43210";
const PLACEHOLDER_WHATSAPP_NUMBER = "919876543210";

const digitsOnly = (value?: string) => (value ?? "").replace(/\D/g, "");
const configuredWhatsApp = digitsOnly(process.env.NEXT_PUBLIC_STORE_WHATSAPP);
const configuredPhone = process.env.NEXT_PUBLIC_STORE_PHONE?.trim() ?? "";

export const STORE_PHONE_DISPLAY = configuredPhone || PLACEHOLDER_PHONE_DISPLAY;
export const STORE_WHATSAPP_NUMBER = configuredWhatsApp.length >= 11
  ? configuredWhatsApp
  : PLACEHOLDER_WHATSAPP_NUMBER;
export const STORE_PHONE_E164 = `+${digitsOnly(STORE_PHONE_DISPLAY) || STORE_WHATSAPP_NUMBER}`;
export const STORE_PHONE_IS_PLACEHOLDER = STORE_PHONE_DISPLAY === PLACEHOLDER_PHONE_DISPLAY
  || STORE_WHATSAPP_NUMBER === PLACEHOLDER_WHATSAPP_NUMBER;

export function storeWhatsAppUrl(message?: string): string {
  const base = `https://wa.me/${STORE_WHATSAPP_NUMBER}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

/** Recipient-less WhatsApp share intent for articles/order celebrations. */
export function whatsappShareUrl(message: string): string {
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
}
