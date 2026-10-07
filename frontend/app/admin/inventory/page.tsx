"use client";

import { useMemo, useState } from "react";
import {
  Alert,
  Badge,
  ButtonGhost,
  ButtonPrimary,
  Card,
  Checkbox,
  EmptyState,
  Field,
  Modal,
  PageHeading,
  ProgressBar,
  StatCard,
  TextInput,
} from "@/lib/admin-ui";
import AdminDataBadge from "@/components/admin/AdminDataBadge";
import { api, ApiError, formatRelativeTime, type InventoryRow } from "@/lib/api-client";
import { useApiResource } from "@/lib/use-api";

const DEMO_INVENTORY: InventoryRow[] = [
  { _id: "i1", sku: "VC-SR-02-DW", warehouseId: "PRIMARY", onHand: 2, reserved: 1, reorderLevel: 4, location: "A-03-2", version: 7, lastErpSyncAt: new Date(Date.now() - 3600e3 * 2).toISOString(), available: 1, updatedAt: new Date(Date.now() - 3600e3 * 2).toISOString() },
  { _id: "i2", sku: "VC-SR-02-DW", warehouseId: "JAIPUR-DC", onHand: 12, reserved: 2, reorderLevel: 4, location: "R-11-4", version: 3, lastErpSyncAt: new Date(Date.now() - 3600e3 * 26).toISOString(), available: 10, updatedAt: new Date(Date.now() - 3600e3 * 26).toISOString() },
  { _id: "i3", sku: "VC-KT-05-AJ-M", warehouseId: "PRIMARY", onHand: 0, reserved: 0, reorderLevel: 5, location: "B-01-1", version: 12, lastErpSyncAt: new Date(Date.now() - 3600e3 * 5).toISOString(), available: 0, updatedAt: new Date(Date.now() - 3600e3 * 5).toISOString() },
  { _id: "i4", sku: "VC-DP-01-ZG", warehouseId: "PRIMARY", onHand: 34, reserved: 3, reorderLevel: 6, location: "C-07-3", version: 2, lastErpSyncAt: new Date(Date.now() - 86400e3 * 2).toISOString(), available: 31, updatedAt: new Date(Date.now() - 86400e3 * 2).toISOString() },
  { _id: "i5", sku: "VC-LH-09-GP-S", warehouseId: "JAIPUR-DC", onHand: 5, reserved: 4, reorderLevel: 3, version: 9, lastErpSyncAt: new Date(Date.now() - 3600e3 * 50).toISOString(), available: 1, updatedAt: new Date(Date.now() - 3600e3 * 50).toISOString() },
];

type Mode = "adjust" | "set";

export default function InventoryPage() {
  const [onlyLow, setOnlyLow] = useState(false);
  const [warehouse, setWarehouse] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<InventoryRow | null>(null);
  const [mode, setMode] = useState<Mode>("adjust");
  const [adjustment, setAdjustment] = useState("0");
  const [onHand, setOnHand] = useState("0");
  const [reorderLevel, setReorderLevel] = useState("");
  const [location, setLocation] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const inventory = useApiResource<{ data: InventoryRow[] }>((signal) => api.inventory({}, signal), { data: DEMO_INVENTORY });
  const all = inventory.data.data;

  const warehouses = useMemo(
    () => ["all", ...Array.from(new Set(all.map((row) => row.warehouseId))).sort()],
    [all]
  );

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return all.filter((row) => {
      if (warehouse !== "all" && row.warehouseId !== warehouse) return false;
      if (onlyLow && row.available > row.reorderLevel) return false;
      if (term && !`${row.sku} ${row.location ?? ""} ${row.warehouseId}`.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [all, warehouse, onlyLow, search]);

  const stats = useMemo(() => {
    const inScope = warehouse === "all" ? all : all.filter((row) => row.warehouseId === warehouse);
    const low = inScope.filter((row) => row.available <= row.reorderLevel && row.available > 0);
    const out = inScope.filter((row) => row.available === 0);
    const units = inScope.reduce((sum, row) => sum + row.available, 0);
    return { low, out, units, tracked: inScope.length };
  }, [all, warehouse]);

  const openAdjust = (row: InventoryRow) => {
    setEditing(row);
    setMode("adjust");
    setAdjustment("0");
    setOnHand(String(row.onHand));
    setReorderLevel(String(row.reorderLevel));
    setLocation(row.location ?? "");
    setReason("");
    setError(null);
  };

  const submit = async () => {
    if (!editing) return;
    // The reason is mandatory: every stock movement has to be explainable to finance and to the ERP.
    if (reason.trim().length < 3) {
      setError("A reason is required for every stock adjustment — it is written to the audit log.");
      return;
    }
    const body: Parameters<typeof api.adjustInventory>[1] = {
      reason: reason.trim(),
      reorderLevel: reorderLevel === "" ? undefined : Number(reorderLevel),
      location: location.trim() || undefined,
      warehouseId: editing.warehouseId,
    };
    if (mode === "adjust") {
      const delta = Number(adjustment);
      if (!Number.isInteger(delta) || delta === 0) {
        setError("Enter a whole number to add or remove. Zero changes nothing.");
        return;
      }
      body.adjustment = delta;
    } else {
      const target = Number(onHand);
      if (!Number.isInteger(target) || target < 0) {
        setError("On-hand must be a whole number of zero or more.");
        return;
      }
      body.onHand = target;
    }
    if (body.reorderLevel !== undefined && (!Number.isInteger(body.reorderLevel) || body.reorderLevel < 0)) {
      setError("Reorder level must be a whole number of zero or more.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await api.adjustInventory(editing.sku, body);
      const projected = mode === "adjust" ? editing.onHand + Number(adjustment) : Number(onHand);
      setNotice(`${editing.sku} @ ${editing.warehouseId} updated to ${projected} on hand.`);
      setEditing(null);
      inventory.refresh();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Could not adjust this SKU");
    } finally {
      setBusy(false);
    }
  };

  const projected = editing
    ? mode === "adjust"
      ? editing.onHand + (Number(adjustment) || 0)
      : Number(onHand) || 0
    : 0;

  return (
    <div className="space-y-5">
      <PageHeading
        eyebrow="Commerce"
        title="Inventory"
        subtitle="On-hand and reserved counts per SKU per warehouse. Adjustments require a reason and are audited; the ERP remains the source of truth for resupply."
      />
      <div className="flex justify-end">
        <AdminDataBadge resource={inventory} />
      </div>

      {error && <Alert>{error}</Alert>}
      {notice && <Alert tone="success">{notice}</Alert>}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="SKUs tracked" value={String(stats.tracked)} hint={warehouse === "all" ? "Across all warehouses" : `In ${warehouse}`} />
        <StatCard label="Low stock" value={String(stats.low.length)} hint="Available at or under the reorder level" tone={stats.low.length ? "warning" : "success"} />
        <StatCard label="Out of stock" value={String(stats.out.length)} hint="Nothing sellable left" tone={stats.out.length ? "danger" : "success"} />
        <StatCard label="Units available" value={stats.units.toLocaleString("en-IN")} hint="On hand minus reserved" tone="gold" />
      </div>

      {stats.low.length > 0 && (
        <Card title="Needs resupply">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {stats.low.map((row) => (
              <div key={row._id} className="rounded-xl border border-[#f0ebe3] bg-[#faf7f2]/60 p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-mono text-[12.5px] font-bold text-[#14100f]">{row.sku}</p>
                  <Badge tone={row.available === 0 ? "danger" : "warning"} dot>
                    {row.available === 0 ? "Out" : `${row.available} left`}
                  </Badge>
                </div>
                <p className="mt-1 text-[11px] text-stone-500">
                  {row.warehouseId}
                  {row.location ? ` · bay ${row.location}` : ""}
                </p>
                <div className="mt-2.5">
                  <ProgressBar value={row.available} max={Math.max(row.reorderLevel * 2, 1)} tone={row.available === 0 ? "#9f1239" : "#dfc28c"} />
                </div>
                <div className="mt-2.5 flex items-center justify-between">
                  <span className="text-[11px] text-stone-400">Reorder at {row.reorderLevel}</span>
                  <ButtonGhost onClick={() => openAdjust(row)} disabled={inventory.source !== "live"} className="!px-3 !py-1 !text-[11.5px]">
                    Adjust
                  </ButtonGhost>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card
        title="Stock lines"
        action={
          <div className="flex flex-wrap items-center gap-3">
            <label className="sr-only" htmlFor="inv-search">Search SKU</label>
            <TextInput
              id="inv-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search SKU or bay…"
              className="!w-52 !py-1.5 !text-[12px]"
            />
            <select
              value={warehouse}
              onChange={(event) => setWarehouse(event.target.value)}
              aria-label="Warehouse"
              className="rounded-xl border border-[#ebe6de] bg-white px-3 py-1.5 text-[12px] font-semibold text-stone-600 outline-none focus:border-[#dfc28c]"
            >
              {warehouses.map((option) => (
                <option key={option} value={option}>{option === "all" ? "All warehouses" : option}</option>
              ))}
            </select>
            <Checkbox label="Low stock only" checked={onlyLow} onChange={(event) => setOnlyLow(event.target.checked)} />
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#f0ebe3] text-[10.5px] font-semibold uppercase tracking-[0.12em] text-stone-400">
                <th className="pb-3 pr-4">SKU</th>
                <th className="pb-3 pr-4">Warehouse</th>
                <th className="pb-3 pr-4 text-right">On hand</th>
                <th className="pb-3 pr-4 text-right">Reserved</th>
                <th className="pb-3 pr-4 text-right">Available</th>
                <th className="pb-3 pr-4 text-right">Reorder at</th>
                <th className="pb-3 pr-4">Last ERP sync</th>
                <th className="pb-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0ebe3]">
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8}>
                    <EmptyState title="No stock lines match" hint="Clear the filters to see everything." />
                  </td>
                </tr>
              )}
              {rows.map((row) => {
                const low = row.available <= row.reorderLevel;
                return (
                  <tr key={row._id} className="transition hover:bg-[#faf7f2]/60">
                    <td className="py-3 pr-4">
                      <p className="font-mono text-[12.5px] font-bold text-[#14100f]">{row.sku}</p>
                      {row.location && <p className="text-[11px] text-stone-400">bay {row.location}</p>}
                    </td>
                    <td className="py-3 pr-4">
                      <Badge tone="neutral">{row.warehouseId}</Badge>
                      <p className="mt-1 text-[11px] text-stone-400">v{row.version}</p>
                    </td>
                    <td className="py-3 pr-4 text-right text-[13px] font-semibold text-[#14100f]">{row.onHand}</td>
                    <td className="py-3 pr-4 text-right text-[13px] text-stone-500">{row.reserved}</td>
                    <td className="py-3 pr-4 text-right">
                      <span className={`text-[13px] font-bold ${row.available === 0 ? "text-rose-700" : low ? "text-amber-700" : "text-emerald-700"}`}>
                        {row.available}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-right text-[13px] text-stone-500">{row.reorderLevel}</td>
                    <td className="py-3 pr-4">
                      {row.lastErpSyncAt ? (
                        <>
                          <p className="text-[12px] text-[#14100f]">{formatRelativeTime(row.lastErpSyncAt)}</p>
                          <p className="text-[11px] text-stone-400">
                            {new Date(row.lastErpSyncAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                          </p>
                        </>
                      ) : (
                        <p className="text-[12px] text-stone-400">Never synced</p>
                      )}
                    </td>
                    <td className="py-3 text-right">
                      <ButtonGhost onClick={() => openAdjust(row)} disabled={inventory.source !== "live"}>
                        Adjust stock
                      </ButtonGhost>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-4 border-t border-[#f0ebe3] pt-4 text-[11.5px] text-stone-500">
          Backed by <code>GET /api/inventory</code> and <code>PATCH /api/inventory/:sku?warehouseId=…</code>. Writes use
          optimistic concurrency, so a conflicting ERP sync is rejected rather than silently overwritten.
        </p>
      </Card>

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing ? `Adjust ${editing.sku}` : "Adjust stock"}
        description={editing ? `${editing.warehouseId}${editing.location ? ` · bay ${editing.location}` : ""} · currently ${editing.onHand} on hand, ${editing.reserved} reserved` : undefined}
        footer={
          <>
            <ButtonGhost onClick={() => setEditing(null)}>Cancel</ButtonGhost>
            <ButtonPrimary onClick={() => void submit()} disabled={busy}>
              {busy ? "Saving…" : "Save adjustment"}
            </ButtonPrimary>
          </>
        }
      >
        {editing && (
          <div className="space-y-4">
            <div className="flex gap-2">
              {(["adjust", "set"] as Mode[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setMode(option)}
                  aria-pressed={mode === option}
                  className={`flex-1 rounded-xl border px-3 py-2 text-[12.5px] font-semibold transition ${
                    mode === option ? "border-[#881337] bg-[#881337]/5 text-[#881337]" : "border-[#ebe6de] bg-white text-stone-600 hover:border-[#dfc28c]"
                  }`}
                >
                  {option === "adjust" ? "Add / remove units" : "Set exact count"}
                </button>
              ))}
            </div>

            {mode === "adjust" ? (
              <Field label="Adjustment" htmlFor="inv-adjustment" hint="Negative numbers remove stock. Received-in is positive, damaged-out is negative.">
                <TextInput id="inv-adjustment" type="number" step={1} value={adjustment} onChange={(event) => setAdjustment(event.target.value)} />
              </Field>
            ) : (
              <Field label="On hand" htmlFor="inv-onhand" hint="Overwrites the count. Reserved units are left untouched.">
                <TextInput id="inv-onhand" type="number" min={0} step={1} value={onHand} onChange={(event) => setOnHand(event.target.value)} />
              </Field>
            )}

            <div className="rounded-xl bg-[#faf7f2] px-3.5 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">After this change</p>
              <p className="mt-1 text-[13px] text-stone-600">
                <span className="font-serif text-[22px] font-semibold text-[#14100f]">{projected}</span> on hand ·{" "}
                <span className="font-semibold text-[#14100f]">{Math.max(0, projected - editing.reserved)}</span> available
              </p>
              {Math.max(0, projected - editing.reserved) <= editing.reorderLevel && (
                <p className="mt-1 text-[12px] font-semibold text-amber-700">
                  Still at or under the reorder level of {editing.reorderLevel}.
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Reorder level" htmlFor="inv-reorder">
                <TextInput id="inv-reorder" type="number" min={0} step={1} value={reorderLevel} onChange={(event) => setReorderLevel(event.target.value)} />
              </Field>
              <Field label="Bay / location" htmlFor="inv-location">
                <TextInput id="inv-location" value={location} onChange={(event) => setLocation(event.target.value)} placeholder="A-03-2" />
              </Field>
            </div>

            <Field
              label="Reason"
              htmlFor="inv-reason"
              hint="Mandatory. Recorded in the audit log with your account and IP."
            >
              <TextInput
                id="inv-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Received 24 units against PO-4471"
              />
            </Field>
            {reason.trim().length > 0 && reason.trim().length < 3 && <Alert>Give a slightly fuller reason.</Alert>}
          </div>
        )}
      </Modal>
    </div>
  );
}
