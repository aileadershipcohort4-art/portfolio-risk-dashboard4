"use client";

import { useEffect, type ReactNode } from "react";

function ExpandIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 3H3v6M15 3h6v6M15 21h6v-6M9 21H3v-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

interface ChartCardProps {
  title: string;
  subtitle?: string;
  legend?: ReactNode;
  /** Render the chart/table body. Called with "inline" for the normal card and
   * "expanded" for the fullscreen modal, so charts can size themselves accordingly. */
  renderContent: (variant: "inline" | "expanded") => ReactNode;
  expanded: boolean;
  onExpand: () => void;
  onCollapse: () => void;
  className?: string;
}

export default function ChartCard({
  title,
  subtitle,
  legend,
  renderContent,
  expanded,
  onExpand,
  onCollapse,
  className,
}: ChartCardProps) {
  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCollapse();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded, onCollapse]);

  return (
    <div
      className={`rounded-xl border bg-[var(--surface)] p-5 shadow-sm ${className ?? ""}`}
      style={{ borderColor: "var(--border)" }}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          {subtitle && (
            <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
              {subtitle}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onExpand}
          aria-label={`Expand ${title}`}
          title="Full screen"
          className="shrink-0 rounded-md border p-1.5 text-[var(--muted)] transition-colors hover:bg-[var(--background)]"
          style={{ borderColor: "var(--border)" }}
        >
          <ExpandIcon />
        </button>
      </div>
      {legend && <div className="mt-2">{legend}</div>}
      <div className="mt-4">{renderContent("inline")}</div>

      {expanded && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={onCollapse}
        >
          <div
            className="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl bg-[var(--surface)] p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-base font-semibold">{title}</h3>
                {subtitle && (
                  <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
                    {subtitle}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={onCollapse}
                aria-label="Close"
                title="Close"
                className="shrink-0 rounded-md border p-1.5 text-[var(--muted)] transition-colors hover:bg-[var(--background)]"
                style={{ borderColor: "var(--border)" }}
              >
                <CloseIcon />
              </button>
            </div>
            {legend && <div className="mt-2">{legend}</div>}
            <div className="mt-4 flex-1 overflow-auto">{renderContent("expanded")}</div>
          </div>
        </div>
      )}
    </div>
  );
}
