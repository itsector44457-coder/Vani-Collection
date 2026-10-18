import type { ContentDoc } from "./api-client";

export const FOUNDER_KEY = "home.founder";
export interface FounderMessage {
  heading: string;
  name: string;
  role: string;
  message: string;
  quote: string;
  image: string;
  imageAlt: string;
  year: string;
}
export const DEFAULT_FOUNDER: FounderMessage = {
  heading: "A little dream.\nA lot of heart.",
  name: "Aaiysha & Pawan",
  role: "Co-founders, Vani Collection · Guna, Madhya Pradesh",
  message: "Founded in 2018, Vani Collection was born out of a shared dream and endless hustle. From a small idea to a growing brand, every step has been a journey of learning, creativity, and commitment. We created Vani Collection to offer something fresh — new designs that make our customers look good and feel confident.\n\nOur forte lies in understanding what makes each person unique and helping them express that through fashion. It hasn’t always been easy — there’s been struggle, late nights, and a lot of learning — but the love we receive from our customers makes it all worth it.",
  quote: "At the heart of everything we do is you. Because when you look good, we feel proud.",
  image: "/vani-store-front.jpg",
  imageAlt: "The Vani Collection storefront in Guna",
  year: "2018",
};
export function toFounderMessage(document?: ContentDoc | null): FounderMessage {
  if (!document) return { ...DEFAULT_FOUNDER };
  const blocks = document.blocks && typeof document.blocks === "object" && !Array.isArray(document.blocks) ? document.blocks as Record<string, unknown> : {};
  const text = (value: unknown, fallback: string) => typeof value === "string" ? value : fallback;
  return {
    heading: text(document.title, DEFAULT_FOUNDER.heading),
    name: text(document.subtitle, DEFAULT_FOUNDER.name),
    message: text(document.body, DEFAULT_FOUNDER.message),
    role: text(blocks.role, DEFAULT_FOUNDER.role),
    quote: text(blocks.quote, DEFAULT_FOUNDER.quote),
    year: text(blocks.year, DEFAULT_FOUNDER.year),
    image: document.media?.[0]?.url || DEFAULT_FOUNDER.image,
    imageAlt: document.media?.[0]?.alt || DEFAULT_FOUNDER.imageAlt,
  };
}
