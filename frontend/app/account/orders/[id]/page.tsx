"use client";

import Link from "next/link";
import { use } from "react";
import { Badge, ButtonGhost, ButtonPrimary, Card, PageHeader } from "@/lib/account-ui";

const ORDER = {
  id: "VC-4821",
  date: "12 Oct 2024, 4:32 PM",
  status: "Shipped",
  eta: "16 Oct 2024",
  address: {
    name: "Priya Sharma",
    line1: "42, Vasant Vihar",
    line2: "New Delhi, Delhi 110057",
    phone: "+91 98XXX 12345",
  },
  payment: { method: "UPI · priya@okicici", status: "Paid", subtotal: 4299, shipping: 0, total: 4299 },
  items: [
    { name: "Gulab Bagh Handblock Mul Cotton Saree", size: "Free Size", qty: 1, price: 2499, sku: "VC-1042" },
    { name: "Madhubani Handpainted Dupatta", size: "Free Size", qty: 1, price: 1800, sku: "VC-0972" },
  ],
};

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <>
      <div className="mb-4">
        <Link
          href="/account/orders"
          className="text-[12px] font-semibold text-stone-500 hover:text-stone-800"
        >
          ← Back to orders
        </Link>
      </div>

      <PageHeader
        eyebrow={`Order #${id}`}
        title="Order Details"
        subtitle={`Placed on ${ORDER.date}`}
        action={<Badge tone="info" dot>{ORDER.status}</Badge>}
      />

      {/* Progress tracker */}
      <Card className="mb-5">
        <div className="grid grid-cols-4 gap-2">
          {["Ordered", "Packed", "Shipped", "Delivered"].map((step, i) => {
            const active = i <= 2;
            return (
              <div key={step} className="flex flex-col items-center text-center">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold ${
                    active
                      ? "bg-[#881337] text-white"
                      : "bg-stone-100 text-stone-400"
                  }`}
                >
                  {active ? "✓" : i + 1}
                </div>
                <p
                  className={`mt-2 text-[11.5px] font-medium ${
                    active ? "text-[#881337]" : "text-stone-400"
                  }`}
                >
                  {step}
                </p>
                {i === 2 && (
                  <p className="mt-0.5 text-[10px] text-stone-400">In progress</p>
                )}
              </div>
            );
          })}
        </div>
        <p className="mt-5 text-center text-[12.5px] text-stone-600">
          Estimated delivery by{" "}
          <span className="font-semibold text-stone-900">{ORDER.eta}</span>
        </p>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        {/* Items */}
        <Card title="Items in this order">
          <ul className="divide-y divide-[#f0ebe3]">
            {ORDER.items.map((it) => (
              <li key={it.sku} className="flex items-start gap-4 py-4 first:pt-0 last:pb-0">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#faf7f2] to-[#f0ebe3] text-[20px] font-bold text-[#881337] ring-1 ring-[#ebe6de]">
                  {it.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-semibold text-stone-900">
                    {it.name}
                  </p>
                  <p className="mt-0.5 text-[11.5px] text-stone-500">
                    SKU {it.sku} · Size {it.size} · Qty {it.qty}
                  </p>
                  <p className="mt-2 text-[13px] font-semibold">
                    ₹{it.price.toLocaleString("en-IN")}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-5 border-t border-[#f0ebe3] pt-4">
            <div className="flex justify-between text-[12.5px] text-stone-600">
              <span>Subtotal</span>
              <span>₹{ORDER.payment.subtotal.toLocaleString("en-IN")}</span>
            </div>
            <div className="mt-2 flex justify-between text-[12.5px] text-stone-600">
              <span>Shipping</span>
              <span className="text-emerald-600 font-semibold">FREE</span>
            </div>
            <div className="mt-3 flex justify-between border-t border-[#f0ebe3] pt-3 text-[15px] font-semibold">
              <span>Total</span>
              <span>₹{ORDER.payment.total.toLocaleString("en-IN")}</span>
            </div>
          </div>
        </Card>

        {/* Sidebar */}
        <div className="space-y-5">
          <Card title="Shipping address">
            <p className="text-[13px] font-semibold text-stone-900">
              {ORDER.address.name}
            </p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-stone-600">
              {ORDER.address.line1}
              <br />
              {ORDER.address.line2}
              <br />
              {ORDER.address.phone}
            </p>
          </Card>

          <Card title="Payment">
            <p className="text-[12.5px] text-stone-600">{ORDER.payment.method}</p>
            <div className="mt-2 flex items-center gap-2">
              <Badge tone="success" dot>{ORDER.payment.status}</Badge>
            </div>
          </Card>

          <Card title="Need help?">
            <p className="text-[12.5px] text-stone-600">
              Questions about this order? We're here to help.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <ButtonPrimary>Contact support</ButtonPrimary>
              <ButtonGhost>Download invoice</ButtonGhost>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}