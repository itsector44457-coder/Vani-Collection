"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, ApiError, hasStaffAccess, isApiConfigured } from "@/lib/api-client";

export default function AdminLoginPage() {
  const router = useRouter();
  const configured = isApiConfigured();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { data } = await api.login(email.trim(), password);
      if (!hasStaffAccess(data)) {
        await api.logout();
        setError("This account does not have admin access. Ask a super admin for a staff role.");
        return;
      }
      router.replace("/admin");
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Sign in failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#faf7f2] px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-[#ebe6de] bg-white p-8 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#881337] to-[#4c0a1f] font-serif text-lg font-bold text-white">
            V
          </div>
          <div>
            <h1 className="font-serif text-[22px] font-semibold tracking-tight text-[#14100f]">Vani Admin</h1>
            <p className="text-[12px] text-stone-500">Sign in with your staff account</p>
          </div>
        </div>

        {!configured && (
          <p className="mt-5 rounded-xl bg-amber-50 px-3.5 py-3 text-[12.5px] leading-relaxed text-amber-800 ring-1 ring-amber-200">
            The backend URL is not configured for this build, so sign-in is disabled and the console
            keeps showing demo data. Set <code className="font-semibold">NEXT_PUBLIC_API_URL</code> to
            the API host (for example <code className="font-semibold">http://localhost:5000</code>) and redeploy.
          </p>
        )}

        <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
          <div>
            <label htmlFor="admin-email" className="text-[12px] font-semibold text-stone-600">
              Work email
            </label>
            <input
              id="admin-email"
              type="email"
              autoComplete="username"
              required
              disabled={!configured || submitting}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1.5 w-full rounded-xl border border-[#ebe6de] bg-white px-3.5 py-2.5 text-[13.5px] outline-none transition focus:border-[#dfc28c] disabled:bg-stone-50"
              placeholder="admin@vanicollection.in"
            />
          </div>
          <div>
            <label htmlFor="admin-password" className="text-[12px] font-semibold text-stone-600">
              Password
            </label>
            <input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              required
              disabled={!configured || submitting}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1.5 w-full rounded-xl border border-[#ebe6de] bg-white px-3.5 py-2.5 text-[13.5px] outline-none transition focus:border-[#dfc28c] disabled:bg-stone-50"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p role="alert" className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-[12.5px] text-rose-700 ring-1 ring-rose-200">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!configured || submitting}
            className="w-full rounded-xl bg-[#881337] px-4 py-2.5 text-[13px] font-semibold text-white transition hover:bg-[#6b0f2b] disabled:cursor-not-allowed disabled:bg-stone-300"
          >
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-[12px] text-stone-500">
          <Link href="/" className="font-semibold text-[#881337] hover:underline">
            ← Back to storefront
          </Link>
        </p>
      </div>
    </div>
  );
}
