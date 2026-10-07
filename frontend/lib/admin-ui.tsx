"use client";

import type { ReactNode } from "react";

/* ---------------- Brand tokens ---------------- */
export const T = {
  ink: "#14100f",
  cream: "#faf7f2",
  gold: "#dfc28c",
  rose: "#881337",
  line: "#ebe6de",
};

/* ---------------- Badge ---------------- */
export type BadgeTone = "success" | "warning" | "danger" | "info" | "neutral" | "gold";

const TONES: Record<BadgeTone, string> = {
  success: "bg-emerald-50 text-emerald-700 ring-emerald-200/70",
  warning: "bg-amber-50 text-amber-700 ring-amber-200/70",
  danger: "bg-rose-50 text-rose-700 ring-rose-200/70",
  info: "bg-sky-50 text-sky-700 ring-sky-200/70",
  neutral: "bg-stone-100 text-stone-600 ring-stone-200/70",
  gold: "bg-[#dfc28c]/15 text-[#7a5c2b] ring-[#dfc28c]/40",
};

export function Badge({
  children,
  tone = "neutral",
  dot = false,
}: {
  children: ReactNode;
  tone?: BadgeTone;
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

/* ---------------- Stat Card ---------------- */
const STAT_ACCENTS: Record<string, string> = {
  success: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  warning: "bg-amber-50 text-amber-700 ring-amber-100",
  danger: "bg-rose-50 text-rose-700 ring-rose-100",
  info: "bg-sky-50 text-sky-700 ring-sky-100",
  gold: "bg-[#fdf8ee] text-[#8a6d2f] ring-[#f0e4c8]",
};

export function StatCard({
  label,
  value,
  delta,
  positive = true,
  icon,
  hint,
  tone,
}: {
  label: string;
  value: string;
  delta?: string;
  positive?: boolean;
  icon?: ReactNode;
  hint?: string;
  /** Tints the icon chip; omit for the default cream/rose treatment. */
  tone?: "success" | "warning" | "danger" | "info" | "gold";
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-[#ebe6de] bg-white p-5 transition-all hover:border-[#dfc28c]/50 hover:shadow-[0_8px_30px_-12px_rgba(20,16,15,0.12)]">
      <div className="flex items-start justify-between">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-xl ring-1 ${
            tone ? STAT_ACCENTS[tone] : "bg-[#faf7f2] text-[#881337] ring-[#ebe6de]"
          }`}
        >
          {icon}
        </div>
        {delta && (
          <span
            className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-bold ${
              positive
                ? "bg-emerald-50 text-emerald-700"
                : "bg-rose-50 text-rose-700"
            }`}
          >
            {positive ? "↑" : "↓"} {delta}
          </span>
        )}
      </div>
      <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">
        {label}
      </p>
      <p className="mt-1 font-serif text-[26px] font-semibold leading-none text-[#14100f]">
        {value}
      </p>
      {hint && <p className="mt-2 text-[11px] text-stone-400">{hint}</p>}
    </div>
  );
}

/* ---------------- Card shell ---------------- */
export function Card({
  title,
  action,
  badge,
  children,
  className = "",
}: {
  title?: string;
  action?: ReactNode;
  /** Renders immediately after the title — typically a status Badge. */
  badge?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-[#ebe6de] bg-white ${className}`}
    >
      {(title || action || badge) && (
        <div className="flex items-center justify-between gap-3 border-b border-[#f0ebe3] px-5 py-3.5">
          <div className="flex min-w-0 items-center gap-2.5">
            {title && (
              <h3 className="truncate text-[13.5px] font-semibold tracking-tight text-[#14100f]">
                {title}
              </h3>
            )}
            {badge}
          </div>
          {action}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}

/* ---------------- Area Chart (pure SVG) ---------------- */
export function AreaChart({
  data,
  height = 220,
  color = "#881337",
}: {
  data: number[];
  height?: number;
  color?: string;
}) {
  const max = Math.max(...data) * 1.15;
  const min = Math.min(...data) * 0.85;
  const range = max - min || 1;

  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - ((v - min) / range) * 100;
    return [x, y] as const;
  });

  const line = pts
    .map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x} ${y}`)
    .join(" ");
  const area = `${line} L 100 100 L 0 100 Z`;

  return (
    <div className="w-full" style={{ height }}>
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="h-full w-full"
      >
        <defs>
          <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[20, 40, 60, 80].map((y) => (
          <line
            key={y}
            x1="0"
            x2="100"
            y1={y}
            y2={y}
            stroke="#f0ebe3"
            strokeWidth="0.3"
          />
        ))}
        <path d={area} fill="url(#areaFill)" />
        <path
          d={line}
          fill="none"
          stroke={color}
          strokeWidth="0.7"
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

/* ---------------- Bar Chart ---------------- */
export function BarChart({
  data,
  labels,
  height = 180,
  color = "#dfc28c",
}: {
  data: number[];
  labels?: string[];
  height?: number;
  color?: string;
}) {
  const max = Math.max(...data) * 1.1;
  return (
    <div className="w-full">
      <div className="flex items-end gap-2" style={{ height }}>
        {data.map((v, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-2">
            <div className="relative flex h-full w-full items-end">
              <div
                className="w-full rounded-t-md transition-all hover:opacity-80"
                style={{
                  height: `${(v / max) * 100}%`,
                  background: `linear-gradient(180deg, ${color} 0%, ${color}88 100%)`,
                }}
                title={`${v}`}
              />
            </div>
            {labels && (
              <span className="text-[10px] font-medium text-stone-400">
                {labels[i]}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Donut ---------------- */
export function Donut({
  segments,
  size = 160,
}: {
  segments: { label: string; value: number; color: string }[];
  size?: number;
}) {
  const total = segments.reduce((a, s) => a + s.value, 0);
  const r = 42;
  const c = 2 * Math.PI * r;
  // Arc offsets are derived, not accumulated during render — mutating a variable while mapping
  // would make a second render of the same component start from the previous run's offset.
  const arcs = segments.reduce<{ label: string; value: number; color: string; offset: number }[]>(
    (acc, segment) => [...acc, { ...segment, offset: acc.reduce((sum, prev) => sum + (prev.value / total) * c, 0) }],
    []
  );

  return (
    <div className="flex items-center gap-6">
      <svg width={size} height={size} viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="#f0ebe3"
          strokeWidth="10"
        />
        {arcs.map((s, i) => {
          const len = (s.value / total) * c;
          const dash = `${len} ${c - len}`;
          return (
            <circle
              key={i}
              cx="50"
              cy="50"
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth="10"
              strokeDasharray={dash}
              strokeDashoffset={-s.offset}
              transform="rotate(-90 50 50)"
              strokeLinecap="butt"
            />
          );
        })}
      </svg>
      <div className="space-y-2.5">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center gap-2.5">
            <span
              className="h-2.5 w-2.5 rounded-sm"
              style={{ background: s.color }}
            />
            <span className="text-[12.5px] font-medium text-stone-600">
              {s.label}
            </span>
            <span className="ml-auto text-[12.5px] font-semibold text-[#14100f]">
              {Math.round((s.value / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
/* ---------------- Page heading ---------------- */
export function PageHeading({
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
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-400">
          {eyebrow}
        </p>
        <h1 className="mt-1 font-serif text-[26px] font-semibold tracking-tight">
          {title}
        </h1>
        {subtitle && <p className="mt-1 max-w-3xl text-[13px] text-stone-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

/* ---------------- Buttons ---------------- */
type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

export function ButtonPrimary({ children, className = "", ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-full bg-[#881337] px-4 py-2 text-[12.5px] font-semibold text-white transition hover:bg-[#6b0f2b] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#881337]/25 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

export function ButtonGhost({ children, className = "", ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-full border border-[#ebe6de] bg-white px-4 py-2 text-[12.5px] font-semibold text-stone-700 transition hover:border-[#dfc28c] hover:text-[#881337] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#dfc28c]/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

export function ButtonDanger({ children, className = "", ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-[12.5px] font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-100 focus:outline-none focus-visible:ring-4 focus-visible:ring-rose-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

/* ---------------- Filter tabs ---------------- */
export function FilterTabs<T extends string>({
  options,
  value,
  onChange,
  counts,
}: {
  options: readonly T[];
  value: T;
  onChange: (next: T) => void;
  counts?: Record<string, number>;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((option) => {
        const active = option === value;
        const count = counts?.[option];
        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            aria-pressed={active}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12px] font-semibold transition ${
              active
                ? "border-[#881337] bg-[#881337] text-white"
                : "border-[#ebe6de] bg-white text-stone-600 hover:border-[#dfc28c] hover:text-[#881337]"
            }`}
          >
            {option}
            {count !== undefined && (
              <span
                className={`rounded-full px-1.5 text-[10px] font-bold ${
                  active ? "bg-white/20 text-white" : "bg-stone-100 text-stone-500"
                }`}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ---------------- Form fields ---------------- */
export function Field({
  label,
  hint,
  htmlFor,
  children,
  className = "",
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label htmlFor={htmlFor} className={`block ${className}`}>
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">
        {label}
      </span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-stone-400">{hint}</span>}
    </label>
  );
}

const inputClass =
  "w-full rounded-xl border border-[#ebe6de] bg-white px-3 py-2 text-[13px] text-[#14100f] outline-none transition placeholder:text-stone-400 focus:border-[#dfc28c] focus:ring-2 focus:ring-[#dfc28c]/25 disabled:bg-stone-50 disabled:text-stone-400";

export function TextInput({ className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputClass} ${className}`} />;
}

export function Textarea({ className = "", ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${inputClass} resize-y ${className}`} />;
}

export function Select({ className = "", children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={`${inputClass} ${className}`}>
      {children}
    </select>
  );
}

export function Checkbox({
  label,
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className={`flex cursor-pointer items-center gap-2 text-[12.5px] font-medium text-stone-700 ${className}`}>
      <input {...props} type="checkbox" className="h-4 w-4 rounded border-[#ebe6de] accent-[#881337]" />
      {label}
    </label>
  );
}

/* ---------------- Modal ---------------- */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#14100f]/45 p-0 backdrop-blur-sm sm:items-center sm:p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-[#ebe6de] bg-white shadow-2xl sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#f0ebe3] px-6 py-4">
          <div>
            <h2 className="font-serif text-[19px] font-semibold tracking-tight text-[#14100f]">{title}</h2>
            {description && <p className="mt-1 text-[12.5px] text-stone-500">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-stone-400 transition hover:bg-stone-100 hover:text-stone-700"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-[#f0ebe3] px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}

/* ---------------- Empty + alert states ---------------- */
export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="py-12 text-center">
      <p className="text-[13.5px] font-semibold text-stone-600">{title}</p>
      {hint && <p className="mt-1 text-[12px] text-stone-400">{hint}</p>}
    </div>
  );
}

export function Alert({
  tone = "danger",
  children,
}: {
  tone?: "danger" | "success" | "info" | "warning";
  children: ReactNode;
}) {
  const tones = {
    danger: "bg-rose-50 text-rose-700 ring-rose-200",
    success: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    info: "bg-sky-50 text-sky-700 ring-sky-200",
    warning: "bg-amber-50 text-amber-800 ring-amber-200",
  } as const;
  return (
    <p role={tone === "danger" ? "alert" : "status"} className={`rounded-xl px-3.5 py-2.5 text-[12.5px] ring-1 ${tones[tone]}`}>
      {children}
    </p>
  );
}

/* ---------------- Progress ---------------- */
export function ProgressBar({
  value,
  max,
  tone = "#881337",
}: {
  value: number;
  max: number;
  tone?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: tone }} />
    </div>
  );
}
