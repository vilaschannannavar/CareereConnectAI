"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import OverviewPage from "./overview/page";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Briefcase,
  ArrowRight,
  ShieldCheck,
  Lock,
  Users,
  Sparkles,
  FileText,
  Copy,
  ChevronDown,
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ExternalLink,
} from "lucide-react";

export default function RootHomePage() {
  const { isAuthenticated, isLoading } = useAuth();
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // If authenticated, render the internal Overview dashboard
  if (isAuthenticated) {
    return <OverviewPage />;
  }

  const faqs = [
    {
      q: "Is CareerConnect AI compliant with LinkedIn's Developer Policies and Terms of Service?",
      a: "Yes, 100%. Unlike invasive browser extensions or bot scrapers that risk account suspension, CareerConnect AI never automates linkedin.com or scrapes web pages. Data ingestion occurs strictly through the member's official, self-serve data archive (Connections.csv) which every LinkedIn member has a legal right to download.",
    },
    {
      q: "Why do I have to copy messages manually instead of sending them automatically?",
      a: "LinkedIn restricts programmatic member-to-member messaging APIs strictly to enterprise partner programs. Any general tool claiming to send messages automatically relies on unauthorized browser automation. CareerConnect AI formats and drafts your outreach, checks character counts, and gives you a single click to copy so you send the message yourself on LinkedIn safely.",
    },
    {
      q: "What is the 300-character note limit?",
      a: "When you send a connection invitation to someone on LinkedIn, platform rules enforce a strict 300-character maximum for the attached note. Our Message Studio provides real-time character counters and tailored 'connection note' templates so your message fits without being cut off.",
    },
    {
      q: "How is my resume and connection data protected?",
      a: "Your resume and contact records are sandboxed in isolated private storage. We enforce PostgreSQL Row-Level Security (RLS) and dual-layer authorization ensuring no user can ever access another user's resources (foreign IDs return 404). You can export all your data or permanently delete your account cascade at any time in Settings.",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Public Marketing Header */}
      <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center space-x-2.5">
            <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-sm">
              <Briefcase className="h-5 w-5" />
            </div>
            <div>
              <span className="font-bold text-base text-foreground tracking-tight">
                CareerConnect <span className="text-primary">AI</span>
              </span>
              <span className="text-[10px] uppercase font-semibold tracking-wider text-success block">
                Safe &bull; Zero-Scrape
              </span>
            </div>
          </Link>

          <div className="flex items-center space-x-3">
            <ThemeToggle />
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">Sign In</Link>
            </Button>
            <Button asChild variant="default" size="sm">
              <Link href="/register" className="flex items-center gap-1.5">
                <span>Get Started Free</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-16 md:pt-20 md:pb-24 border-b border-border/40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 shadow-xs animate-fade-in">
            <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span>Zero-Scraping &bull; Official Member Archive &bull; Multi-User</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-foreground tracking-tight leading-[1.15]">
            Find verified recruiters & referrers <br className="hidden sm:inline" />
            <span className="text-primary bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              safely among your connections
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-lg text-muted-foreground leading-relaxed">
            Turn your 1st-degree LinkedIn connections into warm career opportunities. CareerConnect AI calculates objective relevance scores, drafts personalized outreach tailored to your target companies, and tracks follow-ups without automated bot activity.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Button asChild size="lg" className="rounded-xl px-6 h-12 shadow-md">
              <Link href="/register" className="flex items-center gap-2 font-semibold">
                <span>Start Networking Safely</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="rounded-xl px-6 h-12">
              <Link href="/login">Sign In to Dashboard</Link>
            </Button>
          </div>

          {/* Trust Guarantees Bar */}
          <div className="pt-10 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs text-muted-foreground font-medium">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <span>No Password Sharing</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <span>No Headless Browsers</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <span>300-Char Note Guard</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <span>Row-Level Security</span>
            </div>
          </div>
        </div>
      </section>

      {/* 4-Step "How It Works" Section */}
      <section className="py-16 md:py-24 bg-card/40 border-b border-border/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              Simple 4-Step Workflow
            </span>
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              From LinkedIn archive to your first interview
            </h2>
            <p className="text-sm text-muted-foreground">
              A transparent, safe methodology that puts you in complete control.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="rounded-xl border border-border bg-card p-6 space-y-3 shadow-xs">
              <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                1
              </div>
              <h3 className="font-semibold text-foreground text-base">Export Connections</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Download your official 1st-degree `Connections.csv` archive directly from LinkedIn Settings & Privacy. Zero password sharing.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-6 space-y-3 shadow-xs">
              <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                2
              </div>
              <h3 className="font-semibold text-foreground text-base">Upload & Parse Resume</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Upload your PDF or Word resume. Our parser extracts verified roles and skills without hallucinating qualifications.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-6 space-y-3 shadow-xs">
              <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                3
              </div>
              <h3 className="font-semibold text-foreground text-base">Match & Score</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Our 5-factor objective scoring engine tags recruiters (Category A), leadership (Category C), and potential referrers (Category D).
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-6 space-y-3 shadow-xs">
              <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                4
              </div>
              <h3 className="font-semibold text-foreground text-base">Copy & Send Manually</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Review tailored drafts under 300 characters, copy to clipboard, and send them yourself on LinkedIn. Track replies effortlessly.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* "What We Never Do" Trust Section */}
      <section className="py-16 md:py-24 border-b border-border/40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-destructive">
              Honest Guarantees
            </span>
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              What CareerConnect AI Never Does
            </h2>
            <p className="text-sm text-muted-foreground">
              We protect your professional reputation and your LinkedIn account.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="rounded-xl border border-border bg-card p-6 flex gap-4 items-start shadow-xs">
              <div className="h-9 w-9 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center shrink-0 mt-0.5">
                <XCircle className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h4 className="font-semibold text-foreground text-sm">Never Scrapes LinkedIn</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  We use zero headless browsers or unofficial endpoints. Ingestion occurs strictly via official member-requested CSV files.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-6 flex gap-4 items-start shadow-xs">
              <div className="h-9 w-9 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center shrink-0 mt-0.5">
                <XCircle className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h4 className="font-semibold text-foreground text-sm">Never Asks for Your Password</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  We never prompt for, store, or type your LinkedIn credentials. Your account credentials remain solely yours.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-6 flex gap-4 items-start shadow-xs">
              <div className="h-9 w-9 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center shrink-0 mt-0.5">
                <XCircle className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h4 className="font-semibold text-foreground text-sm">Never Sends Messages Automatically</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  We never mark messages sent without real user action. You review, approve, copy, and send every outreach message yourself.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-6 flex gap-4 items-start shadow-xs">
              <div className="h-9 w-9 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center shrink-0 mt-0.5">
                <XCircle className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h4 className="font-semibold text-foreground text-sm">Never Fabricates Qualifications</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Missing skills or roles remain "Unknown". We never invent job openings, false connections, or fictional credentials.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Capability-Honest FAQ Accordion */}
      <section className="py-16 md:py-24 bg-card/30 border-b border-border/40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              Common Questions
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="rounded-xl border border-border bg-card overflow-hidden shadow-xs transition-colors"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full flex items-center justify-between p-4 sm:p-5 text-left text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    aria-expanded={isOpen}
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 transition-transform duration-200 ${
                        isOpen ? "rotate-180 text-primary" : "text-muted-foreground"
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-5 sm:px-5 text-xs text-muted-foreground leading-relaxed border-t border-border/40 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Public Footer */}
      <footer className="border-t border-border bg-card py-10 px-4 sm:px-6 lg:px-8 text-xs text-muted-foreground">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center space-x-2">
            <div className="h-6 w-6 rounded-md bg-primary flex items-center justify-center text-primary-foreground font-bold text-xs">
              CC
            </div>
            <span className="font-semibold text-foreground">CareerConnect AI</span>
            <span>&bull; Designed for Students & Ethical Job Seekers</span>
          </div>

          <div className="flex items-center space-x-6">
            <Link href="/privacy" className="hover:text-foreground transition-colors">
              Privacy Notice
            </Link>
            <Link href="/integrations" className="hover:text-foreground transition-colors">
              Capability Matrix
            </Link>
            <Link href="/login" className="hover:text-foreground transition-colors">
              Sign In
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
