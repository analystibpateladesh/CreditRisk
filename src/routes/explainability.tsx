import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Topbar } from "@/components/topbar";
import { Panel } from "@/components/panel";
import { EmptyAssessment } from "@/components/empty-assessment";
import { useActivePortfolio } from "@/lib/portfolio-context";
import { explainScore, scoreComponents, fmtNum } from "@/lib/risk-models";
import { driverImpacts } from "@/lib/credit-analytics";
import { askAi } from "@/lib/ai.functions";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell,
} from "recharts";
import { Sparkles, Loader2, Send } from "lucide-react";

export const Route = createFileRoute("/explainability")({
  head: () => ({ meta: [{ title: "Explainable AI (SHAP) — CreditRisk Pro" }] }),
  component: ExplainPage,
});

function ExplainPage() {
  const { portfolio, assessment } = useActivePortfolio();
  const [id, setId] = useState<string>("");

  const activeId = id || portfolio[0]?.id || "";
  const b = useMemo(() => portfolio.find((x) => x.id === activeId), [portfolio, activeId]);
  const sc = b ? scoreComponents(b) : null;
  const shap = useMemo(() => (b ? explainScore(b) : []), [b]);

  const global = useMemo(() => {
    if (!portfolio.length) return [];
    const acc = new Map<string, number>();
    portfolio.forEach((bb) => explainScore(bb).forEach((f) => acc.set(f.name, (acc.get(f.name) ?? 0) + Math.abs(f.contribution))));
    return [...acc.entries()]
      .map(([name, v]) => ({ name, importance: v / portfolio.length }))
      .sort((a, b) => b.importance - a.importance);
  }, [portfolio]);

  if (!assessment || !b || !sc) {
    return (
      <>
        <Topbar title="Explainable AI · SHAP Attribution" subtitle="Local & global driver analysis" />
        <EmptyAssessment />
      </>
    );
  }

  return (
    <>
      <Topbar title="Explainable AI · SHAP Attribution" subtitle="Local & global driver analysis" />
      <div className="p-5 space-y-5">
        <Panel dense>
          <div className="p-3 flex flex-wrap items-center gap-3">
            <label className="text-xs text-muted-foreground">Borrower</label>
            <select value={activeId} onChange={(e) => setId(e.target.value)} className="h-8 px-2 text-xs rounded bg-input border border-border min-w-[260px]">
              {portfolio.map((bb) => <option key={bb.id} value={bb.id}>{bb.legalName} · {bb.id}</option>)}
            </select>
            <Link to="/borrowers/$id" params={{ id: activeId }} className="text-[11px] text-primary hover:underline ml-auto">Open full profile →</Link>
          </div>
        </Panel>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <Panel title={`Local Explanation — ${b.legalName}`} subtitle={`Internal score ${sc.score} · baseline = 50`}>
            <div className="h-80">
              <ResponsiveContainer>
                <BarChart layout="vertical" data={shap} margin={{ left: 110 }}>
                  <CartesianGrid stroke="var(--color-grid)" horizontal={false} />
                  <XAxis type="number" stroke="var(--color-muted-foreground)" fontSize={10} />
                  <YAxis type="category" dataKey="name" stroke="var(--color-muted-foreground)" fontSize={11} width={140} />
                  <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 6, fontSize: 12 }} formatter={(v: number) => v.toFixed(2)} />
                  <Bar dataKey="contribution" radius={[0, 3, 3, 0]}>
                    {shap.map((f, i) => <Cell key={i} fill={f.contribution >= 0 ? "var(--color-success)" : "var(--color-danger)"} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel title="Global Feature Importance" subtitle="Mean |contribution| across the portfolio">
            <div className="h-80">
              <ResponsiveContainer>
                <BarChart layout="vertical" data={global} margin={{ left: 110 }}>
                  <CartesianGrid stroke="var(--color-grid)" horizontal={false} />
                  <XAxis type="number" stroke="var(--color-muted-foreground)" fontSize={10} />
                  <YAxis type="category" dataKey="name" stroke="var(--color-muted-foreground)" fontSize={11} width={140} />
                  <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 6, fontSize: 12 }} formatter={(v: number) => v.toFixed(2)} />
                  <Bar dataKey="importance" fill="var(--color-primary)" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>

        <Panel title="Narrative Explanation" subtitle="Human-readable rationale">
          <div className="text-sm leading-relaxed text-foreground/90 space-y-2">
            <p>
              <span className="font-semibold">{b.legalName}</span> carries an internal credit score of{" "}
              <span className="num font-semibold text-primary">{sc.score}</span>. The three strongest positive drivers are{" "}
              <span className="text-success font-medium">{shap.filter(f => f.contribution > 0).slice(0, 3).map(f => f.name).join(", ") || "—"}</span>.
              The three largest detractors are{" "}
              <span className="text-danger font-medium">{shap.filter(f => f.contribution < 0).slice(0, 3).map(f => f.name).join(", ") || "—"}</span>.
            </p>
            <p className="text-muted-foreground text-xs">
              Methodology: contributions are computed as (sub-score − 50) × feature weight, an interpretable
              approximation of SHAP values for a linear scoring model.
            </p>
          </div>
        </Panel>

        <AiQA borrower={b} shap={shap} score={sc.score} />
      </div>
    </>
  );
}

function AiQA({ borrower, shap, score }: { borrower: any; shap: { name: string; contribution: number }[]; score: number }) {
  const ask = useServerFn(askAi);
  const [q, setQ] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "ai"; text: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const suggestions = [
    "Why did this borrower receive this score?",
    "What are the top 3 risks for this counterparty?",
    "Suggest covenants or mitigants to reduce PD.",
    "Compare this borrower vs a typical investment-grade peer.",
  ];

  const send = async (text: string) => {
    const question = text.trim();
    if (!question || busy) return;
    setError(null);
    setMessages((m) => [...m, { role: "user", text: question }]);
    setQ("");
    setBusy(true);
    try {
      const context = JSON.stringify({
        borrower: {
          id: borrower.id, name: borrower.legalName, sector: borrower.sector, region: borrower.region,
          rating: borrower.rating, financials: borrower.financials, behavior: borrower.behavior, collateral: borrower.collateral,
        },
        internalScore: score,
        shapDrivers: shap,
      });
      const { answer } = await ask({ data: { question, context } });
      setMessages((m) => [...m, { role: "ai", text: answer || "(no response)" }]);
    } catch (e: any) {
      setError(e.message ?? "AI request failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel title="Ask the AI Analyst" subtitle="Powered by Gemini · grounded on this borrower's data & SHAP drivers">
      <div className="p-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button key={s} onClick={() => send(s)} disabled={busy}
                className="text-[11px] px-2.5 py-1.5 rounded border border-border hover:bg-accent inline-flex items-center gap-1.5 disabled:opacity-50">
                <Sparkles className="h-3 w-3 text-primary" /> {s}
              </button>
            ))}
          </div>
        )}

        {messages.length > 0 && (
          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {messages.map((m, i) => (
              <div key={i} className={`text-sm leading-relaxed ${m.role === "user" ? "" : "bg-accent/30 border border-border rounded p-3"}`}>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{m.role === "user" ? "You" : "AI Analyst"}</div>
                <div className="whitespace-pre-wrap">{m.text}</div>
              </div>
            ))}
            {busy && <div className="text-xs text-muted-foreground inline-flex items-center gap-2"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…</div>}
          </div>
        )}

        {error && <div className="text-xs text-danger bg-danger/10 border border-danger/30 rounded p-2.5">{error}</div>}

        <form onSubmit={(e) => { e.preventDefault(); void send(q); }} className="flex items-center gap-2 pt-1 border-t border-border">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask anything about this borrower…"
            className="flex-1 h-9 px-3 rounded bg-input border border-border text-sm" disabled={busy} />
          <button type="submit" disabled={busy || !q.trim()}
            className="h-9 px-3 rounded bg-primary text-primary-foreground text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-50">
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />} Ask
          </button>
        </form>
      </div>
    </Panel>
  );
}
