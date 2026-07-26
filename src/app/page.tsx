"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import UploadPanel from "@/components/UploadPanel";
import { useAnalysis } from "@/context/AnalysisContext";
import { parseCustomerCsv } from "@/lib/csvParser";
import { parsePdfRules } from "@/lib/pdfParser";
import {
  DEFAULT_WEIGHTS,
  RISK_THRESHOLDS,
  scoreCustomers,
} from "@/lib/riskScoring";
import type { AnalysisResult } from "@/lib/types";

export default function UploadPage() {
  const router = useRouter();
  const { setResult } = useAnalysis();

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [isSampleSelected, setIsSampleSelected] = useState(false);
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [isLoadingSample, setIsLoadingSample] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handlePdfSelect(file: File | null) {
    setPdfFile(file);
    setIsSampleSelected(false);
  }

  function handleCsvSelect(file: File | null) {
    setCsvFile(file);
    setIsSampleSelected(false);
  }

  async function handleLoadSampleData() {
    setIsLoadingSample(true);
    setError(null);
    try {
      const [csvResp, pdfResp] = await Promise.all([
        fetch("/sample-data/sample-customers.csv"),
        fetch("/sample-data/sample-lending-policy.pdf"),
      ]);

      const csvBlob = await csvResp.blob();
      const pdfBlob = await pdfResp.blob();

      const csvSampleFile = new File([csvBlob], "sample-customers.csv", { type: "text/csv" });
      const pdfSampleFile = new File([pdfBlob], "sample-lending-policy.pdf", {
        type: "application/pdf",
      });

      setCsvFile(csvSampleFile);
      setPdfFile(pdfSampleFile);
      setIsSampleSelected(true);
    } catch {
      setError("Could not load sample data. Please try uploading files manually.");
    } finally {
      setIsLoadingSample(false);
    }
  }

  async function handleRunAnalysis() {
    if (!csvFile) return;
    setIsAnalysing(true);
    setError(null);

    try {
      const csvText = await csvFile.text();
      const { customers: rawCustomers, rowsSkipped } = parseCustomerCsv(csvText);
      const scored = scoreCustomers(rawCustomers, DEFAULT_WEIGHTS);

      let pdfRules: AnalysisResult["rules"] = [];
      let pdfPageCount: number | null = null;
      let pdfParseFailed = false;

      if (pdfFile) {
        try {
          const pdfResult = await parsePdfRules(pdfFile);
          pdfRules = pdfResult.rules;
          pdfPageCount = pdfResult.pageCount;
        } catch {
          pdfParseFailed = true;
        }
      }

      const analysisResult: AnalysisResult = {
        customers: scored,
        rules: pdfRules,
        weights: DEFAULT_WEIGHTS,
        csvFileName: csvFile.name,
        pdfFileName: pdfFile ? pdfFile.name : null,
        pdfPageCount,
        analysedAt: new Date(),
        isSampleData: isSampleSelected,
        rowsSkipped,
        pdfParseFailed,
      };

      setResult(analysisResult);
      router.push("/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong while analysing the files.");
    } finally {
      setIsAnalysing(false);
    }
  }

  const creditPct = Math.round(DEFAULT_WEIGHTS.creditRiskWeight * 100);
  const repaymentPct = Math.round(DEFAULT_WEIGHTS.repaymentRiskWeight * 100);
  const exposurePct = Math.round(DEFAULT_WEIGHTS.exposureWeight * 100);

  return (
    <div>
      <h1 className="text-3xl font-semibold">Portfolio Risk Analysis</h1>
      <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
        Upload your lending policy document and customer portfolio to generate an executive risk
        dashboard. All processing happens in your browser — no files are sent to a server.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <UploadPanel
          inputId="pdf-upload"
          title="1. Lending Policy & Risk Guidance (PDF)"
          description="Used to surface key policy rules and thresholds referenced on the dashboard. Optional, but recommended."
          accept="application/pdf"
          fileName={pdfFile ? pdfFile.name : null}
          onFileSelect={handlePdfSelect}
        />
        <UploadPanel
          inputId="csv-upload"
          title="2. Customer Portfolio (CSV)"
          description="Expected columns: CustomerID, CustomerName, Industry, CreditScore, RepaymentStatus, LoanBalance. Column names are matched flexibly."
          accept=".csv,text/csv"
          fileName={csvFile ? csvFile.name : null}
          onFileSelect={handleCsvSelect}
        />
      </div>

      {error && (
        <div
          className="mt-4 rounded-md border p-3 text-sm"
          style={{ borderColor: "var(--risk-red)", backgroundColor: "var(--risk-red-bg)", color: "var(--risk-red)" }}
        >
          {error}
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleRunAnalysis}
          disabled={!csvFile || isAnalysing}
          className="rounded-md px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
          style={{ backgroundColor: "var(--accent)" }}
        >
          {isAnalysing ? "Analysing…" : "Run Analysis"}
        </button>
        <button
          type="button"
          onClick={handleLoadSampleData}
          disabled={isLoadingSample}
          className="rounded-md border px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
          style={{ borderColor: "var(--border)" }}
        >
          {isLoadingSample ? "Loading…" : "Load Sample Data"}
        </button>
      </div>

      <div className="mt-8 rounded-xl border bg-[var(--surface)] p-5 shadow-sm" style={{ borderColor: "var(--border)" }}>
        <h3 className="text-sm font-semibold">How risk is scored</h3>
        <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
          Risk Score = (Credit Risk Weight × Credit Score Factor) + (Repayment Risk Weight ×
          Repayment Status Factor) + (Exposure Weight × Loan Balance Factor)
        </p>
        <ul className="mt-3 space-y-1 text-sm" style={{ color: "var(--muted)" }}>
          <li>Credit Risk Weight: {creditPct}%</li>
          <li>Repayment Risk Weight: {repaymentPct}%</li>
          <li>Exposure Weight: {exposurePct}%</li>
          <li>
            Category thresholds: Green 0–{RISK_THRESHOLDS.greenMax}, Amber{" "}
            {RISK_THRESHOLDS.greenMax + 1}–{RISK_THRESHOLDS.amberMax}, Red{" "}
            {RISK_THRESHOLDS.amberMax + 1}–100
          </li>
        </ul>
        <p className="mt-3 text-sm" style={{ color: "var(--muted)" }}>
          Edit <code className="rounded bg-[var(--background)] px-1.5 py-0.5">src/lib/riskScoring.ts</code>{" "}
          to change weights or thresholds.
        </p>
      </div>
    </div>
  );
}
