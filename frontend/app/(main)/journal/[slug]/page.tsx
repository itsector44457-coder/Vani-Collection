import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import JournalBody from "@/components/JournalBody";
import { JsonLdGroup } from "@/components/seo/json-ld";
import { articleSchema, breadcrumbSchema } from "@/components/seo/schema";
import { fetchJournalArticle, fetchJournalArticles, journalReadingMinutes } from "@/lib/content";
import { absoluteUrl, SITE_NAME, truncate } from "@/lib/seo";
import { whatsappShareUrl } from "@/lib/site-contact";

type Props = { params: Promise<{ slug: string }> };

export const revalidate = 300;

export async function generateStaticParams() {
  const articles = await fetchJournalArticles().catch(() => []);
  return articles.map((article) => ({ slug: article.slug }));
}

const formatDate = (value: string): string => {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "long", year: "numeric" }).format(date);
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = await fetchJournalArticle(slug).catch(() => null);
  if (!article) {
    return {
      title: { absolute: `Journal | ${SITE_NAME}` },
      robots: { index: false, follow: true },
    };
  }
  const title = article.seoTitle || `${article.title} | The demo Journal`;
  const description = truncate(article.seoDescription || article.excerpt || article.body, 158);
  const canonical = absoluteUrl(`/journal/${article.slug}`);

  return {
    title: { absolute: title },
    description,
    keywords: article.tags.length ? article.tags : undefined,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "article",
      publishedTime: article.publishedAt || undefined,
      modifiedTime: article.updatedAt || undefined,
      authors: [article.author],
      section: article.category,
      tags: article.tags,
      ...(article.coverImage ? { images: [{ url: article.coverImage, alt: article.coverAlt }] } : {}),
    },
    twitter: { title, description },
  };
}

export default async function JournalArticlePage({ params }: Props) {
  const { slug } = await params;
  const [article, articles] = await Promise.all([
    fetchJournalArticle(slug).catch(() => null),
    fetchJournalArticles().catch(() => []),
  ]);
  if (!article) notFound();

  const related = articles
    .filter((entry) => entry.slug !== article.slug)
    .sort((a, b) => Number(b.category === article.category) - Number(a.category === article.category))
    .slice(0, 3);
  const articleUrl = absoluteUrl(`/journal/${article.slug}`);
  const shareText = encodeURIComponent(`${article.title} — The demo Journal`);

  return (
    <div className="bg-[#fbf7f1]">
      <JsonLdGroup
        items={[
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Journal", path: "/journal" },
            { name: article.title, path: `/journal/${article.slug}` },
          ]),
          articleSchema({
            title: article.title,
            description: truncate(article.seoDescription || article.excerpt || article.body, 300),
            slug: article.slug,
            image: article.coverImage,
            author: article.author,
            category: article.category,
            tags: article.tags,
            datePublished: article.publishedAt,
            dateModified: article.updatedAt,
          }),
        ]}
      />

      <article className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-xs text-stone-500 sm:text-sm">
          <Link href="/" className="hover:underline">Home</Link>
          <span aria-hidden="true">›</span>
          <Link href="/journal" className="hover:underline">Journal</Link>
          <span aria-hidden="true">›</span>
          <span aria-current="page" className="max-w-56 truncate font-medium text-[#781e36] sm:max-w-md">{article.title}</span>
        </nav>

        <p className="mt-8 text-xs font-bold uppercase tracking-[0.2em] text-[#9a6b3f]">{article.category}</p>
        <h1 className="mt-3 font-serif text-4xl leading-tight text-stone-900 sm:text-5xl">{article.title}</h1>
        {article.excerpt && <p className="mt-4 text-base leading-relaxed text-stone-600 sm:text-lg">{article.excerpt}</p>}

        <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 border-y border-stone-200 py-4 text-sm text-stone-600">
          <span>By <strong className="font-semibold text-stone-800">{article.author}</strong></span>
          {article.publishedAt && (
            <span>Published <time dateTime={article.publishedAt}>{formatDate(article.publishedAt)}</time></span>
          )}
          {article.updatedAt && article.updatedAt !== article.publishedAt && (
            <span>Updated <time dateTime={article.updatedAt}>{formatDate(article.updatedAt)}</time></span>
          )}
          <span>{journalReadingMinutes(article.body)} min read</span>
        </div>

        {article.coverImage && (
          <figure className="relative mt-8 aspect-[16/9] overflow-hidden rounded-3xl bg-[#f4e4de]">
            <Image src={article.coverImage} alt={article.coverAlt} fill unoptimized priority sizes="(max-width: 896px) 100vw, 896px" className="object-cover" />
          </figure>
        )}

        <div className="mt-10">
          <JournalBody body={article.body} />
        </div>

        {article.tags.length > 0 && (
          <div className="mt-10 flex flex-wrap gap-2" aria-label="Article topics">
            {article.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-[#f4e4de] px-3 py-1.5 text-xs font-semibold text-[#781e36]">#{tag}</span>
            ))}
          </div>
        )}

        <div className="mt-10 flex flex-wrap items-center gap-3 rounded-3xl bg-white p-5 ring-1 ring-stone-200/70">
          <p className="text-sm font-semibold text-stone-800">Found this useful?</p>
          <div className="flex flex-wrap gap-2">
            <a href={whatsappShareUrl(`${decodeURIComponent(shareText)} ${articleUrl}`)} target="_blank" rel="noopener noreferrer" aria-label="Share this article on WhatsApp" className="inline-flex min-h-11 items-center rounded-full bg-[#1f7a3d] px-4 text-sm font-semibold text-white transition hover:bg-[#176431]">WhatsApp</a>
            <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(articleUrl)}`} target="_blank" rel="noopener noreferrer" aria-label="Share this article on Facebook" className="inline-flex min-h-11 items-center rounded-full border border-stone-300 px-4 text-sm font-semibold text-stone-700 transition hover:border-[#781e36] hover:text-[#781e36]">Facebook</a>
            <a href={`https://pinterest.com/pin/create/button/?url=${encodeURIComponent(articleUrl)}&description=${shareText}`} target="_blank" rel="noopener noreferrer" aria-label="Save this article on Pinterest" className="inline-flex min-h-11 items-center rounded-full border border-stone-300 px-4 text-sm font-semibold text-stone-700 transition hover:border-[#781e36] hover:text-[#781e36]">Pinterest</a>
          </div>
          <Link href="/collections" className="ml-auto inline-flex min-h-11 items-center rounded-full bg-[#781e36] px-4 text-sm font-semibold text-white transition hover:bg-[#64182c]">
            Shop the collections <span aria-hidden="true" className="ml-2">→</span>
          </Link>
        </div>
      </article>

      {related.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8" aria-labelledby="related-articles-heading">
          <h2 id="related-articles-heading" className="font-serif text-2xl text-stone-900 sm:text-3xl">More from the Journal</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((entry) => (
              <article key={entry.key} className="flex flex-col overflow-hidden rounded-3xl bg-white shadow-2xs ring-1 ring-stone-200/70">
                <Link href={`/journal/${entry.slug}`} aria-hidden="true" tabIndex={-1} className="relative block aspect-[4/3] bg-[#f4e4de]">
                  {entry.coverImage && <Image src={entry.coverImage} alt="" fill unoptimized sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-cover" />}
                </Link>
                <div className="flex flex-1 flex-col p-5">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#9a6b3f]">{entry.category}</p>
                  <h3 className="mt-2 font-serif text-xl leading-snug text-stone-900">
                    <Link href={`/journal/${entry.slug}`} className="transition hover:text-[#781e36]">{entry.title}</Link>
                  </h3>
                  <p className="mt-auto pt-4 text-xs text-stone-500">{journalReadingMinutes(entry.body)} min read</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
