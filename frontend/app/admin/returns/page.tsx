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
  formatCurrency,
  RETURN_LADDER,
  RETURN_NEXT_STATES,
  returnStatusLabel,
  type AdminReturn,
} from "@/lib/api-client";
import { useApiResource } from "@/lib/use-api";

const DEMO_RETURNS: AdminReturn[] = [
  {
    _id: "t1",
    returnNumber: "RET17200000001",
    orderId: { _id: "o1", orderNumber: "VC17200000001", status: "return_requested", createdAt: new Date(Date.now() - 86400e3 * 6).toISOString(), amounts: { total: 3999 }, payment: { method: "upi", status: "paid" }, shippingAddress: { fullName: "Meera Joshi", city: "Guna", state: "Madhya Pradesh", pincode: "473001" }, items: [{ sku: "VC-SR-02-DW", name: "Chunri Bandhani Saree in Deep Wine", unitPrice: 3999, quantity: 1 }] },
    customerId: { _id: "c1", email: "meera@example.com", firstName: "Meera", lastName: "Joshi", phone: "+919800000001" },
    items: [{ sku: "VC-SR-02-DW", quantity: 1, reason: "Colour differed from the photographs", condition: "unworn, tags attached" }],
    type: "return",
    status: "requested",
    refundAmount: 3999,
    createdAt: new Date(Date.now() - 86400e3 * 1).toISOString(),
    updatedAt: new Date(Date.now() - 86400e3 * 1).toISOString(),
  },
  {
    _id: "t2",
    returnNumber: "RET17200000002",
    orderId: { _id: "o2", orderNumber: "VC17200000002", status: "return_requested", amounts: { total: 2499 }, payment: { method: "card", status: "paid" }, shippingAddress: { fullName: "Ananya Rao", city: "Pune", state: "Maharashtra", pincode: "411001" } },
    customerId: { _id: "c2", email: "ananya@example.com", firstName: "Ananya", lastName: "Rao" },
    items: [{ sku: "VC-KT-05-AJ", quantity: 1, reason: "Size too large" }],
    type: "exchange",
    status: "approved",
    adminNote: "Exchange for a size S, pickup booked with Delhivery.",
    refundAmount: 0,
    createdAt: new Date(Date.now() - 86400e3 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 86400e3 * 2).toISOString(),
  },
  {
    _id: "t3",
    returnNumber: "RET17200000003",
    orderId: { _id: "o3", orderNumber: "VC17200000003", status: "refunded", amounts: { total: 1299 }, payment: { method: "upi", status: "refunded" } },
    customerId: { _id: "c3", email: "ritika@example.com", firstName: "Ritika", lastName: "Menon" },
    items: [{ sku: "VC-DP-01-ZG", quantity: 1, reason: "Zari frayed after dry cleaning" }],
    type: "return",
    status: "completed",
    refundAmount: 1299,
    refundId: "rfnd_DEMO123456",
    adminNote: "Quality failure confirmed; refunded in full.",
    createdAt: new Date(Date.now() - 86400e3 * 12).toISOString(),
    updatedAt: new Date(Date.now() - 86400e3 * 8).toISOString(),
  },
];

type StatusFilter = "all" | (typeof RETURN_LADDER)[number] | "rejected";
const STATUS_OPTIONS: StatusFilter[] = ["all", ...RETURN_LADDER, "rejected"];

const statusTone = (status: string): BadgeTone => {
  if (status === "completed") return "success";
  if (status === "rejected") return "neutral";
  if (status === "refund_pending" || status === "quality_check") return "warning";
  if (status === "requested") return "gold";
  return "info";
};

const orderNumber = (record: AdminReturn): string =>
  typeof record.orderId === "string" ? "—" : record.orderId?.orderNumber || "—";

const customerLabel = (record: AdminReturn): string => {
  const customer = record.customerId;
  if (!customer || typeof customer === "string") return "Guest";
  return [customer.firstName, customer.lastName].filter(Boolean).join(" ") || customer.email || "Guest";
};

const customerEmail = (record: AdminReturn): string | undefined =>
  typeof record.customerId === "string" ? undefined : record.customerId?.email;

/** Position of `status` on the ladder, or -1 when the return was rejected off the ladder. */
const ladderIndex = (status: string): number => RETURN_LADDER.indexOf(status as (typeof RETURN_LADDER)[number]);

function Ladder({ status }: { status: string }) {
  const current = ladderIndex(status);
  const rejected = status === "rejected";
  return (
    <ol className="flex flex-wrap items-center gap-1.5">
      {RETURN_LADDER.map((step, index) => {
        const done = !rejected && current >= 0 && index < current;
        const active = !rejected && index === current;
        return (
          <li key={step} className="flex items-center gap-1.5">
            <span
              title={returnStatusLabel(step)}
              className={`h-2 w-2 rounded-full ${done ? "bg-[#dfc28c]" : active ? "bg-[#881337] ring-2 ring-[#881337]/25" : "bg-stone-200"}`}
            />
            {index < RETURN_LADDER.length - 1 && <span className={`h-px w-4 ${done ? "bg-[#dfc28c]" : "bg-stone-200"}`} />}
          </li>
        );
      })}
      <li className="ml-2">
        {rejected ? (
          <Badge tone="neutral" dot>Rejected</Badge>
        ) : (
          <span className="text-[11px] font-semibold text-stone-500">
            Step {current + 1} of {RETURN_LADDER.length} · {returnStatusLabel(status)}
          </span>
        )}
      </li>
    </ol>
  );
}

export default function ReturnsPage() {
  const [status, setStatus] = useState<StatusFilter>("all");
  const [selected, setSelected] = useState<AdminReturn | null>(null);
  const [transition, setTransition] = useState<{ value: string; label: string } | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const returns = useApiResource<{ data: AdminReturn[] }>((signal) => api.returns({}, signal), { data: DEMO_RETURNS });
  const all = returns.data.data;

  const counts = useMemo(() => {
    const byStatus: Record<string, number> = { all: all.length };
    for (const value of STATUS_OPTIONS) if (value !== "all") byStatus[value] = all.filter((record) => record.status === value).length;
    return byStatus;
  }, [all]);

  const rows = useMemo(() => (status === "all" ? all : all.filter((record) => record.status === status)), [all, status]);

  const stats = useMemo(() => {
    const open = all.filter((record) => ["requested", "approved", "pickup_scheduled", "received", "quality_check"].includes(record.status));
    const awaitingRefund = all.filter((record) => record.status === "refund_pending");
    const refundValue = awaitingRefund.reduce((sum, record) => sum + (record.refundAmount || 0), 0);
    const exchanges = all.filter((record) => record.type === "exchange");
    return { open: open.length, awaitingRefund: awaitingRefund.length, refundValue, exchanges: exchanges.length };
  }, [all]);

  const openTransition = (record: AdminReturn, next: { value: string; label: string }) => {
    setSelected(record);
    setTransition(next);
    setNote(record.adminNote ?? "");
    setError(null);
  };

  const apply = async () => {
    if (!selected || !transition) return;
    if (transition.value === "rejected" && note.trim().length < 3) {
      setError("A rejection needs a reason the shopper can be told.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.updateReturn(selected._id, { status: transition.value, adminNote: note.trim() || undefined });
      setNotice(`${selected.returnNumber} moved to ${returnStatusLabel(transition.value)}. The shopper has been emailed.`);
      setSelected(null);
      setTransition(null);
      returns.refresh();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Could not update this return");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeading
        eyebrow="Commerce"
        title="Returns & exchanges"
        subtitle="Every status change here emails the shopper and is written to the audit log. Rejections need a reason."
      />
      <div className="flex justify-end">
        <AdminDataBadge resource={returns} />
      </div>

      {error && <Alert>{error}</Alert>}
      {notice && <Alert tone="success">{notice}</Alert>}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Open returns" value={String(stats.open)} hint="Not yet completed or rejected" tone={stats.open > 0 ? "warning" : undefined} />
        <StatCard label="Awaiting refund" value={String(stats.awaitingRefund)} hint={stats.awaitingRefund ? `${formatCurrency(stats.refundValue)} to release` : "Queue is clear"} tone="danger" />
        <StatCard label="Exchanges" value={String(stats.exchanges)} hint="Swap rather than refund" tone="info" />
        <StatCard label="Total requests" value={String(all.length)} hint="Everything on record" />
      </div>

      <Card title="Filter by stage" className="!p-4">
        <div className="flex flex-wrap gap-1.5">
          {STATUS_OPTIONS.map((option) => {
            const active = option === status;
            return (
              <button
                key={option}
                type="button"
                onClick={() => setStatus(option)}
                aria-pressed={active}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12px] font-semibold transition ${
                  active ? "border-[#881337] bg-[#881337] text-white" : "border-[#ebe6de] bg-white text-stone-600 hover:border-[#dfc28c] hover:text-[#881337]"
                }`}
              >
                {option === "all" ? "All" : returnStatusLabel(option)}
                <span className={`rounded-full px-1.5 text-[10px] font-bold ${active ? "bg-white/20 text-white" : "bg-stone-100 text-stone-500"}`}>
                  {counts[option] ?? 0}
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      {rows.length === 0 ? (
        <Card title="Returns">
          <EmptyState title="No returns in this stage" hint="Pick another stage, or wait for shoppers to file one." />
        </Card>
      ) : (
        <div className="space-y-4">
          {rows.map((record) => {
            const next = RETURN_NEXT_STATES[record.status] ?? [];
            return (
              <Card
                key={record._id}
                title={`${record.returnNumber} · ${orderNumber(record)}`}
                badge={
                  <span className="flex items-center gap-2">
                    <Badge tone={statusTone(record.status)} dot>{returnStatusLabel(record.status)}</Badge>
                    <Badge tone={record.type === "exchange" ? "gold" : "neutral"}>{record.type === "exchange" ? "Exchange" : "Return"}</Badge>
                  </span>
                }
                action={
                  <ButtonGhost onClick={() => { setSelected(record); setTransition(null); setNote(record.adminNote ?? ""); }}>
                    View
                  </ButtonGhost>
                }
              >
                <div className="space-y-3.5">
                  <Ladder status={record.status} />

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-stone-400">Customer</p>
                      <p className="mt-1 text-[12.5px] font-semibold text-[#14100f]">{customerLabel(record)}</p>
                      {customerEmail(record) && <p className="text-[11.5px] text-stone-500">{customerEmail(record)}</p>}
                    </div>
                    <div>
                      <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-stone-400">Filed</p>
                      <p className="mt-1 text-[12.5px] text-[#14100f]">{new Date(record.createdAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}</p>
                      <p className="text-[11.5px] text-stone-500">Updated {new Date(record.updatedAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}</p>
                    </div>
                    <div>
                      <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-stone-400">Refund</p>
                      <p className="mt-1 text-[12.5px] font-semibold text-[#14100f]">{formatCurrency(record.refundAmount || 0)}</p>
                      {record.refundId && <p className="font-mono text-[11px] text-stone-500">{record.refundId}</p>}
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-[#f0ebe3]">
                    <table className="w-full text-left text-[12px]">
                      <thead className="bg-[#faf7f2] text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-500">
                        <tr>
                          <th className="px-3 py-2">SKU</th>
                          <th className="px-3 py-2">Qty</th>
                          <th className="px-3 py-2">Reason</th>
                          <th className="px-3 py-2">Condition</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#f0ebe3]">
                        {record.items.map((item, index) => (
                          <tr key={`${item.sku}-${index}`}>
                            <td className="px-3 py-2 font-mono text-[11.5px] text-[#14100f]">{item.sku || "—"}</td>
                            <td className="px-3 py-2">{item.quantity ?? 1}</td>
                            <td className="px-3 py-2 text-stone-600">{item.reason || "—"}</td>
                            <td className="px-3 py-2 text-stone-500">{item.condition || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {record.adminNote && (
                    <p className="rounded-xl border-l-2 border-[#dfc28c] bg-[#fdf8ee] px-3.5 py-2 text-[12px] text-stone-600">
                      <span className="font-semibold text-[#8a6d2f]">Note · </span>
                      {record.adminNote}
                    </p>
                  )}

                  {next.length > 0 && (
                    <div className="flex flex-wrap gap-2 border-t border-[#f0ebe3] pt-3">
                      {next.map((option) =>
                        option.tone === "danger" ? (
                          <ButtonGhost key={option.value} onClick={() => openTransition(record, option)} disabled={returns.source !== "live"} className="!border-rose-200 !text-rose-700 hover:!border-rose-300 hover:!bg-rose-50">
                            {option.label}
                          </ButtonGhost>
                        ) : (
                          <ButtonPrimary key={option.value} onClick={() => openTransition(record, option)} disabled={returns.source !== "live"}>
                            {option.label}
                          </ButtonPrimary>
                        )
                      )}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={Boolean(selected)}
        onClose={() => { setSelected(null); setTransition(null); }}
        title={transition ? `${transition.label} · ${selected?.returnNumber ?? ""}` : `Return ${selected?.returnNumber ?? ""}`}
        description={
          transition
            ? `This emails the customer and writes an audit entry. Statuses can only move forward.`
            : "Full return record"
        }
        footer={
          transition ? (
            <>
              <ButtonGhost onClick={() => { setSelected(null); setTransition(null); }}>Cancel</ButtonGhost>
              <ButtonPrimary onClick={() => void apply()} disabled={busy}>
                {busy ? "Saving…" : `Confirm: ${transition.label}`}
              </ButtonPrimary>
            </>
          ) : (
            <ButtonGhost onClick={() => setSelected(null)}>Close</ButtonGhost>
          )
        }
      >
        {selected && (
          <div className="space-y-4">
            <div className="rounded-xl bg-[#faf7f2] px-3.5 py-3 text-[12.5px] text-stone-600">
              <p><span className="font-semibold text-[#14100f]">Order</span> {orderNumber(selected)}</p>
              <p className="mt-1"><span className="font-semibold text-[#14100f]">Customer</span> {customerLabel(selected)}{customerEmail(selected) ? ` · ${customerEmail(selected)}` : ""}</p>
              <p className="mt-1"><span className="font-semibold text-[#14100f]">Items</span> {selected.items.map((item) => `${item.sku} × ${item.quantity ?? 1}`).join(", ")}</p>
              <p className="mt-1"><span className="font-semibold text-[#14100f]">Refund amount</span> {formatCurrency(selected.refundAmount || 0)}</p>
            </div>

            <Ladder status={selected.status} />

            {!transition && (
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">Move this return</p>
                <div className="flex flex-wrap gap-2">
                  {(RETURN_NEXT_STATES[selected.status] ?? []).length === 0 && (
                    <p className="text-[12.5px] text-stone-500">This return is closed — nothing left to do.</p>
                  )}
                  {(RETURN_NEXT_STATES[selected.status] ?? []).map((option) => (
                    <ButtonGhost key={option.value} onClick={() => openTransition(selected, option)} disabled={returns.source !== "live"}>
                      {option.label}
                    </ButtonGhost>
                  ))}
                </div>
              </div>
            )}

            <Field
              label={transition?.value === "rejected" ? "Reason for rejection" : "Internal note"}
              htmlFor="return-note"
              hint={transition?.value === "rejected" ? "Required — this is emailed to the shopper." : "Optional. Shared with the customer in the status email."}
            >
              <Textarea id="return-note" rows={4} maxLength={2000} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Pickup booked with Delhivery for Monday…" />
            </Field>
          </div>
        )}
      </Modal>

      <p className="text-[11.5px] text-stone-500">
        Backed by <code>GET /api/returns</code> and <code>PATCH /api/returns/:id</code>. Refunds themselves are released
        from the Refunds screen.
      </p>
    </div>
  );
}
