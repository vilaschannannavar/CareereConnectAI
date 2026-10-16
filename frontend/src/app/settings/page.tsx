"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { apiClient } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Settings,
  Shield,
  Briefcase,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Loader2,
  FileText,
  Upload,
  Download,
  Trash2,
  Sparkles,
  HelpCircle,
  History,
  DollarSign,
  UserX,
  ExternalLink,
  Sliders,
  Unlink,
  Database
} from "lucide-react";

interface ResumeItem {
  id: string;
  user_id: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  parsed_data: Record<string, any>;
  created_at: string;
}

interface ProfileData {
  target_roles: string[];
  target_companies: string[];
  target_locations: string[];
  skills: string[];
  education: any[];
  experience_years: number;
  bio: string;
  preferences?: Record<string, any>;
}

interface IntegrationItem {
  id: string;
  provider: string;
  account_email?: string;
  is_active: boolean;
  created_at: string;
}

interface BudgetStatus {
  budget_cap_usd: number;
  total_spent_usd: number;
  remaining_usd: number;
  is_capped: boolean;
}

interface AuditLogItem {
  id: string;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  details: Record<string, any>;
  created_at: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Resume state
  const [resumes, setResumes] = useState<ResumeItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Profile form state
  const [targetRoles, setTargetRoles] = useState("");
  const [targetCompanies, setTargetCompanies] = useState("");
  const [skills, setSkills] = useState("");
  const [bio, setBio] = useState("");
  const [educationStr, setEducationStr] = useState("");
  const [experienceYears, setExperienceYears] = useState("0");
  const [isProfileConfirmed, setIsProfileConfirmed] = useState(false);

  // Preferences & Scoring state
  const [roleWeight, setRoleWeight] = useState(30);
  const [oppWeight, setOppWeight] = useState(25);
  const [compWeight, setCompWeight] = useState(20);
  const [techWeight, setTechWeight] = useState(15);
  const [refWeight, setRefWeight] = useState(10);
  const [preferredTone, setPreferredTone] = useState("formal");
  const [retentionPolicy, setRetentionPolicy] = useState("indefinite");

  // Integrations state
  const [integrations, setIntegrations] = useState<IntegrationItem[]>([]);
  const [isDisconnecting, setIsDisconnecting] = useState<string | null>(null);

  // Security, Budget & Audit state
  const [budget, setBudget] = useState<BudgetStatus | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [isExporting, setIsExporting] = useState(false);

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isPurgingContacts, setIsPurgingContacts] = useState(false);

  const activeResume = resumes.length > 0 ? resumes[0] : null;

  const loadData = async () => {
    try {
      setIsLoading(true);
      // Load resumes
      const resumeList = await apiClient<ResumeItem[]>("/resumes").catch(() => []);
      setResumes(resumeList || []);

      // Load profile
      const prof = await apiClient<ProfileData>("/profile").catch(() => null);
      if (prof) {
        if (prof.target_roles?.length) setTargetRoles(prof.target_roles.join(", "));
        if (prof.target_companies?.length) setTargetCompanies(prof.target_companies.join(", "));
        if (prof.skills?.length) setSkills(prof.skills.join(", "));
        if (prof.bio) setBio(prof.bio);
        if (prof.experience_years !== undefined) setExperienceYears(String(prof.experience_years));
        if (prof.education?.length) {
          setEducationStr(
            prof.education
              .map((e) => (typeof e === "string" ? e : `${e.degree || "Degree"} at ${e.school || "University"}`))
              .join("; ")
          );
        }
        if (prof.preferences) {
          const p = prof.preferences;
          if (p.preferred_tone) setPreferredTone(p.preferred_tone);
          if (p.retention_policy) setRetentionPolicy(p.retention_policy);
          if (p.scoring_weights) {
            setRoleWeight(p.scoring_weights.role_relevance ?? 30);
            setOppWeight(p.scoring_weights.ability_to_help ?? 25);
            setCompWeight(p.scoring_weights.company_industry ?? 20);
            setTechWeight(p.scoring_weights.technical_domain ?? 15);
            setRefWeight(p.scoring_weights.recruitment_referral_evidence ?? 10);
          }
        }
      }

      // Load integrations
      const intList = await apiClient<IntegrationItem[]>("/integrations").catch(() => []);
      setIntegrations(intList || []);

      // Load budget and audit logs
      const [budgetRes, auditRes] = await Promise.all([
        apiClient<BudgetStatus>("/auth/budget").catch(() => null),
        apiClient<AuditLogItem[]>("/audit/logs?limit=15").catch(() => []),
      ]);
      setBudget(budgetRes);
      setAuditLogs(auditRes);
    } catch (err: any) {
      console.error("Failed loading settings data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // When a new resume is loaded or parsed, populate fields if empty
  useEffect(() => {
    if (activeResume && activeResume.parsed_data) {
      const parsed = activeResume.parsed_data;
      if (!skills && parsed.skills?.length) {
        setSkills(parsed.skills.join(", "));
      }
      if (!educationStr && parsed.education?.length) {
        setEducationStr(
          parsed.education
            .map((e: any) => (typeof e === "string" ? e : `${e.degree || "Degree"} at ${e.school || "University"}`))
            .join("; ")
        );
      }
      if (!targetRoles && parsed.career_interests?.length) {
        setTargetRoles(parsed.career_interests.join(", "));
      }
    }
  }, [activeResume]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setUploadError(null);
    if (!file) return;

    const lowerName = file.name.toLowerCase();
    if (!lowerName.endsWith(".pdf") && !lowerName.endsWith(".docx")) {
      setUploadError("Only PDF (.pdf) and Word (.docx) documents are supported.");
      return;
    }

    const maxSizeBytes = 5 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setUploadError(`File is ${(file.size / (1024 * 1024)).toFixed(1)} MB. Resumes cannot exceed 5 MB.`);
      return;
    }

    setSelectedFile(file);
  };

  const handleUploadResume = async () => {
    if (!selectedFile) return;
    try {
      setIsUploading(true);
      setUploadError(null);

      const formData = new FormData();
      formData.append("file", selectedFile);

      const uploaded = await apiClient<ResumeItem>("/resumes", {
        method: "POST",
        body: formData,
      });

      setResumes([uploaded]);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";

      setSavedSuccess("Resume uploaded, scanned, and structured data extracted successfully!");
      setTimeout(() => setSavedSuccess(null), 4000);
      await loadData();
    } catch (err: any) {
      setUploadError(err.message || "Failed to process resume. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadResume = async (resumeId: string, fileName: string) => {
    try {
      const res = await fetch(`/api/v1/resumes/${resumeId}/download`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Authenticated download failed.");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setUploadError("Unable to download resume.");
    }
  };

  const handleDeleteResume = async (resumeId: string) => {
    if (!confirm("Are you sure you want to delete this resume? The private file will be permanently removed.")) {
      return;
    }
    try {
      await apiClient(`/resumes/${resumeId}`, { method: "DELETE" });
      setSavedSuccess("Resume deleted successfully.");
      setTimeout(() => setSavedSuccess(null), 3000);
      await loadData();
    } catch (err: any) {
      setUploadError(err.message || "Failed to delete resume.");
    }
  };

  const handleConfirmProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setFormError(null);
      const payload = {
        target_roles: targetRoles.split(",").map((s) => s.trim()).filter(Boolean),
        target_companies: targetCompanies.split(",").map((s) => s.trim()).filter(Boolean),
        target_locations: [],
        skills: skills.split(",").map((s) => s.trim()).filter(Boolean),
        education: educationStr
          ? educationStr.split(";").map((s) => ({ degree: s.trim() }))
          : [],
        experience_years: parseFloat(experienceYears) || 0,
        bio: bio.trim(),
        preferences: {
          scoring_weights: {
            role_relevance: roleWeight,
            ability_to_help: oppWeight,
            company_industry: compWeight,
            technical_domain: techWeight,
            recruitment_referral_evidence: refWeight,
          },
          preferred_tone: preferredTone,
          retention_policy: retentionPolicy,
        },
      };

      if (activeResume) {
        await apiClient(`/resumes/${activeResume.id}/confirm-profile`, {
          method: "POST",
          data: payload,
        });
      }

      await apiClient("/profile", {
        method: "PUT",
        data: payload,
      });

      setIsProfileConfirmed(true);
      setSavedSuccess("Candidate profile & preferences saved successfully!");
      setTimeout(() => setSavedSuccess(null), 4000);
    } catch (err: any) {
      setFormError(err.message || "Failed to save profile.");
    }
  };

  const handleDisconnectIntegration = async (provider: string) => {
    if (!confirm(`Are you sure you want to disconnect ${provider}? Stored credentials and tokens will be permanently deleted.`)) {
      return;
    }
    try {
      setIsDisconnecting(provider);
      await apiClient(`/integrations/${provider}`, { method: "DELETE" });
      setSavedSuccess(`Integration '${provider}' disconnected and tokens purged.`);
      setTimeout(() => setSavedSuccess(null), 4000);
      await loadData();
    } catch (err: any) {
      alert("Failed to disconnect integration: " + err.message);
    } finally {
      setIsDisconnecting(null);
    }
  };

  const handleExportAllData = async () => {
    try {
      setIsExporting(true);
      const res = await fetch("/api/v1/auth/export-data", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to export data.");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `careerconnect_export_${user?.id || "data"}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setSavedSuccess("Complete user data export downloaded successfully!");
      setTimeout(() => setSavedSuccess(null), 4000);
      await loadData();
    } catch (err: any) {
      alert("Export failed: " + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handlePurgeContacts = async () => {
    if (!confirm("Are you sure you want to permanently delete ALL imported contacts? This action cannot be undone.")) {
      return;
    }
    try {
      setIsPurgingContacts(true);
      const res = await apiClient<{ message: string }>("/contacts", { method: "DELETE" });
      setSavedSuccess(res.message);
      setTimeout(() => setSavedSuccess(null), 4000);
      await loadData();
    } catch (err: any) {
      alert("Failed to purge contacts: " + err.message);
    } finally {
      setIsPurgingContacts(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmation = prompt(
      "Type 'DELETE' to confirm permanent account and data erasure. This action is irreversible."
    );
    if (confirmation !== "DELETE") {
      alert("Account deletion canceled.");
      return;
    }

    try {
      setIsDeletingAccount(true);
      await apiClient("/auth/account", { method: "DELETE" });
      alert("Your account and all associated personal records and stored files have been permanently wiped.");
      router.push("/login");
    } catch (err: any) {
      alert("Failed to delete account: " + err.message);
      setIsDeletingAccount(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-sm text-slate-500 font-medium">Loading settings &amp; security status...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Settings className="h-6 w-6 text-slate-700" />
            Settings &amp; Privacy
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your resume, candidate profile, scoring preferences, connected integrations, and data retention.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link href="/privacy">
            <Button variant="outline" size="sm" className="border-blue-200 text-blue-700 hover:bg-blue-50">
              <Shield className="mr-1.5 h-4 w-4" />
              Privacy Notice
            </Button>
          </Link>
          <Badge variant="outline" className="border-emerald-300 text-emerald-800 bg-emerald-50 px-3 py-1 text-xs">
            Zero-Scraping Compliant
          </Badge>
        </div>
      </div>

      {/* Notifications */}
      {savedSuccess && (
        <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-emerald-800 text-sm">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>{savedSuccess}</span>
        </div>
      )}

      {formError && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 flex items-center gap-3 text-red-800 text-sm">
          <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {/* SECTION 1: Resume Upload & File Storage */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <FileText className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-lg">Resume Document &amp; Private Storage</CardTitle>
            </div>
            <Badge variant="outline" className="border-slate-300 text-slate-600 text-xs">
              Sandboxed &bull; Magic Bytes Validated
            </Badge>
          </div>
          <CardDescription>
            Upload your PDF or Word resume (max 5 MB). The file is saved in private isolated storage and text is extracted without fabrication.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {uploadError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          {activeResume ? (
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-semibold text-sm text-slate-900">{activeResume.file_name}</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {(activeResume.file_size / (1024 * 1024)).toFixed(2)} MB &bull; Uploaded on{" "}
                    {new Date(activeResume.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownloadResume(activeResume.id, activeResume.file_name)}
                  className="text-xs text-slate-700"
                >
                  <Download className="mr-1 h-3.5 w-3.5" />
                  Download
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteResume(activeResume.id)}
                  className="text-xs text-red-600 border-red-200 hover:bg-red-50"
                >
                  <Trash2 className="mr-1 h-3.5 w-3.5" />
                  Delete
                </Button>
              </div>
            </div>
          ) : (
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center space-y-3">
              <div className="mx-auto h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                <Upload className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-800">Choose a resume file (PDF or DOCX)</p>
                <p className="text-xs text-slate-400 mt-0.5">Binary magic bytes verified &bull; ClamAV hook &bull; Max 5 MB</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleFileSelect}
                className="hidden"
                id="resume-file-input"
              />
              <div className="flex items-center justify-center gap-3 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs"
                >
                  Browse Computer
                </Button>
                {selectedFile && (
                  <Button
                    size="sm"
                    onClick={handleUploadResume}
                    disabled={isUploading}
                    className="text-xs bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        Scanning &amp; Parsing...
                      </>
                    ) : (
                      <>Upload &amp; Extract</>
                    )}
                  </Button>
                )}
              </div>
              {selectedFile && (
                <div className="text-xs text-blue-600 font-medium pt-1">
                  Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* SECTION 2: Confirmed Candidate Profile & Preferences */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Sparkles className="h-5 w-5 text-indigo-600" />
              <CardTitle className="text-lg">Candidate Profile &amp; Outreach Preferences</CardTitle>
            </div>
            <Badge variant="outline" className="border-indigo-300 text-indigo-700 bg-indigo-50">
              Zero-Fabrication Guaranteed
            </Badge>
          </div>
          <CardDescription>
            Confirm your verified career goals, target companies, skills, and outreach preferences. Messages only reference verified attributes.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleConfirmProfile}>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">
                  Target Roles (comma-separated):
                </label>
                <Input
                  value={targetRoles}
                  onChange={(e) => setTargetRoles(e.target.value)}
                  placeholder="e.g. Software Engineer, Distributed Systems Engineer"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">
                  Target Companies (comma-separated):
                </label>
                <Input
                  value={targetCompanies}
                  onChange={(e) => setTargetCompanies(e.target.value)}
                  placeholder="e.g. Google, Tesla, Stripe, Apple"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">
                Verified Skills (comma-separated):
              </label>
              <Input
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                placeholder="e.g. Python, TypeScript, React, PostgreSQL"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">
                  Education Background:
                </label>
                <Input
                  value={educationStr}
                  onChange={(e) => setEducationStr(e.target.value)}
                  placeholder="e.g. BS Computer Science at University"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">
                  Years of Experience:
                </label>
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  value={experienceYears}
                  onChange={(e) => setExperienceYears(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">
                Professional Bio / Summary:
              </label>
              <Input
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="e.g. CS graduate specializing in backend infrastructure."
              />
            </div>

            {/* Sub-section: Outreach Preferences */}
            <div className="pt-2 border-t border-slate-100">
              <label className="text-sm font-semibold text-slate-800 block mb-2">
                Preferred Outreach Tone
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {["formal", "concise", "conversational", "technical"].map((tone) => (
                  <button
                    key={tone}
                    type="button"
                    onClick={() => setPreferredTone(tone)}
                    className={`py-2 px-3 text-xs font-medium rounded-lg border capitalize transition-colors ${
                      preferredTone === tone
                        ? "bg-blue-50 border-blue-500 text-blue-700"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {tone}
                  </button>
                ))}
              </div>
            </div>

            {/* Sub-section: Scoring Configuration */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                    <Sliders className="h-4 w-4 text-blue-600" />
                    Custom 5-Factor Scoring Weights
                  </span>
                  <span className="text-xs text-slate-400 block">
                    Adjust default weights (must sum towards 100)
                  </span>
                </div>
                <Badge variant="outline" className="text-xs font-mono">
                  Total: {roleWeight + oppWeight + compWeight + techWeight + refWeight}%
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 pt-1">
                <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-center">
                  <div className="text-[11px] text-slate-500 font-medium">Role Relevance</div>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={roleWeight}
                    onChange={(e) => setRoleWeight(parseInt(e.target.value) || 0)}
                    className="h-8 text-center text-xs mt-1"
                  />
                </div>
                <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-center">
                  <div className="text-[11px] text-slate-500 font-medium">Opportunity Type</div>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={oppWeight}
                    onChange={(e) => setOppWeight(parseInt(e.target.value) || 0)}
                    className="h-8 text-center text-xs mt-1"
                  />
                </div>
                <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-center">
                  <div className="text-[11px] text-slate-500 font-medium">Company/Industry</div>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={compWeight}
                    onChange={(e) => setCompWeight(parseInt(e.target.value) || 0)}
                    className="h-8 text-center text-xs mt-1"
                  />
                </div>
                <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-center">
                  <div className="text-[11px] text-slate-500 font-medium">Tech Domain</div>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={techWeight}
                    onChange={(e) => setTechWeight(parseInt(e.target.value) || 0)}
                    className="h-8 text-center text-xs mt-1"
                  />
                </div>
                <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-center">
                  <div className="text-[11px] text-slate-500 font-medium">Referral Evidence</div>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={refWeight}
                    onChange={(e) => setRefWeight(parseInt(e.target.value) || 0)}
                    className="h-8 text-center text-xs mt-1"
                  />
                </div>
              </div>
            </div>
          </CardContent>

          <CardFooter className="border-t border-slate-100 flex justify-end pt-4 gap-3">
            <Button type="submit">
              <CheckCircle2 className="mr-1.5 h-4 w-4" />
              Save Profile &amp; Preferences
            </Button>
          </CardFooter>
        </form>
      </Card>

      {/* SECTION 3: Connected Integrations */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Unlink className="h-5 w-5 text-purple-600" />
              <CardTitle className="text-lg">Connected Accounts &amp; Integrations</CardTitle>
            </div>
            <Badge variant="outline" className="border-purple-200 text-purple-700 bg-purple-50">
              Token Revocation
            </Badge>
          </div>
          <CardDescription>
            View active third-party integrations and disconnect them. Disconnecting immediately deletes and purges stored authentication tokens.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {integrations.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400 border border-dashed rounded-lg">
              No third-party integrations currently connected. LinkedIn Sign-in is optional.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {integrations.map((item) => (
                <div key={item.id} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-sm text-slate-900 capitalize flex items-center gap-2">
                      {item.provider}
                      <Badge variant="outline" className="text-[10px] text-emerald-700 border-emerald-300 bg-emerald-50">
                        Active
                      </Badge>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Account: {item.account_email || "Linked Account"} &bull; Connected on {new Date(item.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDisconnectIntegration(item.provider)}
                    disabled={isDisconnecting === item.provider}
                    className="text-xs text-red-600 border-red-200 hover:bg-red-50"
                  >
                    {isDisconnecting === item.provider ? "Disconnecting..." : "Disconnect & Purge Tokens"}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* SECTION 4: Data Retention, Export & Hard Deletion */}
      <Card className="border-slate-200">
        <CardHeader>
          <div className="flex items-center gap-2.5">
            <Database className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg">Data Retention, Export &amp; Erasure</CardTitle>
          </div>
          <CardDescription>
            GDPR &amp; CCPA compliant controls: export complete records in JSON format, purge connections, or permanently delete your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Full Data Export */}
          <div className="p-4 rounded-lg bg-blue-50/50 border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="font-semibold text-sm text-blue-950">Export Complete Personal Data (JSON)</div>
              <div className="text-xs text-blue-800 mt-0.5">
                Download a complete, machine-readable JSON archive of your account, resumes metadata, contacts, scores, shortlists, drafts, and events.
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportAllData}
              disabled={isExporting}
              className="text-blue-700 border-blue-300 hover:bg-blue-100 shrink-0"
            >
              {isExporting ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                  Export All Data
                </>
              )}
            </Button>
          </div>

          {/* Purge Contacts */}
          <div className="p-4 rounded-lg bg-amber-50/50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="font-semibold text-sm text-amber-950">Purge All Imported Contacts</div>
              <div className="text-xs text-amber-800 mt-0.5">
                Permanently deletes all imported LinkedIn connections and contact analyses without deleting your account.
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePurgeContacts}
              disabled={isPurgingContacts}
              className="text-amber-800 border-amber-300 hover:bg-amber-100 shrink-0"
            >
              {isPurgingContacts ? "Purging..." : "Purge Contacts"}
            </Button>
          </div>

          {/* Hard Delete Account */}
          <div className="p-4 rounded-lg bg-red-100/60 border border-red-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="font-semibold text-sm text-red-950">Permanently Delete Account &amp; All Data</div>
              <div className="text-xs text-red-900 mt-0.5">
                Hard deletes your user account, resumes, contacts, analyses, shortlists, drafts, and all physical files. Irreversible.
              </div>
            </div>
            <Button
              variant="default"
              size="sm"
              onClick={handleDeleteAccount}
              disabled={isDeletingAccount}
              className="bg-red-600 hover:bg-red-700 text-white shrink-0"
            >
              {isDeletingAccount ? "Deleting..." : "Delete My Account"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* SECTION 5: Per-User LLM Budget Cap */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <DollarSign className="h-5 w-5 text-emerald-600" />
              <CardTitle className="text-lg">Per-User LLM Cost &amp; Budget Cap</CardTitle>
            </div>
            <Badge variant="outline" className="border-emerald-300 text-emerald-800 bg-emerald-50">
              Active Protection
            </Badge>
          </div>
          <CardDescription>
            Automated spending cap protects against runaway LLM costs. Requests are bounded and fail safely when the cap is reached.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {budget ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50">
                <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">User Budget Cap</div>
                <div className="text-xl font-bold text-slate-900 mt-1">${budget.budget_cap_usd.toFixed(2)} USD</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Configured threshold</div>
              </div>
              <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50">
                <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Total Spent</div>
                <div className="text-xl font-bold text-blue-900 mt-1">${budget.total_spent_usd.toFixed(4)} USD</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Resume &amp; classifier calls</div>
              </div>
              <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50">
                <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Remaining Balance</div>
                <div className="text-xl font-bold text-emerald-700 mt-1">${budget.remaining_usd.toFixed(4)} USD</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Safe margin remaining</div>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-400">Loading budget status...</div>
          )}
        </CardContent>
      </Card>

      {/* SECTION 6: Immutable Compliance Audit Trail */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2.5">
            <History className="h-5 w-5 text-slate-600" />
            <CardTitle className="text-lg">Recent Security &amp; Compliance Audit Log</CardTitle>
          </div>
          <CardDescription>
            Immutable audit records tracking CSV exports, data deletions, and authentication events.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 divide-y divide-slate-100">
          {auditLogs.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">No audit events recorded yet.</div>
          ) : (
            auditLogs.map((log) => (
              <div key={log.id} className="p-3 text-xs flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-800">{log.action}</div>
                  <div className="text-[11px] text-slate-400">Entity: {log.entity_type} {log.entity_id ? `(${log.entity_id.slice(0, 8)}...)` : ""}</div>
                </div>
                <div className="text-right text-[11px] text-slate-400 font-mono">
                  {new Date(log.created_at).toLocaleString()}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
