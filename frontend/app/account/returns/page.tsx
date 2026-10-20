"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Badge, ButtonGhost, ButtonPrimary, Card, EmptyState, IconReturn, PageHeader } from "@/lib/account-ui";
import { useAuth } from "@/context/AuthContext";
import { isApiConfigured } from "@/lib/api-client";
import { getMyReturns, requestReturn, type MyReturnRequest } from "@/lib/storefront-api";
import type { OrderLine, StoreOrder } from "@/lib/storefront-types";
import { useMyOrders } from "@/lib/use-storefront";

type Tone = "success" | "neutral" | "gold" | "warning" | "danger" | "info";

const RETURN_REASONS = [
  "Size too small",
  "Size too large",
  "Fit is not right",
  "Received damaged or defective",
  "Wrong item delivered",
  "Colour or fabric not as expected",
  "Changed my mind",
];

const CONDITIONS = [
  "Unused, tags attached",
  "Tried on only, tags attached",
  "Received damaged or defective",
  "Used or washed",
];

const STATUS_LABELS: Record<string, string> = {
  requested: "Request mil gayi",
  approved: "Approved",
  rejected: "Reject",
  pickup_scheduled: "Pickup tay hai",
  received: "Item mil gaya",
  quality_check: "Quality jaanch",
  refund_pending: "Refund prakriya me",
  completed: "Poora ho gaya",
};

const STATUS_NEXT_STEP: Record<string, string> = {
  requested: "Hamari team request ki samiksha karegi. Status email aur yahi page par milega.",
  approved: "Request manzoor hai. Pickup ki jaankari team dwara confirm ki jayegi.",
  rejected: "Yeh request manzoor nahi ho payi. Koi galti lagti ho to support se sampark kare.",
  pickup_scheduled: "Pickup tay hai. Item ko original packing aur tags ke saath taiyaar rakhe.",
  received: "Item hamare paas pahunch gaya hai aur quality jaanch ke liye taiyaar hai.",
  quality_check: "Item ki quality jaanch chal rahi hai.",
  refund_pending: "Refund prakriya me hai. Bank/payment partner ka samay alag lag sakta hai.",
  completed: "Yeh return/exchange prakriya poori ho gayi hai.",
};

const LADDER = ["requested", "approved", "pickup_scheduled", "received", "quality_check", "refund_pending", "completed"];
const DAY_MS = 24 * 60 * 60 * 1000;

const money = (value: number) => `₹${value.toLocaleString("en-IN")}`;
const formatDate = (value?: string) => value
  ? new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
  : "—";

const returnTone = (status: string): Tone => {
  if (status === "completed") return "success";
  if (status === "rejected") return "danger";
  if (status === "requested") return "warning";
  if (["approved", "pickup_scheduled"].includes(status)) return "gold";
  return "info";
};

const recordOrderId = (record: MyReturnRequest): string => typeof record.orderId === "string" ? record.orderId : record.orderId._id;
const deliveredAt = (order: StoreOrder): Date | null => {
  const delivered = order.statusHistory?.find((entry) => entry.status === "delivered")?.at;
  const fallback = delivered ?? order.updatedAt ?? order.createdAt;
  const date = fallback ? new Date(fallback) : null;
  return date && Number.isFinite(date.getTime()) ? date : null;
};

function ReturnsContent() {
  const searchParams = useSearchParams();
  const requestedOrderId = searchParams.get("order") ?? "";
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const live = isApiConfigured();
  const { data: orders, loading: ordersLoading, error: ordersError, refresh: refreshOrders } = useMyOrders(isAuthenticated);

  const [records, setRecords] = useState<MyReturnRequest[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [recordsError, setRecordsError] = useState("");
  const [recordsNonce, setRecordsNonce] = useState(0);
  const [now] = useState(() => Date.now());

  const [formOpen, setFormOpen] = useState(Boolean(requestedOrderId));
  const [orderId, setOrderId] = useState(requestedOrderId);
  const [type, setType] = useState<"return" | "exchange">("return");
  const [reason, setReason] = useState(RETURN_REASONS[0]);
  const [condition, setCondition] = useState(CONDITIONS[0]);
  const [details, setDetails] = useState("");
  const [desiredSize, setDesiredSize] = useState("");
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const refreshReturns = useCallback(() => setRecordsNonce((value) => value + 1), []);

  useEffect(() => {
    if (!live || !isAuthenticated) return;
    const controller = new AbortController();
    let cancelled = false;
    const load = async () => {
      await Promise.resolve();
      if (cancelled) return;
      setRecordsLoading(true);
      try {
        const data = await getMyReturns(controller.signal);
        if (!cancelled) {
          setRecords(data);
          setRecordsError("");
        }
      } catch (cause) {
        if ((cause as Error)?.name === "AbortError") return;
        if (!cancelled) setRecordsError((cause as Error)?.message || "Returns history load nahi ho payi.");
      } finally {
        if (!cancelled) setRecordsLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [isAuthenticated, live, recordsNonce]);

  const requestedQuantities = useMemo(() => {
    const byOrderSku = new Map<string, number>();
    for (const record of records) {
      if (record.status === "rejected") continue;
      const recordOrder = recordOrderId(record);
      for (const item of record.items ?? []) {
        const key = `${recordOrder}:${item.sku}`;
        byOrderSku.set(key, (byOrderSku.get(key) ?? 0) + Number(item.quantity || 0));
      }
    }
    return byOrderSku;
  }, [records]);

  const remainingFor = useCallback((order: StoreOrder, line: OrderLine) => {
    const already = requestedQuantities.get(`${order._id}:${line.sku}`) ?? 0;
    return Math.max(0, line.quantity - already);
  }, [requestedQuantities]);

  const eligibleOrders = useMemo(() => orders.filter((order) => {
    if (!["delivered", "return_requested"].includes(order.status)) return false;
    const delivered = deliveredAt(order);
    if (!delivered || now - delivered.getTime() > 7 * DAY_MS) return false;
    return order.items.some((line) => line.sku && remainingFor(order, line) > 0);
  }), [now, orders, remainingFor]);

  const expiredDeliveredCount = useMemo(() => orders.filter((order) => {
    if (!["delivered", "return_requested"].includes(order.status)) return false;
    const delivered = deliveredAt(order);
    return delivered ? now - delivered.getTime() > 7 * DAY_MS : false;
  }).length, [now, orders]);

  const selectedOrder = eligibleOrders.find((order) => order._id === orderId) ?? eligibleOrders[0] ?? null;
  const selectedLines = selectedOrder?.items.filter((line) => line.sku && remainingFor(selectedOrder, line) > 0) ?? [];

  const selectionKey = (sku: string) => selectedOrder ? `${selectedOrder._id}:${sku}` : sku;
  const selectedPayload = selectedOrder ? selectedLines
    .filter((line) => checked[selectionKey(line.sku)])
    .map((line) => {
      const remaining = remainingFor(selectedOrder, line);
      const quantity = Math.min(Math.max(1, quantities[selectionKey(line.sku)] ?? 1), remaining);
      return { line, quantity, remaining };
    }) : [];

  const grossEstimate = selectedPayload.reduce((sum, entry) => sum + entry.line.unitPrice * entry.quantity, 0);
  const refundEstimate = selectedOrder && type === "return"
    ? Math.round(grossEstimate * (selectedOrder.amounts.subtotal > 0
      ? Math.max(0, (selectedOrder.amounts.subtotal - selectedOrder.amounts.discount) / selectedOrder.amounts.subtotal)
      : 1))
    : 0;

  const remainingWindow = selectedOrder ? deliveredAt(selectedOrder) : null;
  const daysLeft = remainingWindow
    ? Math.max(0, Math.ceil((remainingWindow.getTime() + 7 * DAY_MS - now) / DAY_MS))
    : 0;

  const openReturns = records.filter((record) => !["completed", "rejected"].includes(record.status)).length;
  const orderById = useMemo(() => new Map(orders.map((order) => [order._id, order])), [orders]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setNotice("");
    if (!live || !isAuthenticated) {
      setError("Return request ke liye sign in kare.");
      return;
    }
    if (!selectedOrder) {
      setError("Return window me koi delivered order nahi mila.");
      return;
    }
    if (selectedPayload.length === 0) {
      setError("Kam se kam ek item chune.");
      return;
    }
    if (selectedPayload.some((entry) => !Number.isInteger(entry.quantity) || entry.quantity < 1 || entry.quantity > entry.remaining)) {
      setError("Har item ki quantity uplabdh quantity ke andar rakhe.");
      return;
    }
    if (type === "exchange" && !desiredSize.trim()) {
      setError("Exchange ke liye chahiye wala size likhe.");
      document.getElementById("return-desired-size")?.focus();
      return;
    }

    const reasonParts = [reason];
    if (type === "exchange" && desiredSize.trim()) reasonParts.push(`Desired size: ${desiredSize.trim()}`);
    if (details.trim()) reasonParts.push(details.trim());
    const combinedReason = reasonParts.join(" — ");

    setBusy(true);
    try {
      const created = await requestReturn({
        orderId: selectedOrder._id,
        type,
        items: selectedPayload.map((entry) => ({
          sku: entry.line.sku,
          quantity: entry.quantity,
          reason: combinedReason,
          condition,
        })),
      });
      setRecords((previous) => [created, ...previous.filter((record) => record._id !== created._id)]);
      setNotice(`Request ${created.returnNumber} mil gayi hai. Team ki samiksha ke baad agla status yahi aur email par milega.`);
      setFormOpen(false);
      setChecked({});
      setDetails("");
      setDesiredSize("");
      refreshOrders();
      refreshReturns();
    } catch (cause) {
      setError((cause as Error)?.message || "Return request submit nahi ho payi.");
    } finally {
      setBusy(false);
    }
  };

  const lineForRecordItem = (record: MyReturnRequest, sku: string): OrderLine | undefined => {
    const populatedItems = typeof record.orderId === "string" ? undefined : record.orderId.items;
    return populatedItems?.find((line) => line.sku === sku)
      ?? orderById.get(recordOrderId(record))?.items.find((line) => line.sku === sku);
  };

  const loading = authLoading || ordersLoading || recordsLoading;

  return (
    <>
      <PageHeader
        eyebrow="After sales"
        title="Returns & Exchange"
        subtitle="Delivery ke 7 din ke andar return ya size exchange ki request kare aur uska asal status yahi dekhe."
        action={(
          <ButtonPrimary type="button" disabled={!live || !isAuthenticated} onClick={() => setFormOpen((value) => !value)}>
            {formOpen ? "Form band kare" : "Return / exchange shuru kare"}
          </ButtonPrimary>
        )}
      />

      <div aria-live="polite">
        {!live && <p className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12.5px] text-amber-800">Returns service uplabdh nahi hai.</p>}
        {live && !authLoading && !isAuthenticated && <p className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12.5px] text-amber-800">Apni return request aur status dekhne ke liye sign in kare.</p>}
        {notice && <p className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[12.5px] text-emerald-800">{notice}</p>}
        {error && <p role="alert" className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[12.5px] text-rose-700">{error}</p>}
        {ordersError && (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[12.5px] text-rose-700">
            <span>Orders load nahi ho paye: {ordersError}</span>
            <button type="button" onClick={refreshOrders} className="min-h-10 font-semibold underline">Retry</button>
          </div>
        )}
        {recordsError && (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[12.5px] text-rose-700">
            <span>Return history load nahi ho payi: {recordsError}</span>
            <button type="button" onClick={refreshReturns} className="min-h-10 font-semibold underline">Retry</button>
          </div>
        )}
      </div>

      <section aria-label="Return policy summary" className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-[#ebe6de] bg-white p-4">
          <p className="font-serif text-xl font-semibold text-stone-900">7 din</p>
          <p className="mt-1 text-[12px] leading-relaxed text-stone-500">Delivery ki tareekh se request window</p>
        </div>
        <div className="rounded-2xl border border-[#ebe6de] bg-white p-4">
          <p className="font-serif text-xl font-semibold text-stone-900">{records.length}</p>
          <p className="mt-1 text-[12px] leading-relaxed text-stone-500">Kul return/exchange requests</p>
        </div>
        <div className="rounded-2xl border border-[#ebe6de] bg-white p-4">
          <p className="font-serif text-xl font-semibold text-stone-900">{openReturns}</p>
          <p className="mt-1 text-[12px] leading-relaxed text-stone-500">Abhi prakriya me</p>
        </div>
      </section>

      <p className="mb-6 rounded-2xl border border-[#ebe6de] bg-[#faf7f2] px-4 py-3 text-[12.5px] leading-relaxed text-stone-600">
        Item unused aur tags ke saath hona chahiye. Pickup aur refund ka final nirnay quality jaanch ke baad hota hai. Poori policy ke liye{" "}
        <Link href="/returns" className="font-semibold text-[#881337] hover:underline">Returns Policy</Link>{" "}padhe ya{" "}
        <Link href="/contact" className="font-semibold text-[#881337] hover:underline">support se sampark kare</Link>.
      </p>

      {formOpen && live && isAuthenticated && (
        <Card title="New return / exchange request" className="mb-6">
          {ordersLoading ? (
            <div className="space-y-3" aria-label="Delivered orders load ho rahe hai">
              <div className="h-11 animate-pulse rounded-xl bg-stone-100" />
              <div className="h-24 animate-pulse rounded-xl bg-stone-100" />
            </div>
          ) : eligibleOrders.length === 0 ? (
            <div className="text-[13px] leading-relaxed text-stone-600">
              <p>Is samay koi delivered order 7-day return window me nahi hai, ya uske saare items ke liye request pehle se chal rahi hai.</p>
              {expiredDeliveredCount > 0 && <p className="mt-2">{expiredDeliveredCount} purane delivered order ki return window band ho chuki hai.</p>}
              <Link href="/account/orders" className="mt-3 inline-flex min-h-10 items-center font-semibold text-[#881337] hover:underline">Mere orders dekhe</Link>
            </div>
          ) : selectedOrder && (
            <form onSubmit={(event) => void handleSubmit(event)}>
              <label htmlFor="return-order" className="block text-[12.5px] font-semibold text-stone-800">Delivered order</label>
              <select
                id="return-order"
                value={selectedOrder._id}
                onChange={(event) => {
                  setOrderId(event.target.value);
                  setError("");
                }}
                className="mt-1.5 min-h-11 w-full rounded-lg border border-stone-300 bg-white px-3.5 py-2.5 text-[13.5px] outline-none focus:border-[#881337] focus:ring-2 focus:ring-[#881337]/15"
              >
                {eligibleOrders.map((order) => {
                  const delivered = deliveredAt(order);
                  const left = delivered ? Math.max(0, Math.ceil((delivered.getTime() + 7 * DAY_MS - now) / DAY_MS)) : 0;
                  return (
                    <option key={order._id} value={order._id}>
                      #{order.orderNumber} · delivered {formatDate(delivered?.toISOString())} · {left} din bache
                    </option>
                  );
                })}
              </select>
              <p className="mt-2 text-[12px] text-stone-500">Is order ke liye lagbhag {daysLeft} din ki return window bachi hai.</p>

              <fieldset className="mt-5">
                <legend className="text-[12.5px] font-semibold text-stone-800">Request type</legend>
                <div className="mt-2 inline-flex flex-wrap gap-2" role="group" aria-label="Return ya exchange">
                  <button type="button" aria-pressed={type === "return"} onClick={() => setType("return")} className={`min-h-11 rounded-full px-5 text-[12.5px] font-semibold ring-1 ${type === "return" ? "bg-[#881337] text-white ring-[#881337]" : "bg-white text-stone-600 ring-stone-300"}`}>Return & refund</button>
                  <button type="button" aria-pressed={type === "exchange"} onClick={() => setType("exchange")} className={`min-h-11 rounded-full px-5 text-[12.5px] font-semibold ring-1 ${type === "exchange" ? "bg-[#881337] text-white ring-[#881337]" : "bg-white text-stone-600 ring-stone-300"}`}>Size exchange</button>
                </div>
              </fieldset>

              <fieldset className="mt-6">
                <legend className="text-[12.5px] font-semibold text-stone-800">Kaun se items bhejne hai?</legend>
                <div className="mt-3 space-y-3">
                  {selectedLines.map((line) => {
                    const key = selectionKey(line.sku);
                    const remaining = remainingFor(selectedOrder, line);
                    const isChecked = Boolean(checked[key]);
                    return (
                      <div key={key} className={`rounded-2xl border p-3.5 transition ${isChecked ? "border-[#881337]/40 bg-rose-50/40" : "border-[#ebe6de] bg-white"}`}>
                        <div className="flex items-start gap-3.5">
                          <label className="flex min-h-11 flex-1 cursor-pointer items-start gap-3">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(event) => {
                                setChecked((previous) => ({ ...previous, [key]: event.target.checked }));
                                if (event.target.checked) setQuantities((previous) => ({ ...previous, [key]: Math.min(previous[key] ?? 1, remaining) }));
                              }}
                              className="mt-1 h-5 w-5 shrink-0 accent-[#881337]"
                              aria-label={`${line.name ?? line.sku} return ke liye chune`}
                            />
                            {line.image && <Image src={line.image} alt={line.name ?? "Order item"} width={56} height={70} className="h-[70px] w-14 shrink-0 rounded-lg object-cover" />}
                            <span className="min-w-0">
                              <span className="block text-[13px] font-semibold text-stone-900">{line.name ?? line.sku}</span>
                              <span className="mt-0.5 block text-[11.5px] leading-relaxed text-stone-500">
                                SKU {line.sku}{line.size ? ` · Size ${line.size}` : ""}{line.color ? ` · ${line.color}` : ""}<br />
                                Khareede {line.quantity} · Abhi return yogya {remaining}
                              </span>
                            </span>
                          </label>
                          {isChecked && (
                            <label className="shrink-0 text-[11px] font-semibold text-stone-600">
                              Qty
                              <select
                                aria-label={`${line.name ?? line.sku} quantity`}
                                value={Math.min(quantities[key] ?? 1, remaining)}
                                onChange={(event) => setQuantities((previous) => ({ ...previous, [key]: Number(event.target.value) }))}
                                className="ml-2 min-h-11 rounded-lg border border-stone-300 bg-white px-2.5 py-2 text-[13px]"
                              >
                                {Array.from({ length: remaining }, (_, index) => index + 1).map((qty) => <option key={qty} value={qty}>{qty}</option>)}
                              </select>
                            </label>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </fieldset>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="return-reason" className="block text-[12.5px] font-semibold text-stone-800">Karan</label>
                  <select id="return-reason" value={reason} onChange={(event) => setReason(event.target.value)} className="mt-1.5 min-h-11 w-full rounded-lg border border-stone-300 bg-white px-3.5 py-2.5 text-[13.5px] outline-none focus:border-[#881337] focus:ring-2 focus:ring-[#881337]/15">
                    {RETURN_REASONS.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="return-condition" className="block text-[12.5px] font-semibold text-stone-800">Item ki sthiti</label>
                  <select id="return-condition" value={condition} onChange={(event) => setCondition(event.target.value)} className="mt-1.5 min-h-11 w-full rounded-lg border border-stone-300 bg-white px-3.5 py-2.5 text-[13.5px] outline-none focus:border-[#881337] focus:ring-2 focus:ring-[#881337]/15">
                    {CONDITIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </div>
              </div>

              {type === "exchange" && (
                <div className="mt-4">
                  <label htmlFor="return-desired-size" className="block text-[12.5px] font-semibold text-stone-800">Chahiye wala size</label>
                  <input id="return-desired-size" value={desiredSize} onChange={(event) => setDesiredSize(event.target.value)} placeholder="Jaise M, L, XL ya Free Size" className="mt-1.5 min-h-11 w-full rounded-lg border border-stone-300 bg-white px-3.5 py-2.5 text-[13.5px] outline-none focus:border-[#881337] focus:ring-2 focus:ring-[#881337]/15" />
                  <p className="mt-1 text-[11.5px] text-stone-500">Exchange usi size ki uplabdhata par nirbhar karega; team pehle stock confirm karegi.</p>
                </div>
              )}

              <div className="mt-4">
                <label htmlFor="return-details" className="block text-[12.5px] font-semibold text-stone-800">Aur jaankari (optional)</label>
                <textarea id="return-details" value={details} maxLength={300} onChange={(event) => setDetails(event.target.value)} rows={3} placeholder="Damage, galat item ya fit ke baare me jo batana chahe…" className="mt-1.5 w-full rounded-lg border border-stone-300 bg-white px-3.5 py-2.5 text-[13.5px] outline-none focus:border-[#881337] focus:ring-2 focus:ring-[#881337]/15" />
                <p className="mt-1 text-right text-[11px] text-stone-400">{details.length}/300</p>
              </div>

              {type === "return" && selectedPayload.length > 0 && (
                <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-[12.5px] leading-relaxed text-emerald-800">
                  Andaz item refund <strong>{money(refundEstimate)}</strong> hai{selectedOrder.amounts.discount > 0 ? " (coupon discount ke anupaat ke baad)" : ""}. Delivery charge aur final refund quality jaanch/policy ke baad confirm hoga.
                </p>
              )}

              <div className="mt-5 flex flex-wrap gap-2">
                <ButtonPrimary type="submit" disabled={busy}>{busy ? "Request bheji ja rahi hai…" : "Request submit kare"}</ButtonPrimary>
                <ButtonGhost type="button" onClick={() => setFormOpen(false)} disabled={busy}>Cancel</ButtonGhost>
              </div>
            </form>
          )}
        </Card>
      )}

      <section aria-labelledby="return-history-heading">
        <h2 id="return-history-heading" className="mb-4 font-serif text-[20px] font-semibold text-stone-900">Meri requests</h2>
        {loading && records.length === 0 ? (
          <div className="space-y-4" aria-label="Returns load ho rahe hai">
            {[0, 1].map((item) => <div key={item} className="h-40 animate-pulse rounded-2xl border border-[#ebe6de] bg-white" />)}
          </div>
        ) : records.length === 0 ? (
          <EmptyState
            icon={<IconReturn />}
            title="Abhi koi return request nahi hai"
            description="Delivered order ke 7 din ke andar yaha se return ya size exchange request ki ja sakti hai."
            action={eligibleOrders.length > 0 ? <ButtonPrimary type="button" onClick={() => setFormOpen(true)}>Request shuru kare</ButtonPrimary> : <Link href="/account/orders" className="inline-flex min-h-11 items-center rounded-full bg-[#881337] px-5 text-[12.5px] font-semibold text-white">Orders dekhe</Link>}
          />
        ) : (
          <div className="space-y-4">
            {records.map((record) => {
              const id = recordOrderId(record);
              const order = orderById.get(id);
              const orderNumber = typeof record.orderId === "string" ? order?.orderNumber : record.orderId.orderNumber;
              const ladderIndex = LADDER.indexOf(record.status);
              return (
                <Card key={record._id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-[15px] font-semibold text-stone-900">#{record.returnNumber}</h3>
                        <Badge tone={returnTone(record.status)} dot>{STATUS_LABELS[record.status] ?? record.status}</Badge>
                        <Badge tone="neutral">{record.type === "exchange" ? "Size exchange" : "Return"}</Badge>
                      </div>
                      <p className="mt-1.5 text-[12px] text-stone-500">
                        Request: {formatDate(record.createdAt)}{record.updatedAt ? ` · Update: ${formatDate(record.updatedAt)}` : ""}
                      </p>
                      {orderNumber && (
                        <Link href={`/account/orders/${id}`} className="mt-1 inline-flex min-h-10 items-center text-[12px] font-semibold text-[#881337] hover:underline">
                          Order #{orderNumber} dekhe
                        </Link>
                      )}
                    </div>
                    {typeof record.refundAmount === "number" && record.type !== "exchange" && (
                      <div className="text-right">
                        <p className="text-[11px] font-medium text-stone-500">{record.status === "completed" ? "Refund amount" : "Andaz refund"}</p>
                        <p className="font-serif text-[20px] font-semibold text-stone-900">{money(record.refundAmount)}</p>
                        {record.refundId && <p className="text-[11px] text-stone-500">Ref: {record.refundId}</p>}
                      </div>
                    )}
                  </div>

                  <p className="mt-4 rounded-xl bg-[#faf7f2] px-4 py-3 text-[12.5px] leading-relaxed text-stone-600">{STATUS_NEXT_STEP[record.status] ?? "Team is request par kaam kar rahi hai."}</p>

                  {record.status !== "rejected" && ladderIndex >= 0 && (
                    <ol className="mt-5 grid grid-cols-3 gap-2 text-[10.5px] sm:grid-cols-7" aria-label="Return progress">
                      {LADDER.map((status, index) => (
                        <li key={status} className="min-w-0">
                          <span className={`block h-1.5 rounded-full ${index <= ladderIndex ? "bg-[#881337]" : "bg-stone-200"}`} />
                          <span className={`mt-1.5 block leading-snug ${index === ladderIndex ? "font-semibold text-stone-900" : "text-stone-500"}`}>{STATUS_LABELS[status]}</span>
                        </li>
                      ))}
                    </ol>
                  )}

                  {record.adminNote && (
                    <p className="mt-4 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-[12.5px] leading-relaxed text-sky-900"><strong>Team ka note:</strong> {record.adminNote}</p>
                  )}

                  <details className="mt-5 border-t border-[#f0ebe3] pt-4">
                    <summary className="inline-flex min-h-11 cursor-pointer items-center text-[12.5px] font-semibold text-[#881337]">Items aur karan dekhe</summary>
                    <div className="mt-3 space-y-3">
                      {record.items.map((item, index) => {
                        const line = lineForRecordItem(record, item.sku);
                        return (
                          <div key={`${item.sku}-${index}`} className="flex items-start gap-3.5 rounded-xl bg-stone-50 p-3">
                            {line?.image ? <Image src={line.image} alt={line.name ?? "Return item"} width={48} height={60} className="h-[60px] w-12 shrink-0 rounded-lg object-cover" /> : <div className="flex h-[60px] w-12 shrink-0 items-center justify-center rounded-lg bg-white font-serif text-lg font-semibold text-[#881337]" aria-hidden="true">{(line?.name ?? item.sku).charAt(0)}</div>}
                            <div className="min-w-0">
                              <p className="text-[13px] font-semibold text-stone-900">{line?.name ?? item.sku}</p>
                              <p className="mt-0.5 text-[11.5px] leading-relaxed text-stone-500">SKU {item.sku}{line?.size ? ` · Size ${line.size}` : ""}{line?.color ? ` · ${line.color}` : ""} · Qty {item.quantity}</p>
                              <p className="mt-1 text-[12px] leading-relaxed text-stone-600"><strong>Karan:</strong> {item.reason}</p>
                              {item.condition && <p className="text-[12px] text-stone-600"><strong>Sthiti:</strong> {item.condition}</p>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </details>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}

export default function ReturnsPage() {
  return (
    <Suspense fallback={(
      <div className="space-y-4" aria-label="Returns page load ho raha hai">
        <div className="h-12 animate-pulse rounded-xl bg-stone-200" />
        <div className="h-48 animate-pulse rounded-2xl border border-[#ebe6de] bg-white" />
      </div>
    )}>
      <ReturnsContent />
    </Suspense>
  );
}
