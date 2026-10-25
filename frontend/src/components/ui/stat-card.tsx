import * as React from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  variant?: "default" | "primary" | "success" | "warning" | "destructive";
  trend?: {
    value: string;
    positive?: boolean;
  };
}

export function StatCard({
  label,
  value,
  description,
  icon: Icon,
  variant = "default",
  trend,
  className,
  ...props
}: StatCardProps) {
  const iconVariants = {
    default: "bg-muted text-muted-foreground",
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    destructive: "bg-destructive/10 text-destructive",
  };

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-5 text-card-foreground shadow-sm transition-all hover:shadow-md hover:border-border/80",
        className
      )}
      {...props}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl", iconVariants[variant])}>
          <Icon className="h-4 w-4" />
        </div>
      </div>

      <div className="mt-3 flex items-baseline justify-between">
        <span className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {value}
        </span>
        {trend && (
          <span
            className={cn(
              "text-xs font-medium",
              trend.positive ? "text-success" : "text-muted-foreground"
            )}
          >
            {trend.value}
          </span>
        )}
      </div>

      {description && (
        <p className="mt-1.5 text-xs text-muted-foreground truncate">{description}</p>
      )}
    </div>
  );
}
