"use client";

import { useMemo, useState } from "react";
import {
  Alert,
  Badge,
  ButtonDanger,
  ButtonGhost,
  ButtonPrimary,
  Card,
  Checkbox,
  Field,
  Modal,
  PageHeading,
  ProgressBar,
  StatCard,
  TextInput,
} from "@/lib/admin-ui";
import AdminDataBadge from "@/components/admin/AdminDataBadge";
import { api, ApiError, formatCurrency, parseList, type AdminCoupon, type CouponInput } from "@/lib/api-client";
import { useApiResource } from "@/lib/use-api";

const DEMO_COUPONS: AdminCoupon[] = [
  { _id: "d1", code: "FEST10", type: "percentage", value: 10, minOrderValue: 1000, maxDiscount: 500, usageLimit: 500, perCustomerLimit: 1, usedCount: 214, active: true, applicableCategories: [], excludedSkus: [], createdAt: new Date("2026-09-01").toISOString() },
  { _id: "d2", code: "MUL250", type: "fixed", value: 250, minOrderValue: 1499, usageLimit: 200, perCustomerLimit: 2, usedCount: 200, active: true, applicableCategories: ["mul-cotton"], excludedSkus: [], createdAt: new Date("2026-08-14").toISOString() },
  { _id: "d3", code: "WELCOME5", type: "percentage", value: 5, minOrderValue: 0, perCustomerLimit: 1, usedCount: 88, active: false, applicableCategories: [], excludedSkus: ["VC-SR-08-FS"], createdAt: new Date("2026-07-02").toISOString() },
];

/** `<input type="date">` works in local time; the API wants an ISO timestamp. */
const toDateInput = (iso?: string) => (iso ? new Date(iso).toISOString().slice(0, 10) : "");
const fromDateInput = (value: string, endOfDay: boolean) =>
  value ? new Date(`${value}T${endOfDay ? "23:59:59" : "00:00:00"}`).toISOString() : undefined;

const EMPTY_FORM: CouponInput & { categoriesText: string; skusText: string } = {
  code: "",
  type: "percentage",
  value: 10,
  minOrderValue: 0,
  maxDiscount: undefined,
  startsAt: undefined,
  endsAt: undefined,
  usageLimit: undefined,
  perCustomerLimit: 1,
  active: true,
  categoriesText: "",
  skusText: "",
};

type FormState = typeof EMPTY_FORM;

const couponState = (coupon: AdminCoupon): { tone: "success" | "warning" | "danger" | "neutral"; label: string } => {
  const now = Date.now();
  if (!coupon.active) return { tone: "neutral", label: "Inactive" };
  if (coupon.endsAt && new Date(coupon.endsAt).getTime() < now) return { tone: "danger", label: "Expired" };
  if (coupon.startsAt && new Date(coupon.startsAt).getTime() > now) return { tone: "warning", label: "Scheduled" };
  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) return { tone: "danger", label: "Limit reached" };
  return { tone: "success", label: "Live" };
};

const toForm = (coupon: AdminCoupon): FormState => ({
  code: coupon.code,
  type: coupon.type,
  value: coupon.value,
  minOrderValue: coupon.minOrderValue ?? 0,
  maxDiscount: coupon.maxDiscount,
  startsAt: coupon.startsAt,
  endsAt: coupon.endsAt,
  usageLimit: coupon.usageLimit,
  perCustomerLimit: coupon.perCustomerLimit ?? 1,
  active: coupon.active,
  categoriesText: (coupon.applicableCategories ?? []).join(", "),
  skusText: (coupon.excludedSkus ?? []).join(", "),
});

export default function CouponsPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AdminCoupon | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AdminCoupon | null>(null);

  const coupons = useApiResource<{ data: AdminCoupon[] }>((signal) => api.coupons(signal), { data: DEMO_COUPONS });
  const rows = coupons.data.data;

  const stats = useMemo(() => {
    const live = rows.filter((coupon) => couponState(coupon).label === "Live");
    const redeemed = rows.reduce((sum, coupon) => sum + (coupon.usedCount || 0), 0);
    const capped = rows.filter((coupon) => coupon.usageLimit && coupon.usedCount >= coupon.usageLimit);
    return { total: rows.length, live: live.length, redeemed, capped: capped.length };
  }, [rows]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((current) => ({ ...current, [key]: value }));

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError(null);
    setFormOpen(true);
  };

  const openEdit = (coupon: AdminCoupon) => {
    setEditing(coupon);
    setForm(toForm(coupon));
    setError(null);
    setFormOpen(true);
  };

  const submit = async () => {
    setBusy(true);
    setError(null);
    const code = (form.code || "").trim().toUpperCase();
    // The rules are shared; only `code` differs, and PATCH deliberately omits it because the code
    // is the identifier staff recognise in the audit log and in shoppers' baskets.
    const rules: Omit<CouponInput, "code"> = {
      type: form.type,
      value: Number(form.value),
      minOrderValue: Number(form.minOrderValue) || 0,
      maxDiscount: form.maxDiscount === undefined || form.maxDiscount === null ? undefined : Number(form.maxDiscount),
      startsAt: form.startsAt,
      endsAt: form.endsAt,
      usageLimit: form.usageLimit === undefined || form.usageLimit === null ? undefined : Number(form.usageLimit),
      perCustomerLimit: Number(form.perCustomerLimit) || 1,
      active: Boolean(form.active),
      applicableCategories: parseList(form.categoriesText),
      excludedSkus: parseList(form.skusText).map((sku) => sku.toUpperCase()),
    };
    if (code.length < 3) {
      setError("A coupon code needs at least 3 characters.");
      setBusy(false);
      return;
    }
    if (!(Number(rules.value) > 0)) {
      setError("The discount value must be greater than zero.");
      setBusy(false);
      return;
    }
    try {
      if (editing) {
        await api.updateCoupon(editing._id, rules);
        setNotice(`${code} updated.`);
      } else {
        await api.createCoupon({ code, ...rules });
        setNotice(`${code} created.`);
      }
      setFormOpen(false);
      coupons.refresh();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Could not save this coupon");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!pendingDelete) return;
    setBusy(true);
    setError(null);
    try {
      await api.deleteCoupon(pendingDelete._id);
      setNotice(`${pendingDelete.code} deleted.`);
      setPendingDelete(null);
      coupons.refresh();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Could not delete this coupon");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeading
        eyebrow="Commerce"
        title="Coupons"
        subtitle="Discount codes honoured by the cart, checkout and the order pipeline. Usage is counted server-side inside the checkout transaction."
        action={
          <ButtonPrimary onClick={openCreate} disabled={coupons.source !== "live"}>
            New coupon
          </ButtonPrimary>
        }
      />
      <div className="flex justify-end">
        <AdminDataBadge resource={coupons} />
      </div>

      {coupons.source !== "live" && (
        <Alert tone="warning">
          Demo coupons. Connect the backend and sign in as finance or admin to create and edit real codes.
        </Alert>
      )}
      {error && <Alert>{error}</Alert>}
      {notice && <Alert tone="success">{notice}</Alert>}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total codes" value={String(stats.total)} hint="Every coupon on record" />
        <StatCard label="Live now" value={String(stats.live)} hint="Active, in window and under the limit" />
        <StatCard label="Redemptions" value={stats.redeemed.toLocaleString("en-IN")} hint="Counted across all codes" />
        <StatCard label="Limit reached" value={String(stats.capped)} hint="These no longer apply at checkout" />
      </div>

      <Card title="All coupons">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#f0ebe3] text-[10.5px] font-semibold uppercase tracking-[0.12em] text-stone-400">
                <th className="pb-3 pr-4">Code</th>
                <th className="pb-3 pr-4">Discount</th>
                <th className="pb-3 pr-4">Rules</th>
                <th className="pb-3 pr-4 min-w-[160px]">Usage</th>
                <th className="pb-3 pr-4">Window</th>
                <th className="pb-3 pr-4">Status</th>
                <th className="pb-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0ebe3]">
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-[12.5px] text-stone-500">
                    No coupons yet — create the first one.
                  </td>
                </tr>
              )}
              {rows.map((coupon) => {
                const state = couponState(coupon);
                const limit = coupon.usageLimit ?? 0;
                return (
                  <tr key={coupon._id} className="align-top transition hover:bg-[#faf7f2]/60">
                    <td className="py-3.5 pr-4">
                      <p className="font-mono text-[13px] font-bold tracking-wide text-[#881337]">{coupon.code}</p>
                      <p className="mt-0.5 text-[11px] text-stone-400">{coupon.perCustomerLimit ?? 1} per customer</p>
                    </td>
                    <td className="py-3.5 pr-4">
                      <p className="text-[13px] font-semibold text-[#14100f]">
                        {coupon.type === "percentage" ? `${coupon.value}% off` : `${formatCurrency(coupon.value)} off`}
                      </p>
                      {coupon.maxDiscount ? (
                        <p className="mt-0.5 text-[11px] text-stone-400">capped at {formatCurrency(coupon.maxDiscount)}</p>
                      ) : null}
                    </td>
                    <td className="py-3.5 pr-4 text-[11.5px] text-stone-500">
                      <p>Min order {formatCurrency(coupon.minOrderValue ?? 0)}</p>
                      {coupon.applicableCategories?.length > 0 && (
                        <p className="mt-0.5">Only: {coupon.applicableCategories.join(", ")}</p>
                      )}
                      {coupon.excludedSkus?.length > 0 && (
                        <p className="mt-0.5">Excludes {coupon.excludedSkus.length} SKU{coupon.excludedSkus.length === 1 ? "" : "s"}</p>
                      )}
                    </td>
                    <td className="py-3.5 pr-4">
                      <p className="text-[12px] font-semibold text-[#14100f]">
                        {coupon.usedCount}
                        {limit ? ` / ${limit}` : ""}
                      </p>
                      <div className="mt-1.5">
                        <ProgressBar
                          value={coupon.usedCount}
                          max={limit || Math.max(coupon.usedCount, 1)}
                          tone={limit && coupon.usedCount >= limit ? "#9f1239" : "#dfc28c"}
                        />
                      </div>
                    </td>
                    <td className="py-3.5 pr-4 text-[11.5px] text-stone-500">
                      {coupon.startsAt ? <p>from {new Date(coupon.startsAt).toLocaleDateString("en-IN")}</p> : <p>no start</p>}
                      {coupon.endsAt ? <p>until {new Date(coupon.endsAt).toLocaleDateString("en-IN")}</p> : <p>no end</p>}
                    </td>
                    <td className="py-3.5 pr-4">
                      <Badge tone={state.tone} dot>
                        {state.label}
                      </Badge>
                    </td>
                    <td className="py-3.5 text-right">
                      <div className="flex justify-end gap-2">
                        <ButtonGhost onClick={() => openEdit(coupon)} disabled={coupons.source !== "live"}>
                          Edit
                        </ButtonGhost>
                        <ButtonDanger onClick={() => setPendingDelete(coupon)} disabled={coupons.source !== "live"}>
                          Delete
                        </ButtonDanger>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-4 border-t border-[#f0ebe3] pt-4 text-[11.5px] text-stone-500">
          Backed by <code>GET/POST /api/coupons</code>, <code>PATCH/DELETE /api/coupons/:id</code> and{" "}
          <code>POST /api/coupons/validate</code> (the same engine checkout uses).
        </p>
      </Card>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? `Edit ${editing.code}` : "New coupon"}
        description="Codes are stored uppercase and matched case-insensitively at checkout."
        footer={
          <>
            <ButtonGhost onClick={() => setFormOpen(false)}>Cancel</ButtonGhost>
            <ButtonPrimary onClick={() => void submit()} disabled={busy}>
              {busy ? "Saving…" : editing ? "Save changes" : "Create coupon"}
            </ButtonPrimary>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Code" htmlFor="coupon-code">
              <TextInput
                id="coupon-code"
                value={form.code ?? ""}
                onChange={(event) => set("code", event.target.value.toUpperCase())}
                placeholder="FEST10"
                disabled={Boolean(editing)}
                className="font-mono uppercase"
              />
            </Field>
            <Field label="Type" htmlFor="coupon-type">
              <select
                id="coupon-type"
                value={form.type}
                onChange={(event) => set("type", event.target.value as "percentage" | "fixed")}
                className="w-full rounded-xl border border-[#ebe6de] bg-white px-3 py-2 text-[13px] outline-none focus:border-[#dfc28c]"
              >
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed amount</option>
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label={form.type === "percentage" ? "Value (%)" : "Value (₹)"} htmlFor="coupon-value">
              <TextInput id="coupon-value" type="number" min={0} step={form.type === "percentage" ? 1 : 50} value={form.value ?? 0} onChange={(event) => set("value", Number(event.target.value))} />
            </Field>
            <Field label="Min order value (₹)" htmlFor="coupon-min">
              <TextInput id="coupon-min" type="number" min={0} step={100} value={form.minOrderValue ?? 0} onChange={(event) => set("minOrderValue", Number(event.target.value))} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Max discount (₹)" hint="Only applies to percentage codes" htmlFor="coupon-max">
              <TextInput id="coupon-max" type="number" min={0} step={50} value={form.maxDiscount ?? ""} onChange={(event) => set("maxDiscount", event.target.value === "" ? undefined : Number(event.target.value))} />
            </Field>
            <Field label="Usage limit" hint="Blank means unlimited" htmlFor="coupon-usage">
              <TextInput id="coupon-usage" type="number" min={1} step={1} value={form.usageLimit ?? ""} onChange={(event) => set("usageLimit", event.target.value === "" ? undefined : Number(event.target.value))} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Starts at" htmlFor="coupon-start">
              <TextInput id="coupon-start" type="date" value={toDateInput(form.startsAt)} onChange={(event) => set("startsAt", fromDateInput(event.target.value, false))} />
            </Field>
            <Field label="Ends at" htmlFor="coupon-end">
              <TextInput id="coupon-end" type="date" value={toDateInput(form.endsAt)} onChange={(event) => set("endsAt", fromDateInput(event.target.value, true))} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Per customer limit" htmlFor="coupon-per">
              <TextInput id="coupon-per" type="number" min={1} step={1} value={form.perCustomerLimit ?? 1} onChange={(event) => set("perCustomerLimit", Number(event.target.value))} />
            </Field>
            <div className="flex items-end pb-2">
              <Checkbox label="Coupon is active" checked={Boolean(form.active)} onChange={(event) => set("active", event.target.checked)} />
            </div>
          </div>

          <Field label="Applicable categories" hint="Comma separated. Blank means every category." htmlFor="coupon-cats">
            <TextInput id="coupon-cats" value={form.categoriesText} onChange={(event) => set("categoriesText", event.target.value)} placeholder="mul-cotton, festive" />
          </Field>

          <Field label="Excluded SKUs" hint="Comma separated. These lines never discount." htmlFor="coupon-skus">
            <TextInput id="coupon-skus" value={form.skusText} onChange={(event) => set("skusText", event.target.value)} placeholder="VC-SR-08-FS" />
          </Field>
        </div>
      </Modal>

      <Modal
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        title={`Delete ${pendingDelete?.code ?? ""}?`}
        description="Deleting removes the code permanently. Deactivate it instead if you want to keep the redemption history."
        footer={
          <>
            <ButtonGhost onClick={() => setPendingDelete(null)}>Keep it</ButtonGhost>
            <ButtonDanger onClick={() => void remove()} disabled={busy}>
              {busy ? "Deleting…" : "Delete coupon"}
            </ButtonDanger>
          </>
        }
      >
        <p className="text-[13px] text-stone-600">
          {pendingDelete?.usedCount ?? 0} shopper{pendingDelete?.usedCount === 1 ? " has" : "s have"} already redeemed this
          code. Those orders keep their discount.
        </p>
      </Modal>
    </div>
  );
}
