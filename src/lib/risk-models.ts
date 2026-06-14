// Deterministic credit risk model utilities.
// Formulas are simplified but follow institutional logic
// (logistic PD, Basel-style LGD/EAD/EL, weighted internal score).

export type Sector =
  | "Manufacturing"
  | "Technology"
  | "Retail"
  | "Real Estate"
  | "Energy"
  | "Healthcare"
  | "Financials"
  | "Agriculture"
  | "Transport"
  | "Construction";

export type Region = "North America" | "EMEA" | "APAC" | "LATAM";

export interface BorrowerFinancials {
  annualRevenue: number;        // USD
  ebitda: number;               // USD
  totalDebt: number;            // USD
  cashAndEquivalents: number;   // USD
  currentAssets: number;
  currentLiabilities: number;
  interestExpense: number;
  netIncome: number;
  totalAssets: number;
  totalEquity: number;
}

export interface BorrowerBehavior {
  utilizationPct: number;            // 0-100, revolving utilization
  daysPastDue30Last12m: number;      // count
  daysPastDue90Last24m: number;      // count
  inquiriesLast6m: number;
  accountAgeYears: number;
  bureauScore: number;               // 300-850 external bureau
}

export interface Borrower {
  id: string;
  legalName: string;
  ticker?: string;
  sector: Sector;
  region: Region;
  country: string;
  rmOwner: string;
  onboardedAt: string;
  exposure: number;                  // EAD, USD
  collateralValue: number;           // USD
  seniority: "Senior Secured" | "Senior Unsecured" | "Subordinated";
  facilityType: "Term Loan" | "Revolver" | "Bond" | "Trade Finance";
  tenorMonths: number;
  financials: BorrowerFinancials;
  behavior: BorrowerBehavior;
}

// ---------- Ratios ----------
export const ratios = (f: BorrowerFinancials) => {
  const debtToEbitda = f.ebitda > 0 ? f.totalDebt / f.ebitda : 99;
  const interestCoverage = f.interestExpense > 0 ? f.ebitda / f.interestExpense : 99;
  const currentRatio = f.currentLiabilities > 0 ? f.currentAssets / f.currentLiabilities : 99;
  const debtToAssets = f.totalAssets > 0 ? f.totalDebt / f.totalAssets : 1;
  const equityRatio = f.totalAssets > 0 ? f.totalEquity / f.totalAssets : 0;
  const roa = f.totalAssets > 0 ? f.netIncome / f.totalAssets : 0;
  const roe = f.totalEquity > 0 ? f.netIncome / f.totalEquity : 0;
  const ebitdaMargin = f.annualRevenue > 0 ? f.ebitda / f.annualRevenue : 0;
  return { debtToEbitda, interestCoverage, currentRatio, debtToAssets, equityRatio, roa, roe, ebitdaMargin };
};

// ---------- Internal Credit Score (0-1000) ----------
// Weighted blend of financial strength, behavior, and bureau anchor.
export const scoreComponents = (b: Borrower) => {
  const r = ratios(b.financials);
  const bh = b.behavior;

  const clamp = (x: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, x));

  // Sub-scores 0-100
  const leverage = clamp(100 - r.debtToEbitda * 12);                      // lower D/E better
  const coverage = clamp(r.interestCoverage * 8);                          // higher better
  const liquidity = clamp(r.currentRatio * 35);                            // ~1.5 -> 52
  const profitability = clamp(50 + r.ebitdaMargin * 200 + r.roa * 150);
  const solvency = clamp(20 + r.equityRatio * 120);
  const behaviorScore = clamp(
    100 - bh.utilizationPct * 0.6 - bh.daysPastDue30Last12m * 6 - bh.daysPastDue90Last24m * 12 - bh.inquiriesLast6m * 2
  );
  const bureau = clamp(((bh.bureauScore - 300) / 550) * 100);
  const tenure = clamp(bh.accountAgeYears * 6);

  const weights = {
    leverage: 0.16, coverage: 0.14, liquidity: 0.08, profitability: 0.14,
    solvency: 0.10, behavior: 0.16, bureau: 0.16, tenure: 0.06,
  };

  const blended =
    leverage * weights.leverage +
    coverage * weights.coverage +
    liquidity * weights.liquidity +
    profitability * weights.profitability +
    solvency * weights.solvency +
    behaviorScore * weights.behavior +
    bureau * weights.bureau +
    tenure * weights.tenure;

  const score = Math.round(blended * 10); // 0-1000
  return {
    score,
    parts: { leverage, coverage, liquidity, profitability, solvency, behavior: behaviorScore, bureau, tenure },
    weights,
  };
};

// ---------- Risk Rating (institutional grades) ----------
export type Grade = "AAA" | "AA" | "A" | "BBB" | "BB" | "B" | "CCC" | "CC" | "C" | "D";

export const gradeFromScore = (score: number): Grade => {
  if (score >= 920) return "AAA";
  if (score >= 870) return "AA";
  if (score >= 810) return "A";
  if (score >= 740) return "BBB";
  if (score >= 660) return "BB";
  if (score >= 560) return "B";
  if (score >= 470) return "CCC";
  if (score >= 400) return "CC";
  if (score >= 330) return "C";
  return "D";
};

export const gradeBand = (g: Grade): "Investment" | "Speculative" | "Distressed" => {
  if (["AAA", "AA", "A", "BBB"].includes(g)) return "Investment";
  if (["BB", "B"].includes(g)) return "Speculative";
  return "Distressed";
};

// 1-year PD anchors by grade (S&P-style approximation)
export const pdByGrade: Record<Grade, number> = {
  AAA: 0.0002, AA: 0.0005, A: 0.0012, BBB: 0.0035,
  BB: 0.012, B: 0.045, CCC: 0.135, CC: 0.245, C: 0.35, D: 1.0,
};

// ---------- PD model (logistic, calibrated to grade anchor) ----------
export const probabilityOfDefault = (b: Borrower) => {
  const { score } = scoreComponents(b);
  const grade = gradeFromScore(score);
  // logistic shape around score, blended with grade anchor for stability
  const z = (700 - score) / 80;
  const logistic = 1 / (1 + Math.exp(-z));
  const anchor = pdByGrade[grade];
  const pd = Math.min(0.99, Math.max(0.0001, 0.55 * logistic + 0.45 * anchor));
  return { pd, grade, score };
};

// ---------- LGD model ----------
// LGD = max(0, 1 - recovery). Recovery = collateral coverage * haircut + seniority adjustment.
export const lossGivenDefault = (b: Borrower) => {
  const exposure = Math.max(1, b.exposure);
  const coverage = Math.min(1.2, b.collateralValue / exposure);
  const haircut =
    b.seniority === "Senior Secured" ? 0.85 :
    b.seniority === "Senior Unsecured" ? 0.55 : 0.30;
  const recoveryFromCollat = coverage * haircut;
  const seniorityFloor =
    b.seniority === "Senior Secured" ? 0.20 :
    b.seniority === "Senior Unsecured" ? 0.40 : 0.65;
  const lgd = Math.min(0.95, Math.max(0.05, Math.max(seniorityFloor - 0.1, 1 - recoveryFromCollat)));
  return { lgd, recovery: 1 - lgd, coverage, haircut };
};

// ---------- EAD / Expected Loss ----------
// EAD = exposure + CCF * undrawn (approx for revolvers).
export const exposureAtDefault = (b: Borrower) => {
  if (b.facilityType === "Revolver") {
    const ccf = 0.5;
    const undrawn = b.exposure * (1 - b.behavior.utilizationPct / 100);
    return b.exposure + ccf * undrawn;
  }
  return b.exposure;
};

export const expectedLoss = (b: Borrower) => {
  const { pd, grade, score } = probabilityOfDefault(b);
  const { lgd } = lossGivenDefault(b);
  const ead = exposureAtDefault(b);
  const el = pd * lgd * ead;
  return { el, pd, lgd, ead, grade, score };
};

// ---------- SHAP-style attribution (deterministic stand-in) ----------
export const explainScore = (b: Borrower) => {
  const { parts, weights } = scoreComponents(b);
  const baseline = 50;
  const features: { name: string; value: number; contribution: number }[] = [
    { name: "Bureau Score", value: parts.bureau, contribution: (parts.bureau - baseline) * weights.bureau },
    { name: "Repayment Behavior", value: parts.behavior, contribution: (parts.behavior - baseline) * weights.behavior },
    { name: "Leverage (Debt/EBITDA)", value: parts.leverage, contribution: (parts.leverage - baseline) * weights.leverage },
    { name: "Profitability", value: parts.profitability, contribution: (parts.profitability - baseline) * weights.profitability },
    { name: "Interest Coverage", value: parts.coverage, contribution: (parts.coverage - baseline) * weights.coverage },
    { name: "Solvency (Equity Ratio)", value: parts.solvency, contribution: (parts.solvency - baseline) * weights.solvency },
    { name: "Liquidity (Current Ratio)", value: parts.liquidity, contribution: (parts.liquidity - baseline) * weights.liquidity },
    { name: "Account Tenure", value: parts.tenure, contribution: (parts.tenure - baseline) * weights.tenure },
  ];
  return features.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
};

export const fmtUSD = (n: number) => {
  const abs = Math.abs(n);
  if (abs >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
};
export const fmtPct = (x: number, d = 2) => `${(x * 100).toFixed(d)}%`;
export const fmtNum = (x: number, d = 2) => x.toLocaleString(undefined, { maximumFractionDigits: d, minimumFractionDigits: d });
