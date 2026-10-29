import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLdGroup } from "@/components/seo/json-ld";
import { breadcrumbSchema, collectionPageSchema, faqSchema } from "@/components/seo/schema";
import CategoryProductGrid from "@/components/CategoryProductGrid";
import { CATEGORIES, categoryLabel, categoryUrl, fetchSeoCategories, fetchSeoCategoryBySlug, truncate, type SeoCategory } from "@/lib/seo";
import { getCategoryGuide } from "@/lib/category-guides";
import { fetchServerProducts } from "@/lib/server-catalogue";

type Props = { params: Promise<{ slug: string }> };

export const revalidate = 300;

export async function generateStaticParams() {
  const categories = await fetchSeoCategories().catch(() => [] as SeoCategory[]);
  const slugs = new Set<string>([...CATEGORIES.map((category) => category.key), ...categories.map((category) => category.slug)]);
  return [...slugs].filter(Boolean).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = await fetchSeoCategoryBySlug(slug).catch(() => null);
  const label = category?.name || categoryLabel(slug);
  const guide = getCategoryGuide(category, slug, label);
  const title = category?.seo?.title || `${label} for Women — Buy Online in India | Demo Collection`;
  const description = truncate(category?.seo?.description || guide.intro, 158);
  const canonical = categoryUrl(slug);

  return {
    title: { absolute: title },
    description,
    keywords: [`${label} online India`, `buy ${label}`, `${label} for women`, "ethnic wear online India", "Demo Collection"],
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "website",
      ...(category?.bannerImage ? { images: [{ url: category.bannerImage }] } : {}),
    },
    twitter: { title, description },
  };
}

export default async function CategoryLandingPage({ params }: Props) {
  const { slug } = await params;
  const [category, categories, catalogue] = await Promise.all([
    fetchSeoCategoryBySlug(slug).catch(() => null),
    fetchSeoCategories().catch(() => [] as SeoCategory[]),
    fetchServerProducts({ category: slug, limit: 24 }),
  ]);

  const products = catalogue?.products ?? [];
  const knownFallback = CATEGORIES.find((entry) => entry.key === slug);
  // A slug that neither the live category list nor the storefront fallback knows is a real 404.
  if (!category && !knownFallback && categories.length > 0) notFound();
  if (!category && !knownFallback && categories.length === 0) notFound();

  const label = category?.name || knownFallback?.label || categoryLabel(slug);
  const guide = getCategoryGuide(category, slug, label);
  const related = (categories.length ? categories : CATEGORIES.map((entry) => ({ name: entry.label, slug: entry.key } as SeoCategory)))
    .filter((entry) => entry.slug && entry.slug !== slug)
    .slice(0, 6);

  return (
    <div className="bg-[#fbf7f1]">
      <JsonLdGroup
        items={[
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Collections", path: "/collections" },
            { name: label, path: `/collections/${slug}` },
          ]),
          collectionPageSchema(
            `${label} Collection`,
            guide.intro,
            `/collections/${slug}`,
            products.map((product) => product.title),
            products.filter((product) => product.slug).map((product) => ({ name: product.title, slug: product.slug as string }))
          ),
          faqSchema(guide.faqs),
        ]}
      />

      {/* Hero */}
      <section className="relative overflow-hidden">
        {category?.bannerImage && (
          <Image src={category.bannerImage} alt="" fill unoptimized priority className="object-cover" sizes="100vw" />
        )}
        <div className={category?.bannerImage ? "relative bg-gradient-to-r from-[#2b1118]/85 via-[#2b1118]/60 to-transparent" : "relative bg-gradient-to-b from-[#f7e9e3] via-[#fbf7f1] to-[#fbf7f1]"}>
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
            <nav aria-label="Breadcrumb" className={`flex flex-wrap items-center gap-1.5 text-xs sm:text-sm ${category?.bannerImage ? "text-white/80" : "text-stone-500"}`}>
              <Link href="/" className="hover:underline">Home</Link>
              <span aria-hidden="true">›</span>
              <Link href="/collections" className="hover:underline">Collections</Link>
              <span aria-hidden="true">›</span>
              <span aria-current="page" className={`font-medium ${category?.bannerImage ? "text-white" : "text-[#781e36]"}`}>{label}</span>
            </nav>
            <h1 className={`mt-5 max-w-3xl font-serif text-4xl leading-tight sm:text-5xl ${category?.bannerImage ? "text-white" : "text-stone-900"}`}>
              {label} Collection
            </h1>
            <p className={`mt-4 max-w-2xl text-sm leading-relaxed sm:text-base ${category?.bannerImage ? "text-white/90" : "text-stone-600"}`}>{guide.intro}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              {guide.highlights.map((highlight) => (
                <span key={highlight} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${category?.bannerImage ? "bg-white/15 text-white ring-1 ring-white/30" : "bg-[#f4e4de] text-[#781e36]"}`}>
                  <span aria-hidden="true">✦</span> {highlight}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Products */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8" aria-labelledby="category-products-heading">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <h2 id="category-products-heading" className="font-serif text-2xl text-stone-900 sm:text-3xl">Shop {label}</h2>
          {products.length > 0 && <p className="text-sm text-stone-500">Showing {products.length} latest pieces</p>}
        </div>
        <CategoryProductGrid products={products} categorySlug={slug} categoryLabel={label} />
      </section>

      {/* Buying guide */}
      <section className="mx-auto max-w-7xl px-4 pb-4 sm:px-6 lg:px-8" aria-labelledby="category-guide-heading">
        <div className="grid gap-8 rounded-3xl bg-white p-6 shadow-2xs ring-1 ring-stone-200/70 sm:p-10 lg:grid-cols-[1.6fr_1fr]">
          <div>
            <h2 id="category-guide-heading" className="font-serif text-2xl text-stone-900 sm:text-3xl">How to choose your {label}</h2>
            <div className="mt-4 space-y-4 text-sm leading-relaxed text-stone-600 sm:text-[15px]">
              {guide.paragraphs.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
          </div>
          <aside className="space-y-6">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[#781e36]"><span aria-hidden="true">❧</span> Fabric care</h3>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-stone-600">
                {guide.careTips.map((tip) => (
                  <li key={tip}>{tip}</li>
                ))}
              </ul>
            </div>
            <div className="space-y-3 rounded-2xl bg-[#fdf3ee] p-4 text-sm text-stone-700">
              <p className="flex items-start gap-2"><span aria-hidden="true" className="text-[#781e36]">◆</span> Delivery across India with Cash on Delivery — check your pin code on any product page.</p>
              <p className="flex items-start gap-2"><span aria-hidden="true" className="text-[#781e36]">◆</span> Easy returns &amp; size exchange as per our policy, with WhatsApp support from our team.</p>
            </div>
          </aside>
        </div>
      </section>

      {/* FAQs */}
      <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6" aria-labelledby="category-faq-heading">
        <h2 id="category-faq-heading" className="text-center font-serif text-2xl text-stone-900 sm:text-3xl">{label} — common questions</h2>
        <div className="mt-6 divide-y divide-stone-200 rounded-3xl bg-white ring-1 ring-stone-200/70">
          {guide.faqs.map((faq) => (
            <details key={faq.question} className="group p-5 sm:p-6">
              <summary className="min-h-11 cursor-pointer list-none text-[15px] font-semibold text-stone-900 [&::-webkit-details-marker]:hidden">
                {faq.question}
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-stone-600">{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Related categories */}
      {related.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8" aria-labelledby="related-categories-heading">
          <h2 id="related-categories-heading" className="font-serif text-2xl text-stone-900">More collections to explore</h2>
          <div className="mt-5 flex flex-wrap gap-2.5">
            {related.map((entry) => (
              <Link
                key={entry.slug}
                href={`/collections/${entry.slug}`}
                className="inline-flex min-h-11 items-center rounded-full bg-white px-4 text-sm font-semibold text-stone-800 ring-1 ring-stone-200 transition hover:ring-[#781e36] hover:text-[#781e36]"
              >
                {entry.name}
              </Link>
            ))}
            <Link href="/products" className="inline-flex min-h-11 items-center rounded-full bg-[#781e36] px-4 text-sm font-semibold text-white transition hover:bg-[#64182c]">
              Shop everything
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
