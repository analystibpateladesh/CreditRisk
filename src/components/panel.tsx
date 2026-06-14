import type { ReactNode } from "react";

export function Panel({
  title, subtitle, right, children, className = "", dense = false,
}: {
  title?: string; subtitle?: string; right?: ReactNode; children: ReactNode; className?: string; dense?: boolean;
}) {
  return (
    <section className={`panel ${className}`}>
      {(title || right) && (
        <header className="flex items-center justify-between px-4 h-10 border-b border-border">
          <div className="min-w-0">
            {title && <h3 className="text-[12px] font-semibold uppercase tracking-widest">{title}</h3>}
            {subtitle && <p className="text-[10px] text-muted-foreground -mt-0.5">{subtitle}</p>}
          </div>
          {right}
        </header>
      )}
      <div className={dense ? "" : "p-4"}>{children}</div>
    </section>
  );
}
