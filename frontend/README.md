# Vani Collection — Storefront (Next.js 16)

> **Status:** the shopping experience is still the presentation demo (bundled product data, simulated
> cart/checkout). The **real backend lives in [`../backend`](../backend)** — commerce APIs, admin APIs,
> payments, shipping and the Rishabh (Ujjain) ERP integration.

## Connecting to the backend

```bash
cp .env.example .env.local     # set NEXT_PUBLIC_API_URL=http://localhost:5000
npm run dev                    # http://localhost:3000  ·  admin console at /admin
```

- With `NEXT_PUBLIC_API_URL` set, the **admin console** (`/admin`) reads live dashboard metrics,
  orders, catalogue/inventory and customers from the backend and shows a `Live API` badge.
  Every panel falls back to demo data with a `Demo data` badge when the API is unreachable.
- Staff sign in at `/admin/login` (accounts are created with `npm run seed:admin` in the backend).
- `lib/api-client.ts` is the single API entry point; `lib/use-api.ts` provides the loading/fallback
  behaviour. Use them when wiring the storefront to the same API.
- Roles enforced by the backend: support, warehouse, catalog_manager, finance, admin, super_admin.

## SEO

Everything a crawler reads is generated server-side from the live catalogue, and **degrades rather
than guesses** when the backend is unreachable.

| Path | What it produces |
| --- | --- |
| `app/sitemap.ts` | Static pages + one entry per category + every active product, with real `lastmod`, `changefreq`, `priority` and image entries. Regenerates hourly (`revalidate = 3600`). |
| `app/robots.ts` | Storefront allowed; `/admin`, `/account`, `/checkout`, `/api`, `/order-confirmation` and the auth routes disallowed; points at the sitemap. |
| `app/opengraph-image.tsx` | Branded 1200×630 site card. |
| `app/product/[slug]/opengraph-image.tsx` | Per-product card with the real photo, price and discount, cached for an hour. |
| `components/seo/` | `SiteSchema` (Organization + WebSite/SearchAction), `ProductSchema` (ItemPage + BreadcrumbList + Product/Offer), `BreadcrumbSchema`, `FaqSchema`, plus the pure builders in `schema.ts` and the `<JsonLd>` primitive. |
| `lib/seo.ts` | Canonical origin, taxonomy, the catalogue fetchers and the price/availability helpers. |

`generateMetadata` lives on `app/product/[slug]/page.tsx` and `app/products/page.tsx`. Both were
`"use client"`, which cannot export metadata, so the interactive body of each moved to
`product-view.tsx` / `products-view.tsx` and the `page.tsx` files are now thin Server Components.
The same split applies to `app/admin/` and `app/account/`, whose layouts are `noindex, nofollow`.

Two rules worth knowing before editing this:

- **Never set `alternates.canonical` in a layout.** It is inherited by every route that does not
  declare its own, which silently marks private pages as duplicates of the homepage. Each indexable
  page sets its canonical itself.
- **Never set `openGraph.images` where an `opengraph-image.tsx` exists.** The explicit value wins and
  replaces the generated card (and its `:width`/`:height`/`:alt` tags) with a raw photo of unknown
  aspect ratio.

`Product` structured data is emitted only when the catalogue actually returned the product, and
`availability` only when `GET /api/products/:slug` reported real inventory for that SKU. A product
with no inventory rows gets an Offer with **no** `availability` — forfeiting the rich result beats
asserting stock nobody verified. `priceValidUntil` is derived from the product's own `updatedAt` so
the value is stable across crawls instead of moving on every request.

Set `NEXT_PUBLIC_SITE_URL` (see `.env.example`) before deploying: canonicals, the sitemap and all
JSON-LD are absolute URLs built from it.

## Homepage CMS

The hero banners, customer testimonials, shoppable lookbook, category stories and FAQ are editable
content blocks (`/admin/content` → `PUT /api/content/:key`). `lib/content.ts` maps the loosely-shaped
Content documents onto the exact structures the homepage renders, so wiring the CMS up did not mean
redesigning anything.

`app/(main)/page.tsx` is a Server Component: it fetches all five kinds in one pass, mounts the
`FAQPage` JSON-LD and declares the homepage canonical. The interactive body lives in
`app/(main)/home-view.tsx` and takes the content as props, each defaulting to the bundled copy in
`data/products.ts`.

The fallback contract is **per kind and per field**, not all-or-nothing:

- No backend, or an empty `contents` collection → the site renders exactly as it did before the CMS
  existed. `data-content-source="bundled"` on the root element says so.
- Banners published but no testimonials → live banners over bundled reviews.
- An editor sets only a new headline → the bundled image and CTA for that position are kept.
- A block missing what its section cannot render without (a banner with no image, a FAQ with a
  question but no answer) is dropped rather than half-rendered.
- `draft` blocks never reach the storefront — the API filters on `status: "published"`.

The FAQ accordion and its `FAQPage` markup are driven by the same array, so nothing is ever marked up
that a reader cannot see. When no FAQ is published, the section *and* the JSON-LD are both absent.

## Wishlist sync

On sign-in the guest wishlist in `localStorage` is merged into the server list. See the backend's
`docs/API.md` → "Wishlist shape and idempotence" for the guarantees; the frontend side matters here:

- `mergeWishlist()` sends the whole guest list in **one** request instead of a burst of concurrent
  per-item PUTs. The backend de-duplicates by `productId`, so signing in repeatedly cannot grow it.
- The device copy is pruned **only after** the merge succeeds. Pruning unconditionally (the old
  behaviour) meant a backend outage during sign-in deleted the guest's saved items with no copy
  anywhere left — permanent loss.
- `fetchWishlist()` coerces ids to strings defensively, so a shape regression on either side degrades
  instead of writing `"[object Object]"` into `localStorage`.

---

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

Fonts are declared locally in `app/globals.css` (system serif/sans stacks) so the build never depends
on Google Fonts network access.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
