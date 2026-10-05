"use client";

import { useState } from "react";
import { Badge, ButtonGhost, ButtonPrimary, Card, IconEdit, IconPin, IconPlus, IconTrash, Input, PageHeader } from "@/lib/account-ui";
import { useAuth, type Address } from "@/context/AuthContext";

const EMPTY_FORM = {
  fullName: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  landmark: "",
  type: "home" as Address["type"],
};

const DEMO_ADDRESSES: Address[] = [
  {
    id: "demo-1",
    type: "home",
    fullName: "Priya Sharma",
    phone: "+91 98XXX 12345",
    address: "42, Vasant Vihar",
    city: "New Delhi",
    state: "Delhi",
    pincode: "110057",
    isDefault: true,
  },
  {
    id: "demo-2",
    type: "work",
    fullName: "Priya Sharma",
    phone: "+91 98XXX 12345",
    address: "WeWork, Cyber Hub, Tower B",
    city: "Gurugram",
    state: "Haryana",
    pincode: "122002",
    isDefault: false,
  },
];

const LABELS: Record<Address["type"], string> = { home: "Home", work: "Office", other: "Other" };

export default function AddressesPage() {
  const { user, isAuthenticated, mode, addAddress, updateAddress, deleteAddress, setDefaultAddress } = useAuth();
  const live = mode === "live" && isAuthenticated;

  const [demoItems, setDemoItems] = useState<Address[]>(DEMO_ADDRESSES);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const items = live ? (user?.addresses ?? []) : demoItems;

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setAdding(false);
    setError("");
  };

  const startEdit = (address: Address) => {
    setForm({
      fullName: address.fullName,
      phone: address.phone,
      address: address.address,
      city: address.city,
      state: address.state,
      pincode: address.pincode,
      landmark: address.landmark ?? "",
      type: address.type,
    });
    setEditingId(address.id);
    setAdding(false);
  };

  const handleSave = async () => {
    setError("");
    if (!form.fullName.trim() || !/^\d{6}$/.test(form.pincode) || !/^\+?[\d\s-]{10,}$/.test(form.phone.trim())) {
      setError("Add a name, a 10-digit phone number and a 6-digit pincode.");
      return;
    }
    setBusy(true);
    try {
      const payload: Omit<Address, "id"> = { ...form, isDefault: items.length === 0 };
      if (live) {
        if (editingId) await updateAddress(editingId, payload);
        else await addAddress(payload);
      } else {
        setDemoItems((current) =>
          editingId
            ? current.map((item) => (item.id === editingId ? { ...item, ...payload } : item))
            : [...current, { ...payload, id: `demo-${Date.now()}` }],
        );
      }
      resetForm();
    } catch (cause) {
      setError((cause as Error)?.message || "We could not save this address.");
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (id: string) => {
    setError("");
    try {
      if (live) await deleteAddress(id);
      else setDemoItems((current) => current.filter((item) => item.id !== id));
    } catch (cause) {
      setError((cause as Error)?.message || "We could not remove this address.");
    }
  };

  const handleDefault = async (id: string) => {
    setError("");
    try {
      if (live) await setDefaultAddress(id);
      else setDemoItems((current) => current.map((item) => ({ ...item, isDefault: item.id === id })));
    } catch (cause) {
      setError((cause as Error)?.message || "We could not update the default address.");
    }
  };

  const formVisible = adding || editingId !== null;

  return (
    <>
      <PageHeader
        eyebrow="Shipping"
        title="Saved Addresses"
        subtitle={`${items.length} saved address${items.length === 1 ? "" : "es"}`}
        action={
          <ButtonPrimary onClick={() => (formVisible ? resetForm() : setAdding(true))}>
            <span className="inline-flex items-center gap-1.5">
              <IconPlus /> {formVisible ? "Cancel" : "Add address"}
            </span>
          </ButtonPrimary>
        }
      />

      {!live && (
        <p className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12.5px] text-amber-800">
          Sample addresses are shown until the storefront is connected to the backend. Sign in with the API configured to
          save real addresses.
        </p>
      )}
      {live && error && (
        <p className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[12.5px] text-rose-700">{error}</p>
      )}

      {formVisible && (
        <Card title={editingId ? "Edit address" : "Add new address"} className="mb-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Full name"
              placeholder="e.g. Priya Sharma"
              value={form.fullName}
              onChange={(event) => setForm({ ...form, fullName: event.target.value })}
            />
            <Input
              label="Phone"
              placeholder="+91 98XXX XXXXX"
              value={form.phone}
              onChange={(event) => setForm({ ...form, phone: event.target.value })}
            />
            <Input
              label="Address line 1"
              placeholder="Building, street"
              value={form.address}
              onChange={(event) => setForm({ ...form, address: event.target.value })}
            />
            <Input
              label="Landmark (optional)"
              placeholder="Near…"
              value={form.landmark}
              onChange={(event) => setForm({ ...form, landmark: event.target.value })}
            />
            <Input
              label="City"
              placeholder="New Delhi"
              value={form.city}
              onChange={(event) => setForm({ ...form, city: event.target.value })}
            />
            <Input
              label="State"
              placeholder="Delhi"
              value={form.state}
              onChange={(event) => setForm({ ...form, state: event.target.value })}
            />
            <Input
              label="Pincode"
              placeholder="110057"
              value={form.pincode}
              onChange={(event) => setForm({ ...form, pincode: event.target.value.replace(/\D/g, "").slice(0, 6) })}
            />
            <div>
              <span className="mb-1.5 block text-[12.5px] font-semibold text-stone-800">Address type</span>
              <div className="flex gap-2">
                {(["home", "work", "other"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setForm({ ...form, type })}
                    className={`rounded-lg px-4 py-2.5 text-[12.5px] font-semibold ring-1 transition ${
                      form.type === type ? "bg-[#881337] text-white ring-[#881337]" : "bg-white text-stone-600 ring-stone-300"
                    }`}
                  >
                    {LABELS[type]}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {error && <p className="mt-4 text-[12.5px] text-rose-700">{error}</p>}
          <div className="mt-5 flex gap-2">
            <ButtonPrimary onClick={() => void handleSave()} disabled={busy}>
              {busy ? "Saving…" : "Save address"}
            </ButtonPrimary>
            <ButtonGhost onClick={resetForm}>Cancel</ButtonGhost>
          </div>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {items.map((address) => (
          <Card key={address.id} className="!p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#faf7f2] text-[#881337] ring-1 ring-[#ebe6de]">
                <IconPin />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-[12px] font-semibold uppercase tracking-wider text-stone-500">{LABELS[address.type]}</p>
                  {address.isDefault && <Badge tone="gold">Default</Badge>}
                </div>
                <p className="mt-2 text-[13.5px] font-semibold text-stone-900">{address.fullName}</p>
                <p className="mt-0.5 text-[12.5px] leading-relaxed text-stone-600">
                  {address.address}
                  <br />
                  {[address.city, address.state, address.pincode].filter(Boolean).join(", ")}
                  {address.landmark ? (
                    <>
                      <br />
                      Landmark: {address.landmark}
                    </>
                  ) : null}
                  <br />
                  {address.phone}
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-[#f0ebe3] pt-4">
              <button
                onClick={() => startEdit(address)}
                className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-stone-700 hover:text-[#881337]"
              >
                <IconEdit /> Edit
              </button>
              <button
                onClick={() => void handleRemove(address.id)}
                className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-stone-500 hover:text-rose-600"
              >
                <IconTrash /> Remove
              </button>
              {!address.isDefault && (
                <button
                  onClick={() => void handleDefault(address.id)}
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
