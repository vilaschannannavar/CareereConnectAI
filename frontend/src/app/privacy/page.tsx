"use client";

import React from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Shield,
  Lock,
  EyeOff,
  Trash2,
  FileText,
  Users,
  HardDrive,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft
} from "lucide-react";

export default function PrivacyNoticePage() {
  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header Navigation */}
        <div className="flex items-center justify-between">
          <Link href="/overview">
            <Button variant="ghost" size="sm" className="text-slate-600 hover:text-slate-900">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Back to Overview
            </Button>
          </Link>
          <Badge variant="outline" className="border-emerald-300 text-emerald-800 bg-emerald-50">
            GDPR &amp; CCPA Privacy Compliant
          </Badge>
        </div>

        {/* Hero Banner */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center p-3 bg-blue-100 rounded-full text-blue-700 mb-2">
            <Shield className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight sm:text-4xl">
            Privacy &amp; Data Protection Notice
          </h1>
          <p className="text-base text-slate-600 max-w-2xl mx-auto">
            CareerConnect AI is architected with strict Zero-Scraping, Zero-Fabrication, and Zero-Third-Party-Sharing principles. Here is an honest explanation of what data is collected, why, how it is retained, and how you retain complete control over its deletion.
          </p>
        </div>

        {/* 1. What Data We Store */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <FileText className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-xl">1. What Data Is Collected &amp; Stored</CardTitle>
            </div>
            <CardDescription>
              We only store data that you explicitly upload or confirm in the application.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-700">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg border border-slate-200 bg-white">
                <div className="font-semibold text-slate-900 flex items-center gap-1.5 mb-1">
                  <FileText className="h-4 w-4 text-blue-600" />
                  Resume Documents &amp; Career Background
                </div>
                <p className="text-xs text-slate-500">
                  Uploaded PDF or DOCX resume documents and structured attributes you confirm (skills, past experience, education, target roles). Stored in private sandboxed directories under UUID paths with zero public URLs.
                </p>
              </div>

              <div className="p-4 rounded-lg border border-slate-200 bg-white">
                <div className="font-semibold text-slate-900 flex items-center gap-1.5 mb-1">
                  <Users className="h-4 w-4 text-emerald-600" />
                  LinkedIn Connections (from CSV Export)
                </div>
                <p className="text-xs text-slate-500">
                  Contact names, companies, job titles, LinkedIn profile URLs, and connection dates ingested exclusively from your official self-serve LinkedIn <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">Connections.csv</code> data archive.
                </p>
              </div>

              <div className="p-4 rounded-lg border border-slate-200 bg-white">
                <div className="font-semibold text-slate-900 flex items-center gap-1.5 mb-1">
                  <HardDrive className="h-4 w-4 text-indigo-600" />
                  Analyses, Scores &amp; Message Drafts
                </div>
                <p className="text-xs text-slate-500">
                  Relevance scores, 5-factor breakdown sub-scores, category tags (A through E), personalized message drafts, and follow-up tracker timestamps that you generate.
                </p>
              </div>

              <div className="p-4 rounded-lg border border-slate-200 bg-white">
                <div className="font-semibold text-slate-900 flex items-center gap-1.5 mb-1">
                  <Lock className="h-4 w-4 text-purple-600" />
                  Account &amp; Security Credentials
                </div>
                <p className="text-xs text-slate-500">
                  Your email address, Argon2id cryptographic password hashes, and AES/Fernet-encrypted integration tokens stored securely at rest.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 2. Why We Collect This Data */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <EyeOff className="h-5 w-5 text-indigo-600" />
              <CardTitle className="text-xl">2. Purpose of Processing (Why We Collect It)</CardTitle>
            </div>
            <CardDescription>
              Data is processed strictly to assist with your personal career outreach workflow.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-700">
            <ul className="space-y-2 list-disc list-inside text-xs text-slate-600">
              <li>
                <strong>Transparent Relevance Scoring:</strong> Comparing contact roles and companies against your target career goals to calculate scorable relevance.
              </li>
              <li>
                <strong>Outreach Message Drafting:</strong> Generating draft messages using your confirmed skills and contact metadata with a zero-fabrication guarantee.
              </li>
              <li>
                <strong>Follow-Up Tracking:</strong> Reminding you when 7 days have passed since a message was marked sent.
              </li>
              <li>
                <strong>Zero Selling or Monetization:</strong> Your data is never sold, leased, or shared with third-party advertisers, recruiters, or data brokers.
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* 3. Hard Prohibitions & Zero Scraping */}
        <Card className="border-amber-200 bg-amber-50/30">
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <CardTitle className="text-xl text-amber-950">3. Absolute Hard Prohibitions</CardTitle>
            </div>
            <CardDescription className="text-amber-800">
              Protections built into the core codebase to safeguard your LinkedIn account and legal privacy.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-amber-900">
            <p>
              ✓ <strong>Zero Web Scraping:</strong> CareerConnect AI never scrapes LinkedIn, runs automated headless browsers, or calls undocumented private endpoints.
            </p>
            <p>
              ✓ <strong>Zero Automated Sending:</strong> The app will never automatically send InMail messages or connection invitations. You copy message drafts to your clipboard and send them manually.
            </p>
            <p>
              ✓ <strong>Zero Fabrication:</strong> The AI will never invent achievements, unconfirmed skills, or infer alumni connections without explicit proof.
            </p>
          </CardContent>
        </Card>

        {/* 4. Data Retention & Deletion */}
        <Card className="border-red-200">
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <Trash2 className="h-5 w-5 text-red-600" />
              <CardTitle className="text-xl text-red-950">4. Retention Controls &amp; Complete Deletion</CardTitle>
            </div>
            <CardDescription>
              You maintain total sovereignty over your personal records at all times.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-700">
            <div className="space-y-2 text-xs text-slate-600">
              <p>
                <strong>Full Data Export (GDPR / CCPA):</strong> You can download a complete machine-readable JSON archive of all your stored data at any time from your Settings page.
              </p>
              <p>
                <strong>Granular Purging:</strong> You can delete individual resumes (which physically deletes the file from storage), individual contacts, or purge all imported contacts with one click.
              </p>
              <p>
                <strong>Account Hard Deletion:</strong> Clicking "Delete My Account" executes an irreversible hard delete that cascades across all relational tables and permanently removes all stored physical files from disk storage.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-slate-100">
              <span className="text-xs text-slate-500">Ready to manage your privacy settings?</span>
              <Link href="/settings">
                <Button size="sm">
                  Go to Settings &amp; Privacy
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
