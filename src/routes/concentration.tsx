import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { Topbar } from "@/components/topbar";
import { Panel } from "@/components/panel";
import { MetricCard } from "@/components/metric-card";
import { EmptyAssessment } from "@/components/empty-assessment";
import { useActivePortfolio } from "@/lib/portfolio-context";
import { expectedLoss, fmtUSD, fmtPct } from "@/lib/risk-models";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell,
  ScatterChart, Scatter, ZAxis,
} from "recharts";
import { AlertTriangle, ShieldCheck, Network, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/concentration")({
  head: () => ({ meta: [{ title: "Concentration & Correlation — CreditRisk Pro" }] }),
  component: ConcentrationPage,
});

// Sector default-correlation matrix (approximation of Basel asset-correlation literature).
// Higher = more co-movement of defaults in a downturn.
const SECTOR_CORR: Record<string, Record<string, number>> = {
  Manufacturing: { Manufacturing: 1.0, Transport: 0.55, Construction: 0.45, Retail: 0.40, Energy: 0.35, Technology: 0.20, "Real Estate": 0.30, Healthcare: 0.15, Financials: 0.30, Agriculture: 0.25 },
  Technology:    { Technology: 1.0, Financials: 0.40, Retail: 0.30, Healthcare: 0.25, Manufacturing: 0.20, Transport: 0.15, Construction: 0.10, "Real Estate": 0.20, Energy: 0.15, Agriculture: 0.10 },
  Retail:        { Retail: 1.0, Transport: 0.40, Manufacturing: 0.40, Technology: 0.30, "Real Estate": 0.35, Construction: 0.30, Healthcare: 0.20, Energy: 0.25, Financials: 0.30, Agriculture: 0.25 },
  "Real Estate": { "Real Estate": 1.0, Construction: 0.65, Financials: 0.55, Retail: 0.35, Manufacturing: 0.30, Transport: 0.25, Energy: 0.25, Technology: 0.20, Healthcare: 0.15, Agriculture: 0.20 },
  Energy:        { Energy: 1.0, Transport: 0.55, Manufacturing: 0.35, Construction: 0.30, Agriculture: 0.30, Retail: 0.25, "Real Estate": 0.25, Technology: 0.15, Financials: 0.30, Healthcare: 0.10 },
  Healthcare:    { Healthcare: 1.0, Technology: 0.25, Financials: 0.20, Retail: 0.20, Manufacturing: 0.15, Transport: 0.10, Construction: 0.10, "Real Estate": 0.15, Energy: 0.10, Agriculture: 0.10 },
  Financials:    { Financials: 1.0, "Real Estate": 0.55, Construction: 0.40, Retail: 0.30, Manufacturing: 0.30, Technology: 0.40, Transport: 0.20, Energy: 0.30, Healthcare: 0.20, Agriculture: 0.20 },
  Agriculture:   { Agriculture: 1.0, Energy: 0.30, Transport: 0.30, Manufacturing: 0.25, Retail: 0.25, Construction: 0.20, "Real Estate": 0.20, Technology: 0.10, Healthcare: 0.10, Financials: 0.20 },
  Transport:     { Transport: 1.0, Energy: 0.55, Retail: 0.40, Manufacturing: 0.55, Construction: 0.35, Agriculture: 0.30, "Real Estate": 0.25, Technology: 0.15, Financials: 0.20, Healthcare: 0.10 },
  Construction:  { Construction: 1.0, "Real Estate": 0.65, Manufacturing: 0.45, Financials: 0.40, Transport: 0.35, Retail: 0.30, Energy: 0.30, Agriculture: 0.20, Technology: 0.10, Healthcare: 0.10 },
};

function corr(a: string, b: string): number {
  return SECTOR_CORR[a]?.[b] ?? SECTOR_CORR[b]?.[a] ?? 0.15;
}

function ConcentrationPage() {
  const { portfolio, assessment } = useActivePortfolio();

  const data = useMemo(() => {
    if (!portfolio.length) return null;
    const els = portfolio.map((b) => ({ b, ...expectedLoss(b) }));
    const totalExp = els.reduce((s, x) => s + x.ead, 0);
    const totalEl = els.reduce((s, x) => s + x.el, 0);

    // Single-name HHI on exposure (scaled to 0-10,000)
    const expShares = els.map((x) => x.ead / totalExp);
    const hhiName = Math.round(expShares.reduce((s, p) => s + p * p, 0) * 10000);

    // Sector totals + HHI
    const sectorMap = new Map<string, number>();
    els.forEach((x) => sectorMap.set(x.b.sector, (sectorMap.get(x.b.sector) ?? 0) + x.ead));
    const sectorShares = [...sectorMap.entries()].map(([sector, ead]) => ({
      sector, ead, pct: ead / totalExp,
    })).sort((a, b) => b.ead - a.ead);
    const hhiSector = Math.round(sectorShares.reduce((s, x) => s + x.pct * x.pct, 0) * 10000);

    // Region totals
    const regionMap = new Map<string, number>();
    els.forEach((x) => regionMap.set(x.b.region, (regionMap.get(x.b.region) ?? 0) + x.ead));
    const regionShares = [...regionMap.entries()].map(([region, ead]) => ({ region, ead, pct: ead / totalExp })).sort((a, b) => b.ead - a.ead);
    const hhiRegion = Math.round(regionShares.reduce((s, x) => s + x.pct * x.pct, 0) * 10000);

    // Single-name limit breaches (>10% of portfolio EAD is the standard institutional flag)
    const topNames = [...els].sort((a, b) => b.ead - a.ead).slice(0, 15)
      .map((x) => ({ name: x.b.legalName, ead: x.ead, pct: x.ead / totalExp, el: x.el, pd: x.pd, breach: x.ead / totalExp > 0.10 }));
    const breaches = topNames.filter((x) => x.breach).length;

    // Correlation-weighted portfolio EL multiplier (downturn co-default amplifier)
    // For pairs: amplification ≈ sum_i sum_j (EL_i * EL_j * corr(sector_i, sector_j)) / (sum_i EL_i)^2
    let num = 0;
    for (let i = 0; i < els.length; i++) {
      for (let j = 0; j < els.length; j++) {
        num += els[i].el * els[j].el * corr(els[i].b.sector, els[j].b.sector);
      }
    }
    const denom = totalEl * totalEl || 1;
    const corrMultiplier = num / denom; // ≈ weighted average pairwise correlation

    // Sector-pair contagion edges (top 12 strongest by joint EL × correlation)
    const sectors = [...sectorMap.keys()];
    const elBySector = new Map<string, number>();
    els.forEach((x) => elBySector.set(x.b.sector, (elBySector.get(x.b.sector) ?? 0) + x.el));
    const edges: { a: string; b: string; weight: number; corr: number }[] = [];
    for (let i = 0; i < sectors.length; i++) {
      for (let j = i + 1; j < sectors.length; j++) {
        const a = sectors[i], b = sectors[j];
        const c = corr(a, b);
        const w = (elBySector.get(a) ?? 0) * (elBySector.get(b) ?? 0) * c;
        edges.push({ a, b, weight: w, corr: c });
      }
    }
    edges.sort((x, y) => y.weight - x.weight);

    // Scatter: PD vs EAD per borrower, sized by EL
    const scatter = els.map((x) => ({
      name: x.b.legalName, sector: x.b.sector,
      pd: x.pd * 100, ead: x.ead, el: x.el,
    }));

    return { hhiName, hhiSector, hhiRegion, sectorShares, regionShares, topNames, breaches, corrMultiplier, edges: edges.slice(0, 12), sectors, elBySector, scatter, totalExp, totalEl };
  }, [portfolio]);

  if (!assessment || !data) return <EmptyAssessment />;

  const hhiBand = (h: number): { label: string; tone: "positive" | "warning" | "danger" } =>
    h < 1500 ? { label: "Unconcentrated", tone: "positive" } :
    h < 2500 ? { label: "Moderate", tone: "warning" } :
    { label: "Highly concentrated", tone: "danger" };

  const corrBand: { label: string; tone: "positive" | "warning" | "danger" } =
    data.corrMultiplier < 0.25 ? { label: "Diversified", tone: "positive" } :
    data.corrMultiplier < 0.45 ? { label: "Moderate co-movement", tone: "warning" } :
    { label: "High contagion risk", tone: "danger" };

  return (
    <>
      <Topbar title="Concentration & Correlation" subtitle="HHI, single-name limits, and sector contagion analysis" />
      <div className="p-5 space-y-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard label="Single-Name HHI" value={data.hhiName.toLocaleString()} sub={hhiBand(data.hhiName).label} tone={hhiBand(data.hhiName).tone} />
          <MetricCard label="Sector HHI" value={data.hhiSector.toLocaleString()} sub={hhiBand(data.hhiSector).label} tone={hhiBand(data.hhiSector).tone} />
          <MetricCard label="Region HHI" value={data.hhiRegion.toLocaleString()} sub={hhiBand(data.hhiRegion).label} tone={hhiBand(data.hhiRegion).tone} />
          <MetricCard label="Avg Pairwise Corr" value={fmtPct(data.corrMultiplier, 1)} sub={corrBand.label} tone={corrBand.tone} />
        </div>

        {data.breaches > 0 && (
          <div className="rounded border border-danger/40 bg-danger/10 p-3 flex items-start gap-3 text-sm">
            <AlertTriangle className="h-4 w-4 text-danger mt-0.5 shrink-0" />
            <div>
              <div className="font-semibold text-danger">Single-name limit breach: {data.breaches} borrower{data.breaches > 1 ? "s" : ""} above 10% of portfolio EAD</div>
              <div className="text-xs text-muted-foreground mt-0.5">Industry convention caps any single counterparty at ≤10% of total exposure. Review for syndication or risk transfer.</div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <Panel title="Top 15 Single-Name Concentrations" subtitle="EAD as % of total portfolio · red = >10% limit">
            <div className="h-96">
              <ResponsiveContainer>
                <BarChart layout="vertical" data={data.topNames} margin={{ left: 110 }}>
                  <CartesianGrid stroke="var(--color-grid)" horizontal={false} />
                  <XAxis type="number" tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} stroke="var(--color-muted-foreground)" fontSize={10} />
                  <YAxis type="category" dataKey="name" stroke="var(--color-muted-foreground)" fontSize={10} width={140} />
                  <Tooltip
                    contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 6, fontSize: 12 }}
                    formatter={(v: number, k: string) => k === "pct" ? `${(v * 100).toFixed(2)}%` : v}
                  />
                  <Bar dataKey="pct" radius={[0, 3, 3, 0]}>
                    {data.topNames.map((x, i) => <Cell key={i} fill={x.breach ? "var(--color-danger)" : "var(--color-primary)"} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel title="Sector Exposure" subtitle={`HHI ${data.hhiSector.toLocaleString()} · ${hhiBand(data.hhiSector).label}`}>
            <div className="h-96">
              <ResponsiveContainer>
                <BarChart data={data.sectorShares}>
                  <CartesianGrid stroke="var(--color-grid)" vertical={false} />
                  <XAxis dataKey="sector" stroke="var(--color-muted-foreground)" fontSize={10} angle={-25} textAnchor="end" height={60} />
                  <YAxis tickFormatter={(v) => `${(v / 1e6).toFixed(0)}M`} stroke="var(--color-muted-foreground)" fontSize={10} />
                  <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 6, fontSize: 12 }}
                    formatter={(v: number) => fmtUSD(v)} />
                  <Bar dataKey="ead" fill="var(--color-primary)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>

        <Panel title="Sector Contagion Network" subtitle="Top 12 sector pairs by joint expected loss × default correlation">
          <div className="p-4 space-y-2">
            {data.edges.map((e, i) => {
              const maxW = data.edges[0]?.weight || 1;
              const intensity = e.weight / maxW;
              return (
                <div key={i} className="flex items-center gap-3 text-xs">
                  <div className="w-32 text-right truncate">{e.a}</div>
                  <div className="flex-1 h-3 rounded bg-accent/30 relative overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-primary to-danger" style={{ width: `${(intensity * 100).toFixed(1)}%` }} />
                  </div>
                  <div className="w-32 truncate">{e.b}</div>
                  <div className="w-16 text-right num text-muted-foreground">ρ {e.corr.toFixed(2)}</div>
                  <div className="w-20 text-right num font-medium">{fmtUSD(Math.sqrt(e.weight))}</div>
                </div>
              );
            })}
            <div className="text-[10px] text-muted-foreground pt-2 border-t border-border mt-2">
              ρ = default correlation. Bar length = √(EL<sub>a</sub> × EL<sub>b</sub> × ρ), a contagion-weighted joint-loss magnitude.
            </div>
          </div>
        </Panel>

        <Panel title="Risk vs Exposure Map" subtitle="PD vs EAD · bubble size = Expected Loss">
          <div className="h-96">
            <ResponsiveContainer>
              <ScatterChart margin={{ left: 20, bottom: 10 }}>
                <CartesianGrid stroke="var(--color-grid)" />
                <XAxis type="number" dataKey="ead" name="EAD" tickFormatter={(v) => `${(v / 1e6).toFixed(0)}M`} stroke="var(--color-muted-foreground)" fontSize={10}>
                </XAxis>
                <YAxis type="number" dataKey="pd" name="PD" tickFormatter={(v) => `${v.toFixed(1)}%`} stroke="var(--color-muted-foreground)" fontSize={10} />
                <ZAxis type="number" dataKey="el" range={[40, 600]} name="EL" />
                <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 6, fontSize: 12 }}
                  formatter={(v: number, k: string) => k === "ead" || k === "el" ? fmtUSD(v) : k === "pd" ? `${v.toFixed(2)}%` : v}
                  labelFormatter={() => ""} />
                <Scatter data={data.scatter} fill="var(--color-primary)" fillOpacity={0.65} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="panel-elev p-4 text-xs space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold"><Network className="h-4 w-4 text-primary" /> Methodology</div>
            <p className="text-muted-foreground leading-relaxed">HHI = Σ(share²) × 10,000. Banking convention: &lt;1,500 unconcentrated, 1,500–2,500 moderate, &gt;2,500 highly concentrated.</p>
          </div>
          <div className="panel-elev p-4 text-xs space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold"><TrendingUp className="h-4 w-4 text-primary" /> Default Correlation</div>
            <p className="text-muted-foreground leading-relaxed">Pairwise sector correlations approximate Basel asset-correlation tables. Higher correlation → joint defaults cluster in downturns, amplifying tail loss.</p>
          </div>
          <div className="panel-elev p-4 text-xs space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="h-4 w-4 text-primary" /> Mitigations</div>
            <p className="text-muted-foreground leading-relaxed">Reduce HHI via syndication / participations. Cap single-name exposure at ≤10%. Diversify into low-correlation sectors (e.g. Healthcare, Tech) to lower contagion multiplier.</p>
          </div>
        </div>
      </div>
    </>
  );
}
