import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { Topbar } from "@/components/topbar";
import { Panel } from "@/components/panel";
import { MetricCard } from "@/components/metric-card";
import { RatingBadge } from "@/components/rating-badge";
import { EmptyAssessment } from "@/components/empty-assessment";
import { useActivePortfolio } from "@/lib/portfolio-context";
import { expectedLoss, gradeBand, fmtPct, fmtUSD, pdByGrade } from "@/lib/risk-models";
import type { Grade } from "@/lib/risk-models";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell,
  Treemap,
} from "recharts";

export const Route = createFileRoute("/ratings")({
  head: () => ({ meta: [{ title: "Risk Rating & Segmentation — CreditRisk Pro" }] }),
  component: RatingsPage,
});

const GRADES: Grade[] = ["AAA","AA","A","BBB","BB","B","CCC","CC","C","D"];

function RatingsPage() {
  const { portfolio, assessment, loading } = useActivePortfolio();
  const rows = useMemo(() => portfolio.map((b) => ({ b, ...expectedLoss(b) })), [portfolio]);
  if (loading || !assessment || !portfolio.length) return <EmptyAssessment loading={loading} />;
  const total = rows.length;
  const ig = rows.filter((r) => gradeBand(r.grade) === "Investment").length;
  const sp = rows.filter((r) => gradeBand(r.grade) === "Speculative").length;
  const ds = rows.filter((r) => gradeBand(r.grade) === "Distressed").length;
  const totalEAD = rows.reduce((s, r) => s + r.ead, 0);
  const totalEL = rows.reduce((s, r) => s + r.el, 0);

  const ladder = GRADES.map((g) => {
    const xs = rows.filter((r) => r.grade === g);
    const ead = xs.reduce((s, r) => s + r.ead, 0);
    const el = xs.reduce((s, r) => s + r.el, 0);
    return {
      grade: g, n: xs.length, ead, el,
      anchorPd: pdByGrade[g] * 100,
      observedPd: xs.length ? (xs.reduce((s, r) => s + r.pd, 0) / xs.length) * 100 : 0,
      eadShare: totalEAD ? (ead / totalEAD) * 100 : 0,
      elShare: totalEL ? (el / totalEL) * 100 : 0,
    };
  });

  const tree = GRADES.flatMap((g) => {
    const xs = rows.filter((r) => r.grade === g);
    if (!xs.length) return [];
    return [{
      name: g,
      children: xs.map((r) => ({ name: r.b.legalName, size: r.ead })),
    }];
  });

  return (
    <>
      <Topbar title="Risk Rating & Segmentation" subtitle="AAA → D · Internal grade ladder & portfolio segmentation" />
      <div className="p-5 space-y-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard label="Investment Grade" value={`${ig}`} sub={`${fmtPct(ig / total, 0)} of borrowers`} tone="positive" />
          <MetricCard label="Speculative" value={`${sp}`} sub={`${fmtPct(sp / total, 0)} of borrowers`} tone="warning" />
          <MetricCard label="Distressed" value={`${ds}`} sub={`${fmtPct(ds / total, 0)} of borrowers`} tone="danger" />
          <MetricCard label="EL / EAD" value={fmtPct(totalEL / totalEAD, 2)} sub="Portfolio loss rate" />
        </div>

        <Panel title="Rating Ladder" subtitle="Anchor PD vs observed PD, with exposure & EL share">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase tracking-widest text-muted-foreground">
                <tr className="text-left">
                  <th className="py-2 pr-3">Grade</th><th className="pr-3">Band</th>
                  <th className="pr-3 text-right">Borrowers</th>
                  <th className="pr-3 text-right">Anchor PD</th>
                  <th className="pr-3 text-right">Observed PD</th>
                  <th className="pr-3 text-right">EAD</th>
                  <th className="pr-3 text-right">EAD Share</th>
                  <th className="pr-3 text-right">EL</th>
                  <th className="text-right">EL Share</th>
                </tr>
              </thead>
              <tbody>
                {ladder.map((r) => (
                  <tr key={r.grade} className="border-t border-border">
                    <td className="py-2 pr-3"><RatingBadge grade={r.grade} size="lg" /></td>
                    <td className="pr-3 text-muted-foreground">{gradeBand(r.grade)}</td>
                    <td className="pr-3 text-right num">{r.n}</td>
                    <td className="pr-3 text-right num text-info">{r.anchorPd.toFixed(3)}%</td>
                    <td className="pr-3 text-right num">{r.observedPd.toFixed(3)}%</td>
                    <td className="pr-3 text-right num">{fmtUSD(r.ead)}</td>
                    <td className="pr-3 text-right num">{r.eadShare.toFixed(1)}%</td>
                    <td className="pr-3 text-right num text-warning">{fmtUSD(r.el)}</td>
                    <td className="text-right num font-semibold">{r.elShare.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <Panel title="EAD Share by Grade" subtitle="Concentration across the rating ladder">
            <div className="h-72">
              <ResponsiveContainer>
                <BarChart data={ladder}>
                  <CartesianGrid stroke="var(--color-grid)" vertical={false} />
                  <XAxis dataKey="grade" stroke="var(--color-muted-foreground)" fontSize={11} />
                  <YAxis stroke="var(--color-muted-foreground)" fontSize={11} tickFormatter={(v) => `${v.toFixed(0)}%`} />
                  <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 6, fontSize: 12 }} formatter={(v: number) => `${v.toFixed(1)}%`} />
                  <Bar dataKey="eadShare" radius={[3, 3, 0, 0]}>
                    {ladder.map((d, i) => <Cell key={i} fill={
                      gradeBand(d.grade) === "Investment" ? "var(--color-success)" :
                      gradeBand(d.grade) === "Speculative" ? "var(--color-warning)" : "var(--color-danger)"
                    } />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel title="Exposure Treemap by Grade" subtitle="Each tile is a borrower; size = EAD">
            <div className="h-72">
              <ResponsiveContainer>
                <Treemap
                  data={tree as any}
                  dataKey="size"
                  stroke="var(--color-background)"
                  fill="var(--color-primary)"
                  content={((props: any) => {
                    const { x, y, width, height, name, depth } = props;
                    if (depth === 1) {
                      const gradeColor =
                        ["AAA","AA","A","BBB"].includes(name) ? "var(--color-success)" :
                        ["BB","B"].includes(name) ? "var(--color-warning)" : "var(--color-danger)";
                      return <g><rect x={x} y={y} width={width} height={height} style={{ fill: gradeColor, fillOpacity: 0.18, stroke: "var(--color-background)" }} />
                        {width > 40 && height > 20 && <text x={x + 4} y={y + 14} fill="var(--color-foreground)" fontSize={11} fontWeight={600}>{name}</text>}
                      </g>;
                    }
                    return <g><rect x={x} y={y} width={width} height={height} style={{ fill: "var(--color-primary)", fillOpacity: 0.55, stroke: "var(--color-background)" }} />
                      {width > 60 && height > 22 && <text x={x + 4} y={y + 14} fill="var(--color-primary-foreground)" fontSize={10}>{name?.slice?.(0, Math.floor(width / 7))}</text>}
                    </g>;
                  }) as any}
                />
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>

        <Panel title="Borrowers by Grade Bucket">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {GRADES.map((g) => {
              const xs = rows.filter((r) => r.grade === g);
              return (
                <div key={g} className="border border-border rounded p-3">
                  <div className="flex items-center justify-between mb-2"><RatingBadge grade={g} /><span className="text-[11px] text-muted-foreground">{xs.length}</span></div>
                  <ul className="text-[11px] space-y-1 max-h-40 overflow-y-auto">
                    {xs.slice(0, 8).map((r) => (
                      <li key={r.b.id}><Link to="/borrowers/$id" params={{ id: r.b.id }} className="hover:text-primary truncate block">{r.b.legalName}</Link></li>
                    ))}
                    {xs.length > 8 && <li className="text-muted-foreground">+ {xs.length - 8} more</li>}
                    {xs.length === 0 && <li className="text-muted-foreground">— empty —</li>}
                  </ul>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>
    </>
  );
}
