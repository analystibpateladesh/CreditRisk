import type { Grade } from "@/lib/risk-models";
import { gradeBand } from "@/lib/risk-models";

const COLOR: Record<Grade, string> = {
  AAA: "bg-success/15 text-success border-success/30",
  AA:  "bg-success/15 text-success border-success/30",
  A:   "bg-info/15 text-info border-info/30",
  BBB: "bg-info/15 text-info border-info/30",
  BB:  "bg-warning/15 text-warning border-warning/30",
  B:   "bg-warning/20 text-warning border-warning/40",
  CCC: "bg-danger/15 text-danger border-danger/30",
  CC:  "bg-danger/20 text-danger border-danger/40",
  C:   "bg-danger/25 text-danger border-danger/50",
  D:   "bg-destructive/25 text-destructive-foreground border-destructive/60",
};

export function RatingBadge({ grade, size = "sm" }: { grade: Grade; size?: "sm" | "lg" }) {
  const cls = COLOR[grade];
  const sz = size === "lg" ? "text-sm px-2.5 py-1" : "text-[11px] px-1.5 py-0.5";
  return (
    <span title={`${grade} · ${gradeBand(grade)} grade`} className={`inline-flex items-center font-mono font-semibold rounded border ${sz} ${cls}`}>{grade}</span>
  );
}
