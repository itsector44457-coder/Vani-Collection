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
type BadgeTone = "success" | "warning" | "danger" | "info" | "neutral" | "gold";

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
export function StatCard({
  label,
  value,
  delta,
  positive = true,
  icon,
  hint,
}: {
  label: string;
  value: string;
  delta?: string;
  positive?: boolean;
  icon?: ReactNode;
  hint?: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-[#ebe6de] bg-white p-5 transition-all hover:border-[#dfc28c]/50 hover:shadow-[0_8px_30px_-12px_rgba(20,16,15,0.12)]">
      <div className="flex items-start justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#faf7f2] text-[#881337] ring-1 ring-[#ebe6de]">
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
  children,
  className = "",
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-[#ebe6de] bg-white ${className}`}
    >
      {(title || action) && (
        <div className="flex items-center justify-between border-b border-[#f0ebe3] px-5 py-3.5">
          {title && (
            <h3 className="text-[13.5px] font-semibold tracking-tight text-[#14100f]">
              {title}
            </h3>
          )}
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
  let offset = 0;

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
        {segments.map((s, i) => {
          const len = (s.value / total) * c;
          const dash = `${len} ${c - len}`;
          const el = (
            <circle
              key={i}
              cx="50"
              cy="50"
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth="10"
              strokeDasharray={dash}
              strokeDashoffset={-offset}
              transform="rotate(-90 50 50)"
              strokeLinecap="butt"
            />
          );
          offset += len;
          return el;
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