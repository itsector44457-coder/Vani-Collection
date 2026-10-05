"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { isApiConfigured } from "@/lib/api-client";
import { getProductReviews, submitReview } from "@/lib/storefront-api";
import type { StoreReview } from "@/lib/storefront-types";

interface ProductReviewsProps {
  productId: string;
  /** Backend id when the product came from the API; demo products fall back to static reviews. */
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
}

/* Shown only while the storefront runs on the bundled demo catalogue. */
const mockReviews: Review[] = [
  {
    id: "1",
    userName: "Priya S.",
    rating: 5,
    date: "2024-01-15",
    verified: true,
    title: "Beautiful quality, exceeded expectations!",
    comment:
      "The fabric quality is amazing and the handblock print is so intricate. Fits perfectly and the color is exactly as shown. Received so many compliments wearing this.",
    size: "M",
    helpful: 12,
    images: ["https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=300&q=80"],
  },
  {
    id: "2",
    userName: "Meera K.",
    rating: 4,
    date: "2024-01-10",
    verified: true,
    title: "Good quality but runs slightly large",
    comment:
      "Love the fabric and the craftsmanship. Only issue is it runs a bit large so I'd suggest sizing down. The dupatta is gorgeous with beautiful tassels.",
    size: "L",
    helpful: 8,
  },
  {
    id: "3",
    userName: "Anita M.",
    rating: 5,
    date: "2024-01-05",
    verified: true,
    title: "Perfect for festive occasions",
    comment:
      "Wore this for Diwali celebrations and it was perfect. The mul cotton is so comfortable even for long hours. The packaging was also very premium.",
    size: "S",
    helpful: 15,
  },
];

const toReview = (review: StoreReview): Review => ({
  id: review._id,
  userName: review.customerName || "Vani customer",
  rating: review.rating,
  date: review.createdAt,
  verified: Boolean(review.verifiedPurchase),
  title: review.title ?? "",
  comment: review.body,
  size: "—",
  helpful: 0,
});

const OBJECT_ID = /^[0-9a-f]{24}$/i;

export default function ProductReviews({ productId, apiProductId }: ProductReviewsProps) {
  const { isAuthenticated, user } = useAuth();
  const live = isApiConfigured();
  const backendId = apiProductId && OBJECT_ID.test(apiProductId) ? apiProductId : null;

  const [reviews, setReviews] = useState<Review[]>(live && backendId ? [] : mockReviews);
  const [loading, setLoading] = useState(Boolean(live && backendId));
  const [sortBy, setSortBy] = useState<"newest" | "helpful" | "rating">("newest");
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const [writing, setWriting] = useState(false);
  const [draft, setDraft] = useState({ rating: 5, title: "", body: "" });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState("");

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
        if (!cancelled) setReviews(result.map(toReview));
      } catch {
        if (!cancelled) setReviews([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [live, backendId]);

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

  const handleSubmitReview = async () => {
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
      setNotice("Thank you! Your review is published.");
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
            <div className="text-4xl font-bold text-gray-900">{averageRating.toFixed(1)}</div>
            <div>
              <div className="flex items-center mb-1">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} width="20" height="20" viewBox="0 0 24 24" fill={i < Math.round(averageRating) ? "#fbbf24" : "#e5e7eb"}>
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                ))}
              </div>
              <div className="text-sm text-gray-600">
                {loading ? "Loading reviews…" : `${total} review${total === 1 ? "" : "s"}`}
              </div>
            </div>
          </div>
          {!live && (
            <p className="text-xs text-amber-700">
              Sample reviews — the live review feed appears once the storefront is connected to the backend.
            </p>
          )}
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
            onClick={() => setFilterRating(null)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
              filterRating === null ? "bg-[#881337] text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            All
          </button>
          {[5, 4, 3, 2, 1].map((rating) => (
            <button
              key={rating}
              onClick={() => setFilterRating(rating)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                filterRating === rating ? "bg-[#881337] text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {rating}★ ({ratingDistribution.find((entry) => entry.stars === rating)?.count || 0})
            </button>
          ))}
        </div>

        <select
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value as typeof sortBy)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#881337] focus:border-transparent"
        >
          <option value="newest">Newest First</option>
          <option value="helpful">Most Helpful</option>
          <option value="rating">Highest Rating</option>
        </select>
      </div>

      {notice && (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</p>
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
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill={i < review.rating ? "#fbbf24" : "#e5e7eb"}>
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
                {review.images && (
                  <div className="flex gap-2">
                    {review.images.map((image, imgIndex) => (
                      // eslint-disable-next-line @next/next/no-img-element -- review photos are customer uploads, not optimised assets
                      <img
                        key={imgIndex}
                        src={image}
                        alt={`Review ${imgIndex + 1}`}
                        className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                <span className="flex items-center gap-2 text-sm text-gray-600">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M7 10v12l4-4 4 4V10M7 10l5-7 5 7M7 10H3" />
                  </svg>
                  Helpful ({review.helpful})
                </span>
                <span className="text-sm text-gray-400">Report</span>
              </div>
            </motion.div>
          ))}

        {!loading && sorted.length === 0 && (
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
              onClick={() => {
                setWriting(true);
                setNotice("");
              }}
              className="bg-[#881337] text-white px-8 py-3 rounded-xl font-semibold hover:bg-[#701a35] transition"
            >
              Write a Review
            </button>
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <h4 className="font-serif text-lg text-gray-900">Share your experience</h4>
            {live && !isAuthenticated && (
              <p className="mt-2 text-sm text-amber-700">
                You need to sign in before a review can be published.
              </p>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Your rating</span>
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setDraft((current) => ({ ...current, rating: value }))}
                  aria-label={`${value} star`}
                  className={`text-2xl leading-none transition ${value <= draft.rating ? "text-amber-400" : "text-gray-300"}`}
                >
                  ★
                </button>
              ))}
            </div>
            <input
              value={draft.title}
              onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
              placeholder="Headline (optional)"
              className="mt-4 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-[#881337] focus:ring-2 focus:ring-[#881337]/15 focus:outline-none"
            />
            <textarea
              value={draft.body}
              onChange={(event) => setDraft((current) => ({ ...current, body: event.target.value }))}
              rows={4}
              placeholder={`How did it fit, feel and look? (signed in as ${user?.firstName ?? "guest"})`}
              className="mt-3 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-[#881337] focus:ring-2 focus:ring-[#881337]/15 focus:outline-none"
            />
            {formError && <p className="mt-3 text-sm text-rose-700">{formError}</p>}
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                onClick={() => void handleSubmitReview()}
                disabled={submitting}
                className="rounded-xl bg-[#881337] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#701a35] disabled:cursor-not-allowed disabled:bg-stone-400"
              >
                {submitting ? "Publishing…" : "Publish review"}
              </button>
              <button
                onClick={() => {
                  setWriting(false);
                  setFormError("");
                }}
                className="rounded-xl border-2 border-gray-200 px-6 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
