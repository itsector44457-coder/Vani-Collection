"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import {
  AlertIcon,
  AuthShell,
  BoxedInput,
  Checkbox,
  Field,
  LockIcon,
  MailIcon,
  PasswordInput,
  PrimaryButton,
  SpinnerIcon,
  UserIcon,
} from "@/lib/auth-shell";

function scorePassword(pw: string) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    agree: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = <K extends keyof typeof form>(k: K) => (v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const strength = useMemo(() => scorePassword(form.password), [form.password]);
  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"][strength];
  const strengthColor = ["#e5e7eb", "#dc2626", "#f59e0b", "#84cc16", "#16a34a"][strength];

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.name || !form.email || !form.password) {
      setError("All fields are required.");
      return;
    }
    if (strength < 2) {
      setError("Please choose a stronger password.");
      return;
    }
    if (!form.agree) {
      setError("Please accept the terms to continue.");
      return;
    }

    setLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 1000));
      router.push("/admin");
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Get started"
      title="Create Account"
      subtitle="Set up your admin access in a minute"
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-[#881337] hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-[12.5px] text-rose-700">
            <AlertIcon />
            <span>{error}</span>
          </div>
        )}

        <Field label="Full Name">
          <BoxedInput
            value={form.name}
            onChange={(e) => set("name")(e.target.value)}
            placeholder="Enter your full name"
            autoComplete="name"
            icon={<UserIcon />}
          />
        </Field>

        <Field label="Username / Email">
          <BoxedInput
            type="email"
            value={form.email}
            onChange={(e) => set("email")(e.target.value)}
            placeholder="Enter your email"
            autoComplete="email"
            icon={<MailIcon />}
          />
        </Field>

        <Field label="Create Password">
          <PasswordInput
            value={form.password}
            onChange={(e) => set("password")(e.target.value)}
            placeholder="At least 8 characters"
            autoComplete="new-password"
            show={showPassword}
            onToggle={() => setShowPassword((v) => !v)}
            icon={<LockIcon />}
          />

          {form.password && (
            <div className="mt-2.5 flex items-center gap-2.5">
              <div className="flex flex-1 gap-1">
                {[1, 2, 3, 4].map((i) => (
                  <span
                    key={i}
                    className="h-1 flex-1 rounded-full transition-colors"
                    style={{
                      background: i <= strength ? strengthColor : "#e5e7eb",
                    }}
                  />
                ))}
              </div>
              <span
                className="text-[10.5px] font-semibold uppercase tracking-wider"
                style={{ color: strengthColor }}
              >
                {strengthLabel}
              </span>
            </div>
          )}
        </Field>

        <div className="flex items-start gap-2.5">
          <Checkbox checked={form.agree} onChange={(v) => set("agree")(v)} />
          <span className="text-[12.5px] leading-relaxed text-stone-600">
            I agree to the{" "}
            <Link href="/terms" className="font-medium text-[#881337] hover:underline">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="font-medium text-[#881337] hover:underline">
              Privacy Policy
            </Link>
            .
          </span>
        </div>

        <PrimaryButton type="submit" disabled={loading}>
          {loading ? (
            <>
              <SpinnerIcon />
              Creating account…
            </>
          ) : (
            "Create Account"
          )}
        </PrimaryButton>
      </form>
    </AuthShell>
  );
}