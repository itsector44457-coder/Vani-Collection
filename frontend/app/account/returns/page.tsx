"use client";

import { Badge, ButtonGhost, ButtonPrimary, Card, EmptyState, IconReturn, PageHeader } from "@/lib/account-ui";

const RETURNS = [
  {
    id: "RT-2410-882",
    orderId: "VC-4602",
    item: "Indigo Dabu Cotton Kurta Set",
    reason: "Size too small",
    status: "Refund processed",
    amount: 1899,
    date: "25 Aug 2024",
    refunded: true,
  },
  {
    id: "RT-2409-771",
    orderId: "VC-4655",
    item: "Chanderi Zari Kurta",
    reason: "Received damaged",
    status: "Under review",
    amount: 2199,
    date: "18 Sep 2024",
    refunded: false,
  },
];

const tone = (s: string) =>
  s === "Refund processed"
    ? "success"
    : s === "Under review"
    ? "warning"
    : s === "Rejected"
    ? "danger"
    : "info";

export default function ReturnsPage() {
  return (
    <>
      <PageHeader
        eyebrow="After sales"
        title="Returns & Refunds"
        subtitle="Track and manage your returns. Free pickup on all orders."
        action={<ButtonPrimary>Start a return</ButtonPrimary>}
      />

      {RETURNS.length === 0 ? (
        <EmptyState
          icon={<IconReturn />}
          title="No returns yet"
          description="Any returns you initiate will appear here."
        />
      ) : (
        <div className="space-y-4">
          {RETURNS.map((r) => (
            <Card key={r.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-3">
                    <p className="text-[14px] font-semibold">#{r.id}</p>
                    <Badge tone={tone(r.status) as any} dot>
                      {r.status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-[12px] text-stone-500">
                    Order #{r.orderId} · Initiated on {r.date}
                  </p>
                </div>
                <p className="font-serif text-[18px] font-semibold">
                  ₹{r.amount.toLocaleString("en-IN")}
                </p>
              </div>

              <div className="mt-5 flex items-start gap-4 border-t border-[#f0ebe3] pt-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#faf7f2] to-[#f0ebe3] text-[18px] font-bold text-[#881337] ring-1 ring-[#ebe6de]">
                  {r.item.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold">{r.item}</p>
                  <p className="mt-0.5 text-[11.5px] text-stone-500">
                    Reason: {r.reason}
                  </p>
                  {r.refunded && (
                    <p className="mt-1 text-[11.5px] font-semibold text-emerald-600">
                      Refund credited to original payment method
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <ButtonGhost>View details</ButtonGhost>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}