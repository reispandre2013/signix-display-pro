import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { TrendingUp, TrendingDown } from "lucide-react";

interface KpiCardProps {
  label: string;
  value: string | number;
  delta?: { value: string; up?: boolean };
  icon: LucideIcon;
  tone?: "primary" | "success" | "warning" | "destructive" | "info";
  hint?: string;
}

const tones = {
  primary: "from-primary/20 to-primary/0 text-primary",
  success: "from-success/20 to-success/0 text-success",
  warning: "from-warning/20 to-warning/0 text-warning",
  destructive: "from-destructive/20 to-destructive/0 text-destructive",
  info: "from-info/20 to-info/0 text-info",
};

export function KpiCard({ label, value, delta, icon: Icon, tone = "primary", hint }: KpiCardProps) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card p-5 shadow-card transition-smooth hover:border-primary/40">
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-60", tones[tone])} />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {label}
          </p>
          <p className="mt-2 font-display text-3xl font-bold tracking-tight">{value}</p>
          {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
        </div>
        <div className={cn("h-10 w-10 rounded-lg grid place-items-center", `bg-${tone}/10`)}>
          <Icon className={cn("h-5 w-5", tones[tone].split(" ").pop())} />
        </div>
      </div>
      {delta && (
        <div className="relative mt-3 flex items-center gap-1 text-xs font-medium">
          {delta.up ? (
            <TrendingUp className="h-3.5 w-3.5 text-success" />
          ) : (
            <TrendingDown className="h-3.5 w-3.5 text-destructive" />
          )}
          <span className={delta.up ? "text-success" : "text-destructive"}>{delta.value}</span>
          <span className="text-muted-foreground">vs. semana anterior</span>
        </div>
      )}
    </div>
  );
}
