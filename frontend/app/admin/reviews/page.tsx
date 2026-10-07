"use client";

import { useMemo, useState } from "react";
import {
  Alert,
  Badge,
  ButtonGhost,
  ButtonPrimary,
  Card,
  EmptyState,
  Field,
  Modal,
  PageHeading,
  StatCard,
  Textarea,
  type BadgeTone,
} from "@/lib/admin-ui";
import AdminDataBadge from "@/components/admin/AdminDataBadge";
import {
  api,
  ApiError,
  REVIEW_STATUSES,
  reviewProductLabel,
  reviewStatusLabel,
  type AdminReview,
} from "@/lib/api-client";
import { useApiResource } from "@/lib/use-api";

const DEMO_REVIEWS: AdminReview[] = [
  { _id: "r1", productId: "p1", productTitle: "Chunri Bandhani Saree in Deep Wine", rating: 5, title: "Worth every rupee", body: "The bandhani work is finer in person than in the photos. Wore it to a wedding in Guna and got endless compliments.", customerName: "Meera Joshi", status: "pending", verifiedPurchase: true, helpfulCount: 8, createdAt: new Date(Date.now() - 3600e3 * 5).toISOString() },
  { _id: "r2", productId: "p2", productTitle: "Hand Block Print Cotton Kurti", rating: 4, title: "Lovely print, runs large", body: "Beautiful ajrakh tones. I would size down — the M fits like an L.", customerName: "Ananya Rao", status: "published", verifiedPurchase: true, helpfulCount: 14, adminReply: "Thank you Ananya — we have added a fit note to the size guide.", createdAt: new Date(Date.now() - 86400e3 * 2).toISOString() },
  { _id: "r3", productId: "p3", productTitle: "Zari Woven Silk Dupatta", rating: 2, title: "Zari frayed after one wash", body: "Disappointed. The border started fraying after a single dry clean.", customerName: "Ritika Menon", status: "pending", verifiedPurchase: true, helpfulCount: 3, createdAt: new Date(Date.now() - 86400e3 * 4).toISOString() },
  { _id: "r4", productId: "p4", productTitle: "Gotapatti Festive Lehenga Set", rating: 5, title: "Stunning craftsmanship", body: "The gota work is meticulous. Packing was excellent too.", customerName: "Sana Kapoor", status: "rejected", verifiedPurchase: false, helpfulCount: 0, createdAt: new Date(Date.now() - 86400e3 * 9).toISOString() },
];

type StatusFilter = (typeof REVIEW_STATUSES)[number] | "all";
const STATUS_OPTIONS: StatusFilter[] = ["all", ...REVIEW_STATUSES];

const statusTone = (status: string): BadgeTone =>
  status === "published" ? "success" : status === "rejected" ? "neutral" : "warning";

function Stars({ rating, className = "" }: { rating: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`} aria-label={`${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <svg key={star} width="13" height="13" viewBox="0 0 24 24" fill={star <= rating ? "#dfc28c" : "none"} stroke={star <= rating ? "#dfc28c" : "#d6d3d1"} strokeWidth="1.6">
          <path d="M12 2l2.9 6.3 6.8.8-5 4.7 1.3 6.7L12 17.3 6 20.5l1.3-6.7-5-4.7 6.8-.8L12 2z" strokeLinejoin="round" />
        </svg>
      ))}
    </span>
  );
}

export default function ReviewsPage() {
  const [status, setStatus] = useState<StatusFilter>("pending");
  const [ratingFilter, setRatingFilter] = useState<string>("all");
  const [replying, setReplying] = useState<AdminReview | null>(null);
  const [replyText, setReplyText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // One unfiltered fetch: the status tabs need truthful counts for every bucket, and the rating
  // chips slice the same array, so filtering server-side per tab would make the badges lie.
  const reviews = useApiResource<{ data: AdminReview[] }>((signal) => api.reviews(undefined, signal), { data: DEMO_REVIEWS });
  const all = reviews.data.data;

  const counts = useMemo(() => {
    const byStatus: Record<string, number> = { all: all.length };
    for (const value of REVIEW_STATUSES) byStatus[value] = all.filter((review) => review.status === value).length;
    return byStatus;
  }, [all]);

  const rows = useMemo(() => {
    let list = status === "all" ? all : all.filter((review) => review.status === status);
    if (ratingFilter !== "all") list = list.filter((review) => review.rating === Number(ratingFilter));
    return list;
  }, [all, status, ratingFilter]);

  const pending = counts.pending ?? 0;
  const live = useMemo(() => {
    const published = all.filter((review) => review.status === "published");
    const average = published.length ? published.reduce((sum, review) => sum + review.rating, 0) / published.length : 0;
    return { count: published.length, average };
  }, [all]);

  const moderate = async (review: AdminReview, next: "published" | "rejected") => {
    setBusy(true);
    setError(null);
    try {
      await api.moderateReview(review._id, { status: next });
      setNotice(next === "published" ? `Published the review by ${review.customerName || "a shopper"}.` : `Rejected the review by ${review.customerName || "a shopper"}.`);
      reviews.refresh();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Could not update this review");
    } finally {
      setBusy(false);
    }
  };

  const openReply = (review: AdminReview) => {
    setReplying(review);
    setReplyText(review.adminReply ?? "");
    setError(null);
  };

  const saveReply = async () => {
    if (!replying) return;
    setBusy(true);
    setError(null);
    try {
      await api.moderateReview(replying._id, { adminReply: replyText.trim() });
      setNotice(replyText.trim() ? "Reply saved and published alongside the review." : "Reply removed.");
      setReplying(null);
      reviews.refresh();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Could not save this reply");
    } finally {
      setBusy(false);
    }
  };

  const distribution = useMemo(() => {
    const published = all.filter((review) => review.status === "published");
    const bucket: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const review of published) bucket[review.rating] = (bucket[review.rating] || 0) + 1;
    return bucket;
  }, [all]);

  return (
    <div className="space-y-5">
      <PageHeading
        eyebrow="Content"
        title="Review moderation"
        subtitle="Shopper reviews land here for approval. Approved reviews feed the storefront rating and the product-page JSON-LD."
      />
      <div className="flex justify-end">
        <AdminDataBadge resource={reviews} />
      </div>

      {pending > 0 && <Alert tone="warning">{pending} review{pending === 1 ? "" : "s"} waiting for moderation.</Alert>}
      {error && <Alert>{error}</Alert>}
      {notice && <Alert tone="success">{notice}</Alert>}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="In the queue" value={String(pending)} hint="Awaiting a decision" tone={pending > 0 ? "warning" : undefined} />
        <StatCard label="Published" value={String(live.count)} hint="Visible on the storefront" tone="success" />
        <StatCard label="Rejected" value={String(counts.rejected ?? 0)} hint="Hidden, kept for audit" />
        <StatCard label="Avg (published)" value={live.average ? live.average.toFixed(1) : "—"} hint="Out of 5" />
      </div>

      <Card
        title="Filter"
        className="!p-4"
      >
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-wrap gap-1.5">
            {STATUS_OPTIONS.map((option) => {
              const active = option === status;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setStatus(option)}
                  aria-pressed={active}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12px] font-semibold capitalize transition ${
                    active ? "border-[#881337] bg-[#881337] text-white" : "border-[#ebe6de] bg-white text-stone-600 hover:border-[#dfc28c] hover:text-[#881337]"
                  }`}
                >
                  {option}
                  <span className={`rounded-full px-1.5 text-[10px] font-bold ${active ? "bg-white/20 text-white" : "bg-stone-100 text-stone-500"}`}>
                    {counts[option] ?? 0}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">Rating</span>
            <div className="flex flex-wrap gap-1.5">
              {["all", "5", "4", "3", "2", "1"].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRatingFilter(value)}
                  aria-pressed={ratingFilter === value}
                  className={`rounded-full border px-3 py-1.5 text-[12px] font-semibold transition ${
                    ratingFilter === value ? "border-[#dfc28c] bg-[#fdf8ee] text-[#8a6d2f]" : "border-[#ebe6de] bg-white text-stone-600 hover:border-[#dfc28c]"
                  }`}
                >
                  {value === "all" ? "All" : `${value} ★`}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {rows.length === 0 ? (
            <Card title="No reviews match">
              <EmptyState title="Nothing in this filter" hint="Try a different status or rating." />
            </Card>
          ) : (
            rows.map((review) => (
              <Card key={review._id} title={reviewProductLabel(review)} badge={<Badge tone={statusTone(review.status)} dot>{reviewStatusLabel(review.status)}</Badge>}>
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <Stars rating={review.rating} />
                    <span className="text-[13px] font-semibold text-[#14100f]">{review.title}</span>
                    {review.verifiedPurchase && <Badge tone="success">Verified purchase</Badge>}
                  </div>

                  <p className="text-[13px] leading-relaxed text-stone-600">{review.body}</p>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-stone-400">
                    <span>by {review.customerName || "Anonymous"}</span>
                    <span>{new Date(review.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</span>
                    {review.helpfulCount > 0 && <span>{review.helpfulCount} found this helpful</span>}
                    {review.images?.length ? <span>{review.images.length} photo{review.images.length === 1 ? "" : "s"}</span> : null}
                  </div>

                  {review.adminReply && (
                    <div className="rounded-xl border-l-2 border-[#dfc28c] bg-[#fdf8ee] px-3.5 py-2.5">
                      <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[#8a6d2f]">Your reply</p>
                      <p className="mt-1 text-[12.5px] text-stone-600">{review.adminReply}</p>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 pt-1">
                    {review.status !== "published" && (
                      <ButtonPrimary onClick={() => void moderate(review, "published")} disabled={busy || reviews.source !== "live"}>
                        Approve
                      </ButtonPrimary>
                    )}
                    {review.status !== "rejected" && (
                      <ButtonGhost onClick={() => void moderate(review, "rejected")} disabled={busy || reviews.source !== "live"}>
                        Reject
                      </ButtonGhost>
                    )}
                    <ButtonGhost onClick={() => openReply(review)} disabled={reviews.source !== "live"}>
                      {review.adminReply ? "Edit reply" : "Reply"}
                    </ButtonGhost>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        <div className="space-y-4">
          <Card title="Rating distribution">
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = distribution[star] ?? 0;
                const total = Object.values(distribution).reduce((sum, value) => sum + value, 0) || 1;
                return (
                  <div key={star} className="flex items-center gap-2.5">
                    <span className="w-8 text-[11.5px] font-semibold text-stone-500">{star} ★</span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-stone-100">
                      <span className="block h-full rounded-full bg-[#dfc28c]" style={{ width: `${Math.round((count / total) * 100)}%` }} />
                    </span>
                    <span className="w-6 text-right text-[11.5px] font-semibold text-[#14100f]">{count}</span>
                  </div>
                );
              })}
            </div>
            <p className="mt-4 border-t border-[#f0ebe3] pt-3 text-[11px] text-stone-400">
              Published reviews only. The storefront reads per-product numbers from{" "}
              <code>GET /api/reviews/summary/:productId</code>.
            </p>
          </Card>

          <Card title="Moderation policy">
            <ul className="space-y-2 text-[12px] leading-relaxed text-stone-500">
              <li>Publish anything honest about a verified purchase, including criticism.</li>
              <li>Reject spam, abuse, competitor content and unverifiable claims.</li>
              <li>Reply publicly to negative reviews — a considered reply reads better than a deletion.</li>
              <li>Rejected reviews stay in the database for audit; they never reach the storefront.</li>
            </ul>
          </Card>
        </div>
      </div>

      <Modal
        open={Boolean(replying)}
        onClose={() => setReplying(null)}
        title="Reply to this review"
        description="Your reply is shown publicly under the review, attributed to Vani Collection."
        footer={
          <>
            <ButtonGhost onClick={() => setReplying(null)}>Cancel</ButtonGhost>
            <ButtonPrimary onClick={() => void saveReply()} disabled={busy}>
              {busy ? "Saving…" : "Publish reply"}
            </ButtonPrimary>
          </>
        }
      >
        <div className="space-y-4">
          {replying && (
            <div className="rounded-xl bg-[#faf7f2] px-3.5 py-3">
              <div className="flex items-center gap-2">
                <Stars rating={replying.rating} />
                <span className="text-[12px] font-semibold text-[#14100f]">{replying.title}</span>
              </div>
              <p className="mt-1.5 text-[12.5px] text-stone-600">{replying.body}</p>
            </div>
          )}
          <Field label="Your reply" htmlFor="admin-reply" hint={`${replyText.length} / 800 characters`}>
            <Textarea id="admin-reply" rows={5} maxLength={800} value={replyText} onChange={(event) => setReplyText(event.target.value)} placeholder="Thank you for the feedback…" />
          </Field>
          {replyText.trim() && replyText.trim().length < 3 && <Alert>A reply needs a little more than that.</Alert>}
        </div>
      </Modal>
    </div>
  );
}
