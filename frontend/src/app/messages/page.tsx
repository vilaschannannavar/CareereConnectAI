"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Mail,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  AlertCircle,
  AlertTriangle,
  Info,
  ShieldAlert,
  Clock,
  Send,
  CheckCircle2,
  Edit3,
  FileText,
  User,
  Building,
  Briefcase,
  ChevronRight,
  Eye,
  History,
  Lock,
  ArrowRight
} from "lucide-react";

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  company: string;
  position: string;
  profile_url: string;
}

interface Analysis {
  id: string;
  contact_id: string;
  score: number;
  priority: string;
  categories: string[];
}

interface ResumeItem {
  id: string;
  filename: string;
  created_at: string;
}

interface MessageDraft {
  id: string;
  contact_id: string;
  status: string;
  template_code: string;
  tone: string;
  subject: string;
  body: string;
  character_count: number;
  character_limit_warning: boolean;
  details_used: Record<string, any>;
  delivery_channel: string;
  sent_at?: string | null;
  follow_up_suggested_at?: string | null;
  resume_id?: string | null;
  contact?: Contact;
}

export default function MessageStudioPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [analyses, setAnalyses] = useState<Record<string, Analysis>>({});
  const [resumes, setResumes] = useState<ResumeItem[]>([]);
  const [drafts, setDrafts] = useState<MessageDraft[]>([]);
  
  const [selectedContactId, setSelectedContactId] = useState<string>("");
  const [templateCode, setTemplateCode] = useState<string>("A");
  const [tone, setTone] = useState<string>("concise");
  const [allowReferralOverride, setAllowReferralOverride] = useState<boolean>(false);
  const [selectedResumeId, setSelectedResumeId] = useState<string>("");
  
  const [activeDraft, setActiveDraft] = useState<MessageDraft | null>(null);
  const [editableBody, setEditableBody] = useState<string>("");
  const [isEditing, setIsEditing] = useState<boolean>(false);
  
  const [loading, setLoading] = useState<boolean>(true);
  const [generating, setGenerating] = useState<boolean>(false);
  const [savingEdit, setSavingEdit] = useState<boolean>(false);
  const [transitioning, setTransitioning] = useState<boolean>(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load initial data
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [cRes, aRes, rRes, dRes] = await Promise.all([
          apiClient<{ items: Contact[]; total: number }>("/contacts?size=100").catch(() => ({ items: [], total: 0 })),
          apiClient<Analysis[]>("/scoring/analyses").catch(() => []),
          apiClient<ResumeItem[]>("/resumes").catch(() => []),
          apiClient<MessageDraft[]>("/messages").catch(() => []),
        ]);

        const contactList = Array.isArray(cRes) ? cRes : cRes?.items || [];
        setContacts(contactList);
        setDrafts(dRes || []);
        setResumes(rRes || []);

        const aMap: Record<string, Analysis> = {};
        for (const a of (aRes || [])) {
          aMap[a.contact_id] = a;
        }
        setAnalyses(aMap);

        // Pre-select contact if drafts exist, or first contact
        if (dRes && dRes.length > 0) {
          setActiveDraft(dRes[0]);
          setEditableBody(dRes[0].body);
          setSelectedContactId(dRes[0].contact_id);
          setTemplateCode(dRes[0].template_code);
          setTone(dRes[0].tone);
        } else if (contactList.length > 0) {
          setSelectedContactId(contactList[0].id);
        }
      } catch (err: any) {
        console.error("Failed loading message studio data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const selectedContact = useMemo(() => {
    return contacts.find((c) => c.id === selectedContactId) || null;
  }, [contacts, selectedContactId]);

  const selectedContactAnalysis = useMemo(() => {
    return selectedContactId ? analyses[selectedContactId] : null;
  }, [analyses, selectedContactId]);

  const hasCategoryD = useMemo(() => {
    return selectedContactAnalysis?.categories?.includes("D") ?? false;
  }, [selectedContactAnalysis]);

  // Handle Draft Generation
  const handleGenerateDraft = async () => {
    if (!selectedContactId) return;
    setGenerating(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const payload = {
        contact_id: selectedContactId,
        template_code: templateCode,
        tone: tone,
        allow_referral_override: allowReferralOverride,
        resume_id: selectedResumeId || undefined,
      };

      const newDraft = await apiClient<MessageDraft>("/messages/generate", {
        method: "POST",
        data: payload,
      });

      setActiveDraft(newDraft);
      setEditableBody(newDraft.body);
      setIsEditing(false);
      setDrafts((prev) => [newDraft, ...prev.filter((d) => d.id !== newDraft.id)]);
      setSuccessMessage("Draft generated successfully using confirmed profile parameters.");
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to generate draft.");
    } finally {
      setGenerating(false);
    }
  };

  // Handle Editing Draft Body
  const handleSaveEdit = async () => {
    if (!activeDraft) return;
    setSavingEdit(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const updated = await apiClient<MessageDraft>(`/messages/${activeDraft.id}`, {
        method: "PUT",
        data: {
          body: editableBody,
          resume_id: selectedResumeId || undefined,
        },
      });

      setActiveDraft(updated);
      setEditableBody(updated.body);
      setIsEditing(false);
      setDrafts((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
      if (activeDraft.status === "Approved" && updated.status === "Draft") {
        setSuccessMessage("Draft saved! As this draft was previously Approved, its status was reset to 'Draft' for re-approval.");
      } else {
        setSuccessMessage("Draft updated successfully.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to update draft.");
    } finally {
      setSavingEdit(false);
    }
  };

  // Handle State Transitions
  const handleTransition = async (targetState: string, notes?: string) => {
    if (!activeDraft) return;
    setTransitioning(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const updated = await apiClient<MessageDraft>(`/messages/${activeDraft.id}/transition`, {
        method: "POST",
        data: {
          target_state: targetState,
          notes: notes,
        },
      });

      setActiveDraft(updated);
      setDrafts((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
      if (targetState === "User-confirmed sent") {
        setSuccessMessage("Outreach marked as sent! Suggested follow-up scheduled in 7 days. Track in Outreach Tracker.");
      } else {
        setSuccessMessage(`Draft successfully transitioned to '${targetState}'.`);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Invalid state transition.");
    } finally {
      setTransitioning(false);
    }
  };

  // Handle Copy Message (NEVER MARKS AS SENT)
  const handleCopy = async () => {
    if (!activeDraft) return;
    try {
      await navigator.clipboard.writeText(activeDraft.body);
      // Log copy audit event
      await apiClient(`/messages/${activeDraft.id}/copy`, { method: "POST" });
      setCopyFeedback("Copied! (Note: Copying does NOT send the message. Send manually in LinkedIn, then confirm below.)");
      setTimeout(() => setCopyFeedback(null), 5000);
    } catch (err: any) {
      setErrorMessage("Could not copy to clipboard.");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Draft":
        return <Badge variant="secondary" className="bg-slate-100 text-slate-700 border-slate-300">Draft</Badge>;
      case "Reviewed":
        return <Badge variant="outline" className="border-blue-300 text-blue-700 bg-blue-50">Reviewed</Badge>;
      case "Approved":
        return <Badge className="bg-emerald-600 text-white">Approved</Badge>;
      case "Awaiting manual send":
        return <Badge className="bg-amber-500 text-white">Awaiting Manual Send</Badge>;
      case "User-confirmed sent":
        return <Badge className="bg-blue-600 text-white">Marked Sent By You</Badge>;
      case "Sent (verified)":
        return <Badge className="bg-purple-600 text-white">Sent (Verified)</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Message Studio</h1>
          <p className="text-sm text-slate-500">
            Create verified, personalized outreach drafts with strict template rules, length limits, and server-enforced approval.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/tracker">
            <Button variant="outline" size="sm" className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-slate-500" />
              <span>Outreach Tracker</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Manual Delivery Notice Banner */}
      <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4 flex items-start gap-3 text-sm text-blue-900 shadow-sm">
        <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-blue-950 flex items-center gap-2">
            <span>Manual Outreach Policy</span>
            <Badge variant="outline" className="text-[11px] bg-blue-100 border-blue-300 text-blue-800">
              No Automated Scraping or Messaging
            </Badge>
          </p>
          <p className="text-xs text-blue-800 leading-relaxed">
            CareerConnect AI drafts personalized messages for you to review and send yourself. Copying text copies to your clipboard only;
            it never marks outreach as sent. Automated messaging is strictly blocked by LinkedIn developer policy.
          </p>
        </div>
      </div>

      {/* Error & Success Messages */}
      {errorMessage && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3.5 text-sm text-red-800 flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{errorMessage}</div>
          <button onClick={() => setErrorMessage(null)} className="text-xs text-red-500 hover:text-red-700">Dismiss</button>
        </div>
      )}

      {successMessage && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3.5 text-sm text-emerald-800 flex items-start gap-2.5">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{successMessage}</div>
          <button onClick={() => setSuccessMessage(null)} className="text-xs text-emerald-500 hover:text-emerald-700">Dismiss</button>
        </div>
      )}

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Draft Configuration Controls (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          <Card className="shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-blue-600" />
                <span>Outreach Configuration</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Select connection and configure template guardrails.
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-4 space-y-4">
              {/* Connection Selector */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  1. Target Connection
                </label>
                {contacts.length === 0 ? (
                  <div className="text-xs text-slate-500 p-3 bg-slate-50 rounded border border-dashed">
                    No connections imported yet. <Link href="/connections" className="text-blue-600 underline">Import Connections CSV</Link>
                  </div>
                ) : (
                  <select
                    className="w-full text-xs rounded-md border border-slate-300 p-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={selectedContactId}
                    onChange={(e) => {
                      setSelectedContactId(e.target.value);
                      // If an existing draft exists for this contact, switch to it
                      const existing = drafts.find((d) => d.contact_id === e.target.value);
                      if (existing) {
                        setActiveDraft(existing);
                        setEditableBody(existing.body);
                        setTemplateCode(existing.template_code);
                        setTone(existing.tone);
                      }
                    }}
                  >
                    {contacts.map((c) => {
                      const analysis = analyses[c.id];
                      const cats = analysis?.categories ? ` [${analysis.categories.join(", ")}]` : "";
                      const score = analysis?.score ? ` (${Math.round(analysis.score)} pts)` : "";
                      return (
                        <option key={c.id} value={c.id}>
                          {c.first_name} {c.last_name} — {c.company} ({c.position}){cats}{score}
                        </option>
                      );
                    })}
                  </select>
                )}

                {/* Selected Contact Category Info */}
                {selectedContact && (
                  <div className="mt-2.5 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs flex items-start justify-between">
                    <div>
                      <div className="font-semibold text-slate-900">{selectedContact.first_name} {selectedContact.last_name}</div>
                      <div className="text-slate-500 flex items-center gap-2">
                        <span>{selectedContact.position} at {selectedContact.company}</span>
                        {selectedContact.company && (
                          <a
                            href={`https://www.google.com/search?q=${encodeURIComponent(selectedContact.company)}+official+careers+jobs`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5"
                            title="Open verified career page"
                          >
                            <span>Careers Portal</span>
                            <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {selectedContactAnalysis ? (
                        <div className="flex gap-1">
                          {selectedContactAnalysis.categories.map((cat) => (
                            <Badge key={cat} variant="outline" className="text-[10px] px-1 py-0 bg-white">
                              Cat {cat}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400">Unanalyzed</span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Template Selector */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  2. Outreach Template
                </label>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    type="button"
                    onClick={() => setTemplateCode("A")}
                    className={`text-left p-3 rounded-lg border text-xs transition-all ${
                      templateCode === "A"
                        ? "border-blue-500 bg-blue-50/50 ring-1 ring-blue-500"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <div className="font-semibold text-slate-900 flex items-center justify-between">
                      <span>Template A: Recruiter / Talent Acquisition</span>
                      <Badge variant="outline" className="text-[10px]">Category A</Badge>
                    </div>
                    <p className="text-slate-500 mt-1 text-[11px]">
                      Professional inquiry regarding current internship and entry-level opportunities. Highlights verified technical skills.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTemplateCode("B")}
                    className={`text-left p-3 rounded-lg border text-xs transition-all ${
                      templateCode === "B"
                        ? "border-amber-500 bg-amber-50/50 ring-1 ring-amber-500"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <div className="font-semibold text-slate-900 flex items-center justify-between">
                      <span>Template B: Referral Request</span>
                      <Badge variant="outline" className="text-[10px] text-amber-700 border-amber-300">Category D Gated</Badge>
                    </div>
                    <p className="text-slate-500 mt-1 text-[11px]">
                      Polite referral inquiry tailored to peer/alumni. Restricted to Category D contacts to prevent unsolicited blanket asking.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTemplateCode("C")}
                    className={`text-left p-3 rounded-lg border text-xs transition-all ${
                      templateCode === "C"
                        ? "border-purple-500 bg-purple-50/50 ring-1 ring-purple-500"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <div className="font-semibold text-slate-900 flex items-center justify-between">
                      <span>Template C: Hiring Manager / Tech Lead</span>
                      <Badge variant="outline" className="text-[10px]">Category C</Badge>
                    </div>
                    <p className="text-slate-500 mt-1 text-[11px]">
                      Exploratory outreach highlighting architectural curiosity, team alignment, and relevant domain projects.
                    </p>
                  </button>
                </div>

                {/* Category D Referral Warning if Template B selected */}
                {templateCode === "B" && (
                  <div className={`mt-2.5 p-3 rounded-lg border text-xs ${
                    hasCategoryD ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-amber-200 bg-amber-50 text-amber-900"
                  }`}>
                    {hasCategoryD ? (
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span>Verified Category D connection (target company employee or verified alumni). Referral template allowed.</span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                          <span>
                            <strong>Referral Guardrail:</strong> This contact is not tagged Category D. CareerConnect AI enforces this to protect your professional reputation.
                          </span>
                        </div>
                        <label className="flex items-center gap-2 mt-1 cursor-pointer font-medium text-amber-950">
                          <input
                            type="checkbox"
                            checked={allowReferralOverride}
                            onChange={(e) => setAllowReferralOverride(e.target.checked)}
                            className="rounded border-amber-400 text-amber-600 focus:ring-amber-500"
                          />
                          <span>I confirm this person is an appropriate referral target (Override)</span>
                        </label>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Tone Selector */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  3. Tone Style
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "concise", label: "Concise (<300 chars)", desc: "Optimized for connection note" },
                    { id: "formal", label: "Formal", desc: "Respectful & traditional" },
                    { id: "conversational", label: "Conversational", desc: "Warm & peer-friendly" },
                    { id: "technical", label: "Technical", desc: "In-depth domain focus" },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTone(t.id)}
                      className={`text-left p-2 rounded-md border text-xs transition-all ${
                        tone === t.id
                          ? "border-blue-500 bg-blue-50/70 text-blue-900 font-semibold"
                          : "border-slate-200 hover:border-slate-300 bg-white text-slate-700"
                      }`}
                    >
                      <div>{t.label}</div>
                      <div className="text-[10px] text-slate-400 font-normal">{t.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Resume Association */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  4. Referenced Resume
                </label>
                <select
                  className="w-full text-xs rounded-md border border-slate-300 p-2 bg-white"
                  value={selectedResumeId}
                  onChange={(e) => setSelectedResumeId(e.target.value)}
                >
                  <option value="">No specific resume attached</option>
                  {resumes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.filename}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  LinkedIn connection notes do not support file attachments. The selected resume informs talking points.
                </p>
              </div>

              {/* Generate Button */}
              <Button
                onClick={handleGenerateDraft}
                disabled={generating || !selectedContactId || (templateCode === "B" && !hasCategoryD && !allowReferralOverride)}
                className="w-full flex items-center justify-center gap-2 mt-2"
              >
                {generating ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Synthesizing Verified Draft...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>Generate Outreach Draft</span>
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Drafts History List */}
          {drafts.length > 0 && (
            <Card className="shadow-sm">
              <CardHeader className="py-3 border-b border-slate-100">
                <CardTitle className="text-xs uppercase tracking-wider font-semibold text-slate-500">
                  Recent Drafts ({drafts.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2 divide-y divide-slate-100 max-h-56 overflow-y-auto">
                {drafts.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => {
                      setActiveDraft(d);
                      setEditableBody(d.body);
                      setSelectedContactId(d.contact_id);
                      setTemplateCode(d.template_code);
                      setTone(d.tone);
                      setIsEditing(false);
                    }}
                    className={`w-full text-left p-2.5 rounded text-xs flex items-center justify-between transition-colors ${
                      activeDraft?.id === d.id ? "bg-blue-50 font-medium text-blue-900" : "hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <div>
                      <div>{d.contact ? `${d.contact.first_name} ${d.contact.last_name}` : "Draft"}</div>
                      <div className="text-[10px] text-slate-400">Template {d.template_code} • {d.tone}</div>
                    </div>
                    <div>{getStatusBadge(d.status)}</div>
                  </button>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Review, State Progression & Delivery Studio (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {activeDraft ? (
            <Card className="shadow-sm">
              {/* Draft Header */}
              <CardHeader className="pb-3 border-b border-slate-100">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Status:</span>
                      {getStatusBadge(activeDraft.status)}
                      <span className="text-xs text-slate-400">• Channel: Manual LinkedIn</span>
                    </div>
                    <CardTitle className="text-lg mt-1 flex items-center gap-2">
                      <span>{activeDraft.contact ? `${activeDraft.contact.first_name} ${activeDraft.contact.last_name}` : "Target Recipient"}</span>
                      {activeDraft.contact && (
                        <a
                          href={activeDraft.contact.profile_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800"
                          title="Open LinkedIn Profile"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {activeDraft.contact ? `${activeDraft.contact.position} at ${activeDraft.contact.company}` : ""}
                    </CardDescription>
                  </div>

                  {/* Character Count & Warning Badge */}
                  <div className="text-right">
                    <div className={`text-xs font-semibold ${
                      activeDraft.character_count > 300 ? "text-amber-600" : "text-slate-600"
                    }`}>
                      {activeDraft.character_count} / 300 characters
                    </div>
                    {activeDraft.character_limit_warning && (
                      <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-300 mt-1">
                        Exceeds 300-char connection note limit
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>

              {/* Message Subject & Body */}
              <CardContent className="pt-4 space-y-4">
                {activeDraft.subject && (
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                      Subject Line
                    </label>
                    <div className="text-xs font-medium text-slate-800 p-2.5 rounded-md bg-slate-50 border border-slate-200">
                      {activeDraft.subject}
                    </div>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Message Body
                    </label>
                    {!isEditing ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsEditing(true)}
                        className="h-6 text-xs text-slate-500 hover:text-blue-600 flex items-center gap-1"
                      >
                        <Edit3 className="h-3 w-3" />
                        <span>Edit Text</span>
                      </Button>
                    ) : (
                      <span className="text-[11px] text-amber-600 italic">
                        Editing resets Approved status to Draft
                      </span>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="space-y-2">
                      <textarea
                        rows={7}
                        className="w-full rounded-md border border-slate-300 bg-white p-3 text-sm text-slate-900 font-sans focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={editableBody}
                        onChange={(e) => setEditableBody(e.target.value)}
                      />
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500">
                          {editableBody.length} characters (LinkedIn note limit: 300)
                        </span>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditableBody(activeDraft.body);
                              setIsEditing(false);
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleSaveEdit}
                            disabled={savingEdit}
                          >
                            {savingEdit ? "Saving..." : "Save Changes"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-md border border-slate-200 bg-slate-50/70 p-3.5 text-sm text-slate-800 leading-relaxed whitespace-pre-wrap font-sans">
                      {activeDraft.body}
                    </div>
                  )}
                </div>

                {/* Transparency Panel: Details Used for Personalization */}
                <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 text-xs space-y-2">
                  <div className="font-semibold text-slate-700 flex items-center gap-1.5">
                    <Eye className="h-3.5 w-3.5 text-slate-500" />
                    <span>Details Used for Personalization (Zero Fabrication Guarantee)</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                    <div>
                      <span className="text-slate-400">Derived Domain:</span>{" "}
                      <span className="font-medium text-slate-800">{activeDraft.details_used?.derived_domain || "Engineering"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Recipient:</span>{" "}
                      <span className="font-medium text-slate-800">{activeDraft.details_used?.contact_first_name} ({activeDraft.details_used?.contact_company})</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Target Roles:</span>{" "}
                      <span className="font-medium text-slate-800">
                        {Array.isArray(activeDraft.details_used?.target_roles)
                          ? activeDraft.details_used.target_roles.join(", ")
                          : "None"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400">Verified Skills:</span>{" "}
                      <span className="font-medium text-slate-800">
                        {Array.isArray(activeDraft.details_used?.verified_skills)
                          ? activeDraft.details_used.verified_skills.join(", ")
                          : "None"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* State Machine Transition Steps */}
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Approval & Delivery Workflow
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Draft -> Reviewed */}
                    {activeDraft.status === "Draft" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleTransition("Reviewed")}
                        disabled={transitioning}
                        className="text-xs flex items-center gap-1"
                      >
                        <Check className="h-3.5 w-3.5 text-blue-600" />
                        <span>Mark Reviewed</span>
                      </Button>
                    )}

                    {/* Reviewed / Draft -> Approved */}
                    {(activeDraft.status === "Draft" || activeDraft.status === "Reviewed") && (
                      <Button
                        size="sm"
                        onClick={() => handleTransition("Approved")}
                        disabled={transitioning}
                        className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Approve Draft</span>
                      </Button>
                    )}

                    {/* Approved -> Awaiting manual send */}
                    {activeDraft.status === "Approved" && (
                      <Button
                        size="sm"
                        onClick={() => handleTransition("Awaiting manual send")}
                        disabled={transitioning}
                        className="text-xs bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1"
                      >
                        <Clock className="h-3.5 w-3.5" />
                        <span>Move to Awaiting Send</span>
                      </Button>
                    )}

                    {/* Copy to Clipboard (Audit Logged, Never Changes State) */}
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={handleCopy}
                      className="text-xs flex items-center gap-1.5"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copy Message</span>
                    </Button>

                    {/* Direct Send Disabled with Explanation */}
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled
                      className="text-xs text-slate-400 cursor-not-allowed flex items-center gap-1"
                      title="Direct automated sending is not permitted by LinkedIn policy."
                    >
                      <Lock className="h-3.5 w-3.5 text-slate-400" />
                      <span>Direct Send (Blocked)</span>
                    </Button>
                  </div>

                  {/* Copy Feedback Toast */}
                  {copyFeedback && (
                    <div className="p-2 rounded bg-slate-900 text-white text-xs flex items-center gap-2 animate-in fade-in">
                      <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                      <span>{copyFeedback}</span>
                    </div>
                  )}
                </div>
              </CardContent>

              {/* Delivery Confirmation Footer */}
              <CardFooter className="border-t border-slate-100 bg-slate-50/50 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="text-xs text-slate-500">
                  {activeDraft.status === "User-confirmed sent" ? (
                    <span className="text-emerald-700 font-medium flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      Confirmed sent manually on LinkedIn. Follow-up scheduled.
                    </span>
                  ) : (
                    <span>Once you have sent the message on LinkedIn, confirm below to start the 7-day follow-up timer.</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {activeDraft.status !== "User-confirmed sent" ? (
                    <Button
                      size="sm"
                      onClick={() => handleTransition("User-confirmed sent")}
                      disabled={transitioning || activeDraft.status === "Draft"}
                      className="text-xs bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5"
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>Mark Sent by You</span>
                    </Button>
                  ) : (
                    <Link href="/tracker">
                      <Button size="sm" variant="outline" className="text-xs flex items-center gap-1.5">
                        <span>View in Tracker</span>
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </Link>
                  )}
                </div>
              </CardFooter>
            </Card>
          ) : (
            <Card className="border-dashed border-2 border-slate-200 bg-white p-12 text-center shadow-none">
              <div className="max-w-md mx-auto space-y-3">
                <div className="h-12 w-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                  <Mail className="h-6 w-6" />
                </div>
                <h3 className="text-base font-semibold text-slate-900">No draft selected</h3>
                <p className="text-xs text-slate-500">
                  Select a connection on the left and choose a template to generate a tailored, zero-fabrication outreach message.
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
