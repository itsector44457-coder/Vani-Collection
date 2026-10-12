"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge, Card, Input, PageHeader, ButtonPrimary, IconTruck } from "@/lib/account-ui";
import { useAuth } from "@/context/AuthContext";
import { isApiConfigured } from "@/lib/api-client";
import { orderStatusLabel, type StoreOrder } from "@/lib/storefront-types";
import { useMyOrders } from "@/lib/use-storefront";

const fmt = (value: string) =>
  new Date(value).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

export default function TrackOrderPage() {
  const { isAuthenticated } = useAuth();
  const live = isApiConfigured();
  const { data: orders, loading } = useMyOrders(isAuthenticated);

  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState(false);
  const [match, setMatch] = useState<StoreOrder | null>(null);
  const [error, setError] = useState("");

  const handleTrack = () => {
    setError("");
    setSearched(true);
    const needle = query.trim().toLowerCase();
    if (!needle) {
      setError("Enter your order ID or AWB number.");
      setMatch(null);
      return;
    }
    if (!live) {
      setError("Order tracking is unavailable because the storefront API is not configured.");
      setMatch(null);
      return;
    }
    const found =
      orders.find((order) => order.orderNumber?.toLowerCase() === needle) ??
      orders.find((order) => order._id.toLowerCase() === needle) ??
      orders.find((order) => order.shipment?.awb?.toLowerCase() === needle) ??
      null;
    setMatch(found);
    if (!found && live) setError("No order matched that ID or AWB in your account.");
  };

  const history = match?.statusHistory?.length
    ? [...match.statusHistory].map((entry, index, list) => ({
        label: orderStatusLabel(entry.status),
        date: fmt(entry.at),
        done: true,
        current: index === list.length - 1,
      }))
    : null;

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
              placeholder="e.g. VC-100234 or DL823456789IN"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <ButtonPrimary className="sm:mb-0.5" onClick={handleTrack} disabled={loading}>
            {loading ? "Loading…" : "Track order"}
          </ButtonPrimary>
        </div>
        {!isAuthenticated && live && (
          <p className="mt-3 text-[12px] text-stone-500">
            <Link href="/login?redirect=/account/track" className="font-semibold text-[#881337] hover:underline">
              Sign in
            </Link>{" "}
            to track the orders placed with your account.
          </p>
        )}
      </Card>

      {error && (
        <p className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[12.5px] text-rose-700">{error}</p>
      )}

      {/* Result */}
      <Card>
        {match ? (
          <>
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#faf7f2] text-[#881337] ring-1 ring-[#ebe6de]">
                <IconTruck />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[14px] font-semibold">#{match.orderNumber}</p>
                  <Badge tone={match.status === "delivered" ? "success" : "info"} dot>
                    {orderStatusLabel(match.status)}
                  </Badge>
                </div>
                <p className="mt-1 text-[12px] text-stone-500">
                  {match.shipment?.courier ?? "Courier pending"} · AWB {match.shipment?.awb ?? "—"}
                  {match.shipment?.trackingUrl && (
                    <>
                      {" · "}
                      <a href={match.shipment.trackingUrl} target="_blank" rel="noreferrer" className="font-semibold underline">
                        open courier tracking
                      </a>
                    </>
                  )}
                </p>
                <p className="mt-2 text-[12.5px] text-stone-700">
                  {match.shipment?.estimatedDelivery ? (
                    <>
                      Estimated delivery by{" "}
                      <span className="font-semibold">
                        {new Date(match.shipment.estimatedDelivery).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </>
                  ) : (
                    <>We&apos;ll share the delivery estimate as soon as it is dispatched.</>
                  )}
                </p>
              </div>
            </div>

            <ol className="mt-6 space-y-5">
              {(history ?? [
                { label: orderStatusLabel(match.status), date: fmt(match.createdAt), done: true, current: true },
              ]).map((step, index, list) => (
                <li key={`${step.label}-${index}`} className="relative flex gap-4 pl-1">
                  {index < list.length - 1 && <span className="absolute left-[11px] top-6 h-full w-[2px] bg-[#881337]" />}
                  <span className="relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#881337] text-[10px] font-bold text-white">
                    ✓
                  </span>
                  <div className="pb-1">
                    <p className={`text-[13px] font-semibold ${step.current ? "text-[#881337]" : "text-stone-800"}`}>
                      {step.label}
                    </p>
                    <p className="mt-0.5 text-[11.5px] text-stone-500">{step.date}</p>
                  </div>
                </li>
              ))}
            </ol>
          </>
        ) : searched ? null : (
          <p className="text-[12.5px] text-stone-500">
            Enter an order ID or AWB number to look up tracking for an order in your account.
          </p>
        )}
      </Card>
    </>
  );
}
