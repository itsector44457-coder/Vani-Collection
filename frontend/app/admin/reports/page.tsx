"use client";

import { useMemo, useState } from "react";
import {
  Alert,
  AreaChart,
  Badge,
  BarChart,
  ButtonGhost,
  Card,
  EmptyState,
  PageHeading,
  StatCard,
  TextInput,
} from "@/lib/admin-ui";
import AdminDataBadge from "@/components/admin/AdminDataBadge";
import {
  api,
  downloadFile,
  formatCurrency,
  orderStatusLabel,
  toCsv,
  type GstReport,
  type SalesReport,
} from "@/lib/api-client";
import { useApiResource } from "@/lib/use-api";

const DEMO_SALES: SalesReport = {
  from: new Date(Date.now() - 30 * 86400e3).toISOString(),
  to: new Date().toISOString(),
  byDay: Array.from({ length: 30 }, (_, index) => {
    const day = new Date(Date.now() - (29 - index) * 86400e3);
    // Deterministic pseudo-random so the demo chart looks organic without being noisy on refresh.
    const seed = (index * 37) % 11;
    const orders = 3 + seed;
    return {
      _id: day.toISOString().slice(0, 10),
      orders,
      gross: orders * (2100 + seed * 180),
      discounts: orders * (seed % 3 === 0 ? 250 : 0),
      tax: Math.round(orders * (2100 + seed * 180) * 0.12),
    };
  }),
  byStatus: [
    { _id: "delivered", count: 148 },
    { _id: "shipped", count: 36 },
    { _id: "confirmed", count: 22 },
    { _id: "cancelled", count: 9 },
    { _id: "refunded", count: 4 },
  ],
  byPayment: [
    { _id: "upi", count: 121, collected: 268400 },
    { _id: "card", count: 52, collected: 141200 },
    { _id: "cod", count: 46, collected: 88600 },
  ],
  topProducts: [
    { _id: "Chunri Bandhani Saree in Deep Wine", units: 42, revenue: 167958 },
    { _id: "Hand Block Print Cotton Kurti", units: 68, revenue: 101932 },
    { _id: "Zari Woven Silk Dupatta", units: 39, revenue: 50661 },
    { _id: "Gotapatti Festive Lehenga Set", units: 9, revenue: 44991 },
    { _id: "Ajrakh Natural Dye Stole", units: 31, revenue: 27869 },
  ],
};

const DEMO_GST: GstReport = {
  month: new Date().toISOString().slice(0, 7),
  invoices: 143,
  gstByRate: [
    { rate: 0, taxableValue: 18400, tax: 0 },
    { rate: 5, taxableValue: 96200, tax: 4810 },
    { rate: 12, taxableValue: 284600, tax: 34152 },
    { rate: 18, taxableValue: 61200, tax: 11016 },
  ],
  totalTax: 49978,
};

const RANGES = [
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
  { days: 365, label: "12 months" },
] as const;

/** `YYYY-MM` options going back 12 months, newest first — matches `?month=` on the GST endpoint. */
const monthOptions = (): string[] => {
  const out: string[] = [];
  const now = new Date();
  for (let index = 0; index < 12; index += 1) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - index, 1));
    out.push(date.toISOString().slice(0, 7));
  }
  return out;
};

const monthLabel = (month: string): string => {
  const [year, value] = month.split("-").map(Number);
  if (!year || !value) return month;
  return new Date(Date.UTC(year, value - 1, 1)).toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" });
};

/** GST on an intra-state sale splits evenly between CGST and SGST; inter-state is IGST. */
const splitGst = (tax: number) => ({ cgst: Math.round((tax / 2) * 100) / 100, sgst: Math.round((tax / 2) * 100) / 100 });

export default function ReportsPage() {
  const [days, setDays] = useState<number>(30);
  const [month, setMonth] = useState<string>(monthOptions()[0]);

  const sales = useApiResource<{ data: SalesReport }>((signal) => api.salesReport(days, signal), { data: DEMO_SALES }, [days]);
  const gst = useApiResource<{ data: GstReport }>((signal) => api.gstReport(month, signal), { data: DEMO_GST }, [month]);

  const report = sales.data.data;
  const tax = gst.data.data;

  const totals = useMemo(() => {
    const gross = report.byDay.reduce((sum, row) => sum + row.gross, 0);
    const discounts = report.byDay.reduce((sum, row) => sum + row.discounts, 0);
    const collectedTax = report.byDay.reduce((sum, row) => sum + row.tax, 0);
    const orders = report.byDay.reduce((sum, row) => sum + row.orders, 0);
    const cancelled = report.byStatus.find((row) => row._id === "cancelled")?.count ?? 0;
    const refunded = report.byStatus.find((row) => row._id === "refunded")?.count ?? 0;
    return {
      gross,
      net: gross - discounts,
      discounts,
      tax: collectedTax,
      orders,
      aov: orders ? Math.round(gross / orders) : 0,
      cancelled,
      refunded,
    };
  }, [report]);

  const chart = useMemo(
    () => ({
      values: report.byDay.map((row) => row.gross),
      labels: report.byDay.map((row) => row._id.slice(5)),
    }),
    [report]
  );

  const exportSalesCsv = () => {
    downloadFile(
      `vani-sales-${days}d-${new Date().toISOString().slice(0, 10)}.csv`,
      toCsv([
        ["Date", "Orders", "Gross (INR)", "Discounts (INR)", "GST collected (INR)", "Net (INR)"],
        ...report.byDay.map((row) => [row._id, row.orders, row.gross, row.discounts, row.tax, row.gross - row.discounts]),
        [],
        ["Total", totals.orders, totals.gross, totals.discounts, totals.tax, totals.net],
        [],
        ["By status", "Orders"],
        ...report.byStatus.map((row) => [orderStatusLabel(row._id), row.count]),
        [],
        ["By payment method", "Orders", "Collected (INR)"],
        ...report.byPayment.map((row) => [row._id, row.count, row.collected]),
        [],
        ["Top product", "Units", "Revenue (INR)"],
        ...report.topProducts.map((row) => [row._id, row.units, row.revenue]),
      ])
    );
  };

  const exportGstCsv = () => {
    downloadFile(
      `vani-gst-${tax.month}.csv`,
      toCsv([
        [`GST summary for ${monthLabel(tax.month)}`],
        ["HSN / rate %", "Taxable value (INR)", "CGST (INR)", "SGST (INR)", "Total GST (INR)"],
        ...tax.gstByRate.map((row) => {
          const split = splitGst(row.tax);
          return [row.rate, row.taxableValue, split.cgst, split.sgst, row.tax];
        }),
        ["Total", tax.gstByRate.reduce((sum, row) => sum + row.taxableValue, 0), "", "", tax.totalTax],
        [],
        ["Invoices", tax.invoices],
      ])
    );
  };

  const taxableTotal = tax.gstByRate.reduce((sum, row) => sum + row.taxableValue, 0);

  return (
    <div className="space-y-5">
      <PageHeading
        eyebrow="Insights"
        title="Reports"
        subtitle="Revenue over a chosen window plus the monthly GST position. Both exports are generated in your browser — nothing is written to the server."
        action={
          <div className="flex flex-wrap gap-2">
            <ButtonGhost onClick={exportSalesCsv} disabled={report.byDay.length === 0}>
              Export sales CSV
            </ButtonGhost>
            <ButtonGhost onClick={exportGstCsv} disabled={tax.gstByRate.length === 0}>
              Export GST CSV
            </ButtonGhost>
          </div>
        }
      />
      <div className="flex justify-end gap-2">
        <AdminDataBadge resource={sales} label="sales" />
        <AdminDataBadge resource={gst} label="GST" />
      </div>

      {sales.error && <Alert tone="warning">{sales.error}</Alert>}

      <Card title="Reporting window" className="!p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">Sales range</p>
            <div className="flex flex-wrap gap-1.5">
              {RANGES.map((option) => (
                <button
                  key={option.days}
                  type="button"
                  onClick={() => setDays(option.days)}
                  aria-pressed={days === option.days}
                  className={`rounded-full border px-3.5 py-1.5 text-[12px] font-semibold transition ${
                    days === option.days ? "border-[#881337] bg-[#881337] text-white" : "border-[#ebe6de] bg-white text-stone-600 hover:border-[#dfc28c] hover:text-[#881337]"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500" htmlFor="gst-month">
              GST month
            </label>
            <TextInput id="gst-month" type="month" value={month} onChange={(event) => setMonth(event.target.value || monthOptions()[0])} className="!w-44" />
          </div>
          <p className="ml-auto text-[11.5px] text-stone-400">
            {new Date(report.from).toLocaleDateString("en-IN", { dateStyle: "medium" })} →{" "}
            {new Date(report.to).toLocaleDateString("en-IN", { dateStyle: "medium" })}
          </p>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Gross revenue" value={formatCurrency(totals.gross)} hint={`Across ${totals.orders} orders`} tone="gold" />
        <StatCard label="Net of discounts" value={formatCurrency(totals.net)} hint={`${formatCurrency(totals.discounts)} discounted away`} />
        <StatCard label="Average order" value={formatCurrency(totals.aov)} hint="Gross divided by order count" tone="info" />
        <StatCard label="GST collected" value={formatCurrency(totals.tax)} hint="Held on behalf of the exchequer" tone="warning" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Daily gross revenue" className="lg:col-span-2">
          {report.byDay.length > 1 ? (
            <AreaChart data={chart.values} height={220} />
          ) : (
            <EmptyState title="No orders in this window" hint="Try a longer range." />
          )}
          <p className="mt-3 border-t border-[#f0ebe3] pt-3 text-[11.5px] text-stone-500">
            Every day with at least one order is plotted; gaps are days without orders.
          </p>
        </Card>

        <Card title="Orders by status">
          {report.byStatus.length === 0 ? (
            <EmptyState title="Nothing to show" />
          ) : (
            <div className="space-y-2.5">
              {report.byStatus.map((row) => {
                const max = Math.max(...report.byStatus.map((item) => item.count)) || 1;
                return (
                  <div key={row._id} className="flex items-center gap-3">
                    <span className="w-28 shrink-0 text-[12px] text-stone-600">{orderStatusLabel(row._id)}</span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-stone-100">
                      <span className="block h-full rounded-full bg-[#881337]" style={{ width: `${Math.round((row.count / max) * 100)}%` }} />
                    </span>
                    <span className="w-8 text-right text-[12px] font-semibold text-[#14100f]">{row.count}</span>
                  </div>
                );
              })}
            </div>
          )}
          {(totals.cancelled > 0 || totals.refunded > 0) && (
            <p className="mt-4 border-t border-[#f0ebe3] pt-3 text-[11.5px] text-stone-500">
              {totals.cancelled} cancelled and {totals.refunded} refunded in this window.
            </p>
          )}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="GST breakdown" className="lg:col-span-2">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-serif text-[18px] font-semibold text-[#14100f]">{monthLabel(tax.month)}</p>
            <div className="flex items-center gap-2">
              <Badge tone="info">{tax.invoices} invoices</Badge>
              <Badge tone="warning">Tax {formatCurrency(tax.totalTax)}</Badge>
            </div>
          </div>

          {tax.gstByRate.length === 0 ? (
            <EmptyState title="No paid invoices this month" hint="Pick a different month." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-[#f0ebe3] text-[10.5px] font-semibold uppercase tracking-[0.12em] text-stone-400">
                    <th className="pb-3 pr-4">Rate</th>
                    <th className="pb-3 pr-4 text-right">Taxable value</th>
                    <th className="pb-3 pr-4 text-right">CGST</th>
                    <th className="pb-3 pr-4 text-right">SGST</th>
                    <th className="pb-3 text-right">Total GST</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0ebe3]">
                  {tax.gstByRate.map((row) => {
                    const split = splitGst(row.tax);
                    return (
                      <tr key={row.rate}>
                        <td className="py-3 pr-4">
                          <span className="text-[13px] font-bold text-[#14100f]">{row.rate}%</span>
                        </td>
                        <td className="py-3 pr-4 text-right text-[13px] text-stone-600">{formatCurrency(row.taxableValue)}</td>
                        <td className="py-3 pr-4 text-right text-[13px] text-stone-600">{row.rate ? formatCurrency(split.cgst) : "—"}</td>
                        <td className="py-3 pr-4 text-right text-[13px] text-stone-600">{row.rate ? formatCurrency(split.sgst) : "—"}</td>
                        <td className="py-3 text-right text-[13px] font-semibold text-[#14100f]">{row.rate ? formatCurrency(row.tax) : "—"}</td>
                      </tr>
                    );
                  })}
                  <tr className="bg-[#faf7f2]/60">
                    <td className="py-3 pr-4 text-[12px] font-semibold uppercase tracking-[0.1em] text-stone-500">Total</td>
                    <td className="py-3 pr-4 text-right text-[13px] font-semibold text-[#14100f]">{formatCurrency(taxableTotal)}</td>
                    <td className="py-3 pr-4 text-right text-[13px] text-stone-500" />
                    <td className="py-3 pr-4 text-right text-[13px] text-stone-500" />
                    <td className="py-3 text-right text-[14px] font-bold text-[#881337]">{formatCurrency(tax.totalTax)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-4 border-t border-[#f0ebe3] pt-4 text-[11.5px] text-stone-500">
            CGST and SGST are shown as an even split of the tax on each rate slab, which is how an intra-state sale
            reports. Inter-state sales attract IGST instead — the invoice PDF states which applies. Rate slabs come from{" "}
            <code>items[].gstRate</code> on the order snapshot.
          </p>
        </Card>

        <Card title="Payment mix">
          {report.byPayment.length === 0 ? (
            <EmptyState title="Nothing to show" />
          ) : (
            <div className="space-y-3">
              <BarChart
                data={report.byPayment.map((row) => row.count)}
                labels={report.byPayment.map((row) => (row._id || "none").toUpperCase())}
                height={150}
              />
              <div className="space-y-1.5 border-t border-[#f0ebe3] pt-3">
                {report.byPayment.map((row) => (
                  <div key={row._id} className="flex items-center justify-between text-[12px]">
                    <span className="uppercase tracking-wide text-stone-500">{row._id || "none"}</span>
                    <span className="font-semibold text-[#14100f]">{formatCurrency(row.collected)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>

      <Card title="Top products by revenue">
        {report.topProducts.length === 0 ? (
          <EmptyState title="No product sales in this window" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#f0ebe3] text-[10.5px] font-semibold uppercase tracking-[0.12em] text-stone-400">
                  <th className="pb-3 pr-4 w-10">#</th>
                  <th className="pb-3 pr-4">Product</th>
                  <th className="pb-3 pr-4 text-right">Units</th>
                  <th className="pb-3 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0ebe3]">
                {report.topProducts.map((row, index) => (
                  <tr key={row._id} className="transition hover:bg-[#faf7f2]/60">
                    <td className="py-3 pr-4 text-[12px] font-semibold text-stone-400">{index + 1}</td>
                    <td className="py-3 pr-4 text-[13px] font-medium text-[#14100f]">{row._id || "Unknown"}</td>
                    <td className="py-3 pr-4 text-right text-[13px] text-stone-600">{row.units}</td>
                    <td className="py-3 text-right text-[13px] font-semibold text-[#14100f]">{formatCurrency(row.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-4 border-t border-[#f0ebe3] pt-4 text-[11.5px] text-stone-500">
          Backed by <code>GET /api/admin/reports/sales?days=…</code> and <code>GET /api/admin/reports/gst?month=…</code>,
          restricted to finance, admin and super admin.
        </p>
      </Card>
    </div>
  );
}
