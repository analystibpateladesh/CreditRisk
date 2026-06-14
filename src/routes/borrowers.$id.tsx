import { createFileRoute, Link } from "@tanstack/react-router";
import { Topbar } from "@/components/topbar";
import { Panel } from "@/components/panel";
import { MetricCard } from "@/components/metric-card";
import { RatingBadge } from "@/components/rating-badge";
import { EmptyAssessment } from "@/components/empty-assessment";
import { useActivePortfolio } from "@/lib/portfolio-context";
import {
  expectedLoss, exposureAtDefault, explainScore, fmtNum, fmtPct, fmtUSD,
  lossGivenDefault, ratios, scoreComponents,
} from "@/lib/risk-models";
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Cell, Tooltip, CartesianGrid,
} from "recharts";
import { ChevronLeft } from "lucide-react";

export const Route = createFileRoute("/borrowers/$id")({
  head: () => ({ meta: [{ title: `Borrower — Profile` }] }),
  component: BorrowerProfile,
});

function BorrowerProfile() {
  const { id } = Route.useParams();
  const { portfolio, assessment, loading } = useActivePortfolio();
  if (loading || !assessment) return <EmptyAssessment loading={loading} />;
  const b = portfolio.find((x) => x.id === id);
  if (!b) return (
    <>
      <Topbar title="Borrower not found" right={<Link to="/borrowers" className="text-xs hover:text-foreground flex items-center gap-1"><ChevronLeft className="h-3 w-3" /> Back</Link>} />
      <div className="p-10 text-sm text-muted-foreground">This borrower is not in the active assessment.</div>
    </>
  );
  const r = ratios(b.financials);
  const sc = scoreComponents(b);
  const el = expectedLoss(b);
  const lgd = lossGivenDefault(b);
  const ead = exposureAtDefault(b);
  const shap = explainScore(b);

  const radarData = Object.entries(sc.parts).map(([k, v]) => ({ k: k[0].toUpperCase() + k.slice(1), v: Math.round(v) }));

  return (
    <>
      <Topbar
        title={b.legalName}
        subtitle={`${b.id}${b.ticker ? " · " + b.ticker : ""} · ${b.sector} · ${b.country}`}
        right={<Link to="/borrowers" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"><ChevronLeft className="h-3 w-3" /> Back</Link>}
      />
      <div className="p-5 space-y-5">
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3">
          <MetricCard label="Internal Score" value={<span>{sc.score}<span className="text-sm text-muted-foreground">/1000</span></span>} sub={<span className="inline-flex items-center gap-2">Grade <RatingBadge grade={el.grade} /></span>} tone="positive" />
          <MetricCard label="Probability of Default" value={fmtPct(el.pd, 2)} sub="1-year horizon" tone="warning" />
          <MetricCard label="Loss Given Default" value={fmtPct(el.lgd, 1)} sub={`${b.seniority}`} />
          <MetricCard label="Exposure at Default" value={fmtUSD(ead)} sub={`${b.facilityType} · ${b.tenorMonths}m`} />
          <MetricCard label="Expected Loss" value={fmtUSD(el.el)} sub="PD × LGD × EAD" tone="danger" />
          <MetricCard label="Collateral Coverage" value={fmtPct(lgd.coverage, 0)} sub={`Haircut ${fmtPct(lgd.haircut, 0)}`} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <Panel title="Financial Snapshot" subtitle="Latest fiscal period" className="xl:col-span-1">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              {([
                ["Revenue", fmtUSD(b.financials.annualRevenue)],
                ["EBITDA", fmtUSD(b.financials.ebitda)],
                ["Net Income", fmtUSD(b.financials.netIncome)],
                ["Total Assets", fmtUSD(b.financials.totalAssets)],
                ["Total Debt", fmtUSD(b.financials.totalDebt)],
                ["Equity", fmtUSD(b.financials.totalEquity)],
                ["Cash", fmtUSD(b.financials.cashAndEquivalents)],
                ["Interest Exp.", fmtUSD(b.financials.interestExpense)],
              ] as const).map(([k, v]) => (
                <div key={k} className="flex justify-between border-b border-border/60 pb-1.5">
                  <dt className="text-muted-foreground">{k}</dt><dd className="num font-medium">{v}</dd>
                </div>
              ))}
            </dl>
          </Panel>

          <Panel title="Key Ratios" subtitle="Credit fundamentals" className="xl:col-span-1">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              {([
                ["Debt / EBITDA", `${fmtNum(r.debtToEbitda)}x`, r.debtToEbitda < 3 ? "ok" : r.debtToEbitda < 5 ? "warn" : "bad"],
                ["Interest Coverage", `${fmtNum(r.interestCoverage)}x`, r.interestCoverage > 4 ? "ok" : r.interestCoverage > 2 ? "warn" : "bad"],
                ["Current Ratio", `${fmtNum(r.currentRatio)}x`, r.currentRatio > 1.5 ? "ok" : r.currentRatio > 1 ? "warn" : "bad"],
                ["Debt / Assets", fmtPct(r.debtToAssets, 1), r.debtToAssets < 0.4 ? "ok" : r.debtToAssets < 0.65 ? "warn" : "bad"],
                ["Equity Ratio", fmtPct(r.equityRatio, 1), r.equityRatio > 0.4 ? "ok" : r.equityRatio > 0.2 ? "warn" : "bad"],
                ["EBITDA Margin", fmtPct(r.ebitdaMargin, 1), r.ebitdaMargin > 0.15 ? "ok" : r.ebitdaMargin > 0.05 ? "warn" : "bad"],
                ["ROA", fmtPct(r.roa, 1), r.roa > 0.05 ? "ok" : r.roa > 0 ? "warn" : "bad"],
                ["ROE", fmtPct(r.roe, 1), r.roe > 0.1 ? "ok" : r.roe > 0 ? "warn" : "bad"],
              ] as const).map(([k, v, t]) => (
                <div key={k} className="flex justify-between items-center border-b border-border/60 pb-1.5">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className={`num font-medium ${t === "ok" ? "text-success" : t === "warn" ? "text-warning" : "text-danger"}`}>{v}</dd>
                </div>
              ))}
            </dl>
          </Panel>

          <Panel title="Score Composition" subtitle="Weighted sub-scores (0–100)" className="xl:col-span-1">
            <div className="h-72">
              <ResponsiveContainer>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="var(--color-grid)" />
                  <PolarAngleAxis dataKey="k" tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={{ fill: "var(--color-muted-foreground)", fontSize: 9 }} />
                  <Radar name="Borrower" dataKey="v" stroke="var(--color-primary)" fill="var(--color-primary)" fillOpacity={0.35} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>

        <Panel title="Explainable AI — SHAP-style Attribution" subtitle="Top drivers of this borrower's score vs portfolio baseline">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-72">
              <ResponsiveContainer>
                <BarChart layout="vertical" data={shap} margin={{ top: 5, right: 20, left: 100, bottom: 5 }}>
                  <CartesianGrid stroke="var(--color-grid)" horizontal={false} />
                  <XAxis type="number" stroke="var(--color-muted-foreground)" fontSize={10} tickFormatter={(v) => v.toFixed(1)} />
                  <YAxis type="category" dataKey="name" stroke="var(--color-muted-foreground)" fontSize={11} width={140} />
                  <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 6, fontSize: 12 }} formatter={(v: number) => v.toFixed(2)} />
                  <Bar dataKey="contribution" radius={[0, 3, 3, 0]}>
                    {shap.map((f, i) => <Cell key={i} fill={f.contribution >= 0 ? "var(--color-success)" : "var(--color-danger)"} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="text-xs space-y-3">
              <p className="text-muted-foreground leading-relaxed">
                Green bars push the borrower's score above the 50-point baseline; red bars drag it below.
                Magnitudes reflect feature weight × signed deviation from baseline.
              </p>
              <table className="w-full">
                <thead className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  <tr><th className="text-left py-1">Feature</th><th className="text-right">Sub-score</th><th className="text-right">Contribution</th></tr>
                </thead>
                <tbody>
                  {shap.map((f) => (
                    <tr key={f.name} className="border-t border-border">
                      <td className="py-1.5">{f.name}</td>
                      <td className="text-right num">{f.value.toFixed(0)}</td>
                      <td className={`text-right num font-semibold ${f.contribution >= 0 ? "text-success" : "text-danger"}`}>{f.contribution >= 0 ? "+" : ""}{f.contribution.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Panel>
      </div>
    </>
  );
}
