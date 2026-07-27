"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAnalysis } from "@/context/AnalysisContext";
import RiskBadge from "@/components/RiskBadge";
import ChartCard from "@/components/ChartCard";
import FilterBar from "@/components/FilterBar";
import {
  averageRiskScore,
  exposureByIndustryAndCategory,
  generatePortfolioTrend,
  industryRiskSummary,
  recommendedActions,
  summariseByCategory,
  top10HighestRisk,
  totalExposure,
  type IndustryRiskSummary,
} from "@/lib/aggregations";
import { RISK_THRESHOLDS } from "@/lib/riskScoring";
import type { RiskCategory, ScoredCustomer } from "@/lib/types";

const CATEGORY_COLOURS: Record<RiskCategory, string> = {
  Green: "#2f7d4f",
  Amber: "#b5720f",
  Red: "#b13030",
};

const ALL_CATEGORIES: RiskCategory[] = ["Green", "Amber", "Red"];

const EXPOSURE_COLOUR = "#333a42";

function compactCurrency(value: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function fullCurrency(value: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(value);
}

function CategoryLegend() {
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs" style={{ color: "var(--muted)" }}>
      <span className="flex items-center gap-2">
        Customers:
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: CATEGORY_COLOURS.Green }} /> Green
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: CATEGORY_COLOURS.Amber }} /> Amber
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: CATEGORY_COLOURS.Red }} /> Red
        </span>
      </span>
      <span className="flex items-center gap-1">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: EXPOSURE_COLOUR }} /> Exposure
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Generic column sorting helpers, shared by the two data tables.
// ---------------------------------------------------------------------------
type SortDir = "asc" | "desc";
interface SortState<K extends string> {
  key: K;
  dir: SortDir;
}

function sortRows<T, K extends string>(rows: T[], sort: SortState<K>, getValue: (row: T, key: K) => string | number): T[] {
  const sorted = [...rows].sort((a, b) => {
    const va = getValue(a, sort.key);
    const vb = getValue(b, sort.key);
    if (typeof va === "number" && typeof vb === "number") return va - vb;
    return String(va).localeCompare(String(vb));
  });
  if (sort.dir === "desc") sorted.reverse();
  return sorted;
}

function SortIcon({ dir }: { dir: SortDir }) {
  return <span className="text-[10px]">{dir === "asc" ? "▲" : "▼"}</span>;
}

function SortableTh<K extends string>({
  label,
  sortKey,
  sort,
  onSort,
  defaultDir = "desc",
}: {
  label: string;
  sortKey: K;
  sort: SortState<K>;
  onSort: (next: SortState<K>) => void;
  defaultDir?: SortDir;
}) {
  const active = sort.key === sortKey;
  return (
    <th
      className="cursor-pointer select-none py-2 pr-4 font-medium"
      style={{ color: active ? "var(--foreground)" : "var(--muted)" }}
      onClick={() => onSort(active ? { key: sortKey, dir: sort.dir === "asc" ? "desc" : "asc" } : { key: sortKey, dir: defaultDir })}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active && <SortIcon dir={sort.dir} />}
      </span>
    </th>
  );
}

export default function DashboardPage() {
  const { result } = useAnalysis();

  // Filters (declared before the early-return so hook order stays stable).
  const [selectedCategories, setSelectedCategories] = useState<Set<RiskCategory>>(new Set(ALL_CATEGORIES));
  const [selectedIndustries, setSelectedIndustries] = useState<Set<string> | null>(null); // null = not yet initialised
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [industrySort, setIndustrySort] = useState<SortState<keyof IndustryRiskSummary>>({
    key: "avgRiskScore",
    dir: "desc",
  });
  const [top10Sort, setTop10Sort] = useState<SortState<string>>({ key: "riskScore", dir: "desc" });

  const allIndustries = useMemo(
    () => (result ? Array.from(new Set(result.customers.map((c) => c.industrySector))).sort() : []),
    [result]
  );

  const effectiveSelectedIndustries = selectedIndustries ?? new Set(allIndustries);

  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-lg font-medium">No analysis loaded yet</p>
        <Link
          href="/"
          className="mt-4 rounded-md px-4 py-2 text-sm font-medium text-white"
          style={{ backgroundColor: "var(--accent)" }}
        >
          Go to Upload
        </Link>
      </div>
    );
  }

  const { customers } = result;

  const filteredCustomers: ScoredCustomer[] = customers.filter(
    (c) => selectedCategories.has(c.category) && effectiveSelectedIndustries.has(c.industrySector)
  );

  const categorySummary = summariseByCategory(filteredCustomers);
  const totalExp = totalExposure(filteredCustomers);
  const industryData = exposureByIndustryAndCategory(filteredCustomers);
  const industrySummaryRaw = industryRiskSummary(filteredCustomers);
  const top10Raw = top10HighestRisk(filteredCustomers);
  const avgScore = averageRiskScore(filteredCustomers);
  const trend = generatePortfolioTrend(avgScore);
  const actions = recommendedActions(filteredCustomers);

  const industrySummary = sortRows(industrySummaryRaw, industrySort, (row, key) => row[key] as string | number);
  const top10 = sortRows(top10Raw, top10Sort, (row, key) => {
    switch (key) {
      case "customerName":
        return row.customerName;
      case "industrySector":
        return row.industrySector;
      case "creditScore":
        return row.creditScore;
      case "repaymentStatus":
        return row.repaymentStatus;
      case "loanBalance":
        return row.loanBalance;
      case "riskScore":
        return row.riskScore;
      case "category":
        return row.category;
      default:
        return "";
    }
  });

  const categoryChartData = categorySummary.map((c) => ({
    category: c.category,
    customers: c.count,
    exposure: c.exposure,
  }));

  const analysedAtStr = `${result.analysedAt.toLocaleDateString()}, ${result.analysedAt.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}`;

  function toggleCategory(cat: RiskCategory) {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next.size === 0 ? prev : next; // never allow zero categories selected
    });
  }

  function toggleIndustry(industry: string) {
    setSelectedIndustries((prev) => {
      const base = prev ?? new Set(allIndustries);
      const next = new Set(base);
      if (next.has(industry)) next.delete(industry);
      else next.add(industry);
      return next;
    });
  }

  function resetFilters() {
    setSelectedCategories(new Set(ALL_CATEGORIES));
    setSelectedIndustries(new Set(allIndustries));
  }

  const riskCategoryChart = (variant: "inline" | "expanded") => (
    <div className={variant === "inline" ? "h-72" : "h-[65vh]"}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={categoryChartData} margin={{ left: 0, right: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="category" tick={{ fontSize: 12 }} />
          <YAxis yAxisId="left" tick={{ fontSize: 12 }} allowDecimals={false} />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 12 }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            tickFormatter={(v: any) => compactCurrency(Number(v))}
          />
          <Tooltip
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={(value: any, name: any) =>
              name === "exposure" ? [fullCurrency(Number(value)), "Exposure"] : [value, "Customers"]
            }
          />
          <Bar yAxisId="left" dataKey="customers" name="Customers" radius={[4, 4, 0, 0]}>
            {categoryChartData.map((entry) => (
              <Cell key={entry.category} fill={CATEGORY_COLOURS[entry.category as RiskCategory]} />
            ))}
            <LabelList dataKey="customers" position="top" style={{ fontSize: 11, fill: "var(--muted)" }} />
          </Bar>
          <Bar yAxisId="right" dataKey="exposure" name="Exposure" fill={EXPOSURE_COLOUR} radius={[4, 4, 0, 0]}>
            <LabelList
              dataKey="exposure"
              position="top"
              style={{ fontSize: 11, fill: "var(--muted)" }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(v: any) => compactCurrency(Number(v))}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );

  const industryExposureChart = (variant: "inline" | "expanded") => (
    <div className={variant === "inline" ? "h-80" : "h-[65vh]"}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={industryData} layout="vertical" margin={{ left: 8, right: 24, top: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            type="number"
            tick={{ fontSize: 12 }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            tickFormatter={(v: any) => compactCurrency(Number(v))}
          />
          <YAxis type="category" dataKey="industry" tick={{ fontSize: 12 }} width={110} />
          <Tooltip
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={(value: any, name: any) => [fullCurrency(Number(value)), name]}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="Green" stackId="risk" name="Green" fill={CATEGORY_COLOURS.Green}>
            <LabelList
              dataKey="Green"
              position="inside"
              style={{ fontSize: 10, fill: "#fff" }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(v: any) => (Number(v) > 0 ? compactCurrency(Number(v)) : "")}
            />
          </Bar>
          <Bar dataKey="Amber" stackId="risk" name="Amber" fill={CATEGORY_COLOURS.Amber}>
            <LabelList
              dataKey="Amber"
              position="inside"
              style={{ fontSize: 10, fill: "#fff" }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(v: any) => (Number(v) > 0 ? compactCurrency(Number(v)) : "")}
            />
          </Bar>
          <Bar dataKey="Red" stackId="risk" name="Red" fill={CATEGORY_COLOURS.Red} radius={[0, 4, 4, 0]}>
            <LabelList
              dataKey="Red"
              position="inside"
              style={{ fontSize: 10, fill: "#fff" }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(v: any) => (Number(v) > 0 ? compactCurrency(Number(v)) : "")}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );

  const industrySummaryTable = () => (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b" style={{ borderColor: "var(--border)" }}>
            <SortableTh label="Industry Sector" sortKey="industry" sort={industrySort} onSort={setIndustrySort} defaultDir="asc" />
            <SortableTh label="Customers" sortKey="count" sort={industrySort} onSort={setIndustrySort} />
            <SortableTh label="Avg Risk Score" sortKey="avgRiskScore" sort={industrySort} onSort={setIndustrySort} />
            <SortableTh label="Green" sortKey="green" sort={industrySort} onSort={setIndustrySort} />
            <SortableTh label="Amber" sortKey="amber" sort={industrySort} onSort={setIndustrySort} />
            <SortableTh label="Red" sortKey="red" sort={industrySort} onSort={setIndustrySort} />
            <SortableTh label="Exposure" sortKey="exposure" sort={industrySort} onSort={setIndustrySort} />
          </tr>
        </thead>
        <tbody>
          {industrySummary.map((row) => (
            <tr key={row.industry} className="border-b" style={{ borderColor: "var(--border)" }}>
              <td className="py-2 pr-4 font-medium">{row.industry}</td>
              <td className="py-2 pr-4">{row.count}</td>
              <td className="py-2 pr-4">{row.avgRiskScore.toFixed(1)}</td>
              <td className="py-2 pr-4">
                <span
                  className="rounded-md px-2 py-0.5 text-xs font-medium"
                  style={{ backgroundColor: "var(--risk-green-bg)", color: CATEGORY_COLOURS.Green }}
                >
                  {row.green}
                </span>
              </td>
              <td className="py-2 pr-4">
                <span
                  className="rounded-md px-2 py-0.5 text-xs font-medium"
                  style={{ backgroundColor: "var(--risk-amber-bg)", color: CATEGORY_COLOURS.Amber }}
                >
                  {row.amber}
                </span>
              </td>
              <td className="py-2 pr-4">
                <span
                  className="rounded-md px-2 py-0.5 text-xs font-medium"
                  style={{ backgroundColor: "var(--risk-red-bg)", color: CATEGORY_COLOURS.Red }}
                >
                  {row.red}
                </span>
              </td>
              <td className="py-2 pr-4">{fullCurrency(row.exposure)}</td>
            </tr>
          ))}
          {industrySummary.length === 0 && (
            <tr>
              <td colSpan={7} className="py-6 text-center text-sm" style={{ color: "var(--muted)" }}>
                No customers match the current filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  const trendChart = (variant: "inline" | "expanded") => (
    <div className={variant === "inline" ? "h-64" : "h-[65vh]"}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={trend} margin={{ left: 0, right: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="label" tick={{ fontSize: 12 }} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <Tooltip formatter={(value: any) => Number(value).toFixed(1)} />
          <Line
            type="monotone"
            dataKey="averageRiskScore"
            name="Average Risk Score"
            stroke="var(--accent)"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );

  const top10Table = () => (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b" style={{ borderColor: "var(--border)" }}>
            <SortableTh label="Customer" sortKey="customerName" sort={top10Sort} onSort={setTop10Sort} defaultDir="asc" />
            <SortableTh label="Industry" sortKey="industrySector" sort={top10Sort} onSort={setTop10Sort} defaultDir="asc" />
            <SortableTh label="Credit Score" sortKey="creditScore" sort={top10Sort} onSort={setTop10Sort} />
            <SortableTh label="Repayment Status" sortKey="repaymentStatus" sort={top10Sort} onSort={setTop10Sort} defaultDir="asc" />
            <SortableTh label="Loan Balance" sortKey="loanBalance" sort={top10Sort} onSort={setTop10Sort} />
            <SortableTh label="Risk Score" sortKey="riskScore" sort={top10Sort} onSort={setTop10Sort} />
            <SortableTh label="Category" sortKey="category" sort={top10Sort} onSort={setTop10Sort} defaultDir="asc" />
          </tr>
        </thead>
        <tbody>
          {top10.map((c) => (
            <tr key={c.customerId} className="border-b" style={{ borderColor: "var(--border)" }}>
              <td className="py-2 pr-4">{c.customerName}</td>
              <td className="py-2 pr-4">{c.industrySector}</td>
              <td className="py-2 pr-4">{c.creditScore}</td>
              <td className="py-2 pr-4">{c.repaymentStatus}</td>
              <td className="py-2 pr-4">{fullCurrency(c.loanBalance)}</td>
              <td className="py-2 pr-4">{c.riskScore.toFixed(1)}</td>
              <td className="py-2 pr-4">
                <RiskBadge category={c.category} />
              </td>
            </tr>
          ))}
          {top10.length === 0 && (
            <tr>
              <td colSpan={7} className="py-6 text-center text-sm" style={{ color: "var(--muted)" }}>
                No customers match the current filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div>
      {/* 1. Header */}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-semibold">Executive Dashboard</h1>
        {result.isSampleData && (
          <span
            className="rounded-md px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-white"
            style={{ backgroundColor: "var(--accent)" }}
          >
            Sample Data
          </span>
        )}
      </div>
      <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
        {customers.length} customers · {result.csvFileName} ·{" "}
        {result.pdfFileName ?? "no policy uploaded"} · analysed {analysedAtStr}
      </p>

      {/* 1b. Filter bar — applies to every chart and table below */}
      <FilterBar
        industries={allIndustries}
        selectedCategories={selectedCategories}
        onToggleCategory={toggleCategory}
        selectedIndustries={effectiveSelectedIndustries}
        onToggleIndustry={toggleIndustry}
        onSelectAllIndustries={() => setSelectedIndustries(new Set(allIndustries))}
        onClearIndustries={() => setSelectedIndustries(new Set())}
        onReset={resetFilters}
        matchedCount={filteredCustomers.length}
        totalCount={customers.length}
      />

      {/* 2. Category KPI cards */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {categorySummary.map((c) => (
          <div
            key={c.category}
            className="rounded-xl border bg-[var(--surface)] p-5 shadow-sm"
            style={{ borderColor: "var(--border)" }}
          >
            <div className="flex items-center gap-2 text-sm font-medium">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: CATEGORY_COLOURS[c.category] }}
              />
              {c.category}
            </div>
            <div className="mt-2 text-3xl font-semibold">{c.count}</div>
            <div className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
              {c.pctOfCustomers.toFixed(1)}% of customers · {compactCurrency(c.exposure)} exposure (
              {c.pctOfExposure.toFixed(1)}%)
            </div>
          </div>
        ))}
      </div>

      {/* 3. Total portfolio exposure */}
      <div
        className="mt-4 rounded-xl border bg-[var(--surface)] p-5 shadow-sm"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="text-sm font-medium" style={{ color: "var(--muted)" }}>
          Total Portfolio Exposure
        </div>
        <div className="mt-1 text-3xl font-semibold">{fullCurrency(totalExp)}</div>
      </div>

      {/* 4. Two-column chart row */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Customers & Exposure by Risk Category"
          legend={<CategoryLegend />}
          renderContent={riskCategoryChart}
          expanded={expandedCard === "riskCategory"}
          onExpand={() => setExpandedCard("riskCategory")}
          onCollapse={() => setExpandedCard(null)}
        />

        <ChartCard
          title="Exposure by Industry Sector"
          subtitle="Exposure value per sector, broken down by risk category"
          renderContent={industryExposureChart}
          expanded={expandedCard === "industryExposure"}
          onExpand={() => setExpandedCard("industryExposure")}
          onCollapse={() => setExpandedCard(null)}
        />
      </div>

      {/* 4b. Industry Risk Summary table */}
      <div className="mt-4">
        <ChartCard
          title="Industry Risk Summary"
          subtitle="Click a column header to sort"
          renderContent={industrySummaryTable}
          expanded={expandedCard === "industrySummary"}
          onExpand={() => setExpandedCard("industrySummary")}
          onCollapse={() => setExpandedCard(null)}
        />
      </div>

      {/* 5. Portfolio risk trend */}
      <div className="mt-4">
        <ChartCard
          title="Portfolio Risk Trend"
          subtitle="Illustrative trend leading up to current position"
          renderContent={trendChart}
          expanded={expandedCard === "trend"}
          onExpand={() => setExpandedCard("trend")}
          onCollapse={() => setExpandedCard(null)}
        />
      </div>

      {/* 6. Top 10 highest-risk customers */}
      <div className="mt-4">
        <ChartCard
          title="Top 10 Highest-Risk Customers"
          subtitle="Click a column header to sort"
          renderContent={top10Table}
          expanded={expandedCard === "top10"}
          onExpand={() => setExpandedCard("top10")}
          onCollapse={() => setExpandedCard(null)}
        />
      </div>

      {/* 7. Recommended Actions + Scoring Methodology */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-[var(--surface)] p-5 shadow-sm" style={{ borderColor: "var(--border)" }}>
          <h3 className="text-sm font-semibold">Recommended Actions</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {actions.map((action, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: "var(--accent)" }} />
                <span>{action}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border bg-[var(--surface)] p-5 shadow-sm" style={{ borderColor: "var(--border)" }}>
          <h3 className="text-sm font-semibold">Scoring Methodology</h3>
          <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
            Risk Score = (Credit Risk Weight × Credit Score Factor) + (Repayment Risk Weight ×
            Repayment Status Factor) + (Exposure Weight × Loan Balance Factor)
          </p>
          <ul className="mt-2 space-y-1 text-sm" style={{ color: "var(--muted)" }}>
            <li>Green: 0–{RISK_THRESHOLDS.greenMax}</li>
            <li>Amber: {RISK_THRESHOLDS.greenMax + 1}–{RISK_THRESHOLDS.amberMax}</li>
            <li>Red: {RISK_THRESHOLDS.amberMax + 1}–100</li>
          </ul>

          <div className="mt-4 border-t pt-4" style={{ borderColor: "var(--border)" }}>
            <h4 className="text-sm font-semibold">Extracted Policy Highlights</h4>
            {!result.pdfFileName && (
              <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
                No policy PDF was uploaded, so no rules were extracted for this analysis.
              </p>
            )}
            {result.pdfFileName && result.pdfParseFailed && (
              <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
                Could not extract text from {result.pdfFileName}.
              </p>
            )}
            {result.pdfFileName && !result.pdfParseFailed && (
              <>
                <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
                  Heuristic extraction from {result.pdfFileName} — {result.pdfPageCount ?? 0} page(s) scanned.
                </p>
                {result.rules.length === 0 ? (
                  <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
                    No policy rules were identified in this document.
                  </p>
                ) : (
                  <ul className="mt-2 max-h-64 space-y-2 overflow-y-auto text-sm">
                    {result.rules.map((rule, i) => (
                      <li
                        key={i}
                        className="border-l-2 pl-3"
                        style={{ borderColor: "var(--accent)", color: "var(--foreground)" }}
                      >
                        {rule.text}
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
