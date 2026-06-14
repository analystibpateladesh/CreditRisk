import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Topbar } from "@/components/topbar";
import { Panel } from "@/components/panel";
import { MetricCard } from "@/components/metric-card";
import { EmptyAssessment } from "@/components/empty-assessment";
import { useActivePortfolio } from "@/lib/portfolio-context";
import { scoreComponents, fmtNum, gradeFromScore } from "@/lib/risk-models";
import { RatingBadge } from "@/components/rating-badge";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell,
} from "recharts";

export const Route = createFileRoute("/scoring")({
  head: () => ({ meta: [{ title: "Credit Scoring Engine — CreditRisk Pro" }] }),
  component: ScoringPage,
});

function ScoringPage() {
  const { portfolio, assessment, loading } = useActivePortfolio();
  const rows = useMemo(() => portfolio.map((b) => ({ b, ...scoreComponents(b) })), [portfolio]);
  const [w, setW] = useState({
    leverage: 16, coverage: 14, liquidity: 8, profitability: 14,
    solvency: 10, behavior: 16, bureau: 16, tenure: 6,
  });
  if (loading || !assessment || !portfolio.length) return <EmptyAssessment loading={loading} />;
  const avg = rows.reduce((s, r) => s + r.score, 0) / rows.length;
  const min = Math.min(...rows.map((r) => r.score));
  const max = Math.max(...rows.map((r) => r.score));
  const std = Math.sqrt(rows.reduce((s, r) => s + (r.score - avg) ** 2, 0) / rows.length);

  // histogram
  const buckets = Array.from({ length: 10 }, (_, i) => ({ bin: `${i * 100}-${i * 100 + 99}`, count: 0, mid: i * 100 + 50 }));
  rows.forEach((r) => { const i = Math.min(9, Math.floor(r.score / 100)); buckets[i].count++; });

  const total = Object.values(w).reduce((a, b) => a + b, 0);

  // Recompute scores with adjusted weights for preview
  const adjusted = rows.map(({ b, parts, score }) => {
    const blended =
      parts.leverage * (w.leverage / 100) +
      parts.coverage * (w.coverage / 100) +
      parts.liquidity * (w.liquidity / 100) +
      parts.profitability * (w.profitability / 100) +
      parts.solvency * (w.solvency / 100) +
      parts.behavior * (w.behavior / 100) +
      parts.bureau * (w.bureau / 100) +
      parts.tenure * (w.tenure / 100);
    const newScore = Math.round((blended / (total / 100)) * 10);
    return { b, oldScore: score, newScore, delta: newScore - score };
  }).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  return (
    <>
      <Topbar title="Credit Scoring Engine" subtitle="Internal score · 0–1000 · 8-factor weighted model" />
      <div className="p-5 space-y-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard label="Portfolio Mean" value={fmtNum(avg, 0)} sub={`Grade ${gradeFromScore(avg)}`} />
          <MetricCard label="Std. Deviation" value={fmtNum(std, 1)} sub="Score dispersion" />
          <MetricCard label="Min Score" value={min} sub={`Grade ${gradeFromScore(min)}`} tone="danger" />
          <MetricCard label="Max Score" value={max} sub={`Grade ${gradeFromScore(max)}`} tone="positive" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <Panel className="xl:col-span-2" title="Score Distribution" subtitle="Histogram of internal credit scores">
            <div className="h-80">
              <ResponsiveContainer>
                <BarChart data={buckets}>
                  <CartesianGrid stroke="var(--color-grid)" vertical={false} />
                  <XAxis dataKey="bin" stroke="var(--color-muted-foreground)" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--color-muted-foreground)" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 6, fontSize: 12 }} />
                  <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                    {buckets.map((b, i) => <Cell key={i} fill={b.mid >= 700 ? "var(--color-success)" : b.mid >= 500 ? "var(--color-warning)" : "var(--color-danger)"} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel title="Model Weights" subtitle="Adjust to see real-time impact">
            <div className="space-y-3 text-xs">
              {(Object.keys(w) as (keyof typeof w)[]).map((k) => (
                <div key={k}>
                  <div className="flex justify-between mb-1"><span className="capitalize text-muted-foreground">{k}</span><span className="num">{w[k]}%</span></div>
                  <input type="range" min={0} max={40} value={w[k]} onChange={(e) => setW({ ...w, [k]: +e.target.value })} className="w-full accent-primary" />
                </div>
              ))}
              <div className="flex justify-between pt-2 border-t border-border text-[11px]">
                <span className="text-muted-foreground">Total weight</span>
                <span className={`num font-semibold ${total === 100 ? "text-success" : "text-warning"}`}>{total}%</span>
              </div>
            </div>
          </Panel>
        </div>

        <Panel title="Largest Re-Score Impact" subtitle="Borrowers most affected by current weight configuration">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase tracking-widest text-muted-foreground">
                <tr className="text-left">
                  <th className="py-2 pr-3">Borrower</th>
                  <th className="pr-3 text-right">Original</th>
                  <th className="pr-3 text-right">Adjusted</th>
                  <th className="pr-3 text-right">Δ Score</th>
                  <th className="pr-3">Original Grade</th>
                  <th>New Grade</th>
                </tr>
              </thead>
              <tbody>
                {adjusted.slice(0, 12).map((r) => (
                  <tr key={r.b.id} className="border-t border-border">
                    <td className="py-2 pr-3 font-medium">{r.b.legalName}<div className="text-[10px] text-muted-foreground font-mono">{r.b.id}</div></td>
                    <td className="pr-3 text-right num">{r.oldScore}</td>
                    <td className="pr-3 text-right num">{r.newScore}</td>
                    <td className={`pr-3 text-right num font-semibold ${r.delta > 0 ? "text-success" : r.delta < 0 ? "text-danger" : "text-muted-foreground"}`}>{r.delta > 0 ? "+" : ""}{r.delta}</td>
                    <td className="pr-3"><RatingBadge grade={gradeFromScore(r.oldScore)} /></td>
                    <td><RatingBadge grade={gradeFromScore(r.newScore)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </>
  );
}
