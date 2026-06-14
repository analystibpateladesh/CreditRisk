import { Link } from "@tanstack/react-router";
import { Loader2, Plus, History } from "lucide-react";
import { Topbar } from "./topbar";

export function EmptyAssessment({ loading }: { loading?: boolean }) {
  if (loading) {
    return (
      <>
        <Topbar title="Loading assessment…" />
        <div className="flex-1 grid place-items-center text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin" /></div>
      </>
    );
  }
  return (
    <>
      <Topbar title="No active assessment" subtitle="Pick one from history or create a new one to start" />
      <div className="flex-1 grid place-items-center p-10">
        <div className="max-w-md text-center space-y-5">
          <div className="h-16 w-16 mx-auto rounded-full bg-primary/10 grid place-items-center">
            <Plus className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Start your first risk run</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Seed a realistic synthetic portfolio in one click, or upload your own borrower CSV with full column mapping.
              Every assessment is saved to your workspace history.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2">
            <Link to="/assessments/new" className="h-10 px-4 rounded bg-primary text-primary-foreground text-sm font-semibold inline-flex items-center gap-2 hover:opacity-90">
              <Plus className="h-4 w-4" /> New Assessment
            </Link>
            <Link to="/assessments" className="h-10 px-4 rounded border border-border text-sm font-medium inline-flex items-center gap-2 hover:bg-accent/40">
              <History className="h-4 w-4" /> View history
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
