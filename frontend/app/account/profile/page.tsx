"use client";

import { useState } from "react";
import { ButtonDanger, ButtonPrimary, Card, Input, PageHeader, Toggle,ButtonGhost } from "@/lib/account-ui";

export default function ProfilePage() {
  const [notif, setNotif] = useState({
    orderUpdates: true,
    offers: true,
    newsletter: false,
    whatsapp: true,
  });

  return (
    <>
      <PageHeader
        eyebrow="Settings"
        title="Profile & Preferences"
        subtitle="Manage your personal information and preferences."
      />

      {/* Personal info */}
      <Card title="Personal information" className="mb-5">
        <div className="flex items-center gap-4 border-b border-[#f0ebe3] pb-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#881337] to-[#4c0a1f] text-[18px] font-bold text-white">
            PS
          </div>
          <div className="flex-1">
            <p className="text-[14px] font-semibold">Priya Sharma</p>
            <p className="text-[12px] text-stone-500">
              Member since March 2024
            </p>
          </div>
          <ButtonGhost>Change photo</ButtonGhost>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Input label="First name" defaultValue="Priya" />
          <Input label="Last name" defaultValue="Sharma" />
          <Input label="Email" type="email" defaultValue="priya@example.com" />
          <Input label="Phone" defaultValue="+91 98XXX 12345" />
          <Input label="Date of birth" type="date" defaultValue="1995-06-15" />
          <Input label="Gender" defaultValue="Female" />
        </div>

        <div className="mt-5 flex gap-2">
          <ButtonPrimary>Save changes</ButtonPrimary>
          <ButtonGhost>Cancel</ButtonGhost>
        </div>
      </Card>

      {/* Password */}
      <Card title="Change password" className="mb-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Input label="Current password" type="password" placeholder="••••••••" />
          </div>
          <Input label="New password" type="password" placeholder="At least 8 characters" />
          <Input label="Confirm new password" type="password" placeholder="Retype new password" />
        </div>
        <div className="mt-5">
          <ButtonPrimary>Update password</ButtonPrimary>
        </div>
      </Card>

      {/* Notifications */}
      <Card title="Communication preferences" className="mb-5">
        <div className="space-y-3">
          <Toggle
            checked={notif.orderUpdates}
            onChange={(v) => setNotif((n) => ({ ...n, orderUpdates: v }))}
            label="Order updates"
            description="Shipping confirmations, delivery updates"
          />
          <Toggle
            checked={notif.offers}
            onChange={(v) => setNotif((n) => ({ ...n, offers: v }))}
            label="Offers & promotions"
            description="Exclusive sales and early access"
          />
          <Toggle
            checked={notif.newsletter}
            onChange={(v) => setNotif((n) => ({ ...n, newsletter: v }))}
            label="Monthly newsletter"
            description="Styling tips, new collections, stories"
          />
          <Toggle
            checked={notif.whatsapp}
            onChange={(v) => setNotif((n) => ({ ...n, whatsapp: v }))}
            label="WhatsApp updates"
            description="Order tracking via WhatsApp"
          />
        </div>
      </Card>

      {/* Danger zone */}
      <Card title="Danger zone">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50/60 p-4">
          <div>
            <p className="text-[13px] font-semibold text-rose-800">
              Delete account
            </p>
            <p className="mt-0.5 text-[11.5px] text-rose-700/80">
              Once deleted, your data cannot be recovered.
            </p>
          </div>
          <ButtonDanger>Delete account</ButtonDanger>
        </div>
      </Card>
    </>
  );
}