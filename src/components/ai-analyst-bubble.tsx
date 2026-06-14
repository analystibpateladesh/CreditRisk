import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { askAi } from "@/lib/ai.functions";
import { useActivePortfolio } from "@/lib/portfolio-context";
import { expectedLoss, probabilityOfDefault, lossGivenDefault, gradeBand, fmtUSD, fmtPct } from "@/lib/risk-models";
import { Sparkles, X, Send, Loader2 } from "lucide-react";

function buildPortfolioContext(portfolio: any[], assessmentName?: string) {
  if (!portfolio.length) return "No active assessment.";
  const stats = portfolio.map((b) => {
    const el = expectedLoss(b);
    return { ...el, exposure: b.exposure, sector: b.sector, region: b.region, name: b.legalName };
  });
  const totalExp = stats.reduce((s, x) => s + x.exposure, 0);
  const totalEl = stats.reduce((s, x) => s + x.el, 0);
  const wPd = stats.reduce((s, x) => s + x.pd * x.exposure, 0) / Math.max(1, totalExp);
  const wLgd = stats.reduce((s, x) => s + x.lgd * x.exposure, 0) / Math.max(1, totalExp);
  const sectorTotals = new Map<string, number>();
  stats.forEach((s) => sectorTotals.set(s.sector, (sectorTotals.get(s.sector) ?? 0) + s.exposure));
  const sectors = [...sectorTotals.entries()].map(([k, v]) => `${k}: ${fmtUSD(v)} (${((v / totalExp) * 100).toFixed(1)}%)`).join(", ");
  const top = [...stats].sort((a, b) => b.el - a.el).slice(0, 5).map((s) => `${s.name} [${s.grade}] EL=${fmtUSD(s.el)} PD=${fmtPct(s.pd)}`).join("; ");
  const bands = { Investment: 0, Speculative: 0, Distressed: 0 } as Record<string, number>;
  stats.forEach((s) => { bands[gradeBand(s.grade as any)] += s.exposure; });
  return JSON.stringify({
    assessment: assessmentName,
    borrowers: portfolio.length,
    totalExposure: totalExp,
    totalExpectedLoss: totalEl,
    weightedPD: wPd,
    weightedLGD: wLgd,
    sectorExposure: sectors,
    gradeBandExposure: Object.fromEntries(Object.entries(bands).map(([k, v]) => [k, `${fmtUSD(v)} (${((v / totalExp) * 100).toFixed(1)}%)`])),
    topRiskBorrowers: top,
  });
}

export function AiAnalystBubble() {
  const { portfolio, assessment } = useActivePortfolio();
  const ask = useServerFn(askAi);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "ai"; text: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const suggestions = [
    "Summarize the biggest risks in this portfolio.",
    "Which sectors are over-concentrated?",
    "Recommend 3 actions to reduce expected loss.",
    "Explain the difference between PD, LGD, EAD.",
  ];

  const send = async (text: string) => {
    const question = text.trim();
    if (!question || busy) return;
    setError(null);
    setMessages((m) => [...m, { role: "user", text: question }]);
    setQ("");
    setBusy(true);
    try {
      const context = buildPortfolioContext(portfolio, assessment?.name);
      const { answer } = await ask({ data: { question, context } });
      setMessages((m) => [...m, { role: "ai", text: answer || "(no response)" }]);
    } catch (e: any) {
      setError(e.message ?? "AI request failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-5 right-5 z-40 h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg grid place-items-center hover:opacity-90"
        title="Ask the AI Analyst"
      >
        {open ? <X className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
      </button>

      {open && (
        <div className="fixed bottom-20 right-5 z-40 w-[380px] max-w-[calc(100vw-2rem)] h-[520px] panel-elev shadow-2xl flex flex-col rounded-lg overflow-hidden border border-border">
          <div className="px-3 py-2.5 border-b border-border flex items-center gap-2 bg-panel">
            <Sparkles className="h-4 w-4 text-primary" />
            <div className="flex-1">
              <div className="text-sm font-semibold">AI Risk Analyst</div>
              <div className="text-[10px] text-muted-foreground">
                {assessment ? `Grounded on: ${assessment.name}` : "No active assessment"}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3 text-sm">
            {messages.length === 0 && (
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">Try asking:</div>
                {suggestions.map((s) => (
                  <button key={s} onClick={() => send(s)} disabled={busy}
                    className="block w-full text-left text-xs px-2.5 py-2 rounded border border-border hover:bg-accent disabled:opacity-50">
                    {s}
                  </button>
                ))}
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "" : "bg-accent/30 border border-border rounded p-2.5"}>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{m.role === "user" ? "You" : "Analyst"}</div>
                <div className="whitespace-pre-wrap text-[13px] leading-relaxed">{m.text}</div>
              </div>
            ))}
            {busy && <div className="text-xs text-muted-foreground inline-flex items-center gap-2"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…</div>}
            {error && <div className="text-xs text-danger bg-danger/10 border border-danger/30 rounded p-2.5">{error}</div>}
          </div>

          <form onSubmit={(e) => { e.preventDefault(); void send(q); }} className="border-t border-border p-2 flex items-center gap-2 bg-panel">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask anything…"
              className="flex-1 h-9 px-2.5 rounded bg-input border border-border text-sm" disabled={busy} />
            <button type="submit" disabled={busy || !q.trim()}
              className="h-9 w-9 rounded bg-primary text-primary-foreground grid place-items-center disabled:opacity-50">
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
