"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Sparkles, CheckCircle2, ArrowRight, Loader2, Star, Building, Briefcase } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";

interface Step5Props {
  onFinish: () => void;
}

export function Step5ReviewAndLaunch({ onFinish }: Step5Props) {
  const router = useRouter();
  const [isScoring, setIsScoring] = useState(false);
  const [scoringResults, setScoringResults] = useState<any>(null);

  const handleRunBatchScore = async () => {
    setIsScoring(true);
    try {
      const data = await api.post("/scoring/batch-analyze");
      setScoringResults(data);
      toast.success(`Scored ${data.total_processed || 0} connections!`);
    } catch (err: any) {
      toast.error(err.message || "Failed to run batch score.");
    } finally {
      setIsScoring(false);
    }
  };

  const handleComplete = async () => {
    try {
      await api.put("/profile", {
        preferences: {
          onboarding_completed: true,
          onboarding_step: 5,
        },
      });
      onFinish();
      router.push("/shortlist");
    } catch {
      router.push("/shortlist");
    }
  };

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold text-foreground">Step 5: Run Batch Relevance Scoring</h2>
        <p className="text-sm text-muted-foreground">
          Score your network against your goals using the deterministic 5-factor model.
        </p>
      </div>

      {!scoringResults ? (
        <Card className="p-8 text-center space-y-4 border-border bg-card">
          <div className="p-4 bg-primary/10 text-primary rounded-full w-fit mx-auto">
            <Sparkles className="h-8 w-8" />
          </div>

          <div className="space-y-1">
            <h3 className="text-base font-bold text-foreground">Ready to Analyze</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Our explainable engine calculates Role, Seniority, Company, Skill Domain, and Referral evidence.
            </p>
          </div>

          <Button
            size="lg"
            onClick={handleRunBatchScore}
            disabled={isScoring}
            className="gap-2 shadow-md"
          >
            {isScoring ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Analyzing Network...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span>Run Batch Scoring</span>
              </>
            )}
          </Button>
        </Card>
      ) : (
        <div className="space-y-4 animate-in fade-in">
          <Card className="p-5 bg-card border-border space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-foreground">Batch Analysis Complete</span>
              <Badge variant="outline" className="text-xs text-emerald-600 bg-emerald-500/10 border-emerald-500/20">
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Ready
              </Badge>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center pt-2">
              <div className="p-2.5 rounded-lg bg-muted/40">
                <p className="text-lg font-bold text-foreground">{scoringResults.total_processed || 0}</p>
                <p className="text-[11px] text-muted-foreground">Processed</p>
              </div>
              <div className="p-2.5 rounded-lg bg-muted/40">
                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  {scoringResults.high_priority_count || 0}
                </p>
                <p className="text-[11px] text-muted-foreground">High Priority</p>
              </div>
              <div className="p-2.5 rounded-lg bg-muted/40">
                <p className="text-lg font-bold text-primary">{scoringResults.cached_hits || 0}</p>
                <p className="text-[11px] text-muted-foreground">Cached</p>
              </div>
            </div>

            <div className="p-3 bg-muted/30 border border-border/50 rounded-lg text-xs text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Honest reminder:</strong> A high score represents career relevance and alignment with your target goals, not a guarantee that this contact is actively hiring.
            </div>
          </Card>

          <Button
            size="lg"
            onClick={handleComplete}
            className="w-full gap-2 text-base font-semibold shadow-md"
          >
            <span>Finish & Open Shortlist</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
