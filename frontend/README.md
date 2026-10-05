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
