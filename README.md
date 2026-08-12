<div align="center">

# CreditRisk Pro

**Institutional Credit Risk Analytics Platform**

*A full-stack, browser-based credit risk workbench built to institutional standards — Basel III/IV-aligned quantitative models, AI-powered portfolio commentary, and an end-to-end analyst workflow from sign-in to Monte Carlo capital estimation.*

![React](https://img.shields.io/badge/React-19-149eca) ![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6) ![TanStack Start](https://img.shields.io/badge/TanStack-Start-ff4154) ![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%2B%20Auth-3ecf8e) ![Tailwind](https://img.shields.io/badge/Tailwind-v4-38bdf8) ![License](https://img.shields.io/badge/license-MIT-lightgrey)

</div>

---
<img width="1742" height="920" alt="image" src="https://github.com/user-attachments/assets/9e9bf04b-39c2-4ac2-8db0-8f08d4b3b217" /><img width="1919" height="922" alt="image" src="https://github.com/user-attachments/assets/43132508-ab3f-4d5b-8153-771be870aca7" /><img width="1919" height="909" alt="image" src="https://github.com/user-attachments/assets/686db24a-8fc3-4a1d-909a-34d163af33b0" /><img width="1917" height="923" alt="image" src="https://github.com/user-attachments/assets/2675e258-2fea-4f7e-90e2-494e5ff4d894" /><img width="1908" height="929" alt="image" src="https://github.com/user-attachments/assets/97d92ccf-d161-49a7-8d6f-09d1ce9b04d8" /><img width="1919" height="900" alt="image" src="https://github.com/user-attachments/assets/c61258e5-d7e3-45e3-a23d-b0d135446b32" />
<img width="1919" height="923" alt="image" src="https://github.com/user-attachments/assets/19285a89-8951-4018-a29a-7fe84fb399ab" /><img width="1565" height="907" alt="image" src="https://github.com/user-attachments/assets/e24292e5-e142-44ac-ac9b-15e3c750b62a" /><img width="1871" height="968" alt="image" src="https://github.com/user-attachments/assets/e4ca8620-3dcc-45fc-af41-2a44b79e5d0b" /><img width="1591" height="921" alt="image" src="https://github.com/user-attachments/assets/e5d3721e-090f-4a7b-8dee-e49f98213987" /><img width="1591" height="916" alt="image" src="https://github.com/user-attachments/assets/c0a3b1b5-1bfc-4608-aa23-08ce8e89ca2d" /><img width="1584" height="921" alt="image" src="https://github.com/user-attachments/assets/0e70dbd8-f8b4-4bba-81d7-8529171fe37e" /><img width="1525" height="914" alt="image" src="https://github.com/user-attachments/assets/0a4ea34d-af36-44d0-803a-e466d4c64077" />





## Table of Contents

- [The Problem This Solves](#the-problem-this-solves)
- [Who Needs This](#who-needs-this)
- [The Full Workflow — Sign-In to Insight](#the-full-workflow--sign-in-to-insight)
- [Features](#features)
- [Quantitative Models Reference](#quantitative-models-reference)
- [Architecture](#architecture)
- [Data Model](#data-model)
- [Getting Started](#getting-started)
- [Regulatory Context](#regulatory-context)
- [License](#license)

---

## The Problem This Solves

Every bank, NBFC, insurance company, and asset manager faces the same fundamental challenge: **how do you measure, monitor, and manage the risk that your borrowers won't repay?**

Most mid-sized institutions still rely on spreadsheet-based credit models with no real-time interactivity, siloed risk systems analysts can't interrogate or stress-test, black-box scoring with no explainability for regulators or credit committees, and manual, slow processes to compute VaR, EL, and concentration risk.

**CreditRisk Pro** replaces that with a unified, interactive risk workbench — from individual borrower scoring all the way to Monte Carlo-based capital estimation — usable by a credit analyst, risk manager, or CRO in real time.

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

## The Full Workflow — Sign-In to Insight

```
 1. SIGN IN                2. CREATE ASSESSMENT          3. ANALYZE                        4. ASK AI
 ─────────────            ──────────────────────        ─────────────────────            ──────────────
 Email + password    →    Seed a synthetic portfolio →   Score → PD/LGD/EAD → EL     →     Chat with the AI
 or Google OAuth          or upload your own CSV          → Monte Carlo → Concen-           Analyst — live
 (Supabase Auth)          with guided column mapping      tration → Ratings →               portfolio context,
                          (auto-detects headers)           Explainability → Early           pre-built prompts,
                                                            Warnings → Borrower Profiles      natural-language Q&A
```

<details>
<summary><strong>1. Sign in</strong> — email/password or Google, workspace-scoped</summary>

Authentication is handled by Supabase Auth, with Google OAuth also available. Once signed in, all data is workspace-scoped and protected by Postgres Row-Level Security — every assessment and borrower record you create is visible only to you.
</details>

<details>
<summary><strong>2. Create an assessment</strong> — seed data or bring your own CSV</summary>

From **Assessments → New Assessment**, choose to either generate a realistic synthetic portfolio (configurable borrower count) or upload your own CSV. The CSV importer parses headers, auto-maps columns to the required borrower fields, flags anything missing or unmapped, and lets you review before committing. Every assessment is versioned — past runs stay in your history and can be reopened at any time.
</details>

<details>
<summary><strong>3. Work the full analyst stack</strong> — scoring through explainability</summary>

Once an assessment is active, it loads into every module: the Executive Overview dashboard, Credit Scoring Engine, PD (TTC vs. PIT), LGD, EAD, Expected Loss & Monte Carlo simulation, Concentration & Correlation Risk, Risk Rating & Segmentation, Explainability (SHAP-style attribution), Early Warning System, and individual Borrower Profiles.
</details>

<details>
<summary><strong>4. Ask the AI Analyst</strong> — AI-powered, portfolio-aware chat</summary>

A floating chat bubble is available throughout the app, pre-loaded with live context from your active portfolio (total exposure, EL, sector breakdown, grade distribution, top-5 riskiest borrowers). Use the pre-built prompts or ask anything in natural language — no SQL, no pivot tables.
</details>

---

## Features

### Executive Risk Overview
CRO-level snapshot of the entire portfolio: Total Exposure (EAD), Expected Loss (12M), Average PD and LGD, grade distribution (Investment / Speculative / Distressed) with EAD and EL breakdowns, a sector concentration heatmap, top-10 riskiest borrowers, and a synthetic 12-month EL trend chart.

### Credit Scoring Engine (0–1000)
An 8-factor weighted internal scoring model, analogous to models used at large commercial banks:

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

Analysts can interactively re-weight factors and instantly see how the portfolio score distribution shifts — enabling what-if analysis for model governance and validation.

### Probability of Default (PD) — TTC vs. PIT
- **Through-the-Cycle (TTC) PD** — grade-anchored long-run average, S&P-calibrated (e.g. BBB = 0.35%, B = 4.5%)
- **Point-in-Time (PIT) PD** — borrower-specific logistic PD tilted by a macro index (−1 expansion → +1 recession) using an exponential tilt factor, so a recession doubles PDs and an expansion halves them
- **PIT/TTC Ratio** as an early-warning signal — divergence flags borrowers whose current risk has deviated significantly from their grade anchor
- **S&P-style 10-grade Rating Migration Matrix** (AAA → D) with Markov chain multi-year projection and stress scenario overlays

### Loss Given Default (LGD)
Collateral-adjusted recovery model following Basel LGD logic — recovery = collateral coverage × seniority haircut (Senior Secured: 85%, Senior Unsecured: 55%, Subordinated: 30%), with seniority floors ensuring minimum LGD. Breakdown by seniority tier and sector with interactive bar charts.

### Exposure at Default (EAD)
Term loans and bonds use committed exposure; revolving facilities use drawn + Credit Conversion Factor (50%) × undrawn portion, consistent with Basel CCF methodology.

### Expected Loss & Monte Carlo Simulation
**Analytic EL:** EL = PD × LGD × EAD, computed per borrower and aggregated across the portfolio.

**Monte Carlo Engine (up to 10,000 trials):**
- One-factor Gaussian copula model with configurable asset correlation (ρ) — the same structure underlying the Basel IRB capital formula
- Stochastic LGD with configurable volatility
- Macro index shock applied to PIT PDs before simulation
- Outputs: VaR at 95%/99%/99.9%, Expected Shortfall at 97.5%/99%, full loss distribution histogram, and worst tail contributors by name

This maps directly to **ICAAP capital estimation** under Basel Pillar 2, where banks must demonstrate internal capital adequacy through their own scenario-based loss models.

### Concentration & Correlation Risk
- **HHI (Herfindahl-Hirschman Index)** — sector and single-name concentration
- **Sector Default Correlation Matrix** — 10×10 cross-sector coefficients calibrated from Basel asset-correlation literature (e.g., Real Estate ↔ Financials: 0.55; Technology ↔ Healthcare: 0.25)
- Diversification benefit calculation and a visual heatmap of sector-pair correlations

### Risk Rating & Segmentation
10-grade internal rating ladder (AAA → D) mapped to S&P-style anchor PDs, a portfolio treemap by grade and borrower, grade migration table (observed vs. anchor PD, EAD share), and Investment/Speculative/Distressed band segmentation.

### Explainable AI (SHAP-style Attribution)
- **Local:** per-borrower waterfall chart showing the signed contribution of each of the 8 score factors relative to a baseline — equivalent to SHAP values
- **Global:** portfolio-wide factor importance ranking
- **Driver drill-down:** rank all borrowers by their contribution to any selected driver (e.g. "Leverage")

Directly addresses **SR 11-7 / model explainability** requirements regulators impose on banks using internal scoring models.

### Early Warning System
Algorithmic triggers flagging at-risk borrowers before formal default: covenant breach signals, revolving utilization spikes, DPD trend deterioration (30/90-day past due), and PIT/TTC ratio divergence — with Critical/High/Medium severity ranking and color-coded alerts.

### Borrower Profiles
Full per-borrower drill-through — financial ratios, behavioral metrics, facility details (type, seniority, tenor, collateral), scoring breakdown, risk grade, EL contribution, and SHAP attribution — everything needed for a credit committee presentation.

### AI Analyst (YOUR API KEY-powered)
Floating chat interface with full portfolio context injected — total exposure, EL, sector breakdown, grade distribution, top-5 riskiest borrowers. Pre-built prompts like *"Summarize the biggest risks"* or *"Recommend 3 actions to reduce expected loss"*, plus open natural-language Q&A over live portfolio data.

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

## Architecture

```
src/
├── lib/
│   ├── risk-models.ts          # Core quant: PD, LGD, EAD, EL, scoring, SHAP
│   ├── credit-analytics.ts     # TTC/PIT, migration matrix, Monte Carlo, early warnings
│   ├── assessment-data.ts      # CSV parsing, column auto-mapping, seed data generation
│   ├── portfolio-context.tsx   # Active-assessment state shared across all modules
│   └── ai.functions.ts         # Claude API server function
├── routes/
│   ├── auth.tsx                 # Sign in / sign up (email + Google OAuth)
│   ├── assessments.tsx          # Assessment history — reopen or delete past runs
│   ├── assessments.new.tsx      # Create assessment — seed portfolio or CSV upload
│   ├── index.tsx                 # Executive Overview dashboard
│   ├── scoring.tsx               # Credit Scoring Engine
│   ├── pd.tsx                    # PD · TTC vs PIT · Migration Matrix
│   ├── lgd.tsx                   # Loss Given Default
│   ├── expected-loss.tsx         # EL · Monte Carlo Simulation
│   ├── concentration.tsx         # Concentration & Correlation Risk
│   ├── ratings.tsx               # Risk Rating & Segmentation
│   ├── explainability.tsx        # SHAP Attribution
│   ├── borrowers.tsx             # Borrower Directory
│   └── borrowers.$id.tsx         # Individual Borrower Profile
├── components/
│   ├── ai-analyst-bubble.tsx    # Floating AI chat with portfolio context
│   ├── app-sidebar.tsx           # Navigation
│   ├── topbar.tsx / panel.tsx / metric-card.tsx / rating-badge.tsx
│   └── ui/                       # shadcn/ui primitives
└── integrations/
    ├── supabase/                 # Auth client, middleware, generated DB types
    └── lovable/                  # OAuth helper
```

## Data Model

Supabase-backed with Row-Level Security throughout — every table is scoped so users only see their own data.

- **`assessments`** — one row per risk run (name, description, created_at); the container for a portfolio snapshot
- **`borrower_records`** — individual borrowers linked to an assessment, holding financials, facility details, and scoring inputs

## Getting Started

```bash
# Clone
git clone https://github.com/analystibpateladesh/CreditRisk.git
cd CreditRisk

# Install
npm install    # or bun install

# Environment
cp .env.example .env
# Fill in: SUPABASE_URL, SUPABASE_ANON_KEY, ANTHROPIC_API_KEY

# Run migrations
supabase db push

# Start dev server
npm run dev
```

```bash
npm run build       # production build
npm run preview     # preview the build
npm run lint         # eslint
npm run format       # prettier
```

## Regulatory Context

CreditRisk Pro implements concepts directly relevant to:

- **Basel II/III/IV (BCBS)** — IRB PD/LGD/EAD/EL framework, capital adequacy
- **IFRS 9** — Point-in-Time PD for expected credit loss provisioning
- **RBI Master Directions (India)** — NBFC and bank credit risk management guidelines
- **SR 11-7 (Federal Reserve)** — model risk management and explainability requirements
- **ICAAP / Pillar 2** — internal capital adequacy using scenario-based loss models

## License

MIT — built for learning, portfolio demonstration, and as a foundation for production credit risk tooling.
