import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Topbar } from "@/components/topbar";
import { Panel } from "@/components/panel";
import { MetricCard } from "@/components/metric-card";
import { RatingBadge } from "@/components/rating-badge";
import { EmptyAssessment } from "@/components/empty-assessment";
import { useActivePortfolio } from "@/lib/portfolio-context";
import { expectedLoss, fmtPct, fmtUSD } from "@/lib/risk-models";
import { runMonteCarlo } from "@/lib/credit-analytics";
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid, Cell, BarChart, ReferenceLine,
} from "recharts";
import { Play, Loader2 } from "lucide-react";

export const Route = createFileRoute("/expected-loss")({
  head: () => ({ meta: [{ title: "Expected Loss · Monte Carlo — CreditRisk Pro" }] }),
  component: ELPage,
});

function ELPage() {
  const { portfolio, assessment } = useActivePortfolio();
  const rows = useMemo(() => portfolio.map((b) => ({ b, ...expectedLoss(b) })), [portfolio]);
  const totalEL = rows.reduce((s, r) => s + r.el, 0);
  const totalEAD = rows.reduce((s, r) => s + r.ead, 0);
  const ratio = totalEAD ? totalEL / totalEAD : 0;

  const [pdShock, setPdShock] = useState(0);
  const [lgdShock, setLgdShock] = useState(0);

  // Monte Carlo controls
  const [trials, setTrials] = useState(5000);
  const [rho, setRho] = useState(0.18);
  const [macro, setMacro] = useState(0);
  const [lgdVol, setLgdVol] = useState(0.25);
  const [seed, setSeed] = useState(42);
  const [running, setRunning] = useState(false);
  const [mc, setMc] = useState<ReturnType<typeof runMonteCarlo> | null>(null);

  const run = () => {
    if (!portfolio.length) return;
    setRunning(true);
    // run on next tick so spinner shows
    setTimeout(() => {
      const res = runMonteCarlo(portfolio, { trials, correlation: rho, macroIndex: macro, lgdVol, seed });
      setMc(res);
      setRunning(false);
    }, 30);
  };

  if (!assessment) {
    return (
      <>
        <Topbar title="Expected Loss Engine" subtitle="Analytic EL · Monte Carlo VaR & Expected Shortfall" />
        <EmptyAssessment />
      </>
    );
  }

  const stressed = rows.map((r) => {
    const pd = Math.min(1, r.pd * (1 + pdShock / 100));
    const lgd = Math.min(0.99, r.lgd * (1 + lgdShock / 100));
    return { ...r, sEl: pd * lgd * r.ead };
  });
  const stressedTotal = stressed.reduce((s, r) => s + r.sEl, 0);

  const bySector = Array.from(new Set(portfolio.map((b) => b.sector))).map((sec) => {
    const xs = rows.filter((r) => r.b.sector === sec);
    const elSum = xs.reduce((s, r) => s + r.el, 0);
    const eadSum = xs.reduce((s, r) => s + r.ead, 0);
    return { sector: sec, el: elSum / 1e6, ead: eadSum / 1e6, ratio: eadSum ? (elSum / eadSum) * 100 : 0 };
  }).sort((a, b) => b.el - a.el);

  return (
    <>
      <Topbar title="Expected Loss Engine" subtitle="Analytic EL · Monte Carlo VaR & Expected Shortfall" />
      <div className="p-5 space-y-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard label="Portfolio EL (analytic)" value={fmtUSD(totalEL)} sub={`${fmtPct(ratio, 2)} of EAD`} tone="warning" />
          <MetricCard label="Total EAD" value={fmtUSD(totalEAD)} sub={`${rows.length} borrowers`} />
          <MetricCard label="Stressed EL" value={fmtUSD(stressedTotal)} sub={`Δ ${totalEL ? fmtPct((stressedTotal - totalEL) / totalEL, 1) : "—"}`} tone={stressedTotal > totalEL * 1.5 ? "danger" : "warning"} />
          <MetricCard label={mc ? "MC 99% VaR" : "Mean EL / Borrower"} value={mc ? fmtUSD(mc.var99) : fmtUSD(totalEL / Math.max(1, rows.length))} sub={mc ? `ES 99% ${fmtUSD(mc.es99)}` : "Equal-weighted"} tone={mc ? "danger" : undefined} />
        </div>

        <Panel title="Monte Carlo — Portfolio Loss Distribution" subtitle="One-factor Gaussian copula · PIT PD · correlated defaults">
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <div className="flex justify-between text-[11px] mb-1"><span className="text-muted-foreground">Trials</span><span className="num font-semibold">{trials.toLocaleString()}</span></div>
                <input type="range" min={500} max={20000} step={500} value={trials} onChange={(e) => setTrials(+e.target.value)} className="w-full accent-primary" />
              </div>
              <div>
                <div className="flex justify-between text-[11px] mb-1"><span className="text-muted-foreground">Asset corr ρ</span><span className="num font-semibold">{rho.toFixed(2)}</span></div>
                <input type="range" min={0} max={0.5} step={0.01} value={rho} onChange={(e) => setRho(+e.target.value)} className="w-full accent-primary" />
              </div>
              <div>
                <div className="flex justify-between text-[11px] mb-1"><span className="text-muted-foreground">Macro tilt</span><span className="num font-semibold">{macro >= 0 ? "+" : ""}{macro.toFixed(2)}</span></div>
                <input type="range" min={-1} max={1} step={0.05} value={macro} onChange={(e) => setMacro(+e.target.value)} className="w-full accent-primary" />
              </div>
              <div>
                <div className="flex justify-between text-[11px] mb-1"><span className="text-muted-foreground">LGD vol</span><span className="num font-semibold">{lgdVol.toFixed(2)}</span></div>
                <input type="range" min={0} max={1} step={0.05} value={lgdVol} onChange={(e) => setLgdVol(+e.target.value)} className="w-full accent-primary" />
              </div>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <div className="text-[11px] text-muted-foreground mb-1">Seed</div>
                  <input type="number" value={seed} onChange={(e) => setSeed(+e.target.value)} className="w-full h-8 px-2 text-xs rounded bg-input border border-border" />
                </div>
                <button onClick={run} disabled={running || !portfolio.length}
                  className="h-8 px-3 rounded bg-primary text-primary-foreground text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-50">
                  {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />} Run
                </button>
              </div>
            </div>

            {!mc ? (
              <div className="text-sm text-muted-foreground border border-dashed border-border rounded p-6 text-center">
                Configure parameters and click <span className="font-medium text-foreground">Run</span> to simulate
                the portfolio loss distribution and derive VaR / Expected Shortfall.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                  <MetricCard label="Mean loss" value={fmtUSD(mc.mean)} sub={`σ ${fmtUSD(mc.std)}`} />
                  <MetricCard label="EL (analytic)" value={fmtUSD(mc.el)} sub="Σ PD·LGD·EAD" />
                  <MetricCard label="VaR 95%" value={fmtUSD(mc.var95)} sub="1Y horizon" tone="warning" />
                  <MetricCard label="VaR 99%" value={fmtUSD(mc.var99)} sub="1Y horizon" tone="danger" />
                  <MetricCard label="VaR 99.9%" value={fmtUSD(mc.var999)} sub="Regulatory" tone="danger" />
                  <MetricCard label="ES 99%" value={fmtUSD(mc.es99)} sub="Tail mean" tone="danger" />
                </div>

                <div className="h-72">
                  <ResponsiveContainer>
                    <BarChart data={mc.histogram}>
                      <CartesianGrid stroke="var(--color-grid)" vertical={false} />
                      <XAxis dataKey="from" stroke="var(--color-muted-foreground)" fontSize={10}
                        tickFormatter={(v: number) => fmtUSD(v)} />
                      <YAxis stroke="var(--color-muted-foreground)" fontSize={10} />
                      <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 6, fontSize: 12 }}
                        labelFormatter={(v: number) => `Loss ≈ ${fmtUSD(v)}`}
                        formatter={(v: number) => [v, "Trials"]} />
                      <Bar dataKey="count" fill="var(--color-primary)" />
                      <ReferenceLine x={mc.var99} stroke="var(--color-danger)" strokeDasharray="3 3" label={{ value: "VaR 99%", fontSize: 10, fill: "var(--color-danger)" }} />
                      <ReferenceLine x={mc.es99} stroke="var(--color-warning)" strokeDasharray="3 3" label={{ value: "ES 99%", fontSize: 10, fill: "var(--color-warning)" }} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="text-xs text-muted-foreground leading-relaxed">
                    <div className="font-medium text-foreground mb-1">Method</div>
                    Each trial draws one systemic factor Z and per-borrower idiosyncratic shocks. A borrower
                    defaults when √ρ·Z + √(1−ρ)·ε &lt; Φ⁻¹(PIT PD). Loss = realised LGD × EAD. Sorting losses
                    yields VaR; averaging the right tail yields Expected Shortfall.
                  </div>
                  <Panel dense title="Top tail contributors">
                    <ul className="p-3 text-xs space-y-1">
                      {mc.worstContributors.map((c) => (
                        <li key={c.id} className="flex justify-between gap-3">
                          <Link to="/borrowers/$id" params={{ id: c.id }} className="truncate hover:text-primary">{c.name}</Link>
                          <span className="num text-muted-foreground">{fmtUSD(c.meanLossInTail)}</span>
                        </li>
                      ))}
                    </ul>
                  </Panel>
                </div>
              </>
            )}
          </div>
        </Panel>

        <Panel title="Stress Controls" subtitle="Apply uniform shocks to PD and LGD (analytic, no MC)">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-1">
            <div>
              <div className="flex justify-between text-xs mb-2"><span className="text-muted-foreground">PD shock</span><span className="num font-semibold">{pdShock >= 0 ? "+" : ""}{pdShock}%</span></div>
              <input type="range" min={-50} max={300} value={pdShock} onChange={(e) => setPdShock(+e.target.value)} className="w-full accent-primary" />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-2"><span className="text-muted-foreground">LGD shock</span><span className="num font-semibold">{lgdShock >= 0 ? "+" : ""}{lgdShock}%</span></div>
              <input type="range" min={-50} max={150} value={lgdShock} onChange={(e) => setLgdShock(+e.target.value)} className="w-full accent-primary" />
            </div>
          </div>
        </Panel>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <Panel title="EL by Sector" subtitle="USD millions">
            <div className="h-72">
              <ResponsiveContainer>
                <ComposedChart data={bySector}>
                  <CartesianGrid stroke="var(--color-grid)" vertical={false} />
                  <XAxis dataKey="sector" stroke="var(--color-muted-foreground)" fontSize={10} angle={-25} textAnchor="end" height={60} />
                  <YAxis yAxisId="l" stroke="var(--color-muted-foreground)" fontSize={10} tickFormatter={(v) => `$${v.toFixed(1)}M`} />
                  <YAxis yAxisId="r" orientation="right" stroke="var(--color-muted-foreground)" fontSize={10} tickFormatter={(v) => `${v.toFixed(1)}%`} />
                  <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 6, fontSize: 12 }} />
                  <Bar yAxisId="l" dataKey="el" name="EL ($M)" fill="var(--color-primary)" radius={[3, 3, 0, 0]} />
                  <Line yAxisId="r" type="monotone" dataKey="ratio" name="EL/EAD (%)" stroke="var(--color-danger)" strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel title="Cumulative EL Contribution" subtitle="Pareto: borrowers ranked by EL share">
            <div className="h-72">
              <ResponsiveContainer>
                <BarChart data={(() => {
                  const sorted = [...rows].sort((a, b) => b.el - a.el).slice(0, 20);
                  let cum = 0;
                  return sorted.map((r, i) => { cum += r.el; return { i: i + 1, el: r.el / 1e6, cum: totalEL ? (cum / totalEL) * 100 : 0, name: r.b.legalName }; });
                })()}>
                  <CartesianGrid stroke="var(--color-grid)" vertical={false} />
                  <XAxis dataKey="i" stroke="var(--color-muted-foreground)" fontSize={10} />
                  <YAxis stroke="var(--color-muted-foreground)" fontSize={10} tickFormatter={(v) => `$${v.toFixed(1)}M`} />
                  <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 6, fontSize: 12 }} labelFormatter={(_, p) => p[0]?.payload?.name ?? ""} />
                  <Bar dataKey="el" radius={[3, 3, 0, 0]}>
                    {[...Array(20)].map((_, i) => <Cell key={i} fill="var(--color-primary)" fillOpacity={1 - i * 0.04} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>

        <Panel title="Top Expected Loss Contributors (Stressed)" subtitle="Sorted by stressed EL">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase tracking-widest text-muted-foreground">
                <tr className="text-left">
                  <th className="py-2 pr-3">Borrower</th><th className="pr-3">Grade</th>
                  <th className="pr-3 text-right">PD</th><th className="pr-3 text-right">LGD</th><th className="pr-3 text-right">EAD</th>
                  <th className="pr-3 text-right">Base EL</th><th className="text-right">Stressed EL</th>
                </tr>
              </thead>
              <tbody>
                {[...stressed].sort((a, b) => b.sEl - a.sEl).slice(0, 12).map((r) => (
                  <tr key={r.b.id} className="border-t border-border">
                    <td className="py-2 pr-3"><Link to="/borrowers/$id" params={{ id: r.b.id }} className="font-medium hover:text-primary">{r.b.legalName}</Link></td>
                    <td className="pr-3"><RatingBadge grade={r.grade} /></td>
                    <td className="pr-3 text-right num">{fmtPct(r.pd, 2)}</td>
                    <td className="pr-3 text-right num">{fmtPct(r.lgd, 1)}</td>
                    <td className="pr-3 text-right num">{fmtUSD(r.ead)}</td>
                    <td className="pr-3 text-right num">{fmtUSD(r.el)}</td>
                    <td className="text-right num font-semibold text-warning">{fmtUSD(r.sEl)}</td>
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
