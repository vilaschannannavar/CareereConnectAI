"use client";

import React from "react";
import { useAuth } from "@/context/AuthContext";
import OverviewPage from "./overview/page";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Briefcase, ArrowRight, ShieldCheck, Lock, Users, Sparkles } from "lucide-react";

export default function RootHomePage() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  // If authenticated, render the Overview dashboard
  if (isAuthenticated) {
    return <OverviewPage />;
  }

  // Landing page for non-authenticated guests
  return (
    <div className="py-12 space-y-16">
      <section className="text-center max-w-3xl mx-auto space-y-6">
        <Badge variant="default" className="text-xs py-1 px-3">
          Zero-Scraping &bull; Multi-User &bull; LLM-Powered
        </Badge>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
          Find recruiters and referrers <br />
          <span className="text-blue-600">safely among your connections</span>
        </h1>
        <p className="text-base sm:text-lg text-slate-600">
          CareerConnect AI maps your 1st-degree LinkedIn connections, highlights high-probability referrers,
          drafts personalized outreach, and tracks follow-ups without scraping or risking your LinkedIn account.
        </p>
        <div className="flex justify-center gap-4 pt-4">
          <Link href="/register">
            <Button size="lg" className="flex items-center gap-2">
              Get Started Free <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="outline" size="lg">Sign In</Button>
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-2 shadow-sm">
          <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Users className="h-5 w-5" />
          </div>
          <h3 className="font-semibold text-slate-900">Connections Map</h3>
          <p className="text-sm text-slate-500">
            Import your official LinkedIn data archive safely with zero password sharing.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-2 shadow-sm">
          <div className="h-10 w-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Sparkles className="h-5 w-5" />
          </div>
          <h3 className="font-semibold text-slate-900">AI Scoring & Ranking</h3>
          <p className="text-sm text-slate-500">
            Match alumni, hiring managers, and engineers to your target roles and companies.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-2 shadow-sm">
          <div className="h-10 w-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <h3 className="font-semibold text-slate-900">Safe Outreach</h3>
          <p className="text-sm text-slate-500">
            Review and copy personalized messages to send yourself directly on LinkedIn.
          </p>
        </div>
      </section>
    </div>
  );
}
