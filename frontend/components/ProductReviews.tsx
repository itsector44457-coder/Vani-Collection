"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { isApiConfigured } from "@/lib/api-client";
import { getProductReviews, submitReview } from "@/lib/storefront-api";
import type { StoreReview } from "@/lib/storefront-types";

interface ProductReviewsProps {
  productId: string;
  /** Backend id used to load reviews from the API. */
  apiProductId?: string;
}

interface Review {
  id: string;
  userName: string;
  rating: number;
  date: string;
  verified: boolean;
  title: string;
  comment: string;
  size: string;
  helpful: number;
  images?: string[];
  adminReply?: string;
}

const toReview = (review: StoreReview): Review => ({
  id: review._id,
  userName: review.customerName || "Vani customer",
  rating: review.rating,
  date: review.createdAt,
  verified: Boolean(review.verifiedPurchase),
  title: review.title ?? "",
  comment: review.body,
  size: "—",
  helpful: review.helpfulCount ?? 0,
  images: review.images,
  adminReply: review.adminReply,
});

const OBJECT_ID = /^[0-9a-f]{24}$/i;

export default function ProductReviews({ productId, apiProductId }: ProductReviewsProps) {
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();
  const live = isApiConfigured();
  const backendId = apiProductId && OBJECT_ID.test(apiProductId) ? apiProductId : null;

  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(Boolean(live && backendId));
  const [sortBy, setSortBy] = useState<"newest" | "helpful" | "rating">("newest");
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const [writing, setWriting] = useState(false);
  const [draft, setDraft] = useState({ rating: 5, title: "", body: "" });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState("");
  const [loadError, setLoadError] = useState("");
  const [loadNonce, setLoadNonce] = useState(0);

  useEffect(() => {
    if (!live || !backendId) return;
    const controller = new AbortController();
    let cancelled = false;
    const load = async () => {
      await Promise.resolve();
      if (cancelled) return;
      setLoading(true);
      try {
        const result = await getProductReviews(backendId, controller.signal);
        if (!cancelled) {
          setReviews(result.map(toReview));
          setLoadError("");
        }
      } catch (cause) {
        if ((cause as Error)?.name === "AbortError") return;
        if (!cancelled) {
          setReviews([]);
          setLoadError("Reviews load nahi ho paye. Kuch der baad dobara koshish kare.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [live, backendId, loadNonce]);

  const sorted = [...reviews].sort((a, b) => {
    if (sortBy === "newest") return new Date(b.date).getTime() - new Date(a.date).getTime();
    if (sortBy === "helpful") return b.helpful - a.helpful;
    if (sortBy === "rating") return b.rating - a.rating;
    return 0;
  });

  const total = reviews.length;
  const averageRating = total > 0 ? reviews.reduce((sum, review) => sum + review.rating, 0) / total : 0;
  const ratingDistribution = [5, 4, 3, 2, 1].map((rating) => {
    const count = reviews.filter((review) => review.rating === rating).length;
    return { stars: rating, count, percentage: total > 0 ? (count / total) * 100 : 0 };
  });

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });

  const handleSubmitReview = async (event?: React.FormEvent) => {
    event?.preventDefault();
    setFormError("");
    setNotice("");
    if (!backendId) {
      setFormError("Reviews open once this piece is served from the live catalogue.");
      return;
    }
    if (!isAuthenticated) {
      setFormError("Please sign in to write a review.");
      return;
    }
    if (draft.body.trim().length < 10) {
      setFormError("Tell us a little more — at least 10 characters.");
      return;
    }
    setSubmitting(true);
    try {
      await submitReview({ productId: backendId, rating: draft.rating, title: draft.title.trim() || undefined, body: draft.body.trim() });
      const result = await getProductReviews(backendId);
      setReviews(result.map(toReview));
      setWriting(false);
      setDraft({ rating: 5, title: "", body: "" });
      setNotice("Dhanyavaad! Review samiksha ke liye bhej diya gaya hai. Manzoori ke baad hi yahi dikhega; status My Reviews me mil jayega.");
    } catch (cause) {
      setFormError((cause as Error)?.message || "We could not submit your review. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-8" data-product-id={productId}>
      {/* Reviews Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <div className="flex items-center gap-4 mb-4">
            <div className="text-4xl font-bold text-gray-900">{total > 0 ? averageRating.toFixed(1) : "—"}</div>
            <div>
              <div className="flex items-center mb-1" role="img" aria-label={total > 0 ? `Average rating ${averageRating.toFixed(1)} out of 5` : "No rating yet"}>
                {[...Array(5)].map((_, i) => (
                  <svg key={i} width="20" height="20" viewBox="0 0 24 24" fill={i < Math.round(averageRating) ? "#fbbf24" : "#e5e7eb"} aria-hidden="true">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                ))}
              </div>
              <div className="text-sm text-gray-600">
                {loading ? "Loading reviews…" : `${total} review${total === 1 ? "" : "s"}`}
              </div>
            </div>
          </div>
        </div>

        <div>
          <h4 className="font-medium text-gray-900 mb-3">Rating Breakdown</h4>
          <div className="space-y-2">
            {ratingDistribution.map((rating) => (
              <div key={rating.stars} className="flex items-center gap-3">
                <span className="text-sm text-gray-600 w-8">{rating.stars}★</span>
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div className="bg-amber-400 h-2 rounded-full transition-all duration-500" style={{ width: `${rating.percentage}%` }} />
                </div>
                <span className="text-sm text-gray-600 w-8">{rating.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filters and Sorting */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center pb-4 border-b border-gray-200">
        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            aria-pressed={filterRating === null}
            onClick={() => setFilterRating(null)}
            className={`min-h-11 rounded-full px-4 py-2 text-sm font-medium transition ${
              filterRating === null ? "bg-[#881337] text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            All
          </button>
          {[5, 4, 3, 2, 1].map((rating) => (
            <button
              key={rating}
              type="button"
              aria-pressed={filterRating === rating}
              aria-label={`Sirf ${rating} star reviews dikhaye`}
              onClick={() => setFilterRating(rating)}
              className={`min-h-11 rounded-full px-4 py-2 text-sm font-medium transition ${
                filterRating === rating ? "bg-[#881337] text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {rating}★ ({ratingDistribution.find((entry) => entry.stars === rating)?.count || 0})
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
          Sort
          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value as typeof sortBy)}
            className="min-h-11 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-[#881337]"
          >
          <option value="newest">Newest First</option>
          <option value="helpful">Most Helpful</option>
            <option value="rating">Highest Rating</option>
          </select>
        </label>
      </div>

      {notice && (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-relaxed text-emerald-800">
          {notice}{" "}
          <Link href="/account/reviews" className="font-semibold underline underline-offset-2">My Reviews dekhe</Link>
        </p>
      )}
      {loadError && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <span>{loadError}</span>
          <button type="button" onClick={() => setLoadNonce((value) => value + 1)} className="min-h-10 font-semibold underline">Retry</button>
        </div>
      )}

      {/* Reviews List */}
      <div className="space-y-6">
        {sorted
          .filter((review) => filterRating === null || review.rating === filterRating)
          .map((review, index) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="border border-gray-200 rounded-xl p-6 bg-white"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-[#881337] to-[#b91c1c] rounded-full flex items-center justify-center text-white font-semibold">
                    {review.userName.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{review.userName}</span>
                      {review.verified && (
                        <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-xs font-medium">
                          Verified Purchase
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex" role="img" aria-label={`Rating ${review.rating} out of 5`}>
                        {[...Array(5)].map((_, i) => (
                          <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill={i < review.rating ? "#fbbf24" : "#e5e7eb"} aria-hidden="true">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                          </svg>
                        ))}
                      </div>
                      <span className="text-sm text-gray-500">
                        • {formatDate(review.date)}
                        {review.size !== "—" ? ` • Size: ${review.size}` : ""}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {review.title && <h4 className="font-medium text-gray-900">{review.title}</h4>}
                <p className="text-gray-700 leading-relaxed">{review.comment}</p>
                {review.images && review.images.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {review.images.map((image, imgIndex) => (
                      <a key={`${image}-${imgIndex}`} href={image} target="_blank" rel="noreferrer" aria-label={`Review photo ${imgIndex + 1} badi karke dekhe`} className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#881337]">
                        <Image src={image} alt="" width={80} height={80} unoptimized className="h-20 w-20 rounded-lg border border-gray-200 object-cover" />
                      </a>
                    ))}
                  </div>
                )}
                {review.adminReply && (
                  <div className="rounded-r-xl border-l-2 border-[#881337] bg-rose-50/60 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#881337]">Response from Vani Collection</p>
                    <p className="mt-1 text-sm leading-relaxed text-gray-700">{review.adminReply}</p>
                  </div>
                )}
              </div>

              {review.helpful > 0 && (
                <p className="mt-4 border-t border-gray-100 pt-4 text-sm text-gray-600">
                  {review.helpful} {review.helpful === 1 ? "person" : "people"} ko yeh review madadgar laga
                </p>
              )}
            </motion.div>
          ))}

        {!loading && !loadError && sorted.length === 0 && (
          <p className="rounded-xl border border-gray-200 bg-white px-6 py-10 text-center text-sm text-gray-500">
            No reviews yet — be the first to share your experience.
          </p>
        )}
      </div>

      {/* Write Review */}
      <div className="pt-8 border-t border-gray-200">
        {!writing ? (
          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setWriting(true);
                setNotice("");
              }}
              className="min-h-12 rounded-xl bg-[#881337] px-8 py-3 font-semibold text-white transition hover:bg-[#701a35]"
            >
              Write a Review
            </button>
            <p className="mt-3 text-xs text-gray-500">Review team ki samiksha ke baad publish hota hai.</p>
          </div>
        ) : (
          <form onSubmit={(event) => void handleSubmitReview(event)} noValidate className="rounded-2xl border border-gray-200 bg-white p-6">
            <h4 className="font-serif text-lg text-gray-900">Share your experience</h4>
            {live && !isAuthenticated && (
              <p className="mt-2 text-sm leading-relaxed text-amber-700">
                Review bhejne ke liye pehle{" "}
                <Link href={`/login?redirect=${encodeURIComponent(pathname || "/products")}`} className="font-semibold underline underline-offset-2">sign in</Link>{" "}
                kare. Delivered khareed ka review My Reviews se verified purchase ke roop me judega.
              </p>
            )}

            <fieldset className="mt-4">
              <legend className="text-sm font-medium text-gray-700">Your rating</legend>
              <div className="mt-2 flex flex-wrap items-center gap-1" role="radiogroup" aria-label="Star rating chune">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={draft.rating === value}
                    onClick={() => setDraft((current) => ({ ...current, rating: value }))}
                    aria-label={`${value} star`}
                    className={`flex h-11 w-11 items-center justify-center rounded-full text-2xl leading-none transition ${value <= draft.rating ? "bg-amber-50 text-amber-400 ring-1 ring-amber-200" : "text-gray-300 ring-1 ring-gray-200"}`}
                  >
                    ★
                  </button>
                ))}
                <span className="ml-2 text-sm font-semibold text-gray-700">{draft.rating}/5</span>
              </div>
            </fieldset>

            <div className="mt-4">
              <label htmlFor="product-review-title" className="block text-sm font-medium text-gray-700">Headline (optional)</label>
              <input
                id="product-review-title"
                name="title"
                value={draft.title}
                maxLength={120}
                onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                placeholder="Jaise: Kapda bahut soft hai"
                className="mt-1.5 min-h-12 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-[#881337] focus:outline-none focus:ring-2 focus:ring-[#881337]/15"
              />
            </div>

            <div className="mt-4">
              <label htmlFor="product-review-body" className="block text-sm font-medium text-gray-700">Aapka anubhav</label>
              <textarea
                id="product-review-body"
                name="body"
                value={draft.body}
                maxLength={4000}
                onChange={(event) => setDraft((current) => ({ ...current, body: event.target.value }))}
                rows={4}
                aria-describedby="product-review-body-count"
                placeholder="Fit, fabric aur quality kaisi lagi?"
                className="mt-1.5 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm leading-relaxed focus:border-[#881337] focus:outline-none focus:ring-2 focus:ring-[#881337]/15"
              />
              <p id="product-review-body-count" className="mt-1 text-right text-xs text-gray-400">{draft.body.trim().length}/4000 · kam se kam 10 characters</p>
            </div>

            {formError && <p role="alert" className="mt-3 text-sm text-rose-700">{formError}</p>}
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="min-h-12 rounded-xl bg-[#881337] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#701a35] disabled:cursor-not-allowed disabled:bg-stone-400"
              >
                {submitting ? "Bheja ja raha hai…" : "Review samiksha ke liye bheje"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setWriting(false);
                  setFormError("");
                }}
                disabled={submitting}
                className="min-h-12 rounded-xl border-2 border-gray-200 px-6 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
