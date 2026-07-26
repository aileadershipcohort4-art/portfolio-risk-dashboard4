// Dashboard aggregation helpers — derive KPIs, chart data, and recommended
// actions from a scored customer list. Kept separate from riskScoring.ts so
// that file stays focused purely on the scoring formula/weights/thresholds.

import type { RiskCategory, ScoredCustomer } from "./types";

const CATEGORY_ORDER: RiskCategory[] = ["Green", "Amber", "Red"];

export interface CategorySummary {
  category: RiskCategory;
  count: number;
  exposure: number;
  pctOfCustomers: number;
  pctOfExposure: number;
}

export function summariseByCategory(customers: ScoredCustomer[]): CategorySummary[] {
  const totalCustomers = customers.length || 1;
  const totalExposure = customers.reduce((sum, c) => sum + c.loanBalance, 0) || 1;

  return CATEGORY_ORDER.map((category) => {
    const subset = customers.filter((c) => c.category === category);
    const count = subset.length;
    const exposure = subset.reduce((sum, c) => sum + c.loanBalance, 0);
    return {
      category,
      count,
      exposure,
      pctOfCustomers: (count / totalCustomers) * 100,
      pctOfExposure: (exposure / totalExposure) * 100,
    };
  });
}

export function totalExposure(customers: ScoredCustomer[]): number {
  return customers.reduce((sum, c) => sum + c.loanBalance, 0);
}

export interface IndustryExposure {
  industry: string;
  exposure: number;
}

export function exposureByIndustry(customers: ScoredCustomer[]): IndustryExposure[] {
  const map = new Map<string, number>();
  for (const c of customers) {
    map.set(c.industrySector, (map.get(c.industrySector) ?? 0) + c.loanBalance);
  }
  return Array.from(map.entries())
    .map(([industry, exposure]) => ({ industry, exposure }))
    .sort((a, b) => b.exposure - a.exposure);
}

export function top10HighestRisk(customers: ScoredCustomer[]): ScoredCustomer[] {
  return [...customers].sort((a, b) => b.riskScore - a.riskScore).slice(0, 10);
}

export interface TrendPoint {
  label: string;
  averageRiskScore: number;
}

// Seeded pseudo-random walk that tapers to the real current average at the
// most recent point — illustrative only, not derived from real historical data.
export function generatePortfolioTrend(currentAverage: number, points = 12): TrendPoint[] {
  let seed = Math.round(currentAverage * 1000) || 42;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  const trend: TrendPoint[] = [];
  let value = Math.max(10, Math.min(90, currentAverage + (rand() - 0.5) * 20));

  for (let i = 0; i < points; i++) {
    const progress = i / (points - 1);
    const pull = progress * progress; // taper harder toward the end
    const noise = (rand() - 0.5) * 8 * (1 - progress);
    value = value * (1 - pull) + currentAverage * pull + noise;
    value = Math.max(0, Math.min(100, value));

    trend.push({
      label: i === points - 1 ? "Now" : `T-${points - 1 - i}`,
      averageRiskScore: i === points - 1 ? currentAverage : value,
    });
  }

  return trend;
}

export function averageRiskScore(customers: ScoredCustomer[]): number {
  if (customers.length === 0) return 0;
  return customers.reduce((sum, c) => sum + c.riskScore, 0) / customers.length;
}

export function recommendedActions(customers: ScoredCustomer[]): string[] {
  const actions: string[] = [];
  const total = totalExposure(customers) || 1;

  const redCustomers = customers.filter((c) => c.category === "Red");
  const amberCustomers = customers.filter((c) => c.category === "Amber");

  if (redCustomers.length > 0) {
    const names = redCustomers
      .slice(0, 5)
      .map((c) => c.customerName)
      .join(", ");
    const suffix = redCustomers.length > 5 ? `, and ${redCustomers.length - 5} more` : "";
    actions.push(`Escalate ${redCustomers.length} Red (high risk) customer(s) for immediate review: ${names}${suffix}.`);
  }

  const redExposure = redCustomers.reduce((sum, c) => sum + c.loanBalance, 0);
  if (redExposure / total > 0.15) {
    actions.push(
      `Red-category exposure represents ${((redExposure / total) * 100).toFixed(1)}% of total portfolio exposure — above the 15% concentration guideline. Consider provisioning review.`
    );
  }

  if (amberCustomers.length > 0) {
    actions.push(`Place ${amberCustomers.length} Amber (medium risk) customer(s) on active watchlist for early intervention.`);
  }

  const industries = new Map<string, number>();
  for (const c of customers) {
    industries.set(c.industrySector, (industries.get(c.industrySector) ?? 0) + c.loanBalance);
  }
  const topIndustry = Array.from(industries.entries()).sort((a, b) => b[1] - a[1])[0];
  if (topIndustry && topIndustry[1] / total > 0.3) {
    actions.push(
      `${topIndustry[0]} represents ${((topIndustry[1] / total) * 100).toFixed(1)}% of total exposure — above the 30% concentration guideline. Consider diversification.`
    );
  }

  if (actions.length === 0) {
    actions.push("Portfolio risk profile is within normal parameters. No immediate escalation required.");
  }

  return actions;
}
