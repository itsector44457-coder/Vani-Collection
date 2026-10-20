"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Alert,
  Badge,
  ButtonGhost,
  ButtonPrimary,
  Card,
  EmptyState,
  FilterTabs,
  PageHeading,
  ProgressBar,
  StatCard,
  TextInput,
  type BadgeTone,
} from "@/lib/admin-ui";
import {
  api,
  isApiConfigured,
  type AdminCatalogueProduct,
  type ContentDoc,
  type StoreCategory,
} from "@/lib/api-client";
import { useApiResource } from "@/lib/use-api";
import { STORE_PHONE_DISPLAY, STORE_PHONE_IS_PLACEHOLDER } from "@/lib/site-contact";

type Area = "Products" | "Categories" | "Journal" | "Homepage reviews";
type Severity = "high" | "medium" | "low";
type AreaFilter = "all" | Area;
type SeverityFilter = "all" | Severity;

const AREAS: Area[] = ["Products", "Categories", "Journal", "Homepage reviews"];

interface SeoIssue {
  area: Area;
  severity: Severity;
  item: string;
  problem: string;
  fix: string;
  href: string;
}

const severityTone = (severity: Severity): BadgeTone => severity === "high" ? "danger" : severity === "medium" ? "warning" : "info";
const wordCount = (value: string): number => value.split(/\s+/).filter(Boolean).length;
const asObject = (value: ContentDoc["blocks"]): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
const text = (value: unknown): string => (typeof value === "string" ? value : "");

async function loadAllProducts(signal: AbortSignal): Promise<AdminCatalogueProduct[]> {
  const first = await api.catalogue({ limit: 100, page: 1 }, signal);
  const pages = Math.min(first.meta?.pages ?? 1, 20);
  const rest: AdminCatalogueProduct[][] = [];
  for (let page = 2; page <= pages; page += 1) {
    const result = await api.catalogue({ limit: 100, page }, signal);
    rest.push(result.data);
  }
  return [...first.data, ...rest.flat()];
}

export default function AdminSeoPage() {
  const resource = useApiResource(
    async (signal) => {
      const [loadedProducts, loadedCategories, loadedContent] = await Promise.all([
        loadAllProducts(signal),
        api.managedCategories(signal),
        api.managedContent(signal),
      ]);
      return { products: loadedProducts, categories: loadedCategories.data, content: loadedContent.data };
    },
    { products: [] as AdminCatalogueProduct[], categories: [] as StoreCategory[], content: [] as ContentDoc[] }
  );
  const { products, categories, content } = resource.data;
  const loading = resource.loading;
  const error = resource.source === "unavailable" ? resource.error : null;
  const refresh = resource.refresh;
  const [area, setArea] = useState<AreaFilter>("all");
  const [severity, setSeverity] = useState<SeverityFilter>("all");
  const [search, setSearch] = useState("");

  const analysis = useMemo(() => {
    const issues: SeoIssue[] = [];
    let passed = 0;
    let total = 0;
    const areaStats = new Map<Area, { passed: number; total: number }>(AREAS.map((name) => [name, { passed: 0, total: 0 }]));
    const check = (condition: boolean, issue: SeoIssue) => {
      total += 1;
      const stats = areaStats.get(issue.area);
      if (stats) stats.total += 1;
      if (condition) {
        passed += 1;
        if (stats) stats.passed += 1;
      } else {
        issues.push(issue);
      }
    };

    const activeCategories = categories.filter((category) => category.isActive);
    const activeCategorySlugs = new Set(activeCategories.map((category) => category.slug));
    const activeProducts = products.filter((product) => product.status === "active");

    const slugCounts = new Map<string, number>();
    const titleCounts = new Map<string, number>();
    for (const product of activeProducts) {
      if (product.slug) slugCounts.set(product.slug, (slugCounts.get(product.slug) ?? 0) + 1);
      const title = product.name.trim().toLowerCase();
      if (title) titleCounts.set(title, (titleCounts.get(title) ?? 0) + 1);
    }

    for (const product of activeProducts) {
      const href = `/admin/products/${product._id}/edit`;
      const description = `${product.shortDescription || ""} ${product.description || ""}`.trim();
      const images = product.images ?? [];
      const prices = product.variants.map((variant) => variant.price).filter((price) => Number.isFinite(price));
      check(description.length >= 120, { area: "Products", severity: "high", item: product.name, problem: `Description bahut chhota hai (${description.length} characters).`, fix: "Fabric, fit, set me kya milega aur care — kam se kam 2–3 line likhe.", href });
      check(images.length > 0, { area: "Products", severity: "high", item: product.name, problem: "Product photo nahi hai.", fix: "Kam se kam ek saaf front photo jode.", href });
      check(images.length > 0 && images.every((image) => image.alt?.trim()), { area: "Products", severity: "medium", item: product.name, problem: "Kuch photos ki description (alt text) khaali hai.", fix: "Har photo ko 4–8 shabdon me describe kare — Google Images aur screen readers ke liye.", href });
      check(Boolean(product.slug && product.slug.length <= 70 && (slugCounts.get(product.slug) ?? 0) === 1), { area: "Products", severity: "high", item: product.name, problem: !product.slug ? "URL slug missing hai." : (slugCounts.get(product.slug) ?? 0) > 1 ? "Yahi URL slug doosre product par bhi hai." : "URL slug 70 characters se lamba hai.", fix: "Chhota, unique slug rakhe. Slug badalne par purana URL auto-redirect ho jata hai.", href });
      check(product.name.trim().length <= 70 && (titleCounts.get(product.name.trim().toLowerCase()) ?? 0) === 1, { area: "Products", severity: "medium", item: product.name, problem: (titleCounts.get(product.name.trim().toLowerCase()) ?? 0) > 1 ? "Bilkul yahi naam doosre product ka bhi hai." : "Product naam 70 characters se lamba hai.", fix: "Rang/fabric jodkar naam alag aur chhota rakhe.", href });
      check(activeCategorySlugs.has(product.category), { area: "Products", severity: "high", item: product.name, problem: `Category “${product.category || "—"}” active categories me nahi hai.`, fix: "Product ko sahi active category me rakhe, warna category page par nahi milega.", href });
      check(prices.length > 0 && Math.min(...prices) > 0, { area: "Products", severity: "high", item: product.name, problem: "Sellable price wala variant nahi mila.", fix: "Kam se kam ek active size/SKU sahi price ke saath rakhe.", href });
      check(Boolean(product.fabric?.trim()), { area: "Products", severity: "low", item: product.name, problem: "Fabric field khaali hai.", fix: "Fabric bharne se filter, search aur Google product data behtar hota hai.", href });
      const meta = product.seo?.description?.trim() || product.shortDescription?.trim() || "";
      check(meta.length >= 110 && meta.length <= 170, { area: "Products", severity: "low", item: product.name, problem: `Search description ${meta.length} characters ki hai.`, fix: "SEO description ya short description ko lagbhag 140 characters ka rakhe.", href });
    }

    for (const category of activeCategories) {
      const href = "/admin/categories";
      const completeFaqs = category.faqs?.filter((faq) => faq.question.trim() && faq.answer.trim()).length ?? 0;
      check((category.description?.trim().length ?? 0) >= 80, { area: "Categories", severity: "medium", item: category.name, problem: "Landing page intro missing ya bahut chhota hai.", fix: "Admin → Categories me 1–2 line ka intro likhe.", href });
      check(wordCount(category.guideContent || "") >= 100, { area: "Categories", severity: "low", item: category.name, problem: "Apna buying guide nahi likha (standard guide chal raha hai).", fix: "Fabric/fit/care par apne anubhav se 100+ shabd likhe.", href });
      const meta = category.seo?.description?.trim() || category.description?.trim() || "";
      check(meta.length >= 120 && meta.length <= 170, { area: "Categories", severity: "medium", item: category.name, problem: `SEO description ${meta.length} characters ki hai.`, fix: "SEO description lagbhag 145 characters ki rakhe.", href });
      check(completeFaqs >= 2, { area: "Categories", severity: "low", item: category.name, problem: `Sirf ${completeFaqs} apna FAQ hai (standard FAQs chal rahe hain).`, fix: "Size, fabric aur care par 2–4 asli sawal-jawab jode.", href });
      check(Boolean(category.bannerImage?.trim()), { area: "Categories", severity: "low", item: category.name, problem: "Category banner photo nahi hai.", fix: "Collection ki pehchan wali ek acchi photo lagaye.", href });
    }

    const journal = content.filter((doc) => doc.kind === "journal" && doc.status === "published");
    for (const doc of journal) {
      const href = "/admin/journal";
      const blocks = asObject(doc.blocks);
      const cover = doc.media?.[0];
      const words = wordCount(doc.body || "");
      check(words >= 300, { area: "Journal", severity: "medium", item: doc.title || doc.key, problem: `Article sirf ${words} shabdon ka hai.`, fix: "300+ shabdon me asli jaankari jode — patle article rank nahi karte.", href });
      check((doc.subtitle?.trim().length ?? 0) >= 80, { area: "Journal", severity: "medium", item: doc.title || doc.key, problem: "Article summary/excerpt missing ya chhota hai.", fix: "80–180 characters ka summary likhe.", href });
      check(Boolean(cover?.url && (cover.alt?.trim() || text(blocks.coverAlt))), { area: "Journal", severity: "low", item: doc.title || doc.key, problem: "Cover photo ya uski description missing hai.", fix: "Cover photo + alt text jode.", href });
      check(/\]\(\//.test(doc.body || ""), { area: "Journal", severity: "low", item: doc.title || doc.key, problem: "Article ke andar shop page ka link nahi hai.", fix: "Jahan natural lage wahan collection/product ka link jode.", href });
    }

    const testimonials = content.filter((doc) => doc.kind === "testimonial" && doc.status === "published" && !doc.key.startsWith("about.sustain."));
    for (const doc of testimonials) {
      const blocks = asObject(doc.blocks);
      const name = text(blocks.name) || text(blocks.author) || doc.key;
      check(blocks.consentConfirmed === true, { area: "Homepage reviews", severity: "high", item: name, problem: "Customer permission (consent) record nahi hai.", fix: "Admin → Homepage reviews me review khole, permission confirm karke dobara save kare — ya unpublish kare.", href: "/admin/testimonials" });
      check(blocks.verified !== true || Boolean(text(blocks.orderRef)), { area: "Homepage reviews", severity: "high", item: name, problem: "“Verified purchase” laga hai par order reference record nahi hai.", fix: "Order number check karke private reference bhare, warna verified badge hataye.", href: "/admin/testimonials" });
    }

    const score = total ? Math.round((passed / total) * 100) : 100;
    const byArea = AREAS.map((name) => {
      const stats = areaStats.get(name) ?? { passed: 0, total: 0 };
      return {
        name,
        issues: issues.filter((issue) => issue.area === name).length,
        items: name === "Products" ? activeProducts.length : name === "Categories" ? activeCategories.length : name === "Journal" ? journal.length : testimonials.length,
        passed: stats.passed,
        total: stats.total,
        score: stats.total ? Math.round((stats.passed / stats.total) * 100) : 100,
      };
    });
    return { issues, passed, total, score, byArea, activeProducts: activeProducts.length, activeCategories: activeCategories.length, journal: journal.length, testimonials: testimonials.length };
  }, [products, categories, content]);

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    const severityRank: Record<Severity, number> = { high: 0, medium: 1, low: 2 };
    return analysis.issues
      .filter((issue) => (area === "all" || issue.area === area) && (severity === "all" || issue.severity === severity))
      .filter((issue) => !query || `${issue.item} ${issue.problem} ${issue.fix}`.toLowerCase().includes(query))
      .sort((a, b) => severityRank[a.severity] - severityRank[b.severity] || a.area.localeCompare(b.area) || a.item.localeCompare(b.item));
  }, [analysis.issues, area, severity, search]);

  if (!isApiConfigured()) {
    return <Alert tone="warning">API configured nahi hai — SEO health ke liye backend connection chahiye.</Alert>;
  }

  return (
    <div className="space-y-5">
      <PageHeading
        eyebrow="Growth"
        title="SEO health"
        subtitle="Ek hi jagah product, category, Journal aur homepage-review ki woh kamiya jo Google ranking aur customer bharosa ghata sakti hain. Har issue ke saath seedha fix-page ka link hai."
        action={<ButtonPrimary onClick={refresh} disabled={loading} className="min-h-11">{loading ? "Checking…" : "Dobara check kare"}</ButtonPrimary>}
      />
      {error && <Alert>{error}</Alert>}
      {STORE_PHONE_IS_PLACEHOLDER && (
        <Alert tone="danger">
          <strong>Launch blocker:</strong> Website par abhi dummy-looking store number ({STORE_PHONE_DISPLAY}) chal raha hai. Asli verified number ko deployment env me <code>NEXT_PUBLIC_STORE_PHONE</code> aur <code>NEXT_PUBLIC_STORE_WHATSAPP</code> set kare — footer, schema, policy pages aur saare WhatsApp links ek saath update ho jayenge.
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="SEO score" value={`${analysis.score}%`} hint={`${analysis.passed}/${analysis.total} checks pass`} tone={analysis.score >= 85 ? "success" : analysis.score >= 60 ? "warning" : "danger"} />
        <StatCard label="Zaroori fixes" value={String(analysis.issues.filter((issue) => issue.severity === "high").length)} hint="Pehle inhe theek kare" tone="danger" />
        <StatCard label="Active products" value={String(analysis.activeProducts)} hint="Jo Google par ja sakte hain" />
        <StatCard label="Journal articles" value={String(analysis.journal)} hint="Published guides/stories" tone="gold" />
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        {analysis.byArea.map((entry) => (
          <Card key={entry.name} title={entry.name} badge={<Badge tone={entry.total === 0 ? "neutral" : entry.issues ? "warning" : "success"}>{entry.total === 0 ? "Koi live item nahi" : entry.issues ? `${entry.issues} issues` : "Sab theek"}</Badge>}>
            <p className="text-[12.5px] leading-relaxed text-stone-500">
              {entry.items} live item{entry.items === 1 ? "" : "s"} · {entry.passed}/{entry.total} exact checks pass{entry.total ? ` (${entry.score}%)` : ""}.
            </p>
            <div className="mt-3"><ProgressBar value={entry.passed} max={Math.max(1, entry.total)} tone={entry.total === 0 ? "#a8a29e" : entry.issues ? "#d97706" : "#059669"} /></div>
          </Card>
        ))}
      </div>

      <Card title="Issues pehle khatm kare" className="!p-4">
        <div className="flex flex-wrap items-center gap-3">
          <FilterTabs options={["all", "Products", "Categories", "Journal", "Homepage reviews"] as const} value={area} onChange={setArea} counts={{ all: analysis.issues.length, Products: analysis.issues.filter((issue) => issue.area === "Products").length, Categories: analysis.issues.filter((issue) => issue.area === "Categories").length, Journal: analysis.issues.filter((issue) => issue.area === "Journal").length, "Homepage reviews": analysis.issues.filter((issue) => issue.area === "Homepage reviews").length }} />
          <FilterTabs options={["all", "high", "medium", "low"] as const} value={severity} onChange={setSeverity} />
          <div className="min-w-52 flex-1">
            <label htmlFor="seo-issue-search" className="sr-only">Issue search kare</label>
            <TextInput id="seo-issue-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Product/category naam search kare…" />
          </div>
        </div>
      </Card>

      {loading ? (
        <Card><EmptyState title="SEO health check chal raha hai…" /></Card>
      ) : rows.length === 0 ? (
        <Card>
          <EmptyState title={analysis.issues.length ? "Is filter me koi issue nahi" : "🎉 Koi SEO issue nahi mila"} hint={analysis.issues.length ? "Doosra filter try kare." : "Bahut badhiya — naya product/article jodne ke baad yahi page dobara check kar le."} />
        </Card>
      ) : (
        <div className="space-y-3" aria-live="polite">
          {rows.slice(0, 100).map((issue, index) => (
            <Card key={`${issue.area}-${issue.item}-${issue.problem}-${index}`} className="!p-0 overflow-hidden">
              <div className="flex flex-wrap items-start gap-3 p-4">
                <Badge tone={severityTone(issue.severity)}>{issue.severity === "high" ? "Zaroori" : issue.severity === "medium" ? "Dhyan de" : "Sudhaar"}</Badge>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-[#14100f]">{issue.item} <span className="font-normal text-stone-400">· {issue.area}</span></p>
                  <p className="mt-1 text-[12.5px] text-stone-700">{issue.problem}</p>
                  <p className="mt-0.5 text-[12px] text-stone-500">Fix: {issue.fix}</p>
                </div>
                <Link href={issue.href} className="inline-flex min-h-10 items-center rounded-full border border-[#ebe6de] px-4 text-[12.5px] font-semibold text-stone-700 transition hover:border-[#dfc28c] hover:text-[#881337]">Fix kare →</Link>
              </div>
            </Card>
          ))}
          {rows.length > 100 && <p className="text-center text-[12px] text-stone-500">Pehle 100 issues dikh rahe hain — filter karke baaki dekhe. Kul {rows.length}.</p>}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Google tools (bahari link)">
          <ul className="space-y-2.5 text-[13px]">
            <li><a className="font-semibold text-[#881337] hover:underline" href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer">Google Search Console ↗</a> — kaun se page Google me hai, kin shabdon par log aa rahe hain.</li>
            <li><a className="font-semibold text-[#881337] hover:underline" href="https://search.google.com/test/rich-results" target="_blank" rel="noopener noreferrer">Rich Results Test ↗</a> — product ka price/rating Google par dikhega ya nahi, URL daal kar check kare.</li>
            <li><a className="font-semibold text-[#881337] hover:underline" href="https://pagespeed.web.dev/" target="_blank" rel="noopener noreferrer">PageSpeed Insights ↗</a> — mobile speed score; 90+ rakhe.</li>
            <li><Link className="font-semibold text-[#881337] hover:underline" href="/sitemap.xml" target="_blank">Website sitemap ↗</Link> aur <Link className="font-semibold text-[#881337] hover:underline" href="/robots.txt" target="_blank">robots.txt ↗</Link> — Google ko diye jaane wale page ki list.</li>
          </ul>
        </Card>
        <Card title="Har hafte ki 10-minute routine">
          <ol className="list-decimal space-y-2 pl-5 text-[13px] leading-relaxed text-stone-700">
            <li>Is page par <strong>Zaroori</strong> issues zero rakhe.</li>
            <li>Search Console me “Pages → Not indexed” dekhe; koi zaroori page atka ho to URL inspection se request kare.</li>
            <li>Ek Journal guide publish/update kare — dukaan par sabse zyada poochhe jaane wale sawal par.</li>
            <li>Delivered orders ke 2–3 asli reviews permission ke saath Homepage reviews me jode.</li>
            <li>Jo category sabse zyada bik rahi hai, uska guide aur photo sabse pehle sudhaare.</li>
          </ol>
          <ButtonGhost className="mt-4" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>Upar jaakar score dekhe</ButtonGhost>
        </Card>
      </div>
    </div>
  );
}
