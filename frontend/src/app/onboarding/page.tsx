"use client";

import React, { useState, useEffect } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Stepper } from "@/components/ui/stepper";
import { Step1UploadResume } from "@/features/onboarding/Step1UploadResume";
import { Step2ConfirmProfile } from "@/features/onboarding/Step2ConfirmProfile";
import { Step3Preferences } from "@/features/onboarding/Step3Preferences";
import { Step4CsvImport } from "@/features/onboarding/Step4CsvImport";
import { Step5ReviewAndLaunch } from "@/features/onboarding/Step5ReviewAndLaunch";
import { Card } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

const ONBOARDING_STEPS = [
  { id: "step-1", label: "Resume Upload", description: "Parse skills & work history" },
  { id: "step-2", label: "Confirm Goals", description: "Target roles & companies" },
  { id: "step-3", label: "Scoring Weights", description: "Calibrate relevance dimensions" },
  { id: "step-4", label: "Import CSV", description: "Load LinkedIn connections" },
  { id: "step-5", label: "Review & Launch", description: "Run batch analysis" },
];

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [resumeData, setResumeData] = useState<any>(null);
  const [profileData, setProfileData] = useState<any>(null);
  const [preferencesData, setPreferencesData] = useState<any>(null);

  // Sync step progress
  useEffect(() => {
    fetch("/api/v1/profile", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.preferences?.onboarding_step) {
          const saved = Math.min(Math.max(0, data.preferences.onboarding_step - 1), 4);
          setCurrentStep(saved);
        }
      })
      .catch(() => {});
  }, []);

  const saveStepProgress = (stepNumber: number) => {
    fetch("/api/v1/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        preferences: { onboarding_step: stepNumber },
      }),
      credentials: "include",
    }).catch(() => {});
  };

  const handleStep1Next = (data: any) => {
    setResumeData(data);
    setCurrentStep(1);
    saveStepProgress(2);
  };

  const handleStep2Next = (data: any) => {
    setProfileData(data);
    setCurrentStep(2);
    saveStepProgress(3);
  };

  const handleStep3Next = (data: any) => {
    setPreferencesData(data);
    setCurrentStep(3);
    saveStepProgress(4);
  };

  const handleStep4Next = () => {
    setCurrentStep(4);
    saveStepProgress(5);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4">
      <PageHeader
        title="Welcome to CareerConnect AI"
        description="Set up your job search engine in 5 quick steps. Grounded in truth, zero automated scraping."
      />

      {/* Visual Stepper */}
      <Card className="p-6 bg-card border-border shadow-xs">
        <Stepper steps={ONBOARDING_STEPS} currentStep={currentStep} />
      </Card>

      {/* Step Content */}
      <div className="pt-2">
        {currentStep === 0 && <Step1UploadResume onNext={handleStep1Next} />}
        {currentStep === 1 && (
          <Step2ConfirmProfile
            initialData={resumeData}
            onNext={handleStep2Next}
            onBack={() => setCurrentStep(0)}
          />
        )}
        {currentStep === 2 && (
          <Step3Preferences
            onNext={handleStep3Next}
            onBack={() => setCurrentStep(1)}
          />
        )}
        {currentStep === 3 && (
          <Step4CsvImport
            onNext={handleStep4Next}
            onBack={() => setCurrentStep(2)}
          />
        )}
        {currentStep === 4 && (
          <Step5ReviewAndLaunch
            onFinish={() => {
              saveStepProgress(5);
            }}
          />
        )}
      </div>
    </div>
  );
}
