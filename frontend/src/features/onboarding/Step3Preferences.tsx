"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Sliders, ArrowRight, ArrowLeft, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";

interface Step3Props {
  onNext: (preferences: any) => void;
  onBack: () => void;
}

export function Step3Preferences({ onNext, onBack }: Step3Props) {
  const [roleWeight, setRoleWeight] = useState(30);
  const [oppWeight, setOppWeight] = useState(25);
  const [compWeight, setCompWeight] = useState(20);
  const [techWeight, setTechWeight] = useState(15);
  const [refWeight, setRefWeight] = useState(10);
  const [tone, setTone] = useState("formal");
  const [isSaving, setIsSaving] = useState(false);

  const total = roleWeight + oppWeight + compWeight + techWeight + refWeight;

  const handleContinue = async () => {
    if (total !== 100) {
      toast.error(`Weights must total 100%. Current sum: ${total}%.`);
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        preferences: {
          scoring_weights: {
            role_relevance: roleWeight,
            ability_to_help: oppWeight,
            company_industry: compWeight,
            technical_domain: techWeight,
            recruitment_referral_evidence: refWeight,
          },
          preferred_tone: tone,
        },
      };

      await api.put("/profile", payload);
      toast.success("Scoring weights configured!");
      onNext(payload);
    } catch {
      toast.error("Failed to update preferences.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold text-foreground">Step 3: Scoring & Tone Preferences</h2>
        <p className="text-sm text-muted-foreground">
          Calibrate the deterministic 5-factor relevance engine to emphasize what matters most to you.
        </p>
      </div>

      <div className="bg-card border border-border p-6 rounded-2xl space-y-5 shadow-xs">
        <div className="flex items-center justify-between border-b border-border/50 pb-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Sliders className="h-4 w-4 text-primary" />
            <span>Dimension Weights</span>
          </div>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${total === 100 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-destructive/10 text-destructive"}`}>
            Sum: {total}% / 100%
          </span>
        </div>

        <div className="space-y-3">
          {[
            { label: "Role Relevance", val: roleWeight, set: setRoleWeight },
            { label: "Ability to Help (Seniority)", val: oppWeight, set: setOppWeight },
            { label: "Company & Industry Alignment", val: compWeight, set: setCompWeight },
            { label: "Technical Domain / Skills", val: techWeight, set: setTechWeight },
            { label: "Recruiter / Referral Evidence", val: refWeight, set: setRefWeight },
          ].map((item) => (
            <div key={item.label} className="space-y-1">
              <div className="flex justify-between text-xs font-medium text-foreground">
                <span>{item.label}</span>
                <span>{item.val}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="60"
                value={item.val}
                onChange={(e) => item.set(parseInt(e.target.value) || 0)}
                className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>
          ))}
        </div>

        <div className="pt-3 border-t border-border/50 space-y-1.5">
          <label className="text-xs font-semibold text-foreground">Default Outreach Tone</label>
          <Select value={tone} onValueChange={setTone}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="formal">Formal & Professional</SelectItem>
              <SelectItem value="conversational">Warm & Conversational</SelectItem>
              <SelectItem value="enthusiastic">Energetic & Enthusiastic</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="pt-4 border-t border-border flex items-center justify-between">
          <Button type="button" variant="outline" onClick={onBack} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <Button onClick={handleContinue} disabled={isSaving || total !== 100} className="gap-2">
            <CheckCircle2 className="h-4 w-4" />
            {isSaving ? "Saving..." : "Continue"}
          </Button>
        </div>
      </div>
    </div>
  );
}
