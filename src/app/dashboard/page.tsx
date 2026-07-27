"use client";

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
import {
  averageRiskScore,
  exposureByIndustryAndCategory,
  generatePortfolioTrend,
  industryRiskSummary,
  recommendedActions,
  summariseByCategory,
  top10HighestRisk,
  totalExposure,
} from "@/lib/aggregations";
import { RISK_THRESHOLDS } from "@/lib/riskScoring";
import type { RiskCategory } from "@/lib/types";

const CATEGORY_COLOURS: Record<RiskCategory, string> = {
  Green: "#2f7d4f",
  Amber: "#b5720f",
  Red: "#b13030",
};

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

export default function DashboardPage() {
  const { result } = useAnalysis();

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
  const categorySummary = summariseByCategory(customers);
  const totalExp = totalExposure(customers);
  const industryData = exposureByIndustryAndCategory(customers);
  const industrySummary = industryRiskSummary(customers);
  const top10 = top10HighestRisk(customers);
  const avgScore = averageRiskScore(customers);
  const trend = generatePortfolioTrend(avgScore);
  const actions = recommendedActions(customers);

  const categoryChartData = categorySummary.map((c) => ({
    category: c.category,
    customers: c.count,
    exposure: c.exposure,
  }));

  const analysedAtStr = `${result.analysedAt.toLocaleDateString()}, ${result.analysedAt.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}`;

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
        <div className="rounded-xl border bg-[var(--surface)] p-5 shadow-sm" style={{ borderColor: "var(--border)" }}>
          <h3 className="text-sm font-semibold">Customers & Exposure by Risk Category</h3>
          <div className="mt-2">
            <CategoryLegend />
          </div>
          <div className="mt-4 h-72">
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
                  <LabelList
                    dataKey="customers"
                    position="top"
                    style={{ fontSize: 11, fill: "var(--muted)" }}
                  />
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
        </div>

        <div className="rounded-xl border bg-[var(--surface)] p-5 shadow-sm" style={{ borderColor: "var(--border)" }}>
          <h3 className="text-sm font-semibold">Exposure by Industry Sector</h3>
          <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
            Exposure value per sector, broken down by risk category
          </p>
          <div className="mt-4 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={industryData}
                layout="vertical"
                margin={{ left: 8, right: 24, top: 8, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  type="number"
                  tick={{ fontSize: 12 }}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  tickFormatter={(v: any) => compactCurrency(Number(v))}
                />
                <YAxis
                  type="category"
                  dataKey="industry"
                  tick={{ fontSize: 12 }}
                  width={110}
                />
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
        </div>
      </div>

      {/* 4b. Industry Risk Summary table */}
      <div className="mt-4 rounded-xl border bg-[var(--surface)] p-5 shadow-sm" style={{ borderColor: "var(--border)" }}>
        <h3 className="text-sm font-semibold">Industry Risk Summary</h3>
        <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
          Sorted by average risk score, highest risk first
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: "var(--border)" }}>
                <th className="py-2 pr-4 font-medium" style={{ color: "var(--muted)" }}>Industry Sector</th>
                <th className="py-2 pr-4 font-medium" style={{ color: "var(--muted)" }}>Customers</th>
                <th className="py-2 pr-4 font-medium" style={{ color: "var(--muted)" }}>Avg Risk Score</th>
                <th className="py-2 pr-4 font-medium" style={{ color: "var(--muted)" }}>Green</th>
                <th className="py-2 pr-4 font-medium" style={{ color: "var(--muted)" }}>Amber</th>
                <th className="py-2 pr-4 font-medium" style={{ color: "var(--muted)" }}>Red</th>
                <th className="py-2 pr-4 font-medium" style={{ color: "var(--muted)" }}>Exposure</th>
              </tr>
            </thead>
            <tbody>
              {industrySummary.map((row) => (
                <tr key={row.industry} className="border-b" style={{ borderColor: "var(--border)" }}>
                  <td className="py-2 pr-4 font-medium">{row.industry}</td>
                  <td className="py-2 pr-4">{row.count}</td>
                  <td className="py-2 pr-4">{row.avgRiskScore.toFixed(1)}</td>
                  <td className="py-2 pr-4">
                    <span className="rounded-md px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: "var(--risk-green-bg)", color: CATEGORY_COLOURS.Green }}>
                      {row.green}
                    </span>
                  </td>
                  <td className="py-2 pr-4">
                    <span className="rounded-md px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: "var(--risk-amber-bg)", color: CATEGORY_COLOURS.Amber }}>
                      {row.amber}
                    </span>
                  </td>
                  <td className="py-2 pr-4">
                    <span className="rounded-md px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: "var(--risk-red-bg)", color: CATEGORY_COLOURS.Red }}>
                      {row.red}
                    </span>
                  </td>
                  <td className="py-2 pr-4">{fullCurrency(row.exposure)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Portfolio risk trend */}
      <div className="mt-4 rounded-xl border bg-[var(--surface)] p-5 shadow-sm" style={{ borderColor: "var(--border)" }}>
        <h3 className="text-sm font-semibold">Portfolio Risk Trend</h3>
        <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
          Illustrative trend leading up to current position
        </p>
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend} margin={{ left: 0, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <Tooltip formatter={(value: any) => (Number(value)).toFixed(1)} />
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
      </div>

      {/* 6. Top 10 highest-risk customers */}
      <div className="mt-4 rounded-xl border bg-[var(--surface)] p-5 shadow-sm" style={{ borderColor: "var(--border)" }}>
        <h3 className="text-sm font-semibold">Top 10 Highest-Risk Customers</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: "var(--border)" }}>
                <th className="py-2 pr-4 font-medium" style={{ color: "var(--muted)" }}>Customer</th>
                <th className="py-2 pr-4 font-medium" style={{ color: "var(--muted)" }}>Industry</th>
                <th className="py-2 pr-4 font-medium" style={{ color: "var(--muted)" }}>Credit Score</th>
                <th className="py-2 pr-4 font-medium" style={{ color: "var(--muted)" }}>Repayment Status</th>
                <th className="py-2 pr-4 font-medium" style={{ color: "var(--muted)" }}>Loan Balance</th>
                <th className="py-2 pr-4 font-medium" style={{ color: "var(--muted)" }}>Risk Score</th>
                <th className="py-2 pr-4 font-medium" style={{ color: "var(--muted)" }}>Category</th>
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
            </tbody>
          </table>
        </div>
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
