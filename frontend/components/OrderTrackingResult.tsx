import Image from "next/image";
import Link from "next/link";
import type { PublicOrderTracking } from "../lib/storefront-api";
import { orderStatusLabel } from "../lib/storefront-types";
import { formatPrice } from "../lib/utils";

const STEPS = [
  { label: "Order placed", statuses: ["pending_payment", "confirmed"] },
  { label: "Packed", statuses: ["processing", "packed"] },
  { label: "Shipped", statuses: ["shipped", "out_for_delivery"] },
  { label: "Delivered", statuses: ["delivered"] },
] as const;

const stepIndexFor = (status: string): number => {
  if (status === "delivered") return 3;
  if (status === "shipped" || status === "out_for_delivery") return 2;
  if (status === "packed" || status === "processing") return 1;
  return 0;
};

const formatDateTime = (value?: string): string => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
};

const formatDate = (value?: string): string => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
};

/** Shared tracking result — progress, courier facts, items and the real status history. */
export default function OrderTrackingResult({ tracking }: { tracking: PublicOrderTracking }) {
  const cancelled = ["cancelled", "returned", "refunded"].includes(tracking.status);
  const currentStep = stepIndexFor(tracking.status);
  const history = tracking.statusHistory.length
    ? tracking.statusHistory
    : [{ status: tracking.status, at: tracking.createdAt }];
  const isCod = tracking.paymentMethod?.toLowerCase() === "cod";

  return (
    <section aria-label={`Tracking for order ${tracking.orderNumber}`} className="rounded-3xl bg-white p-5 shadow-2xs ring-1 ring-stone-200/70 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-stone-400">Order</p>
          <h2 className="mt-1 font-serif text-2xl text-stone-900">#{tracking.orderNumber}</h2>
          <p className="mt-1 text-sm text-stone-500">Placed {formatDate(tracking.createdAt)}</p>
        </div>
        <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${tracking.status === "delivered" ? "bg-emerald-50 text-emerald-700" : cancelled ? "bg-rose-50 text-rose-700" : "bg-sky-50 text-sky-700"}`}>
          {orderStatusLabel(tracking.status)}
        </span>
      </div>

      {cancelled ? (
        <p className="mt-5 rounded-2xl bg-rose-50 px-4 py-3 text-sm leading-relaxed text-rose-800">
          Yeh order {orderStatusLabel(tracking.status).toLowerCase()} ho gaya hai. Refund ya koi sawal ho to hamari team se sampark kare — order number haath me rakhe.
        </p>
      ) : (
        <ol className="mt-7 grid grid-cols-4 gap-1" aria-label="Delivery progress">
          {STEPS.map((step, index) => {
            const done = index < currentStep || tracking.status === "delivered";
            const current = index === currentStep && tracking.status !== "delivered";
            return (
              <li key={step.label} className="relative text-center" aria-current={current ? "step" : undefined}>
                <span aria-hidden="true" className={`absolute left-0 right-0 top-4 h-0.5 ${index === 0 ? "left-1/2" : ""} ${index === STEPS.length - 1 ? "right-1/2" : ""} ${done || current ? "bg-[#881337]" : "bg-stone-200"}`} />
                <span className={`relative mx-auto flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${done ? "bg-[#881337] text-white" : current ? "bg-white text-[#881337] ring-2 ring-[#881337]" : "bg-stone-100 text-stone-400 ring-1 ring-stone-200"}`}>
                  {done ? "✓" : index + 1}
                </span>
                <span className={`mt-2 block text-[11px] font-semibold sm:text-xs ${current ? "text-[#881337]" : "text-stone-600"}`}>{step.label}</span>
              </li>
            );
          })}
        </ol>
      )}

      <div className="mt-6 grid gap-3 rounded-2xl bg-[#fdf7f0] p-4 text-sm text-stone-700 sm:grid-cols-3">
        <p>
          <span className="block text-[11px] font-bold uppercase tracking-wider text-stone-400">Courier / AWB</span>
          {tracking.shipment?.awb ? `${tracking.shipment.courier || "Courier"} · ${tracking.shipment.awb}` : "Dispatch ke baad AWB yahan dikhega"}
        </p>
        <p>
          <span className="block text-[11px] font-bold uppercase tracking-wider text-stone-400">Expected delivery</span>
          {tracking.shipment?.estimatedDelivery ? formatDate(tracking.shipment.estimatedDelivery) : "Dispatch par confirm hoga"}
        </p>
        <p>
          <span className="block text-[11px] font-bold uppercase tracking-wider text-stone-400">{isCod ? "Delivery par dena hai" : "Order total"}</span>
          {typeof tracking.total === "number" ? formatPrice(tracking.total) : "—"}{isCod ? " (Cash/UPI on delivery)" : ""}
        </p>
      </div>

      {tracking.shipment?.trackingUrl && (
        <a href={tracking.shipment.trackingUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex min-h-11 items-center rounded-full bg-[#781e36] px-5 text-sm font-semibold text-white transition hover:bg-[#64182c]">
          Courier website par live tracking dekhe ↗
        </a>
      )}

      {tracking.items.length > 0 && (
        <div className="mt-7">
          <h3 className="text-sm font-bold uppercase tracking-wider text-stone-500">Is parcel me kya hai</h3>
          <ul className="mt-3 divide-y divide-stone-100">
            {tracking.items.map((item, index) => (
              <li key={`${item.name}-${index}`} className="flex items-center gap-3 py-3">
                {item.image ? (
                  <Image src={item.image} alt="" width={52} height={64} unoptimized className="h-16 w-13 shrink-0 rounded-lg object-cover" />
                ) : (
                  <span aria-hidden="true" className="flex h-16 w-13 shrink-0 items-center justify-center rounded-lg bg-[#f4e4de] text-xs text-[#881337]">Vani</span>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-stone-800">{item.name}</p>
                  <p className="text-xs text-stone-500">{[item.size && `Size ${item.size}`, item.color, `Qty ${item.quantity}`].filter(Boolean).join(" · ")}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-7">
        <h3 className="text-sm font-bold uppercase tracking-wider text-stone-500">Status history</h3>
        <ol className="mt-3 space-y-4">
          {history.map((entry, index) => (
            <li key={`${entry.status}-${entry.at}-${index}`} className="relative flex gap-3">
              {index < history.length - 1 && <span aria-hidden="true" className="absolute left-[7px] top-5 h-[calc(100%-8px)] w-0.5 bg-stone-200" />}
              <span aria-hidden="true" className={`relative mt-1 h-4 w-4 shrink-0 rounded-full ${index === history.length - 1 ? "bg-[#881337]" : "bg-stone-300"}`} />
              <div>
                <p className="text-sm font-semibold text-stone-800">{orderStatusLabel(entry.status)}</p>
                <p className="text-xs text-stone-500"><time dateTime={entry.at}>{formatDateTime(entry.at)}</time>{entry.note ? ` · ${entry.note}` : ""}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <p className="mt-6 border-t border-stone-100 pt-4 text-sm text-stone-500">
        Kuch galat lag raha hai? <Link href="/contact" className="font-semibold text-[#781e36] hover:underline">Hamari team se baat kare</Link> — order number <strong className="text-stone-700">#{tracking.orderNumber}</strong> bataye.
      </p>
    </section>
  );
}
