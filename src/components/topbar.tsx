import { Search, Bell, Download, LogOut, Plus } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useActivePortfolio } from "@/lib/portfolio-context";

export function Topbar({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const { assessment, portfolio } = useActivePortfolio();
  const initials = (user?.email ?? "U").slice(0, 2).toUpperCase();

  const signOut = async () => {
    setMenuOpen(false);
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const exportCsv = () => {
    if (!portfolio.length) { alert("No active assessment to export. Create or open one from the Assessments page."); return; }
    const cols = Object.keys(portfolio[0]);
    const esc = (v: unknown) => {
      const s = v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [cols.join(","), ...portfolio.map((r) => cols.map((c) => esc((r as any)[c])).join(","))].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(assessment?.name ?? "portfolio").replace(/[^\w.-]+/g, "_")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <header className="h-14 border-b border-border bg-panel flex items-center px-5 gap-4 sticky top-0 z-10 backdrop-blur">
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-widest text-muted-foreground">{subtitle ?? "Module"}</div>
        <h1 className="text-[15px] font-semibold tracking-tight truncate">{title}</h1>
      </div>
      <div className="flex-1 max-w-md ml-6 hidden lg:block">
        <div className="relative">
          <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input placeholder="Search borrower, ticker, facility…" className="w-full h-8 pl-8 pr-3 text-xs rounded bg-input border border-border focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground" />
          <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground border border-border px-1.5 rounded">⌘K</kbd>
        </div>
      </div>
      <div className="ml-auto flex items-center gap-2">
        {assessment && (
          <div className="hidden md:flex items-center gap-1.5 h-8 px-2.5 rounded border border-border bg-accent/30 text-[11px]">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            <span className="text-muted-foreground">Assessment:</span>
            <span className="font-medium max-w-[180px] truncate">{assessment.name}</span>
          </div>
        )}
        {right}
        <Link to="/assessments/new" className="h-8 px-2.5 rounded bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 inline-flex items-center gap-1.5"><Plus className="h-3.5 w-3.5" /> New</Link>
        <button onClick={exportCsv} className="h-8 px-2.5 rounded border border-border text-xs hover:bg-accent hidden sm:flex items-center gap-1.5"><Download className="h-3.5 w-3.5" /> Export</button>
        <button className="h-8 w-8 grid place-items-center rounded border border-border hover:bg-accent"><Bell className="h-3.5 w-3.5" /></button>
        <div className="relative">
          <button onClick={() => setMenuOpen((v) => !v)} className="h-8 w-8 rounded-full bg-accent grid place-items-center text-xs font-semibold border border-border" title={user?.email ?? ""}>{initials}</button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-1 w-52 z-20 text-xs panel-elev shadow-lg rounded border border-border">
                <div className="px-3 py-2 border-b border-border truncate text-muted-foreground">{user?.email}</div>
                <button onClick={signOut} className="w-full text-left px-3 py-2 hover:bg-accent inline-flex items-center gap-2"><LogOut className="h-3 w-3" /> Sign out</button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
