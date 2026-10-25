import React from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Download, X } from "lucide-react";

interface BulkActionsBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onBatchAnalyze: () => void;
  isAnalyzing?: boolean;
}

export function BulkActionsBar({
  selectedCount,
  onClearSelection,
  onBatchAnalyze,
  isAnalyzing = false,
}: BulkActionsBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 rounded-2xl border border-primary/30 bg-card/95 p-3 px-5 shadow-2xl backdrop-blur-md animate-fade-in text-xs">
      <span className="font-semibold text-foreground">
        {selectedCount} contact{selectedCount === 1 ? "" : "s"} selected
      </span>

      <div className="h-4 w-px bg-border" />

      <Button
        size="sm"
        onClick={onBatchAnalyze}
        disabled={isAnalyzing}
        className="h-8 gap-1.5 font-semibold shadow-xs"
      >
        <Sparkles className="h-3.5 w-3.5" />
        <span>{isAnalyzing ? "Evaluating..." : "Batch Score Selected"}</span>
      </Button>

      <button
        onClick={onClearSelection}
        className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors ml-1"
        aria-label="Clear selection"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
