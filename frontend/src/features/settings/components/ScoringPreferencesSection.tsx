"use client";

import React, { useState, useEffect } from "react";
import { ProfileData } from "../hooks/useSettings";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Sliders, Sparkles, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface ScoringPreferencesSectionProps {
  profile?: ProfileData;
  onSave: (preferences: any) => Promise<void>;
}

export function ScoringPreferencesSection({ profile, onSave }: ScoringPreferencesSectionProps) {
  const [roleWeight, setRoleWeight] = useState(30);
  const [oppWeight, setOppWeight] = useState(25);
  const [compWeight, setCompWeight] = useState(20);
  const [techWeight, setTechWeight] = useState(15);
  const [refWeight, setRefWeight] = useState(10);
  const [tone, setTone] = useState("formal");
  const [retention, setRetention] = useState("indefinite");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (profile?.preferences) {
      const p = profile.preferences;
      if (p.preferred_tone) setTone(p.preferred_tone);
      if (p.retention_policy) setRetention(p.retention_policy);
      if (p.scoring_weights) {
        setRoleWeight(p.scoring_weights.role_relevance ?? 30);
        setOppWeight(p.scoring_weights.ability_to_help ?? 25);
        setCompWeight(p.scoring_weights.company_industry ?? 20);
        setTechWeight(p.scoring_weights.technical_domain ?? 15);
        setRefWeight(p.scoring_weights.recruitment_referral_evidence ?? 10);
      }
    }
  }, [profile]);

  const total = roleWeight + oppWeight + compWeight + techWeight + refWeight;

  const handleSave = async () => {
    if (total !== 100) {
      toast.error(`Weights must total exactly 100%. Current sum: ${total}%.`);
      return;
    }
    setIsSaving(true);
    try {
      await onSave({
        preferences: {
          scoring_weights: {
            role_relevance: roleWeight,
            ability_to_help: oppWeight,
            company_industry: compWeight,
            technical_domain: techWeight,
            recruitment_referral_evidence: refWeight,
          },
          preferred_tone: tone,
          retention_policy: retention,
        },
      });
      toast.success("Outreach preferences and scoring weights saved!");
    } catch (err: any) {
      toast.error(err?.message || "Failed to save preferences.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="h-4 w-4 text-primary" />
            Scoring Dimensions & Outreach Tone
          </div>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${total === 100 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-destructive/10 text-destructive"}`}>
            Total: {total}%
          </span>
        </CardTitle>
        <CardDescription>
          Adjust the 5 deterministic scoring factors and your default message voice.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {[
            { label: "Role Relevance", val: roleWeight, set: setRoleWeight },
            { label: "Ability to Help (Seniority)", val: oppWeight, set: setOppWeight },
            { label: "Company & Industry Alignment", val: compWeight, set: setCompWeight },
            { label: "Technical Domain / Skill Match", val: techWeight, set: setTechWeight },
            { label: "Recruiter / Referral Evidence", val: refWeight, set: setRefWeight },
          ].map((slider) => (
            <div key={slider.label} className="space-y-1">
              <div className="flex justify-between text-xs font-medium text-foreground">
                <span>{slider.label}</span>
                <span>{slider.val}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="60"
                value={slider.val}
                onChange={(e) => slider.set(parseInt(e.target.value) || 0)}
                className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-border">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Default Message Tone</label>
            <Select value={tone} onValueChange={setTone}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Select tone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="formal">Formal & Professional</SelectItem>
                <SelectItem value="conversational">Warm & Conversational</SelectItem>
                <SelectItem value="enthusiastic">Energetic & Enthusiastic</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Data Retention Window</label>
            <Select value={retention} onValueChange={setRetention}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Select retention" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30_days">Auto-purge after 30 days</SelectItem>
                <SelectItem value="90_days">Auto-purge after 90 days</SelectItem>
                <SelectItem value="1_year">Auto-purge after 1 year</SelectItem>
                <SelectItem value="indefinite">Keep until manual deletion</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex justify-end pt-2 border-t border-border">
        <Button onClick={handleSave} disabled={isSaving || total !== 100} className="gap-1.5">
          <CheckCircle2 className="h-4 w-4" />
          {isSaving ? "Saving..." : "Save Preferences"}
        </Button>
      </CardFooter>
    </Card>
  );
}
