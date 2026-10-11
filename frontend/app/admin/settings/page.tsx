"use client";

import { useState } from "react";
import { Alert, ButtonPrimary, Card, Field, PageHeading, TextInput } from "@/lib/admin-ui";
import { ApiError, api } from "@/lib/api-client";
import { useAdminSession } from "@/lib/use-admin-session";

export default function AdminSettingsPage() {
  const session = useAdminSession();
  const [email, setEmail] = useState<string | null>(null);
  const [firstName, setFirstName] = useState<string | null>(null);
  const [lastName, setLastName] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const save = async () => {
    const nextEmail = email ?? session.user?.email ?? "";
    const nextFirstName = firstName ?? session.user?.firstName ?? "";
    const nextLastName = lastName ?? session.user?.lastName ?? "";
    if (!currentPassword) {
      setError("Enter your current password to confirm these changes.");
      return;
    }
    if (newPassword && newPassword.length < 8) {
      setError("Your new password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("The new password and confirmation do not match.");
      return;
    }
    if (session.user?.mustChangePassword && !newPassword) {
      setError("Set a new password before accessing the admin console.");
      return;
    }
    if (
      !session.user?.mustChangePassword
      && !newPassword
      && nextEmail.trim().toLowerCase() === session.user?.email.toLowerCase()
      && nextFirstName.trim() === session.user?.firstName
      && nextLastName.trim() === (session.user?.lastName ?? "")
    ) {
      setError("There are no account changes to save.");
      return;
    }

    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await api.changeCredentials({
        currentPassword,
        ...(nextEmail.trim().toLowerCase() !== session.user?.email.toLowerCase() ? { email: nextEmail.trim() } : {}),
        ...(nextFirstName.trim() !== session.user?.firstName ? { firstName: nextFirstName.trim() } : {}),
        ...(nextLastName.trim() !== (session.user?.lastName ?? "") ? { lastName: nextLastName.trim() } : {}),
        ...(newPassword ? { newPassword } : {}),
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setNotice("Your account settings were updated.");
      session.reload();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Could not update your account settings.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeading
        eyebrow="Your account"
        title="Account settings"
        subtitle="Update your staff account details and password. Your current password is required to confirm changes."
      />
      {session.user?.mustChangePassword && (
        <Alert tone="warning">This account uses a temporary password. Set a new password to unlock the admin console.</Alert>
      )}
      {error && <Alert>{error}</Alert>}
      {notice && <Alert tone="success">{notice}</Alert>}

      <Card title="Profile and sign-in">
        <div className="space-y-4">
          <Field label="Email address" htmlFor="admin-settings-email">
            <TextInput id="admin-settings-email" type="email" autoComplete="email" value={email ?? session.user?.email ?? ""} onChange={(event) => setEmail(event.target.value)} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="First name" htmlFor="admin-settings-first">
              <TextInput id="admin-settings-first" autoComplete="given-name" value={firstName ?? session.user?.firstName ?? ""} onChange={(event) => setFirstName(event.target.value)} />
            </Field>
            <Field label="Last name" htmlFor="admin-settings-last">
              <TextInput id="admin-settings-last" autoComplete="family-name" value={lastName ?? session.user?.lastName ?? ""} onChange={(event) => setLastName(event.target.value)} />
            </Field>
          </div>
          <Field label="Current password" htmlFor="admin-settings-current">
            <TextInput id="admin-settings-current" type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="New password" htmlFor="admin-settings-new" hint="Leave blank if you are not changing your password.">
              <TextInput id="admin-settings-new" type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
            </Field>
            <Field label="Confirm new password" htmlFor="admin-settings-confirm">
              <TextInput id="admin-settings-confirm" type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
            </Field>
          </div>
          <div className="flex justify-end">
            <ButtonPrimary onClick={() => void save()} disabled={busy || !session.user}>
              {busy ? "Saving…" : "Save account"}
            </ButtonPrimary>
          </div>
        </div>
      </Card>
    </div>
  );
}
