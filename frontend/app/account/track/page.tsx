"use client";

import { Badge, Card, Input, PageHeader, ButtonPrimary, IconTruck } from "@/lib/account-ui";
import { useState } from "react";

const TRACKING = {
  id: "VC-4821",
  courier: "Delhivery",
  awb: "DL823456789IN",
  eta: "16 Oct 2024",
  steps: [
    { label: "Order confirmed", date: "12 Oct, 4:32 PM", done: true },
    { label: "Packed at Vani Atelier, Jaipur", date: "13 Oct, 10:15 AM", done: true },
    { label: "Picked up by courier", date: "13 Oct, 6:40 PM", done: true },
    { label: "In transit — Delhi hub", date: "14 Oct, 3:20 AM", done: true, current: true },
    { label: "Out for delivery", date: "Expected 16 Oct", done: false },
    { label: "Delivered", date: "—", done: false },
  ],
};

export default function TrackOrderPage() {
  const [query, setQuery] = useState("");

  return (
    <>
      <PageHeader
        eyebrow="Delivery status"
        title="Track your order"
        subtitle="Enter your order ID or AWB number to see live updates."
      />

      <Card className="mb-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Input
              label="Order ID or AWB number"
              placeholder="e.g. VC-4821 or DL823456789IN"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <ButtonPrimary className="sm:mb-0.5">Track order</ButtonPrimary>
        </div>
      </Card>

      {/* Result */}
      <Card>
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#faf7f2] text-[#881337] ring-1 ring-[#ebe6de]">
            <IconTruck />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[14px] font-semibold">#{TRACKING.id}</p>
              <Badge tone="info" dot>In transit</Badge>
            </div>
            <p className="mt-1 text-[12px] text-stone-500">
              {TRACKING.courier} · AWB {TRACKING.awb}
            </p>
            <p className="mt-2 text-[12.5px] text-stone-700">
              Estimated delivery by{" "}
              <span className="font-semibold">{TRACKING.eta}</span>
            </p>
          </div>
        </div>

        {/* Timeline */}
        <ol className="mt-6 space-y-5">
          {TRACKING.steps.map((s, i) => (
            <li key={i} className="relative flex gap-4 pl-1">
              {/* Vertical line */}
              {i < TRACKING.steps.length - 1 && (
                <span
                  className={`absolute left-[11px] top-6 h-full w-[2px] ${
                    s.done ? "bg-[#881337]" : "bg-stone-200"
                  }`}
                />
              )}
              <span
                className={`relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                  s.done
                    ? "bg-[#881337] text-white"
                    : "border border-stone-300 bg-white text-stone-400"
                }`}
              >
                {s.done ? "✓" : i + 1}
              </span>
              <div className="pb-1">
                <p
                  className={`text-[13px] font-semibold ${
                    s.current ? "text-[#881337]" : "text-stone-800"
                  }`}
                >
                  {s.label}
                </p>
                <p className="mt-0.5 text-[11.5px] text-stone-500">{s.date}</p>
              </div>
            </li>
          ))}
        </ol>
      </Card>
    </>
  );
}