import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Topbar } from "@/components/topbar";
import { Panel } from "@/components/panel";
import { useAuth } from "@/hooks/use-auth";
import { useActivePortfolio } from "@/lib/portfolio-context";
import {
  generateSeedBorrowers, parseCSV, autoMap, mappedRowToBorrower, BORROWER_FIELDS, SAMPLE_CSV_HEADERS,
} from "@/lib/assessment-data";
import { Sparkles, FileSpreadsheet, Loader2, ChevronLeft, Download, CheckCircle2, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/assessments/new")({
  head: () => ({ meta: [{ title: "New Assessment — CreditRisk Pro" }] }),
  component: NewAssessment,
});

function NewAssessment() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { setActive } = useActivePortfolio();

  const [tab, setTab] = useState<"seed" | "upload">("seed");
  const [name, setName] = useState("New assessment");
  const [description, setDescription] = useState("");
  const [count, setCount] = useState(50);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});

  const onFile = async (f: File | null) => {
    if (!f) return;
    setError(null);
    const text = await f.text();
    const { headers, rows } = parseCSV(text);
    if (!headers.length || !rows.length) { setError("Could not parse CSV. Ensure it has a header row and at least one data row."); return; }
    setCsvHeaders(headers);
    setCsvRows(rows);
    setMapping(autoMap(headers));
    if (!name.trim() || name.startsWith("Run ")) setName(f.name.replace(/\.csv$/i, ""));
  };

  const missingRequired = BORROWER_FIELDS.filter((f) => f.required && !mapping[f.key]);
  const extraColumns = csvHeaders.filter((h) => !Object.values(mapping).includes(h));
  const [allowMissing, setAllowMissing] = useState(false);

  const create = async () => {
    // Wait for auth to hydrate (Supabase session restore can race with click)
    let currentUser = user;
    if (!currentUser) {
      const { data } = await supabase.auth.getUser();
      currentUser = data.user ?? null;
    }
    if (!currentUser) { setError("You must be signed in. Please sign in and try again."); return; }
    if (!name.trim()) { setError("Name is required"); return; }
    setBusy(true); setError(null);
    try {
      const borrowers = tab === "seed"
        ? generateSeedBorrowers(count)
        : csvRows.map((r, i) => mappedRowToBorrower(r, mapping, i));

      if (!borrowers.length) throw new Error("No borrowers to import");
      if (tab === "upload" && missingRequired.length && !allowMissing) {
        throw new Error(`Missing required fields: ${missingRequired.map((f) => f.label).join(", ")}. Enable "Import anyway" below to proceed with defaults.`);
      }

      const { data: a, error: aErr } = await supabase.from("assessments").insert({
        owner_id: currentUser.id, name: name.trim(), description: description.trim() || null, kind: tab,
      }).select().single();
      if (aErr) throw aErr;

      const chunks: any[][] = [];
      const BATCH = 200;
      for (let i = 0; i < borrowers.length; i += BATCH) {
        chunks.push(borrowers.slice(i, i + BATCH).map((b) => ({ assessment_id: a.id, payload: b })));
      }
      for (const c of chunks) {
        const { error: rErr } = await supabase.from("borrower_records").insert(c);
        if (rErr) throw rErr;
      }
      await setActive(a.id);
      navigate({ to: "/" });
    } catch (e: any) {
      setError(e.message ?? "Failed to create assessment");
    } finally { setBusy(false); }
  };

  const downloadTemplate = () => {
    const blob = new Blob([SAMPLE_CSV_HEADERS + "\n"], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "creditrisk-template.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Topbar title="New Assessment" subtitle="Create a new risk run · seed a portfolio or upload your own data"
        right={<Link to="/assessments" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"><ChevronLeft className="h-3 w-3" /> All assessments</Link>} />
      <div className="p-5 space-y-5 max-w-5xl">
        <Panel>
          <div className="p-4 space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground">Assessment name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full h-9 px-3 rounded bg-input border border-border text-sm" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Description (optional)</label>
                <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Q4 2026 portfolio review" className="mt-1 w-full h-9 px-3 rounded bg-input border border-border text-sm" />
              </div>
            </div>

            <div className="flex items-center gap-1 border-b border-border">
              {([
                { k: "seed", label: "Synthetic Seed", icon: Sparkles },
                { k: "upload", label: "Upload CSV", icon: FileSpreadsheet },
              ] as const).map(({ k, label, icon: Icon }) => (
                <button key={k} onClick={() => setTab(k)}
                  className={`h-9 px-4 text-xs font-medium inline-flex items-center gap-1.5 border-b-2 -mb-px transition-colors ${tab === k ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                  <Icon className="h-3.5 w-3.5" /> {label}
                </button>
              ))}
            </div>

            {tab === "seed" ? (
              <div className="space-y-4 pt-2">
                <p className="text-xs text-muted-foreground">Generates a realistic borrower portfolio across 10 sectors and 4 regions with full financials, behavior, and collateral data.</p>
                <div>
                  <div className="flex items-center justify-between text-xs mb-2"><span className="text-muted-foreground">Borrower count</span><span className="num font-semibold">{count}</span></div>
                  <input type="range" min={10} max={200} value={count} onChange={(e) => setCount(+e.target.value)} className="w-full accent-primary" />
                  <div className="flex justify-between text-[10px] text-muted-foreground mt-1"><span>10</span><span>200</span></div>
                </div>
              </div>
            ) : (
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">Upload a CSV with one borrower per row. Any column names are fine — you'll map them next.</p>
                  <button onClick={downloadTemplate} className="text-[11px] text-primary hover:underline inline-flex items-center gap-1"><Download className="h-3 w-3" /> Template</button>
                </div>
                <label className="block border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:bg-accent/20 transition-colors">
                  <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
                  <FileSpreadsheet className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <div className="text-sm font-medium">{csvRows.length ? `${csvRows.length} rows loaded · click to replace` : "Click to choose a CSV file"}</div>
                  <div className="text-[11px] text-muted-foreground mt-1">{csvHeaders.length ? csvHeaders.length + " columns detected" : "Max 10MB"}</div>
                </label>

                {csvHeaders.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs uppercase tracking-widest text-muted-foreground">Column Mapping</h4>
                      <span className="text-[11px] text-muted-foreground">{Object.keys(mapping).length} / {BORROWER_FIELDS.length} mapped</span>
                    </div>
                    <div className="grid md:grid-cols-2 gap-x-4 gap-y-2 max-h-96 overflow-y-auto p-1">
                      {BORROWER_FIELDS.map((f) => (
                        <div key={f.key} className="flex items-center gap-2 text-xs">
                          <div className="flex-1 truncate">
                            {f.label}
                            {f.required && <span className="text-danger ml-1">*</span>}
                            <div className="text-[10px] text-muted-foreground">{f.type}</div>
                          </div>
                          <select value={mapping[f.key] ?? ""} onChange={(e) => setMapping({ ...mapping, [f.key]: e.target.value })}
                            className="h-7 px-2 rounded bg-input border border-border text-[11px] min-w-[160px]">
                            <option value="">— skip —</option>
                            {csvHeaders.map((h) => <option key={h} value={h}>{h}</option>)}
                          </select>
                          {mapping[f.key] ? <CheckCircle2 className="h-3.5 w-3.5 text-success" /> : f.required ? <AlertCircle className="h-3.5 w-3.5 text-warning" /> : <span className="w-3.5" />}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {csvHeaders.length > 0 && (missingRequired.length > 0 || extraColumns.length > 0) && (
                  <div className="space-y-2 text-[11px]">
                    {extraColumns.length > 0 && (
                      <div className="rounded border border-info/30 bg-info/10 text-info p-2.5">
                        <div className="font-semibold mb-1">{extraColumns.length} extra column{extraColumns.length === 1 ? "" : "s"} will be ignored</div>
                        <div className="text-muted-foreground break-words">{extraColumns.join(", ")}</div>
                      </div>
                    )}
                    {missingRequired.length > 0 && (
                      <div className="rounded border border-warning/30 bg-warning/10 p-2.5 space-y-2">
                        <div className="font-semibold text-warning">{missingRequired.length} required field{missingRequired.length === 1 ? "" : "s"} not mapped</div>
                        <div className="text-muted-foreground">Missing: {missingRequired.map((f) => f.label).join(", ")}</div>
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input type="checkbox" checked={allowMissing} onChange={(e) => setAllowMissing(e.target.checked)} className="accent-primary" />
                          <span>Import anyway — fill the missing fields with safe defaults</span>
                        </label>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {error && <div className="text-xs text-danger bg-danger/10 border border-danger/30 rounded p-2.5">{error}</div>}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Link to="/assessments" className="h-9 px-3 text-xs rounded border border-border hover:bg-accent/40">Cancel</Link>
              <button onClick={create} disabled={busy || (tab === "upload" && !csvRows.length)}
                className="h-9 px-4 text-xs rounded bg-primary text-primary-foreground font-semibold hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-1.5">
                {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {tab === "seed" ? `Seed ${count} borrowers` : `Import ${csvRows.length} borrowers`}
              </button>
            </div>
          </div>
        </Panel>
      </div>
    </>
  );
}
