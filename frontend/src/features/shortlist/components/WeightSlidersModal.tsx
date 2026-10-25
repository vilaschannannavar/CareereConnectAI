"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScoringWeights } from "../hooks/useShortlists";
import { Sliders, RotateCcw } from "lucide-react";

interface WeightSlidersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  weights: ScoringWeights;
  onSaveWeights: (weights: ScoringWeights) => void;
}

const DEFAULT_WEIGHTS: ScoringWeights = {
  role_relevance: 30,
  ability_to_help: 25,
  company_industry: 20,
  technical_domain: 15,
  recruitment_referral_evidence: 10,
};

export function WeightSlidersModal({
  open,
  onOpenChange,
  weights: initialWeights,
  onSaveWeights,
}: WeightSlidersModalProps) {
  const [weights, setWeights] = useState<ScoringWeights>(initialWeights);

  const totalWeight =
    weights.role_relevance +
    weights.ability_to_help +
    weights.company_industry +
    weights.technical_domain +
    weights.recruitment_referral_evidence;

  const handleChange = (key: keyof ScoringWeights, val: number) => {
    setWeights((prev) => ({ ...prev, [key]: val }));
  };

  const handleReset = () => {
    setWeights(DEFAULT_WEIGHTS);
  };

  const handleApply = () => {
    onSaveWeights(weights);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Sliders className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg">Scoring Weights & Criteria</DialogTitle>
              <DialogDescription className="text-xs">
                Configure 5-factor importance. Weights automatically renormalize when factors lack evidence.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          <div className="flex items-center justify-between text-muted-foreground font-medium pb-1 border-b border-border/40">
            <span>Factor</span>
            <span>Weight ({totalWeight}%)</span>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between mb-1">
                <label className="font-semibold text-foreground">Role Relevance (Recruiter/Engineering Alignment)</label>
                <span className="font-bold text-primary">{weights.role_relevance}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                value={weights.role_relevance}
                onChange={(e) => handleChange("role_relevance", Number(e.target.value))}
                className="w-full accent-primary h-1.5 rounded-lg bg-muted cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <label className="font-semibold text-foreground">Ability to Help (Seniority / Staff Level)</label>
                <span className="font-bold text-primary">{weights.ability_to_help}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                value={weights.ability_to_help}
                onChange={(e) => handleChange("ability_to_help", Number(e.target.value))}
                className="w-full accent-primary h-1.5 rounded-lg bg-muted cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <label className="font-semibold text-foreground">Company &amp; Industry (Target Employer Match)</label>
                <span className="font-bold text-primary">{weights.company_industry}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                value={weights.company_industry}
                onChange={(e) => handleChange("company_industry", Number(e.target.value))}
                className="w-full accent-primary h-1.5 rounded-lg bg-muted cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <label className="font-semibold text-foreground">Technical Domain Alignment</label>
                <span className="font-bold text-primary">{weights.technical_domain}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                value={weights.technical_domain}
                onChange={(e) => handleChange("technical_domain", Number(e.target.value))}
                className="w-full accent-primary h-1.5 rounded-lg bg-muted cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <label className="font-semibold text-foreground">Recruitment &amp; Referral Evidence</label>
                <span className="font-bold text-primary">{weights.recruitment_referral_evidence}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                value={weights.recruitment_referral_evidence}
                onChange={(e) => handleChange("recruitment_referral_evidence", Number(e.target.value))}
                className="w-full accent-primary h-1.5 rounded-lg bg-muted cursor-pointer"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between gap-2 sm:gap-0">
          <Button variant="ghost" size="sm" onClick={handleReset} className="gap-1.5 text-xs text-muted-foreground">
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset Defaults</span>
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleApply}>
              Save &amp; Re-Score
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
