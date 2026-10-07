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
  TextInput,
  type BadgeTone,
} from "@/lib/admin-ui";
import AdminDataBadge from "@/components/admin/AdminDataBadge";
import {
  api,
  ApiError,
  downloadFile,
  formatCurrency,
  formatRelativeTime,
  orderStatusLabel,
  toCsv,
  type RefundCandidate,
} from "@/lib/api-client";
import { useApiResource } from "@/lib/use-api";

const DEMO_REFUNDS: RefundCandidate[] = [
  {
    _id: "f1",
    orderNumber: "VC17200000001",
    createdAt: new Date(Date.now() - 86400e3 * 6).toISOString(),
    status: "return_requested",
    reason: "Returned after delivery",
    payment: { method: "upi", status: "paid", providerPaymentId: "pay_DEMO0001", paidAt: new Date(Date.now() - 86400e3 * 7).toISOString() },
    amounts: { subtotal: 3999, discount: 0, shipping: 0, tax: 639, total: 3999 },
    refundable: 3999,
    customer: { email: "meera@example.com", firstName: "Meera", lastName: "Joshi", phone: "+919800000001" },
    returnRequest: { id: "t1", returnNumber: "RET17200000001", status: "refund_pending", refundAmount: 3999 },
  },
  {
    _id: "f2",
    orderNumber: "VC17200000004",
    createdAt: new Date(Date.now() - 86400e3 * 2).toISOString(),
    status: "cancelled",
    reason: "Order cancelled after payment",
    payment: { method: "card", status: "paid", providerPaymentId: "pay_DEMO0004" },
    amounts: { subtotal: 2499, discount: 250, shipping: 99, tax: 360, total: 2348 },
    refundable: 2348,
    customer: { email: "sana@example.com", firstName: "Sana", lastName: "Kapoor" },
    returnRequest: null,
  },
  {
    _id: "f3",
    orderNumber: "VC17200000005",
    createdAt: new Date(Date.now() - 86400e3 * 11).toISOString(),
    status: "refunded",
    reason: "Returned after delivery",
    payment: { method: "upi", status: "refunded", providerPaymentId: "pay_DEMO0005" },
    amounts: { subtotal: 1299, discount: 0, shipping: 99, tax: 208, total: 1398 },
    refundable: 0,
    customer: { email: "ritika@example.com", firstName: "Ritika", lastName: "Menon" },
    returnRequest: { id: "t3", returnNumber: "RET17200000003", status: "completed", refundAmount: 1299, refundId: "rfnd_DEMO123456" },
  },
];

type Tab = "all" | "outstanding" | "settled";

const paymentTone = (status: string): BadgeTone =>
  status === "refunded" ? "success" : status === "paid" ? "info" : status === "failed" ? "danger" : "neutral";

const customerLabel = (row: RefundCandidate): string =>
  [row.customer?.firstName, row.customer?.lastName].filter(Boolean).join(" ") || row.customer?.name || row.customer?.email || "Guest";

export default function RefundsPage() {
  const [tab, setTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");
  const [pendingRefund, setPendingRefund] = useState<RefundCandidate | null>(null);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const refunds = useApiResource<{ data: RefundCandidate[] }>((signal) => api.refundsPending(signal), { data: DEMO_REFUNDS });
  const all = refunds.data.data;

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return all.filter((row) => {
      if (tab === "outstanding" && !(row.refundable > 0)) return false;
      if (tab === "settled" && row.payment.status !== "refunded") return false;
      if (term && !`${row.orderNumber} ${customerLabel(row)} ${row.customer?.email ?? ""}`.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [all, tab, search]);

  const stats = useMemo(() => {
    const outstanding = all.filter((row) => row.refundable > 0 && row.payment.status !== "refunded");
    const value = outstanding.reduce((sum, row) => sum + row.refundable, 0);
    const agreed = outstanding.filter((row) => row.returnRequest?.refundAmount);
    const settled = all.filter((row) => row.payment.status === "refunded");
    return { outstanding: outstanding.length, value, agreed: agreed.length, settled: settled.length };
  }, [all]);

  const openRefund = (row: RefundCandidate) => {
    setPendingRefund(row);
    // Prefer the amount support already agreed on the return request over the raw order total.
    setAmount(String(row.returnRequest?.refundAmount || row.refundable || row.amounts.total));
    setReason(row.reason || "");
    setError(null);
  };

  const submit = async () => {
    if (!pendingRefund) return;
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setError("Enter a refund amount greater than zero.");
      return;
    }
    if (value > pendingRefund.amounts.total) {
      setError(`You cannot refund more than the ${formatCurrency(pendingRefund.amounts.total)} captured on this order.`);
      return;
    }
    if (reason.trim().length < 3) {
      setError("A reason is required — it is stored on the order, emailed to the shopper and sent to Razorpay as a note.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await api.processRefund(pendingRefund._id, { amount: value, reason: reason.trim() });
      setNotice(`${formatCurrency(result.refund.amount / 100)} refunded on ${pendingRefund.orderNumber} · ${result.refund.id}`);
      setPendingRefund(null);
      refunds.refresh();
    } catch (cause) {
      // A 503 here means Razorpay keys are absent — say so plainly instead of a raw API message.
      setError(
        cause instanceof ApiError && cause.code === "PAYMENT_NOT_CONFIGURED"
          ? "Online payments are not configured on this backend (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET). Refunds have to be issued from the Razorpay dashboard."
          : cause instanceof ApiError
            ? cause.message
            : "Could not process this refund"
      );
    } finally {
      setBusy(false);
    }
  };

  const exportCsv = () => {
    const lines: (string | number | null | undefined)[][] = [
      ["Order number", "Status", "Reason", "Customer", "Email", "Payment method", "Payment status", "Order total", "Refundable", "Agreed on return", "Return number", "Refund id", "Created"],
      ...rows.map((row) => [
        row.orderNumber,
        row.status,
        row.reason,
        customerLabel(row),
        row.customer?.email ?? "",
        row.payment?.method ?? "",
        row.payment?.status ?? "",
        row.amounts?.total ?? 0,
        row.refundable ?? 0,
        row.returnRequest?.refundAmount ?? "",
        row.returnRequest?.returnNumber ?? "",
        row.returnRequest?.refundId ?? "",
        new Date(row.createdAt).toISOString(),
      ]),
    ];
    downloadFile(`vani-refunds-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(lines));
  };

  const tabs: { value: Tab; label: string; count: number }[] = [
    { value: "all", label: "All", count: all.length },
    { value: "outstanding", label: "Outstanding", count: all.filter((row) => row.refundable > 0).length },
    { value: "settled", label: "Settled", count: all.filter((row) => row.payment.status === "refunded").length },
  ];

  return (
    <div className="space-y-5">
      <PageHeading
        eyebrow="Commerce"
        title="Refunds"
        subtitle="Paid orders that were cancelled or returned. Refunding calls Razorpay, flips the order to refunded and emails the shopper."
        action={
          <ButtonGhost onClick={exportCsv} disabled={rows.length === 0}>
            Export CSV
          </ButtonGhost>
        }
      />
      <div className="flex justify-end">
        <AdminDataBadge resource={refunds} />
      </div>

      {error && <Alert>{error}</Alert>}
      {notice && <Alert tone="success">{notice}</Alert>}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Outstanding" value={String(stats.outstanding)} hint="Money still owed to shoppers" tone={stats.outstanding ? "danger" : "success"} />
        <StatCard label="Value owed" value={formatCurrency(stats.value)} hint="Sum of refundable amounts" tone="warning" />
        <StatCard label="Agreed on return" value={String(stats.agreed)} hint="Support already set an amount" tone="info" />
        <StatCard label="Settled" value={String(stats.settled)} hint="Refunds already issued" tone="success" />
      </div>

      <Card
        title="Refund queue"
        action={
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex gap-1.5">
              {tabs.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setTab(option.value)}
                  aria-pressed={tab === option.value}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12px] font-semibold transition ${
                    tab === option.value ? "border-[#881337] bg-[#881337] text-white" : "border-[#ebe6de] bg-white text-stone-600 hover:border-[#dfc28c] hover:text-[#881337]"
                  }`}
                >
                  {option.label}
                  <span className={`rounded-full px-1.5 text-[10px] font-bold ${tab === option.value ? "bg-white/20 text-white" : "bg-stone-100 text-stone-500"}`}>
                    {option.count}
                  </span>
                </button>
              ))}
            </div>
            <label className="sr-only" htmlFor="refund-search">Search refunds</label>
            <TextInput
              id="refund-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Order number or customer…"
              className="!w-56 !py-1.5 !text-[12px]"
            />
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#f0ebe3] text-[10.5px] font-semibold uppercase tracking-[0.12em] text-stone-400">
                <th className="pb-3 pr-4">Order</th>
                <th className="pb-3 pr-4">Customer</th>
                <th className="pb-3 pr-4">Why</th>
                <th className="pb-3 pr-4 text-right">Captured</th>
                <th className="pb-3 pr-4 text-right">Refundable</th>
                <th className="pb-3 pr-4">Payment</th>
                <th className="pb-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0ebe3]">
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    <EmptyState title="Nothing to refund" hint="No paid orders match this filter." />
                  </td>
                </tr>
              )}
              {rows.map((row) => {
                const settled = row.payment.status === "refunded";
                return (
                  <tr key={row._id} className="align-top transition hover:bg-[#faf7f2]/60">
                    <td className="py-3.5 pr-4">
                      <p className="font-mono text-[12.5px] font-bold text-[#14100f]">{row.orderNumber}</p>
                      <p className="mt-0.5 text-[11px] text-stone-400">{formatRelativeTime(row.createdAt)}</p>
                      <Badge tone="neutral">{orderStatusLabel(row.status)}</Badge>
                    </td>
                    <td className="py-3.5 pr-4">
                      <p className="text-[12.5px] font-semibold text-[#14100f]">{customerLabel(row)}</p>
                      {row.customer?.email && <p className="text-[11px] text-stone-500">{row.customer.email}</p>}
                      {row.customer?.phone && <p className="text-[11px] text-stone-400">{row.customer.phone}</p>}
                    </td>
                    <td className="py-3.5 pr-4">
                      <p className="text-[12px] text-stone-600">{row.reason}</p>
                      {row.returnRequest && (
                        <p className="mt-1 text-[11px] text-stone-400">
                          {row.returnRequest.returnNumber} · {row.returnRequest.status.replace(/_/g, " ")}
                          {row.returnRequest.refundAmount ? ` · agreed ${formatCurrency(row.returnRequest.refundAmount)}` : ""}
                        </p>
                      )}
                    </td>
                    <td className="py-3.5 pr-4 text-right text-[13px] text-stone-600">{formatCurrency(row.amounts.total)}</td>
                    <td className="py-3.5 pr-4 text-right">
                      <span className={`text-[13px] font-bold ${row.refundable > 0 ? "text-[#881337]" : "text-stone-400"}`}>
                        {formatCurrency(row.refundable)}
                      </span>
                    </td>
                    <td className="py-3.5 pr-4">
                      <Badge tone={paymentTone(row.payment.status)} dot>
                        {row.payment.status}
                      </Badge>
                      <p className="mt-1 text-[11px] uppercase text-stone-400">{row.payment.method}</p>
                      {row.returnRequest?.refundId && (
                        <p className="mt-1 font-mono text-[10.5px] text-stone-400">{row.returnRequest.refundId}</p>
                      )}
                    </td>
                    <td className="py-3.5 text-right">
                      {settled ? (
                        <span className="text-[12px] font-semibold text-emerald-700">Settled</span>
                      ) : (
                        <ButtonPrimary onClick={() => openRefund(row)} disabled={refunds.source !== "live" || !(row.refundable > 0)}>
                          Refund
                        </ButtonPrimary>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-4 border-t border-[#f0ebe3] pt-4 text-[11.5px] text-stone-500">
          Backed by <code>GET /api/refunds/pending</code> and <code>POST /api/refunds/:orderId</code>. Both require the
          finance, admin or super admin role, and every refund is audited.
        </p>
      </Card>

      <Modal
        open={Boolean(pendingRefund)}
        onClose={() => setPendingRefund(null)}
        title={pendingRefund ? `Refund ${pendingRefund.orderNumber}` : "Refund order"}
        description="This is irreversible — the money leaves the Razorpay balance immediately."
        footer={
          <>
            <ButtonGhost onClick={() => setPendingRefund(null)}>Cancel</ButtonGhost>
            <ButtonPrimary onClick={() => void submit()} disabled={busy}>
              {busy ? "Refunding…" : `Refund ${amount ? formatCurrency(Number(amount)) : ""}`}
            </ButtonPrimary>
          </>
        }
      >
        {pendingRefund && (
          <div className="space-y-4">
            <div className="rounded-xl bg-[#faf7f2] px-3.5 py-3 text-[12.5px] text-stone-600">
              <p><span className="font-semibold text-[#14100f]">Customer</span> {customerLabel(pendingRefund)}{pendingRefund.customer?.email ? ` · ${pendingRefund.customer.email}` : ""}</p>
              <p className="mt-1"><span className="font-semibold text-[#14100f]">Captured</span> {formatCurrency(pendingRefund.amounts.total)} via {pendingRefund.payment.method}</p>
              <p className="mt-1"><span className="font-semibold text-[#14100f]">Reason</span> {pendingRefund.reason}</p>
              {pendingRefund.returnRequest?.refundAmount ? (
                <p className="mt-1 font-semibold text-[#8a6d2f]">
                  Support agreed {formatCurrency(pendingRefund.returnRequest.refundAmount)} on {pendingRefund.returnRequest.returnNumber}.
                </p>
              ) : null}
            </div>

            <Field label="Refund amount (₹)" htmlFor="refund-amount" hint={`Maximum ${formatCurrency(pendingRefund.amounts.total)}`}>
              <TextInput id="refund-amount" type="number" min={1} step={1} value={amount} onChange={(event) => setAmount(event.target.value)} />
            </Field>

            <Field label="Reason" htmlFor="refund-reason" hint="Required. Shown in the shopper's refund email.">
              <TextInput id="refund-reason" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Returned after delivery" />
            </Field>

            <Alert tone="warning">
              The order moves to <strong>refunded</strong>, a status-history entry is written under your account, and a
              refund confirmation is queued to the email outbox.
            </Alert>
          </div>
        )}
      </Modal>
    </div>
  );
}
