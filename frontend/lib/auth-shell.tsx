"use client";

import Link from "next/link";
import type { InputHTMLAttributes, ReactNode } from "react";

/* 🖼️ Swap this anytime — see suggestions below */
const AUTH_HERO_IMAGE =
  "https://images.unsplash.com/photo-1557739266-ef64eca74983?q=80&w=1400&auto=format&fit=crop";

export function AuthShell({
  eyebrow,
  title,
  subtitle,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white">
      <div className="grid min-h-screen lg:grid-cols-2">
        {/* ==================================================== */}
        {/* LEFT · IMAGE with smooth right bulge                 */}
        {/* ==================================================== */}
        <div className="relative hidden lg:block">
          <div
            className="absolute inset-0 overflow-hidden"
            style={{
              borderTopRightRadius: "50% 50%",
              borderBottomRightRadius: "50% 50%",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={AUTH_HERO_IMAGE}
              alt=""
              aria-hidden="true"
              className="h-full w-full object-cover"
            />
            {/* soft brand wash */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/10" />
            <div className="absolute inset-0 bg-gradient-to-br from-[#881337]/20 via-transparent to-[#dfc28c]/10" />
          </div>

          {/* Bottom-left overlay text */}
          <div className="absolute bottom-10 left-10 z-10 max-w-sm">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-black/30 px-3 py-1.5 backdrop-blur-md">
              <span className="h-1.5 w-1.5 rounded-full bg-[#dfc28c]" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white">
                Admin Console
              </span>
            </div>
            <p className="mt-4 font-serif text-[26px] font-semibold leading-tight text-white drop-shadow-lg">
              Where craft meets
              <span className="italic text-[#dfc28c]"> commerce.</span>
            </p>
          </div>
        </div>

        {/* ==================================================== */}
        {/* RIGHT · FORM                                         */}
        {/* ==================================================== */}
        <main className="relative flex flex-col bg-white">
          {/* Brand header */}
          <div className="flex items-center justify-center px-6 pt-10">
            <Link href="/" className="flex items-center gap-3.5">
              <div className="relative flex h-12 w-12 items-center justify-center">
                <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-[#dfc28c] via-[#c9a56b] to-[#8a6d3f]" />
                <div className="absolute inset-[2px] rounded-[6px] bg-white" />
                <span className="relative font-serif text-[22px] font-bold text-[#881337]">
                  V
                </span>
              </div>
              <div className="leading-tight">
                <div className="font-serif text-[19px] font-semibold tracking-tight text-stone-900">
                  Vani Collection
                </div>
                <div className="text-[9.5px] font-semibold uppercase tracking-[0.2em] text-stone-400">
                  Artisanal Luxury
                </div>
              </div>
            </Link>
          </div>

          {/* Card */}
          <div className="flex flex-1 items-center justify-center px-6 py-10">
            <div className="w-full max-w-[460px]">
              <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03),0_20px_48px_-20px_rgba(20,16,15,0.15)]">
                <div className="p-8 sm:p-10">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#881337]">
                    {eyebrow}
                  </p>
                  <h1 className="mt-2 text-[32px] font-semibold leading-tight tracking-tight text-[#881337]">
                    {title}
                  </h1>
                  <p className="mt-2 text-[14px] text-stone-600">{subtitle}</p>

                  <div className="mt-7 border-t border-stone-200" />

                  <div className="mt-6">{children}</div>
                </div>

                <div className="border-t border-stone-200 bg-stone-50/60 px-8 py-4 text-center text-[12.5px] text-stone-500 sm:px-10">
                  {footer}
                </div>
              </div>

              <p className="mt-5 text-center text-[11px] text-stone-400">
                © {new Date().getFullYear()} Vani Collection · Crafted in India
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

/* ---------------- Field ---------------- */
export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label className="text-[13px] font-semibold text-stone-800">
          {label}
        </label>
        {hint}
      </div>
      {children}
    </div>
  );
}

/* ---------------- BoxedInput ---------------- */
export function BoxedInput({
  icon,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { icon?: ReactNode }) {
  return (
    <div className="flex overflow-hidden rounded-lg border border-stone-300 bg-white transition-all focus-within:border-[#881337] focus-within:ring-2 focus-within:ring-[#881337]/15">
      {icon && (
        <div className="flex w-12 shrink-0 items-center justify-center border-r border-stone-200 bg-stone-50 text-stone-500">
          {icon}
        </div>
      )}
      <input
        {...props}
        className="w-full bg-white px-4 py-3 text-[13.5px] text-stone-900 outline-none placeholder:text-stone-400"
      />
    </div>
  );
}

/* ---------------- PasswordInput ---------------- */
export function PasswordInput({
  icon,
  show,
  onToggle,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  icon?: ReactNode;
  show: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex overflow-hidden rounded-lg border border-stone-300 bg-white transition-all focus-within:border-[#881337] focus-within:ring-2 focus-within:ring-[#881337]/15">
      {icon && (
        <div className="flex w-12 shrink-0 items-center justify-center border-r border-stone-200 bg-stone-50 text-stone-500">
          {icon}
        </div>
      )}
      <input
        {...props}
        type={show ? "text" : "password"}
        className="w-full bg-white px-4 py-3 text-[13.5px] text-stone-900 outline-none placeholder:text-stone-400"
      />
      <button
        type="button"
        onClick={onToggle}
        aria-label={show ? "Hide password" : "Show password"}
        className="flex w-12 shrink-0 items-center justify-center text-stone-500 hover:text-stone-800"
      >
        {show ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  );
}

/* ---------------- PrimaryButton ---------------- */
export function PrimaryButton({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#881337] px-4 py-3.5 text-[13px] font-bold uppercase tracking-[0.14em] text-white transition-all hover:bg-[#6b0f2b] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#881337]/25 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {children}
    </button>
  );
}

/* ---------------- Checkbox ---------------- */
export function Checkbox({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  children?: ReactNode;
}) {
  return (
    <label className="flex cursor-pointer select-none items-center gap-2.5">
      <span className="relative flex h-4 w-4 items-center justify-center">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <span className="absolute inset-0 rounded-[4px] border border-stone-300 bg-white transition-all peer-checked:border-[#881337] peer-checked:bg-[#881337]" />
        {checked && (
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#fff"
            strokeWidth="3.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="relative"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </span>
      {children && (
        <span className="text-[12.5px] text-stone-600">{children}</span>
      )}
    </label>
  );
}

/* ---------------- Icons ---------------- */
export const UserIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="3.6" />
    <path d="M4.5 21c.9-3.5 4-5.5 7.5-5.5s6.6 2 7.5 5.5" />
  </svg>
);

export const LockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="10.5" width="16" height="10.5" rx="2" />
    <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
  </svg>
);

export const MailIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2.5" y="4.5" width="19" height="15" rx="2.5" />
    <path d="m3 7 9 6 9-6" />
  </svg>
);

export const EyeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-7.5 11-7.5S23 12 23 12s-4 7.5-11 7.5S1 12 1 12z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const EyeOffIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.94 10.94 0 0 1 12 19.5C5 19.5 1 12 1 12a18.5 18.5 0 0 1 5.06-5.94M9.9 4.24A10.94 10.94 0 0 1 12 4.5c7 0 11 7.5 11 7.5a18.5 18.5 0 0 1-2.16 3.19M14.12 14.12a3 3 0 1 1-4.24-4.24" />
    <line x1="2" y1="2" x2="22" y2="22" />
  </svg>
);

export const AlertIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="mt-0.5 shrink-0">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

export const SpinnerIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="animate-spin">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2.5" />
    <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);