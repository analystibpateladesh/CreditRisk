# CreditRisk Pro: Institutional Credit Risk Analytics Platform

> A full-stack, browser-based credit risk workbench built to institutional standards - implementing Basel III/IV-aligned quantitative models, AI-powered portfolio commentary, and an end-to-end analyst workflow across scoring, rating, PD/LGD/EAD, Monte Carlo simulation, concentration risk, and explainability.

**Stack:** React 19 · TypeScript · TanStack Start · TanStack Query · Tailwind CSS v4 · Radix UI · Supabase · Recharts · Zod · Vite


---

## The Problem This Solves

Every bank, NBFC, insurance company, and asset manager faces the same fundamental challenge: **how do you measure, monitor, and manage the risk that your borrowers won't repay?**

Today, most mid-sized financial institutions rely on:
- Spreadsheet-based credit models with no real-time interactivity
- Siloed risk systems that analysts can't interrogate or stress-test
- Black-box scoring models with no explainability for regulators or credit committees
- Manual, time-consuming processes to compute VaR, EL, and concentration risk across a portfolio

**CreditRisk Pro solves this** by delivering a unified, interactive risk workbench that a credit analyst, risk manager, or CRO can use to assess any portfolio in real time - from individual borrower scoring all the way to Monte Carlo-based capital estimation.

---

## Who Needs This

| Institution Type | Use Case |
|---|---|
| **Commercial Banks** | Corporate & SME lending portfolio risk monitoring |
| **NBFCs & MFIs** | Microfinance portfolio stress-testing and early warning |
| **Credit Rating Agencies** | Internal shadow-rating and transition matrix analysis |
| **Asset Managers / Credit Funds** | Expected loss budgeting and concentration management |
| **Insurance Companies** | Counterparty credit exposure and EAD estimation |
| **Risk Consulting Firms** | Client portfolio diagnostics and regulatory reporting |
| **Regulators / Supervisors** | ICAAP/SREP-ready analytics and Basel Pillar 2 documentation |

---

## Features

### Executive Risk Overview
The landing dashboard gives a CRO-level snapshot of the entire portfolio:
- Total Exposure (EAD), Expected Loss (12M), Average PD and LGD
- Grade distribution (Investment / Speculative / Distressed) with EAD and EL breakdowns
- Sector concentration heatmap and top-10 riskiest borrowers
- Synthetic 12-month EL trend chart

### Credit Scoring Engine (0–1000)
An 8-factor weighted internal scoring model - analogous to models used at large commercial banks:

| Factor | Weight | Signal |
|---|---|---|
| Leverage (Debt/EBITDA) | 16% | Lower is better |
| Repayment Behavior (DPD) | 16% | Delinquency history |
| Bureau Score (300–850) | 16% | External anchor |
| Profitability (EBITDA margin, ROA) | 14% | Earnings quality |
| Interest Coverage | 14% | Debt serviceability |
| Solvency (Equity Ratio) | 10% | Capital buffer |
| Liquidity (Current Ratio) | 8% | Short-term buffer |
| Account Tenure | 6% | Relationship depth |

Analysts can interactively re-weight factors and instantly see how the portfolio score distribution shifts - enabling what-if analysis for model governance and validation.

### Probability of Default (PD) - TTC vs. PIT
- **Through-the-Cycle (TTC) PD:** Grade-anchored long-run average, S&P-calibrated (e.g. BBB = 0.35%, B = 4.5%)
- **Point-in-Time (PIT) PD:** Borrower-specific logistic PD tilted by a macro index (−1 expansion → +1 recession) using an exponential tilt factor - so a recession doubles PDs, expansion halves them
- **PIT/TTC Ratio** as an early-warning signal: divergence flags borrowers whose current risk has deviated significantly from their grade anchor
- **S&P-style 10-grade Rating Migration Matrix** (AAA → D) with Markov chain multi-year projection and stress scenario overlays

### Loss Given Default (LGD)
Collateral-adjusted recovery model following Basel LGD logic:
- Recovery = collateral coverage × seniority haircut (Senior Secured: 85%, Senior Unsecured: 55%, Subordinated: 30%)
- Seniority floors ensure minimum LGD (Senior Secured: 20%, Senior Unsecured: 40%, Subordinated: 65%)
- LGD breakdown by seniority tier and sector with interactive bar charts

### Exposure at Default (EAD)
- Term loans and bonds: EAD = committed exposure
- Revolving facilities: EAD = drawn + Credit Conversion Factor (50%) × undrawn portion - consistent with Basel CCF methodology

### Expected Loss & Monte Carlo Simulation
**Analytic EL:** EL = PD × LGD × EAD computed per borrower and aggregated across the portfolio.

**Monte Carlo Engine (up to 10,000 trials):**
- One-factor Gaussian copula model with configurable asset correlation (ρ) - the same structure underlying the Basel IRB capital formula
- Stochastic LGD with configurable volatility
- Macro index shock to PIT PDs before simulation
- Outputs: VaR at 95%, 99%, 99.9% confidence levels; Expected Shortfall (ES) at 97.5% and 99%; full loss distribution histogram; worst tail contributors by name

This directly maps to **ICAAP capital estimation** requirements under Basel Pillar 2, where banks must demonstrate internal capital adequacy through their own scenario-based loss models.

### Concentration & Correlation Risk
- **HHI (Herfindahl-Hirschman Index):** Sector and single-name concentration measurement
- **Sector Default Correlation Matrix:** 10×10 cross-sector correlation coefficients calibrated from Basel asset-correlation literature (e.g., Real Estate ↔ Financials: 0.55; Technology ↔ Healthcare: 0.25)
- Diversification benefit calculation: how much the portfolio's systemic risk is reduced by cross-sector spread
- Visual heatmap of sector-pair correlations

### Risk Rating & Segmentation
- 10-grade internal rating ladder (AAA → D) mapped to S&P-style anchor PDs
- Portfolio treemap: EAD visualized by grade and borrower name
- Grade migration table: observed vs. anchor PD by grade with EAD share
- Investment / Speculative / Distressed band segmentation

### Explainable AI (SHAP-style Attribution)
- **Local explainability:** For any individual borrower, waterfall chart showing the signed contribution of each of the 8 score factors relative to a baseline - equivalent to SHAP values
- **Global explainability:** Portfolio-wide factor importance ranking - which drivers are most responsible for overall portfolio credit risk
- **Driver Impact Drill-down:** For any selected driver (e.g. "Leverage"), rank all borrowers by their contribution to that driver
- This directly addresses **SR 11-7 / model explainability** requirements that regulators impose on banks using internal scoring models

### Early Warning System
Algorithmic triggers flagging at-risk borrowers before formal default:
- Covenant breach signals (Debt/EBITDA > threshold, coverage < floor)
- Revolving utilization spike detection
- DPD trend deterioration (30-day and 90-day past due counts)
- PIT/TTC ratio divergence (macro-adjusted PD running far above grade anchor)
- Severity ranking: Critical / High / Medium with color-coded alerts

### Borrower Profiles
Full per-borrower drill-through: financial ratios, behavioral metrics, facility details (type, seniority, tenor, collateral), scoring breakdown, risk grade, EL contribution, and SHAP attribution - everything a relationship manager needs for credit committee presentation.

### AI Analyst (Claude-powered)
- Floating chat interface backed by Claude AI with full portfolio context injected (total exposure, EL, sector breakdown, grade band distribution, top-5 riskiest borrowers)
- Pre-built prompts: "Summarize the biggest risks", "Which sectors are over-concentrated?", "Recommend 3 actions to reduce expected loss"
- Natural language Q&A over live portfolio data - no SQL, no pivot tables

---

## Architecture

```
src/
├── lib/
│   ├── risk-models.ts          # Core quant: PD, LGD, EAD, EL, scoring, SHAP
│   ├── credit-analytics.ts     # TTC/PIT, migration matrix, Monte Carlo, early warnings
│   ├── assessment-data.ts      # Portfolio state management
│   └── ai.functions.ts         # Claude API server function
├── routes/
│   ├── index.tsx               # Executive Overview dashboard
│   ├── scoring.tsx             # Credit Scoring Engine
│   ├── pd.tsx                  # PD · TTC vs PIT · Migration Matrix
│   ├── lgd.tsx                 # Loss Given Default
│   ├── expected-loss.tsx       # EL · Monte Carlo Simulation
│   ├── concentration.tsx       # Concentration & Correlation Risk
│   ├── ratings.tsx             # Risk Rating & Segmentation
│   ├── explainability.tsx      # SHAP Attribution
│   ├── borrowers.tsx           # Borrower Directory
│   └── borrowers.$id.tsx       # Individual Borrower Profile
├── components/
│   ├── ai-analyst-bubble.tsx   # Floating AI chat with portfolio context
│   ├── app-sidebar.tsx         # Navigation
│   └── ...
└── integrations/
    └── supabase/               # Auth + persistent assessment storage
```

---

## Quantitative Models Reference

| Model | Implementation | Industry Standard |
|---|---|---|
| Internal Credit Score | Weighted logistic blend, 8 factors, 0–1000 | Moody's RiskCalc, S&P Credit Model |
| PD (TTC) | Grade-anchored anchor PDs | Basel IRB Foundation approach |
| PD (PIT) | Logistic + macro tilt factor | IFRS 9 lifetime PD |
| Rating Migration | S&P-approximated 10×10 Markov matrix, multi-year power | CreditMetrics |
| LGD | Collateral coverage × seniority haircut | Basel LGD estimates |
| EAD | CCF × undrawn for revolvers | Basel CCF methodology |
| Expected Loss | EL = PD × LGD × EAD | Basel II/III Pillar 1 |
| Monte Carlo VaR/ES | One-factor Gaussian copula, 10K trials | Basel Pillar 2 / ICAAP |
| Concentration (HHI) | Sector and name HHI | BCBS concentration guidelines |
| SHAP Attribution | Deterministic signed contribution per factor | Regulatory SR 11-7 model explainability |

---

## Getting Started

```bash
# Clone
git clone https://github.com/your-username/creditrisk-pro
cd creditrisk-pro

# Install
bun install   # or npm install

# Environment
cp .env.example .env
# Fill in: SUPABASE_URL, SUPABASE_ANON_KEY, ANTHROPIC_API_KEY

# Run migrations
supabase db push

# Start dev server
bun run dev
```

---

## Regulatory Context

CreditRisk Pro implements concepts directly relevant to:

- **Basel II/III/IV (BCBS)** - IRB PD/LGD/EAD/EL framework, capital adequacy
- **IFRS 9** - Point-in-Time PD for expected credit loss provisioning
- **RBI Master Directions (India)** - NBFC and bank credit risk management guidelines
- **SR 11-7 (Federal Reserve)** - Model risk management and explainability requirements
- **ICAAP / Pillar 2** - Internal capital adequacy using scenario-based loss models

---

## License

MIT - built for learning, portfolio demonstration, and as a foundation for production credit risk tooling.
