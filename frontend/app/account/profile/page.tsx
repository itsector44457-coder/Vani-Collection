"use client";

import { useState } from "react";
import { ButtonDanger, ButtonPrimary, Card, Input, PageHeader, Toggle, ButtonGhost } from "@/lib/account-ui";
import { useAuth } from "@/context/AuthContext";

const notifDefaults = {
  orderUpdates: true,
  offers: true,
  newsletter: false,
  whatsapp: true,
};

export default function ProfilePage() {
  const { user, mode, updateProfile, forgotPassword } = useAuth();
  const live = mode === "live";

  /* Only the visitor's edits live in state — the rest is derived from the session, so no syncing effect is needed. */
  const [edits, setEdits] = useState<{ firstName?: string; lastName?: string; phone?: string }>({});
  const [notifEdits, setNotifEdits] = useState<Partial<typeof notifDefaults>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);

  const profile = {
    firstName: edits.firstName ?? user?.firstName ?? "Priya",
    lastName: edits.lastName ?? user?.lastName ?? "Sharma",
    email: user?.email ?? "priya@example.com",
    phone: edits.phone ?? user?.phone ?? "+91 98XXX 12345",
  };

  const notif = {
    ...notifDefaults,
    offers: user?.preferences ? user.preferences.newsletter : notifDefaults.offers,
    newsletter: user?.preferences ? user.preferences.newsletter : notifDefaults.newsletter,
    whatsapp: user?.preferences ? user.preferences.whatsappUpdates : notifDefaults.whatsapp,
    ...notifEdits,
  };

  const setProfileField = (field: "firstName" | "lastName" | "phone", value: string) =>
    setEdits((current) => ({ ...current, [field]: value }));

  const setNotifField = (field: keyof typeof notifDefaults, value: boolean) =>
    setNotifEdits((current) => ({ ...current, [field]: value }));

  const initials = `${profile.firstName.charAt(0)}${profile.lastName.charAt(0)}`.toUpperCase() || "VC";
  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-IN", { month: "long", year: "numeric" })
    : live
      ? null
      : "March 2024";

  const handleSave = async () => {
    setError("");
    setNotice(null);
    if (!profile.firstName.trim() || !profile.lastName.trim()) {
      setError("Both first and last name are required.");
      return;
    }
    setSaving(true);
    try {
      if (live) {
        await updateProfile({ firstName: profile.firstName.trim(), lastName: profile.lastName.trim(), phone: profile.phone.trim() });
      }
      setEdits({});
      setNotice("Profile updated.");
    } catch (cause) {
      setError((cause as Error)?.message || "We could not save your profile.");
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordReset = async () => {
    setError("");
    setNotice(null);
    if (!live) {
      setNotice("Demo mode — connect the backend to change your password.");
      return;
    }
    setSendingReset(true);
    try {
      await forgotPassword(profile.email);
      setNotice(`A password reset link has been sent to ${profile.email}. Open it to set a new password.`);
    } catch (cause) {
      setError((cause as Error)?.message || "We could not start the password change.");
    } finally {
      setSendingReset(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Settings"
        title="Profile & Preferences"
        subtitle="Manage your personal information and preferences."
      />

      {notice && (
        <p className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[12.5px] text-emerald-800">{notice}</p>
      )}
      {error && (
        <p className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[12.5px] text-rose-700">{error}</p>
      )}

      {/* Personal info */}
      <Card title="Personal information" className="mb-5">
        <div className="flex items-center gap-4 border-b border-[#f0ebe3] pb-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#881337] to-[#4c0a1f] text-[18px] font-bold text-white">
            {initials}
          </div>
          <div className="flex-1">
            <p className="text-[14px] font-semibold">
              {profile.firstName} {profile.lastName}
            </p>
            <p className="text-[12px] text-stone-500">
              {memberSince ? `Member since ${memberSince}` : "Vani Collection customer"}
            </p>
          </div>
          <ButtonGhost>Change photo</ButtonGhost>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Input
            label="First name"
            value={profile.firstName}
            onChange={(event) => setProfileField("firstName", event.target.value)}
          />
          <Input
            label="Last name"
            value={profile.lastName}
            onChange={(event) => setProfileField("lastName", event.target.value)}
          />
          <Input label="Email" type="email" value={profile.email} readOnly />
          <Input label="Phone" value={profile.phone} onChange={(event) => setProfileField("phone", event.target.value)} />
        </div>

        <div className="mt-5 flex gap-2">
          <ButtonPrimary onClick={() => void handleSave()} disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </ButtonPrimary>
          <ButtonGhost onClick={() => setEdits({})}>Reset</ButtonGhost>
        </div>
      </Card>

      {/* Password */}
      <Card title="Change password" className="mb-5">
        <p className="text-[12.5px] leading-relaxed text-stone-600">
          For your safety we email a single-use reset link instead of accepting a new password here.
          {live ? " Open the link to choose a new password." : " Connect the backend to enable this."}
        </p>
        <div className="mt-5">
          <ButtonPrimary onClick={() => void handlePasswordReset()} disabled={sendingReset}>
            {sendingReset ? "Sending link…" : "Email me a reset link"}
          </ButtonPrimary>
        </div>
      </Card>

      {/* Notifications */}
      <Card title="Communication preferences" className="mb-5">
        <div className="space-y-3">
          <Toggle
            checked={notif.orderUpdates}
            onChange={(value) => setNotifField("orderUpdates", value)}
            label="Order updates"
            description="Shipping confirmations, delivery updates"
          />
          <Toggle
            checked={notif.offers}
            onChange={(value) => setNotifField("offers", value)}
            label="Offers & promotions"
            description="Exclusive sales and early access"
          />
          <Toggle
            checked={notif.newsletter}
            onChange={(value) => setNotifField("newsletter", value)}
            label="Monthly newsletter"
            description="Styling tips, new collections, stories"
          />
          <Toggle
            checked={notif.whatsapp}
            onChange={(value) => setNotifField("whatsapp", value)}
            label="WhatsApp updates"
            description="Order tracking via WhatsApp"
          />
        </div>
        <p className="mt-4 text-[11.5px] text-stone-500">
          Preferences are stored on this device for now; they will sync once the notification service is connected.
        </p>
      </Card>

      {/* Danger zone */}
      <Card title="Danger zone">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50/60 p-4">
          <div>
            <p className="text-[13px] font-semibold text-rose-800">Delete account</p>
            <p className="mt-0.5 text-[11.5px] text-rose-700/80">
              Once deleted, your data cannot be recovered. Write to care@vanicollection.com to request deletion.
            </p>
          </div>
          <ButtonDanger disabled title="Email care@vanicollection.com to delete your account">
            Delete account
          </ButtonDanger>
        </div>
      </Card>
    </>
  );
}
