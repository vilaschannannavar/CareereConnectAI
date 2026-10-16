"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Star,
  Sparkles,
  Sliders,
  Download,
  Info,
  ExternalLink,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Building,
  Briefcase,
  X,
  Tag,
  ShieldAlert,
  FolderPlus,
} from "lucide-react";

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  profile_url: string;
  email?: string | null;
  company: string;
  position: string;
  connected_on?: string | null;
}

interface FactorItem {
  sub_score: number;
  normalized_weight: number;
  original_weight: number;
  evidence: string;
  is_scorable: boolean;
}

interface Analysis {
  id: string;
  contact_id: string;
  score: number;
  priority: string;
  confidence: number;
  categories: string[];
  reasons: string[];
  missing_info: string[];
  factor_breakdown: Record<string, FactorItem>;
  weights_used: Record<string, number>;
  user_override: boolean;
}

interface ShortlistSummary {
  id: string;
  name: string;
  description?: string | null;
  items_count: number;
}

const CATEGORY_LABELS: Record<string, { label: string; color: string; desc: string }> = {
  A: { label: "Recruiter / HR", color: "bg-purple-100 text-purple-800 border-purple-200", desc: "HR, Talent Acquisition, or Campus Recruiter" },
  B: { label: "Tech Professional", color: "bg-blue-100 text-blue-800 border-blue-200", desc: "Software Engineer, Architect, or Data Scientist" },
  C: { label: "Eng Leadership", color: "bg-amber-100 text-amber-800 border-amber-200", desc: "Engineering Manager, Director, or CTO" },
  D: { label: "Referrer", color: "bg-emerald-100 text-emerald-800 border-emerald-200", desc: "Target company employer or verified alumni" },
  E: { label: "Low Relevance", color: "bg-slate-100 text-slate-700 border-slate-200", desc: "Outside technical and recruiting scope" },
};

export default function ShortlistPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [analyses, setAnalyses] = useState<Record<string, Analysis>>({});
  const [shortlists, setShortlists] = useState<ShortlistSummary[]>([]);
  const [activeShortlistId, setActiveShortlistId] = useState<string>("all");

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [search, setSearch] = useState<string>("");

  // Loading & notification states
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isScoringBatch, setIsScoringBatch] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Explanation Modal State
  const [explainingContact, setExplainingContact] = useState<{ contact: Contact; analysis: Analysis } | null>(null);

  // Edit Categories Modal State
  const [editingAnalysis, setEditingAnalysis] = useState<Analysis | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Weights Adjustment Modal State
  const [isWeightsModalOpen, setIsWeightsModalOpen] = useState<boolean>(false);
  const [weights, setWeights] = useState({
    role_relevance: 30,
    ability_to_help: 25,
    company_industry: 20,
    technical_domain: 15,
    recruitment_referral_evidence: 10,
  });

  // Shortlist Creation / Rename Modal State
  const [isShortlistModalOpen, setIsShortlistModalOpen] = useState<boolean>(false);
  const [shortlistName, setShortlistName] = useState<string>("");
  const [shortlistDesc, setShortlistDesc] = useState<string>("");
  const [editingShortlistId, setEditingShortlistId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);

      // 1. Load contacts
      const contactsRes = await apiClient<{ items: Contact[]; total: number }>("/contacts?size=100");
      setContacts(contactsRes.items || []);

      // 2. Load analyses
      const analysesRes = await apiClient<Analysis[]>("/scoring/analyses");
      const map: Record<string, Analysis> = {};
      (analysesRes || []).forEach((a) => {
        map[a.contact_id] = a;
      });
      setAnalyses(map);

      // 3. Load shortlists
      const slRes = await apiClient<ShortlistSummary[]>("/shortlists");
      setShortlists(slRes || []);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load shortlist records.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleBatchAnalyze = async () => {
    try {
      setIsScoringBatch(true);
      setErrorMessage(null);
      const res = await apiClient<{ total_processed: number; newly_analyzed: number; cached_hits: number; high_priority_count: number }>(
        "/scoring/batch-analyze",
        { method: "POST" }
      );
      setStatusMessage(
        `Scoring completed: ${res.newly_analyzed} newly evaluated, ${res.cached_hits} cached hits. ${res.high_priority_count} high-priority matches identified.`
      );
      setTimeout(() => setStatusMessage(null), 6000);
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to score contacts.");
    } finally {
      setIsScoringBatch(false);
    }
  };

  const handleApplyWeights = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient("/scoring/re-score", {
        method: "POST",
        data: weights,
      });
      setIsWeightsModalOpen(false);
      setStatusMessage("Scores re-calculated successfully with customized factor weights.");
      setTimeout(() => setStatusMessage(null), 4000);
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to re-score with custom weights.");
    }
  };

  const handleSaveCategories = async () => {
    if (!editingAnalysis) return;
    try {
      await apiClient(`/scoring/analysis/${editingAnalysis.id}`, {
        method: "PUT",
        data: { categories: selectedTags },
      });
      setEditingAnalysis(null);
      setStatusMessage("Category tags updated successfully.");
      setTimeout(() => setStatusMessage(null), 3000);
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to update category tags.");
    }
  };

  const handleCreateOrUpdateShortlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shortlistName.trim()) return;

    try {
      if (editingShortlistId) {
        await apiClient(`/shortlists/${editingShortlistId}`, {
          method: "PUT",
          data: { name: shortlistName.trim(), description: shortlistDesc.trim() || null },
        });
        setStatusMessage("Shortlist renamed successfully.");
      } else {
        const created = await apiClient<ShortlistSummary>("/shortlists", {
          method: "POST",
          data: { name: shortlistName.trim(), description: shortlistDesc.trim() || null },
        });
        setActiveShortlistId(created.id);
        setStatusMessage(`Shortlist '${created.name}' created.`);
      }
      setIsShortlistModalOpen(false);
      setShortlistName("");
      setShortlistDesc("");
      setEditingShortlistId(null);
      setTimeout(() => setStatusMessage(null), 4000);
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to save shortlist.");
    }
  };

  const handleDeleteShortlist = async (id: string) => {
    if (!confirm("Are you sure you want to delete this shortlist?")) return;
    try {
      await apiClient(`/shortlists/${id}`, { method: "DELETE" });
      setActiveShortlistId("all");
      setStatusMessage("Shortlist deleted.");
      setTimeout(() => setStatusMessage(null), 3000);
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to delete shortlist.");
    }
  };

  const handleExportCsv = async (shortlistId: string, name: string) => {
    try {
      const res = await fetch(`/api/v1/shortlists/${shortlistId}/export-csv`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Export failed.");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `shortlist_${name.toLowerCase().replace(/\s+/g, "_")}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setErrorMessage("Failed to export shortlist to CSV.");
    }
  };

  // Filtered contacts list
  const filteredContacts = contacts.filter((contact) => {
    const analysis = analyses[contact.id];

    // Search query
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = `${contact.first_name} ${contact.last_name}`.toLowerCase().includes(q);
      const matchComp = contact.company.toLowerCase().includes(q);
      const matchPos = contact.position.toLowerCase().includes(q);
      if (!matchName && !matchComp && !matchPos) return false;
    }

    // Category filter
    if (categoryFilter !== "ALL") {
      if (!analysis || !analysis.categories.includes(categoryFilter)) return false;
    }

    // Priority filter
    if (priorityFilter !== "ALL") {
      if (!analysis || analysis.priority !== priorityFilter) return false;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Target Shortlist &amp; Match Scoring</h1>
          <p className="text-sm text-slate-500">
            Ranked connections across recruiter relevance, team referral authority, and target company match.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsWeightsModalOpen(true)}
          >
            <Sliders className="mr-1.5 h-4 w-4" />
            Adjust Weights
          </Button>

          <Button
            variant="default"
            size="sm"
            disabled={isScoringBatch}
            onClick={handleBatchAnalyze}
          >
            {isScoringBatch ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Scoring All...
              </>
            ) : (
              <>
                <Sparkles className="mr-1.5 h-4 w-4" />
                Score Connections
              </>
            )}
          </Button>
        </div>
      </div>

      {/* PROMINENT MANDATORY UI NOTICE */}
      <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 text-sm text-blue-900 flex items-start gap-3 shadow-sm">
        <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold">Transparency &amp; Objective Scoring Notice</p>
          <p className="text-xs text-blue-800 mt-0.5">
            <strong>A high score means relevance, not that the person is hiring.</strong> Scores measure organizational alignment,
            career track overlap, and referral opportunity—not active open requisitions.
          </p>
        </div>
      </div>

      {statusMessage && (
        <div className="rounded-lg bg-emerald-50 p-4 border border-emerald-200 text-sm text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="rounded-lg bg-red-50 p-4 border border-red-200 text-sm text-red-700 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Shortlist Tabs & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setActiveShortlistId("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeShortlistId === "all"
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            All Connections ({contacts.length})
          </button>

          {shortlists.map((sl) => (
            <button
              key={sl.id}
              type="button"
              onClick={() => setActiveShortlistId(sl.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeShortlistId === sl.id
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <span>{sl.name}</span>
              <span className="text-[10px] opacity-75">({sl.items_count})</span>
            </button>
          ))}

          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => {
              setEditingShortlistId(null);
              setShortlistName("");
              setShortlistDesc("");
              setIsShortlistModalOpen(true);
            }}
          >
            <Plus className="mr-1 h-3 w-3" />
            New Shortlist
          </Button>
        </div>

        {activeShortlistId !== "all" && (
          <div className="flex items-center gap-2">
            {(() => {
              const activeSl = shortlists.find((s) => s.id === activeShortlistId);
              if (!activeSl) return null;
              return (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => handleExportCsv(activeSl.id, activeSl.name)}
                  >
                    <Download className="mr-1 h-3 w-3" />
                    Export CSV
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => {
                      setEditingShortlistId(activeSl.id);
                      setShortlistName(activeSl.name);
                      setShortlistDesc(activeSl.description || "");
                      setIsShortlistModalOpen(true);
                    }}
                  >
                    <Edit2 className="mr-1 h-3 w-3" />
                    Rename
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs text-red-600 hover:bg-red-50 border-red-200"
                    onClick={() => handleDeleteShortlist(activeSl.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </>
              );
            })()}
          </div>
        )}
      </div>

      {/* Filter and Category Pills */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <Input
              placeholder="Search by name, role, or company..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
            />

            {/* Category Pills */}
            <div className="flex items-center gap-1.5 flex-wrap text-xs">
              <span className="text-slate-400 font-medium mr-1">Categories:</span>
              <button
                type="button"
                onClick={() => setCategoryFilter("ALL")}
                className={`px-2 py-1 rounded text-xs font-medium border ${
                  categoryFilter === "ALL" ? "bg-slate-800 text-white border-slate-800" : "bg-white text-slate-600 border-slate-200"
                }`}
              >
                All
              </button>
              {Object.entries(CATEGORY_LABELS).map(([key, item]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setCategoryFilter(categoryFilter === key ? "ALL" : key)}
                  className={`px-2 py-1 rounded text-xs font-medium border transition-colors ${
                    categoryFilter === key ? "ring-2 ring-blue-500 " + item.color : "bg-white text-slate-600 border-slate-200"
                  }`}
                  title={item.desc}
                >
                  [{key}] {item.label}
                </button>
              ))}
            </div>

            {/* Priority Selector */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-400 font-medium">Priority:</span>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="rounded border border-slate-200 p-1 text-xs text-slate-700 bg-white"
              >
                <option value="ALL">All Priorities</option>
                <option value="High">High (&ge; 70)</option>
                <option value="Medium">Medium (40–69)</option>
                <option value="Low">Low (&lt; 40)</option>
                <option value="Insufficient information">Insufficient Info</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact Cards Grid */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : filteredContacts.length === 0 ? (
        <Card className="border-dashed border-2 border-slate-300 bg-white p-12 text-center">
          <div className="max-w-md mx-auto space-y-4">
            <div className="h-12 w-12 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
              <Star className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold text-slate-900">No matching connections found</h3>
            <p className="text-sm text-slate-500">
              {contacts.length === 0
                ? "Import connections or run scoring to view ranked outreach prospects."
                : "Try adjusting your search query or category filters."}
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredContacts.map((contact) => {
            const analysis = analyses[contact.id];
            const score = analysis?.score ?? null;
            const priority = analysis?.priority ?? "Unscored";
            const categories = analysis?.categories ?? [];

            const priorityBadge =
              priority === "High" ? (
                <Badge variant="success">High ({score})</Badge>
              ) : priority === "Medium" ? (
                <Badge variant="warning">Medium ({score})</Badge>
              ) : priority === "Low" ? (
                <Badge variant="secondary">Low ({score})</Badge>
              ) : (
                <Badge variant="outline">Insufficient Info</Badge>
              );

            return (
              <Card key={contact.id} className="hover:border-slate-300 transition-colors flex flex-col justify-between">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-slate-900">
                        {contact.first_name} {contact.last_name}
                      </h4>
                      <p className="text-xs text-slate-600 flex items-center gap-1 mt-0.5">
                        <Briefcase className="h-3 w-3 text-slate-400 shrink-0" />
                        <span className="truncate">{contact.position || "Unknown"}</span>
                      </p>
                    </div>
                    {contact.profile_url && (
                      <a
                        href={contact.profile_url.startsWith("http") ? contact.profile_url : `https://${contact.profile_url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-400 hover:text-blue-600 transition-colors p-1"
                        title="Open LinkedIn Profile"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </div>

                  <div className="text-xs text-slate-500 flex items-center justify-between">
                    <span className="flex items-center gap-1 truncate">
                      <Building className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{contact.company || "Unknown"}</span>
                    </span>
                    {contact.company && (
                      <a
                        href={`https://www.google.com/search?q=${encodeURIComponent(contact.company)}+official+careers+jobs`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5 shrink-0 ml-2"
                        title="Search verified company career portal"
                      >
                        <span>Careers</span>
                        <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    )}
                  </div>

                  {/* Priority & Score + Category Badges */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {priorityBadge}
                      {categories.map((c) => (
                        <span
                          key={c}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${CATEGORY_LABELS[c]?.color || "bg-slate-100 text-slate-700"}`}
                        >
                          {c}
                        </span>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (analysis) {
                          setEditingAnalysis(analysis);
                          setSelectedTags(analysis.categories || []);
                        }
                      }}
                      className="text-slate-400 hover:text-slate-600 p-1"
                      title="Edit Category Tags"
                    >
                      <Tag className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </CardContent>

                <CardFooter className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                  {analysis ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => setExplainingContact({ contact, analysis })}
                    >
                      Explain Score
                    </Button>
                  ) : (
                    <span className="text-xs text-slate-400 italic">Not evaluated</span>
                  )}

                  <Link href={`/messages?contact_id=${contact.id}`}>
                    <Button size="sm" className="text-xs h-7">
                      Draft Outreach
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* EXPLANATION PANEL MODAL */}
      {explainingContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl bg-white rounded-xl shadow-xl overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  Score Explanation: {explainingContact.contact.first_name} {explainingContact.contact.last_name}
                </h3>
                <p className="text-xs text-slate-500">
                  {explainingContact.contact.position} at {explainingContact.contact.company}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setExplainingContact(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-3 gap-3 text-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div>
                  <p className="text-xs text-slate-400">Match Score</p>
                  <p className="text-xl font-bold text-slate-900">{explainingContact.analysis.score} / 100</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Priority Tier</p>
                  <p className="text-xl font-bold text-blue-600">{explainingContact.analysis.priority}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Confidence</p>
                  <p className="text-xl font-bold text-slate-900">
                    {Math.round(explainingContact.analysis.confidence * 100)}%
                  </p>
                </div>
              </div>

              {/* Factors Breakdown Table */}
              <div>
                <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  5-Factor Evidence &amp; Weight Breakdown
                </h4>
                <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
                  <table className="w-full border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                      <tr>
                        <th className="p-2.5 text-left font-medium">Evaluation Factor</th>
                        <th className="p-2.5 text-center font-medium">Sub-Score</th>
                        <th className="p-2.5 text-center font-medium">Weight</th>
                        <th className="p-2.5 text-left font-medium">Verified Evidence</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {Object.entries(explainingContact.analysis.factor_breakdown || {}).map(([key, f]) => (
                        <tr key={key} className={!f.is_scorable ? "bg-slate-50/50 text-slate-400" : ""}>
                          <td className="p-2.5 font-medium capitalize text-slate-800">
                            {key.replace(/_/g, " ")}
                          </td>
                          <td className="p-2.5 text-center font-bold">
                            {f.is_scorable ? f.sub_score : "—"}
                          </td>
                          <td className="p-2.5 text-center text-slate-500">
                            {f.normalized_weight}%
                          </td>
                          <td className="p-2.5 text-slate-600">{f.evidence}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Categorization Reasons */}
              <div>
                <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Classification Rationales
                </h4>
                <ul className="list-disc pl-5 text-xs text-slate-600 space-y-1">
                  {explainingContact.analysis.reasons.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>

              {/* Missing Information */}
              {explainingContact.analysis.missing_info.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                  <p className="font-semibold mb-1">Missing / Unverified Data:</p>
                  <ul className="list-disc pl-5 space-y-0.5">
                    {explainingContact.analysis.missing_info.map((m, i) => (
                      <li key={i}>{m}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="flex justify-end px-6 py-3 bg-slate-50 border-t border-slate-100">
              <Button size="sm" onClick={() => setExplainingContact(null)}>
                Close Breakdown
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* WEIGHTS ADJUSTMENT MODAL */}
      {isWeightsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg bg-white rounded-xl shadow-xl overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Sliders className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-slate-900">Customize Scoring Weights</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsWeightsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleApplyWeights}>
              <div className="p-6 space-y-4">
                <p className="text-xs text-slate-500">
                  Tune factor importance to your campaign. Re-scoring runs instantly across your connections without LLM API overhead.
                </p>

                {Object.entries(weights).map(([factor, val]) => (
                  <div key={factor} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium text-slate-700">
                      <span className="capitalize">{factor.replace(/_/g, " ")}:</span>
                      <span className="font-bold">{val}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={val}
                      onChange={(e) =>
                        setWeights((prev) => ({ ...prev, [factor]: parseFloat(e.target.value) }))
                      }
                      className="w-full accent-blue-600"
                    />
                  </div>
                ))}

                <div className="pt-2 flex justify-between items-center text-xs border-t border-slate-100">
                  <span className="text-slate-500">Total Weight:</span>
                  <span
                    className={`font-bold ${
                      Object.values(weights).reduce((a, b) => a + b, 0) === 100
                        ? "text-emerald-600"
                        : "text-amber-600"
                    }`}
                  >
                    {Object.values(weights).reduce((a, b) => a + b, 0)}% (Auto-renormalized)
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-3 px-6 py-3 bg-slate-50 border-t border-slate-100">
                <Button variant="outline" size="sm" type="button" onClick={() => setIsWeightsModalOpen(false)}>
                  Cancel
                </Button>
                <Button size="sm" type="submit">
                  Apply &amp; Re-Score
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT CATEGORIES MODAL */}
      {editingAnalysis && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-base font-semibold text-slate-900">Edit Category Tags</h3>
              <button
                type="button"
                onClick={() => setEditingAnalysis(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-3">
              <p className="text-xs text-slate-500">
                Select applicable multi-tag categories. Category D strictly requires target company or alumni evidence.
              </p>

              {Object.entries(CATEGORY_LABELS).map(([cat, info]) => {
                const isSelected = selectedTags.includes(cat);
                return (
                  <label
                    key={cat}
                    className={`flex items-start gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                      isSelected ? "border-blue-500 bg-blue-50/50" : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {
                        setSelectedTags((prev) =>
                          isSelected ? prev.filter((c) => c !== cat) : [...prev, cat]
                        );
                      }}
                      className="mt-0.5"
                    />
                    <div>
                      <p className="text-xs font-semibold text-slate-800">
                        [{cat}] {info.label}
                      </p>
                      <p className="text-[11px] text-slate-500">{info.desc}</p>
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="flex justify-end gap-3 px-6 py-3 bg-slate-50 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setEditingAnalysis(null)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSaveCategories}>
                Save Categories
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / RENAME SHORTLIST MODAL */}
      {isShortlistModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FolderPlus className="h-5 w-5 text-blue-600" />
                <h3 className="text-base font-semibold text-slate-900">
                  {editingShortlistId ? "Rename Shortlist" : "Create New Shortlist"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsShortlistModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrUpdateShortlist}>
              <div className="p-6 space-y-3">
                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">Shortlist Name:</label>
                  <Input
                    value={shortlistName}
                    onChange={(e) => setShortlistName(e.target.value)}
                    placeholder="e.g. Tier 1 Cloud Recruiters"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">Description (Optional):</label>
                  <Input
                    value={shortlistDesc}
                    onChange={(e) => setShortlistDesc(e.target.value)}
                    placeholder="e.g. High priority target company referrers"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 px-6 py-3 bg-slate-50 border-t border-slate-100">
                <Button variant="outline" size="sm" type="button" onClick={() => setIsShortlistModalOpen(false)}>
                  Cancel
                </Button>
                <Button size="sm" type="submit">
                  {editingShortlistId ? "Save Changes" : "Create Shortlist"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
