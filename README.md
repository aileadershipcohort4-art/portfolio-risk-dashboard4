# Portfolio Risk Dashboard

A client-side prototype that turns a lending policy PDF and a customer
portfolio CSV into an executive risk dashboard — customer risk scoring,
Green/Amber/Red categorisation, exposure breakdowns, a highest-risk table,
and recommended actions.

Everything runs in the browser. There is no backend, no database, no
authentication, and nothing is uploaded to a server — all parsing and
scoring happens client-side in JavaScript.

## What it does

1. **Upload** (`/`) — upload a lending policy PDF (optional) and a customer
   portfolio CSV (required), or click **Load Sample Data** to try it with
   bundled sample files.
2. **Analyse** — the CSV is parsed and every customer is scored using the
   formula below; the PDF (if provided) is scanned with keyword heuristics
   to surface relevant policy statements (minimum credit score, LVR/DTI
   limits, arrears handling, concentration limits, etc.).
3. **Executive Dashboard** (`/dashboard`) — KPI cards by risk category,
   total exposure, a category exposure chart, an industry exposure pie
   chart, a portfolio risk trend chart, a top-10 highest-risk customer
   table, recommended actions, and the scoring methodology.

## Risk scoring

```
Risk Score = (Credit Risk Weight   × Credit Score Factor)
           + (Repayment Risk Weight × Repayment Status Factor)
           + (Exposure Weight       × Loan Balance Factor)
```

- **Credit Score Factor**: credit score (300–850) inverted onto a 0–100
  scale — lower credit scores produce a higher factor.
- **Repayment Status Factor**: a lookup table over common repayment/arrears
  status text (Current → 0 ... Default/Write-off → 100); unrecognised text
  defaults to a moderate 50.
- **Exposure Factor**: loan balance capped at $500,000 and scaled to 0–100.
- **Weights**: Credit Risk 40%, Repayment Risk 40%, Exposure 20%.
- **Categories**: Green 0–35, Amber 36–65, Red 66–100.

**`src/lib/riskScoring.ts` is the single file to edit** to change scoring
weights, thresholds, or the repayment status lookup table.

## Running locally

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Deploying to Vercel

1. Push this repository to GitHub (already done if you're reading this from
   the deployed repo).
2. In Vercel: **Import Project** → select this GitHub repository → accept
   the default Next.js build settings → **Deploy**. No environment
   variables are required.
3. Vercel will auto-deploy on every push to `main`.

## Tech stack

Next.js (App Router, TypeScript), React, Tailwind CSS, Recharts, PapaParse
(CSV), pdfjs-dist (client-side PDF text extraction). No backend, no API
routes, no database, no authentication.

## Project structure

```
src/
  app/
    layout.tsx          — root layout: nav, footer, AnalysisProvider
    page.tsx             — Upload page ("/")
    dashboard/page.tsx    — Executive Dashboard ("/dashboard")
  components/
    NavBar.tsx
    UploadPanel.tsx
    RiskBadge.tsx
  context/
    AnalysisContext.tsx   — in-memory analysis state (lost on reload, by design)
  lib/
    types.ts
    riskScoring.ts         — scoring weights/thresholds — edit this to tune scoring
    csvParser.ts
    pdfParser.ts
    aggregations.ts
public/
  sample-data/
    sample-customers.csv
    sample-lending-policy.pdf
```

## Out of scope (by design)

No real customer data, no authentication, no server-side persistence of any
kind — all state lives in memory for the current browser session and is
lost on page reload. This is a prototype for internal review, not a
production system.
