"use client";

import { Card, Field, Textarea, TextInput } from "@/lib/admin-ui";
import SeoChecklist from "./SeoChecklist";

interface ProductSeoPanelProps {
  idPrefix: string;
  productName: string;
  slug: string;
  shortDescription: string;
  description: string;
  fabric: string;
  categorySelected: boolean;
  imageCount: number;
  hasSellablePrice: boolean;
  seoTitle: string;
  seoDescription: string;
  onSeoTitleChange: (value: string) => void;
  onSeoDescriptionChange: (value: string) => void;
}

/**
 * Google-search fields + live checklist shared by the New and Edit product forms. It never blocks
 * saving (a draft may legitimately be incomplete) — it simply makes the expensive-to-fix-later
 * misses visible while the product is still open on screen.
 */
export default function ProductSeoPanel(props: ProductSeoPanelProps) {
  const metaDescription = props.seoDescription.trim() || props.shortDescription.trim();
  const fullCopy = `${props.shortDescription} ${props.description}`.trim();
  const previewTitle = props.seoTitle.trim() || `${props.productName.trim() || "Product name"} | Demo Collection`;

  return (
    <Card title="Google search (SEO)">
      <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
        <div className="space-y-4">
          <Field label="SEO title (optional)" htmlFor={`${props.idPrefix}-seo-title`} hint={`${props.seoTitle.trim().length}/70 badhiya length · blank = product naam auto lagega`}>
            <TextInput id={`${props.idPrefix}-seo-title`} maxLength={120} value={props.seoTitle} onChange={(event) => props.onSeoTitleChange(event.target.value)} placeholder="Blank chhod sakte hain" />
          </Field>
          <Field label="SEO description (optional)" htmlFor={`${props.idPrefix}-seo-description`} hint={`${props.seoDescription.trim().length} characters · blank = short description lagegi`}>
            <Textarea id={`${props.idPrefix}-seo-description`} rows={3} maxLength={320} value={props.seoDescription} onChange={(event) => props.onSeoDescriptionChange(event.target.value)} placeholder="Fabric, khaasiyat aur kis ke liye hai — ek saaf line me…" />
          </Field>
          <div className="rounded-xl border border-[#e5ded5] bg-white p-3" aria-label="Google result preview">
            <p className="truncate text-[11px] text-stone-500">democollection.example.com/product/{props.slug || "…"}</p>
            <p className="mt-0.5 truncate text-[15px] font-medium text-[#1a0dab]">{previewTitle}</p>
            <p className="mt-0.5 line-clamp-2 text-[12.5px] leading-snug text-stone-600">{metaDescription || "Short ya SEO description likhne par yahan preview dikhega…"}</p>
          </div>
        </div>
        <SeoChecklist
          title="Publish karne se pehle"
          checks={[
            { label: "Product naam saaf aur 70 characters ke andar hai", pass: props.productName.trim().length >= 8 && props.productName.trim().length <= 70, hint: `Abhi ${props.productName.trim().length} characters. Rang + fabric + type rakhe.` },
            { label: "URL slug chhota aur valid hai", pass: /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(props.slug) && props.slug.length <= 70, hint: "Slug baad me badalne par purana URL redirect hota hai, phir bhi pehle se sahi rakhe." },
            { label: "Description kam se kam 120 characters ki hai", pass: fullCopy.length >= 120, hint: `Abhi ${fullCopy.length}. Fabric, fit, set-contents aur care jode.` },
            { label: "Search description 110–170 characters ki hai", pass: metaDescription.length >= 110 && metaDescription.length <= 170, hint: `Abhi ${metaDescription.length} (SEO ya short description).` },
            { label: "Kam se kam 2 photos hain", pass: props.imageCount >= 2, hint: `Abhi ${props.imageCount}. Front + close-up/detail photo rakhe.` },
            { label: "Category chuni hui hai", pass: props.categorySelected, hint: "Sahi category se product landing page aur filters me milta hai." },
            { label: "Fabric bhara hua hai", pass: Boolean(props.fabric.trim()), hint: "Fabric se search/filter aur Google product data behtar banta hai." },
            { label: "Ek sellable price ready hai", pass: props.hasSellablePrice, hint: "Bina price ke Google Shopping/rich result nahi banta." },
          ]}
        />
      </div>
    </Card>
  );
}
