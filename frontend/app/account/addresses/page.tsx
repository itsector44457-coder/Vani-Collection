"use client";

import { useState } from "react";
import { Badge, ButtonGhost, ButtonPrimary, Card, IconEdit, IconPin, IconPlus, IconTrash, Input, PageHeader } from "@/lib/account-ui";

interface Address {
  id: number;
  label: string;
  name: string;
  line1: string;
  line2: string;
  phone: string;
  isDefault: boolean;
}

const INITIAL: Address[] = [
  {
    id: 1,
    label: "Home",
    name: "Priya Sharma",
    line1: "42, Vasant Vihar",
    line2: "New Delhi, Delhi 110057",
    phone: "+91 98XXX 12345",
    isDefault: true,
  },
  {
    id: 2,
    label: "Office",
    name: "Priya Sharma",
    line1: "WeWork, Cyber Hub, Tower B",
    line2: "Gurugram, Haryana 122002",
    phone: "+91 98XXX 12345",
    isDefault: false,
  },
];

export default function AddressesPage() {
  const [items, setItems] = useState(INITIAL);
  const [adding, setAdding] = useState(false);

  const remove = (id: number) => setItems((a) => a.filter((x) => x.id !== id));
  const setDefault = (id: number) =>
    setItems((a) => a.map((x) => ({ ...x, isDefault: x.id === id })));

  return (
    <>
      <PageHeader
        eyebrow="Shipping"
        title="Saved Addresses"
        subtitle={`${items.length} saved address${items.length > 1 ? "es" : ""}`}
        action={
          <ButtonPrimary onClick={() => setAdding((v) => !v)}>
            <span className="inline-flex items-center gap-1.5">
              <IconPlus /> {adding ? "Cancel" : "Add address"}
            </span>
          </ButtonPrimary>
        }
      />

      {/* Add form */}
      {adding && (
        <Card title="Add new address" className="mb-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Full name" placeholder="e.g. Priya Sharma" />
            <Input label="Phone" placeholder="+91 98XXX XXXXX" />
            <Input label="Address line 1" placeholder="Building, street" />
            <Input label="Address line 2" placeholder="Area, city" />
            <Input label="Pincode" placeholder="110057" />
            <Input label="State" placeholder="Delhi" />
          </div>
          <div className="mt-5 flex gap-2">
            <ButtonPrimary>Save address</ButtonPrimary>
            <ButtonGhost onClick={() => setAdding(false)}>Cancel</ButtonGhost>
          </div>
        </Card>
      )}

      {/* List */}
      <div className="grid gap-4 md:grid-cols-2">
        {items.map((a) => (
          <Card key={a.id} className="!p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#faf7f2] text-[#881337] ring-1 ring-[#ebe6de]">
                <IconPin />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-[12px] font-semibold uppercase tracking-wider text-stone-500">
                    {a.label}
                  </p>
                  {a.isDefault && <Badge tone="gold">Default</Badge>}
                </div>
                <p className="mt-2 text-[13.5px] font-semibold text-stone-900">
                  {a.name}
                </p>
                <p className="mt-0.5 text-[12.5px] leading-relaxed text-stone-600">
                  {a.line1}
                  <br />
                  {a.line2}
                  <br />
                  {a.phone}
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-[#f0ebe3] pt-4">
              <button className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-stone-700 hover:text-[#881337]">
                <IconEdit /> Edit
              </button>
              <button
                onClick={() => remove(a.id)}
                className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-stone-500 hover:text-rose-600"
              >
                <IconTrash /> Remove
              </button>
              {!a.isDefault && (
                <button
                  onClick={() => setDefault(a.id)}
                  className="ml-auto text-[12px] font-semibold text-[#881337] hover:underline"
                >
                  Set as default
                </button>
              )}
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}