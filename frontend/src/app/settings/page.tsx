"use client";

import React from "react";
import { PageHeader } from "@/components/ui/page-header";
import { ResumeUploadSection } from "@/features/settings/components/ResumeUploadSection";
import { ProfileConfirmForm } from "@/features/settings/components/ProfileConfirmForm";
import { ScoringPreferencesSection } from "@/features/settings/components/ScoringPreferencesSection";
import { DataPrivacySection } from "@/features/settings/components/DataPrivacySection";
import { useSettingsData, useUpdateProfile } from "@/features/settings/hooks/useSettings";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, DollarSign, Database, CheckCircle2 } from "lucide-react";

export default function SettingsPage() {
  const { resumes, profile, budget, isLoading, refetch } = useSettingsData();
  const updateProfileMutation = useUpdateProfile();

  const handleSaveProfile = async (data: any) => {
    await updateProfileMutation.mutateAsync(data);
  };

  const activeResume = resumes[0] || null;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Account Settings & Profile"
          description="Manage your parsed resume data, scoring weights, privacy controls, and AI budget limits."
        />
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5 h-9 self-start sm:self-auto">
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {budget && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-4 border-border bg-card">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Monthly Budget Cap</span>
              <DollarSign className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="text-xl font-bold text-foreground mt-1">${budget.budget_cap_usd.toFixed(2)}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Hardware & API ceiling</p>
          </Card>

          <Card className="p-4 border-border bg-card">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Total Spent This Month</span>
              <Database className="h-4 w-4 text-primary" />
            </div>
            <p className="text-xl font-bold text-foreground mt-1">${budget.total_spent_usd.toFixed(2)}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Real-time LLM token cost</p>
          </Card>

          <Card className="p-4 border-border bg-card">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Remaining Balance</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              ${budget.remaining_usd.toFixed(2)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Available for AI drafting</p>
          </Card>
        </div>
      )}

      <ResumeUploadSection
        resumes={resumes}
        onUploadSuccess={refetch}
        onDeleteSuccess={refetch}
      />

      <ProfileConfirmForm
        profile={profile}
        onSave={handleSaveProfile}
        parsedResumeData={activeResume?.parsed_data}
      />

      <ScoringPreferencesSection
        profile={profile}
        onSave={handleSaveProfile}
      />

      <DataPrivacySection />
    </div>
  );
}
