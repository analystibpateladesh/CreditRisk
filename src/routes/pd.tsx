import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Topbar } from "@/components/topbar";
import { Panel } from "@/components/panel";
import { MetricCard } from "@/components/metric-card";
import { RatingBadge } from "@/components/rating-badge";
import { EmptyAssessment } from "@/components/empty-assessment";
import { useActivePortfolio } from "@/lib/portfolio-context";
import { pdByGrade, fmtPct, fmtUSD } from "@/lib/risk-models";
import {
  GRADES,
  pdTtcPit,
  baseTransitionMatrix,
  transitionPower,
  stressTransitionMatrix,
  earlyWarnings,
  ewSeverityRank,
} from "@/lib/credit-analytics";
import {
  ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, Tooltip, CartesianGrid, ZAxis,
  BarChart, Bar, Legend,
} from "recharts";
import { AlertTriangle, ShieldAlert, Info } from "lucide-react";

export const Route = createFileRoute("/pd")({
  head: () => ({ meta: [{ title: "PD · TTC vs PIT — CreditRisk Pro" }] }),
  component: PDPage,
});

function PDPage() {
  const { portfolio, assessment } = useActivePortfolio();
  const [view, setView] = useState<"pit" | "ttc">("pit");
  const [macro, setMacro] = useState(0); // -1 expansion ... +1 recession
  const [matrixYears, setMatrixYears] = useState(1);
  const [matrixStress, setMatrixStress] = useState(0); // 0..1

  const rows = useMemo(() => portfolio.map((b) => {
    const p = pdTtcPit(b, macro);
    const ead = b.facilityType === "Revolver"
      ? b.exposure + 0.5 * b.exposure * (1 - b.behavior.utilizationPct / 100)
      : b.exposure;
    return { b, ...p, ead, pd: view === "pit" ? p.pit : p.ttc };
  }), [portfolio, macro, view]);

  const matrix = useMemo(() => {
    const stressed = stressTransitionMatrix(baseTransitionMatrix, matrixStress);
    return transitionPower(stressed, matrixYears);
  }, [matrixYears, matrixStress]);

  if (!assessment) {
    return (
      <>
        <Topbar title="Probability of Default (PD)" subtitle="TTC vs PIT · Migration matrix · Early-warning triggers" />
        <EmptyAssessment />
      </>
    );
  }

  const avg = rows.length ? rows.reduce((s, r) => s + r.pd, 0) / rows.length : 0;
  const totalEad = rows.reduce((s, r) => s + r.ead, 0);
  const ewPd = totalEad ? rows.reduce((s, r) => s + r.pd * r.ead, 0) / totalEad : 0;
  const avgRatio = rows.length ? rows.reduce((s, r) => s + r.ratio, 0) / rows.length : 0;
  const above1 = rows.filter((r) => r.pd > 0.01).length;

  // EW triggers per borrower
  const ewRows = rows.map((r) => {
    const triggers = earlyWarnings(r.b, macro);
    const maxSev = triggers.reduce((m, t) => Math.max(m, ewSeverityRank(t.severity)), 0);
    return { ...r, triggers, maxSev };
  });
  const critCount = ewRows.filter((r) => r.maxSev === 3).length;
  const warnCount = ewRows.filter((r) => r.maxSev === 2).length;

  const byGrade = GRADES.map((g) => {
    const xs = rows.filter((r) => r.grade === g);
    const obs = xs.length ? (xs.reduce((s, r) => s + r.pd, 0) / xs.length) * 100 : 0;
    return {
      grade: g,
      ttc: pdByGrade[g] * 100,
      pit: xs.length ? (xs.reduce((s, r) => s + r.pit, 0) / xs.length) * 100 : 0,
      observed: obs,
      n: xs.length,
    };
  });

  return (
    <>
      <Topbar title="Probability of Default (PD)" subtitle="TTC vs PIT · Migration matrix · Early-warning triggers" />
      <div className="p-5 space-y-5">
        <Panel dense>
          <div className="p-3 flex flex-wrap items-center gap-4">
            <div className="inline-flex rounded border border-border overflow-hidden text-xs">
              <button onClick={() => setView("pit")} className={`px-3 h-8 ${view === "pit" ? "bg-primary text-primary-foreground" : "hover:bg-accent/40"}`}>PIT (point-in-time)</button>
              <button onClick={() => setView("ttc")} className={`px-3 h-8 border-l border-border ${view === "ttc" ? "bg-primary text-primary-foreground" : "hover:bg-accent/40"}`}>TTC (through-the-cycle)</button>
            </div>
            <div className="flex-1 min-w-[220px] max-w-md">
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-muted-foreground">Macro tilt (–1 expansion … +1 recession)</span>
                <span className="num font-semibold">{macro >= 0 ? "+" : ""}{macro.toFixed(2)}</span>
              </div>
              <input type="range" min={-1} max={1} step={0.05} value={macro} onChange={(e) => setMacro(+e.target.value)} className="w-full accent-primary" />
            </div>
            <div className="text-[11px] text-muted-foreground ml-auto">Avg PIT/TTC ratio: <span className="num font-semibold text-foreground">{avgRatio.toFixed(2)}×</span></div>
          </div>
        </Panel>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard label={`Avg ${view.toUpperCase()} PD`} value={fmtPct(avg, 2)} sub="Equal-weighted" />
          <MetricCard label={`EAD-Weighted ${view.toUpperCase()} PD`} value={fmtPct(ewPd, 2)} sub="EAD-weighted" tone="warning" />
          <MetricCard label="EW Critical" value={critCount} sub={`${warnCount} warning · ${ewRows.length} total`} tone={critCount > 0 ? "danger" : "warning"} />
          <MetricCard label="Borrowers > 1% PD" value={above1} sub={`${rows.length ? fmtPct(above1 / rows.length, 0) : "0%"} of book`} tone="warning" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <Panel title="Calibration: TTC vs PIT vs Observed" subtitle="Per grade, in %">
            <div className="h-80">
              <ResponsiveContainer>
                <BarChart data={byGrade}>
                  <CartesianGrid stroke="var(--color-grid)" vertical={false} />
                  <XAxis dataKey="grade" stroke="var(--color-muted-foreground)" fontSize={11} />
                  <YAxis stroke="var(--color-muted-foreground)" fontSize={11} tickFormatter={(v) => `${v.toFixed(1)}%`} />
                  <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 6, fontSize: 12 }} formatter={(v: number) => `${v.toFixed(3)}%`} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="ttc" name="TTC anchor" fill="var(--color-info)" />
                  <Bar dataKey="pit" name="PIT model" fill="var(--color-primary)" />
                  <Bar dataKey="observed" name="Observed" fill="var(--color-warning)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel title={`Score vs ${view.toUpperCase()} PD (logit)`} subtitle="Each dot a borrower · size = EAD">
            <div className="h-80">
              <ResponsiveContainer>
                <ScatterChart>
                  <CartesianGrid stroke="var(--color-grid)" />
                  <XAxis dataKey="score" name="Score" stroke="var(--color-muted-foreground)" fontSize={11} domain={[300, 1000]} />
                  <YAxis dataKey="pd" name="PD" stroke="var(--color-muted-foreground)" fontSize={11} tickFormatter={(v) => `${(v * 100).toFixed(1)}%`} />
                  <ZAxis dataKey="ead" range={[40, 350]} />
                  <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 6, fontSize: 12 }} formatter={(v: number, n) => n === "pd" ? `${(v * 100).toFixed(2)}%` : n === "ead" ? fmtUSD(v) : v} />
                  <Scatter data={rows} fill="var(--color-primary)" fillOpacity={0.7} />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>

        <Panel title="Rating Migration Matrix" subtitle="Markov 1Y transition matrix · powered to horizon · with macro stress">
          <div className="p-3 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex justify-between text-xs mb-1"><span className="text-muted-foreground">Horizon (years)</span><span className="num font-semibold">{matrixYears}Y</span></div>
                <input type="range" min={1} max={10} value={matrixYears} onChange={(e) => setMatrixYears(+e.target.value)} className="w-full accent-primary" />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1"><span className="text-muted-foreground">Stress (0 base … 1 severe recession)</span><span className="num font-semibold">{matrixStress.toFixed(2)}</span></div>
                <input type="range" min={0} max={1} step={0.05} value={matrixStress} onChange={(e) => setMatrixStress(+e.target.value)} className="w-full accent-primary" />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="text-[11px] border-separate border-spacing-0 font-mono">
                <thead>
                  <tr>
                    <th className="px-2 py-1 text-left text-muted-foreground">From \ To</th>
                    {GRADES.map((g) => (
                      <th key={g} className="px-2 py-1 text-center text-muted-foreground"><RatingBadge grade={g} /></th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matrix.map((row, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="px-2 py-1"><RatingBadge grade={GRADES[i]} /></td>
                      {row.map((p, j) => {
                        const pct = p * 100;
                        const intensity = Math.min(1, Math.max(0, p * (j === i ? 1.5 : 6)));
                        const isDefault = j === GRADES.length - 1;
                        const color = isDefault
                          ? `color-mix(in oklab, var(--color-danger) ${(intensity * 100).toFixed(0)}%, transparent)`
                          : j === i
                          ? `color-mix(in oklab, var(--color-primary) ${(intensity * 60).toFixed(0)}%, transparent)`
                          : `color-mix(in oklab, var(--color-muted) ${(intensity * 80).toFixed(0)}%, transparent)`;
                        return (
                          <td key={j} className="px-2 py-1 text-right num" style={{ background: color }}>
                            {pct < 0.05 ? "·" : pct.toFixed(pct < 1 ? 2 : 1)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Default-column probabilities are the cumulative {matrixYears}Y PD per starting grade.
              Stress factor amplifies downgrade and default probabilities and reduces upgrades/diagonal mass.
            </p>
          </div>
        </Panel>

        <Panel title="Early-Warning Triggers" subtitle="Rule-based flags on credit deterioration · sorted by severity">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase tracking-widest text-muted-foreground">
                <tr className="text-left">
                  <th className="py-2 pr-3">Borrower</th><th className="pr-3">Grade</th>
                  <th className="pr-3 text-right">TTC PD</th><th className="pr-3 text-right">PIT PD</th>
                  <th className="pr-3 text-right">PIT/TTC</th>
                  <th className="pr-3">Triggers</th>
                </tr>
              </thead>
              <tbody>
                {[...ewRows].sort((a, b) => (b.maxSev - a.maxSev) || (b.pit - a.pit)).slice(0, 20).map((r) => (
                  <tr key={r.b.id} className="border-t border-border hover:bg-accent/30 align-top">
                    <td className="py-2 pr-3">
                      <Link to="/borrowers/$id" params={{ id: r.b.id }} className="font-medium hover:text-primary">{r.b.legalName}</Link>
                      <div className="text-[10px] text-muted-foreground">{r.b.sector}</div>
                    </td>
                    <td className="pr-3"><RatingBadge grade={r.grade} /></td>
                    <td className="pr-3 text-right num">{fmtPct(r.ttc, 2)}</td>
                    <td className="pr-3 text-right num text-warning font-semibold">{fmtPct(r.pit, 2)}</td>
                    <td className="pr-3 text-right num">{r.ratio.toFixed(2)}×</td>
                    <td className="pr-3 py-2">
                      {r.triggers.length === 0 ? (
                        <span className="text-[11px] text-muted-foreground">— none —</span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {r.triggers.map((t) => {
                            const Icon = t.severity === "critical" ? ShieldAlert : t.severity === "warn" ? AlertTriangle : Info;
                            const cls = t.severity === "critical"
                              ? "bg-danger/15 border-danger/40 text-danger"
                              : t.severity === "warn"
                              ? "bg-warning/15 border-warning/40 text-warning"
                              : "bg-info/15 border-info/40 text-info";
                            return (
                              <span key={t.code} title={t.detail} className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border ${cls}`}>
                                <Icon className="h-3 w-3" /> {t.label}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </td>
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
