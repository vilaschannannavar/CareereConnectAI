"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useCapabilities } from "@/context/CapabilityContext";
import { api } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HonestButton } from "@/components/ui/honest-button";
import {
  Users,
  Star,
  Mail,
  Send,
  FileSpreadsheet,
  Database,
  ArrowRight,
  ShieldAlert,
  Loader2,
  Sparkles,
  CheckCircle2,
  Clock,
  MessageSquare,
  AlertCircle,
  HelpCircle,
  ListTodo
} from "lucide-react";

export default function OverviewPage() {
  const { user } = useAuth();
  const { capabilities } = useCapabilities();
  const [stats, setStats] = useState({
    totalConnections: 0,
    analyzed: 0,
    shortlisted: 0,
    drafts: 0,
    approved: 0,
    outreachSent: 0,
    replied: 0,
  });
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [contactsRes, analysesRes, shortlistRes, messagesRes, pipelineRes, profileRes] = await Promise.all([
        api.get<{ total: number }>("/contacts?size=1").catch(() => ({ total: 0 })),
        api.get<any[]>("/scoring/analyses").catch(() => []),
        api.get<any[]>("/shortlists").catch(() => []),
        api.get<any[]>("/messages").catch(() => []),
        api.get<any>("/tracker").catch(() => ({})),
        api.get<any>("/profile").catch(() => null),
      ]);

      setStats({
        totalConnections: contactsRes.total || 0,
        analyzed: analysesRes.length || 0,
        shortlisted: shortlistRes.length || 0,
        drafts: messagesRes.length || 0,
        approved: pipelineRes.approved?.length || 0,
        outreachSent: (pipelineRes.marked_sent?.length || 0) + (pipelineRes.sent_verified?.length || 0),
        replied: pipelineRes.replied?.length || 0,
      });

      if (profileRes?.preferences?.onboarding_completed) {
        setOnboardingCompleted(true);
      }
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleLoadSynthetic = async () => {
    try {
      setIsGenerating(true);
      setError(null);
      await api.post("/contacts/synthetic");
      await loadData();
    } catch (err: any) {
      setError(err?.message || "Failed to load synthetic fixtures.");
    } finally {
      setIsGenerating(false);
    }
  };

  const funnelSteps = [
    { label: "Imported", count: stats.totalConnections, color: "bg-blue-500" },
    { label: "Analyzed", count: stats.analyzed, color: "bg-indigo-500" },
    { label: "Shortlisted", count: stats.shortlisted, color: "bg-amber-500" },
    { label: "Drafted", count: stats.drafts, color: "bg-purple-500" },
    { label: "Approved", count: stats.approved, color: "bg-cyan-500" },
    { label: "Sent", count: stats.outreachSent, color: "bg-emerald-500" },
    { label: "Replied", count: stats.replied, color: "bg-rose-500" },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Welcome back, {user?.full_name || "Job Seeker"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Find warm referral paths, identify active recruiters among your connections, and draft safe outreach.
          </p>
        </div>
        {!onboardingCompleted && (
          <Button asChild size="sm" className="gap-1.5 self-start sm:self-auto bg-primary text-primary-foreground">
            <Link href="/onboarding">
              <Sparkles className="h-4 w-4" /> 5-Step Guided Setup
            </Link>
          </Button>
        )}
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 p-4 border border-destructive/20 text-sm text-destructive flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Honest Disclaimer Banner */}
      <div className="p-3 bg-muted/40 border border-border/80 rounded-xl flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
          <span>
            <strong>Honest Intelligence Notice:</strong> A high score means career relevance and skill alignment, not that the person is actively hiring.
          </span>
        </div>
        <Link href="/privacy" className="text-primary hover:underline shrink-0 hidden sm:inline">
          Compliance Guarantee &rarr;
        </Link>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Total Connections
            </CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.totalConnections}</div>
            <p className="text-xs text-muted-foreground mt-1">1st-degree connections imported</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Shortlisted Matches
            </CardTitle>
            <Star className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.shortlisted}</div>
            <p className="text-xs text-muted-foreground mt-1">Recruiters & potential referrers</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Message Studio Drafts
            </CardTitle>
            <Mail className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.drafts}</div>
            <p className="text-xs text-muted-foreground mt-1">Personalized drafts ready to copy</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Outreach Sent
            </CardTitle>
            <Send className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.outreachSent}</div>
            <p className="text-xs text-muted-foreground mt-1">Confirmed sent manually by you</p>
          </CardContent>
        </Card>
      </div>

      {/* Networking Funnel Widget */}
      <Card className="border-border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-border/40 pb-3">
          <div className="flex items-center gap-2">
            <ListTodo className="h-4 w-4 text-primary" />
            <span className="text-sm font-bold text-foreground">Outreach Conversion Funnel</span>
          </div>
          <span className="text-xs text-muted-foreground">Pipeline Health & Velocity</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {funnelSteps.map((step, idx) => (
            <div key={step.label} className="flex flex-col p-3 rounded-lg bg-muted/40 border border-border/40 text-center">
              <span className="text-[11px] font-medium text-muted-foreground">{step.label}</span>
              <span className="text-xl font-bold text-foreground mt-1">{step.count}</span>
              <div className="w-full bg-muted h-1 rounded-full mt-2 overflow-hidden">
                <div
                  className={`h-full ${step.color}`}
                  style={{ width: `${Math.min(100, Math.max(8, (step.count / (stats.totalConnections || 1)) * 100))}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Main Action Banner / Empty State */}
      {stats.totalConnections === 0 ? (
        <Card className="border-dashed border-2 border-border bg-card p-8 text-center">
          <div className="max-w-md mx-auto space-y-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
              <Users className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-bold text-foreground">No connections imported yet</h2>
            <p className="text-sm text-muted-foreground">
              Export your official <code className="bg-muted px-1 py-0.5 rounded text-xs">Connections.csv</code> from LinkedIn data privacy settings or generate test fixtures to begin.
            </p>
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/connections">
                <Button className="flex items-center gap-2 w-full sm:w-auto">
                  <FileSpreadsheet className="h-4 w-4" />
                  Import Connections CSV
                </Button>
              </Link>
              <HonestButton
                capabilityKey="synthetic_data_generator"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={handleLoadSynthetic}
                disabled={isGenerating}
                type="button"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading Fixtures...
                  </>
                ) : (
                  <>
                    <Database className="mr-2 h-4 w-4" />
                    Load Synthetic Fixture
                  </>
                )}
              </HonestButton>
            </div>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-base">Next Best Actions</CardTitle>
              <CardDescription>Recommended steps to accelerate your job search</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/shortlist" className="block">
                <Button variant="outline" className="w-full justify-between h-10">
                  <span className="flex items-center gap-2 text-xs">
                    <Star className="h-4 w-4 text-amber-500" /> Review High-Relevance Referrers
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/openings" className="block">
                <Button variant="outline" className="w-full justify-between h-10">
                  <span className="flex items-center gap-2 text-xs">
                    <Sparkles className="h-4 w-4 text-primary" /> Track Target Job Openings
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/tracker" className="block">
                <Button variant="outline" className="w-full justify-between h-10">
                  <span className="flex items-center gap-2 text-xs">
                    <Clock className="h-4 w-4 text-emerald-500" /> Check Outreach Follow-up Status
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-base">Workspace Navigation</CardTitle>
              <CardDescription>Jump straight to your tools</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/connections" className="block">
                <Button variant="outline" className="w-full justify-between h-10">
                  <span>Browse & Filter Connections</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/messages" className="block">
                <Button variant="outline" className="w-full justify-between h-10">
                  <span>Open Message Studio</span>
                  <Sparkles className="h-4 w-4 text-amber-500" />
                </Button>
              </Link>
              <Link href="/settings" className="block">
                <Button variant="outline" className="w-full justify-between h-10">
                  <span>Resume & Scoring Weights</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
