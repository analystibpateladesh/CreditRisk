import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { Topbar } from "@/components/topbar";
import { Panel } from "@/components/panel";
import { MetricCard } from "@/components/metric-card";
import { EmptyAssessment } from "@/components/empty-assessment";
import { useActivePortfolio } from "@/lib/portfolio-context";
import { lossGivenDefault, fmtPct, fmtUSD } from "@/lib/risk-models";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell,
} from "recharts";

export const Route = createFileRoute("/lgd")({
  head: () => ({ meta: [{ title: "Loss Given Default — CreditRisk Pro" }] }),
  component: LGDPage,
});

function LGDPage() {
  const { portfolio, assessment, loading } = useActivePortfolio();
  const rows = useMemo(() => portfolio.map((b) => ({ b, ...lossGivenDefault(b) })), [portfolio]);
  if (loading || !assessment || !portfolio.length) return <EmptyAssessment loading={loading} />;
  const avg = rows.reduce((s, r) => s + r.lgd, 0) / rows.length;
  const avgRec = 1 - avg;

  const bySeniority = ["Senior Secured", "Senior Unsecured", "Subordinated"].map((s) => {
    const xs = rows.filter((r) => r.b.seniority === s);
    return { s, lgd: xs.length ? (xs.reduce((a, r) => a + r.lgd, 0) / xs.length) * 100 : 0, n: xs.length };
  });

  const bySector = Array.from(new Set(portfolio.map((b) => b.sector))).map((sec) => {
    const xs = rows.filter((r) => r.b.sector === sec);
    return { sector: sec, lgd: (xs.reduce((a, r) => a + r.lgd, 0) / xs.length) * 100 };
  }).sort((a, b) => b.lgd - a.lgd);

  return (
    <>
      <Topbar title="Loss Given Default (LGD)" subtitle="Collateral & seniority adjusted recovery model" />
      <div className="p-5 space-y-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard label="Avg LGD" value={fmtPct(avg, 1)} sub={`Recovery ${fmtPct(avgRec, 0)}`} />
          <MetricCard label="Senior Secured" value={fmtPct(bySeniority[0].lgd / 100, 1)} sub={`${bySeniority[0].n} facilities`} tone="positive" />
          <MetricCard label="Senior Unsecured" value={fmtPct(bySeniority[1].lgd / 100, 1)} sub={`${bySeniority[1].n} facilities`} tone="warning" />
          <MetricCard label="Subordinated" value={fmtPct(bySeniority[2].lgd / 100, 1)} sub={`${bySeniority[2].n} facilities`} tone="danger" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <Panel title="LGD by Seniority" subtitle="Recovery prior reflects claim hierarchy">
            <div className="h-72">
              <ResponsiveContainer>
                <BarChart data={bySeniority}>
                  <CartesianGrid stroke="var(--color-grid)" vertical={false} />
                  <XAxis dataKey="s" stroke="var(--color-muted-foreground)" fontSize={11} />
                  <YAxis stroke="var(--color-muted-foreground)" fontSize={11} tickFormatter={(v) => `${v.toFixed(0)}%`} />
                  <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 6, fontSize: 12 }} formatter={(v: number) => `${v.toFixed(1)}%`} />
                  <Bar dataKey="lgd" radius={[3, 3, 0, 0]}>
                    {bySeniority.map((d, i) => <Cell key={i} fill={d.lgd < 30 ? "var(--color-success)" : d.lgd < 55 ? "var(--color-warning)" : "var(--color-danger)"} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel title="Avg LGD by Sector" subtitle="Higher LGD = lower expected recovery">
            <div className="h-72">
              <ResponsiveContainer>
                <BarChart layout="vertical" data={bySector} margin={{ left: 90 }}>
                  <CartesianGrid stroke="var(--color-grid)" horizontal={false} />
                  <XAxis type="number" stroke="var(--color-muted-foreground)" fontSize={11} tickFormatter={(v) => `${v.toFixed(0)}%`} />
                  <YAxis type="category" dataKey="sector" stroke="var(--color-muted-foreground)" fontSize={11} width={100} />
                  <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 6, fontSize: 12 }} formatter={(v: number) => `${v.toFixed(1)}%`} />
                  <Bar dataKey="lgd" fill="var(--color-primary)" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>

        <Panel title="LGD Detail by Facility" subtitle="Collateral coverage and effective recovery">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase tracking-widest text-muted-foreground">
                <tr className="text-left">
                  <th className="py-2 pr-3">Borrower</th><th className="pr-3">Seniority</th><th className="pr-3">Facility</th>
                  <th className="pr-3 text-right">Exposure</th><th className="pr-3 text-right">Collateral</th>
                  <th className="pr-3 text-right">Coverage</th><th className="pr-3 text-right">Haircut</th>
                  <th className="pr-3 text-right">LGD</th><th className="text-right">Recovery</th>
                </tr>
              </thead>
              <tbody>
                {[...rows].sort((a, b) => b.lgd - a.lgd).slice(0, 15).map((r) => (
                  <tr key={r.b.id} className="border-t border-border">
                    <td className="py-2 pr-3"><Link to="/borrowers/$id" params={{ id: r.b.id }} className="font-medium hover:text-primary">{r.b.legalName}</Link><div className="text-[10px] text-muted-foreground font-mono">{r.b.id}</div></td>
                    <td className="pr-3">{r.b.seniority}</td>
                    <td className="pr-3 text-muted-foreground">{r.b.facilityType}</td>
                    <td className="pr-3 text-right num">{fmtUSD(r.b.exposure)}</td>
                    <td className="pr-3 text-right num">{fmtUSD(r.b.collateralValue)}</td>
                    <td className="pr-3 text-right num">{fmtPct(r.coverage, 0)}</td>
                    <td className="pr-3 text-right num">{fmtPct(r.haircut, 0)}</td>
                    <td className="pr-3 text-right num font-semibold text-warning">{fmtPct(r.lgd, 1)}</td>
                    <td className="text-right num text-success">{fmtPct(r.recovery, 1)}</td>
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
