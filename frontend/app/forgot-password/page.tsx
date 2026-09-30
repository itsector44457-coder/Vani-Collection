"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import {
  AlertIcon,
  AuthShell,
  BoxedInput,
  Field,
  MailIcon,
  PrimaryButton,
  SpinnerIcon,
} from "@/lib/auth-shell";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email) {
      setError("Please enter your email address.");
      return;
    }
    setLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 900));
      setSent(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <AuthShell
        eyebrow="Check your inbox"
        title="Email sent!"
        subtitle="We've sent a password reset link to your email."
        footer={
          <Link href="/login" className="font-semibold text-[#881337] hover:underline">
            ← Back to sign in
          </Link>
        }
      >
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-white">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <p className="mt-4 text-[14px] font-semibold text-emerald-900">
            Reset link sent to
          </p>
          <p className="mt-1 break-all text-[13px] text-emerald-800">{email}</p>
          <p className="mt-3 text-[12px] text-emerald-700">
            Didn't receive it? Check spam or{" "}
            <button
              onClick={() => setSent(false)}
              className="font-semibold underline"
            >
              try again
            </button>
            .
          </p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Reset password"
      title="Forgot your password?"
      subtitle="Enter your email and we'll send you a reset link."
      footer={
        <Link href="/login" className="font-semibold text-[#881337] hover:underline">
          ← Back to sign in
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-[12.5px] text-rose-700">
            <AlertIcon />
            <span>{error}</span>
          </div>
        )}

        <Field label="Email address">
          <BoxedInput
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@vanicollection.in"
            autoComplete="email"
            icon={<MailIcon />}
          />
        </Field>

        <PrimaryButton type="submit" disabled={loading}>
          {loading ? (
            <>
              <SpinnerIcon />
              Sending link…
            </>
          ) : (
            "Send reset link"
          )}
        </PrimaryButton>
      </form>
    </AuthShell>
  );
}