"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge, ButtonGhost, ButtonPrimary, Card, EmptyState, IconEdit, IconStar, IconTrash, PageHeader } from "@/lib/account-ui";
import { useAuth } from "@/context/AuthContext";
import { isApiConfigured } from "@/lib/api-client";
import { deleteMyReview, getMyReviews, submitReview, updateMyReview } from "@/lib/storefront-api";
import type { OrderLine, StoreOrder, StoreReview } from "@/lib/storefront-types";
import { useMyOrders } from "@/lib/use-storefront";

interface ReviewDraft {
  rating: number;
  title: string;
  body: string;
  images: string[];
}

interface ReviewablePurchase {
  productId: string;
  order: StoreOrder;
  line: OrderLine;
}

type ReviewFilter = "all" | "published" | "pending" | "rejected";

const formatDate = (value?: string) => value
  ? new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
  : "—";

const wasDelivered = (order: StoreOrder) => ["delivered", "return_requested", "returned", "refunded"].includes(order.status)
  || Boolean(order.statusHistory?.some((entry) => entry.status === "delivered"));

const statusMeta = (status?: string): { label: string; tone: "success" | "warning" | "danger" | "neutral"; note: string } => {
  if (status === "published") return { label: "Website par live", tone: "success", note: "Yeh review product page par sabko dikh raha hai." };
  if (status === "rejected") return { label: "Reject", tone: "danger", note: "Yeh review website par publish nahi hua. Aap ise sudhar kar dobara bhej sakte hai." };
  return { label: "Samiksha me", tone: "warning", note: "Team ki samiksha ke baad hi review website par dikhega." };
};

function Stars({ rating, label }: { rating: number; label?: string }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-amber-500" role="img" aria-label={label ?? `${rating} / 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <svg key={star} width="17" height="17" viewBox="0 0 24 24" fill={star <= rating ? "currentColor" : "#e7e5e4"} aria-hidden="true">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </span>
  );
}

function ReviewEditor({
  initial,
  submitLabel,
  pendingLabel,
  onCancel,
  onSubmit,
}: {
  initial: ReviewDraft;
  submitLabel: string;
  pendingLabel: string;
  onCancel: () => void;
  onSubmit: (draft: ReviewDraft) => Promise<void>;
}) {
  const [draft, setDraft] = useState<ReviewDraft>(initial);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const titleId = `review-title-${submitLabel.replace(/\W+/g, "-").toLowerCase()}`;
  const bodyId = `review-body-${submitLabel.replace(/\W+/g, "-").toLowerCase()}`;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (draft.rating < 1 || draft.rating > 5) {
      setError("1 se 5 star ke beech rating chune.");
      return;
    }
    if (draft.body.trim().length < 10) {
      setError("Review me kam se kam 10 characters likhe — kapda, fit ya quality ke baare me bataye.");
      document.getElementById(bodyId)?.focus();
      return;
    }
    setBusy(true);
    try {
      await onSubmit({ ...draft, title: draft.title.trim(), body: draft.body.trim() });
    } catch (cause) {
      setError((cause as Error)?.message || "Review submit nahi ho paya.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={(event) => void handleSubmit(event)} noValidate className="rounded-2xl border border-[#ebe6de] bg-[#faf7f2] p-4 sm:p-5">
      {error && <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-[12.5px] text-rose-700">{error}</p>}
      <fieldset>
        <legend className="text-[12.5px] font-semibold text-stone-800">Aapki rating</legend>
        <div className="mt-2 flex flex-wrap gap-1" role="radiogroup" aria-label="Star rating chune">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              role="radio"
              aria-checked={draft.rating === star}
              aria-label={`${star} star`}
              onClick={() => setDraft((previous) => ({ ...previous, rating: star }))}
              className={`flex h-11 w-11 items-center justify-center rounded-full transition ${draft.rating >= star ? "bg-amber-50 text-amber-500 ring-1 ring-amber-200" : "text-stone-300 ring-1 ring-stone-200 hover:text-amber-500"}`}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
            </button>
          ))}
          <span className="ml-2 inline-flex min-h-11 items-center text-[12.5px] font-semibold text-stone-700">{draft.rating}/5</span>
        </div>
      </fieldset>

      <div className="mt-4">
        <label htmlFor={titleId} className="block text-[12.5px] font-semibold text-stone-800">Headline (optional)</label>
        <input
          id={titleId}
          value={draft.title}
          maxLength={120}
          onChange={(event) => setDraft((previous) => ({ ...previous, title: event.target.value }))}
          placeholder="Jaise: Kapda bahut soft hai"
          className="mt-1.5 min-h-11 w-full rounded-lg border border-stone-300 bg-white px-3.5 py-2.5 text-[13.5px] outline-none focus:border-[#881337] focus:ring-2 focus:ring-[#881337]/15"
        />
      </div>

      <div className="mt-4">
        <label htmlFor={bodyId} className="block text-[12.5px] font-semibold text-stone-800">Aapka anubhav</label>
        <textarea
          id={bodyId}
          value={draft.body}
          rows={5}
          maxLength={4000}
          onChange={(event) => setDraft((previous) => ({ ...previous, body: event.target.value }))}
          placeholder="Fabric, fit, size aur quality kaisi lagi? Kya agle kharidaar ko kuch dhyaan rakhna chahiye?"
          aria-describedby={`${bodyId}-count`}
          className="mt-1.5 w-full rounded-lg border border-stone-300 bg-white px-3.5 py-2.5 text-[13.5px] leading-relaxed outline-none focus:border-[#881337] focus:ring-2 focus:ring-[#881337]/15"
        />
        <p id={`${bodyId}-count`} className="mt-1 text-right text-[11px] text-stone-400">{draft.body.trim().length}/4000 · kam se kam 10 characters</p>
      </div>

      {draft.images.length > 0 && (
        <fieldset className="mt-4">
          <legend className="text-[12.5px] font-semibold text-stone-800">Pehle se judi tasveere</legend>
          <div className="mt-2 flex flex-wrap gap-3">
            {draft.images.map((image) => (
              <div key={image} className="relative">
                <Image src={image} alt="Review ke saath judi tasveer" width={76} height={76} className="h-[76px] w-[76px] rounded-xl object-cover" />
                <button type="button" onClick={() => setDraft((previous) => ({ ...previous, images: previous.images.filter((item) => item !== image) }))} className="absolute -right-2 -top-2 flex h-11 w-11 items-center justify-center rounded-full bg-stone-900 text-base text-white shadow-md" aria-label="Yeh tasveer hataye">×</button>
              </div>
            ))}
          </div>
        </fieldset>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        <ButtonPrimary type="submit" disabled={busy}>{busy ? pendingLabel : submitLabel}</ButtonPrimary>
        <ButtonGhost type="button" onClick={onCancel} disabled={busy}>Cancel</ButtonGhost>
      </div>
    </form>
  );
}

export default function ReviewsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const live = isApiConfigured();
  const { data: orders, loading: ordersLoading, error: ordersError, refresh: refreshOrders } = useMyOrders(isAuthenticated);

  const [reviews, setReviews] = useState<StoreReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState("");
  const [reviewsNonce, setReviewsNonce] = useState(0);
  const [filter, setFilter] = useState<ReviewFilter>("all");
  const [query, setQuery] = useState("");
  const [composerProductId, setComposerProductId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const refreshReviews = useCallback(() => setReviewsNonce((value) => value + 1), []);

  useEffect(() => {
    if (!live || !isAuthenticated) return;
    const controller = new AbortController();
    let cancelled = false;
    const load = async () => {
      await Promise.resolve();
      if (cancelled) return;
      setReviewsLoading(true);
      try {
        const data = await getMyReviews(controller.signal);
        if (!cancelled) {
          setReviews(data);
          setReviewsError("");
        }
      } catch (cause) {
        if ((cause as Error)?.name === "AbortError") return;
        if (!cancelled) setReviewsError((cause as Error)?.message || "Reviews load nahi ho paye.");
      } finally {
        if (!cancelled) setReviewsLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [isAuthenticated, live, reviewsNonce]);

  const reviewedProductIds = useMemo(() => new Set(reviews.map((review) => review.productId).filter(Boolean)), [reviews]);

  const reviewablePurchases = useMemo(() => {
    const byProduct = new Map<string, ReviewablePurchase>();
    for (const order of orders) {
      if (!wasDelivered(order)) continue;
      for (const line of order.items) {
        if (!line.productId || reviewedProductIds.has(line.productId) || byProduct.has(line.productId)) continue;
        byProduct.set(line.productId, { productId: line.productId, order, line });
      }
    }
    return [...byProduct.values()];
  }, [orders, reviewedProductIds]);

  const orderLineByProduct = useMemo(() => {
    const map = new Map<string, { order: StoreOrder; line: OrderLine }>();
    for (const order of orders) {
      for (const line of order.items) {
        if (line.productId && !map.has(line.productId)) map.set(line.productId, { order, line });
      }
    }
    return map;
  }, [orders]);

  const counts = useMemo(() => ({
    all: reviews.length,
    published: reviews.filter((review) => review.status === "published").length,
    pending: reviews.filter((review) => review.status !== "published" && review.status !== "rejected").length,
    rejected: reviews.filter((review) => review.status === "rejected").length,
  }), [reviews]);

  const visibleReviews = reviews.filter((review) => {
    const statusMatches = filter === "all"
      || (filter === "pending" ? review.status !== "published" && review.status !== "rejected" : review.status === filter);
    if (!statusMatches) return false;
    const term = query.trim().toLowerCase();
    if (!term) return true;
    const purchase = orderLineByProduct.get(review.productId);
    return [review.product?.name, purchase?.line.name, review.title, review.body, review.productId]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(term));
  });

  const averageRating = reviews.length
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
    : 0;

  const createReview = async (purchase: ReviewablePurchase, draft: ReviewDraft) => {
    setError("");
    const created = await submitReview({
      productId: purchase.productId,
      orderId: purchase.order._id,
      rating: draft.rating,
      title: draft.title || undefined,
      body: draft.body,
      images: draft.images,
    });
    setReviews((previous) => [created, ...previous]);
    setComposerProductId(null);
    setNotice("Dhanyavaad! Review samiksha ke liye bhej diya gaya hai; manzoori ke baad product page par dikhega.");
    refreshReviews();
  };

  const editReview = async (review: StoreReview, draft: ReviewDraft) => {
    setError("");
    const updated = await updateMyReview(review._id, {
      rating: draft.rating,
      title: draft.title || undefined,
      body: draft.body,
      images: draft.images,
    });
    setReviews((previous) => previous.map((item) => item._id === review._id ? { ...item, ...updated, product: item.product, productId: item.productId, status: "pending" } : item));
    setEditingId(null);
    setNotice("Review update ho gaya hai aur dobara samiksha me bhej diya gaya hai.");
    refreshReviews();
  };

  const removeReview = async (review: StoreReview) => {
    setActionId(review._id);
    setError("");
    setNotice("");
    try {
      await deleteMyReview(review._id);
      setReviews((previous) => previous.filter((item) => item._id !== review._id));
      setDeletingId(null);
      if (editingId === review._id) setEditingId(null);
      setNotice("Review delete ho gaya hai. Chahe to delivered khareed par naya review likh sakte hai.");
      refreshOrders();
    } catch (cause) {
      setError((cause as Error)?.message || "Review delete nahi ho paya.");
    } finally {
      setActionId(null);
    }
  };

  const loading = authLoading || reviewsLoading || ordersLoading;

  return (
    <>
      <PageHeader
        eyebrow="Feedback"
        title="My Reviews"
        subtitle="Delivered khareed par apna asal anubhav likhe, aur bheje gaye reviews ka status yahi dekhe."
      />

      <div aria-live="polite">
        {!live && <p className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12.5px] text-amber-800">Reviews service uplabdh nahi hai.</p>}
        {live && !authLoading && !isAuthenticated && <p className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12.5px] text-amber-800">Apne reviews ke liye sign in kare.</p>}
        {notice && <p className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[12.5px] text-emerald-800">{notice}</p>}
        {error && <p role="alert" className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[12.5px] text-rose-700">{error}</p>}
        {reviewsError && (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[12.5px] text-rose-700">
            <span>Reviews load nahi ho paye: {reviewsError}</span>
            <button type="button" onClick={refreshReviews} className="min-h-10 font-semibold underline">Retry</button>
          </div>
        )}
        {ordersError && (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[12.5px] text-rose-700">
            <span>Delivered khareed load nahi ho payi: {ordersError}</span>
            <button type="button" onClick={refreshOrders} className="min-h-10 font-semibold underline">Retry</button>
          </div>
        )}
      </div>

      <section aria-label="Review summary" className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-[#ebe6de] bg-white p-4">
          <p className="font-serif text-xl font-semibold text-stone-900">{reviews.length}</p>
          <p className="mt-1 text-[12px] text-stone-500">Bheje gaye reviews</p>
        </div>
        <div className="rounded-2xl border border-[#ebe6de] bg-white p-4">
          <p className="font-serif text-xl font-semibold text-stone-900">{reviews.length ? averageRating.toFixed(1) : "—"}</p>
          <p className="mt-1 text-[12px] text-stone-500">Aapki average rating</p>
        </div>
        <div className="rounded-2xl border border-[#ebe6de] bg-white p-4">
          <p className="font-serif text-xl font-semibold text-stone-900">{reviewablePurchases.length}</p>
          <p className="mt-1 text-[12px] text-stone-500">Review likhne yogya khareed</p>
        </div>
      </section>

      <section aria-labelledby="reviewable-heading" className="mb-8">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="reviewable-heading" className="font-serif text-[20px] font-semibold text-stone-900">Review likhe</h2>
            <p className="mt-1 text-[12.5px] leading-relaxed text-stone-500">Sirf delivered orders ke products yaha dikhte hai, taaki review asal khareed se juda rahe.</p>
          </div>
          <Link href="/account/orders" className="inline-flex min-h-10 items-center text-[12.5px] font-semibold text-[#881337] hover:underline">Orders dekhe</Link>
        </div>

        {loading && reviewablePurchases.length === 0 ? (
          <div className="grid gap-4 sm:grid-cols-2" aria-label="Review yogya khareed load ho rahi hai">
            {[0, 1].map((item) => <div key={item} className="h-36 animate-pulse rounded-2xl border border-[#ebe6de] bg-white" />)}
          </div>
        ) : reviewablePurchases.length === 0 ? (
          <Card>
            <p className="text-[13px] leading-relaxed text-stone-600">
              Abhi koi delivered khareed review ke liye baaki nahi hai. Order deliver hone ke baad product yahi dikhega.
            </p>
          </Card>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {reviewablePurchases.map((purchase) => {
              const isWriting = composerProductId === purchase.productId;
              return (
                <Card key={`${purchase.order._id}-${purchase.productId}`} className="h-full">
                  <div className="flex items-start gap-4">
                    {purchase.line.image ? (
                      <Image src={purchase.line.image} alt={purchase.line.name ?? "Khareeda gaya product"} width={64} height={80} className="h-20 w-16 shrink-0 rounded-xl object-cover" />
                    ) : (
                      <div className="flex h-20 w-16 shrink-0 items-center justify-center rounded-xl bg-[#faf7f2] font-serif text-xl font-semibold text-[#881337]" aria-hidden="true">{(purchase.line.name ?? "V").charAt(0)}</div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h3 className="text-[14px] font-semibold leading-snug text-stone-900">{purchase.line.name ?? "Demo Collection product"}</h3>
                      <p className="mt-1 text-[11.5px] leading-relaxed text-stone-500">
                        {purchase.line.size ? `Size ${purchase.line.size} · ` : ""}{purchase.line.color ? `${purchase.line.color} · ` : ""}Order #{purchase.order.orderNumber} · {formatDate(purchase.order.createdAt)}
                      </p>
                      <Badge tone="success">Verified purchase</Badge>
                    </div>
                  </div>
                  {isWriting ? (
                    <div className="mt-4">
                      <ReviewEditor
                        key={purchase.productId}
                        initial={{ rating: 5, title: "", body: "", images: [] }}
                        submitLabel="Review bheje"
                        pendingLabel="Review bheja ja raha hai…"
                        onCancel={() => setComposerProductId(null)}
                        onSubmit={(draft) => createReview(purchase, draft)}
                      />
                    </div>
                  ) : (
                    <ButtonPrimary type="button" className="mt-4" onClick={() => { setComposerProductId(purchase.productId); setEditingId(null); }}>
                      Review likhe
                    </ButtonPrimary>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <section aria-labelledby="my-reviews-heading">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="my-reviews-heading" className="font-serif text-[20px] font-semibold text-stone-900">Bheje gaye reviews</h2>
            <p className="mt-1 text-[12.5px] text-stone-500">Edit kiya gaya review dobara samiksha me jata hai.</p>
          </div>
          <div className="w-full sm:w-64">
            <label htmlFor="review-search" className="sr-only">Apne reviews khoje</label>
            <input id="review-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Product ya review khoje…" className="min-h-11 w-full rounded-full border border-stone-300 bg-white px-4 text-[13px] outline-none focus:border-[#881337] focus:ring-2 focus:ring-[#881337]/15" />
          </div>
        </div>

        <div className="mb-5 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Review status filter">
          {(["all", "published", "pending", "rejected"] as const).map((item) => (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={filter === item}
              onClick={() => setFilter(item)}
              className={`min-h-11 shrink-0 rounded-full px-4 text-[12px] font-semibold ring-1 ${filter === item ? "bg-[#881337] text-white ring-[#881337]" : "bg-white text-stone-600 ring-stone-300"}`}
            >
              {item === "all" ? "Sab" : item === "published" ? "Live" : item === "pending" ? "Samiksha me" : "Reject"} · {counts[item]}
            </button>
          ))}
        </div>

        {loading && reviews.length === 0 ? (
          <div className="space-y-4" aria-label="Reviews load ho rahe hai">
            {[0, 1].map((item) => <div key={item} className="h-44 animate-pulse rounded-2xl border border-[#ebe6de] bg-white" />)}
          </div>
        ) : reviews.length === 0 ? (
          <EmptyState icon={<IconStar />} title="Abhi koi review nahi bheja" description="Delivered khareed ka anubhav upar se likhe. Aapka sachcha review dusre kharidaaro ki madad karega." />
        ) : visibleReviews.length === 0 ? (
          <Card>
            <p className="text-[13px] text-stone-600">Is filter/search me koi review nahi mila.</p>
            <button type="button" onClick={() => { setFilter("all"); setQuery(""); }} className="mt-2 min-h-10 text-[12.5px] font-semibold text-[#881337] hover:underline">Filter saaf kare</button>
          </Card>
        ) : (
          <div className="space-y-4">
            {visibleReviews.map((review) => {
              const meta = statusMeta(review.status);
              const purchase = orderLineByProduct.get(review.productId);
              const productImage = review.product?.images?.[0]?.url ?? purchase?.line.image;
              const productName = review.product?.name ?? purchase?.line.name ?? "Demo Collection product";
              const deleting = deletingId === review._id;
              const editing = editingId === review._id;
              return (
                <Card key={review._id}>
                  <article>
                    <div className="flex items-start gap-4">
                      {productImage ? (
                        <Image src={productImage} alt={productName} width={56} height={70} className="h-[70px] w-14 shrink-0 rounded-xl object-cover" />
                      ) : (
                        <div className="flex h-[70px] w-14 shrink-0 items-center justify-center rounded-xl bg-[#faf7f2] font-serif text-lg font-semibold text-[#881337]" aria-hidden="true">{productName.charAt(0)}</div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {review.product?.slug ? (
                            <Link href={`/product/${review.product.slug}`} className="text-[14px] font-semibold text-stone-900 hover:text-[#881337] hover:underline">{productName}</Link>
                          ) : (
                            <h3 className="text-[14px] font-semibold text-stone-900">{productName}</h3>
                          )}
                          <Badge tone={meta.tone} dot>{meta.label}</Badge>
                          {review.verifiedPurchase && <Badge tone="success">Verified purchase</Badge>}
                        </div>
                        <p className="mt-1 text-[11.5px] text-stone-500">
                          {formatDate(review.createdAt)}{review.updatedAt && review.updatedAt !== review.createdAt ? ` · Update ${formatDate(review.updatedAt)}` : ""}
                          {typeof review.helpfulCount === "number" && review.helpfulCount > 0 ? ` · ${review.helpfulCount} logo ko madadgar laga` : ""}
                        </p>
                        <div className="mt-2"><Stars rating={review.rating} label={`${productName} ke liye aapki rating ${review.rating} / 5`} /></div>
                      </div>
                    </div>

                    <p className="mt-3 rounded-xl bg-[#faf7f2] px-3.5 py-2.5 text-[12px] leading-relaxed text-stone-600">{meta.note}</p>

                    {editing ? (
                      <div className="mt-4">
                        <p className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-[12px] leading-relaxed text-amber-800">Dhyaan de: save karne par yeh review website se samiksha poori hone tak dobara pending status me jayega.</p>
                        <ReviewEditor
                          key={review._id}
                          initial={{ rating: review.rating, title: review.title ?? "", body: review.body, images: review.images ?? [] }}
                          submitLabel="Update karke samiksha bheje"
                          pendingLabel="Update ho raha hai…"
                          onCancel={() => setEditingId(null)}
                          onSubmit={(draft) => editReview(review, draft)}
                        />
                      </div>
                    ) : (
                      <>
                        {review.title && <h4 className="mt-4 text-[14px] font-semibold text-stone-900">{review.title}</h4>}
                        <p className="mt-1.5 whitespace-pre-line text-[13px] leading-relaxed text-stone-700">{review.body}</p>
                        {review.images && review.images.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {review.images.map((image) => (
                              <a key={image} href={image} target="_blank" rel="noreferrer" className="rounded-xl focus:outline-none focus:ring-2 focus:ring-[#881337]" aria-label="Review tasveer bade roop me dekhe">
                                <Image src={image} alt="Review tasveer" width={72} height={72} className="h-[72px] w-[72px] rounded-xl object-cover" />
                              </a>
                            ))}
                          </div>
                        )}
                        {review.adminReply && (
                          <div className="mt-4 rounded-r-xl border-l-2 border-[#881337] bg-rose-50/60 px-4 py-3">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#881337]">Demo Collection ka jawab</p>
                            <p className="mt-1 text-[12.5px] leading-relaxed text-stone-700">{review.adminReply}</p>
                          </div>
                        )}

                        {deleting ? (
                          <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-3.5" role="group" aria-label={`${productName} review delete confirm kare`}>
                            <p className="text-[12.5px] font-semibold text-rose-900">Pakka yeh review delete kare?</p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <button type="button" onClick={() => void removeReview(review)} disabled={actionId === review._id} className="min-h-10 rounded-full bg-rose-700 px-4 text-[12px] font-semibold text-white disabled:opacity-50">{actionId === review._id ? "Delete ho raha…" : "Ha, delete kare"}</button>
                              <button type="button" onClick={() => setDeletingId(null)} disabled={actionId === review._id} className="min-h-10 rounded-full border border-rose-200 bg-white px-4 text-[12px] font-semibold text-rose-800">Nahi, rakhe</button>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-5 flex flex-wrap gap-2 border-t border-[#f0ebe3] pt-4">
                            <button type="button" onClick={() => { setEditingId(review._id); setComposerProductId(null); }} className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-stone-300 px-4 text-[12px] font-semibold text-stone-700 hover:border-[#881337] hover:text-[#881337]"><IconEdit /> Edit</button>
                            <button type="button" onClick={() => setDeletingId(review._id)} className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-4 text-[12px] font-semibold text-stone-500 hover:bg-rose-50 hover:text-rose-700"><IconTrash /> Delete</button>
                            {review.product?.slug && <Link href={`/product/${review.product.slug}`} className="ml-auto inline-flex min-h-11 items-center px-3 text-[12px] font-semibold text-[#881337] hover:underline">Product dekhe</Link>}
                          </div>
                        )}
                      </>
                    )}
                  </article>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
