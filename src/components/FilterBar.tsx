"use client";

import { useEffect, useRef, useState } from "react";
import type { RiskCategory } from "@/lib/types";

const CATEGORY_COLOURS: Record<RiskCategory, string> = {
  Green: "#2f7d4f",
  Amber: "#b5720f",
  Red: "#b13030",
};

const CATEGORIES: RiskCategory[] = ["Green", "Amber", "Red"];

interface FilterBarProps {
  industries: string[];
  selectedCategories: Set<RiskCategory>;
  onToggleCategory: (cat: RiskCategory) => void;
  selectedIndustries: Set<string>;
  onToggleIndustry: (industry: string) => void;
  onSelectAllIndustries: () => void;
  onClearIndustries: () => void;
  onReset: () => void;
  matchedCount: number;
  totalCount: number;
}

export default function FilterBar({
  industries,
  selectedCategories,
  onToggleCategory,
  selectedIndustries,
  onToggleIndustry,
  onSelectAllIndustries,
  onClearIndustries,
  onReset,
  matchedCount,
  totalCount,
}: FilterBarProps) {
  const [industryOpen, setIndustryOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!industryOpen) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIndustryOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [industryOpen]);

  const allIndustriesSelected = selectedIndustries.size === industries.length;
  const industryLabel = allIndustriesSelected
    ? "All industries"
    : selectedIndustries.size === 0
      ? "No industries"
      : `${selectedIndustries.size} of ${industries.length} industries`;

  const isFiltered = selectedCategories.size < 3 || !allIndustriesSelected;

  return (
    <div
      className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border bg-[var(--surface)] p-4 shadow-sm"
      style={{ borderColor: "var(--border)" }}
    >
      <span className="text-xs font-medium" style={{ color: "var(--muted)" }}>
        Filter:
      </span>

      <div className="flex items-center gap-1.5">
        {CATEGORIES.map((cat) => {
          const active = selectedCategories.has(cat);
          return (
            <button
              key={cat}
              type="button"
              onClick={() => onToggleCategory(cat)}
              className="flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-opacity"
              style={{
                borderColor: active ? CATEGORY_COLOURS[cat] : "var(--border)",
                backgroundColor: active ? `${CATEGORY_COLOURS[cat]}1a` : "transparent",
                color: active ? CATEGORY_COLOURS[cat] : "var(--muted)",
                opacity: active ? 1 : 0.6,
              }}
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: CATEGORY_COLOURS[cat] }} />
              {cat}
            </button>
          );
        })}
      </div>

      <div className="relative" ref={ref}>
        <button
          type="button"
          onClick={() => setIndustryOpen((o) => !o)}
          className="rounded-md border px-2.5 py-1 text-xs font-medium"
          style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
        >
          {industryLabel} ▾
        </button>
        {industryOpen && (
          <div
            className="absolute left-0 z-40 mt-1 max-h-64 w-56 overflow-y-auto rounded-md border bg-[var(--surface)] p-2 shadow-lg"
            style={{ borderColor: "var(--border)" }}
          >
            <div className="flex items-center justify-between px-1 pb-1.5 text-xs" style={{ color: "var(--muted)" }}>
              <button type="button" className="underline" onClick={onSelectAllIndustries}>
                Select all
              </button>
              <button type="button" className="underline" onClick={onClearIndustries}>
                Clear
              </button>
            </div>
            {industries.map((industry) => (
              <label
                key={industry}
                className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-xs hover:bg-[var(--background)]"
              >
                <input
                  type="checkbox"
                  checked={selectedIndustries.has(industry)}
                  onChange={() => onToggleIndustry(industry)}
                  className="h-3.5 w-3.5"
                />
                {industry}
              </label>
            ))}
          </div>
        )}
      </div>

      <span className="text-xs" style={{ color: "var(--muted)" }}>
        {matchedCount} of {totalCount} customers
      </span>

      {isFiltered && (
        <button
          type="button"
          onClick={onReset}
          className="ml-auto rounded-md px-2.5 py-1 text-xs font-medium underline"
          style={{ color: "var(--accent)" }}
        >
          Reset filters
        </button>
      )}
    </div>
  );
}
