"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Badge, ButtonGhost, ButtonPrimary, Card, EmptyState, IconEdit, IconPin, IconPlus, IconTrash, Input, PageHeader } from "@/lib/account-ui";
import { useAuth, type Address } from "@/context/AuthContext";
import { INDIAN_STATES, stateForPincode } from "@/lib/indian-states";
import { checkServiceability, type Serviceability } from "@/lib/storefront-api";

interface AddressForm {
  fullName: string;
  phone: string;
  address: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
  landmark: string;
  type: Address["type"];
  isDefault: boolean;
}

const EMPTY_FORM: AddressForm = {
  fullName: "",
  phone: "",
  address: "",
  line2: "",
  city: "",
  state: "",
  pincode: "",
  landmark: "",
  type: "home",
  isDefault: false,
};

const LABELS: Record<Address["type"], string> = { home: "Home", work: "Office", other: "Other" };
type FormErrors = Partial<Record<keyof AddressForm, string>>;

const normalizePhone = (value: string) => {
  const digits = value.replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits.slice(0, 10);
};

export default function AddressesPage() {
  const { user, isAuthenticated, mode, addAddress, updateAddress, deleteAddress, setDefaultAddress } = useAuth();
  const live = mode === "live" && isAuthenticated;
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AddressForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [delivery, setDelivery] = useState<Serviceability | null>(null);
  const [pincodeStatus, setPincodeStatus] = useState<"idle" | "checking" | "ok" | "error">("idle");
  const lookupRequestRef = useRef(0);
  const lastLookupPinRef = useRef("");

  const items = [...(live ? user?.addresses ?? [] : [])].sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || a.type.localeCompare(b.type) || a.fullName.localeCompare(b.fullName));
  const formVisible = adding || editingId !== null;

  const focusFirstField = () => {
    window.setTimeout(() => document.getElementById("address-fullName")?.focus(), 60);
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setAdding(false);
    setErrors({});
    setError("");
    setDelivery(null);
    setPincodeStatus("idle");
    lastLookupPinRef.current = "";
  };

  const startAdd = () => {
    resetForm();
    setForm((previous) => ({ ...previous, isDefault: items.length === 0 }));
    setAdding(true);
    focusFirstField();
  };

  const startEdit = (address: Address) => {
    setForm({
      fullName: address.fullName,
      phone: normalizePhone(address.phone),
      address: address.address,
      line2: address.line2 ?? "",
      city: address.city,
      state: address.state,
      pincode: address.pincode,
      landmark: address.landmark ?? "",
      type: address.type,
      isDefault: address.isDefault,
    });
    setEditingId(address.id);
    setAdding(false);
    setErrors({});
    setError("");
    setNotice("");
    setDeletingId(null);
    lastLookupPinRef.current = "";
    focusFirstField();
  };

  const checkPincode = useCallback(async (pin: string): Promise<boolean> => {
    if (!/^[1-9]\d{5}$/.test(pin)) {
      setDelivery(null);
      setPincodeStatus("idle");
      return false;
    }
    lastLookupPinRef.current = pin;
    const request = ++lookupRequestRef.current;
    setPincodeStatus("checking");
    try {
      const result = await checkServiceability(pin);
      if (lookupRequestRef.current !== request) return false;
      if (!result.serviceable) throw new Error("unserviceable");
      setDelivery(result);
      setPincodeStatus("ok");
      setErrors((previous) => ({ ...previous, pincode: undefined }));
      setForm((previous) => previous.pincode === pin && !previous.state ? { ...previous, state: stateForPincode(pin) } : previous);
      return true;
    } catch {
      if (lookupRequestRef.current !== request) return false;
      setDelivery(null);
      setPincodeStatus("error");
      setErrors((previous) => ({ ...previous, pincode: "Is pincode par delivery confirm nahi ho payi — pincode dobara jaanche." }));
      return false;
    }
  }, []);

  useEffect(() => {
    if (!formVisible || form.pincode.length !== 6 || delivery?.pincode === form.pincode || lastLookupPinRef.current === form.pincode) return;
    const timer = window.setTimeout(() => void checkPincode(form.pincode), 350);
    return () => window.clearTimeout(timer);
  }, [checkPincode, delivery?.pincode, form.pincode, formVisible]);

  const setField = <K extends keyof AddressForm>(name: K, rawValue: AddressForm[K]) => {
    let value = rawValue;
    if (name === "phone" && typeof value === "string") value = normalizePhone(value) as AddressForm[K];
    if (name === "pincode" && typeof value === "string") {
      const cleanedPincode = value.replace(/\D/g, "").slice(0, 6);
      value = cleanedPincode as AddressForm[K];
      if (cleanedPincode.length < 6) {
        lastLookupPinRef.current = "";
        setDelivery(null);
        setPincodeStatus("idle");
      }
    }
    setForm((previous) => ({ ...previous, [name]: value }));
    setErrors((previous) => ({ ...previous, [name]: undefined }));
    setError("");
  };

  const validate = (includeDelivery = true): boolean => {
    const next: FormErrors = {};
    if (form.fullName.trim().length < 3) next.fullName = "Poora naam likhe.";
    if (!/^[6-9]\d{9}$/.test(form.phone)) next.phone = "Sahi 10-digit mobile number likhe.";
    if (form.address.trim().length < 8) next.address = "Ghar/flat no. aur area sahit poora address likhe.";
    if (form.city.trim().length < 2) next.city = "Sheher ka naam likhe.";
    if (!form.state) next.state = "Rajya chune.";
    if (!/^[1-9]\d{5}$/.test(form.pincode)) next.pincode = "Sahi 6-digit pincode likhe.";
    else if (includeDelivery && live && delivery?.pincode !== form.pincode) next.pincode = "Delivery jaanch adhuri hai — thoda ruke ya pincode dobara likhe.";

    const duplicate = items.some((item) => item.id !== editingId && item.pincode === form.pincode && normalizePhone(item.phone) === form.phone && `${item.address} ${item.line2 ?? ""}`.trim().toLowerCase() === `${form.address} ${form.line2}`.trim().toLowerCase());
    if (duplicate) next.address = "Yeh address pehle se save lagta hai.";

    setErrors(next);
    const first = (Object.keys(next) as (keyof AddressForm)[]).find((key) => next[key]);
    if (first) requestAnimationFrame(() => document.getElementById(`address-${first}`)?.focus());
    return !first;
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setNotice("");
    if (!live) {
      setError("Address save karne ke liye sign in kare.");
      return;
    }
    if (!validate(false)) return;
    if (delivery?.pincode !== form.pincode) {
      lastLookupPinRef.current = "";
      const checked = await checkPincode(form.pincode);
      if (!checked) return;
    }
    if (!validate()) return;

    setBusy(true);
    try {
      const editing = editingId ? items.find((item) => item.id === editingId) : null;
      const payload: Omit<Address, "id"> = {
        fullName: form.fullName.trim(),
        phone: form.phone,
        address: form.address.trim(),
        line2: form.line2.trim(),
        city: form.city.trim(),
        state: form.state,
        pincode: form.pincode,
        landmark: form.landmark.trim() || undefined,
        type: form.type,
        isDefault: form.isDefault || Boolean(editing?.isDefault) || items.length === 0,
      };
      if (editingId) await updateAddress(editingId, payload);
      else await addAddress(payload);
      resetForm();
      setNotice(editingId ? "Address update ho gaya hai." : "Naya address save ho gaya hai.");
    } catch (cause) {
      setError((cause as Error)?.message || "Address save nahi ho paya.");
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (address: Address) => {
    setActionId(address.id);
    setError("");
    setNotice("");
    try {
      await deleteAddress(address.id);
      setDeletingId(null);
      if (editingId === address.id) resetForm();
      setNotice("Address hata diya gaya hai.");
    } catch (cause) {
      setError((cause as Error)?.message || "Address hata nahi paye.");
    } finally {
      setActionId(null);
    }
  };

  const handleDefault = async (address: Address) => {
    setActionId(address.id);
    setError("");
    setNotice("");
    try {
      await setDefaultAddress(address.id);
      setNotice(`${LABELS[address.type]} address ab default hai.`);
    } catch (cause) {
      setError((cause as Error)?.message || "Default address badal nahi paye.");
    } finally {
      setActionId(null);
    }
  };

  const fieldError = (name: keyof AddressForm) => errors[name] && (
    <p id={`address-${name}-error`} role="alert" className="mt-1 text-[11.5px] leading-relaxed text-rose-700">{errors[name]}</p>
  );

  return (
    <>
      <PageHeader
        eyebrow="Shipping"
        title="Saved Addresses"
        subtitle={`${items.length} saved address${items.length === 1 ? "" : "es"} — default address checkout me pehle bhara jata hai`}
        action={<ButtonPrimary type="button" disabled={!live} onClick={() => (formVisible ? resetForm() : startAdd())}><span className="inline-flex items-center gap-1.5"><IconPlus /> {formVisible ? "Cancel" : "Add address"}</span></ButtonPrimary>}
      />

      <div aria-live="polite">
        {!live && <p className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12.5px] leading-relaxed text-amber-800">Saved addresses ke liye sign in kare. Guest checkout me address checkout par bhara ja sakta hai.</p>}
        {error && <p role="alert" className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[12.5px] leading-relaxed text-rose-700">{error}</p>}
        {notice && <p className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[12.5px] leading-relaxed text-emerald-800">{notice}</p>}
      </div>

      {formVisible && (
        <Card title={editingId ? "Edit address" : "Add new address"} className="mb-5">
          <form onSubmit={(event) => void handleSave(event)} noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Input id="address-fullName" name="fullName" label="Full name" placeholder="Parcel par likha jaane wala naam" autoComplete="name" aria-invalid={Boolean(errors.fullName)} aria-describedby={errors.fullName ? "address-fullName-error" : undefined} value={form.fullName} onChange={(event) => setField("fullName", event.target.value)} />
                {fieldError("fullName")}
              </div>
              <div>
                <Input id="address-phone" name="phone" label="Mobile number" type="tel" inputMode="tel" autoComplete="tel" maxLength={10} placeholder="10-digit number" aria-invalid={Boolean(errors.phone)} aria-describedby={errors.phone ? "address-phone-error" : undefined} value={form.phone} onChange={(event) => setField("phone", event.target.value)} />
                {fieldError("phone")}
              </div>
              <div className="sm:col-span-2">
                <Input id="address-address" name="address" label="Address line 1" placeholder="Ghar/Flat No. aur gali" autoComplete="address-line1" aria-invalid={Boolean(errors.address)} aria-describedby={errors.address ? "address-address-error" : undefined} value={form.address} onChange={(event) => setField("address", event.target.value)} />
                {fieldError("address")}
              </div>
              <div className="sm:col-span-2">
                <Input id="address-line2" name="line2" label="Address line 2 (optional)" placeholder="Apartment, floor, area ya locality" autoComplete="address-line2" value={form.line2} onChange={(event) => setField("line2", event.target.value)} />
              </div>
              <div>
                <Input id="address-landmark" name="landmark" label="Landmark (optional)" placeholder="Mandir, school ya mashhoor jagah ke paas" value={form.landmark} onChange={(event) => setField("landmark", event.target.value)} />
              </div>
              <div>
                <Input id="address-city" name="city" label="City" placeholder="Sheher ka naam" autoComplete="address-level2" aria-invalid={Boolean(errors.city)} aria-describedby={errors.city ? "address-city-error" : undefined} value={form.city} onChange={(event) => setField("city", event.target.value)} />
                {fieldError("city")}
              </div>
              <div>
                <label htmlFor="address-state" className="mb-1.5 block text-[12.5px] font-semibold text-stone-800">State</label>
                <select id="address-state" name="state" autoComplete="address-level1" aria-invalid={Boolean(errors.state)} aria-describedby={errors.state ? "address-state-error" : undefined} value={form.state} onChange={(event) => setField("state", event.target.value)} className="min-h-11 w-full rounded-lg border border-stone-300 bg-white px-3.5 py-2.5 text-[13.5px] text-stone-900 outline-none transition focus:border-[#881337] focus:ring-2 focus:ring-[#881337]/15">
                  <option value="">Rajya chune</option>
                  {INDIAN_STATES.map((state) => <option key={state} value={state}>{state}</option>)}
                  {form.state && !INDIAN_STATES.includes(form.state as never) && <option value={form.state}>{form.state}</option>}
                </select>
                {fieldError("state")}
              </div>
              <div>
                <Input id="address-pincode" name="pincode" label="Pincode" inputMode="numeric" autoComplete="postal-code" maxLength={6} placeholder="6-digit pincode" aria-invalid={Boolean(errors.pincode)} aria-describedby={errors.pincode ? "address-pincode-error" : delivery ? "address-delivery-note" : undefined} value={form.pincode} onChange={(event) => setField("pincode", event.target.value)} />
                {fieldError("pincode")}
                <div aria-live="polite">
                  {pincodeStatus === "checking" && <p className="mt-1 text-[11.5px] text-sky-700">Delivery jaanch ho rahi hai…</p>}
                  {delivery && delivery.pincode === form.pincode && <p id="address-delivery-note" className="mt-1 text-[11.5px] leading-relaxed text-emerald-700">✓ Delivery uplabdh · lagbhag {delivery.etaDays} din · {delivery.cod ? "COD uplabdh" : "Sirf online payment"}</p>}
                </div>
              </div>
              <fieldset>
                <legend className="mb-1.5 text-[12.5px] font-semibold text-stone-800">Address type</legend>
                <div className="flex flex-wrap gap-2">
                  {(["home", "work", "other"] as const).map((type) => (
                    <button key={type} type="button" aria-pressed={form.type === type} onClick={() => setField("type", type)} className={`min-h-11 rounded-lg px-4 py-2.5 text-[12.5px] font-semibold ring-1 transition ${form.type === type ? "bg-[#881337] text-white ring-[#881337]" : "bg-white text-stone-600 ring-stone-300 hover:ring-[#881337]"}`}>{LABELS[type]}</button>
                  ))}
                </div>
              </fieldset>
            </div>

            <label className="mt-5 flex min-h-11 cursor-pointer items-center gap-3 rounded-xl bg-stone-50 px-3.5 py-2.5 text-[13px] font-medium text-stone-700 ring-1 ring-stone-200">
              <input type="checkbox" checked={form.isDefault} onChange={(event) => setField("isDefault", event.target.checked)} className="h-5 w-5 shrink-0 accent-[#881337]" />
              <span>Isse mera default delivery address banaye</span>
            </label>

            <div className="mt-5 flex flex-wrap gap-2">
              <ButtonPrimary type="submit" disabled={busy || pincodeStatus === "checking"}>{busy ? "Save ho raha hai…" : pincodeStatus === "checking" ? "Pincode jaanch ho rahi hai…" : "Save address"}</ButtonPrimary>
              <ButtonGhost type="button" onClick={resetForm} disabled={busy}>Cancel</ButtonGhost>
            </div>
          </form>
        </Card>
      )}

      {items.length === 0 && !formVisible ? (
        <EmptyState icon={<IconPin />} title="Koi address save nahi hai" description="Ek address save karne se checkout har baar tez aur aasan ho jayega." action={<ButtonPrimary type="button" disabled={!live} onClick={startAdd}>Pehla address jode</ButtonPrimary>} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((address) => {
            const deleting = deletingId === address.id;
            const acting = actionId === address.id;
            return (
              <Card key={address.id} className="!p-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#faf7f2] text-[#881337] ring-1 ring-[#ebe6de]"><IconPin /></div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[12px] font-semibold uppercase tracking-wider text-stone-500">{LABELS[address.type]}</p>
                      {address.isDefault && <Badge tone="gold">Default</Badge>}
                    </div>
                    <p className="mt-2 text-[13.5px] font-semibold text-stone-900">{address.fullName}</p>
                    <address className="mt-0.5 text-[12.5px] not-italic leading-relaxed text-stone-600">
                      {[address.address, address.line2].filter(Boolean).join(", ")}<br />
                      {[address.city, address.state, address.pincode].filter(Boolean).join(", ")}
                      {address.landmark && <><br />Landmark: {address.landmark}</>}
                      <br />{address.phone}
                    </address>
                  </div>
                </div>

                {deleting ? (
                  <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-3.5" role="group" aria-label={`${LABELS[address.type]} address delete confirm kare`}>
                    <p className="text-[12.5px] font-semibold text-rose-900">Pakka is address ko hataye?</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button type="button" onClick={() => void handleRemove(address)} disabled={acting} className="min-h-10 rounded-full bg-rose-700 px-4 text-[12px] font-semibold text-white disabled:opacity-50">{acting ? "Hata rahe…" : "Ha, hataye"}</button>
                      <button type="button" onClick={() => setDeletingId(null)} disabled={acting} className="min-h-10 rounded-full border border-rose-200 bg-white px-4 text-[12px] font-semibold text-rose-800">Nahi, rakhe</button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-[#f0ebe3] pt-4">
                    <button type="button" onClick={() => startEdit(address)} className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-[12px] font-semibold text-stone-700 hover:bg-stone-50 hover:text-[#881337]"><IconEdit /> Edit</button>
                    <button type="button" onClick={() => setDeletingId(address.id)} className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-[12px] font-semibold text-stone-500 hover:bg-rose-50 hover:text-rose-600"><IconTrash /> Remove</button>
                    {!address.isDefault && <button type="button" onClick={() => void handleDefault(address)} disabled={acting} className="ml-auto min-h-11 rounded-full px-3 text-[12px] font-semibold text-[#881337] hover:underline disabled:opacity-50">{acting ? "Set ho raha…" : "Set as default"}</button>}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
