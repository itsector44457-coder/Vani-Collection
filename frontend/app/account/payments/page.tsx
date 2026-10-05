"use client";

import { useState } from "react";
import { Badge, ButtonGhost, ButtonPrimary, Card, IconCard, IconPlus, IconTrash, Input, PageHeader, Select } from "@/lib/account-ui";

interface CardItem {
  id: number;
  brand: "Visa" | "Mastercard" | "Amex";
  last4: string;
  holder: string;
  expiry: string;
  isDefault: boolean;
}

const INITIAL: CardItem[] = [
  { id: 1, brand: "Visa", last4: "4242", holder: "Priya Sharma", expiry: "12/26", isDefault: true },
  { id: 2, brand: "Mastercard", last4: "8821", holder: "Priya Sharma", expiry: "08/25", isDefault: false },
];

const UPI = [{ id: "u1", handle: "priya@okicici", isDefault: true }];

export default function PaymentsPage() {
  const [cards, setCards] = useState(INITIAL);
  const [adding, setAdding] = useState(false);

  const remove = (id: number) => setCards((a) => a.filter((x) => x.id !== id));

  return (
    <>
      <PageHeader
        eyebrow="Billing"
        title="Payment Methods"
        subtitle="Cards and UPI saved for faster checkout."
        action={
          <ButtonPrimary onClick={() => setAdding((v) => !v)}>
            <span className="inline-flex items-center gap-1.5">
              <IconPlus /> {adding ? "Cancel" : "Add card"}
            </span>
          </ButtonPrimary>
        }
      />

      <p className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12.5px] text-amber-800">
        <strong className="font-semibold">Payment methods are stored with the payment gateway, not in this prototype.</strong> Cards and UPI instruments will be listed here once the Razorpay vault is connected; until then this page shows sample data.
      </p>


      {adding && (
        <Card title="Add a new card" className="mb-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Card number" placeholder="1234 5678 9012 3456" />
            <Input label="Cardholder name" placeholder="Priya Sharma" />
            <Input label="Expiry (MM/YY)" placeholder="12/26" />
            <Input label="CVV" placeholder="•••" type="password" />
            <div className="sm:col-span-2">
              <Select label="Card type">
                <option>Visa</option>
                <option>Mastercard</option>
                <option>Amex</option>
                <option>RuPay</option>
              </Select>
            </div>
          </div>
          <div className="mt-5 flex gap-2">
            <ButtonPrimary>Save card</ButtonPrimary>
            <ButtonGhost onClick={() => setAdding(false)}>Cancel</ButtonGhost>
          </div>
        </Card>
      )}

      <div className="space-y-5">
        <Card title="Cards">
          <ul className="divide-y divide-[#f0ebe3]">
            {cards.map((c) => (
              <li key={c.id} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
                <div className="flex h-11 w-16 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#faf7f2] to-[#f0ebe3] text-[11px] font-bold text-[#881337] ring-1 ring-[#ebe6de]">
                  {c.brand}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-[13.5px] font-semibold text-stone-900">
                      •••• {c.last4}
                    </p>
                    {c.isDefault && <Badge tone="gold">Default</Badge>}
                  </div>
                  <p className="mt-0.5 text-[11.5px] text-stone-500">
                    {c.holder} · Expires {c.expiry}
                  </p>
                </div>
                <button
                  onClick={() => remove(c.id)}
                  className="rounded-lg p-2 text-stone-400 transition hover:bg-rose-50 hover:text-rose-600"
                  aria-label="Remove card"
                >
                  <IconTrash />
                </button>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="UPI handles">
          <ul className="divide-y divide-[#f0ebe3]">
            {UPI.map((u) => (
              <li key={u.id} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#faf7f2] text-[#881337] ring-1 ring-[#ebe6de]">
                  <IconCard />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-[13.5px] font-semibold text-stone-900">
                      {u.handle}
                    </p>
                    {u.isDefault && <Badge tone="gold">Default</Badge>}
                  </div>
                  <p className="mt-0.5 text-[11.5px] text-stone-500">
                    Linked UPI handle
                  </p>
                </div>
                <button className="rounded-lg p-2 text-stone-400 transition hover:bg-rose-50 hover:text-rose-600">
                  <IconTrash />
                </button>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}