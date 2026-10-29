import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { JsonLdGroup } from "@/components/seo/json-ld";
import { breadcrumbSchema } from "@/components/seo/schema";
import { fetchJournalArticles, journalReadingMinutes } from "@/lib/content";
import { absoluteUrl, SITE_NAME, truncate } from "@/lib/seo";

export const revalidate = 300;

const DESCRIPTION = "Fabric guides, sizing help, care tips and stories from our Demo atelier — the demo Journal helps you choose Indian ethnic wear that fits your day, not just the photo.";

export const metadata: Metadata = {
  title: { absolute: `The demo Journal — Fabric, Fit & Care Guides | ${SITE_NAME}` },
  description: DESCRIPTION,
  keywords: ["mul cotton guide", "kurta set size guide India", "Indian ethnic wear blog", "handblock print care", "Demo Collection journal"],
  alternates: { canonical: absoluteUrl("/journal") },
  openGraph: {
    title: `The demo Journal | ${SITE_NAME}`,
    description: DESCRIPTION,
    url: absoluteUrl("/journal"),
    type: "website",
  },
  twitter: { title: `The demo Journal | ${SITE_NAME}`, description: DESCRIPTION },
};

const formatDate = (value: string): string => {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(date);
};

export default async function JournalPage() {
  const articles = [...(await fetchJournalArticles().catch(() => []))].sort((a, b) => {
    const byDate = new Date(b.publishedAt || b.updatedAt).getTime() - new Date(a.publishedAt || a.updatedAt).getTime();
    return Number.isNaN(byDate) || byDate === 0 ? a.position - b.position : byDate;
  });
  const [featured, ...rest] = articles;

  return (
    <div className="bg-[#fbf7f1]">
      <JsonLdGroup
        items={[
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Journal", path: "/journal" },
          ]),
          {
            "@type": "Blog",
            "@id": `${absoluteUrl("/journal")}#blog`,
            url: absoluteUrl("/journal"),
            name: "The demo Journal",
            description: DESCRIPTION,
            blogPost: articles.slice(0, 30).map((article) => ({
              "@type": "BlogPosting",
              headline: article.title,
              url: absoluteUrl(`/journal/${article.slug}`),
              datePublished: article.publishedAt || undefined,
            })),
          },
        ]}
      />

      <section className="bg-gradient-to-b from-[#f7e9e3] to-[#fbf7f1]">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-stone-500 sm:text-sm">
            <Link href="/" className="hover:underline">Home</Link>
            <span aria-hidden="true">›</span>
            <span aria-current="page" className="font-medium text-[#781e36]">Journal</span>
          </nav>
          <h1 className="mt-5 font-serif text-4xl text-stone-900 sm:text-5xl">The demo Journal</h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-stone-600 sm:text-base">{DESCRIPTION}</p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8" aria-label="Journal articles">
        {!articles.length ? (
          <div className="rounded-3xl border border-dashed border-stone-300 bg-white px-6 py-14 text-center">
            <p className="font-serif text-2xl text-stone-900">Our first stories are being stitched together</p>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-stone-600">
              Fabric guides, honest sizing help and care tips from our atelier — coming soon. Till then, the Size Guide and our collections are a good place to start.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link href="/size-guide" className="inline-flex min-h-11 items-center rounded-full border border-[#781e36] px-5 text-sm font-semibold text-[#781e36] transition hover:bg-[#781e36] hover:text-white">Read the Size Guide</Link>
              <Link href="/collections" className="inline-flex min-h-11 items-center rounded-full bg-[#781e36] px-5 text-sm font-semibold text-white transition hover:bg-[#64182c]">Explore collections</Link>
            </div>
          </div>
        ) : (
          <>
            {featured && (
              <article className="grid overflow-hidden rounded-3xl bg-white shadow-2xs ring-1 ring-stone-200/70 lg:grid-cols-2">
                <Link href={`/journal/${featured.slug}`} aria-hidden="true" tabIndex={-1} className="relative block min-h-64 bg-[#f4e4de]">
                  {featured.coverImage && <Image src={featured.coverImage} alt="" fill unoptimized priority sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" />}
                </Link>
                <div className="flex flex-col justify-center p-6 sm:p-10">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#9a6b3f]">{featured.category}</p>
                  <h2 className="mt-3 font-serif text-3xl leading-tight text-stone-900">
                    <Link href={`/journal/${featured.slug}`} className="transition hover:text-[#781e36]">{featured.title}</Link>
                  </h2>
                  {featured.excerpt && <p className="mt-3 text-sm leading-relaxed text-stone-600 sm:text-base">{featured.excerpt}</p>}
                  <p className="mt-4 text-xs text-stone-500">
                    By {featured.author}{formatDate(featured.publishedAt) ? ` · ${formatDate(featured.publishedAt)}` : ""} · {journalReadingMinutes(featured.body)} min read
                  </p>
                  <Link href={`/journal/${featured.slug}`} className="mt-5 inline-flex min-h-11 w-fit items-center rounded-full bg-[#781e36] px-5 text-sm font-semibold text-white transition hover:bg-[#64182c]">
                    Read article <span aria-hidden="true" className="ml-2">→</span>
                  </Link>
                </div>
              </article>
            )}

            {rest.length > 0 && (
              <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {rest.map((article) => (
                  <article key={article.key} className="flex flex-col overflow-hidden rounded-3xl bg-white shadow-2xs ring-1 ring-stone-200/70">
                    <Link href={`/journal/${article.slug}`} aria-hidden="true" tabIndex={-1} className="relative block aspect-[4/3] bg-[#f4e4de]">
                      {article.coverImage && <Image src={article.coverImage} alt="" fill unoptimized sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-cover" />}
                    </Link>
                    <div className="flex flex-1 flex-col p-5">
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#9a6b3f]">{article.category}</p>
                      <h2 className="mt-2 font-serif text-xl leading-snug text-stone-900">
                        <Link href={`/journal/${article.slug}`} className="transition hover:text-[#781e36]">{article.title}</Link>
                      </h2>
                      {article.excerpt && <p className="mt-2 text-sm leading-relaxed text-stone-600">{truncate(article.excerpt, 140)}</p>}
                      <p className="mt-auto pt-4 text-xs text-stone-500">
                        {formatDate(article.publishedAt) ? `${formatDate(article.publishedAt)} · ` : ""}{journalReadingMinutes(article.body)} min read
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
