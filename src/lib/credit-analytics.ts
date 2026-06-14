// Advanced credit analytics: TTC/PIT PD, rating migration matrix,
// early-warning triggers, Monte Carlo portfolio loss with VaR/ES.
//
// All formulas are simplified institutional approximations
// suitable for an analyst-facing demo dashboard.

import {
  expectedLoss,
  exposureAtDefault,
  lossGivenDefault,
  pdByGrade,
  probabilityOfDefault,
  scoreComponents,
  explainScore,
  type Borrower,
  type Grade,
} from "./risk-models";

export const GRADES: Grade[] = ["AAA", "AA", "A", "BBB", "BB", "B", "CCC", "CC", "C", "D"];

// ---------- TTC vs PIT PD ----------
// TTC (Through-the-Cycle) PD: grade-anchored long-run average.
// PIT (Point-in-Time) PD: borrower-specific logistic PD tilted by a
// macroeconomic index (-1 expansion … +1 recession).
export interface PdTtcPit {
  grade: Grade;
  score: number;
  ttc: number;
  pit: number;
  ratio: number; // pit / ttc, useful early-warning signal
}

export const pdTtcPit = (b: Borrower, macroIndex = 0): PdTtcPit => {
  const { pd, grade, score } = probabilityOfDefault(b);
  const ttc = pdByGrade[grade];
  // macro tilt: recession (+1) doubles PD, expansion (-1) halves it
  const tilt = Math.exp(0.7 * macroIndex);
  const pit = Math.min(0.99, Math.max(0.0001, pd * tilt));
  return { grade, score, ttc, pit, ratio: pit / Math.max(1e-6, ttc) };
};

// ---------- 1-Year Rating Migration Matrix (S&P-style approximation) ----------
// Rows = current grade, columns = grade in 1 year. Each row sums to 1.
// Order matches GRADES above.
export const baseTransitionMatrix: number[][] = [
  // AAA   AA     A      BBB    BB     B      CCC    CC     C      D
  [0.901, 0.083, 0.009, 0.005, 0.001, 0.001, 0.000, 0.000, 0.000, 0.000], // AAA
  [0.008, 0.905, 0.073, 0.008, 0.004, 0.001, 0.001, 0.000, 0.000, 0.000], // AA
  [0.001, 0.022, 0.913, 0.051, 0.008, 0.003, 0.001, 0.000, 0.000, 0.001], // A
  [0.000, 0.003, 0.052, 0.873, 0.054, 0.012, 0.003, 0.001, 0.000, 0.002], // BBB
  [0.000, 0.001, 0.005, 0.063, 0.835, 0.075, 0.011, 0.002, 0.001, 0.007], // BB
  [0.000, 0.000, 0.002, 0.005, 0.064, 0.834, 0.060, 0.010, 0.002, 0.023], // B
  [0.000, 0.000, 0.000, 0.005, 0.013, 0.130, 0.679, 0.071, 0.015, 0.087], // CCC
  [0.000, 0.000, 0.000, 0.002, 0.005, 0.060, 0.110, 0.520, 0.108, 0.195], // CC
  [0.000, 0.000, 0.000, 0.000, 0.000, 0.030, 0.080, 0.150, 0.390, 0.350], // C
  [0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 1.000], // D (absorbing)
];

// Matrix power (transition over `years` years), assuming Markov.
export const transitionPower = (m: number[][], years: number): number[][] => {
  let result = identity(m.length);
  for (let i = 0; i < years; i++) result = multiply(result, m);
  return result;
};

const identity = (n: number): number[][] =>
  Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))
  );

const multiply = (a: number[][], b: number[][]): number[][] => {
  const n = a.length;
  const out: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++)
    for (let k = 0; k < n; k++) {
      const aik = a[i][k];
      if (aik === 0) continue;
      for (let j = 0; j < n; j++) out[i][j] += aik * b[k][j];
    }
  return out;
};

// Apply a stress factor to the matrix: scales downgrade probabilities up,
// re-allocates from the diagonal/upgrades. factor 0 = base, 1 = severe recession.
export const stressTransitionMatrix = (m: number[][], factor: number): number[][] => {
  if (factor <= 0) return m.map((r) => r.slice());
  return m.map((row, i) => {
    if (i === m.length - 1) return row.slice(); // D absorbing
    const newRow = row.slice();
    let donated = 0;
    // boost downgrades and default (cols j > i)
    for (let j = i + 1; j < row.length; j++) {
      const boost = newRow[j] * (1 + factor);
      const delta = boost - newRow[j];
      newRow[j] = boost;
      donated += delta;
    }
    // take from upgrades and diagonal proportionally
    let pool = 0;
    for (let j = 0; j <= i; j++) pool += newRow[j];
    if (pool > 0) {
      const scale = Math.max(0, (pool - donated) / pool);
      for (let j = 0; j <= i; j++) newRow[j] *= scale;
    }
    // normalize defensively
    const sum = newRow.reduce((s, v) => s + v, 0);
    return newRow.map((v) => v / sum);
  });
};

// ---------- Early Warning triggers ----------
export type EWSeverity = "info" | "warn" | "critical";
export interface EarlyWarning {
  code: string;
  label: string;
  severity: EWSeverity;
  detail: string;
}

export const earlyWarnings = (b: Borrower, macroIndex = 0): EarlyWarning[] => {
  const out: EarlyWarning[] = [];
  const f = b.financials;
  const bh = b.behavior;
  const { ttc, pit, ratio } = pdTtcPit(b, macroIndex);
  const debtEbitda = f.ebitda > 0 ? f.totalDebt / f.ebitda : 99;
  const coverage = f.interestExpense > 0 ? f.ebitda / f.interestExpense : 99;
  const currentRatio = f.currentLiabilities > 0 ? f.currentAssets / f.currentLiabilities : 99;

  if (bh.daysPastDue90Last24m > 0)
    out.push({ code: "DPD90", label: "90+ DPD in last 24m", severity: "critical", detail: `${bh.daysPastDue90Last24m} occurrence(s)` });
  if (bh.daysPastDue30Last12m >= 2)
    out.push({ code: "DPD30", label: "Recurring 30+ DPD", severity: "warn", detail: `${bh.daysPastDue30Last12m} in last 12m` });
  if (bh.utilizationPct > 85)
    out.push({ code: "UTIL", label: "Revolver utilization > 85%", severity: "warn", detail: `${bh.utilizationPct.toFixed(0)}%` });
  if (debtEbitda > 6)
    out.push({ code: "LEV", label: "Leverage > 6x EBITDA", severity: debtEbitda > 8 ? "critical" : "warn", detail: `${debtEbitda.toFixed(1)}x` });
  if (coverage < 1.5)
    out.push({ code: "ICR", label: "Interest coverage < 1.5x", severity: coverage < 1 ? "critical" : "warn", detail: `${coverage.toFixed(2)}x` });
  if (currentRatio < 1)
    out.push({ code: "LIQ", label: "Current ratio < 1.0", severity: "warn", detail: `${currentRatio.toFixed(2)}` });
  if (ratio > 2)
    out.push({ code: "PIT2X", label: "PIT PD > 2× TTC anchor", severity: ratio > 3 ? "critical" : "warn", detail: `${ratio.toFixed(1)}× (PIT ${(pit*100).toFixed(2)}% vs TTC ${(ttc*100).toFixed(2)}%)` });
  if (bh.inquiriesLast6m >= 4)
    out.push({ code: "INQ", label: "Elevated bureau inquiries", severity: "info", detail: `${bh.inquiriesLast6m} in 6m` });
  return out;
};

export const ewSeverityRank = (s: EWSeverity) => (s === "critical" ? 3 : s === "warn" ? 2 : 1);

// ---------- Monte Carlo portfolio loss ----------
// One-factor Gaussian copula:
//   default(i) iff sqrt(rho)*Z + sqrt(1-rho)*eps_i  <  Phi^{-1}(PD_i)
// Loss(i) = LGD_i * EAD_i if default, else 0.
//
// rho ~ asset correlation (Basel-style ~ 0.10-0.24); we expose as parameter.
// LGD volatility added with a Beta-like noise scale.

// Deterministic PRNG (mulberry32) so simulations are reproducible.
const mulberry32 = (a: number) => () => {
  let t = (a += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const normalQuantile = (p: number): number => {
  // Beasley-Springer/Moro approximation
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.383577518672690e2, -3.066479806614716e1, 2.506628277459239];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
  const pLow = 0.02425;
  const pHigh = 1 - pLow;
  let q: number, r: number;
  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
  } else if (p <= pHigh) {
    q = p - 0.5; r = q*q;
    return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q / (((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
  }
};

const standardNormal = (rnd: () => number) => {
  // Box-Muller
  const u1 = Math.max(1e-12, rnd());
  const u2 = rnd();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
};

export interface MonteCarloParams {
  trials: number;
  correlation: number; // 0-1, single-factor rho
  macroIndex: number;  // -1..+1, tilts PIT PD
  lgdVol: number;      // 0-1 noise around LGD
  seed?: number;
}

export interface MonteCarloResult {
  trials: number;
  losses: Float64Array;
  mean: number;
  std: number;
  el: number;          // analytic expected loss (sum PD*LGD*EAD)
  var95: number;
  var99: number;
  var999: number;
  es97_5: number;
  es99: number;
  histogram: { bin: number; from: number; to: number; count: number }[];
  worstContributors: { id: string; name: string; meanLossInTail: number }[];
}

export const runMonteCarlo = (
  borrowers: Borrower[],
  params: MonteCarloParams
): MonteCarloResult => {
  const rnd = mulberry32(params.seed ?? 42);
  const n = borrowers.length;
  const trials = Math.max(100, Math.floor(params.trials));
  const rho = Math.min(0.95, Math.max(0, params.correlation));
  const sqrtRho = Math.sqrt(rho);
  const sqrt1mRho = Math.sqrt(1 - rho);

  // Precompute per-borrower PIT PD threshold, LGD, EAD
  const thresholds = new Float64Array(n);
  const lgds = new Float64Array(n);
  const eads = new Float64Array(n);
  let analyticEL = 0;
  for (let i = 0; i < n; i++) {
    const b = borrowers[i];
    const { pit } = pdTtcPit(b, params.macroIndex);
    const { lgd } = lossGivenDefault(b);
    const ead = exposureAtDefault(b);
    thresholds[i] = normalQuantile(pit);
    lgds[i] = lgd;
    eads[i] = ead;
    analyticEL += pit * lgd * ead;
  }

  const losses = new Float64Array(trials);
  // Track per-borrower loss sum within worst 1% tail for contributor attribution
  const tailContrib = new Float64Array(n);
  const tailIdx: number[] = [];

  for (let t = 0; t < trials; t++) {
    const Z = standardNormal(rnd);
    let loss = 0;
    for (let i = 0; i < n; i++) {
      const eps = standardNormal(rnd);
      const x = sqrtRho * Z + sqrt1mRho * eps;
      if (x < thresholds[i]) {
        // realised LGD with noise
        const noise = params.lgdVol > 0 ? 1 + params.lgdVol * standardNormal(rnd) * 0.4 : 1;
        const realisedLgd = Math.min(1, Math.max(0, lgds[i] * noise));
        loss += realisedLgd * eads[i];
      }
    }
    losses[t] = loss;
  }

  // Sort once for VaR / ES
  const sorted = Float64Array.from(losses).sort();
  const q = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
  const es = (p: number) => {
    const start = Math.floor(p * sorted.length);
    let s = 0;
    const n2 = sorted.length - start;
    for (let i = start; i < sorted.length; i++) s += sorted[i];
    return n2 > 0 ? s / n2 : 0;
  };

  // Histogram (40 bins)
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const bins = 40;
  const width = (max - min) / bins || 1;
  const counts = new Array(bins).fill(0);
  for (let i = 0; i < sorted.length; i++) {
    const idx = Math.min(bins - 1, Math.floor((sorted[i] - min) / width));
    counts[idx]++;
  }
  const histogram = counts.map((c, i) => ({
    bin: i,
    from: min + i * width,
    to: min + (i + 1) * width,
    count: c,
  }));

  // Tail attribution: rerun a small sample of worst trials with same seeds is
  // expensive — instead approximate using marginal contributions = PIT*LGD*EAD
  // weighted by (1 + tail amplification of correlation).
  const tailAmp = 1 + 3 * rho;
  for (let i = 0; i < n; i++) {
    const b = borrowers[i];
    const { pit } = pdTtcPit(b, params.macroIndex);
    tailContrib[i] = pit * lgds[i] * eads[i] * tailAmp;
    tailIdx.push(i);
  }
  tailIdx.sort((a, b) => tailContrib[b] - tailContrib[a]);
  const worstContributors = tailIdx.slice(0, 8).map((i) => ({
    id: borrowers[i].id,
    name: borrowers[i].legalName,
    meanLossInTail: tailContrib[i],
  }));

  const mean = sorted.reduce((s, v) => s + v, 0) / sorted.length;
  let variance = 0;
  for (let i = 0; i < sorted.length; i++) variance += (sorted[i] - mean) ** 2;
  variance /= sorted.length;

  return {
    trials,
    losses,
    mean,
    std: Math.sqrt(variance),
    el: analyticEL,
    var95: q(0.95),
    var99: q(0.99),
    var999: q(0.999),
    es97_5: es(0.975),
    es99: es(0.99),
    histogram,
    worstContributors,
  };
};

// ---------- SHAP driver impact (portfolio-wide) ----------
// For a given driver name, returns each borrower's contribution to that
// driver and a "highlight strength" (signed magnitude relative to portfolio max).
export interface DriverImpact {
  id: string;
  name: string;
  contribution: number; // signed
  abs: number;
  highlight: number; // 0..1
}

export const driverImpacts = (borrowers: Borrower[], driver: string): DriverImpact[] => {
  const rows = borrowers.map((b) => {
    const shap = explainScore(b);
    const f = shap.find((x) => x.name === driver);
    const contribution = f?.contribution ?? 0;
    return { id: b.id, name: b.legalName, contribution, abs: Math.abs(contribution) };
  });
  const maxAbs = Math.max(1e-9, ...rows.map((r) => r.abs));
  return rows
    .map((r) => ({ ...r, highlight: r.abs / maxAbs }))
    .sort((a, b) => b.abs - a.abs);
};

// Re-export for convenience
export { expectedLoss, scoreComponents, explainScore };
