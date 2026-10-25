"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Briefcase, Building, Wrench, ArrowRight, ArrowLeft, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";

interface Step2Props {
  initialData: any;
  onNext: (profile: any) => void;
  onBack: () => void;
}

export function Step2ConfirmProfile({ initialData, onNext, onBack }: Step2Props) {
  const [targetRoles, setTargetRoles] = useState(
    initialData?.career_interests?.join(", ") || "Software Engineer, Backend Developer"
  );
  const [targetCompanies, setTargetCompanies] = useState("Google, Stripe, Microsoft");
  const [skills, setSkills] = useState(
    initialData?.skills?.join(", ") || "Python, React, TypeScript, SQL"
  );
  const [experienceYears, setExperienceYears] = useState("1");
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        target_roles: targetRoles.split(",").map((s: string) => s.trim()).filter(Boolean),
        target_companies: targetCompanies.split(",").map((s: string) => s.trim()).filter(Boolean),
        skills: skills.split(",").map((s: string) => s.trim()).filter(Boolean),
        experience_years: parseFloat(experienceYears) || 0,
      };

      await api.put("/profile", payload);
      toast.success("Profile goals confirmed!");
      onNext(payload);
    } catch (err: any) {
      toast.error(err.message || "Could not update profile.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold text-foreground">Step 2: Confirm Your Career Goals</h2>
        <p className="text-sm text-muted-foreground">
          Confirm your desired titles and target employers so our scoring engine can surface true advocates.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 bg-card border border-border p-6 rounded-2xl shadow-xs">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
            Target Job Roles (comma-separated)
          </label>
          <Input
            value={targetRoles}
            onChange={(e) => setTargetRoles(e.target.value)}
            placeholder="e.g. Software Engineer, Machine Learning Intern"
            required
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Building className="h-3.5 w-3.5 text-muted-foreground" />
            Target Companies (comma-separated)
          </label>
          <Input
            value={targetCompanies}
            onChange={(e) => setTargetCompanies(e.target.value)}
            placeholder="e.g. Stripe, Anthropic, Datadog"
            required
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2 space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
              Core Technical Skills
            </label>
            <Input
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              placeholder="e.g. Python, SQL, AWS, Next.js"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Experience (Yrs)</label>
            <Input
              type="number"
              step="0.5"
              min="0"
              value={experienceYears}
              onChange={(e) => setExperienceYears(e.target.value)}
            />
          </div>
        </div>

        <div className="pt-4 border-t border-border flex items-center justify-between">
          <Button type="button" variant="outline" onClick={onBack} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <Button type="submit" disabled={isSaving} className="gap-2">
            <CheckCircle2 className="h-4 w-4" />
            {isSaving ? "Saving..." : "Save & Continue"}
          </Button>
        </div>
      </form>
    </div>
  );
}
