"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { ShortlistCard } from "@/features/shortlist/components/ShortlistCard";
import { ScoreExplanationDrawer } from "@/features/shortlist/components/ScoreExplanationDrawer";
import { WeightSlidersModal } from "@/features/shortlist/components/WeightSlidersModal";
import { CategoryFilterPills } from "@/features/shortlist/components/CategoryFilterPills";
import {
  useScoringData,
  useBatchScore,
  Analysis,
  ScoringWeights,
} from "@/features/shortlist/hooks/useShortlists";
import { Contact } from "@/lib/schemas";
import { Star, Sparkles, Sliders, Info, Loader2, Users } from "lucide-react";
import { toast } from "sonner";

export default function ShortlistPage() {
  const { contacts, analyses, shortlists, isLoading, refetchAll } = useScoringData();
  const batchScoreMutation = useBatchScore();

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedPriority, setSelectedPriority] = useState("all");
  const [isWeightsModalOpen, setIsWeightsModalOpen] = useState(false);
  const [explainingContact, setExplainingContact] = useState<{
    contact: Contact;
    analysis: Analysis;
  } | null>(null);

  const [weights, setWeights] = useState<ScoringWeights>({
    role_relevance: 30,
    ability_to_help: 25,
    company_industry: 20,
    technical_domain: 15,
    recruitment_referral_evidence: 10,
  });

  const handleScoreAll = async () => {
    try {
      await batchScoreMutation.mutateAsync(weights);
      toast.success("Scoring complete! Connections evaluated against target criteria.");
      refetchAll();
    } catch (err: any) {
      toast.error(err.message || "Failed to score connections.");
    }
  };

  // Filtered contacts
  const filteredContacts = useMemo(() => {
    return contacts.filter((c) => {
      const analysis = analyses[c.id];

      // Text search
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesName = `${c.first_name} ${c.last_name}`.toLowerCase().includes(q);
        const matchesCompany = (c.company || "").toLowerCase().includes(q);
        const matchesRole = (c.position || "").toLowerCase().includes(q);
        if (!matchesName && !matchesCompany && !matchesRole) return false;
      }

      // Category filter
      if (selectedCategory !== "all") {
        if (!analysis || !analysis.categories?.includes(selectedCategory)) {
          return false;
        }
      }

      // Priority filter
      if (selectedPriority !== "all") {
        if (!analysis || analysis.priority !== selectedPriority) {
          return false;
        }
      }

      return true;
    });
  }, [contacts, analyses, search, selectedCategory, selectedPriority]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Target Shortlist & Match Scoring"
        description="Ranked connections across recruiter relevance, team referral authority, and target company match."
        badge={
          <Badge variant="default" className="text-xs">
            {contacts.length} Connections
          </Badge>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsWeightsModalOpen(true)}
              className="gap-1.5"
            >
              <Sliders className="h-4 w-4" />
              <span>Adjust Weights</span>
            </Button>
            <Button
              size="sm"
              onClick={handleScoreAll}
              disabled={batchScoreMutation.isPending || contacts.length === 0}
              className="gap-1.5 font-semibold shadow-xs"
            >
              {batchScoreMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Scoring...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Score Connections</span>
                </>
              )}
            </Button>
          </div>
        }
      />

      {/* Transparency Note */}
      <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 text-xs text-blue-950 dark:text-blue-200 flex items-start gap-3 shadow-xs">
        <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-semibold text-foreground mr-1">
            Transparency &amp; Objective Scoring Notice:
          </span>
          <span className="text-muted-foreground">
            A high score means relevance, not that the person is hiring. Scores measure organizational alignment, career track overlap, and referral opportunity—not active open requisitions.
          </span>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 space-y-3.5 shadow-xs">
        <CategoryFilterPills
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          selectedPriority={selectedPriority}
          onSelectPriority={setSelectedPriority}
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-5 space-y-3">
              <Skeleton className="h-5 w-40 rounded" />
              <Skeleton className="h-4 w-48 rounded" />
              <div className="pt-2 border-t border-border/40 flex justify-between">
                <Skeleton className="h-6 w-20 rounded" />
                <Skeleton className="h-8 w-24 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      ) : contacts.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No contacts available for scoring"
          description="Import your LinkedIn connections archive first so CareerConnect AI can identify recruiters, alumni, and referrers."
          action={
            <Button asChild size="sm">
              <Link href="/connections">Go to Connections</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 animate-fade-in">
          {filteredContacts.map((contact) => (
            <ShortlistCard
              key={contact.id}
              contact={contact}
              analysis={analyses[contact.id]}
              onExplainScore={() => {
                const analysis = analyses[contact.id];
                if (analysis) {
                  setExplainingContact({ contact, analysis });
                }
              }}
            />
          ))}
        </div>
      )}

      {/* Slide-over Score Explanation Drawer */}
      <ScoreExplanationDrawer
        open={!!explainingContact}
        onOpenChange={(open) => !open && setExplainingContact(null)}
        contact={explainingContact?.contact || null}
        analysis={explainingContact?.analysis || null}
      />

      {/* Scoring Weights Modal */}
      <WeightSlidersModal
        open={isWeightsModalOpen}
        onOpenChange={setIsWeightsModalOpen}
        weights={weights}
        onSaveWeights={(w) => {
          setWeights(w);
          handleScoreAll();
        }}
      />
    </div>
  );
}
