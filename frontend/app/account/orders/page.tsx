"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge, ButtonGhost, Card, EmptyState, IconBox, PageHeader } from "@/lib/account-ui";

const ORDERS = [
  { id: "VC-4821", date: "12 Oct 2024", items: 2, total: 4299, status: "Shipped", eta: "16 Oct" },
  { id: "VC-4790", date: "28 Sep 2024", items: 1, total: 2499, status: "Delivered", eta: null },
  { id: "VC-4712", date: "05 Sep 2024", items: 3, total: 6798, status: "Delivered", eta: null },
  { id: "VC-4655", date: "21 Aug 2024", items: 1, total: 1899, status: "Cancelled", eta: null },
  { id: "VC-4602", date: "10 Aug 2024", items: 2, total: 3799, status: "Returned", eta: null },
];

const TABS = ["All", "Active", "Delivered", "Cancelled"] as const;

const tone = (s: string) =>
  s === "Delivered"
    ? "success"
    : s === "Shipped"
    ? "info"
    : s === "Cancelled" || s === "Returned"
    ? "danger"
    : "warning";

export default function OrdersPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("All");

  const filtered = ORDERS.filter((o) => {
    if (tab === "All") return true;
    if (tab === "Active") return o.status === "Shipped" || o.status === "Processing";
    if (tab === "Delivered") return o.status === "Delivered";
    return o.status === "Cancelled" || o.status === "Returned";
  });

  return (
    <>
      <PageHeader
        eyebrow="My purchases"
        title="My Orders"
        subtitle={`${ORDERS.length} total orders · ${ORDERS.filter((o) => o.status === "Shipped").length} in transit`}
      />

      {/* Tabs */}
      <div className="mb-5 flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-4 py-1.5 text-[12.5px] font-medium transition ${
              tab === t
                ? "bg-[#14100f] text-white"
                : "bg-white text-stone-600 ring-1 ring-[#ebe6de] hover:bg-[#faf7f2]"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<IconBox />}
          title="No orders here"
          description="Once you place an order it will appear here."
          action={
            <Link
              href="/shop"
              className="inline-flex items-center justify-center rounded-full bg-[#881337] px-5 py-2.5 text-[12.5px] font-semibold text-white transition hover:bg-[#6b0f2b]"
            >
              Start shopping
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {filtered.map((o) => (
            <Card key={o.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-3">
                    <p className="text-[14px] font-semibold">#{o.id}</p>
                    <Badge tone={tone(o.status) as any} dot>
                      {o.status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-[12px] text-stone-500">
                    Placed on {o.date} · {o.items} item{o.items > 1 ? "s" : ""}
                  </p>
                </div>
                <p className="font-serif text-[18px] font-semibold">
                  ₹{o.total.toLocaleString("en-IN")}
                </p>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-[#f0ebe3] pt-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-to-br from-[#faf7f2] to-[#f0ebe3] text-[14px] font-bold text-[#881337] ring-1 ring-[#ebe6de]">
                    V
                  </div>
                  <div>
                    <p className="text-[12.5px] font-medium text-stone-700">
                      {o.items} {o.items === 1 ? "piece" : "pieces"}
                    </p>
                    {o.eta && (
                      <p className="text-[11px] text-stone-500">
                        Arriving by {o.eta}
                      </p>
                    )}
                  </div>
                </div>

                <div className="ml-auto flex flex-wrap gap-2">
                  <Link
                    href={`/account/orders/${o.id}`}
                    className="inline-flex items-center justify-center rounded-full border border-stone-300 bg-white px-4 py-2 text-[12px] font-semibold text-stone-700 transition hover:border-stone-400"
                  >
                    View details
                  </Link>
                  {o.status === "Shipped" && (
                    <Link
                      href="/account/track"
                      className="inline-flex items-center justify-center rounded-full bg-[#881337] px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-[#6b0f2b]"
                    >
                      Track order
                    </Link>
                  )}
                  {o.status === "Delivered" && (
                    <ButtonGhost>Buy again</ButtonGhost>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}