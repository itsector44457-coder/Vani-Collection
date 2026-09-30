"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  AlertIcon,
  AuthShell,
  BoxedInput,
  Checkbox,
  Field,
  LockIcon,
  PasswordInput,
  PrimaryButton,
  SpinnerIcon,
  UserIcon,
} from "@/lib/auth-shell";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username || !password) {
      setError("Please enter both username and password.");
      return;
    }

    setLoading(true);
    try {
      // 🔌 Replace with your API
      await new Promise((r) => setTimeout(r, 900));
      router.push("/admin");
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Let's Get Started"
      subtitle="Sign in to your admin console"
      footer={
        <>
          New here?{" "}
          <Link href="/signup" className="font-semibold text-[#881337] hover:underline">
            Create an account
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

        <Field label="Username / Email">
          <BoxedInput
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your username or email"
            autoComplete="username"
            icon={<UserIcon />}
          />
        </Field>

        <Field
          label="Password / OTP"
          hint={
            <Link
              href="/forgot-password"
              className="text-[12.5px] font-medium text-[#881337] hover:underline"
            >
              Trouble in Login?
            </Link>
          }
        >
          <PasswordInput
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            autoComplete="current-password"
            show={showPassword}
            onToggle={() => setShowPassword((v) => !v)}
            icon={<LockIcon />}
          />
        </Field>

        <Checkbox checked={remember} onChange={setRemember}>
          Keep me signed in for 30 days
        </Checkbox>

        <PrimaryButton type="submit" disabled={loading}>
          {loading ? (
            <>
              <SpinnerIcon />
              Signing in…
            </>
          ) : (
            "Sign In"
          )}
        </PrimaryButton>

        <div className="rounded-lg border border-dashed border-stone-300 bg-stone-50 px-4 py-2.5 text-center">
          <p className="text-[10.5px] font-semibold uppercase tracking-wider text-stone-400">
            Demo credentials
          </p>
          <p className="mt-0.5 text-[12px] text-stone-600">
            <span className="font-mono">admin@vani.in</span> ·{" "}
            <span className="font-mono">vani@2024</span>
          </p>
        </div>
      </form>
    </AuthShell>
  );
}