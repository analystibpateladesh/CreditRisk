import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet, Link, createRootRouteWithContext, useRouter, useRouterState,
  HeadContent, Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AppSidebar } from "@/components/app-sidebar";
import { AiAnalystBubble } from "@/components/ai-analyst-bubble";
import { PortfolioProvider } from "@/lib/portfolio-context";
import { AuthProvider, useAuth } from "@/hooks/use-auth";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">The page you're looking for doesn't exist.</p>
        <Link to="/" className="mt-6 inline-flex items-center justify-center rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Go home</Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  useEffect(() => { reportLovableError(error, { boundary: "tanstack_root_error_component" }); }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button onClick={() => { router.invalidate(); reset(); }} className="mt-6 rounded bg-primary px-4 py-2 text-sm text-primary-foreground">Try again</button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "CreditRisk Pro — AI Credit Risk & Portfolio Intelligence" },
      { name: "description", content: "Institutional-grade AI credit risk platform: scoring, PD, LGD, expected loss, explainability, and portfolio analytics." },
      { property: "og:title", content: "CreditRisk Pro — AI Credit Risk & Portfolio Intelligence" },
      { name: "twitter:title", content: "CreditRisk Pro — AI Credit Risk & Portfolio Intelligence" },
      { property: "og:description", content: "Institutional-grade AI credit risk platform: scoring, PD, LGD, expected loss, explainability, and portfolio analytics." },
      { name: "twitter:description", content: "Institutional-grade AI credit risk platform: scoring, PD, LGD, expected loss, explainability, and portfolio analytics." },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' rx='12' fill='%230ea5e9'/><text x='50%25' y='54%25' text-anchor='middle' font-family='Inter,Arial,sans-serif' font-weight='700' font-size='28' fill='white' dominant-baseline='middle'>CR</text></svg>" },
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PortfolioProvider>
          <AppShell />
        </PortfolioProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

function AppShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const router = useRouter();
  const { user, loading } = useAuth();
  const isAuthRoute = pathname === "/auth";

  useEffect(() => {
    if (!loading && !user && !isAuthRoute) {
      router.navigate({ to: "/auth", replace: true });
    }
  }, [loading, user, isAuthRoute, router]);

  if (isAuthRoute) {
    return <Outlet />;
  }
  if (loading || !user) {
    return (
      <div className="min-h-screen grid place-items-center bg-background text-muted-foreground text-sm">
        Loading…
      </div>
    );
  }
  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <AppSidebar />
      <main className="flex-1 min-w-0 flex flex-col">
        <Outlet />
      </main>
      <AiAnalystBubble />
    </div>
  );
}
