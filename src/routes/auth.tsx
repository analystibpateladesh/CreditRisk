import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/use-auth";
import { ShieldCheck, Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — CreditRisk Pro" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/", replace: true });
  }, [user, loading, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setNotice(null); setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password, options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        setNotice("Check your inbox to confirm your email, then sign in.");
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (e: any) {
      const msg = e?.message ?? "Authentication failed";
      setError(/failed to fetch/i.test(msg)
        ? "Network blocked in this preview. Open the Published URL (top-right Publish) and try again — auth works there."
        : msg);
    }
    finally { setBusy(false); }
  };

  const google = async () => {
    setError(null); setBusy(true);
    try {
      const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
      if (r.error) setError(r.error.message ?? "Google sign-in failed");
    } catch (e: any) {
      setError(e?.message ?? "Google sign-in failed");
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between p-10 bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded bg-primary text-primary-foreground grid place-items-center font-bold text-sm">CR</div>
          <div>
            <div className="font-semibold tracking-tight">CreditRisk Pro</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Portfolio Intelligence Terminal</div>
          </div>
        </div>
        <div className="space-y-6 max-w-md">
          <h1 className="text-3xl font-semibold tracking-tight leading-tight">Institutional credit risk, scored on every borrower.</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Score borrowers, model PD / LGD / Expected Loss, run stress scenarios, and explain every decision —
            on synthetic seed portfolios or your own uploaded book.
          </p>
          <ul className="text-xs text-muted-foreground space-y-2">
            <li className="flex gap-2"><ShieldCheck className="h-3.5 w-3.5 text-primary mt-0.5" /> Workspace-scoped data with row-level security</li>
            <li className="flex gap-2"><ShieldCheck className="h-3.5 w-3.5 text-primary mt-0.5" /> Versioned assessment history — open any past run</li>
            <li className="flex gap-2"><ShieldCheck className="h-3.5 w-3.5 text-primary mt-0.5" /> Bring your own CSV or seed a realistic portfolio</li>
          </ul>
        </div>
        <div className="text-[10px] text-muted-foreground font-mono">v1.0 · SESSION · LO-7741</div>
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6">
          <div className="lg:hidden flex items-center gap-2">
            <div className="h-7 w-7 rounded bg-primary text-primary-foreground grid place-items-center font-bold text-xs">CR</div>
            <div className="font-semibold tracking-tight text-sm">CreditRisk Pro</div>
          </div>
          <div>
            <h2 className="text-xl font-semibold tracking-tight">{mode === "signin" ? "Welcome back" : "Create your account"}</h2>
            <p className="text-sm text-muted-foreground mt-1">{mode === "signin" ? "Sign in to access your workspace." : "Start scoring your portfolio in under a minute."}</p>
          </div>

          <button type="button" onClick={google} disabled={busy}
            className="w-full h-10 rounded border border-border bg-panel hover:bg-accent/40 text-sm font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
            <svg className="h-4 w-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.56c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.77c-.99.66-2.25 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.07H2.18a11 11 0 0 0 0 9.86l3.66-2.83z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.2 1.65l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z"/></svg>
            Continue with Google
          </button>

          <div className="flex items-center gap-3 text-[10px] uppercase tracking-widest text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> or email <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">Email</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full h-10 px-3 rounded bg-input border border-border text-sm" placeholder="you@bank.com" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Password</label>
              <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full h-10 px-3 rounded bg-input border border-border text-sm" placeholder="••••••••" />
            </div>
            {error && <div className="text-xs text-danger">{error}</div>}
            {notice && <div className="text-xs text-success">{notice}</div>}
            <button type="submit" disabled={busy}
              className="w-full h-10 rounded bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
              {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>

          <div className="text-xs text-center text-muted-foreground">
            {mode === "signin" ? "No account? " : "Have an account? "}
            <button type="button" onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(null); setNotice(null); }}
              className="text-primary hover:underline font-medium">
              {mode === "signin" ? "Create one" : "Sign in"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
