import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from "recharts";
import { Topbar } from "@/components/topbar";
import { Panel } from "@/components/panel";
import { MetricCard } from "@/components/metric-card";
import { RatingBadge } from "@/components/rating-badge";
import { EmptyAssessment } from "@/components/empty-assessment";
import { useActivePortfolio } from "@/lib/portfolio-context";
import { expectedLoss, fmtPct, fmtUSD, gradeBand } from "@/lib/risk-models";
import type { Grade } from "@/lib/risk-models";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Executive Overview — CreditRisk Pro" }] }),
  component: Overview,
});

const GRADES: Grade[] = ["AAA","AA","A","BBB","BB","B","CCC","CC","C","D"];

function Overview() {
  const { portfolio, assessment, loading } = useActivePortfolio();
  if (loading || !assessment || !portfolio.length) return <EmptyAssessment loading={loading} />;
  const rows = portfolio.map((b) => ({ b, ...expectedLoss(b) }));
  const totalEAD = rows.reduce((s, r) => s + r.ead, 0);
  const totalEL = rows.reduce((s, r) => s + r.el, 0);
  const avgPD = rows.reduce((s, r) => s + r.pd, 0) / rows.length;
  const avgLGD = rows.reduce((s, r) => s + r.lgd, 0) / rows.length;
  const investment = rows.filter((r) => gradeBand(r.grade) === "Investment").length;
  const distressed = rows.filter((r) => gradeBand(r.grade) === "Distressed").length;

  const gradeBuckets = GRADES.map((g) => {
    const xs = rows.filter((r) => r.grade === g);
    return { grade: g, count: xs.length, ead: xs.reduce((s, r) => s + r.ead, 0), el: xs.reduce((s, r) => s + r.el, 0) };
  });

  const sectorMap = new Map<string, { ead: number; el: number }>();
  rows.forEach((r) => {
    const cur = sectorMap.get(r.b.sector) ?? { ead: 0, el: 0 };
    sectorMap.set(r.b.sector, { ead: cur.ead + r.ead, el: cur.el + r.el });
  });
  const sectors = [...sectorMap.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.ead - a.ead);

  // Synthetic 12-month EL trend
  const trend = Array.from({ length: 12 }, (_, i) => {
    const factor = 0.78 + 0.04 * Math.sin(i / 1.4) + i * 0.018;
    return { month: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][i], el: Math.round(totalEL * factor / 1e6 * 100) / 100, ead: Math.round(totalEAD * (0.9 + i * 0.012) / 1e9 * 100) / 100 };
  });

  const top10 = [...rows].sort((a, b) => b.el - a.el).slice(0, 10);

  return (
    <>
      <Topbar title="Executive Risk Overview" subtitle="Portfolio · Live" />
      <div className="p-5 space-y-5">
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3">
          <MetricCard label="Total Exposure (EAD)" value={fmtUSD(totalEAD)} sub={`${rows.length} active borrowers`} />
          <MetricCard label="Expected Loss (12M)" value={fmtUSD(totalEL)} sub={`${fmtPct(totalEL / totalEAD, 2)} of EAD`} tone="warning" delta={{ value: "+3.2% MoM", positive: false }} />
          <MetricCard label="Avg PD" value={fmtPct(avgPD, 2)} sub="Portfolio-weighted" tone="warning" />
          <MetricCard label="Avg LGD" value={fmtPct(avgLGD, 1)} sub="Collateral-adjusted" />
          <MetricCard label="Investment Grade" value={`${investment}`} sub={`${fmtPct(investment / rows.length, 0)} of book`} tone="positive" />
          <MetricCard label="Distressed (CCC–D)" value={`${distressed}`} sub="Watchlist candidates" tone="danger" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <Panel className="xl:col-span-2" title="Expected Loss & Exposure Trend" subtitle="Trailing 12 months · USD">
            <div className="h-72">
              <ResponsiveContainer>
                <AreaChart data={trend} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gEL" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gEAD" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-info)" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="var(--color-info)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--color-grid)" vertical={false} />
                  <XAxis dataKey="month" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="l" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}M`} />
                  <YAxis yAxisId="r" orientation="right" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}B`} />
                  <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 6, fontSize: 12 }} />
                  <Area yAxisId="l" type="monotone" dataKey="el" name="Expected Loss" stroke="var(--color-primary)" fill="url(#gEL)" strokeWidth={2} />
                  <Area yAxisId="r" type="monotone" dataKey="ead" name="Exposure" stroke="var(--color-info)" fill="url(#gEAD)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel title="Rating Distribution" subtitle="Borrower count by internal grade">
            <div className="h-72">
              <ResponsiveContainer>
                <BarChart data={gradeBuckets} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="var(--color-grid)" vertical={false} />
                  <XAxis dataKey="grade" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 6, fontSize: 12 }} />
                  <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                    {gradeBuckets.map((g, i) => (
                      <Cell key={i} fill={
                        ["AAA","AA","A","BBB"].includes(g.grade) ? "var(--color-success)" :
                        ["BB","B"].includes(g.grade) ? "var(--color-warning)" : "var(--color-danger)"
                      } />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <Panel title="Sector Concentration" subtitle="By exposure-at-default" className="xl:col-span-1">
            <div className="h-72">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={sectors} dataKey="ead" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={2}>
                    {sectors.map((_, i) => (
                      <Cell key={i} fill={[`var(--color-chart-1)`,`var(--color-chart-2)`,`var(--color-chart-3)`,`var(--color-chart-4)`,`var(--color-chart-5)`][i % 5]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 6, fontSize: 12 }} formatter={(v: number) => fmtUSD(v)} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel className="xl:col-span-2" title="Top 10 Expected Loss Contributors" right={<Link to="/borrowers" className="text-[11px] text-primary hover:underline">View all →</Link>}>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  <tr className="text-left">
                    <th className="py-2 pr-3">Borrower</th><th className="pr-3">Sector</th><th className="pr-3">Grade</th>
                    <th className="pr-3 text-right">PD</th><th className="pr-3 text-right">LGD</th>
                    <th className="pr-3 text-right">EAD</th><th className="text-right">Expected Loss</th>
                  </tr>
                </thead>
                <tbody>
                  {top10.map((r) => (
                    <tr key={r.b.id} className="border-t border-border hover:bg-accent/30">
                      <td className="py-2 pr-3">
                        <Link to="/borrowers/$id" params={{ id: r.b.id }} className="font-medium hover:text-primary">{r.b.legalName}</Link>
                        <div className="text-[10px] text-muted-foreground font-mono">{r.b.id}</div>
                      </td>
                      <td className="pr-3 text-muted-foreground">{r.b.sector}</td>
                      <td className="pr-3"><RatingBadge grade={r.grade} /></td>
                      <td className="pr-3 text-right num">{fmtPct(r.pd, 2)}</td>
                      <td className="pr-3 text-right num">{fmtPct(r.lgd, 1)}</td>
                      <td className="pr-3 text-right num">{fmtUSD(r.ead)}</td>
                      <td className="text-right num font-semibold text-warning">{fmtUSD(r.el)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}
