"use client";

import { useMemo, useRef, useState } from "react";
import {
  Badge,
  ButtonGhost,
  ButtonPrimary,
  Card,
  EmptyState,
  IconGift,
  IconStar,
  Input,
  PageHeader,
} from "@/lib/account-ui";
import {
  api,
  ApiError,
  formatCurrency,
  formatRelativeTime,
  LOYALTY_REASON_LABELS,
  type LoyaltySummary,
  type LoyaltyTransaction,
  type RedemptionResult,
} from "@/lib/api-client";
import { useApiResource } from "@/lib/use-api";

/**
 * Shown when the backend is unreachable so the screen still explains the programme. The numbers are
 * clearly labelled as illustrative and every action is disabled — a demo balance must not look
 * spendable.
 */
const DEMO_SUMMARY: LoyaltySummary = {
  enabled: true,
  points: 1240,
  valueRupees: 1240,
  lifetimePoints: 1240,
  tier: { name: "gold", label: "Gold", minLifetimePoints: 1000, next: { name: "platinum", label: "Platinum", pointsNeeded: 3760 } },
  memberSince: new Date("2026-03-04").toISOString(),
  expiringSoon: { points: 180, earliest: new Date(Date.now() + 12 * 86400e3).toISOString() },
  redemption: { minPoints: 100, pointValueRupees: 1, maxPercentOfOrder: 50, couponValidDays: 30, canRedeem: true },
  earning: { rupeesPerPoint: 100, expiryMonths: 12 },
  referral: { code: "DEMO123", bonusPoints: 200, referredCount: 2 },
  totals: { earned: 1620, referrals: 400, redeemed: 380, expired: 0 },
};

const DEMO_TRANSACTIONS: LoyaltyTransaction[] = [
  { _id: "t1", delta: 39, reason: "order_earned", note: "Earned on order VC17200000012", balanceAfter: 1240, createdAt: new Date(Date.now() - 86400e3 * 3).toISOString() },
  { _id: "t2", delta: 200, reason: "referral_made", note: "Referred Priya", balanceAfter: 1201, createdAt: new Date(Date.now() - 86400e3 * 9).toISOString() },
  { _id: "t3", delta: -380, reason: "redeemed", couponCode: "VC-K7M2QP4X", note: "Redeemed for ₹380 off", balanceAfter: 1001, createdAt: new Date(Date.now() - 86400e3 * 14).toISOString() },
  { _id: "t4", delta: 200, reason: "referral_received", note: "Welcome bonus", balanceAfter: 1381, createdAt: new Date(Date.now() - 86400e3 * 40).toISOString() },
  { _id: "t5", delta: 1181, reason: "order_earned", note: "Earned on order VC17200000004", balanceAfter: 1181, createdAt: new Date(Date.now() - 86400e3 * 52).toISOString() },
];

const reasonTone = (reason: string): "success" | "warning" | "danger" | "info" | "neutral" | "gold" | "rose" => {
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
      return "rose";
    default:
      return "neutral";
  }
};

const TIER_ORDER = ["silver", "gold", "platinum"] as const;

export default function RewardsPage() {
  const [points, setPoints] = useState("");
  const [orderValue, setOrderValue] = useState("");
  const [redeemed, setRedeemed] = useState<RedemptionResult | null>(null);
  const [referralCode, setReferralCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState<"redeem" | "refer" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // Held across a failed attempt so a retry reuses the same key and cannot spend twice.
  const requestIdRef = useRef<string | null>(null);

  const summary = useApiResource<{ data: LoyaltySummary }>((signal) => api.loyaltyMe(signal), { data: DEMO_SUMMARY });
  const history = useApiResource<{ data: LoyaltyTransaction[] }>((signal) => api.loyaltyTransactions(50, signal), { data: DEMO_TRANSACTIONS });

  const me = summary.data.data;
  const transactions = history.data.data;
  const live = summary.source === "live";

  const tierIndex = Math.max(0, TIER_ORDER.indexOf(me.tier.name));
  const progress = useMemo(() => {
    if (!me.tier.next) return 100;
    const span = me.tier.next.pointsNeeded + me.lifetimePoints - me.tier.minLifetimePoints;
    const done = me.lifetimePoints - me.tier.minLifetimePoints;
    return span > 0 ? Math.min(100, Math.max(0, Math.round((done / span) * 100))) : 100;
  }, [me.tier, me.lifetimePoints]);

  const requestedPoints = Math.max(0, Math.floor(Number(points) || 0));
  const previewRupees = Math.floor(requestedPoints * me.redemption.pointValueRupees);
  const capRupees = Number(orderValue) > 0 ? Math.floor((Number(orderValue) * me.redemption.maxPercentOfOrder) / 100) : null;
  const wouldCap = capRupees !== null && previewRupees > capRupees;
  const maxRedeemable = Number(orderValue) > 0 ? Math.floor(capRupees! / me.redemption.pointValueRupees) : me.points;

  const redeem = async () => {
    setError(null);
    setNotice(null);
    if (requestedPoints < me.redemption.minPoints) {
      setError(`The minimum redemption is ${me.redemption.minPoints} points.`);
      return;
    }
    if (requestedPoints > me.points) {
      setError(`You have ${me.points.toLocaleString("en-IN")} points available.`);
      return;
    }
    if (!requestIdRef.current) {
      requestIdRef.current = typeof crypto !== "undefined" && "randomUUID" in crypto
        ? `web-${crypto.randomUUID()}`
        : `web-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }
    setBusy("redeem");
    try {
      const response = await api.loyaltyRedeem({
        points: requestedPoints,
        ...(Number(orderValue) > 0 ? { orderValue: Number(orderValue) } : {}),
        requestId: requestIdRef.current,
      });
      setRedeemed(response.data);
      setPoints("");
      requestIdRef.current = null;
      setNotice(
        response.data.capped
          ? `Applied ${response.data.points.toLocaleString("en-IN")} of your ${requestedPoints.toLocaleString("en-IN")} points — ${formatCurrency(response.data.discountRupees)} is the most this order can take.`
          : `${formatCurrency(response.data.discountRupees)} off, code ${response.data.couponCode}.`
      );
      summary.refresh();
      history.refresh();
    } catch (cause) {
      // Keep the request id so the shopper can retry the same intent safely.
      setError(cause instanceof ApiError ? cause.message : "Could not redeem those points");
    } finally {
      setBusy(null);
    }
  };

  const claimReferral = async () => {
    setError(null);
    setNotice(null);
    const code = referralCode.trim().toUpperCase();
    if (code.length < 4) {
      setError("Enter the code your friend shared.");
      return;
    }
    setBusy("refer");
    try {
      const response = await api.loyaltyApplyReferral(code);
      setReferralCode("");
      setNotice(`${response.data.bonus} points added — thank ${response.data.referrerName} for us.`);
      summary.refresh();
      history.refresh();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Could not apply that code");
    } finally {
      setBusy(null);
    }
  };

  const copyCode = async () => {
    if (!me.referral.code) return;
    try {
      await navigator.clipboard.writeText(me.referral.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Loyalty"
        title="Rewards & points"
        subtitle={`Earn 1 point for every ${formatCurrency(me.earning.rupeesPerPoint)} you spend. Points are valid for ${me.earning.expiryMonths} months.`}
      />

      {!live && (
        <p className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12.5px] text-amber-800">
          <strong className="font-semibold">Showing an illustrative balance.</strong> Connect the backend and sign in to
          see your real points. Redeeming and referrals are disabled here.
        </p>
      )}
      {error && (
        <p role="alert" className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[12.5px] text-rose-700">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[12.5px] text-emerald-800">
          {notice}
        </p>
      )}

      {/* Balance + tier */}
      <div className="mb-5 overflow-hidden rounded-2xl bg-gradient-to-br from-[#881337] via-[#6b0f2b] to-[#4c0a1f] p-6 text-white sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.2em] text-[#dfc28c]">
              {me.tier.label} tier
              {me.memberSince ? ` · member since ${new Date(me.memberSince).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}` : ""}
            </p>
            <p className="mt-3 font-serif text-[42px] font-semibold leading-none">
              {me.points.toLocaleString("en-IN")} <span className="text-[16px] font-normal text-white/60">points</span>
            </p>
            <p className="mt-2 text-[12.5px] text-white/70">
              Worth {formatCurrency(me.valueRupees)} at checkout
            </p>
          </div>
          <div className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#dfc28c]/15 text-[#dfc28c] ring-1 ring-[#dfc28c]/30 sm:flex">
            <IconGift />
          </div>
        </div>

        <div className="mt-6">
          <div className="flex justify-between text-[11.5px] font-medium text-white/70">
            <span>{me.tier.label}</span>
            <span>
              {me.tier.next
                ? `${me.tier.next.pointsNeeded.toLocaleString("en-IN")} lifetime points to `
                : "Top tier — thank you "}
              {me.tier.next && <span className="text-[#dfc28c]">{me.tier.next.label}</span>}
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/15">
            <div className="h-full rounded-full bg-[#dfc28c] transition-all" style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-2 flex justify-between text-[10.5px] text-white/50">
            {TIER_ORDER.map((name, index) => (
              <span key={name} className={index <= tierIndex ? "text-[#dfc28c]" : undefined}>
                {name.charAt(0).toUpperCase() + name.slice(1)}
              </span>
            ))}
          </div>
          <p className="mt-3 text-[11.5px] text-white/60">
            Your tier is based on {me.lifetimePoints.toLocaleString("en-IN")} lifetime points, so spending points never
            moves you down a tier.
          </p>
        </div>
      </div>

      {me.expiringSoon.points > 0 && (
        <p className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12.5px] text-amber-800">
          <strong className="font-semibold">
            {me.expiringSoon.points.toLocaleString("en-IN")} points expire
            {me.expiringSoon.earliest ? ` on ${new Date(me.expiringSoon.earliest).toLocaleDateString("en-IN", { dateStyle: "medium" })}` : " soon"}
          </strong>{" "}
          — worth {formatCurrency(Math.floor(me.expiringSoon.points * me.redemption.pointValueRupees))}. Spend them first:
          we always use your oldest points before your newest.
        </p>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Redeem */}
        <Card title="Redeem for a discount" description="Points become a single-use code bound to your account.">
          {redeemed && (
            <div className="mb-4 rounded-xl border border-[#dfc28c]/50 bg-[#fdf8ee] px-4 py-3.5">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#8a6d2f]">Your code</p>
              <p className="mt-1 font-mono text-[22px] font-bold tracking-[0.12em] text-[#881337]">{redeemed.couponCode}</p>
              <p className="mt-1.5 text-[12px] text-stone-600">
                {formatCurrency(redeemed.discountRupees)} off
                {redeemed.minOrderValue ? ` on orders over ${formatCurrency(redeemed.minOrderValue)}` : ""} · use by{" "}
                {redeemed.expiresAt ? new Date(redeemed.expiresAt).toLocaleDateString("en-IN", { dateStyle: "medium" }) : "—"}
              </p>
              <p className="mt-1 text-[11.5px] text-stone-500">
                {redeemed.points.toLocaleString("en-IN")} points spent · {redeemed.balance.toLocaleString("en-IN")} left.
                Enter the code at checkout.
              </p>
            </div>
          )}

          <div className="space-y-4">
            <Input
              label="Points to redeem"
              type="number"
              min={me.redemption.minPoints}
              step={1}
              value={points}
              onChange={(event) => setPoints(event.target.value)}
              placeholder={String(me.redemption.minPoints)}
              hint={
                <button
                  type="button"
                  onClick={() => setPoints(String(Math.min(me.points, Math.max(me.redemption.minPoints, maxRedeemable))))}
                  className="text-[11.5px] font-semibold text-[#881337] hover:underline"
                  disabled={!live}
                >
                  Use max
                </button>
              }
              disabled={!live}
            />
            <Input
              label="Order value (₹)"
              type="number"
              min={0}
              step={100}
              value={orderValue}
              onChange={(event) => setOrderValue(event.target.value)}
              placeholder="Optional, but recommended"
              hint={<span className="text-[11.5px] text-stone-400">so we can apply the cap before you commit</span>}
              disabled={!live}
            />

            <div className="rounded-xl bg-[#faf7f2] px-4 py-3 text-[12.5px] text-stone-600">
              <div className="flex justify-between">
                <span>Discount</span>
                <span className="font-semibold text-[#14100f]">{formatCurrency(previewRupees)}</span>
              </div>
              {capRupees !== null && (
                <div className="mt-1 flex justify-between">
                  <span>Cap on this order ({me.redemption.maxPercentOfOrder}%)</span>
                  <span className="font-semibold text-[#14100f]">{formatCurrency(capRupees)}</span>
                </div>
              )}
              {wouldCap && (
                <p className="mt-2 text-[11.5px] font-semibold text-amber-700">
                  We will apply {formatCurrency(capRupees)} ({maxRedeemable.toLocaleString("en-IN")} points) and keep the
                  rest in your balance.
                </p>
              )}
            </div>

            <ButtonPrimary onClick={() => void redeem()} disabled={!live || busy === "redeem" || !me.redemption.canRedeem || requestedPoints < me.redemption.minPoints}>
              {busy === "redeem" ? "Redeeming…" : `Redeem for ${formatCurrency(previewRupees)}`}
            </ButtonPrimary>
            {!me.redemption.canRedeem && (
              <p className="text-[11.5px] text-stone-500">
                You need at least {me.redemption.minPoints.toLocaleString("en-IN")} points to redeem.
              </p>
            )}
          </div>
        </Card>

        {/* Refer */}
        <Card title="Refer a friend" description={`You both get ${me.referral.bonusPoints} points when they place their first order.`}>
          <div className="space-y-4">
            <div className="rounded-xl border border-[#dfc28c]/50 bg-[#fdf8ee] px-4 py-3.5">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#8a6d2f]">Your code</p>
              <div className="mt-1 flex items-center gap-3">
                <p className="font-mono text-[22px] font-bold tracking-[0.12em] text-[#881337]">{me.referral.code || "—"}</p>
                {me.referral.code && (
                  <ButtonGhost onClick={() => void copyCode()} className="!px-3 !py-1.5 !text-[11.5px]">
                    {copied ? "Copied" : "Copy"}
                  </ButtonGhost>
                )}
              </div>
              <p className="mt-1.5 text-[12px] text-stone-600">
                {me.referral.referredCount} friend{me.referral.referredCount === 1 ? "" : "s"} referred ·{" "}
                {me.totals.referrals.toLocaleString("en-IN")} points earned from referrals
              </p>
            </div>

            <div className="border-t border-[#f0ebe3] pt-4">
              <p className="mb-3 text-[12.5px] font-semibold text-stone-800">Have a code?</p>
              <div className="flex flex-wrap gap-2">
                <input
                  value={referralCode}
                  onChange={(event) => setReferralCode(event.target.value.toUpperCase())}
                  placeholder="Enter their code"
                  disabled={!live}
                  className="min-w-0 flex-1 rounded-lg border border-stone-300 bg-white px-3.5 py-2.5 font-mono text-[13.5px] uppercase tracking-wide text-stone-900 outline-none transition placeholder:font-sans placeholder:normal-case placeholder:tracking-normal placeholder:text-stone-400 focus:border-[#881337] focus:ring-2 focus:ring-[#881337]/15 disabled:bg-stone-50"
                />
                <ButtonPrimary onClick={() => void claimReferral()} disabled={!live || busy === "refer"}>
                  {busy === "refer" ? "Applying…" : "Apply"}
                </ButtonPrimary>
              </div>
              <p className="mt-2 text-[11.5px] text-stone-500">
                One code per account, and it cannot be your own. You can add it any time before your first referral is
                recorded.
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* History */}
      <Card title="Points history" className="mt-5">
        {transactions.length === 0 ? (
          <EmptyState
            icon={<IconStar />}
            title="No points yet"
            description={`Your first ${formatCurrency(me.earning.rupeesPerPoint)} order earns you your first point. Points appear once the order is delivered.`}
          />
        ) : (
          <ul className="divide-y divide-[#f0ebe3]">
            {transactions.map((row) => (
              <li key={row._id} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={reasonTone(row.reason)}>{LOYALTY_REASON_LABELS[row.reason] ?? row.reason}</Badge>
                    {row.couponCode && <span className="font-mono text-[11.5px] text-stone-500">{row.couponCode}</span>}
                  </div>
                  {row.note && <p className="mt-1 text-[12.5px] text-stone-600">{row.note}</p>}
                  <p className="mt-0.5 text-[11.5px] text-stone-400">
                    {formatRelativeTime(row.createdAt)}
                    {row.expiresAt && row.delta > 0 ? ` · valid until ${new Date(row.expiresAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}` : ""}
                  </p>
                </div>
                <p className={`shrink-0 text-[14px] font-bold ${row.delta > 0 ? "text-emerald-600" : "text-rose-600"}`}>
                  {row.delta > 0 ? "+" : ""}
                  {row.delta.toLocaleString("en-IN")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Totals + terms */}
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card title="Lifetime totals">
          <dl className="grid grid-cols-2 gap-4">
            {[
              ["Earned on orders", me.totals.earned],
              ["From referrals", me.totals.referrals],
              ["Redeemed", me.totals.redeemed],
              ["Expired", me.totals.expired],
            ].map(([label, value]) => (
              <div key={String(label)}>
                <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-400">{label}</dt>
                <dd className="mt-1 font-serif text-[22px] font-semibold text-[#14100f]">{Number(value).toLocaleString("en-IN")}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card title="How it works">
          <ul className="space-y-2 text-[12.5px] leading-relaxed text-stone-600">
            <li>
              You earn 1 point per {formatCurrency(me.earning.rupeesPerPoint)} of goods value, counted once the order is
              marked delivered. Delivery charges and GST do not earn points.
            </li>
            <li>
              Points lapse {me.earning.expiryMonths} months after you earn them. We always spend your oldest points first,
              so nothing lapses while newer points sit unused.
            </li>
            <li>
              A redemption becomes a single-use code worth {formatCurrency(me.redemption.pointValueRupees)} per point,
              usable only on your account and capped at {me.redemption.maxPercentOfOrder}% of an order.
            </li>
            <li>
              Tiers are based on lifetime points, so redeeming or letting points expire never demotes you.
            </li>
            <li>Referral points are added to both accounts once the person you referred signs up.</li>
          </ul>
        </Card>
      </div>
    </>
  );
}
