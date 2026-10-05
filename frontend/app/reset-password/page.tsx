"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { AuthShell, LockIcon, PrimaryButton, SpinnerIcon } from "@/lib/auth-shell";
import { useAuth } from "@/context/AuthContext";

function ResetPasswordContent() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const { resetPassword } = useAuth();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Use at least 8 characters for your new password.");
      return;
    }
    if (password !== confirm) {
      setError("Both passwords must match.");
      return;
    }
    setLoading(true);
    try {
      await resetPassword(token, password);
      setDone(true);
      setTimeout(() => router.push("/login"), 2500);
    } catch (cause) {
      setError((cause as Error)?.message || "This reset link is invalid or has expired. Please request a new one.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <AuthShell
        eyebrow="Reset password"
        title="Link missing"
        subtitle="Open the reset link from your email to choose a new password."
        footer={
          <Link href="/forgot-password" className="font-semibold text-[#881337] hover:underline">
            Request a new link
          </Link>
        }
      >
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-[13px] text-amber-800">
          This page needs the <code className="font-semibold">token</code> from your reset link.
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Reset password"
      title={done ? "Password updated" : "Choose a new password"}
      subtitle={done ? "You can sign in with your new password now." : "Pick something only you know — at least 8 characters."}
      footer={
        <Link href="/login" className="font-semibold text-[#881337] hover:underline">
          ← Back to sign in
        </Link>
      }
    >
      {done ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center">
          <p className="text-[13px] font-semibold text-emerald-900">Password changed successfully.</p>
          <p className="mt-1 text-[12px] text-emerald-700">Taking you to the sign-in page…</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div>
            <label htmlFor="new-password" className="block text-[12.5px] font-semibold text-stone-600">
              New password
            </label>
            <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-[#ebe6de] bg-white px-3 py-2.5 focus-within:border-[#dfc28c]">
              <span className="text-stone-400">
                <LockIcon />
              </span>
              <input
                id="new-password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full bg-transparent text-[13.5px] outline-none"
                placeholder="••••••••"
              />
            </div>
          </div>
          <div>
            <label htmlFor="confirm-password" className="block text-[12.5px] font-semibold text-stone-600">
              Confirm password
            </label>
            <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-[#ebe6de] bg-white px-3 py-2.5 focus-within:border-[#dfc28c]">
              <span className="text-stone-400">
                <LockIcon />
              </span>
              <input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                required
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                className="w-full bg-transparent text-[13.5px] outline-none"
                placeholder="••••••••"
              />
            </div>
          </div>

          {error && (
            <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-[12.5px] text-rose-700">
              {error}
            </p>
          )}

          <PrimaryButton type="submit" disabled={loading}>
            {loading ? (
              <>
                <SpinnerIcon /> Updating…
              </>
            ) : (
              "Update password"
            )}
          </PrimaryButton>
        </form>
      )}
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#faf7f2]">
          <p className="text-sm text-stone-500">Loading…</p>
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
