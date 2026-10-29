"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { DEFAULT_FOUNDER, type FounderMessage as FounderContent } from "@/lib/founder";

export default function FounderMessage({ content = DEFAULT_FOUNDER }: { content?: FounderContent }) {
  const [failedImage, setFailedImage] = useState<string | null>(null);
  return (
    <section id="founders" aria-labelledby="founder-heading" className="relative isolate overflow-hidden bg-[#38131f] px-4 py-14 text-[#f8efdf] sm:px-8 sm:py-24">
      <div aria-hidden="true" className="pointer-events-none absolute -right-36 -top-44 h-[600px] w-[600px] rounded-full border border-[#dfc28c]/10" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-72 -left-44 h-[650px] w-[650px] rounded-full border-[70px] border-[#dfc28c]/[0.04]" />
      <div className="relative mx-auto max-w-6xl">
        <div className="mb-8 flex items-center gap-4 sm:mb-12">
          <span className="h-px w-10 bg-[#dfc28c]" />
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#dfc28c]">Behind the label</p>
          <span className="ml-auto hidden text-[10px] uppercase tracking-[0.24em] text-[#dfc28c]/60 sm:block">Demo City, India</span>
        </div>
        <div className="grid items-center gap-9 lg:grid-cols-[0.9fr_1.1fr] lg:gap-0">
          <div className="relative lg:pb-12 lg:pr-0">
            <div className="absolute -inset-2 border border-[#dfc28c]/30 sm:-inset-3 lg:bottom-9 lg:right-7" aria-hidden="true" />
            <div className="relative aspect-[4/5] max-h-[580px] overflow-hidden bg-[#532b36]">
              <Image src={failedImage === content.image ? "https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?w=1600&q=85" : content.image} alt={content.imageAlt} fill unoptimized sizes="(max-width: 1023px) 90vw, 480px" onError={() => setFailedImage(content.image)} className="object-cover" />
              <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-[#210c14]/85 via-transparent to-transparent" />
              <div className="absolute bottom-7 left-6 right-6 flex items-end justify-between gap-3 sm:bottom-10 sm:left-9">
                <p className="font-serif text-2xl italic text-white">Made with love.<br /><span className="text-[#dfc28c]">Always.</span></p>
                {content.year && <p className="border-l border-[#dfc28c]/50 pl-4 text-[9px] uppercase tracking-[0.2em] text-[#f8efdf]">Our journey<br /><span className="mt-1 block font-serif text-3xl tracking-normal">{content.year}</span></p>}
              </div>
            </div>
          </div>
          <div className="relative bg-[#fcf7ee] px-6 py-8 text-[#36242a] shadow-[0_24px_70px_rgba(0,0,0,0.18)] sm:px-10 sm:py-12 lg:-ml-8 lg:mt-12 lg:px-12">
            <div className="mb-5 flex items-center justify-between gap-3">
              <p className="text-[9px] font-semibold uppercase tracking-[0.27em] text-[#881337]">Founder&apos;s Message</p>
              <span aria-hidden="true" className="text-xl text-[#ad864c]">✧</span>
            </div>
            <h2 id="founder-heading" className="whitespace-pre-line font-serif text-4xl leading-[1.12] tracking-tight sm:text-5xl">{content.heading}</h2>
            <div className="my-6 h-px w-14 bg-[#ba965d]" />
            <div className="space-y-4 text-[13px] leading-[1.9] text-[#76635f] sm:text-sm">
              {content.message.split(/\n\s*\n/).filter(Boolean).map((paragraph, index) => <p key={index} className="whitespace-pre-line">{paragraph}</p>)}
            </div>
            {content.quote && <blockquote className="relative my-6 border-l-2 border-[#ba965d] py-1 pl-5 font-serif text-xl italic leading-relaxed text-[#881337]">“{content.quote}”</blockquote>}
            <div className="border-t border-[#e7dccb] pt-5">
              <p className="font-serif text-2xl italic">{content.name}</p>
              <p className="mt-1 text-[10px] leading-relaxed tracking-wide text-[#8a7770]">{content.role}</p>
            </div>
            <Link href="/about" className="mt-7 inline-flex items-center gap-5 border-b border-[#881337]/40 pb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#881337] transition-colors hover:text-[#ad864c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4">Discover our story <span aria-hidden="true">↗</span></Link>
          </div>
        </div>
      </div>
    </section>
  );
}
