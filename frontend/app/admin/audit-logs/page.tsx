"use client";

import { useMemo, useState } from "react";
import {
  Alert,
  Badge,
  ButtonGhost,
  Card,
  EmptyState,
  PageHeading,
  StatCard,
  TextInput,
  type BadgeTone,
} from "@/lib/admin-ui";
import AdminDataBadge from "@/components/admin/AdminDataBadge";
import { ageInDays, api, downloadFile, formatRelativeTime, toCsv, type AuditLogRow } from "@/lib/api-client";
import { useApiResource } from "@/lib/use-api";

const DEMO_LOGS: AuditLogRow[] = [
  { _id: "a1", actorEmail: "priya@vanicollection.in", action: "refund.process", entity: "Order", entityId: "6650f1a2c3d4e5f6a7b8c9d0", ip: "103.21.58.4", userAgent: "Mozilla/5.0 (Macintosh)", requestId: "req_8f21", createdAt: new Date(Date.now() - 3600e3 * 1).toISOString() },
  { _id: "a2", actorEmail: "warehouse@vanicollection.in", action: "inventory.adjust", entity: "Inventory", entityId: "VC-SR-02-DW", ip: "49.36.112.7", userAgent: "Mozilla/5.0 (Windows NT 10.0)", requestId: "req_7c02", createdAt: new Date(Date.now() - 3600e3 * 3).toISOString() },
  { _id: "a3", actorEmail: "support@vanicollection.in", action: "return.status", entity: "ReturnRequest", entityId: "6650f1a2c3d4e5f6a7b8c9d1", ip: "49.36.112.9", userAgent: "Mozilla/5.0 (iPhone)", requestId: "req_6a19", createdAt: new Date(Date.now() - 3600e3 * 5).toISOString() },
  { _id: "a4", actorEmail: "finance@vanicollection.in", action: "coupon.create", entity: "Coupon", entityId: "6650f1a2c3d4e5f6a7b8c9d2", ip: "103.21.58.4", userAgent: "Mozilla/5.0 (Macintosh)", requestId: "req_5b77", createdAt: new Date(Date.now() - 86400e3 * 1).toISOString() },
  { _id: "a5", actorEmail: "admin@vanicollection.in", action: "staff.create", entity: "User", entityId: "6650f1a2c3d4e5f6a7b8c9d3", ip: "103.21.58.11", userAgent: "Mozilla/5.0 (X11; Linux x86_64)", requestId: "req_4d10", createdAt: new Date(Date.now() - 86400e3 * 2).toISOString() },
  { _id: "a6", actorEmail: "support@vanicollection.in", action: "review.moderate", entity: "Review", entityId: "6650f1a2c3d4e5f6a7b8c9d4", ip: "49.36.112.9", userAgent: "Mozilla/5.0 (iPhone)", requestId: "req_3e55", createdAt: new Date(Date.now() - 86400e3 * 3).toISOString() },
  { _id: "a7", actorEmail: "admin@vanicollection.in", action: "email.resend", entity: "EmailLog", entityId: "6650f1a2c3d4e5f6a7b8c9d5", ip: "103.21.58.11", userAgent: "Mozilla/5.0 (X11; Linux x86_64)", requestId: "req_2f88", createdAt: new Date(Date.now() - 86400e3 * 4).toISOString() },
  { _id: "a8", actorEmail: "admin@vanicollection.in", action: "integration.retry", entity: "IntegrationEvent", entityId: "6650f1a2c3d4e5f6a7b8c9d6", ip: "103.21.58.11", userAgent: "Mozilla/5.0 (X11; Linux x86_64)", requestId: "req_1a02", createdAt: new Date(Date.now() - 86400e3 * 5).toISOString() },
];

const LIMIT = 250;

/** Groups the action string into a readable area, e.g. `inventory.adjust` → Inventory. */
const actionArea = (action: string): string => {
  const head = action.split(".")[0] || action;
  return head.charAt(0).toUpperCase() + head.slice(1);
};

const areaTone = (area: string): BadgeTone => {
  switch (area) {
    case "Refund":
    case "Coupon":
      return "danger";
    case "Inventory":
      return "warning";
    case "Staff":
    case "Customer":
      return "info";
    case "Integration":
    case "Email":
      return "gold";
    default:
      return "neutral";
  }
};

const browserLabel = (userAgent?: string): string => {
  if (!userAgent) return "Unknown client";
  if (/Edg\//i.test(userAgent)) return "Edge";
  if (/OPR\//i.test(userAgent)) return "Opera";
  if (/Chrome\//i.test(userAgent)) return "Chrome";
  if (/Safari\//i.test(userAgent)) return "Safari";
  if (/Firefox\//i.test(userAgent)) return "Firefox";
  return userAgent.slice(0, 32);
};

export default function AuditLogsPage() {
  const [action, setAction] = useState("all");
  const [search, setSearch] = useState("");

  const logs = useApiResource<{ data: AuditLogRow[] }>((signal) => api.auditLogs({ limit: LIMIT }, signal), { data: DEMO_LOGS });
  const all = logs.data.data;

  const areas = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of all) {
      const area = actionArea(row.action);
      counts.set(area, (counts.get(area) ?? 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [all]);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return all.filter((row) => {
      if (action !== "all" && actionArea(row.action) !== action) return false;
      if (term && !`${row.actorEmail ?? ""} ${row.action} ${row.entity ?? ""} ${row.entityId ?? ""} ${row.ip ?? ""}`.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [all, action, search]);

  const stats = useMemo(() => {
    const actors = new Set(all.map((row) => row.actorEmail).filter(Boolean));
    const ips = new Set(all.map((row) => row.ip).filter(Boolean));
    const last24 = all.filter((row) => ageInDays(row.createdAt) < 1);
    return { total: all.length, actors: actors.size, ips: ips.size, last24: last24.length };
  }, [all]);

  const exportCsv = () => {
    downloadFile(
      `vani-audit-log-${new Date().toISOString().slice(0, 10)}.csv`,
      toCsv([
        ["Timestamp", "Actor", "Action", "Entity", "Entity id", "IP", "Request id", "Client"],
        ...rows.map((row) => [
          new Date(row.createdAt).toISOString(),
          row.actorEmail ?? "",
          row.action,
          row.entity ?? "",
          row.entityId ?? "",
          row.ip ?? "",
          row.requestId ?? "",
          browserLabel(row.userAgent),
        ]),
      ])
    );
  };

  return (
    <div className="space-y-5">
      <PageHeading
        eyebrow="System"
        title="Audit log"
        subtitle="Every privileged write is recorded against the signed-in account. Rows are written after the response succeeds, so a rejected change leaves no trace here."
        action={
          <ButtonGhost onClick={exportCsv} disabled={rows.length === 0}>
            Export CSV
          </ButtonGhost>
        }
      />
      <div className="flex justify-end">
        <AdminDataBadge resource={logs} />
      </div>

      {logs.error && <Alert tone="warning">{logs.error} — showing sample rows instead.</Alert>}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Entries shown" value={String(stats.total)} hint={`Most recent ${LIMIT}`} />
        <StatCard label="Last 24 hours" value={String(stats.last24)} hint="Recent privileged writes" tone={stats.last24 ? "info" : undefined} />
        <StatCard label="Distinct actors" value={String(stats.actors)} hint="Staff accounts that made changes" tone="gold" />
        <StatCard label="Distinct IPs" value={String(stats.ips)} hint="Worth checking if this jumps" />
      </div>

      <Card title="Activity">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <label className="sr-only" htmlFor="audit-search">
            Search audit log
          </label>
          <TextInput
            id="audit-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search actor, action, entity or IP…"
            className="!w-72 !py-1.5 !text-[12px]"
          />
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setAction("all")}
              aria-pressed={action === "all"}
              className={`rounded-full border px-3.5 py-1.5 text-[12px] font-semibold transition ${
                action === "all" ? "border-[#881337] bg-[#881337] text-white" : "border-[#ebe6de] bg-white text-stone-600 hover:border-[#dfc28c] hover:text-[#881337]"
              }`}
            >
              All areas
            </button>
            {areas.map(([area, count]) => (
              <button
                key={area}
                type="button"
                onClick={() => setAction(area)}
                aria-pressed={action === area}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12px] font-semibold transition ${
                  action === area ? "border-[#881337] bg-[#881337] text-white" : "border-[#ebe6de] bg-white text-stone-600 hover:border-[#dfc28c] hover:text-[#881337]"
                }`}
              >
                {area}
                <span className={`rounded-full px-1.5 text-[10px] font-bold ${action === area ? "bg-white/20 text-white" : "bg-stone-100 text-stone-500"}`}>
                  {count}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#f0ebe3] text-[10.5px] font-semibold uppercase tracking-[0.12em] text-stone-400">
                <th className="pb-3 pr-4">When</th>
                <th className="pb-3 pr-4">Actor</th>
                <th className="pb-3 pr-4">Action</th>
                <th className="pb-3 pr-4">Entity</th>
                <th className="pb-3 pr-4">Source</th>
                <th className="pb-3">Request</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0ebe3]">
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <EmptyState title="No matching entries" hint="Widen the search or pick another area." />
                  </td>
                </tr>
              )}
              {rows.map((row) => {
                const area = actionArea(row.action);
                return (
                  <tr key={row._id} className="transition hover:bg-[#faf7f2]/60">
                    <td className="py-3 pr-4">
                      <p className="text-[12.5px] font-semibold text-[#14100f]">{formatRelativeTime(row.createdAt)}</p>
                      <p className="text-[11px] text-stone-400">
                        {new Date(row.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                      </p>
                    </td>
                    <td className="py-3 pr-4">
                      <p className="text-[12.5px] text-[#14100f]">{row.actorEmail || "system"}</p>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <Badge tone={areaTone(area)}>{area}</Badge>
                        <code className="font-mono text-[11.5px] text-stone-500">{row.action}</code>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <p className="text-[12px] text-stone-600">{row.entity || "—"}</p>
                      {row.entityId && <p className="font-mono text-[11px] text-stone-400">{row.entityId}</p>}
                    </td>
                    <td className="py-3 pr-4">
                      <p className="font-mono text-[11.5px] text-stone-600">{row.ip || "—"}</p>
                      <p className="text-[11px] text-stone-400">{browserLabel(row.userAgent)}</p>
                    </td>
                    <td className="py-3">
                      <p className="font-mono text-[11px] text-stone-400">{row.requestId || "—"}</p>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-4 border-t border-[#f0ebe3] pt-4 text-[11.5px] text-stone-500">
          Backed by <code>GET /api/admin/audit-logs?action=…&amp;limit=…</code>, restricted to admin and super admin.
          Entries are append-only — nothing in the console can edit or delete them.
        </p>
      </Card>
    </div>
  );
}
