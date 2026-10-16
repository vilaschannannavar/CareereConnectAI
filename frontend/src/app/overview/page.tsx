"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useCapabilities } from "@/context/CapabilityContext";
import { apiClient } from "@/lib/api";
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
  Sparkles
} from "lucide-react";

export default function OverviewPage() {
  const { user } = useAuth();
  const { capabilities } = useCapabilities();
  const [stats, setStats] = useState({
    totalConnections: 0,
    shortlisted: 0,
    drafts: 0,
    outreachSent: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStats = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await apiClient<{ total: number }>("/contacts?size=1");
      setStats((prev) => ({ ...prev, totalConnections: res.total || 0 }));
    } catch (err: any) {
      setStats({ totalConnections: 0, shortlisted: 0, drafts: 0, outreachSent: 0 });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleLoadSynthetic = async () => {
    try {
      setIsGenerating(true);
      setError(null);
      await apiClient("/contacts/synthetic", { method: "POST" });
      await loadStats();
    } catch (err: any) {
      setError(err.message || "Failed to load synthetic fixtures.");
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading && stats.totalConnections === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Welcome back, {user?.full_name || "Job Seeker"}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Find warm referral paths, identify active recruiters among your connections, and draft safe outreach.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 border border-red-200 text-sm text-red-700 flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Total Connections
            </CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{stats.totalConnections}</div>
            <p className="text-xs text-slate-500 mt-1">1st-degree connections imported</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Shortlisted Matches
            </CardTitle>
            <Star className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{stats.shortlisted}</div>
            <p className="text-xs text-slate-500 mt-1">Recruiters & potential referrers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Message Studio Drafts
            </CardTitle>
            <Mail className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{stats.drafts}</div>
            <p className="text-xs text-slate-500 mt-1">Personalized drafts ready to copy</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Outreach Sent
            </CardTitle>
            <Send className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{stats.outreachSent}</div>
            <p className="text-xs text-slate-500 mt-1">Confirmed sent manually by you</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Action Banner / Empty State */}
      {stats.totalConnections === 0 ? (
        <Card className="border-dashed border-2 border-slate-300 bg-white p-8 text-center">
          <div className="max-w-md mx-auto space-y-4">
            <div className="h-12 w-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
              <Users className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">No connections imported yet</h2>
            <p className="text-sm text-slate-500">
              Export your official <code className="bg-slate-100 px-1 py-0.5 rounded text-xs">Connections.csv</code> from LinkedIn data privacy settings or generate test fixtures to begin.
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
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Actions</CardTitle>
              <CardDescription>Common outreach workflows</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/connections" className="block">
                <Button variant="outline" className="w-full justify-between">
                  <span>Browse & Filter Connections</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/shortlist" className="block">
                <Button variant="outline" className="w-full justify-between">
                  <span>View Scored Shortlist</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/messages" className="block">
                <Button variant="outline" className="w-full justify-between">
                  <span>Generate AI Message Draft</span>
                  <Sparkles className="h-4 w-4 text-amber-500" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
