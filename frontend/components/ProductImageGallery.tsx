"use client";

import { useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { useModalDialog } from "../lib/use-modal-dialog";

interface ProductImageGalleryProps {
  images: string[];
  productTitle: string;
  videoUrl?: string;
}

export default function ProductImageGallery({ images, productTitle, videoUrl }: ProductImageGalleryProps) {
  const [currentImage, setCurrentImage] = useState(0);
  const [showZoom, setShowZoom] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const zoomDialogRef = useModalDialog<HTMLDivElement>(showZoom, () => setShowZoom(false));

  const safeImageIndex = images.length ? Math.min(currentImage, images.length - 1) : 0;
  const activeImage = images[safeImageIndex];
  const previousImage = () => setCurrentImage(safeImageIndex === 0 ? images.length - 1 : safeImageIndex - 1);
  const nextImage = () => setCurrentImage(safeImageIndex === images.length - 1 ? 0 : safeImageIndex + 1);

  return (
    <div className="space-y-4">
      <div className="group relative aspect-[3/4] overflow-hidden rounded-2xl bg-gray-100">
        {showVideo && videoUrl ? (
          <video
            src={videoUrl}
            controls
            autoPlay
            muted
            loop
            playsInline
            aria-label={`${productTitle} ka video`}
            className="h-full w-full object-cover"
          />
        ) : activeImage ? (
          <Image
            src={activeImage}
            alt={`${productTitle} — photo ${safeImageIndex + 1}`}
            fill
            unoptimized
            priority
            sizes="(min-width: 1024px) 45vw, 92vw"
            className="cursor-zoom-in object-cover transition-transform group-hover:scale-105"
            onClick={() => setShowZoom(true)}
          />
        ) : (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-stone-500">
            Photo jald uplabdh hogi
          </div>
        )}

        {images.length > 1 && !showVideo && (
          <>
            <button
              type="button"
              onClick={previousImage}
              aria-label="Pichhli photo"
              className="absolute left-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 transition hover:bg-white focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#881337] md:opacity-0 md:group-hover:opacity-100"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
            <button
              type="button"
              onClick={nextImage}
              aria-label="Agli photo"
              className="absolute right-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 transition hover:bg-white focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#881337] md:opacity-0 md:group-hover:opacity-100"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M9 18l6-6-6-6" /></svg>
            </button>
          </>
        )}

        <div className="absolute right-4 top-4 rounded bg-black/50 px-2 py-1 text-sm text-white" aria-live="polite">
          {showVideo ? "Video" : images.length ? `${safeImageIndex + 1}/${images.length}` : "0/0"}
        </div>

        {activeImage && !showVideo && (
          <button
            type="button"
            onClick={() => setShowZoom(true)}
            aria-label={`${productTitle} ki photo badi karke dekhe`}
            className="absolute bottom-4 right-4 flex min-h-11 items-center rounded-full bg-white/90 px-4 text-sm font-semibold text-stone-800 shadow transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#881337]"
          >
            Zoom
          </button>
        )}

        {videoUrl && !showVideo && (
          <button
            type="button"
            onClick={() => setShowVideo(true)}
            aria-label={`${productTitle} ka video chalaye`}
            className="absolute bottom-4 left-4 flex min-h-11 items-center gap-2 rounded-lg bg-white/90 px-3 py-2 text-sm font-medium transition hover:bg-white"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><polygon points="5 3 19 12 5 21 5 3" /></svg>
            Play Video
          </button>
        )}

        {showVideo && (
          <button
            type="button"
            onClick={() => setShowVideo(false)}
            aria-label="Video band kare aur photo par wapas jaye"
            className="absolute left-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-black/70"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        )}
      </div>

      {(images.length > 1 || videoUrl) && (
        <div className="grid grid-cols-4 gap-3">
          {images.map((image, index) => (
            <button
              key={`${image}-${index}`}
              type="button"
              onClick={() => {
                setCurrentImage(index);
                setShowVideo(false);
              }}
              aria-label={`${productTitle} ki photo ${index + 1} chune`}
              aria-pressed={safeImageIndex === index && !showVideo}
              className={`relative aspect-[3/4] overflow-hidden rounded-lg border-2 transition ${
                safeImageIndex === index && !showVideo
                  ? "border-[#881337] ring-2 ring-[#881337]/20"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <Image src={image} alt="" fill unoptimized sizes="96px" className="object-cover" />
            </button>
          ))}

          {videoUrl && (
            <button
              type="button"
              onClick={() => setShowVideo(true)}
              aria-label={`${productTitle} ka video chune`}
              aria-pressed={showVideo}
              className={`relative aspect-[3/4] overflow-hidden rounded-lg border-2 transition ${
                showVideo
                  ? "border-[#881337] ring-2 ring-[#881337]/20"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <video src={videoUrl} muted preload="metadata" playsInline className="h-full w-full object-cover" />
              <span className="absolute inset-0 flex items-center justify-center bg-black/30" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3" /></svg>
              </span>
            </button>
          )}
        </div>
      )}

      <AnimatePresence>
        {showZoom && activeImage && (
          <motion.div
            ref={zoomDialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={`${productTitle} — badi photo`}
            tabIndex={-1}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 outline-none"
            onClick={() => setShowZoom(false)}
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              className="max-h-full max-w-4xl"
              onClick={(event) => event.stopPropagation()}
            >
              <Image
                src={activeImage}
                alt={`${productTitle} — badi photo ${safeImageIndex + 1}`}
                width={1200}
                height={1600}
                unoptimized
                sizes="(min-width: 896px) 896px, 92vw"
                className="h-auto max-h-[86vh] w-auto max-w-full rounded-xl object-contain"
              />
            </motion.div>

            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setShowZoom(false);
              }}
              aria-label="Badi photo band kare"
              className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full text-white transition hover:bg-white/10 hover:text-gray-300"
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>

            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    previousImage();
                  }}
                  aria-label="Pichhli badi photo"
                  className="absolute left-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-white transition hover:bg-white/10 hover:text-gray-300"
                >
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    nextImage();
                  }}
                  aria-label="Agli badi photo"
                  className="absolute right-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-white transition hover:bg-white/10 hover:text-gray-300"
                >
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M9 18l6-6-6-6" /></svg>
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
