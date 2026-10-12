"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import ReelsSidebar from "./ReelsSidebar";
import type { PublishedReel } from "../lib/content";

function videoSource(url: string, muted: boolean): { src: string; embedded: boolean } {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    if (host === "youtu.be" || host.endsWith(".youtu.be")) {
      const id = parsed.pathname.split("/").filter(Boolean)[0];
      if (id) return { src: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&mute=${muted ? 1 : 0}&loop=1&playlist=${encodeURIComponent(id)}&controls=0&playsinline=1&rel=0`, embedded: true };
    }
    if (host === "youtube.com" || host.endsWith(".youtube.com")) {
      const id = parsed.searchParams.get("v") || parsed.pathname.split("/").filter(Boolean).at(-1);
      if (id) return { src: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&mute=${muted ? 1 : 0}&loop=1&playlist=${encodeURIComponent(id)}&controls=0&playsinline=1&rel=0`, embedded: true };
    }
    if (host === "vimeo.com" || host.endsWith(".vimeo.com")) {
      const id = parsed.pathname.split("/").filter(Boolean).at(-1);
      if (id && /^\d+$/.test(id)) return { src: `https://player.vimeo.com/video/${id}?autoplay=1&muted=${muted ? 1 : 0}&loop=1&background=1`, embedded: true };
    }
  } catch {
    return { src: url, embedded: false };
  }
  return { src: url, embedded: false };
}

function ReelSlide({
  reel,
  active,
  index,
  total,
  muted,
  liked,
  onToggleMute,
  onToggleLike,
  onShare,
}: {
  reel: PublishedReel;
  active: boolean;
  index: number;
  total: number;
  muted: boolean;
  liked: boolean;
  onToggleMute: () => void;
  onToggleLike: () => void;
  onShare: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoError, setVideoError] = useState(false);
  const source = videoSource(reel.videoUrl, muted);
  const image = reel.thumbnailUrl || reel.productId.images?.[0]?.url;
  const price = reel.productId.variants?.map((variant) => variant.price).filter((value) => Number.isFinite(value));
  const priceText = price?.length
    ? `₹${Math.min(...price).toLocaleString("en-IN")}${Math.max(...price) !== Math.min(...price) ? ` – ₹${Math.max(...price).toLocaleString("en-IN")}` : ""}`
    : null;

  useEffect(() => {
    const video = videoRef.current;
    if (!video || source.embedded) return;
    if (active) {
      video.muted = muted;
      void video.play().catch(() => {});
    } else {
      video.pause();
      video.currentTime = 0;
    }
  }, [active, muted, source.embedded]);

  return (
    <article id={reel._id} className="reels-slide relative h-[100svh] min-h-[100svh] w-full snap-start snap-always overflow-hidden bg-[#100b0b]">
      {source.embedded ? (
        <iframe
          key={`${reel._id}-${active}-${muted}`}
          src={active ? source.src : "about:blank"}
          title={reel.title}
          className="absolute inset-0 h-full w-full scale-[1.03]"
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      ) : !videoError ? (
        <video
          ref={videoRef}
          src={reel.videoUrl}
          poster={image}
          loop
          muted={muted}
          playsInline
          preload={active ? "auto" : "none"}
          onError={() => setVideoError(true)}
          className="reels-feed-video absolute inset-0 h-full w-full object-cover"
        />
      ) : image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#32151d] via-[#160f10] to-black">
          <span className="font-serif text-3xl text-white/40">Vani Collection</span>
        </div>
      )}

      {image && !source.embedded && !videoError && (
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-0 bg-cover bg-center opacity-35 blur-3xl"
          style={{ backgroundImage: `url("${image.replaceAll('"', "%22")}")` }}
        />
      )}

      <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-black/35 via-transparent to-black/75" />

      <div className="absolute left-1/2 top-1/2 z-[2] h-full w-full max-w-[470px] -translate-x-1/2 -translate-y-1/2">
        <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))]">
          <Link href="/" className="rounded-full border border-white/20 bg-black/30 px-3 py-2 text-xs font-semibold text-white backdrop-blur-md">
            VANI <span className="font-normal text-white/70">/ REELS</span>
          </Link>
          <span className="rounded-full bg-black/30 px-3 py-2 text-xs font-medium text-white/80 backdrop-blur-md">
            {String(index + 1).padStart(2, "0")} <span className="text-white/40">/ {String(total).padStart(2, "0")}</span>
          </span>
        </div>

        <button
          type="button"
          onClick={onToggleMute}
          aria-label={muted ? "Turn sound on" : "Mute reel"}
          className="absolute right-4 top-[max(4.8rem,calc(env(safe-area-inset-top)+4rem))] z-20 grid h-10 w-10 place-items-center rounded-full border border-white/25 bg-black/35 text-white backdrop-blur-md transition hover:bg-black/60"
        >
          {muted ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M11 5 6 9H3v6h3l5 4V5Z" /><path d="m17 9 4 6m0-6-4 6" /></svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M11 5 6 9H3v6h3l5 4V5Z" /><path d="M15.5 8.5a5 5 0 0 1 0 7m3-10a9 9 0 0 1 0 13" /></svg>
          )}
        </button>

        <div className="absolute bottom-[max(1.5rem,env(safe-area-inset-bottom))] left-4 right-[4.6rem] z-10 text-white">
          <div className="mb-3 flex items-center gap-2">
            <span className="h-px w-7 bg-[#dfc28c]" />
            <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#f0d7a4]">Vani Atelier · {index + 1} of {total}</span>
          </div>
          <h2 className="max-w-[360px] font-serif text-[clamp(1.7rem,7vw,2.5rem)] leading-[1.08] drop-shadow-lg">{reel.title}</h2>
          {reel.description && <p className="mt-2 line-clamp-2 max-w-[340px] text-sm leading-5 text-white/75">{reel.description}</p>}

          <div className="mt-4 flex items-center gap-3 rounded-2xl border border-white/15 bg-black/30 p-2.5 backdrop-blur-lg">
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image} alt="" className="h-14 w-12 shrink-0 rounded-xl object-cover" />
            ) : (
              <div className="grid h-14 w-12 shrink-0 place-items-center rounded-xl bg-white/10 text-sm text-white/50">VC</div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold">{reel.productId.name}</p>
              {priceText && <p className="mt-1 text-sm font-bold text-[#f0d7a4]">{priceText}</p>}
            </div>
            <Link
              href={`/product/${encodeURIComponent(reel.productId.slug)}`}
              className="shrink-0 rounded-full bg-[#dfc28c] px-4 py-2.5 text-xs font-bold text-[#23170f] transition hover:bg-[#f0d7a4]"
            >
              Shop look
            </Link>
          </div>
        </div>

        <div className="absolute bottom-[max(10rem,calc(env(safe-area-inset-bottom)+9rem))] right-3 z-10 flex flex-col items-center gap-5">
          <button type="button" onClick={onToggleLike} aria-label={liked ? "Unlike reel" : "Like reel"} aria-pressed={liked} className="group flex flex-col items-center gap-1.5 text-white">
            <span className={`grid h-11 w-11 place-items-center rounded-full border border-white/25 bg-black/35 backdrop-blur-md transition group-hover:scale-105 ${liked ? "text-rose-400" : ""}`}>
              <svg width="21" height="21" viewBox="0 0 24 24" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" /></svg>
            </span>
            <span className="text-[10px] font-semibold text-white/85">{liked ? "Liked" : "Like"}</span>
          </button>

          <button type="button" onClick={onShare} aria-label="Share reel" className="group flex flex-col items-center gap-1.5 text-white">
            <span className="grid h-11 w-11 place-items-center rounded-full border border-white/25 bg-black/35 backdrop-blur-md transition group-hover:scale-105">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.6 10.7 6.8-4.1m-6.8 6.7 6.8 4" /></svg>
            </span>
            <span className="text-[10px] font-semibold text-white/85">Share</span>
          </button>
        </div>
      </div>
    </article>
  );
}

export default function ReelsExperience({ reels }: { reels: PublishedReel[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const [likedIds, setLikedIds] = useState<Set<string>>(() => new Set());
  const feedRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    const feed = feedRef.current;
    if (!feed) return;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.65) {
          const index = slideRefs.current.indexOf(entry.target as HTMLElement);
          if (index >= 0) setActiveIndex(index);
        }
      }
    }, { root: feed, threshold: [0.65, 0.85] });
    slideRefs.current.forEach((slide) => { if (slide) observer.observe(slide); });
    return () => observer.disconnect();
  }, [reels.length]);

  const scrollTo = useCallback((index: number) => {
    const nextIndex = Math.max(0, Math.min(reels.length - 1, index));
    slideRefs.current[nextIndex]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [reels.length]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowDown" || event.key === "PageDown") {
        event.preventDefault();
        scrollTo(activeIndex + 1);
      } else if (event.key === "ArrowUp" || event.key === "PageUp") {
        event.preventDefault();
        scrollTo(activeIndex - 1);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeIndex, scrollTo]);

  const toggleLike = (id: string) => {
    setLikedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const share = async (reel: PublishedReel) => {
    const url = `${window.location.origin}/reels#${reel._id}`;
    try {
      if (navigator.share) await navigator.share({ title: reel.title, text: reel.description, url });
      else if (navigator.clipboard) await navigator.clipboard.writeText(url);
    } catch (cause) {
      if ((cause as Error)?.name !== "AbortError") console.error("Could not share reel", cause);
    }
  };

  return (
    <main className="reels-page-container fixed inset-0 z-40 overflow-hidden bg-[#0a0807] text-white">
      <ReelsSidebar />
      <div className="absolute inset-0 lg:left-[240px]">
        <div className="pointer-events-none absolute inset-0 hidden overflow-hidden lg:block">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(136,19,55,0.2),_transparent_60%)]" />
          <div className="absolute inset-0 opacity-[0.035]" style={{ backgroundImage: "radial-gradient(circle, #dfc28c 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap font-serif text-6xl tracking-[0.3em] text-[#dfc28c]/[0.045]">VANI COLLECTION</span>
        </div>

        <div className="relative flex h-full items-center justify-center">
          <div ref={feedRef} className="reels-scroll-container relative h-full w-full max-w-[470px] snap-y snap-mandatory overflow-x-hidden overflow-y-auto overscroll-contain bg-black shadow-[0_0_90px_rgba(0,0,0,0.55)] lg:max-w-[470px]">
            {reels.map((reel, index) => (
              <div key={reel._id} ref={(element) => { slideRefs.current[index] = element; }} className="h-[100svh] min-h-[100svh] snap-start snap-always">
                <ReelSlide
                  reel={reel}
                  active={activeIndex === index}
                  index={index}
                  total={reels.length}
                  muted={muted}
                  liked={likedIds.has(reel._id)}
                  onToggleMute={() => setMuted((current) => !current)}
                  onToggleLike={() => toggleLike(reel._id)}
                  onShare={() => void share(reel)}
                />
              </div>
            ))}
          </div>

          <div className="absolute right-[max(1rem,calc((100vw-470px)/2-2.25rem))] top-1/2 z-20 hidden -translate-y-1/2 flex-col gap-2 lg:flex">
            <button type="button" onClick={() => scrollTo(activeIndex - 1)} disabled={activeIndex === 0} aria-label="Previous reel" className="reels-nav-button grid h-11 w-11 place-items-center rounded-full text-white transition disabled:opacity-30">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m18 15-6-6-6 6" /></svg>
            </button>
            <button type="button" onClick={() => scrollTo(activeIndex + 1)} disabled={activeIndex === reels.length - 1} aria-label="Next reel" className="reels-nav-button grid h-11 w-11 place-items-center rounded-full text-white transition disabled:opacity-30">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6" /></svg>
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
