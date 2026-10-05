"use client";

import { Badge, ButtonGhost, ButtonPrimary, Card, EmptyState, IconStar, PageHeader } from "@/lib/account-ui";

const REVIEWS = [
  {
    id: 1,
    product: "Gulab Bagh Handblock Mul Cotton Saree",
    rating: 5,
    title: "Absolutely gorgeous!",
    text: "The fabric is so soft and the print is stunning. Perfect for summer evenings.",
    date: "10 Oct 2024",
    status: "Published",
  },
  {
    id: 2,
    product: "Rani Bagru Silk Saree",
    rating: 4,
    title: "Beautiful silk, slight color difference",
    text: "Colour is a bit darker than photos, but the silk quality is excellent.",
    date: "22 Sep 2024",
    status: "Published",
  },
];

const PENDING = [
  {
    id: 3,
    product: "Madhubani Handpainted Dupatta",
    date: "28 Sep 2024",
  },
];

function Stars({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill={i <= value ? "#dfc28c" : "none"}
          stroke="#dfc28c"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 3l2.4 4.86 5.36.78-3.88 3.78.92 5.34L12 15.24 7.2 17.76l.92-5.34L4.24 8.64l5.36-.78z" />
        </svg>
      ))}
    </div>
  );
}

export default function ReviewsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Feedback"
        title="My Reviews"
        subtitle={`${REVIEWS.length} published · ${PENDING.length} pending`}
      />

      <p className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12.5px] text-amber-800">
        <strong className="font-semibold">Reviews shown here are sample data.</strong> Your published reviews from the live catalogue will appear here once the reviews API is connected.
      </p>


      {/* Pending */}
      {PENDING.length > 0 && (
        <Card
          title="Awaiting your review"
          description="Share your thoughts on these purchases"
          className="mb-5"
        >
          <ul className="divide-y divide-[#f0ebe3]">
            {PENDING.map((p) => (
              <li key={p.id} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#faf7f2] to-[#f0ebe3] text-[18px] font-bold text-[#881337] ring-1 ring-[#ebe6de]">
                  {p.product.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold">{p.product}</p>
                  <p className="mt-0.5 text-[11.5px] text-stone-500">
                    Delivered on {p.date}
                  </p>
                </div>
                <ButtonPrimary>Write review</ButtonPrimary>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Published */}
      <Card title="Published reviews">
        {REVIEWS.length === 0 ? (
          <EmptyState
            icon={<IconStar />}
            title="No reviews yet"
            description="Reviews you write will appear here."
          />
        ) : (
          <ul className="space-y-5">
            {REVIEWS.map((r) => (
              <li
                key={r.id}
                className="rounded-xl border border-[#f0ebe3] bg-[#faf7f2]/40 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-[12.5px] font-semibold text-stone-500">
                      {r.product}
                    </p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <Stars value={r.rating} />
                      <span className="text-[11.5px] text-stone-500">
                        {r.date}
                      </span>
                    </div>
                  </div>
                  <Badge tone="success" dot>{r.status}</Badge>
                </div>

                <p className="mt-3 text-[13px] font-semibold text-stone-900">
                  {r.title}
                </p>
                <p className="mt-1 text-[12.5px] leading-relaxed text-stone-600">
                  {r.text}
                </p>

                <div className="mt-3 flex gap-2">
                  <ButtonGhost>Edit</ButtonGhost>
                  <ButtonGhost>Delete</ButtonGhost>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}