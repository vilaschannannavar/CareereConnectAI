"use client";

import React, { useState } from "react";
import { Button, ButtonProps } from "@/components/ui/button";
import { useCapabilities } from "@/context/CapabilityContext";
import { AlertCircle, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

export interface HonestButtonProps extends ButtonProps {
  /** The backend capability key that gates this button's functionality. */
  capabilityKey?: string;
  /** Explicit fallback reason if disabled without a registry entry. */
  disabledReason?: string;
}

/**
 * HonestButton guarantees no "placeholder buttons" exist.
 * If a feature is disabled or not yet supported according to the backend
 * Capability Registry, the button is visibly disabled and displays an honest explanation.
 */
export function HonestButton({
  capabilityKey,
  disabledReason: explicitReason,
  children,
  className,
  disabled,
  ...props
}: HonestButtonProps) {
  const { isCapabilityEnabled, getDisabledReason } = useCapabilities();
  const [showTooltip, setShowTooltip] = useState(false);

  // If a capabilityKey is specified, check against backend registry
  const isEnabled = capabilityKey ? isCapabilityEnabled(capabilityKey) : true;
  const registryReason = capabilityKey ? getDisabledReason(capabilityKey) : undefined;
  const reason = explicitReason || registryReason || "This capability is currently disabled.";

  const isDisabled = disabled || !isEnabled;

  return (
    <div
      data-testid="honest-button-wrapper"
      className="relative inline-flex flex-col items-start"
      onMouseEnter={() => {
        if (isDisabled) setShowTooltip(true);
      }}
      onMouseLeave={() => {
        setShowTooltip(false);
      }}
    >
      <Button
        {...props}
        disabled={isDisabled}
        className={cn(isDisabled && "cursor-not-allowed opacity-60", className)}
        aria-disabled={isDisabled}
      >
        {children}
        {isDisabled && <Lock className="ml-2 h-3.5 w-3.5 text-slate-400" />}
      </Button>

      {/* Honest disabled explanation tooltip */}
      {isDisabled && showTooltip && (
        <div
          role="tooltip"
          className="absolute bottom-full mb-2 left-0 z-50 w-72 rounded-lg bg-slate-900 p-2.5 text-xs text-white shadow-xl"
        >
          <div className="flex items-start gap-1.5">
            <AlertCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-200">Feature Policy Notice</p>
              <p className="mt-0.5 text-slate-300">{reason}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
