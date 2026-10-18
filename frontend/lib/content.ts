import { FOUNDER_KEY, toFounderMessage, type FounderMessage } from "./founder";
/**
 * CMS content bridge.
 *
 * The homepage's banners, testimonials, lookbook and FAQ are editable through `PUT /api/content/:key`
 * (kind `banner` | `testimonial` | `lookbook` | `faq`). This module turns those loosely-shaped
 * Content documents into the exact structures the homepage already renders, so wiring the CMS up does
 * not mean rewriting the design.
 *
 * Only published CMS content is rendered; an empty CMS produces empty homepage content.
 */

import { fetchCatalogue, absoluteUrl, SITE_NAME, SITE_LOCALE } from "./seo";
import type { Metadata } from "next";

/** Mirrors `backend/models/Content.js`. */
export interface ContentDoc {
  _id: string;
  key: string;
  kind: "page" | "section" | "banner" | "faq" | "policy" | "testimonial" | "lookbook" | "product_collection";
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
  updatedBy?: { _id?: string; email?: string; firstName?: string; lastName?: string };
  createdAt?: string;
  updatedAt?: string;
}

export interface PublishedReel {
  _id: string;
  title: string;
  description?: string;
  videoUrl: string;
  thumbnailUrl?: string;
  position: number;
  productId: {
    _id: string;
    name: string;
    slug: string;
    images?: { url: string; alt?: string }[];
    variants?: { price: number; mrp?: number; size?: string; color?: string; sku?: string }[];
    status?: string;
    fabric?: string;
    craft?: string;
    category?: string;
    shortDescription?: string;
    description?: string;
  };
}

export const CONTENT_KINDS = ["page", "section", "banner", "faq", "policy", "testimonial", "lookbook", "product_collection"] as const;
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
  video?: string;
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
  const slides = docs.flatMap((doc, index): HeroSlide[] => {
    const blocks = blocksAsObject(doc);
    const base = fallback[index] ?? fallback[0];
    const media = Array.isArray(doc.media) ? doc.media : [];
    const imageMedia = media.filter((item) => item?.kind !== "video" && str(item?.url));
    const videoMedia = media.filter((item) => item?.kind === "video" && str(item?.url));
    const fallbackImage = str(blocks.image) ?? base?.image ?? "";
    const title = str(doc.title) ?? base?.title;
    if (!title) return [];

    const shared = {
      title,
      subtitle: str(doc.subtitle) ?? str(blocks.subtitle) ?? base?.subtitle ?? "",
      desc: str(doc.body) ?? str(blocks.desc) ?? base?.desc ?? "",
      ctaText: str(doc.ctaLabel) ?? str(blocks.ctaText) ?? base?.ctaText ?? "Shop now",
      ctaLink: str(doc.ctaHref) ?? str(blocks.ctaLink) ?? base?.ctaLink ?? "#products",
      tag: str(blocks.tag) ?? base?.tag ?? "",
      position: str(blocks.position) ?? base?.position,
    };
    const imageSlides = imageMedia.map((item) => ({
      ...shared,
      image: item.url,
    }));
    const videoSlides = videoMedia.map((item) => ({
      ...shared,
      image: imageMedia[0]?.url ?? fallbackImage,
      video: item.url,
    }));
    const mediaSlides = [...imageSlides, ...videoSlides];

    if (mediaSlides.length) return mediaSlides;
    return fallbackImage ? [{ ...shared, image: fallbackImage }] : [];
  });
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
  image?: string;
}

export const DEFAULT_TESTIMONIALS: Testimonial[] = [
  {
    id: "testi-1",
    name: "Dr. Ananya Roy",
    city: "Bengaluru",
    rating: 5,
    title: "Softest Mul Cotton I Have Ever Worn!",
    comment: "The Gulab Bagh Anarkali is pure bliss in summer heat. Featherlight fabric, exquisite handcrafted detailing, and it arrived in Guna-packaged luxury within 3 days!",
    verified: true,
    date: "October 2026",
    product: "Gulab Bagh Anarkali Set",
    image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80",
  },
  {
    id: "testi-2",
    name: "Meera Singhania",
    city: "Mumbai",
    rating: 5,
    title: "Turned Heads at My Sister's Sangeet",
    comment: "The festive Chanderi Silk Kurti Set has the most subtle, regal sheen. Received non-stop compliments all evening. The stitching and fit are tailored to absolute perfection.",
    verified: true,
    date: "September 2026",
    product: "Chanderi Silk Festive Kurti",
    image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&q=80",
  },
  {
    id: "testi-3",
    name: "Pooja Sharma",
    city: "Bhopal",
    rating: 5,
    title: "Authentic MP Handcraft at its Finest",
    comment: "Being from MP, I know authentic handblock prints. Vani Collection in Guna is doing true justice to our traditional craft. The mul cotton feels like a gentle second skin.",
    verified: true,
    date: "October 2026",
    product: "Handblock Mul Cotton Co-ord",
    image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&q=80",
  },
  {
    id: "testi-4",
    name: "Kavita Deshmukh",
    city: "Pune",
    rating: 5,
    title: "Flawless Fit & Premium Fabric",
    comment: "I was hesitant to buy party wear online, but the measurements are 100% accurate. The fabric drape is royal and the team support was incredibly helpful over WhatsApp.",
    verified: true,
    date: "August 2026",
    product: "Zari Embroidered Party Gown",
    image: "https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=400&q=80",
  },
  {
    id: "testi-5",
    name: "Ritu Verma",
    city: "Indore",
    rating: 5,
    title: "My Go-To Boutique for Every Festival",
    comment: "Already ordered 4 suits this festive season. No color bleeding, no shrinkage, and the packaging makes you feel like royalty opening a gift.",
    verified: true,
    date: "September 2026",
    product: "Festive Angrakha Kurti Set",
    image: "", // Graceful fallback demonstration without customer photo
  },
];

/** Customer testimonials from `kind=testimonial`. */
export function toTestimonials(docs: ContentDoc[], fallback: Testimonial[]): Testimonial[] {
  if (!docs.length) return fallback;
  const rows = docs
    .map((doc, index): Testimonial | null => {
      const blocks = blocksAsObject(doc);
      const base = fallback[index];
      const name = str(blocks.name) ?? str(blocks.author) ?? str(doc.title) ?? base?.name;
      const comment = str(doc.body) ?? str(blocks.comment) ?? base?.comment;
      if (!name || !comment) return null;
      const rating = num(blocks.rating) ?? base?.rating ?? 5;
      const mediaUrl = Array.isArray(doc.media) && doc.media[0] && typeof doc.media[0] === "object" && "url" in doc.media[0]
        ? str(doc.media[0].url)
        : undefined;
      const image = str(blocks.image) ?? str(blocks.avatar) ?? str(blocks.photo) ?? mediaUrl ?? base?.image;
      return {
        id: doc.key,
        name,
        city: str(blocks.city) ?? str(blocks.location) ?? base?.city ?? "",
        // Clamp to the 1–5 the star renderer expects; a stray 50 would draw 50 stars.
        rating: Math.min(5, Math.max(1, Math.round(rating))),
        title: str(doc.title) ?? base?.title ?? "",
        comment,
        verified: bool(blocks.verified, base?.verified ?? false),
        date: str(blocks.date) ?? base?.date ?? "",
        product: str(blocks.product) ?? base?.product ?? "",
        image: image || undefined,
      };
    })
    .filter((row): row is Testimonial => row !== null);
  return rows.length ? rows : fallback;
}

/* -------------------------------------------------------------------- lookbook */

export interface LookbookPin {
  id: string;
  productId?: string;
  slug?: string;
  top: string;
  left: string;
  title: string;
  price: string;
  tag: string;
}

export interface Lookbook {
  id?: string;
  title: string;
  subtitle: string;
  image: string;
  layout?: "theater" | "banner";
  focalPosition?: string;
  pins: LookbookPin[];
}

/** The shoppable editorial images from `kind=lookbook`. Supports multiple published lookbooks! */
export function toLookbooks(docs: ContentDoc[], fallback: Lookbook[]): Lookbook[] {
  if (!docs.length) return fallback;
  const list: Lookbook[] = docs
    .map((doc, docIndex): Lookbook | null => {
      const blocks = blocksAsObject(doc);
      const base = fallback[docIndex] ?? fallback[0];
      const image = firstImage(doc) ?? str(blocks.image) ?? base?.image;
      if (!image) return null;

      // Pins may be authored as a JSON array in `blocks.pins`, or as extra media entries with alt text.
      const rawPins = Array.isArray(blocks.pins) ? (blocks.pins as unknown[]) : [];
      const pins: LookbookPin[] = rawPins
        .map((entry, index): LookbookPin | null => {
          if (!entry || typeof entry !== "object") return null;
          const pin = entry as Record<string, unknown>;
          const pinBase = base?.pins?.[index];
          const title = str(pin.title) ?? pinBase?.title;
          if (!title) return null;
          return {
            id: str(pin.id) ?? pinBase?.id ?? `pin-${index + 1}`,
            productId: str(pin.productId) ?? pinBase?.productId,
            slug: str(pin.slug) ?? pinBase?.slug,
            top: str(pin.top) ?? pinBase?.top ?? "50%",
            left: str(pin.left) ?? pinBase?.left ?? "50%",
            title,
            price: str(pin.price) ?? pinBase?.price ?? "",
            tag: str(pin.tag) ?? pinBase?.tag ?? "",
          };
        })
        .filter((pin): pin is LookbookPin => pin !== null);

      return {
        id: doc.key || `lookbook-${docIndex + 1}`,
        title: str(doc.title) ?? base?.title ?? "",
        subtitle: str(doc.subtitle) ?? base?.subtitle ?? "",
        image,
        layout: (str(blocks.layout) === "banner" ? "banner" : "theater") as "theater" | "banner",
        focalPosition: str(blocks.focalPosition) || "object-top",
        pins: pins.length ? pins : base?.pins ?? [],
      };
    })
    .filter((item): item is Lookbook => item !== null);

  return list.length ? list : fallback;
}

/** The shoppable editorial image from `kind=lookbook` (single fallback). */
export function toLookbook(docs: ContentDoc[], fallback: Lookbook): Lookbook {
  const all = toLookbooks(docs, [fallback]);
  return all[0] ?? fallback;
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
  description: string;
  image: string;
  video?: string;
  count: string;
  filterKey: string;
  ctaLabel: string;
}

/** Category story tiles from `kind=section`. Falls back to the bundled stories when absent. */
export function toCategoryStories(docs: ContentDoc[], fallback: CategoryStory[]): CategoryStory[] {
  if (!docs.length) return fallback;
  const rows = docs
    .map((doc, index): CategoryStory | null => {
      const blocks = blocksAsObject(doc);
      const base = fallback[index];
      const name = str(doc.title) ?? base?.name;
      const media = Array.isArray(doc.media) ? doc.media : [];
      const image = str(media.find((item) => item?.kind !== "video" && str(item?.url))?.url)
        ?? str(blocks.image)
        ?? base?.image;
      if (!name || !image) return null;
      return {
        id: doc.key,
        name,
        tagline: str(doc.subtitle) ?? str(blocks.tagline) ?? base?.tagline ?? "",
        description: str(doc.body) ?? str(blocks.description) ?? "",
        image,
        video: str(media.find((item) => item?.kind === "video" && str(item?.url))?.url),
        count: str(blocks.count) ?? base?.count ?? "",
        filterKey: str(blocks.filterKey) ?? base?.filterKey ?? "",
        ctaLabel: str(doc.ctaLabel) ?? "Shop this collection",
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
  lookbooks: Lookbook[];
  stories: TStories;
  founder: FounderMessage;
  faqs: FaqItem[];
  productCollection: { title?: string; subtitle?: string; productIds: string[] } | null;
  /** True when at least one published homepage block came from the CMS. */
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
  // CMS changes should show on the next homepage request after an editor publishes them.
  const response = await fetchCatalogue<{ data: ContentDoc[] }>("/api/content", 0);
  const published = Array.isArray(response?.data) ? response.data : [];
  const ofKind = (kind: ContentKind) => published.filter((item) => item.kind === kind && item.key);
  const banners = ofKind("banner");
  const testimonials = ofKind("testimonial");
  const lookbookList = ofKind("lookbook");
  const stories = ofKind("section");
  const faqs = ofKind("faq");
  const productCollections = ofKind("product_collection");

  const productCollection = productCollections[0];
  const productBlocks = productCollection?.blocks && typeof productCollection.blocks === "object" && !Array.isArray(productCollection.blocks)
    ? productCollection.blocks as Record<string, unknown>
    : {};
  const productIds = Array.isArray(productBlocks.productIds)
    ? productBlocks.productIds.filter((id): id is string => typeof id === "string")
    : [];

  return {
    founder: toFounderMessage(published.find((item) => item.key === FOUNDER_KEY)),
    banners: toHeroSlides(banners, fallbacks.banners),
    testimonials: toTestimonials(testimonials, fallbacks.testimonials),
    lookbook: toLookbook(lookbookList, fallbacks.lookbook),
    lookbooks: toLookbooks(lookbookList, [fallbacks.lookbook]),
    stories: toCategoryStories(stories, fallbacks.stories),
    faqs: toFaqItems(faqs),
    productCollection: productCollection ? {
      title: str(productCollection.title),
      subtitle: str(productCollection.subtitle),
      productIds,
    } : null,
    fromCms: Boolean(published.some((item) => item.key === FOUNDER_KEY) || banners.length || testimonials.length || lookbookList.length || stories.length || faqs.length || productCollection),
  };
}

export async function fetchManagedPage(key: string): Promise<ContentDoc | null> {
  const document = await fetchContentByKey(`page.${key}`);
  return document?.kind === "page" ? document : null;
}

export async function fetchPublishedReels(): Promise<PublishedReel[]> {
  const response = await fetchCatalogue<{ data: PublishedReel[] }>("/api/reels", 30);
  return Array.isArray(response?.data) ? response.data : [];
}

export function managedPageMetadata(document: ContentDoc | null, fallback: Metadata, slug?: string): Metadata {
  const blocks = document ? blocksAsObject(document) : {};
  const title = str(blocks.seoTitle) ?? str(document?.title);
  const description = str(blocks.seoDescription);
  const resolvedTitle = title || (fallback.title as string) || SITE_NAME;
  const resolvedDesc = description || (fallback.description as string) || "";
  const canonical = slug ? absoluteUrl(`/${slug.replace(/^\//, "")}`) : undefined;
  return {
    ...fallback,
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
    ...(canonical ? {
      alternates: { canonical },
      openGraph: {
        type: "website",
        url: canonical,
        siteName: SITE_NAME,
        title: resolvedTitle,
        description: resolvedDesc,
        locale: SITE_LOCALE,
      },
      twitter: {
        card: "summary_large_image",
        title: resolvedTitle,
        description: resolvedDesc,
      },
    } : {}),
  };
}
