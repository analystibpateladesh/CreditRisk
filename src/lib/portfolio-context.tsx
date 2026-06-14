import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Borrower } from "./risk-models";
import type { AssessmentRow } from "./assessment-data";

type State = {
  assessment: AssessmentRow | null;
  portfolio: Borrower[];
  loading: boolean;
  setActive: (id: string | null) => Promise<void>;
  reload: () => Promise<void>;
};

const Ctx = createContext<State | null>(null);
const KEY = "creditrisk:activeAssessmentId";

export function PortfolioProvider({ children }: { children: ReactNode }) {
  const [assessment, setAssessment] = useState<AssessmentRow | null>(null);
  const [portfolio, setPortfolio] = useState<Borrower[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (id: string | null) => {
    if (!id) { setAssessment(null); setPortfolio([]); return; }
    setLoading(true);
    try {
      const [{ data: a }, { data: r }] = await Promise.all([
        supabase.from("assessments").select("*").eq("id", id).maybeSingle(),
        supabase.from("borrower_records").select("payload").eq("assessment_id", id),
      ]);
      if (a) {
        setAssessment(a as AssessmentRow);
        setPortfolio((r ?? []).map((x: any) => x.payload as Borrower));
      } else {
        localStorage.removeItem(KEY);
        setAssessment(null); setPortfolio([]);
      }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const id = typeof window !== "undefined" ? localStorage.getItem(KEY) : null;
    if (id) void load(id);
  }, [load]);

  const setActive = useCallback(async (id: string | null) => {
    if (typeof window !== "undefined") {
      if (id) localStorage.setItem(KEY, id);
      else localStorage.removeItem(KEY);
    }
    await load(id);
  }, [load]);

  const reload = useCallback(async () => {
    const id = typeof window !== "undefined" ? localStorage.getItem(KEY) : null;
    await load(id);
  }, [load]);

  return <Ctx.Provider value={{ assessment, portfolio, loading, setActive, reload }}>{children}</Ctx.Provider>;
}

export function useActivePortfolio() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useActivePortfolio must be inside PortfolioProvider");
  return ctx;
}

export function useBorrower(id: string): Borrower | undefined {
  const { portfolio } = useActivePortfolio();
  return portfolio.find((b) => b.id === id);
}
