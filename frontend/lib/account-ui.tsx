"use client";

import type { ReactNode } from "react";

/* ---------------- Badge ---------------- */
type Tone = "success" | "warning" | "danger" | "info" | "neutral" | "gold" | "rose";

const TONES: Record<Tone, string> = {
  success: "bg-emerald-50 text-emerald-700 ring-emerald-200/70",
  warning: "bg-amber-50 text-amber-700 ring-amber-200/70",
  danger: "bg-rose-50 text-rose-700 ring-rose-200/70",
  info: "bg-sky-50 text-sky-700 ring-sky-200/70",
  neutral: "bg-stone-100 text-stone-600 ring-stone-200/70",
  gold: "bg-[#dfc28c]/15 text-[#7a5c2b] ring-[#dfc28c]/40",
  rose: "bg-[#881337]/8 text-[#881337] ring-[#881337]/20",
};

export function Badge({
  children,
  tone = "neutral",
  dot = false,
}: {
  children: ReactNode;
  tone?: Tone;
  dot?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-tight ring-1 ring-inset ${TONES[tone]}`}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

/* ---------------- Section Card ---------------- */
export function Card({
  title,
  description,
  action,
  children,
  className = "",
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-[#ebe6de] bg-white ${className}`}
    >
      {(title || action) && (
        <header className="flex items-start justify-between gap-4 border-b border-[#f0ebe3] px-5 py-4 sm:px-6">
          <div>
            {title && (
              <h2 className="text-[15px] font-semibold tracking-tight text-[#14100f]">
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-0.5 text-[12.5px] text-stone-500">{description}</p>
            )}
          </div>
          {action}
        </header>
      )}
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}

/* ---------------- Page header ---------------- */
export function PageHeader({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-stone-400">
          {eyebrow}
        </p>
        <h1 className="mt-1 font-serif text-[26px] font-semibold leading-tight tracking-tight text-[#14100f]">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-[13px] text-stone-500">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}

/* ---------------- Buttons ---------------- */
export function ButtonPrimary({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="inline-flex items-center justify-center gap-2 rounded-full bg-[#881337] px-5 py-2.5 text-[12.5px] font-semibold text-white transition-all hover:bg-[#6b0f2b] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#881337]/25 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {children}
    </button>
  );
}

export function ButtonGhost({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="inline-flex items-center justify-center gap-2 rounded-full border border-stone-300 bg-white px-5 py-2.5 text-[12.5px] font-semibold text-stone-700 transition-all hover:border-stone-400 hover:bg-stone-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-stone-200 active:scale-[0.98]"
    >
      {children}
    </button>
  );
}

export function ButtonDanger({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="inline-flex items-center justify-center gap-2 rounded-full border border-rose-200 bg-white px-5 py-2.5 text-[12.5px] font-semibold text-rose-600 transition-all hover:bg-rose-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-rose-100 active:scale-[0.98]"
    >
      {children}
    </button>
  );
}

/* ---------------- Input ---------------- */
export function Input({
  label,
  hint,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[12.5px] font-semibold text-stone-800">
          {label}
        </span>
        {hint}
      </div>
      <input
        {...props}
        className="w-full rounded-lg border border-stone-300 bg-white px-3.5 py-2.5 text-[13.5px] text-stone-900 outline-none transition-all placeholder:text-stone-400 focus:border-[#881337] focus:ring-2 focus:ring-[#881337]/15"
      />
    </label>
  );
}

export function Select({
  label,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12.5px] font-semibold text-stone-800">
        {label}
      </span>
      <select
        {...props}
        className="w-full rounded-lg border border-stone-300 bg-white px-3.5 py-2.5 text-[13.5px] text-stone-900 outline-none transition-all focus:border-[#881337] focus:ring-2 focus:ring-[#881337]/15"
      >
        {children}
      </select>
    </label>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-[#f0ebe3] bg-[#faf7f2]/50 p-3.5">
      <div>
        <p className="text-[13px] font-semibold text-stone-900">{label}</p>
        {description && (
          <p className="mt-0.5 text-[11.5px] text-stone-500">{description}</p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? "bg-[#881337]" : "bg-stone-300"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-[22px]" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}

/* ---------------- Empty state ---------------- */
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-[#faf7f2]/50 px-6 py-14 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-stone-400 ring-1 ring-stone-200">
        {icon}
      </div>
      <h3 className="mt-4 font-serif text-[17px] font-semibold text-stone-900">
        {title}
      </h3>
      <p className="mt-1 max-w-sm text-[12.5px] text-stone-500">
        {description}
      </p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* ---------------- Icons ---------------- */
export const IconBox = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 8.5 12 4l9 4.5V17L12 21 3 17z" />
    <path d="M3 8.5 12 13l9-4.5M12 21v-8" />
  </svg>
);

export const IconHeart = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.8 5.6a5.2 5.2 0 0 0-7.4 0L12 7l-1.4-1.4a5.2 5.2 0 0 0-7.4 7.4L12 21l8.8-8a5.2 5.2 0 0 0 0-7.4z" />
  </svg>
);

export const IconTruck = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6.5h11v10H3zM14 10h4l3 3v3.5h-7" />
    <circle cx="7" cy="18" r="1.6" />
    <circle cx="17" cy="18" r="1.6" />
  </svg>
);

export const IconPin = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2.5c-3.5 0-6.5 3-6.5 6.5 0 5 6.5 12.5 6.5 12.5s6.5-7.5 6.5-12.5c0-3.5-3-6.5-6.5-6.5z" />
    <circle cx="12" cy="9" r="2.5" />
  </svg>
);

export const IconCard = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
    <path d="M2.5 10h19M6 15h4" />
  </svg>
);

export const IconReturn = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 0 1 15.5-6.2M21 12a9 9 0 0 1-15.5 6.2" />
    <path d="M21 4v6h-6M3 20v-6h6" />
  </svg>
);

export const IconStar = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3l2.4 4.86 5.36.78-3.88 3.78.92 5.34L12 15.24 7.2 17.76l.92-5.34L4.24 8.64l5.36-.78z" />
  </svg>
);

export const IconUser = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="3.6" />
    <path d="M4.5 21c.9-3.5 4-5.5 7.5-5.5s6.6 2 7.5 5.5" />
  </svg>
);

export const IconGift = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 12v9H4v-9M2 7h20v5H2zM12 22V7" />
    <path d="M12 7H7.5a2.5 2.5 0 1 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 1 0 0-5C13 2 12 7 12 7z" />
  </svg>
);

export const IconTrash = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14" />
  </svg>
);

export const IconEdit = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4z" />
  </svg>
);

export const IconPlus = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

export const IconCheck = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);