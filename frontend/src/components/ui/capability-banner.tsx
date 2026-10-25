"use client";

import * as React from "react";
import Link from "next/link";
import { ShieldCheck, Info, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface CapabilityBannerProps extends React.HTMLAttributes<HTMLDivElement> {
  compact?: boolean;
}

export function CapabilityBanner({ compact = false, className, ...props }: CapabilityBannerProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-950 dark:text-emerald-200 p-3.5 sm:p-4 text-xs shadow-xs",
        compact && "py-2 px-3",
        className
      )}
      role="status"
      aria-label="Compliance status"
      {...props}
    >
      <div className="flex items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <span className="font-semibold text-emerald-900 dark:text-emerald-100 mr-1.5">
              Manual Sending Mode Active:
            </span>
            <span className="text-emerald-800/90 dark:text-emerald-300">
              Drafts are crafted for manual review. You send every message yourself on LinkedIn. Zero password sharing, zero scraping.
            </span>
          </div>
        </div>
        <Link
          href="/privacy"
          className="shrink-0 flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
        >
          <span>Guarantees</span>
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
