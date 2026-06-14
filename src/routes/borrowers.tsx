import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Topbar } from "@/components/topbar";
import { Panel } from "@/components/panel";
import { RatingBadge } from "@/components/rating-badge";
import { EmptyAssessment } from "@/components/empty-assessment";
import { useActivePortfolio } from "@/lib/portfolio-context";
import { expectedLoss, fmtPct, fmtUSD } from "@/lib/risk-models";
import type { Grade } from "@/lib/risk-models";
import { ArrowUpDown } from "lucide-react";

export const Route = createFileRoute("/borrowers")({
  head: () => ({ meta: [{ title: "Borrower Profiler — CreditRisk Pro" }] }),
  component: BorrowersList,
});

type SortKey = "name" | "ead" | "pd" | "lgd" | "el" | "score";
const GRADES: Grade[] = ["AAA","AA","A","BBB","BB","B","CCC","CC","C","D"];

function BorrowersList() {
  const { portfolio, assessment, loading } = useActivePortfolio();
  const enriched = useMemo(() => portfolio.map((b) => ({ b, ...expectedLoss(b) })), [portfolio]);
  const [q, setQ] = useState("");
  const [sector, setSector] = useState("All");
  const [grade, setGrade] = useState<"All" | Grade>("All");
  const [sortKey, setSortKey] = useState<SortKey>("el");
  const [desc, setDesc] = useState(true);
  if (loading || !assessment || !portfolio.length) return <EmptyAssessment loading={loading} />;

  const sectors = ["All", ...Array.from(new Set(portfolio.map((b) => b.sector)))];

  const rows = enriched
    .filter((r) =>
      (q === "" || r.b.legalName.toLowerCase().includes(q.toLowerCase()) || r.b.id.toLowerCase().includes(q.toLowerCase())) &&
      (sector === "All" || r.b.sector === sector) &&
      (grade === "All" || r.grade === grade)
    )
    .sort((a, b) => {
      const v =
        sortKey === "name" ? a.b.legalName.localeCompare(b.b.legalName) :
        sortKey === "ead" ? a.ead - b.ead :
        sortKey === "pd" ? a.pd - b.pd :
        sortKey === "lgd" ? a.lgd - b.lgd :
        sortKey === "score" ? a.score - b.score :
        a.el - b.el;
      return desc ? -v : v;
    });

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setDesc(!desc); else { setSortKey(k); setDesc(true); }
  };

  const Th = ({ k, label, align = "left" }: { k: SortKey; label: string; align?: "left" | "right" }) => (
    <th className={`py-2 px-3 ${align === "right" ? "text-right" : "text-left"} cursor-pointer select-none`} onClick={() => toggleSort(k)}>
      <span className="inline-flex items-center gap-1">{label}<ArrowUpDown className="h-3 w-3 opacity-50" /></span>
    </th>
  );

  return (
    <>
      <Topbar title="Borrower Profiler" subtitle={`${portfolio.length} borrowers · ${rows.length} shown`} />
      <div className="p-5 space-y-4">
        <Panel dense>
          <div className="flex flex-wrap gap-3 p-3 items-center">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or ID…" className="h-8 px-3 text-xs rounded bg-input border border-border w-64" />
            <select value={sector} onChange={(e) => setSector(e.target.value)} className="h-8 px-2 text-xs rounded bg-input border border-border">
              {sectors.map((s) => <option key={s}>{s}</option>)}
            </select>
            <select value={grade} onChange={(e) => setGrade(e.target.value as any)} className="h-8 px-2 text-xs rounded bg-input border border-border">
              <option value="All">All grades</option>
              {GRADES.map((g) => <option key={g}>{g}</option>)}
            </select>
            <div className="ml-auto text-[11px] text-muted-foreground">Click headers to sort</div>
          </div>
          <div className="overflow-x-auto border-t border-border">
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase tracking-widest text-muted-foreground bg-panel-elev">
                <tr>
                  <Th k="name" label="Borrower" />
                  <th className="py-2 px-3 text-left">Sector / Region</th>
                  <th className="py-2 px-3 text-left">Facility</th>
                  <Th k="score" label="Score" align="right" />
                  <th className="py-2 px-3 text-left">Grade</th>
                  <Th k="pd" label="PD" align="right" />
                  <Th k="lgd" label="LGD" align="right" />
                  <Th k="ead" label="EAD" align="right" />
                  <Th k="el" label="Expected Loss" align="right" />
                  <th className="py-2 px-3 text-left">RM</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.b.id} className="border-t border-border hover:bg-accent/30">
                    <td className="py-2 px-3">
                      <Link to="/borrowers/$id" params={{ id: r.b.id }} className="font-medium hover:text-primary">{r.b.legalName}</Link>
                      <div className="text-[10px] text-muted-foreground font-mono">{r.b.id}{r.b.ticker ? ` · ${r.b.ticker}` : ""}</div>
                    </td>
                    <td className="py-2 px-3 text-muted-foreground">{r.b.sector}<div className="text-[10px]">{r.b.region} · {r.b.country}</div></td>
                    <td className="py-2 px-3"><div>{r.b.facilityType}</div><div className="text-[10px] text-muted-foreground">{r.b.seniority} · {r.b.tenorMonths}m</div></td>
                    <td className="py-2 px-3 text-right num">{r.score}</td>
                    <td className="py-2 px-3"><RatingBadge grade={r.grade} /></td>
                    <td className="py-2 px-3 text-right num">{fmtPct(r.pd, 2)}</td>
                    <td className="py-2 px-3 text-right num">{fmtPct(r.lgd, 1)}</td>
                    <td className="py-2 px-3 text-right num">{fmtUSD(r.ead)}</td>
                    <td className="py-2 px-3 text-right num font-semibold text-warning">{fmtUSD(r.el)}</td>
                    <td className="py-2 px-3 text-muted-foreground">{r.b.rmOwner}</td>
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
