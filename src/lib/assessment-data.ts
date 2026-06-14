import type { Borrower } from "./risk-models";

export type AssessmentRow = {
  id: string;
  owner_id: string;
  name: string;
  kind: "seed" | "upload";
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type BorrowerRecordRow = {
  id: string;
  assessment_id: string;
  payload: Borrower;
  created_at: string;
};

// No seed borrowers — data comes only from uploaded sheet
export const generateSeedBorrowers = (): Borrower[] => [];

// CSV parsing — supports quoted fields, commas in quotes, escaped quotes.
export function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQ = false;
      else field += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ",") { cur.push(field); field = ""; }
      else if (c === "\n" || c === "\r") {
        if (field !== "" || cur.length) { cur.push(field); lines.push(cur); cur = []; field = ""; }
        if (c === "\r" && text[i + 1] === "\n") i++;
      } else field += c;
    }
  }
  if (field !== "" || cur.length) { cur.push(field); lines.push(cur); }
  if (!lines.length) return { headers: [], rows: [] };
  const headers = lines[0].map((h) => h.trim());
  const rows = lines.slice(1).filter((l) => l.some((v) => v.trim() !== "")).map((l) => {
    const r: Record<string, string> = {};
    headers.forEach((h, i) => { r[h] = (l[i] ?? "").trim(); });
    return r;
  });
  return { headers, rows };
}

// Target schema for borrower import (user maps their CSV columns to these).
export const BORROWER_FIELDS = [
  { key: "legalName",           label: "Legal Name",       required: true,  type: "string" },
  { key: "sector",              label: "Sector",           required: true,  type: "string" },
  { key: "region",              label: "Region",           required: true,  type: "string" },
  { key: "country",             label: "Country",          required: false, type: "string" },
  { key: "rmOwner",             label: "RM Owner",         required: false, type: "string" },
  { key: "seniority",           label: "Seniority",        required: false, type: "string" },
  { key: "facilityType",        label: "Facility Type",    required: false, type: "string" },
  { key: "tenorMonths",         label: "Tenor (months)",   required: false, type: "number" },
  { key: "exposure",            label: "Exposure (USD)",   required: true,  type: "number" },
  { key: "collateralValue",     label: "Collateral (USD)", required: false, type: "number" },
  { key: "annualRevenue",       label: "Annual Revenue",   required: true,  type: "number" },
  { key: "ebitda",              label: "EBITDA",           required: true,  type: "number" },
  { key: "totalDebt",           label: "Total Debt",       required: true,  type: "number" },
  { key: "cashAndEquivalents",  label: "Cash",             required: false, type: "number" },
  { key: "currentAssets",       label: "Current Assets",   required: false, type: "number" },
  { key: "currentLiabilities",  label: "Current Liabilities", required: false, type: "number" },
  { key: "interestExpense",     label: "Interest Expense", required: false, type: "number" },
  { key: "netIncome",           label: "Net Income",       required: false, type: "number" },
  { key: "totalAssets",         label: "Total Assets",     required: true,  type: "number" },
  { key: "totalEquity",         label: "Total Equity",     required: false, type: "number" },
  { key: "utilizationPct",      label: "Utilization %",    required: false, type: "number" },
  { key: "daysPastDue30Last12m",label: "DPD 30 (12m)",     required: false, type: "number" },
  { key: "daysPastDue90Last24m",label: "DPD 90 (24m)",     required: false, type: "number" },
  { key: "inquiriesLast6m",     label: "Inquiries (6m)",   required: false, type: "number" },
  { key: "accountAgeYears",     label: "Account Age (yrs)",required: false, type: "number" },
  { key: "bureauScore",         label: "Bureau Score",     required: false, type: "number" },
] as const;

const num = (s: string | undefined, d = 0) => {
  if (!s) return d;
  const n = Number(s.replace(/[,$%\s]/g, ""));
  return Number.isFinite(n) ? n : d;
};

export function mappedRowToBorrower(
  row: Record<string, string>,
  mapping: Record<string, string>,
  index: number
): Borrower {
  const g = (k: string) => row[mapping[k]] ?? "";

  const totalAssets  = num(g("totalAssets"), Math.max(1, num(g("annualRevenue"))));
  const totalDebt    = num(g("totalDebt"));
  const totalEquity  = num(g("totalEquity"), Math.max(0, totalAssets - totalDebt));
  const exposure     = num(g("exposure"), Math.max(1, Math.round(totalDebt * 0.2)));

  return {
    id:             `BRW-${(20000 + index).toString()}`,
    legalName:      g("legalName") || `Borrower ${index + 1}`,
    sector:         g("sector"),          // taken exactly as-is from sheet
    region:         g("region"),          // taken exactly as-is from sheet
    country:        g("country") || "India",
    rmOwner:        g("rmOwner") || "—",
    onboardedAt:    new Date().toISOString().slice(0, 10),
    exposure,
    collateralValue: num(g("collateralValue"), Math.round(exposure * 0.6)),
    seniority:      g("seniority") || "Mid-Level",   // as-is from sheet
    facilityType:   g("facilityType") || "Term Loan", // as-is from sheet
    tenorMonths:    num(g("tenorMonths"), 36),
    financials: {
      annualRevenue:     num(g("annualRevenue")),
      ebitda:            num(g("ebitda")),
      totalDebt,
      cashAndEquivalents:num(g("cashAndEquivalents")),
      currentAssets:     num(g("currentAssets"),     Math.round(totalAssets * 0.4)),
      currentLiabilities:num(g("currentLiabilities"),Math.round(totalAssets * 0.25)),
      interestExpense:   num(g("interestExpense"),    Math.round(totalDebt * 0.06)),
      netIncome:         num(g("netIncome")),
      totalAssets,
      totalEquity,
    },
    behavior: {
      utilizationPct:      num(g("utilizationPct"), 40),
      daysPastDue30Last12m:num(g("daysPastDue30Last12m")),
      daysPastDue90Last24m:num(g("daysPastDue90Last24m")),
      inquiriesLast6m:     num(g("inquiriesLast6m")),
      accountAgeYears:     num(g("accountAgeYears"), 3),
      bureauScore:         num(g("bureauScore"), 680),
    },
  };
}

// Auto-guess mapping: match field key/label against headers (case/punctuation insensitive).
export function autoMap(headers: string[]): Record<string, string> {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const idx = new Map(headers.map((h) => [norm(h), h]));
  const mapping: Record<string, string> = {};
  for (const f of BORROWER_FIELDS) {
    const candidates = [f.key, f.label, f.label.replace(/\s*\(.*?\)\s*/g, "")];
    for (const c of candidates) {
      const m = idx.get(norm(c));
      if (m) { mapping[f.key] = m; break; }
    }
  }
  return mapping;
}

export const SAMPLE_CSV_HEADERS = BORROWER_FIELDS.map((f) => f.label).join(",");