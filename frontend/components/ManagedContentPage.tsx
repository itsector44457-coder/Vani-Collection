import Link from "next/link";
import type { ContentDoc } from "@/lib/content";
import BreadcrumbSchema from "@/components/seo/breadcrumb-schema";

export default function ManagedContentPage({
  document,
  breadcrumb,
  slug,
}: {
  document: ContentDoc;
  breadcrumb: string;
  slug?: string;
}) {
  const path = slug ? `/${slug.replace(/^\//, "")}` : "/";
  const blocks = document.blocks && typeof document.blocks === "object" && !Array.isArray(document.blocks)
    ? document.blocks as Record<string, unknown>
    : {};
  const sections = Array.isArray(blocks.sections)
    ? blocks.sections.filter((section): section is { heading: string; body: string } =>
      Boolean(section && typeof section === "object" && typeof (section as { heading?: unknown }).heading === "string" && typeof (section as { body?: unknown }).body === "string"))
    : [];
  const image = document.media?.[0];

  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: "Home", path: "/" },
          { name: breadcrumb, path },
        ]}
      />
      <main className="min-h-screen bg-[#faf7f2]">
      <header className="bg-gradient-to-br from-[#1c1917] via-[#3d2012] to-[#881337] px-4 py-16 text-white">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="mb-4 font-serif text-4xl font-light sm:text-5xl">{document.title}</h1>
          {document.subtitle && <p className="mx-auto max-w-2xl text-sm text-white/70">{document.subtitle}</p>}
          <nav aria-label="Breadcrumb" className="mt-6 flex items-center justify-center gap-2 text-xs text-white/60">
            <Link href="/" className="transition hover:text-white">Home</Link>
            <span>/</span>
            <span className="text-white/85">{breadcrumb}</span>
          </nav>
        </div>
      </header>
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        {image?.kind === "video" ? (
          <video src={image.url} controls playsInline className="mb-6 max-h-[420px] w-full rounded-xl object-cover" />
        ) : image && (
          // CMS media may be hosted on any merchant-provided HTTPS domain.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image.url}
            alt={image.alt || document.title || ""}
            className="mb-6 max-h-[420px] w-full rounded-xl object-cover"
          />
        )}
        <article className="space-y-8 rounded-xl border border-[#e8dfd5] bg-white p-8 shadow-sm md:p-12">
          {document.body && <p className="whitespace-pre-line text-sm leading-7 text-stone-600">{document.body}</p>}
          {sections.map((section, index) => (
            <section key={`${section.heading}-${index}`} className="border-t border-stone-100 pt-6 first:border-0 first:pt-0">
              <h2 className="mb-3 font-serif text-2xl text-[#881337]">{section.heading}</h2>
              <p className="whitespace-pre-line text-sm leading-7 text-stone-600">{section.body}</p>
            </section>
          ))}
        </article>
      </div>
    </main>
    </>
  );
}
