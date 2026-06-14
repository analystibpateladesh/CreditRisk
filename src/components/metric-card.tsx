import { ArrowDownRight, ArrowUpRight } from "lucide-react";

export function MetricCard({
  label, value, sub, delta, tone = "neutral",
}: {
  label: string; value: React.ReactNode; sub?: React.ReactNode;
  delta?: { value: string; positive: boolean };
  tone?: "neutral" | "positive" | "warning" | "danger";
}) {
  const toneRail = {
    neutral: "before:bg-border",
    positive: "before:bg-success",
    warning: "before:bg-warning",
    danger: "before:bg-danger",
  }[tone];

  return (
    <div className={`panel relative px-4 py-3 overflow-hidden before:absolute before:left-0 before:top-0 before:bottom-0 before:w-0.5 ${toneRail}`}>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-1.5 flex items-baseline gap-2">
        <div className="num text-2xl font-semibold">{value}</div>
        {delta && (
          <span className={`inline-flex items-center text-[11px] font-medium ${delta.positive ? "text-success" : "text-danger"}`}>
            {delta.positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}{delta.value}
          </span>
        )}
      </div>
      {sub && <div className="text-[11px] text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}
