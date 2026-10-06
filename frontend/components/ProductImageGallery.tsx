"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

interface ProductImageGalleryProps {
  images: string[];
  productTitle: string;
  videoUrl?: string;
}

export default function ProductImageGallery({ images, productTitle, videoUrl }: ProductImageGalleryProps) {
  const [currentImage, setCurrentImage] = useState(0);
  const [showZoom, setShowZoom] = useState(false);
  const [showVideo, setShowVideo] = useState(false);

  const allMedia = [...images];
  if (videoUrl) allMedia.push(videoUrl);

  return (
    <div className="space-y-4">
      {/* Main Image Display */}
      <div className="relative aspect-[3/4] bg-gray-100 rounded-2xl overflow-hidden group">
        {showVideo && videoUrl ? (
          <video 
            src={videoUrl}
            controls
            autoPlay
            muted
            loop
            className="w-full h-full object-cover"
          />
        ) : (
          <Image
            src={images[currentImage]}
            alt={`${productTitle} - Image ${currentImage + 1}`}
            fill
            priority
            sizes="(min-width: 1024px) 45vw, 92vw"
            className="object-cover cursor-zoom-in transition-transform group-hover:scale-105"
            onClick={() => setShowZoom(true)}
          />
        )}
        
        {/* Image Navigation Arrows */}
        {images.length > 1 && !showVideo && (
          <>
            <button
              onClick={() => setCurrentImage((prev) => (prev === 0 ? images.length - 1 : prev - 1))}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 hover:bg-white rounded-full flex items-center justify-center transition opacity-0 group-hover:opacity-100"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <button
              onClick={() => setCurrentImage((prev) => (prev === images.length - 1 ? 0 : prev + 1))}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 hover:bg-white rounded-full flex items-center justify-center transition opacity-0 group-hover:opacity-100"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </>
        )}

        {/* Image Counter */}
        <div className="absolute top-4 right-4 bg-black/50 text-white px-2 py-1 rounded text-sm">
          {showVideo ? 'Video' : `${currentImage + 1}/${images.length}`}
        </div>

        {/* Video Play Button */}
        {videoUrl && !showVideo && (
          <button
            onClick={() => setShowVideo(true)}
            className="absolute bottom-4 left-4 bg-white/90 hover:bg-white px-3 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            Play Video
          </button>
        )}

        {/* Close Video Button */}
        {showVideo && (
          <button
            onClick={() => setShowVideo(false)}
            className="absolute top-4 left-4 bg-black/50 hover:bg-black/70 text-white w-8 h-8 rounded-full flex items-center justify-center transition"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Thumbnail Gallery */}
      <div className="grid grid-cols-4 gap-3">
        {images.map((image, index) => (
          <button
            key={index}
            onClick={() => {
              setCurrentImage(index);
              setShowVideo(false);
            }}
            className={`relative aspect-[3/4] rounded-lg overflow-hidden border-2 transition ${
              currentImage === index && !showVideo 
                ? 'border-[#881337] ring-2 ring-[#881337]/20' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <Image
              src={image}
              alt={`${productTitle} thumbnail ${index + 1}`}
              fill
              sizes="96px"
              className="object-cover"
            />
          </button>
        ))}
        
        {/* Video Thumbnail */}
        {videoUrl && (
          <button
            onClick={() => setShowVideo(true)}
            className={`aspect-[3/4] rounded-lg overflow-hidden border-2 transition relative ${
              showVideo 
                ? 'border-[#881337] ring-2 ring-[#881337]/20' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <video
              src={videoUrl}
              muted
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            </div>
          </button>
        )}
      </div>

      {/* Zoom Modal */}
      <AnimatePresence>
        {showZoom && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
            onClick={() => setShowZoom(false)}
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              className="max-w-4xl max-h-full"
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={images[currentImage]}
                alt={`${productTitle} - Zoomed`}
                width={1200}
                height={1600}
                sizes="(min-width: 896px) 896px, 92vw"
                className="max-w-full max-h-[86vh] w-auto h-auto object-contain rounded-xl"
              />
            </motion.div>
            
            {/* Close Button */}
            <button
              onClick={() => setShowZoom(false)}
              className="absolute top-4 right-4 text-white hover:text-gray-300 transition"
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
            
            {/* Navigation in Zoom */}
            {images.length > 1 && (
              <>
                <button
                  onClick={() => setCurrentImage((prev) => (prev === 0 ? images.length - 1 : prev - 1))}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 transition"
                >
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </button>
                <button
                  onClick={() => setCurrentImage((prev) => (prev === images.length - 1 ? 0 : prev + 1))}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 transition"
                >
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}