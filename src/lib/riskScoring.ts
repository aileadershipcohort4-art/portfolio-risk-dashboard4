// ============================================================================
// RISK SCORING ENGINE — THE SINGLE FILE TO EDIT to change scoring behaviour.
//
// Formula:
//   Risk Score = (Credit Risk Weight   × Credit Score Factor)
//              + (Repayment Risk Weight × Repayment Status Factor)
//              + (Exposure Weight       × Loan Balance Factor)
//
// All three factors are normalised to a 0–100 scale before weighting, so the
// final Risk Score is also on a 0–100 scale. Adjust DEFAULT_WEIGHTS or
// RISK_THRESHOLDS below to change how the portfolio is scored and categorised.
// ============================================================================

import type { RawCustomerRow, RiskCategory, RiskWeights, ScoredCustomer } from "./types";

// ----------------------------------------------------------------------------
// Weights
// ----------------------------------------------------------------------------
// Rationale: credit history and repayment behaviour are the strongest
// predictors of default; exposure reflects materiality (how much is at
// stake), not probability of default, hence the lower weight.
export const DEFAULT_WEIGHTS: RiskWeights = {
  creditRiskWeight: 0.4,
  repaymentRiskWeight: 0.4,
  exposureWeight: 0.2,
};

// ----------------------------------------------------------------------------
// Credit score factor
// ----------------------------------------------------------------------------
export const CREDIT_SCORE_MIN = 300;
export const CREDIT_SCORE_MAX = 850;

export function creditScoreFactor(score: number): number {
  const clamped = Math.min(CREDIT_SCORE_MAX, Math.max(CREDIT_SCORE_MIN, score));
  return ((CREDIT_SCORE_MAX - clamped) / (CREDIT_SCORE_MAX - CREDIT_SCORE_MIN)) * 100;
}

// ----------------------------------------------------------------------------
// Exposure factor
// ----------------------------------------------------------------------------
export const EXPOSURE_CAP = 500_000;

export function exposureFactor(loanBalance: number): number {
  const capped = Math.min(Math.max(loanBalance, 0), EXPOSURE_CAP);
  return (capped / EXPOSURE_CAP) * 100;
}

// ----------------------------------------------------------------------------
// Repayment status factor
// ----------------------------------------------------------------------------
// Free-text lookup table. Unrecognised text with no parseable day count
// defaults to 50 (moderate risk) — never silently ignored.
const REPAYMENT_STATUS_TABLE: Array<{ match: RegExp; factor: number }> = [
  { match: /\b(current|on time|on-time)\b/i, factor: 0 },
  { match: /\b(watchlist|grace)\b/i, factor: 20 },
  { match: /\b(90\+|90 ?\+? ?days?)\b/i, factor: 90 },
  { match: /\b(60 ?days? past due|60-89)\b/i, factor: 75 },
  { match: /\b60 ?days?\b/i, factor: 60 },
  { match: /\b30 ?days?\b/i, factor: 35 },
  { match: /\b(1|[12][0-9]) ?days?\b/i, factor: 35 },
  { match: /\b(non-?performing|npl)\b/i, factor: 95 },
  { match: /\b(default|write-?off)\b/i, factor: 100 },
];

export function repaymentRiskFactor(statusText: string): number {
  const text = (statusText || "").trim();
  if (!text) return 50;

  for (const entry of REPAYMENT_STATUS_TABLE) {
    if (entry.match.test(text)) return entry.factor;
  }

  // Try to parse a raw day count, e.g. "45 days" with no other keyword match.
  const dayMatch = text.match(/(\d+)\s*\+?\s*days?/i);
  if (dayMatch) {
    const days = parseInt(dayMatch[1], 10);
    if (days === 0) return 0;
    if (days < 30) return 35;
    if (days < 60) return 60;
    if (days < 90) return 75;
    return 90;
  }

  return 50;
}

// ----------------------------------------------------------------------------
// Category thresholds
// ----------------------------------------------------------------------------
export const RISK_THRESHOLDS = {
  greenMax: 35,
  amberMax: 65,
};

export function categoriseRiskScore(score: number): RiskCategory {
  if (score <= RISK_THRESHOLDS.greenMax) return "Green";
  if (score <= RISK_THRESHOLDS.amberMax) return "Amber";
  return "Red";
}

// ----------------------------------------------------------------------------
// Scoring entry point
// ----------------------------------------------------------------------------
export function scoreCustomer(
  row: RawCustomerRow,
  weights: RiskWeights = DEFAULT_WEIGHTS
): ScoredCustomer {
  const csFactor = creditScoreFactor(row.creditScore);
  const rpFactor = repaymentRiskFactor(row.repaymentStatus);
  const exFactor = exposureFactor(row.loanBalance);

  const riskScore =
    weights.creditRiskWeight * csFactor +
    weights.repaymentRiskWeight * rpFactor +
    weights.exposureWeight * exFactor;

  return {
    ...row,
    creditScoreFactor: csFactor,
    repaymentRiskFactor: rpFactor,
    exposureFactor: exFactor,
    riskScore,
    category: categoriseRiskScore(riskScore),
  };
}

export function scoreCustomers(
  rows: RawCustomerRow[],
  weights: RiskWeights = DEFAULT_WEIGHTS
): ScoredCustomer[] {
  return rows.map((row) => scoreCustomer(row, weights));
}
