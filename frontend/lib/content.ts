/**
 * CMS content bridge.
 *
 * The homepage's banners, testimonials, lookbook and FAQ are editable through `PUT /api/content/:key`
 * (kind `banner` | `testimonial` | `lookbook` | `faq`). This module turns those loosely-shaped
 * Content documents into the exact structures the homepage already renders, so wiring the CMS up does
 * not mean rewriting the design.
 *
 * The contract throughout: **CMS content wins when it exists, the bundled demo data is the fallback.**
 * A fresh install with an empty `contents` collection must render exactly what it renders today.
 */

import { fetchCatalogue } from "./seo";

/** Mirrors `backend/models/Content.js`. */
export interface ContentDoc {
  _id: string;
  key: string;
  kind: "page" | "section" | "banner" | "faq" | "policy" | "testimonial" | "lookbook";
  title?: string;
  subtitle?: string;
  body?: string;
  /** Free-form JSON — each kind reads the fields it understands and ignores the rest. */
  blocks?: Record<string, unknown> | unknown[] | null;
  media?: { url: string; alt?: string; kind?: string }[];
  ctaLabel?: string;
  ctaHref?: string;
  position?: number;
  locale?: string;
  status?: "draft" | "published";
  createdAt?: string;
  updatedAt?: string;
}

export const CONTENT_KINDS = ["page", "section", "banner", "faq", "policy", "testimonial", "lookbook"] as const;
export type ContentKind = (typeof CONTENT_KINDS)[number];

/* ------------------------------------------------------------------ fetching */

/** Published content of one kind, ordered by `position` (the API already sorts). */
export async function fetchContentByKind(kind: ContentKind): Promise<ContentDoc[]> {
  const response = await fetchCatalogue<{ data: ContentDoc[] }>(`/api/content?kind=${encodeURIComponent(kind)}`, 300);
  const rows = response?.data;
  if (!Array.isArray(rows)) return [];
  return rows.filter((row) => row && row.key);
}

/** One block by key — `GET /api/content/:key` 404s when unpublished, which is a normal outcome. */
export async function fetchContentByKey(key: string): Promise<ContentDoc | null> {
  const response = await fetchCatalogue<{ data: ContentDoc }>(`/api/content/${encodeURIComponent(key)}`, 300);
  return response?.data ?? null;
}

/* ------------------------------------------------------------------- helpers */

const str = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;

const num = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

const bool = (value: unknown, fallback = false): boolean => (typeof value === "boolean" ? value : fallback);

/** `blocks` is Mixed, so it may arrive as an object, an array, or nothing at all. */
const blocksAsObject = (doc: ContentDoc): Record<string, unknown> => {
  const blocks = doc.blocks;
  if (blocks && typeof blocks === "object" && !Array.isArray(blocks)) return blocks as Record<string, unknown>;
  return {};
};

const firstImage = (doc: ContentDoc, kind?: string): string | undefined => {
  const media = Array.isArray(doc.media) ? doc.media : [];
  const match = kind ? media.find((item) => item?.kind === kind) : undefined;
  return str((match ?? media[0])?.url);
};

/* --------------------------------------------------------------------- banners */

export interface HeroSlide {
  title: string;
  subtitle: string;
  desc: string;
  ctaText: string;
  ctaLink: string;
  tag: string;
  image: string;
  /** Tailwind object-position class controlling where the photo is cropped. */
  position?: string;
}

/**
 * Hero slides from `kind=banner`.
 *
 * Every field falls back independently: an editor who sets only a new headline keeps the bundled
 * image and CTA. Returns `fallback` untouched when the CMS has no published banners at all.
 */
export function toHeroSlides(docs: ContentDoc[], fallback: HeroSlide[]): HeroSlide[] {
  if (!docs.length) return fallback;
  const slides = docs
    .map((doc, index): HeroSlide | null => {
      const blocks = blocksAsObject(doc);
      const base = fallback[index] ?? fallback[0];
      const image = firstImage(doc) ?? str(blocks.image) ?? base?.image;
      const title = str(doc.title) ?? base?.title;
      // A banner with neither a title nor an image cannot render; drop it rather than show a hole.
      if (!title || !image) return null;
      return {
        title,
        subtitle: str(doc.subtitle) ?? str(blocks.subtitle) ?? base?.subtitle ?? "",
        desc: str(doc.body) ?? str(blocks.desc) ?? base?.desc ?? "",
        ctaText: str(doc.ctaLabel) ?? str(blocks.ctaText) ?? base?.ctaText ?? "Shop now",
        ctaLink: str(doc.ctaHref) ?? str(blocks.ctaLink) ?? base?.ctaLink ?? "#products",
        tag: str(blocks.tag) ?? base?.tag ?? "",
        image,
        position: str(blocks.position) ?? base?.position,
      };
    })
    .filter((slide): slide is HeroSlide => slide !== null);
  return slides.length ? slides : fallback;
}

/* ---------------------------------------------------------------- testimonials */

export interface Testimonial {
  id: string | number;
  name: string;
  city: string;
  rating: number;
  title: string;
  comment: string;
  verified: boolean;
  date: string;
  product: string;
}

/** Customer testimonials from `kind=testimonial`. */
export function toTestimonials(docs: ContentDoc[], fallback: Testimonial[]): Testimonial[] {
  if (!docs.length) return fallback;
  const rows = docs
    .map((doc, index): Testimonial | null => {
      const blocks = blocksAsObject(doc);
      const base = fallback[index];
      const name = str(blocks.name) ?? str(blocks.author) ?? base?.name;
      const comment = str(doc.body) ?? str(blocks.comment) ?? base?.comment;
      if (!name || !comment) return null;
      const rating = num(blocks.rating) ?? base?.rating ?? 5;
      return {
        id: doc.key,
        name,
        city: str(blocks.city) ?? str(blocks.location) ?? base?.city ?? "",
        // Clamp to the 1–5 the star renderer expects; a stray 50 would draw 50 stars.
        rating: Math.min(5, Math.max(1, Math.round(rating))),
        title: str(doc.title) ?? base?.title ?? "",
        comment,
        verified: bool(blocks.verified, base?.verified ?? true),
        date: str(blocks.date) ?? base?.date ?? "",
        product: str(blocks.product) ?? base?.product ?? "",
      };
    })
    .filter((row): row is Testimonial => row !== null);
  return rows.length ? rows : fallback;
}

/* -------------------------------------------------------------------- lookbook */

export interface LookbookPin {
  id: string;
  top: string;
  left: string;
  title: string;
  price: string;
  tag: string;
}

export interface Lookbook {
  title: string;
  subtitle: string;
  image: string;
  pins: LookbookPin[];
}

/** The shoppable editorial image from `kind=lookbook`. Only the first published block is used. */
export function toLookbook(docs: ContentDoc[], fallback: Lookbook): Lookbook {
  const doc = docs[0];
  if (!doc) return fallback;
  const blocks = blocksAsObject(doc);
  const image = firstImage(doc) ?? str(blocks.image) ?? fallback.image;
  if (!image) return fallback;

  // Pins may be authored as a JSON array in `blocks.pins`, or as extra media entries with alt text.
  const rawPins = Array.isArray(blocks.pins) ? (blocks.pins as unknown[]) : [];
  const pins: LookbookPin[] = rawPins
    .map((entry, index): LookbookPin | null => {
      if (!entry || typeof entry !== "object") return null;
      const pin = entry as Record<string, unknown>;
      const base = fallback.pins[index];
      const title = str(pin.title) ?? base?.title;
      if (!title) return null;
      return {
        id: str(pin.id) ?? base?.id ?? `pin-${index + 1}`,
        top: str(pin.top) ?? base?.top ?? "50%",
        left: str(pin.left) ?? base?.left ?? "50%",
        title,
        price: str(pin.price) ?? base?.price ?? "",
        tag: str(pin.tag) ?? base?.tag ?? "",
      };
    })
    .filter((pin): pin is LookbookPin => pin !== null);

  return {
    title: str(doc.title) ?? fallback.title,
    subtitle: str(doc.subtitle) ?? fallback.subtitle,
    image,
    pins: pins.length ? pins : fallback.pins,
  };
}

/* ------------------------------------------------------------------------- FAQ */

export interface FaqItem {
  question: string;
  answer: string;
}

/**
 * FAQ entries from `kind=faq`: `title` is the question, `body` the answer.
 *
 * These feed both the visible accordion and the FAQPage JSON-LD, so a block with one half missing is
 * dropped — marking up an answer the reader cannot see is a spam signal.
 */
export function toFaqItems(docs: ContentDoc[]): FaqItem[] {
  return docs
    .map((doc): FaqItem | null => {
      const blocks = blocksAsObject(doc);
      const question = str(doc.title) ?? str(blocks.question);
      const answer = str(doc.body) ?? str(blocks.answer);
      if (!question || !answer) return null;
      return { question, answer };
    })
    .filter((item): item is FaqItem => item !== null);
}

/* ------------------------------------------------------------------- categories */

export interface CategoryStory {
  id: string;
  name: string;
  tagline: string;
  image: string;
  count: string;
  filterKey: string;
}

/** Category story tiles from `kind=section`. Falls back to the bundled stories when absent. */
export function toCategoryStories(docs: ContentDoc[], fallback: CategoryStory[]): CategoryStory[] {
  if (!docs.length) return fallback;
  const rows = docs
    .map((doc, index): CategoryStory | null => {
      const blocks = blocksAsObject(doc);
      const base = fallback[index];
      const name = str(doc.title) ?? base?.name;
      const image = firstImage(doc) ?? str(blocks.image) ?? base?.image;
      if (!name || !image) return null;
      return {
        id: doc.key,
        name,
        tagline: str(doc.subtitle) ?? str(blocks.tagline) ?? base?.tagline ?? "",
        image,
        count: str(blocks.count) ?? base?.count ?? "",
        filterKey: str(blocks.filterKey) ?? base?.filterKey ?? "",
      };
    })
    .filter((row): row is CategoryStory => row !== null);
  return rows.length ? rows : fallback;
}

/* ------------------------------------------------------------ everything at once */

export interface HomepageContent<TBanners, TTestimonials, TLookbook, TStories> {
  banners: TBanners;
  testimonials: TTestimonials;
  lookbook: TLookbook;
  stories: TStories;
  faqs: FaqItem[];
  /** True when at least one block came from the CMS rather than the bundled demo data. */
  fromCms: boolean;
}

/**
 * One pass over the CMS for the whole homepage.
 *
 * The five kinds are fetched concurrently, and each mapper independently falls back, so a partially
 * populated CMS (say, banners but no testimonials) renders a mix of live and bundled content rather
 * than all-or-nothing.
 */
export async function fetchHomepageContent(fallbacks: {
  banners: HeroSlide[];
  testimonials: Testimonial[];
  lookbook: Lookbook;
  stories: CategoryStory[];
}): Promise<HomepageContent<HeroSlide[], Testimonial[], Lookbook, CategoryStory[]>> {
  const [banners, testimonials, lookbook, stories, faqs] = await Promise.all([
    fetchContentByKind("banner"),
    fetchContentByKind("testimonial"),
    fetchContentByKind("lookbook"),
    fetchContentByKind("section"),
    fetchContentByKind("faq"),
  ]);

  return {
    banners: toHeroSlides(banners, fallbacks.banners),
    testimonials: toTestimonials(testimonials, fallbacks.testimonials),
    lookbook: toLookbook(lookbook, fallbacks.lookbook),
    stories: toCategoryStories(stories, fallbacks.stories),
    faqs: toFaqItems(faqs),
    fromCms: Boolean(banners.length || testimonials.length || lookbook.length || stories.length || faqs.length),
  };
}
