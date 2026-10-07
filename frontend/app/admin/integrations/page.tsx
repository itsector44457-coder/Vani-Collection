"use client";

import { useMemo, useState } from "react";
import {
  Alert,
  Badge,
  ButtonDanger,
  ButtonGhost,
  Card,
  EmptyState,
  PageHeading,
  StatCard,
  TextInput,
  type BadgeTone,
} from "@/lib/admin-ui";
import AdminDataBadge from "@/components/admin/AdminDataBadge";
import { api, ApiError, EVENT_STATUS_LABELS, formatRelativeTime, type IntegrationEventRow } from "@/lib/api-client";
import { useApiResource } from "@/lib/use-api";

const DEMO_EVENTS: IntegrationEventRow[] = [
  { _id: "e1", provider: "email", direction: "outbound", eventType: "email.send", idempotencyKey: "email.send:order-confirmation:meera@example.com:order-confirmation:6650f1a2", entityType: "Order", entityId: "6650f1a2c3d4e5f6a7b8c9d0", status: "dead_letter", attempts: 5, nextAttemptAt: new Date(Date.now() - 3600e3 * 6).toISOString(), lastError: "SMTP error: 550 5.1.1 The email account that you tried to reach does not exist", createdAt: new Date(Date.now() - 86400e3 * 2).toISOString(), updatedAt: new Date(Date.now() - 3600e3 * 6).toISOString() },
  { _id: "e2", provider: "rishabh_erp", direction: "outbound", eventType: "order.status", idempotencyKey: "order.status:VC17200000007:packed", entityType: "Order", entityId: "6650f1a2c3d4e5f6a7b8c9d7", status: "failed", attempts: 2, nextAttemptAt: new Date(Date.now() + 10 * 60e3).toISOString(), lastError: "ERP responded 503 Service Unavailable", createdAt: new Date(Date.now() - 3600e3 * 4).toISOString(), updatedAt: new Date(Date.now() - 3600e3 * 1).toISOString() },
  { _id: "e3", provider: "shiprocket", direction: "outbound", eventType: "shipment.create", idempotencyKey: "shipment.create:SHP17200000002", entityType: "Shipment", entityId: "6650f1a2c3d4e5f6a7b8c9d8", status: "pending", attempts: 0, nextAttemptAt: new Date(Date.now() + 30e3).toISOString(), createdAt: new Date(Date.now() - 3600e3 * 1).toISOString(), updatedAt: new Date(Date.now() - 3600e3 * 1).toISOString() },
  { _id: "e4", provider: "razorpay", direction: "inbound", eventType: "payment.captured", idempotencyKey: "pay_DEMO0009", entityType: "Order", entityId: "6650f1a2c3d4e5f6a7b8c9d9", status: "succeeded", attempts: 1, createdAt: new Date(Date.now() - 3600e3 * 8).toISOString(), updatedAt: new Date(Date.now() - 3600e3 * 8).toISOString() },
  { _id: "e5", provider: "email", direction: "outbound", eventType: "email.send", idempotencyKey: "email.send:return-status:ritika@example.com:return-status:6650f1a3:quality_check", entityType: "ReturnRequest", entityId: "6650f1a2c3d4e5f6a7b8c9da", status: "dead_letter", attempts: 5, nextAttemptAt: new Date(Date.now() - 86400e3 * 1).toISOString(), lastError: "SMTP error: 452 4.2.2 Mailbox full", createdAt: new Date(Date.now() - 86400e3 * 4).toISOString(), updatedAt: new Date(Date.now() - 86400e3 * 1).toISOString() },
  { _id: "e6", provider: "rishabh_erp", direction: "outbound", eventType: "stock.update", idempotencyKey: "stock.update:VC-SR-02-DW", entityType: "Inventory", entityId: "VC-SR-02-DW", status: "succeeded", attempts: 1, createdAt: new Date(Date.now() - 86400e3 * 3).toISOString(), updatedAt: new Date(Date.now() - 86400e3 * 3).toISOString() },
];

const STATUSES = ["all", "dead_letter", "failed", "pending", "processing", "succeeded"] as const;
type StatusFilter = (typeof STATUSES)[number];

const PROVIDER_LABELS: Record<string, string> = {
  rishabh_erp: "Rishabh ERP",
  razorpay: "Razorpay",
  shiprocket: "Shiprocket",
  email: "Email (SMTP)",
};

const statusTone = (status: string): BadgeTone => {
  switch (status) {
    case "succeeded":
      return "success";
    case "pending":
      return "info";
    case "processing":
      return "gold";
    case "failed":
      return "warning";
    case "dead_letter":
      return "danger";
    default:
      return "neutral";
  }
};

const statusLabel = (status: string): string => EVENT_STATUS_LABELS[status] ?? status;

/** 30s → 2m → 10m → 1h → 6h, the same ladder the worker uses, so "attempt 3" means something. */
const BACKOFF_LABELS = ["30 seconds", "2 minutes", "10 minutes", "1 hour", "6 hours"];
const backoffLabel = (attempts: number): string => BACKOFF_LABELS[Math.min(attempts, BACKOFF_LABELS.length - 1)] ?? "—";

export default function IntegrationsPage() {
  const [status, setStatus] = useState<StatusFilter>("dead_letter");
  const [provider, setProvider] = useState("all");
  const [search, setSearch] = useState("");
  const [retrying, setRetrying] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const events = useApiResource<{ data: IntegrationEventRow[] }>((signal) => api.integrationEvents(signal), { data: DEMO_EVENTS });
  const all = events.data.data;

  const counts = useMemo(() => {
    const byStatus: Record<string, number> = { all: all.length };
    for (const value of STATUSES) if (value !== "all") byStatus[value] = all.filter((row) => row.status === value).length;
    return byStatus;
  }, [all]);

  const providers = useMemo(() => ["all", ...Array.from(new Set(all.map((row) => row.provider))).sort()], [all]);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return all.filter((row) => {
      if (status !== "all" && row.status !== status) return false;
      if (provider !== "all" && row.provider !== provider) return false;
      if (term && !`${row.eventType} ${row.idempotencyKey} ${row.entityId ?? ""} ${row.lastError ?? ""}`.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [all, status, provider, search]);

  const stats = useMemo(() => {
    const dead = all.filter((row) => row.status === "dead_letter");
    const failing = all.filter((row) => row.status === "failed");
    const byProvider = new Map<string, number>();
    for (const row of [...dead, ...failing]) byProvider.set(row.provider, (byProvider.get(row.provider) ?? 0) + 1);
    return {
      dead: dead.length,
      failing: failing.length,
      worstProvider: Array.from(byProvider.entries()).sort((a, b) => b[1] - a[1])[0],
      succeeded: all.filter((row) => row.status === "succeeded").length,
    };
  }, [all]);

  const retry = async (row: IntegrationEventRow) => {
    setRetrying(row._id);
    setError(null);
    try {
      await api.retryIntegrationEvent(row._id);
      setNotice(`${row.eventType} for ${PROVIDER_LABELS[row.provider] ?? row.provider} was requeued — the worker picks it up within 15 seconds.`);
      events.refresh();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Could not requeue this event");
    } finally {
      setRetrying(null);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeading
        eyebrow="System"
        title="Integrations"
        subtitle="The outbox every third-party call goes through. Failures back off 30s → 2m → 10m → 1h → 6h and then become dead letters that only a person can release."
      />
      <div className="flex justify-end">
        <AdminDataBadge resource={events} />
      </div>

      {error && <Alert>{error}</Alert>}
      {notice && <Alert tone="success">{notice}</Alert>}
      {stats.dead > 0 && (
        <Alert tone="danger">
          {stats.dead} dead letter{stats.dead === 1 ? "" : "s"} need attention. Nothing retries them automatically — a
          shopper may be waiting on an email or an ERP may be missing an order.
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Dead letters" value={String(stats.dead)} hint="Gave up after 5 attempts" tone={stats.dead ? "danger" : "success"} />
        <StatCard label="Retrying" value={String(stats.failing)} hint="Will be retried automatically" tone={stats.failing ? "warning" : "success"} />
        <StatCard label="Succeeded" value={String(stats.succeeded)} hint="Delivered to the provider" tone="success" />
        <StatCard
          label="Most affected"
          value={stats.worstProvider ? PROVIDER_LABELS[stats.worstProvider[0]] ?? stats.worstProvider[0] : "—"}
          hint={stats.worstProvider ? `${stats.worstProvider[1]} failing or dead` : "No failures on record"}
          tone="info"
        />
      </div>

      <Card
        title="Event queue"
        action={
          <div className="flex flex-wrap items-center gap-3">
            <label className="sr-only" htmlFor="event-search">Search events</label>
            <TextInput
              id="event-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Event type, key or error…"
              className="!w-60 !py-1.5 !text-[12px]"
            />
            <select
              value={provider}
              onChange={(event) => setProvider(event.target.value)}
              aria-label="Provider"
              className="rounded-xl border border-[#ebe6de] bg-white px-3 py-1.5 text-[12px] font-semibold text-stone-600 outline-none focus:border-[#dfc28c]"
            >
              {providers.map((option) => (
                <option key={option} value={option}>
                  {option === "all" ? "All providers" : PROVIDER_LABELS[option] ?? option}
                </option>
              ))}
            </select>
          </div>
        }
      >
        <div className="mb-4 flex flex-wrap gap-1.5">
          {STATUSES.map((option) => {
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
                {option === "all" ? "All" : statusLabel(option)}
                <span className={`rounded-full px-1.5 text-[10px] font-bold ${active ? "bg-white/20 text-white" : "bg-stone-100 text-stone-500"}`}>
                  {counts[option] ?? 0}
                </span>
              </button>
            );
          })}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#f0ebe3] text-[10.5px] font-semibold uppercase tracking-[0.12em] text-stone-400">
                <th className="pb-3 pr-4">Provider</th>
                <th className="pb-3 pr-4">Event</th>
                <th className="pb-3 pr-4">Status</th>
                <th className="pb-3 pr-4">Attempts</th>
                <th className="pb-3 pr-4 min-w-[240px]">Last error</th>
                <th className="pb-3 pr-4">Next attempt</th>
                <th className="pb-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0ebe3]">
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    <EmptyState title="Nothing in this view" hint="No events match the filters — that is usually good news." />
                  </td>
                </tr>
              )}
              {rows.map((row) => {
                const stuck = row.status === "dead_letter" || row.status === "failed";
                return (
                  <tr key={row._id} className="align-top transition hover:bg-[#faf7f2]/60">
                    <td className="py-3.5 pr-4">
                      <p className="text-[12.5px] font-semibold text-[#14100f]">{PROVIDER_LABELS[row.provider] ?? row.provider}</p>
                      <p className="mt-0.5 text-[11px] uppercase tracking-wide text-stone-400">{row.direction}</p>
                    </td>
                    <td className="py-3.5 pr-4">
                      <code className="font-mono text-[12px] font-semibold text-[#881337]">{row.eventType}</code>
                      <p className="mt-1 text-[11px] text-stone-500">
                        {row.entityType ? `${row.entityType} · ` : ""}
                        {row.entityId ? <span className="font-mono">{row.entityId}</span> : "—"}
                      </p>
                      <p className="mt-1 max-w-[260px] truncate font-mono text-[10.5px] text-stone-400" title={row.idempotencyKey}>
                        {row.idempotencyKey}
                      </p>
                    </td>
                    <td className="py-3.5 pr-4">
                      <Badge tone={statusTone(row.status)} dot>{statusLabel(row.status)}</Badge>
                    </td>
                    <td className="py-3.5 pr-4">
                      <p className="text-[13px] font-semibold text-[#14100f]">{row.attempts}</p>
                      <p className="text-[11px] text-stone-400">
                        {row.status === "dead_letter" ? "exhausted" : `next wait ${backoffLabel(row.attempts)}`}
                      </p>
                    </td>
                    <td className="py-3.5 pr-4">
                      {row.lastError ? (
                        <p className="max-w-[320px] text-[11.5px] leading-relaxed text-rose-700">{row.lastError}</p>
                      ) : (
                        <p className="text-[11.5px] text-stone-400">No error recorded</p>
                      )}
                    </td>
                    <td className="py-3.5 pr-4">
                      {row.nextAttemptAt ? (
                        <>
                          <p className="text-[12px] text-[#14100f]">{formatRelativeTime(row.nextAttemptAt)}</p>
                          <p className="text-[11px] text-stone-400">
                            {new Date(row.nextAttemptAt).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                          </p>
                        </>
                      ) : (
                        <p className="text-[11.5px] text-stone-400">—</p>
                      )}
                    </td>
                    <td className="py-3.5 text-right">
                      {stuck ? (
                        <ButtonDanger onClick={() => void retry(row)} disabled={Boolean(retrying) || events.source !== "live"}>
                          {retrying === row._id ? "Requeueing…" : "Retry now"}
                        </ButtonDanger>
                      ) : (
                        <ButtonGhost onClick={() => events.refresh()} disabled={events.source !== "live"}>
                          Refresh
                        </ButtonGhost>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-4 border-t border-[#f0ebe3] pt-4 text-[11.5px] text-stone-500">
          Backed by <code>GET /api/integrations/events</code> and <code>POST /api/integrations/events/:id/retry</code>.
          Retrying resets the attempt counter so the event gets the full backoff ladder again, and writes an
          <code> integration.retry</code> audit entry.
        </p>
      </Card>

      <Card title="How the outbox works">
        <ul className="grid gap-3 text-[12.5px] leading-relaxed text-stone-600 sm:grid-cols-2">
          <li>
            <span className="font-semibold text-[#14100f]">Nothing blocks a shopper.</span> Requests only write a row to
            this table; the worker does the network call afterwards.
          </li>
          <li>
            <span className="font-semibold text-[#14100f]">Idempotency keys dedupe.</span> Re-enqueueing the same key is a
            no-op, so a double-clicked button cannot send two emails.
          </li>
          <li>
            <span className="font-semibold text-[#14100f]">Two drains, two cadences.</span> Email events are claimed every
            15 seconds; ERP, payments and shipping every 60 seconds.
          </li>
          <li>
            <span className="font-semibold text-[#14100f]">Crash recovery.</span> A row stuck in <em>processing</em> for
            more than 10 minutes is reclaimed automatically.
          </li>
        </ul>
      </Card>
    </div>
  );
}
