import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StepItem {
  id: string;
  label: string;
  description?: string;
}

interface StepperProps {
  steps: StepItem[];
  currentStep: number;
  onStepClick?: (stepIndex: number) => void;
  className?: string;
}

export function Stepper({
  steps,
  currentStep,
  onStepClick,
  className,
}: StepperProps) {
  return (
    <nav aria-label="Progress" className={cn("w-full py-2", className)}>
      <ol className="flex items-center justify-between gap-2 sm:gap-4">
        {steps.map((step, idx) => {
          const isCompleted = idx < currentStep;
          const isCurrent = idx === currentStep;
          const isClickable = !!onStepClick && isCompleted;

          return (
            <li key={step.id || step.label || idx} className="relative flex-1">
              <button
                type="button"
                disabled={!isClickable}
                onClick={() => isClickable && onStepClick?.(idx)}
                className={cn(
                  "group flex w-full flex-col items-center sm:items-start text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg p-1",
                  !isClickable && "cursor-default"
                )}
                aria-current={isCurrent ? "step" : undefined}
              >
                <div className="flex items-center w-full">
                  <div
                    className={cn(
                      "flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl text-xs font-semibold transition-all shadow-sm",
                      isCompleted
                        ? "bg-primary text-primary-foreground"
                        : isCurrent
                        ? "border-2 border-primary bg-background text-primary ring-4 ring-primary/10"
                        : "border border-border bg-muted/60 text-muted-foreground"
                    )}
                  >
                    {isCompleted ? (
                      <Check className="h-4 w-4 stroke-[3]" />
                    ) : (
                      <span>{idx + 1}</span>
                    )}
                  </div>
                  {idx < steps.length - 1 && (
                    <div
                      className={cn(
                        "hidden sm:block ml-3 h-0.5 w-full flex-1 rounded transition-colors",
                        isCompleted ? "bg-primary" : "bg-border"
                      )}
                    />
                  )}
                </div>
                <div className="mt-2 text-center sm:text-left">
                  <p
                    className={cn(
                      "text-xs font-medium tracking-tight",
                      isCurrent
                        ? "text-primary font-semibold"
                        : isCompleted
                        ? "text-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    {step.label}
                  </p>
                  {step.description && (
                    <p className="hidden md:block text-[11px] text-muted-foreground/80 truncate">
                      {step.description}
                    </p>
                  )}
                </div>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
