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
  ProgressBar,
  StatCard,
  Textarea,
  TextInput,
  type BadgeTone,
} from "@/lib/admin-ui";
import AdminDataBadge from "@/components/admin/AdminDataBadge";
import {
  api,
  ApiError,
  formatCurrency,
  formatRelativeTime,
  LOYALTY_REASON_LABELS,
  LOYALTY_TIERS,
  type AdminLoyaltyMember,
  type AdminLoyaltyMeta,
  type LoyaltySummary,
  type LoyaltyTransaction,
} from "@/lib/api-client";
import { useApiResource } from "@/lib/use-api";

const DEMO_META: AdminLoyaltyMeta = {
  page: 1,
  limit: 25,
  total: 4,
  pages: 1,
  config: {
    enabled: true,
    rupeesPerPoint: 100,
    pointValueRupees: 1,
    minRedemptionPoints: 100,
    maxRedemptionPercent: 50,
    expiryMonths: 12,
    referralBonusPoints: 200,
    tiers: [
      { name: "silver", label: "Silver", minLifetimePoints: 0 },
      { name: "gold", label: "Gold", minLifetimePoints: 1000 },
      { name: "platinum", label: "Platinum", minLifetimePoints: 5000 },
    ],
  },
  totals: {
    order_earned: { points: 48200, count: 312 },
    referral_made: { points: 4200, count: 21 },
    referral_received: { points: 4200, count: 21 },
    redeemed: { points: 9600, count: 44 },
    expired: { points: 1200, count: 9 },
    admin_adjustment: { points: 300, count: 2 },
  },
  byTier: {
    silver: { members: 214, points: 12400, lifetime: 28900 },
    gold: { members: 61, points: 18200, lifetime: 92400 },
    platinum: { members: 9, points: 17600, lifetime: 128000 },
  },
  expiringSoon: { points: 4100, members: 22 },
  liabilityRupees: 48200,
};

const DEMO_MEMBERS: AdminLoyaltyMember[] = [
  { _id: "m1", userId: "u1", email: "meera@example.com", name: "Meera Joshi", points: 1240, lifetimePoints: 8600, tier: "platinum", tierLabel: "Platinum", nextTier: null, valueRupees: 1240, lastEarnedAt: new Date(Date.now() - 86400e3 * 3).toISOString(), memberSince: new Date("2025-11-02").toISOString() },
  { _id: "m2", userId: "u2", email: "ananya@example.com", name: "Ananya Rao", points: 620, lifetimePoints: 2400, tier: "gold", tierLabel: "Gold", nextTier: { name: "platinum", label: "Platinum", pointsNeeded: 2600 }, valueRupees: 620, lastEarnedAt: new Date(Date.now() - 86400e3 * 11).toISOString(), memberSince: new Date("2026-01-18").toISOString() },
  { _id: "m3", userId: "u3", email: "ritika@example.com", name: "Ritika Menon", points: 90, lifetimePoints: 340, tier: "silver", tierLabel: "Silver", nextTier: { name: "gold", label: "Gold", pointsNeeded: 660 }, valueRupees: 90, lastEarnedAt: new Date(Date.now() - 86400e3 * 40).toISOString(), memberSince: new Date("2026-04-07").toISOString() },
  { _id: "m4", userId: "u4", email: "sana@example.com", name: "Sana Kapoor", points: 0, lifetimePoints: 120, tier: "silver", tierLabel: "Silver", nextTier: { name: "gold", label: "Gold", pointsNeeded: 880 }, valueRupees: 0, memberSince: new Date("2026-08-22").toISOString() },
];

const DEMO_DETAIL: { summary: LoyaltySummary; transactions: LoyaltyTransaction[] } = {
  summary: {
    enabled: true,
    points: 1240,
    valueRupees: 1240,
    lifetimePoints: 8600,
    tier: { name: "platinum", label: "Platinum", minLifetimePoints: 5000, next: null },
    expiringSoon: { points: 180, earliest: new Date(Date.now() + 12 * 86400e3).toISOString() },
    redemption: { minPoints: 100, pointValueRupees: 1, maxPercentOfOrder: 50, couponValidDays: 30, canRedeem: true },
    earning: { rupeesPerPoint: 100, expiryMonths: 12 },
    referral: { code: "MEERA7X", bonusPoints: 200, referredCount: 3 },
    totals: { earned: 8200, referrals: 600, redeemed: 9600, expired: 0 },
  },
  transactions: [
    { _id: "t1", delta: 39, reason: "order_earned", note: "Earned on order VC17200000012", balanceAfter: 1240, createdAt: new Date(Date.now() - 86400e3 * 3).toISOString(), expiresAt: new Date(Date.now() + 362 * 86400e3).toISOString() },
    { _id: "t2", delta: 200, reason: "referral_made", note: "Referred Priya", balanceAfter: 1201, createdAt: new Date(Date.now() - 86400e3 * 9).toISOString() },
    { _id: "t3", delta: -380, reason: "redeemed", couponCode: "VC-K7M2QP4X", note: "Redeemed for ₹380 off", balanceAfter: 1001, createdAt: new Date(Date.now() - 86400e3 * 14).toISOString() },
  ],
};

const tierTone = (tier: string): BadgeTone => (tier === "platinum" ? "gold" : tier === "gold" ? "warning" : "neutral");

const reasonTone = (reason: string): BadgeTone => {
  switch (reason) {
    case "order_earned":
      return "success";
    case "referral_made":
    case "referral_received":
      return "gold";
    case "redeemed":
      return "info";
    case "expired":
      return "warning";
    case "admin_adjustment":
      return "danger";
    default:
      return "neutral";
  }
};

export default function LoyaltyPage() {
  const [tier, setTier] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [adjusting, setAdjusting] = useState<AdminLoyaltyMember | null>(null);
  const [delta, setDelta] = useState("");
  const [note, setNote] = useState("");
  const [detail, setDetail] = useState<{ member: AdminLoyaltyMember; summary: LoyaltySummary; transactions: LoyaltyTransaction[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const members = useApiResource<{ data: AdminLoyaltyMember[]; meta: AdminLoyaltyMeta }>(
    (signal) => api.adminLoyalty({ page, tier, q: search.trim() || undefined, limit: 25 }, signal),
    { data: DEMO_MEMBERS, meta: DEMO_META },
    [page, tier, search]
  );
  const live = members.source === "live";
  const rows = members.data.data;
  const meta = members.data.meta ?? DEMO_META;

  const stats = useMemo(() => {
    const outstanding = Object.values(meta.byTier ?? {}).reduce((sum, row) => sum + (row.points || 0), 0);
    const memberCount = Object.values(meta.byTier ?? {}).reduce((sum, row) => sum + (row.members || 0), 0);
    return {
      members: memberCount || meta.total || 0,
      outstanding: outstanding || meta.liabilityRupees || 0,
      liability: meta.liabilityRupees || outstanding,
      expiringPoints: meta.expiringSoon?.points ?? 0,
      expiringMembers: meta.expiringSoon?.members ?? 0,
      redeemed: meta.totals?.redeemed?.count ?? 0,
      redeemedPoints: meta.totals?.redeemed?.points ?? 0,
    };
  }, [meta]);

  const openAdjust = (member: AdminLoyaltyMember) => {
    setAdjusting(member);
    setDelta("");
    setNote("");
    setError(null);
  };

  const submitAdjust = async () => {
    if (!adjusting) return;
    const value = Number(delta);
    if (!Number.isInteger(value) || value === 0) {
      setError("Enter a non-zero whole number of points. Negative numbers remove points.");
      return;
    }
    // A reason is mandatory: an unexplained balance change is impossible to defend to a customer.
    if (note.trim().length < 3) {
      setError("A reason is required — it is shown to the member and written to the audit log.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await api.adminLoyaltyAdjust(adjusting.userId, { delta: value, note: note.trim() });
      setNotice(`${value > 0 ? "Added" : "Removed"} ${Math.abs(value)} points for ${adjusting.email || adjusting.userId}. New balance ${result.data.balance.toLocaleString("en-IN")}.`);
      setAdjusting(null);
      members.refresh();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Could not adjust this balance");
    } finally {
      setBusy(false);
    }
  };

  const openDetail = async (member: AdminLoyaltyMember) => {
    setError(null);
    if (!live) {
      setDetail({ member, summary: DEMO_DETAIL.summary, transactions: DEMO_DETAIL.transactions });
      return;
    }
    setBusy(true);
    try {
      const response = await api.adminLoyaltyMember(member.userId);
      setDetail({ member, summary: response.data.summary, transactions: response.data.transactions });
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Could not load this member");
    } finally {
      setBusy(false);
    }
  };

  const reconcile = () => {
    setError(null);
    setNotice("Re-lapsing due points and reconciling balances against the ledger…");
    // `refresh=true` makes the backend expire anything due and recompute each cached balance.
    void api.adminLoyalty({ page, tier, q: search.trim() || undefined, refresh: true, limit: 25 })
      .then(() => members.refresh())
      .catch((cause: unknown) => setError(cause instanceof ApiError ? cause.message : "Could not reconcile"))
      .then(() => setNotice(null));
  };

  return (
    <div className="space-y-5">
      <PageHeading
        eyebrow="Commerce"
        title="Loyalty"
        subtitle="Points outstanding are a real liability: every point is a rupee the business has promised. Earning, expiry and redemption all happen in the backend ledger."
        action={
          <ButtonGhost onClick={reconcile} disabled={!live}>
            Reconcile balances
          </ButtonGhost>
        }
      />
      <div className="flex justify-end">
        <AdminDataBadge resource={members} />
      </div>

      {!live && <Alert tone="warning">Demo members. Connect the backend and sign in as finance or admin to manage real balances.</Alert>}
      {error && <Alert>{error}</Alert>}
      {notice && <Alert tone="success">{notice}</Alert>}
      {!meta.config?.enabled && <Alert tone="danger">The loyalty programme is disabled (LOYALTY_ENABLED=false). Nothing is being earned or redeemed.</Alert>}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Members" value={stats.members.toLocaleString("en-IN")} hint="Accounts with a loyalty balance" />
        <StatCard label="Points outstanding" value={stats.outstanding.toLocaleString("en-IN")} hint="Unspent across every tier" tone="gold" />
        <StatCard label="Liability" value={formatCurrency(stats.liability)} hint={`At ${formatCurrency(meta.config?.pointValueRupees ?? 1)} per point`} tone="warning" />
        <StatCard
          label="Expiring in 30 days"
          value={stats.expiringPoints.toLocaleString("en-IN")}
          hint={stats.expiringMembers ? `${stats.expiringMembers} members affected` : "Nothing lapses soon"}
          tone={stats.expiringPoints ? "danger" : "success"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Members by tier">
          <div className="space-y-3">
            {LOYALTY_TIERS.map((entry) => {
              const row = meta.byTier?.[entry.name];
              const max = Math.max(...LOYALTY_TIERS.map((t) => meta.byTier?.[t.name]?.members ?? 0), 1);
              return (
                <div key={entry.name}>
                  <div className="flex items-center justify-between text-[12.5px]">
                    <span className="flex items-center gap-2 font-medium text-stone-600">
                      <Badge tone={tierTone(entry.name)}>{entry.label}</Badge>
                      <span className="text-[11px] text-stone-400">
                        from {(meta.config?.tiers ?? []).find((t) => t.name === entry.name)?.minLifetimePoints?.toLocaleString("en-IN") ?? 0} lifetime pts
                      </span>
                    </span>
                    <span className="font-semibold text-[#14100f]">{(row?.members ?? 0).toLocaleString("en-IN")}</span>
                  </div>
                  <div className="mt-1.5">
                    <ProgressBar value={row?.members ?? 0} max={max} tone={entry.name === "platinum" ? "#dfc28c" : entry.name === "gold" ? "#881337" : "#d6d3d1"} />
                  </div>
                  <p className="mt-1 text-[11px] text-stone-400">
                    {(row?.points ?? 0).toLocaleString("en-IN")} points outstanding
                  </p>
                </div>
              );
            })}
          </div>
        </Card>

        <Card title="Ledger activity">
          <div className="space-y-2.5">
            {Object.entries(meta.totals ?? {}).length === 0 && <EmptyState title="No ledger activity yet" hint="Points appear here once orders start being delivered." />}
            {Object.entries(meta.totals ?? {})
              .sort((a, b) => b[1].points - a[1].points)
              .map(([reason, row]) => (
                <div key={reason} className="flex items-center justify-between gap-3">
                  <span className="min-w-0">
                    <Badge tone={reasonTone(reason)}>{reason.replace(/_/g, " ")}</Badge>
                    <span className="ml-2 text-[11.5px] text-stone-500">{row.count.toLocaleString("en-IN")} entries</span>
                  </span>
                  <span className="shrink-0 text-[12.5px] font-semibold text-[#14100f]">{row.points.toLocaleString("en-IN")} pts</span>
                </div>
              ))}
          </div>
          <p className="mt-4 border-t border-[#f0ebe3] pt-3 text-[11.5px] text-stone-500">
            {stats.redeemed.toLocaleString("en-IN")} redemptions worth {stats.redeemedPoints.toLocaleString("en-IN")} points.
          </p>
        </Card>

        <Card title="Programme configuration">
          <dl className="space-y-2 text-[12.5px]">
            {[
              ["Earn rate", `1 point per ${formatCurrency(meta.config?.rupeesPerPoint ?? 100)} of goods value`],
              ["Point value", `${formatCurrency(meta.config?.pointValueRupees ?? 1)} at checkout`],
              ["Minimum redemption", `${(meta.config?.minRedemptionPoints ?? 0).toLocaleString("en-IN")} points`],
              ["Redemption cap", `${meta.config?.maxRedemptionPercent ?? 0}% of an order`],
              ["Point validity", `${meta.config?.expiryMonths ?? 12} months`],
              ["Referral bonus", `${meta.config?.referralBonusPoints ?? 0} points, both sides`],
            ].map(([label, value]) => (
              <div key={label} className="flex items-baseline justify-between gap-3 border-b border-[#f0ebe3] pb-2 last:border-0">
                <dt className="text-stone-500">{label}</dt>
                <dd className="text-right font-semibold text-[#14100f]">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-[11px] leading-relaxed text-stone-400">
            Read from <code>LOYALTY_*</code> environment variables. Changing them takes effect on the next deploy and
            applies to future earning only — points already issued keep their original expiry.
          </p>
        </Card>
      </div>

      <Card
        title="Members"
        action={
          <div className="flex flex-wrap items-center gap-3">
            <label className="sr-only" htmlFor="loyalty-search">Search members</label>
            <TextInput
              id="loyalty-search"
              value={search}
              onChange={(event) => { setSearch(event.target.value); setPage(1); }}
              placeholder="Name or email…"
              className="!w-52 !py-1.5 !text-[12px]"
            />
            <select
              value={tier}
              onChange={(event) => { setTier(event.target.value); setPage(1); }}
              aria-label="Tier"
              className="rounded-xl border border-[#ebe6de] bg-white px-3 py-1.5 text-[12px] font-semibold text-stone-600 outline-none focus:border-[#dfc28c]"
            >
              <option value="all">All tiers</option>
              {LOYALTY_TIERS.map((entry) => (
                <option key={entry.name} value={entry.name}>{entry.label}</option>
              ))}
            </select>
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#f0ebe3] text-[10.5px] font-semibold uppercase tracking-[0.12em] text-stone-400">
                <th className="pb-3 pr-4">Member</th>
                <th className="pb-3 pr-4">Tier</th>
                <th className="pb-3 pr-4 text-right">Points</th>
                <th className="pb-3 pr-4 text-right">Worth</th>
                <th className="pb-3 pr-4 text-right">Lifetime</th>
                <th className="pb-3 pr-4">Last earned</th>
                <th className="pb-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0ebe3]">
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    <EmptyState title="No members match" hint="Clear the filters, or wait for the first delivered order." />
                  </td>
                </tr>
              )}
              {rows.map((member) => (
                <tr key={member._id} className="transition hover:bg-[#faf7f2]/60">
                  <td className="py-3.5 pr-4">
                    <p className="text-[12.5px] font-semibold text-[#14100f]">{member.name || member.email || "Unknown"}</p>
                    <p className="text-[11.5px] text-stone-500">{member.email}</p>
                    {member.phone && <p className="text-[11px] text-stone-400">{member.phone}</p>}
                  </td>
                  <td className="py-3.5 pr-4">
                    <Badge tone={tierTone(member.tier)} dot>{member.tierLabel}</Badge>
                    {member.nextTier && (
                      <p className="mt-1 text-[11px] text-stone-400">
                        {member.nextTier.pointsNeeded.toLocaleString("en-IN")} to {member.nextTier.label}
                      </p>
                    )}
                  </td>
                  <td className="py-3.5 pr-4 text-right text-[13px] font-bold text-[#14100f]">{member.points.toLocaleString("en-IN")}</td>
                  <td className="py-3.5 pr-4 text-right text-[12.5px] text-stone-600">{formatCurrency(member.valueRupees)}</td>
                  <td className="py-3.5 pr-4 text-right text-[12.5px] text-stone-600">{member.lifetimePoints.toLocaleString("en-IN")}</td>
                  <td className="py-3.5 pr-4 text-[12px] text-stone-500">
                    {member.lastEarnedAt ? formatRelativeTime(member.lastEarnedAt) : <span className="text-stone-400">Never</span>}
                    {member.memberSince && (
                      <p className="text-[11px] text-stone-400">
                        since {new Date(member.memberSince).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
                      </p>
                    )}
                  </td>
                  <td className="py-3.5 text-right">
                    <div className="flex justify-end gap-2">
                      <ButtonGhost onClick={() => void openDetail(member)}>View</ButtonGhost>
                      <ButtonGhost onClick={() => openAdjust(member)} disabled={!live}>Adjust</ButtonGhost>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {meta.pages > 1 && (
          <div className="mt-4 flex items-center justify-between border-t border-[#f0ebe3] pt-4">
            <p className="text-[11.5px] text-stone-500">
              Page {meta.page} of {meta.pages} · {meta.total.toLocaleString("en-IN")} members
            </p>
            <div className="flex gap-2">
              <ButtonGhost onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page <= 1}>Previous</ButtonGhost>
              <ButtonGhost onClick={() => setPage((value) => Math.min(meta.pages, value + 1))} disabled={page >= meta.pages}>Next</ButtonGhost>
            </div>
          </div>
        )}

        <p className="mt-4 border-t border-[#f0ebe3] pt-4 text-[11.5px] text-stone-500">
          Backed by <code>GET /api/admin/loyalty</code>, <code>GET /api/admin/loyalty/:userId</code> and{" "}
          <code>POST /api/admin/loyalty/:userId/adjust</code>. Adjustments need finance, admin or super admin and are
          audited.
        </p>
      </Card>

      <Modal
        open={Boolean(adjusting)}
        onClose={() => setAdjusting(null)}
        title={adjusting ? `Adjust ${adjusting.name || adjusting.email}` : "Adjust balance"}
        description="Use this to fix a genuine mistake or make goodwill. Every adjustment is visible to the member."
        footer={
          <>
            <ButtonGhost onClick={() => setAdjusting(null)}>Cancel</ButtonGhost>
            <ButtonPrimary onClick={() => void submitAdjust()} disabled={busy}>
              {busy ? "Saving…" : "Apply adjustment"}
            </ButtonPrimary>
          </>
        }
      >
        {adjusting && (
          <div className="space-y-4">
            <div className="rounded-xl bg-[#faf7f2] px-3.5 py-3 text-[12.5px] text-stone-600">
              <p><span className="font-semibold text-[#14100f]">Current balance</span> {adjusting.points.toLocaleString("en-IN")} points ({formatCurrency(adjusting.valueRupees)})</p>
              <p className="mt-1"><span className="font-semibold text-[#14100f]">Tier</span> {adjusting.tierLabel} · {adjusting.lifetimePoints.toLocaleString("en-IN")} lifetime points</p>
            </div>

            <Field label="Points" htmlFor="adjust-delta" hint="Positive adds, negative removes. Whole numbers only.">
              <TextInput id="adjust-delta" type="number" step={1} value={delta} onChange={(event) => setDelta(event.target.value)} placeholder="50 or -50" />
            </Field>

            {delta && Number(delta) !== 0 && (
              <p className="rounded-xl bg-[#faf7f2] px-3.5 py-2.5 text-[12.5px] text-stone-600">
                New balance would be{" "}
                <span className="font-semibold text-[#14100f]">
                  {(adjusting.points + Number(delta)).toLocaleString("en-IN")} points
                </span>
                {adjusting.points + Number(delta) < 0 && <span className="ml-1 font-semibold text-rose-700">— below zero, which will be refused.</span>}
              </p>
            )}

            <Field label="Reason" htmlFor="adjust-note" hint="Mandatory. Shown in the member's points history and in the audit log.">
              <Textarea id="adjust-note" rows={3} maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Goodwill after a delayed delivery" />
            </Field>

            <Alert tone="info">
              Removing more points than the member holds is refused rather than forcing a negative balance. Reverse a
              mistake with an explicit compensating adjustment so the ledger still reads honestly.
            </Alert>
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title={detail ? detail.member.name || detail.member.email || "Member" : "Member"}
        description={detail?.member.email}
        footer={<ButtonGhost onClick={() => setDetail(null)}>Close</ButtonGhost>}
      >
        {detail && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                ["Balance", `${detail.summary.points.toLocaleString("en-IN")} pts`],
                ["Worth", formatCurrency(detail.summary.valueRupees)],
                ["Tier", detail.summary.tier.label],
                ["Lifetime", `${detail.summary.lifetimePoints.toLocaleString("en-IN")} pts`],
                ["Referral code", detail.summary.referral.code || "—"],
                ["Referred", `${detail.summary.referral.referredCount} friends`],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-[#faf7f2] px-3.5 py-2.5">
                  <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-stone-400">{label}</p>
                  <p className="mt-0.5 text-[13px] font-semibold text-[#14100f]">{value}</p>
                </div>
              ))}
            </div>

            {detail.summary.expiringSoon.points > 0 && (
              <Alert tone="warning">
                {detail.summary.expiringSoon.points.toLocaleString("en-IN")} points lapse
                {detail.summary.expiringSoon.earliest ? ` on ${new Date(detail.summary.expiringSoon.earliest).toLocaleDateString("en-IN", { dateStyle: "medium" })}` : " soon"}.
              </Alert>
            )}

            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">Recent movements</p>
              {detail.transactions.length === 0 ? (
                <p className="text-[12.5px] text-stone-500">No ledger entries.</p>
              ) : (
                <ul className="divide-y divide-[#f0ebe3]">
                  {detail.transactions.map((row) => (
                    <li key={row._id} className="flex items-start justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <Badge tone={reasonTone(row.reason)}>{LOYALTY_REASON_LABELS[row.reason] ?? row.reason}</Badge>
                        {row.note && <p className="mt-1 text-[12px] text-stone-600">{row.note}</p>}
                        <p className="mt-0.5 text-[11px] text-stone-400">
                          {formatRelativeTime(row.createdAt)}
                          {typeof row.balanceAfter === "number" ? ` · balance ${row.balanceAfter.toLocaleString("en-IN")}` : ""}
                          {row.couponCode ? ` · ${row.couponCode}` : ""}
                        </p>
                      </div>
                      <span className={`shrink-0 text-[13px] font-bold ${row.delta > 0 ? "text-emerald-600" : "text-rose-600"}`}>
                        {row.delta > 0 ? "+" : ""}{row.delta.toLocaleString("en-IN")}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
