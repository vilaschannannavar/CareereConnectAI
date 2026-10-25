"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Contact } from "@/lib/schemas";
import { Analysis } from "../hooks/useShortlists";
import { Sparkles, ShieldCheck, AlertCircle, Info } from "lucide-react";

interface ScoreExplanationDrawerProps {
  contact: Contact | null;
  analysis: Analysis | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ScoreExplanationDrawer({
  contact,
  analysis,
  open,
  onOpenChange,
}: ScoreExplanationDrawerProps) {
  if (!contact || !analysis) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-xl font-bold">
                Score Explanation: {contact.first_name} {contact.last_name}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {contact.position} at {contact.company}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Top Score Banner */}
          <div className="grid grid-cols-3 gap-3 text-center bg-muted/40 p-4 rounded-xl border border-border">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Match Score</p>
              <p className="text-2xl font-extrabold text-foreground mt-0.5">
                {analysis.score} / 100
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Priority Tier</p>
              <p className="text-2xl font-extrabold text-primary mt-0.5">
                {analysis.priority}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Confidence</p>
              <p className="text-2xl font-extrabold text-foreground mt-0.5">
                {Math.round(analysis.confidence * 100)}%
              </p>
            </div>
          </div>

          {/* 5-Factor Table */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
              5-Factor Evidence &amp; Weight Breakdown
            </h4>
            <div className="border border-border rounded-xl overflow-hidden text-xs">
              <table className="w-full border-collapse">
                <thead className="bg-muted/60 border-b border-border text-muted-foreground">
                  <tr>
                    <th className="p-2.5 text-left font-medium">Evaluation Factor</th>
                    <th className="p-2.5 text-center font-medium">Sub-Score</th>
                    <th className="p-2.5 text-center font-medium">Weight</th>
                    <th className="p-2.5 text-left font-medium">Verified Evidence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {Object.entries(analysis.factor_breakdown || {}).map(([key, f]) => (
                    <tr key={key} className={!f.is_scorable ? "bg-muted/20 text-muted-foreground/60" : ""}>
                      <td className="p-2.5 font-medium capitalize text-foreground">
                        {key.replace(/_/g, " ")}
                      </td>
                      <td className="p-2.5 text-center font-bold text-foreground">
                        {f.is_scorable ? f.sub_score : "—"}
                      </td>
                      <td className="p-2.5 text-center text-muted-foreground">
                        {f.normalized_weight}%
                      </td>
                      <td className="p-2.5 text-muted-foreground">{f.evidence}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Classification Rationales */}
          {analysis.reasons && analysis.reasons.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Classification Rationales
              </h4>
              <ul className="list-disc pl-5 text-xs text-muted-foreground space-y-1">
                {analysis.reasons.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Missing info notice */}
          {analysis.missing_info && analysis.missing_info.length > 0 && (
            <div className="rounded-xl border border-warning/30 bg-warning/10 p-3.5 text-xs text-warning-foreground dark:text-warning space-y-1">
              <div className="flex items-center gap-1.5 font-semibold">
                <AlertCircle className="h-4 w-4" />
                <span>Missing / Unverified Data:</span>
              </div>
              <ul className="list-disc pl-5 space-y-0.5 text-muted-foreground">
                {analysis.missing_info.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Close Breakdown</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
