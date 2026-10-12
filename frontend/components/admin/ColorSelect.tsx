"use client";

import { useState } from "react";

const COLORS = [
  { name: "As shown", hex: "#a8a29e" },
  { name: "Black", hex: "#171717" },
  { name: "White", hex: "#ffffff" },
  { name: "Red", hex: "#dc2626" },
  { name: "Maroon", hex: "#881337" },
  { name: "Pink", hex: "#ec4899" },
  { name: "Hot Pink", hex: "#db2777" },
  { name: "Yellow", hex: "#facc15" },
  { name: "Orange", hex: "#f97316" },
  { name: "Green", hex: "#16a34a" },
  { name: "Olive", hex: "#737c26" },
  { name: "Teal", hex: "#0d9488" },
  { name: "Blue", hex: "#2563eb" },
  { name: "Navy", hex: "#1e3a8a" },
  { name: "Purple", hex: "#9333ea" },
  { name: "Lavender", hex: "#c4b5fd" },
  { name: "Brown", hex: "#854d0e" },
  { name: "Beige", hex: "#d6c2a1" },
  { name: "Cream", hex: "#fff7dc" },
  { name: "Grey", hex: "#6b7280" },
  { name: "Silver", hex: "#cbd5e1" },
  { name: "Gold", hex: "#d4a72c" },
  { name: "Multicolor", hex: "linear-gradient(90deg, #e11d48, #facc15, #16a34a, #2563eb, #9333ea)" },
] as const;

const isHexColor = (value: string) => /^#[\da-f]{6}$/i.test(value);
const colorHex = (name: string) => isHexColor(name) ? name : COLORS.find((color) => color.name === name)?.hex ?? "#a8a29e";

export default function ColorSelect({
  id,
  value,
  onChange,
  additionalOptions = [],
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  additionalOptions?: string[];
}) {
  const [hexDraft, setHexDraft] = useState(isHexColor(value) ? value : "");
  const choices = [
    ...COLORS.map((color) => color.name),
    ...additionalOptions.filter((option) => !COLORS.some((color) => color.name === option)),
    ...(isHexColor(value) && !additionalOptions.includes(value) ? [value] : []),
  ];
  const selected = choices.includes(value) ? value : (value || "As shown");

  return (
    <div className="flex items-center gap-2">
      <span
        aria-hidden="true"
        className="h-5 w-5 shrink-0 rounded-full border border-black/15"
        style={{ background: colorHex(selected) }}
      />
      <select
        id={id}
        value={selected}
        onChange={(event) => {
          setHexDraft("");
          onChange(event.target.value);
        }}
        className="w-full rounded-xl border border-[#ebe6de] bg-white px-3 py-2.5 text-[13px] outline-none transition focus:border-[#dfc28c]"
      >
        {choices.map((color) => <option key={color} value={color}>{color}</option>)}
      </select>
      <label className="flex shrink-0 items-center gap-1.5 rounded-lg border border-[#ebe6de] px-2 py-1.5" title="Choose or enter a custom HEX color">
        <input
          type="color"
          aria-label={`Pick a custom HEX color for ${id}`}
          value={isHexColor(hexDraft) ? hexDraft : isHexColor(value) ? value : "#000000"}
          onChange={(event) => {
            setHexDraft(event.target.value);
            onChange(event.target.value);
          }}
          className="h-6 w-7 cursor-pointer border-0 bg-transparent p-0"
        />
        <input
          type="text"
          aria-label={`Custom HEX color for ${id}`}
          value={hexDraft}
          onChange={(event) => {
            const next = event.target.value;
            setHexDraft(next);
            if (isHexColor(next)) onChange(next);
          }}
          onBlur={() => {
            if (!isHexColor(hexDraft)) setHexDraft(isHexColor(value) ? value : "");
          }}
          placeholder="#HEX"
          maxLength={7}
          className="w-[4.5rem] bg-transparent text-xs uppercase outline-none placeholder:text-stone-400"
        />
      </label>
    </div>
  );
}
