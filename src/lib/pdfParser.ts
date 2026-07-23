// Client-side PDF rule extraction via pdfjs-dist.
// Pure keyword + sentence-splitting heuristics — no LLM/API calls of any kind.
// PDF parsing is optional and best-effort: callers must catch failures and
// never let them block CSV analysis (see AnalysisContext usage).

import type { ExtractedRule, PdfParseResult } from "./types";

// pdfjs-dist v6 requires Promise.withResolvers, which is undefined on older
// browsers (pre Safari 17.4 / Chrome 119 / Firefox 121). Polyfill defensively
// before importing/using the library.
function polyfillPromiseWithResolvers() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (typeof (Promise as any).withResolvers !== "function") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (Promise as any).withResolvers = function withResolvers<T>() {
      let resolve!: (value: T | PromiseLike<T>) => void;
      let reject!: (reason?: unknown) => void;
      const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
      });
      return { promise, resolve, reject };
    };
  }
}

const RULE_KEYWORDS = [
  "credit score",
  "debt-to-income",
  "debt to income",
  "dti",
  "loan-to-value",
  "loan to value",
  "ltv",
  "delinquen",
  "default",
  "past due",
  "arrears",
  "watchlist",
  "covenant",
  "exposure limit",
  "concentration limit",
  "threshold",
  "risk rating",
  "risk grade",
  "write-off",
  "write off",
  "provisioning",
  "collateral",
  "minimum",
  "maximum",
];

function splitStatements(text: string): string[] {
  return text
    .split(/(?:\.\s+|;\s+)/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 15 && s.length <= 320);
}

function isRuleStatement(statement: string): boolean {
  const lower = statement.toLowerCase();
  return RULE_KEYWORDS.some((kw) => lower.includes(kw));
}

export async function parsePdfRules(file: File): Promise<PdfParseResult> {
  polyfillPromiseWithResolvers();

  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  let rawText = "";
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pageText = content.items.map((item: any) => ("str" in item ? item.str : "")).join(" ");
    rawText += pageText + " ";
  }

  const statements = splitStatements(rawText);
  const rules: ExtractedRule[] = statements
    .filter(isRuleStatement)
    .slice(0, 25)
    .map((text) => ({ text }));

  return { rawText, rules, pageCount: pdf.numPages };
}
