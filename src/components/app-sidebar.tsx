import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Users, Gauge, Activity, ShieldAlert,
  Layers, Sparkles, BadgeCheck, Plus, History, Network,
} from "lucide-react";
import { useActivePortfolio } from "@/lib/portfolio-context";

const nav = [
  { group: "Overview", items: [
    { to: "/", label: "Executive Dashboard", icon: LayoutDashboard },
  ]},
  { group: "Borrower Intelligence", items: [
    { to: "/borrowers", label: "Borrower Profiler", icon: Users },
    { to: "/scoring", label: "Credit Scoring Engine", icon: Gauge },
    { to: "/ratings", label: "Risk Rating & Segmentation", icon: BadgeCheck },
  ]},
  { group: "Risk Models", items: [
    { to: "/pd", label: "Probability of Default", icon: Activity },
    { to: "/lgd", label: "Loss Given Default", icon: ShieldAlert },
    { to: "/expected-loss", label: "Expected Loss Engine", icon: Layers },
    { to: "/concentration", label: "Concentration & Correlation", icon: Network },
    { to: "/explainability", label: "Explainable AI (SHAP)", icon: Sparkles },
  ]},
];

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { assessment } = useActivePortfolio();
  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="h-14 flex items-center gap-2 px-4 border-b border-sidebar-border">
        <div className="h-7 w-7 rounded-sm bg-primary text-primary-foreground grid place-items-center font-bold text-xs">CR</div>
        <div className="leading-tight">
          <div className="text-sm font-semibold tracking-tight">CreditRisk Pro</div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Risk Terminal v1.0</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-3">
        <div className="px-3 py-2">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground px-2 mb-1.5">Assessments</div>
          <ul className="space-y-0.5">
            <li>
              <Link to="/assessments/new" className={`flex items-center gap-2.5 px-2 py-1.5 rounded text-sm transition-colors ${pathname === "/assessments/new" ? "bg-sidebar-accent text-sidebar-accent-foreground border-l-2 border-primary pl-[6px]" : "hover:bg-sidebar-accent/60"}`}>
                <Plus className="h-4 w-4 opacity-80" /><span>New Assessment</span>
              </Link>
            </li>
            <li>
              <Link to="/assessments" className={`flex items-center gap-2.5 px-2 py-1.5 rounded text-sm transition-colors ${pathname === "/assessments" ? "bg-sidebar-accent text-sidebar-accent-foreground border-l-2 border-primary pl-[6px]" : "hover:bg-sidebar-accent/60"}`}>
                <History className="h-4 w-4 opacity-80" /><span>History</span>
              </Link>
            </li>
          </ul>
          {assessment && (
            <div className="mt-2 mx-1 p-2 rounded border border-sidebar-border bg-sidebar-accent/30 text-[10px]">
              <div className="text-muted-foreground uppercase tracking-widest mb-1">Active</div>
              <div className="text-sidebar-accent-foreground font-medium truncate">{assessment.name}</div>
              <div className="text-muted-foreground mt-0.5">{assessment.kind === "seed" ? "Synthetic" : "Uploaded"} · {new Date(assessment.created_at).toLocaleDateString()}</div>
            </div>
          )}
        </div>

        {nav.map((g) => (
          <div key={g.group} className="px-3 py-2">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground px-2 mb-1.5">{g.group}</div>
            <ul className="space-y-0.5">
              {g.items.map((it) => {
                const active = pathname === it.to || (it.to !== "/" && pathname.startsWith(it.to));
                const Icon = it.icon;
                return (
                  <li key={it.to}>
                    <Link to={it.to} className={`flex items-center gap-2.5 px-2 py-1.5 rounded text-sm transition-colors ${active ? "bg-sidebar-accent text-sidebar-accent-foreground border-l-2 border-primary pl-[6px]" : "hover:bg-sidebar-accent/60 text-sidebar-foreground/85"}`}>
                      <Icon className="h-4 w-4 opacity-80" /><span>{it.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-sidebar-border p-3 text-[11px] text-muted-foreground">
        <div className="flex items-center justify-between">
          <span>Workspace sync</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" /> Live</span>
        </div>
      </div>
    </aside>
  );
}
