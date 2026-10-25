"use client";

import React, { useState, useEffect } from "react";
import { ProfileData } from "../hooks/useSettings";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { User, Briefcase, Building, Wrench, GraduationCap, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface ProfileConfirmFormProps {
  profile?: ProfileData;
  onSave: (data: Partial<ProfileData>) => Promise<void>;
  parsedResumeData?: Record<string, any>;
}

export function ProfileConfirmForm({ profile, onSave, parsedResumeData }: ProfileConfirmFormProps) {
  const [targetRoles, setTargetRoles] = useState("");
  const [targetCompanies, setTargetCompanies] = useState("");
  const [skills, setSkills] = useState("");
  const [experienceYears, setExperienceYears] = useState("0");
  const [education, setEducation] = useState("");
  const [bio, setBio] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      if (profile.target_roles?.length) setTargetRoles(profile.target_roles.join(", "));
      if (profile.target_companies?.length) setTargetCompanies(profile.target_companies.join(", "));
      if (profile.skills?.length) setSkills(profile.skills.join(", "));
      if (profile.experience_years !== undefined) setExperienceYears(String(profile.experience_years));
      if (profile.bio) setBio(profile.bio);
      if (profile.education?.length) {
        setEducation(
          profile.education
            .map((e) => (typeof e === "string" ? e : `${e.degree || "Degree"} at ${e.school || "School"}`))
            .join("; ")
        );
      }
    } else if (parsedResumeData) {
      if (parsedResumeData.skills?.length) setSkills(parsedResumeData.skills.join(", "));
      if (parsedResumeData.career_interests?.length) setTargetRoles(parsedResumeData.career_interests.join(", "));
    }
  }, [profile, parsedResumeData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave({
        target_roles: targetRoles.split(",").map((s) => s.trim()).filter(Boolean),
        target_companies: targetCompanies.split(",").map((s) => s.trim()).filter(Boolean),
        skills: skills.split(",").map((s) => s.trim()).filter(Boolean),
        experience_years: parseFloat(experienceYears) || 0,
        bio: bio.trim(),
        education: education
          ? education.split(";").map((s) => ({ degree: s.trim() }))
          : [],
      });
      toast.success("Profile and preferences saved successfully!");
    } catch (err: any) {
      toast.error(err?.message || "Failed to update profile.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <User className="h-4 w-4 text-primary" />
          Candidate Profile & Goals
        </CardTitle>
        <CardDescription>
          Your verified profile guides relevance scoring and prevents fabricated claims.
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                Target Roles (comma-separated)
              </label>
              <Input
                value={targetRoles}
                onChange={(e) => setTargetRoles(e.target.value)}
                placeholder="e.g. Distributed Systems Engineer, Full Stack Developer"
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
                placeholder="e.g. Tesla, Stripe, OpenAI"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
                Verified Skills (comma-separated)
              </label>
              <Input
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                placeholder="e.g. React, PostgreSQL, Docker"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Experience (Years)</label>
              <Input
                type="number"
                step="0.5"
                min="0"
                max="50"
                value={experienceYears}
                onChange={(e) => setExperienceYears(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <GraduationCap className="h-3.5 w-3.5 text-muted-foreground" />
              Education (semicolon-separated)
            </label>
            <Input
              value={education}
              onChange={(e) => setEducation(e.target.value)}
              placeholder="e.g. BS in Computer Science at University of Michigan; MS at Stanford"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Short Bio & Career Summary</label>
            <textarea
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[75px]"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Brief summary of your background, passions, and current job search focus..."
            />
          </div>
        </CardContent>

        <CardFooter className="flex justify-end pt-2 border-t border-border">
          <Button type="submit" disabled={isSaving} className="gap-1.5">
            <CheckCircle2 className="h-4 w-4" />
            {isSaving ? "Saving..." : "Save Profile & Preferences"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
