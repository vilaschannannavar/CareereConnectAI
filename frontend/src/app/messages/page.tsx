"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ContactContextPanel } from "@/features/messages/components/ContactContextPanel";
import { LivePreviewPanel } from "@/features/messages/components/LivePreviewPanel";
import { ApprovalWorkflowBar } from "@/features/messages/components/ApprovalWorkflowBar";
import { useMessageStudioData, useGenerateDraft } from "@/features/messages/hooks/useMessages";
import { MessageDraft } from "@/lib/schemas";
import { Mail, Sparkles, Loader2, Edit3, Check, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";

export default function MessageStudioPage() {
  const searchParams = useSearchParams();
  const initialContactId = searchParams.get("contact_id") || "";

  const { contacts, drafts, resumes, isLoading } = useMessageStudioData();
  const generateDraftMutation = useGenerateDraft();

  const [selectedContactId, setSelectedContactId] = useState<string>(initialContactId);
  const [templateCode, setTemplateCode] = useState<string>("A");
  const [tone, setTone] = useState<string>("concise");
  const [selectedResumeId, setSelectedResumeId] = useState<string>("");
  const [activeDraft, setActiveDraft] = useState<MessageDraft | null>(null);
  const [editableBody, setEditableBody] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);

  // Set default contact if not set
  useEffect(() => {
    if (!selectedContactId && contacts.length > 0) {
      setSelectedContactId(contacts[0].id);
    }
  }, [contacts, selectedContactId]);

  // Set active draft when contact or drafts change
  useEffect(() => {
    if (selectedContactId) {
      const match = drafts.find((d) => d.contact_id === selectedContactId);
      if (match) {
        setActiveDraft(match);
        setEditableBody(match.body);
      }
    }
  }, [selectedContactId, drafts]);

  // Keyboard review flow
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) return;

      const currentIndex = contacts.findIndex((c) => c.id === selectedContactId);
      if (e.key === "j" || e.key === "J") {
        if (currentIndex < contacts.length - 1) {
          setSelectedContactId(contacts[currentIndex + 1].id);
        }
      } else if (e.key === "k" || e.key === "K") {
        if (currentIndex > 0) {
          setSelectedContactId(contacts[currentIndex - 1].id);
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && activeDraft) {
        e.preventDefault();
        if (activeDraft.status === "Draft" || activeDraft.status === "Reviewed") {
          api.post(`/messages/${activeDraft.id}/transition`, { target_state: "Approved" })
            .then(() => {
              setActiveDraft({ ...activeDraft, status: "Approved" as any });
              toast.success("Draft approved via shortcut!");
            })
            .catch(() => {});
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [contacts, selectedContactId]);

  const selectedContact = contacts.find((c) => c.id === selectedContactId) || null;

  const handleGenerate = async () => {
    if (!selectedContactId) {
      toast.error("Please select a target contact first.");
      return;
    }

    try {
      const draft = await generateDraftMutation.mutateAsync({
        contact_id: selectedContactId,
        template_code: templateCode,
        tone: tone,
        resume_id: selectedResumeId || null,
      });
      setActiveDraft(draft);
      setEditableBody(draft.body);
      setIsEditing(false);
      toast.success("Outreach draft generated successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to generate outreach draft.");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Message Studio"
        description="Craft, review, and approve personalized outreach messages. Zero automated sending."
        badge={
          <Badge variant="outline" className="text-xs font-mono">
            Keyboard: J (Next) / K (Prev)
          </Badge>
        }
      />

      {/* 3-Column Studio Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Contact Selector & Organizational Context */}
        <div className="lg:col-span-4 space-y-4">
          <div className="rounded-xl border border-border bg-card p-4 space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
              1. Select Target Contact
            </label>
            <select
              value={selectedContactId}
              onChange={(e) => setSelectedContactId(e.target.value)}
              className="w-full h-10 rounded-lg border border-input bg-background px-3 text-xs text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.first_name} {c.last_name} &bull; {c.company || "Unknown"} ({c.position || "Unknown"})
                </option>
              ))}
            </select>
          </div>

          <ContactContextPanel contact={selectedContact} />

          {/* Template & Tone Selectors */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3.5 text-xs">
            <div>
              <label className="font-semibold text-foreground block mb-1.5">2. Outreach Template</label>
              <div className="grid grid-cols-1 gap-1.5">
                {[
                  { id: "A", label: "Template A: Recruiter / Talent", desc: "For HR & University recruiters" },
                  { id: "B", label: "Template B: Referral Request", desc: "Category D gated for target employees" },
                  { id: "C", label: "Template C: Hiring Manager / Lead", desc: "For engineering architects & managers" },
                ].map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => setTemplateCode(tpl.id)}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      templateCode === tpl.id
                        ? "border-primary bg-primary/5 text-foreground font-semibold"
                        : "border-border hover:bg-muted/50 text-muted-foreground"
                    }`}
                  >
                    <span className="block font-medium">{tpl.label}</span>
                    <span className="text-[10px] text-muted-foreground/80">{tpl.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="font-semibold text-foreground block mb-1.5">3. Tone Style</label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: "concise", label: "Concise (<300 chars)" },
                  { id: "formal", label: "Formal" },
                  { id: "conversational", label: "Conversational" },
                  { id: "technical", label: "Technical" },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTone(t.id)}
                    className={`py-1.5 px-2 rounded-md border text-center transition-all ${
                      tone === t.id
                        ? "border-primary bg-primary/10 text-primary font-bold"
                        : "border-border text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={generateDraftMutation.isPending || !selectedContactId}
              className="w-full gap-2 font-semibold shadow-xs"
            >
              {generateDraftMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Drafting Message...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Generate Outreach Draft</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Right Column: Editor, Live Preview & State Machine Approval Workflow */}
        <div className="lg:col-span-8 space-y-5">
          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Message Body
              </span>
              <button
                type="button"
                onClick={() => setIsEditing(!isEditing)}
                className="text-xs text-primary font-medium hover:underline flex items-center gap-1"
              >
                <Edit3 className="h-3.5 w-3.5" />
                <span>{isEditing ? "Lock Editor" : "Edit Text"}</span>
              </button>
            </div>

            {isEditing ? (
              <textarea
                value={editableBody}
                onChange={(e) => setEditableBody(e.target.value)}
                rows={5}
                className="w-full rounded-lg border border-input bg-background p-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring font-sans"
              />
            ) : (
              <div className="rounded-lg bg-muted/20 border border-border/50 p-4 text-sm text-foreground whitespace-pre-wrap leading-relaxed min-h-[90px]">
                {editableBody || (
                  <span className="text-muted-foreground italic text-xs">
                    No active draft generated yet. Click "Generate Outreach Draft" to create one.
                  </span>
                )}
              </div>
            )}
          </div>

          <ApprovalWorkflowBar
            draft={activeDraft}
            bodyText={editableBody}
            onStatusChange={(newStatus) => {
              if (activeDraft) setActiveDraft({ ...activeDraft, status: newStatus as any });
            }}
          />

          <LivePreviewPanel
            draft={activeDraft}
            contact={selectedContact}
            bodyText={editableBody}
          />
        </div>
      </div>
    </div>
  );
}
