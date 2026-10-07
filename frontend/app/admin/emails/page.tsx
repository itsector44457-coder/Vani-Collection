"use client";

import { useMemo, useState } from "react";
import { Badge, Card } from "@/lib/admin-ui";
import AdminDataBadge from "@/components/admin/AdminDataBadge";
import {
  api,
  ApiError,
  EMAIL_STATUSES,
  EMAIL_TEMPLATE_LABELS,
  EMAIL_TEMPLATES,
  emailStatusTone,
  formatRelativeTime,
  type EmailLogEntry,
  type EmailLogMeta,
} from "@/lib/api-client";
import { useApiResource } from "@/lib/use-api";

interface EmailLogResponse {
  data: EmailLogEntry[];
  meta: EmailLogMeta;
}

/**
 * Demo rows keep the screen honest about its shape before NEXT_PUBLIC_API_URL is set.
 * They mirror real template names and delivery states so the filters can be exercised.
 */
const DEMO_EMAILS: EmailLogResponse = {
  data: [
    { _id: "e1", to: "priya@example.com", template: "order-confirmation", subject: "Order confirmed · VC1720000000123", status: "sent", providerMessageId: "<a1b2c3@smtp.vanicollection.com>", attempts: 1, createdAt: new Date(Date.now() - 6 * 60000).toISOString(), sentAt: new Date(Date.now() - 6 * 60000).toISOString(), tags: ["orders"] },
    { _id: "e2", to: "meera@example.com", template: "order-status", subject: "Shipped via Delhivery · VC1720000000118", status: "failed", error: "ESMTP connection reset by peer", attempts: 3, orderId: "64f000000000000000000009", createdAt: new Date(Date.now() - 42 * 60000).toISOString(), tags: ["orders"] },
    { _id: "e3", to: "ananya@example.com", template: "welcome", subject: "Welcome to Vani Collection, Ananya", status: "sent", providerMessageId: "<d4e5f6@smtp.vanicollection.com>", attempts: 1, userId: "64f000000000000000000003", createdAt: new Date(Date.now() - 3 * 3600000).toISOString(), sentAt: new Date(Date.now() - 3 * 3600000).toISOString(), tags: ["onboarding"] },
    { _id: "e4", to: "riya@example.com", template: "password-reset", subject: "Reset your Vani Collection password", status: "skipped", error: "EMAIL_NOT_CONFIGURED", attempts: 0, createdAt: new Date(Date.now() - 9 * 3600000).toISOString(), tags: ["security"] },
    { _id: "e5", to: "support@vanicollection.in", template: "refund-processed", subject: "Refund initiated · ₹3,999 for order VC1720000000091", status: "queued", attempts: 0, orderId: "64f000000000000000000005", createdAt: new Date(Date.now() - 30000).toISOString(), tags: ["refunds"] },
    { _id: "e6", to: "kavya@example.com", template: "return-status", subject: "Return approved · RET1720000000999", status: "sent", providerMessageId: "<g7h8i9@smtp.vanicollection.com>", attempts: 1, createdAt: new Date(Date.now() - 26 * 3600000).toISOString(), sentAt: new Date(Date.now() - 26 * 3600000).toISOString(), tags: ["returns"] },
  ],
  meta: { page: 1, limit: 25, total: 6, pages: 1 },
};

const TEMPLATE_FILTERS = ["all", ...EMAIL_TEMPLATES] as const;

const templateLabel = (template: string) => EMAIL_TEMPLATE_LABELS[template] ?? template;

/** Only a message that never reached the provider can usefully be replayed. */
const canResend = (entry: EmailLogEntry) => entry.status === "failed" || entry.status === "skipped";

export default function EmailsPage() {
  const [status, setStatus] = useState<string>("all");
  const [template, setTemplate] = useState<string>("all");
  const [q, setQ] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const emails = useApiResource<EmailLogResponse>(
    (signal) => api.emails({ status, template, to: q.trim() || undefined, limit: 100 }, signal),
    DEMO_EMAILS,
    [status, template, q.trim()]
  );

  const rows = emails.data.data;
  const counts = useMemo(() => {
    const fromApi = emails.data.meta?.counts?.byStatus;
    if (fromApi && Object.keys(fromApi).length > 0) return fromApi;
    return rows.reduce<Record<string, number>>((acc, entry) => ({ ...acc, [entry.status]: (acc[entry.status] ?? 0) + 1 }), {});
  }, [emails.data.meta, rows]);

  const filtered = useMemo(
    () =>
      rows.filter((entry) => {
        if (status !== "all" && entry.status !== status) return false;
        if (template !== "all" && entry.template !== template) return false;
        if (q.trim()) {
          const needle = q.trim().toLowerCase();
          if (!entry.to.toLowerCase().includes(needle) && !entry.subject.toLowerCase().includes(needle)) return false;
        }
        return true;
      }),
    [rows, status, template, q]
  );

  const resend = async (entry: EmailLogEntry) => {
    setBusyId(entry._id);
    setActionError(null);
    setNotice(null);
    try {
      const result = await api.resendEmail(entry._id);
      setNotice(
        result.data.queued
          ? `Queued “${entry.subject}” for delivery again.`
          : `Nothing to send — ${result.data.reason ?? "the email provider is not configured"}.`
      );
      emails.refresh();
    } catch (cause) {
      setActionError(cause instanceof ApiError ? cause.message : "Could not resend this email");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-400">Communication</p>
          <h1 className="mt-1 font-serif text-[26px] font-semibold tracking-tight">Email log</h1>
          <p className="mt-1 max-w-2xl text-[13px] text-stone-500">
            Every transactional email goes through an outbox, so a slow or broken SMTP provider never fails a
            shopper&rsquo;s request. This is where you see what actually left the building — and replay what did not.
          </p>
        </div>
        <AdminDataBadge resource={emails} />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {EMAIL_STATUSES.map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => setStatus((current) => (current === name ? "all" : name))}
            aria-pressed={status === name}
            className={`rounded-2xl border bg-white p-5 text-left transition-all hover:shadow-[0_8px_30px_-12px_rgba(20,16,15,0.12)] ${
              status === name ? "border-[#dfc28c] ring-1 ring-[#dfc28c]" : "border-[#ebe6de]"
            }`}
          >
            <div className="flex items-center gap-2">
              <Badge tone={emailStatusTone(name)} dot>
                {name}
              </Badge>
            </div>
            <p className="mt-3 font-serif text-[26px] font-semibold leading-none text-[#14100f]">{counts[name] ?? 0}</p>
            <p className="mt-2 text-[11px] text-stone-400">
              {name === "failed"
                ? "Retryable from this screen"
                : name === "skipped"
                ? "No provider configured, or dev capture"
                : name === "queued"
                ? "Waiting on the mail worker"
                : "Handed to SMTP"}
            </p>
          </button>
        ))}
      </div>

      {actionError && (
        <p role="alert" className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-[12.5px] text-rose-700 ring-1 ring-rose-200">
          {actionError}
        </p>
      )}
      {notice && (
        <p role="status" className="rounded-xl bg-emerald-50 px-3.5 py-2.5 text-[12.5px] text-emerald-700 ring-1 ring-emerald-200">
          {notice}
        </p>
      )}

      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-[#ebe6de] bg-white px-3 py-2 focus-within:border-[#dfc28c] sm:max-w-sm">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-stone-400">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <label htmlFor="email-search" className="sr-only">
              Search by recipient or subject
            </label>
            <input
              id="email-search"
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="Search recipient or subject…"
              className="w-full bg-transparent text-[13px] outline-none placeholder:text-stone-400"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            <label htmlFor="template-filter" className="sr-only">
              Filter by template
            </label>
            <select
              id="template-filter"
              value={template}
              onChange={(event) => setTemplate(event.target.value)}
              className="rounded-xl border border-[#ebe6de] bg-white px-3 py-2 text-[12.5px] font-medium text-stone-700 outline-none transition focus:border-[#dfc28c]"
            >
              {TEMPLATE_FILTERS.map((name) => (
                <option key={name} value={name}>
                  {name === "all" ? "All templates" : templateLabel(name)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#f0ebe3] text-[10.5px] font-semibold uppercase tracking-[0.12em] text-stone-400">
                <th className="pb-3 pr-4">Recipient</th>
                <th className="pb-3 pr-4">Template</th>
                <th className="pb-3 pr-4">Subject</th>
                <th className="pb-3 pr-4">Status</th>
                <th className="pb-3 pr-4">Attempts</th>
                <th className="pb-3 pr-4">When</th>
                <th className="pb-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0ebe3]">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-[12.5px] text-stone-500">
                    No emails match these filters.
                  </td>
                </tr>
              )}
              {filtered.map((entry) => (
                <tr key={entry._id} className="align-top transition hover:bg-[#faf7f2]/60">
                  <td className="py-3.5 pr-4">
                    <p className="text-[12.5px] font-semibold text-[#14100f]">{entry.to}</p>
                    {entry.replyTo && <p className="mt-0.5 text-[11px] text-stone-400">reply-to {entry.replyTo}</p>}
                  </td>
                  <td className="py-3.5 pr-4">
                    <Badge tone={entry.template.startsWith("order") ? "gold" : "neutral"}>{templateLabel(entry.template)}</Badge>
                  </td>
                  <td className="max-w-[320px] py-3.5 pr-4">
                    <p className="truncate text-[12.5px] text-stone-700" title={entry.subject}>
                      {entry.subject}
                    </p>
                    {entry.providerMessageId && (
                      <p className="mt-0.5 truncate font-mono text-[10.5px] text-stone-400" title={entry.providerMessageId}>
                        {entry.providerMessageId}
                      </p>
                    )}
                    {entry.error && entry.status !== "skipped" && (
                      <p className="mt-1 rounded-md bg-rose-50 px-2 py-1 text-[10.5px] text-rose-700 ring-1 ring-rose-100">{entry.error}</p>
                    )}
                  </td>
                  <td className="py-3.5 pr-4">
                    <Badge tone={emailStatusTone(entry.status)} dot>
                      {entry.status}
                    </Badge>
                  </td>
                  <td className="py-3.5 pr-4 text-[12.5px] text-stone-600">{entry.attempts}</td>
                  <td className="py-3.5 pr-4 text-[12.5px] text-stone-600">
                    {entry.sentAt ? `sent ${formatRelativeTime(entry.sentAt)}` : formatRelativeTime(entry.createdAt)}
                  </td>
                  <td className="py-3.5 text-right">
                    <button
                      type="button"
                      onClick={() => void resend(entry)}
                      disabled={!canResend(entry) || busyId === entry._id}
                      className="rounded-full border border-[#ebe6de] bg-white px-3.5 py-1.5 text-[11.5px] font-semibold text-[#881337] transition hover:border-[#dfc28c] hover:bg-[#faf7f2] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {busyId === entry._id ? "Queuing…" : "Resend"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-4 border-t border-[#f0ebe3] pt-4 text-[11.5px] text-stone-500">
          Backed by <code>GET /api/admin/emails</code> and <code>POST /api/admin/emails/:id/resend</code>. Email is the
          only notification channel in this product — there is no WhatsApp, SMS or push path.{" "}
          {emails.source === "live"
            ? "Showing live delivery records."
            : "Connect the backend and sign in as support or admin to see real records."}
        </p>
      </Card>
    </div>
  );
}
