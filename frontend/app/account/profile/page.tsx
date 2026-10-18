"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge, ButtonDanger, ButtonGhost, ButtonPrimary, Card, Input, PageHeader, Toggle } from "@/lib/account-ui";
import { useAuth } from "@/context/AuthContext";

export default function ProfilePage() {
  const router = useRouter();
  const {
    user,
    isAuthenticated,
    isLoading,
    updateProfile,
    changePassword,
    forgotPassword,
    deleteAccount,
  } = useAuth();

  /* ---------------- Form states ---------------- */
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");

  /* Password state */
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  /* Preferences state */
  const [notif, setNotif] = useState({
    orderUpdates: true,
    whatsapp: true,
    offers: true,
    newsletter: false,
  });

  /* Status messages & loading indicators */
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);

  /* Delete account modal */
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  /* Synchronize local form inputs when user session is loaded */
  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
      setPhone(user.phone || "");

      const prefs = user.preferences;
      if (prefs) {
        setNotif({
          orderUpdates: prefs.orderUpdates ?? true,
          whatsapp: prefs.whatsapp ?? prefs.whatsappUpdates ?? true,
          offers: prefs.offers ?? true,
          newsletter: prefs.newsletter ?? false,
        });
      }
    }
  }, [user]);

  /* ---------------- Loading State ---------------- */
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 animate-pulse rounded-lg bg-stone-200" />
        <div className="h-64 animate-pulse rounded-2xl bg-white border border-[#ebe6de]" />
        <div className="h-48 animate-pulse rounded-2xl bg-white border border-[#ebe6de]" />
      </div>
    );
  }

  /* ---------------- Login Required State ---------------- */
  if (!isAuthenticated || !user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center py-10">
        <div className="w-full max-w-md rounded-2xl border border-[#ebe6de] bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#881337]/10 text-[#881337]">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h2 className="font-serif text-2xl font-bold text-stone-900 mb-2">Sign in to your account</h2>
          <p className="text-stone-600 text-[13px] mb-6 leading-relaxed">
            Please sign in to view and manage your profile details, security settings, and notifications.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/login?redirect=/account/profile"
              className="inline-flex items-center justify-center rounded-full bg-[#881337] px-6 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-[#6b0f2b] transition-all"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-full border border-stone-300 bg-white px-6 py-2.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-all"
            >
              Create Account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* Derived user display information */
  const fullName = [firstName, lastName].filter(Boolean).join(" ") || [user.firstName, user.lastName].filter(Boolean).join(" ") || "Customer";
  const initials =
    [user.firstName?.[0], user.lastName?.[0]].filter(Boolean).join("").toUpperCase() ||
    user.email?.slice(0, 2).toUpperCase() ||
    "VC";

  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-IN", { month: "long", year: "numeric" })
    : null;

  const isAdmin = user.roles?.some((r) => ["admin", "super_admin", "catalog_manager"].includes(r));

  /* ---------------- Handlers ---------------- */
  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setNotice(null);

    if (!firstName.trim()) {
      setError("First name is required.");
      return;
    }

    if (phone.trim()) {
      const cleaned = phone.replace(/\D/g, "").slice(-10);
      if (!/^[6-9]\d{9}$/.test(cleaned)) {
        setError("Please enter a valid 10-digit Indian mobile number.");
        return;
      }
    }

    setSavingProfile(true);
    try {
      await updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim() ? phone.replace(/\D/g, "").slice(-10) : "",
      });
      setNotice("Your profile details have been saved successfully.");
    } catch (cause) {
      setError((cause as Error)?.message || "Failed to update profile. Please try again.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleResetProfile = () => {
    setFirstName(user.firstName || "");
    setLastName(user.lastName || "");
    setPhone(user.phone || "");
    setError(null);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (!currentPassword) {
      setError("Please enter your current password.");
      return;
    }

    if (!newPassword || newPassword.length < 8) {
      setError("New password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New password and confirmation password do not match.");
      return;
    }

    setUpdatingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setNotice("Your password has been changed successfully.");
    } catch (cause) {
      setError((cause as Error)?.message || "Failed to change password. Please check your current password.");
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handlePasswordResetLink = async () => {
    setError(null);
    setNotice(null);
    setSendingReset(true);
    try {
      await forgotPassword(user.email);
      setNotice(`A password reset link has been sent to ${user.email}. Check your inbox to proceed.`);
    } catch (cause) {
      setError((cause as Error)?.message || "Could not send reset link. Please try again later.");
    } finally {
      setSendingReset(false);
    }
  };

  const handleTogglePreference = async (key: keyof typeof notif, value: boolean) => {
    const updated = { ...notif, [key]: value };
    setNotif(updated);
    setSavingPreferences(true);
    try {
      await updateProfile({
        preferences: {
          orderUpdates: updated.orderUpdates,
          whatsapp: updated.whatsapp,
          whatsappUpdates: updated.whatsapp,
          offers: updated.offers,
          newsletter: updated.newsletter,
        },
      });
      setNotice("Notification preferences updated.");
    } catch {
      // Revert if error
      setNotif(notif);
      setError("Could not update preferences. Please try again.");
    } finally {
      setSavingPreferences(false);
    }
  };

  const handleConfirmDelete = async () => {
    setDeleting(true);
    try {
      await deleteAccount();
      router.replace("/");
    } catch (cause) {
      setError((cause as Error)?.message || "Failed to deactivate account. Please contact Vanicollectionguna@gmail.com.");
      setShowDeleteModal(false);
      setDeleting(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Settings"
        title="Profile & Preferences"
        subtitle="Manage your personal details, credentials, and notification settings."
      />

      {/* Notice Banner */}
      {notice && (
        <div className="mb-5 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] text-emerald-800 animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <span>{notice}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="text-emerald-700 hover:text-emerald-900 text-sm font-bold ml-3"
          >
            ×
          </button>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="mb-5 flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-700 animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-rose-600">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-rose-700 hover:text-rose-900 text-sm font-bold ml-3"
          >
            ×
          </button>
        </div>
      )}

      {/* ---------------- Personal Information ---------------- */}
      <Card title="Personal information" description="Your primary identity details on Vani Collection." className="mb-6">
        <div className="flex flex-wrap items-center gap-4 border-b border-[#f0ebe3] pb-6">
          <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#881337] via-[#a21d46] to-[#4c0a1f] text-[20px] font-bold text-white shadow-md">
            {initials}
          </div>
          <div className="flex-1 min-w-[200px]">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-[16px] font-semibold text-stone-900">{fullName}</p>
              {isAdmin && <Badge tone="gold">Administrator</Badge>}
              <Badge tone="success" dot>Active Member</Badge>
            </div>
            <p className="text-[12px] text-stone-500 mt-0.5">
              {memberSince ? `Member since ${memberSince}` : "Valued Vani Collection Customer"}
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveProfile} className="mt-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <Input
              label="First name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="e.g. Priya"
              required
            />
            <Input
              label="Last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="e.g. Sharma"
            />
            <div>
              <Input
                label="Email address"
                type="email"
                value={user.email}
                readOnly
                disabled
                className="bg-stone-50 text-stone-500 cursor-not-allowed"
                hint={<span className="text-[11px] text-stone-400">Primary login credential</span>}
              />
            </div>
            <Input
              label="Phone number"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="10-digit mobile number"
              hint={<span className="text-[11px] text-stone-400">For delivery & WhatsApp alerts</span>}
            />
          </div>

          <div className="mt-6 flex items-center gap-3">
            <ButtonPrimary type="submit" disabled={savingProfile}>
              {savingProfile ? "Saving changes…" : "Save changes"}
            </ButtonPrimary>
            <ButtonGhost type="button" onClick={handleResetProfile}>
              Reset
            </ButtonGhost>
          </div>
        </form>
      </Card>

      {/* ---------------- Password & Security ---------------- */}
      <Card title="Password & Security" description="Update your account password or request a secure reset link." className="mb-6">
        <form onSubmit={handleChangePassword} className="space-y-4 max-w-xl">
          {/* Current Password */}
          <div>
            <label className="block text-[12.5px] font-semibold text-stone-800 mb-1.5">
              Current password
            </label>
            <div className="relative">
              <input
                type={showCurrentPass ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="w-full rounded-lg border border-stone-300 bg-white px-3.5 py-2.5 pr-10 text-[13.5px] text-stone-900 outline-none transition-all placeholder:text-stone-400 focus:border-[#881337] focus:ring-2 focus:ring-[#881337]/15"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPass(!showCurrentPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-xs font-medium"
              >
                {showCurrentPass ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className="block text-[12.5px] font-semibold text-stone-800 mb-1.5">
              New password
            </label>
            <div className="relative">
              <input
                type={showNewPass ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                minLength={8}
                className="w-full rounded-lg border border-stone-300 bg-white px-3.5 py-2.5 pr-10 text-[13.5px] text-stone-900 outline-none transition-all placeholder:text-stone-400 focus:border-[#881337] focus:ring-2 focus:ring-[#881337]/15"
              />
              <button
                type="button"
                onClick={() => setShowNewPass(!showNewPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-xs font-medium"
              >
                {showNewPass ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {/* Confirm New Password */}
          <div>
            <label className="block text-[12.5px] font-semibold text-stone-800 mb-1.5">
              Confirm new password
            </label>
            <div className="relative">
              <input
                type={showConfirmPass ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="w-full rounded-lg border border-stone-300 bg-white px-3.5 py-2.5 pr-10 text-[13.5px] text-stone-900 outline-none transition-all placeholder:text-stone-400 focus:border-[#881337] focus:ring-2 focus:ring-[#881337]/15"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPass(!showConfirmPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-xs font-medium"
              >
                {showConfirmPass ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <div className="pt-2">
            <ButtonPrimary type="submit" disabled={updatingPassword}>
              {updatingPassword ? "Updating password…" : "Update password"}
            </ButtonPrimary>
          </div>
        </form>

        <div className="mt-8 border-t border-[#f0ebe3] pt-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-[13px] font-semibold text-stone-900">Forgot your password?</p>
              <p className="text-[12px] text-stone-500 mt-0.5">
                We can send a secure single-use password reset link to your email ({user.email}).
              </p>
            </div>
            <ButtonGhost type="button" onClick={() => void handlePasswordResetLink()} disabled={sendingReset}>
              {sendingReset ? "Sending link…" : "Email me a reset link"}
            </ButtonGhost>
          </div>
        </div>
      </Card>

      {/* ---------------- Communication Preferences ---------------- */}
      <Card
        title="Communication preferences"
        description="Choose how Vani Collection communicates delivery updates and offers to you."
        className="mb-6"
      >
        <div className="space-y-3">
          <Toggle
            checked={notif.orderUpdates}
            onChange={(val) => void handleTogglePreference("orderUpdates", val)}
            label="Order updates & tracking"
            description="Receive dispatch notifications and real-time delivery status updates."
          />
          <Toggle
            checked={notif.whatsapp}
            onChange={(val) => void handleTogglePreference("whatsapp", val)}
            label="WhatsApp notifications"
            description="Get order confirmation and tracking details sent directly to your WhatsApp."
          />
          <Toggle
            checked={notif.offers}
            onChange={(val) => void handleTogglePreference("offers", val)}
            label="Exclusive offers & promotions"
            description="Early access to festive sales, member-only discounts, and new arrivals."
          />
          <Toggle
            checked={notif.newsletter}
            onChange={(val) => void handleTogglePreference("newsletter", val)}
            label="Artisan stories & style newsletter"
            description="Monthly curation of ethnic fashion inspiration, styling tips, and artisan highlights."
          />
        </div>

        <div className="mt-4 flex items-center justify-between text-[11.5px] text-stone-500">
          <span>Preferences are synchronized to your account in real-time.</span>
          {savingPreferences && <span className="text-[#881337] font-medium">Syncing…</span>}
        </div>
      </Card>

      {/* ---------------- Danger Zone ---------------- */}
      <Card title="Danger zone">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-rose-200 bg-rose-50/70 p-5">
          <div className="max-w-lg">
            <p className="text-[14px] font-semibold text-rose-900">Deactivate account</p>
            <p className="mt-1 text-[12px] leading-relaxed text-rose-700/90">
              Deactivating your account will immediately terminate your active login session across all devices. Order and transaction history are retained for invoice compliance.
            </p>
          </div>
          <ButtonDanger type="button" onClick={() => setShowDeleteModal(true)}>
            Deactivate account
          </ButtonDanger>
        </div>
      </Card>

      {/* ---------------- Delete Confirmation Modal ---------------- */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-xl">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
            </div>
            <h3 className="font-serif text-lg font-bold text-stone-900">
              Deactivate your account?
            </h3>
            <p className="mt-2 text-[13px] text-stone-600 leading-relaxed">
              Are you sure you want to deactivate your Vani Collection account for <strong>{user.email}</strong>? You will be signed out immediately.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <ButtonGhost type="button" onClick={() => setShowDeleteModal(false)} disabled={deleting}>
                Cancel
              </ButtonGhost>
              <button
                type="button"
                onClick={() => void handleConfirmDelete()}
                disabled={deleting}
                className="inline-flex items-center justify-center rounded-full bg-rose-600 px-5 py-2.5 text-[12.5px] font-semibold text-white transition hover:bg-rose-700 disabled:opacity-50"
              >
                {deleting ? "Deactivating…" : "Yes, deactivate account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
