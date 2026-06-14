import { createFileRoute, Link, Outlet, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Topbar } from "@/components/topbar";
import { Panel } from "@/components/panel";
import type { AssessmentRow } from "@/lib/assessment-data";
import { useActivePortfolio } from "@/lib/portfolio-context";
import { Plus, FileSpreadsheet, Sparkles, Trash2, ExternalLink, Loader2 } from "lucide-react";

export const Route = createFileRoute("/assessments")({
  head: () => ({ meta: [{ title: "Assessments History — CreditRisk Pro" }] }),
  component: AssessmentsRoute,
});

type Row = AssessmentRow & { borrower_count: number };

function AssessmentsRoute() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return pathname === "/assessments" ? <AssessmentsPage /> : <Outlet />;
}

function AssessmentsPage() {
  const navigate = useNavigate();
  const { assessment, setActive } = useActivePortfolio();
  const [rows, setRows] = useState<Row[] | null>(null);

  const load = async () => {
    const { data: a } = await supabase.from("assessments").select("*").order("created_at", { ascending: false });
    const list = (a ?? []) as AssessmentRow[];
    const counts = await Promise.all(list.map(async (r) => {
      const { count } = await supabase.from("borrower_records").select("id", { count: "exact", head: true }).eq("assessment_id", r.id);
      return { ...r, borrower_count: count ?? 0 };
    }));
    setRows(counts);
  };

  useEffect(() => { void load(); }, []);

  const open = async (id: string) => {
    await setActive(id);
    navigate({ to: "/" });
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this assessment and all its borrowers?")) return;
    await supabase.from("assessments").delete().eq("id", id);
    if (assessment?.id === id) await setActive(null);
    void load();
  };

  return (
    <>
      <Topbar title="Assessments" subtitle="History of all risk runs in this workspace"
        right={<Link to="/assessments/new" className="h-8 px-3 rounded bg-primary text-primary-foreground text-xs font-semibold inline-flex items-center gap-1.5 hover:opacity-90"><Plus className="h-3.5 w-3.5" /> New Assessment</Link>} />
      <div className="p-5 space-y-5">
        {assessment && (
          <Panel title="Active Assessment" subtitle="Currently loaded in every module">
            <div className="flex items-center justify-between gap-3 text-sm">
              <div>
                <div className="font-semibold">{assessment.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{assessment.kind === "seed" ? "Synthetic seed" : "Uploaded CSV"} · {assessment.description ?? "—"}</div>
              </div>
              <Link to="/" className="text-xs text-primary hover:underline">Open dashboard →</Link>
            </div>
          </Panel>
        )}

        <Panel title="History" subtitle={rows ? `${rows.length} assessment${rows.length === 1 ? "" : "s"}` : "Loading…"}>
          {!rows ? (
            <div className="p-10 grid place-items-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : rows.length === 0 ? (
            <div className="p-10 text-center space-y-3">
              <div className="text-sm text-muted-foreground">No assessments yet.</div>
              <Link to="/assessments/new" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"><Plus className="h-4 w-4" /> Create your first assessment</Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  <tr className="text-left">
                    <th className="py-2 px-3">Name</th>
                    <th className="px-3">Source</th>
                    <th className="px-3 text-right">Borrowers</th>
                    <th className="px-3">Created</th>
                    <th className="px-3">Status</th>
                    <th className="px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className={`border-t border-border hover:bg-accent/30 ${assessment?.id === r.id ? "bg-accent/20" : ""}`}>
                      <td className="py-2.5 px-3">
                        <div className="font-medium">{r.name}</div>
                        {r.description && <div className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-md">{r.description}</div>}
                      </td>
                      <td className="px-3">
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] border ${r.kind === "seed" ? "border-info/30 text-info bg-info/10" : "border-success/30 text-success bg-success/10"}`}>
                          {r.kind === "seed" ? <Sparkles className="h-3 w-3" /> : <FileSpreadsheet className="h-3 w-3" />}
                          {r.kind === "seed" ? "Seed" : "Upload"}
                        </span>
                      </td>
                      <td className="px-3 text-right num">{r.borrower_count}</td>
                      <td className="px-3 text-muted-foreground">{new Date(r.created_at).toLocaleDateString()} <span className="text-[10px]">{new Date(r.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span></td>
                      <td className="px-3">
                        {assessment?.id === r.id ? <span className="text-[10px] text-success">● Active</span> : <span className="text-[10px] text-muted-foreground">—</span>}
                      </td>
                      <td className="px-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button onClick={() => open(r.id)} className="h-7 px-2 text-[11px] rounded bg-primary/90 text-primary-foreground hover:opacity-90 inline-flex items-center gap-1"><ExternalLink className="h-3 w-3" /> Open</button>
                          <button onClick={() => remove(r.id)} className="h-7 w-7 rounded border border-border hover:bg-danger/10 hover:text-danger inline-grid place-items-center" title="Delete"><Trash2 className="h-3 w-3" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}
