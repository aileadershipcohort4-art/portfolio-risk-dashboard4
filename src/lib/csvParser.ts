// CSV parsing for the customer portfolio upload.
// Matches column headers flexibly (case-insensitive, whitespace-normalised)
// against a set of accepted aliases per logical column.

import Papa from "papaparse";
import type { CsvParseResult, RawCustomerRow } from "./types";

const COLUMN_ALIASES: Record<keyof RawCustomerRow, string[]> = {
  customerId: ["customer_id", "customerid", "id", "account_id", "account number", "customer id"],
  customerName: ["customer_name", "customername", "name", "client name", "customer"],
  industrySector: ["industry_sector", "industry", "sector", "industry sector"],
  creditScore: ["credit_score", "creditscore", "credit score", "score", "bureau_score"],
  repaymentStatus: [
    "repayment_status",
    "repaymentstatus",
    "repayment status",
    "status",
    "arrears_status",
    "delinquency_status",
  ],
  loanBalance: ["loan_balance", "loanbalance", "loan balance", "balance", "exposure", "outstanding_balance"],
};

function normaliseHeader(header: string): string {
  return header.trim().toLowerCase().replace(/\s+/g, " ");
}

function buildHeaderMap(headers: string[]): Partial<Record<keyof RawCustomerRow, string>> {
  const normalisedHeaders = headers.map((h) => ({ raw: h, norm: normaliseHeader(h) }));
  const map: Partial<Record<keyof RawCustomerRow, string>> = {};

  (Object.keys(COLUMN_ALIASES) as Array<keyof RawCustomerRow>).forEach((logicalCol) => {
    const aliases = COLUMN_ALIASES[logicalCol];
    const found = normalisedHeaders.find((h) => aliases.includes(h.norm));
    if (found) map[logicalCol] = found.raw;
  });

  return map;
}

function parseNumber(value: string | undefined): number | null {
  if (value === undefined || value === null) return null;
  const cleaned = String(value).replace(/[$,\s]/g, "");
  if (cleaned === "") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function parseCustomerCsv(csvText: string): CsvParseResult {
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  const headers = parsed.meta.fields ?? [];
  const headerMap = buildHeaderMap(headers);

  const requiredCols: Array<keyof RawCustomerRow> = [
    "customerId",
    "customerName",
    "industrySector",
    "creditScore",
    "repaymentStatus",
    "loanBalance",
  ];
  const missing = requiredCols.filter((c) => !headerMap[c]);

  if (missing.length > 0) {
    const friendlyNames: Record<keyof RawCustomerRow, string> = {
      customerId: "CustomerID",
      customerName: "CustomerName",
      industrySector: "Industry",
      creditScore: "CreditScore",
      repaymentStatus: "RepaymentStatus",
      loanBalance: "LoanBalance",
    };
    throw new Error(
      `The CSV is missing required column(s): ${missing.map((m) => friendlyNames[m]).join(", ")}. ` +
        `Expected columns: CustomerID, CustomerName, Industry, CreditScore, RepaymentStatus, LoanBalance (column names are matched flexibly).`
    );
  }

  let rowsSkipped = 0;
  const customers: RawCustomerRow[] = [];

  for (const row of parsed.data) {
    const customerId = (row[headerMap.customerId!] ?? "").trim();
    const customerName = (row[headerMap.customerName!] ?? "").trim();
    const industrySector = (row[headerMap.industrySector!] ?? "").trim() || "Unclassified";
    const repaymentStatus = (row[headerMap.repaymentStatus!] ?? "").trim();
    const creditScore = parseNumber(row[headerMap.creditScore!]);
    const loanBalance = parseNumber(row[headerMap.loanBalance!]);

    if (!customerId || creditScore === null || loanBalance === null) {
      rowsSkipped += 1;
      continue;
    }

    customers.push({
      customerId,
      customerName: customerName || customerId,
      industrySector,
      creditScore,
      repaymentStatus,
      loanBalance,
    });
  }

  return { customers, rowsSkipped };
}
