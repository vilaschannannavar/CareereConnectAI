"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { resolveCareerUrl } from "../hooks/useOpenings";
import { Briefcase, Building, ExternalLink, Link2 } from "lucide-react";
import { toast } from "sonner";

interface AddOpeningModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { company: string; title: string; url?: string; notes?: string; status: string }) => Promise<void>;
}

export function AddOpeningModal({ open, onOpenChange, onSubmit }: AddOpeningModalProps) {
  const [company, setCompany] = useState("");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("Verified current");
  const [resolvedPortal, setResolvedPortal] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCompanyBlur = async () => {
    if (!company.trim()) return;
    try {
      const res = await resolveCareerUrl(company.trim());
      if (res.career_page_url) {
        setResolvedPortal(res.career_page_url);
      }
    } catch {
      // Ignored
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company.trim() || !title.trim()) {
      toast.error("Company and Title are required.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        company: company.trim(),
        title: title.trim(),
        url: url.trim() || undefined,
        notes: notes.trim() || undefined,
        status,
      });
      toast.success("Job opening added to target tracker!");
      onOpenChange(false);
      setCompany("");
      setTitle("");
      setUrl("");
      setNotes("");
      setResolvedPortal(null);
    } catch (err: any) {
      toast.error(err?.message || "Failed to add job opening.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary" />
            Add Target Job Opening
          </DialogTitle>
          <DialogDescription>
            Track roles you want to target. Links to official corporate career portals are resolved automatically.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Company Name *</label>
              <Input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                onBlur={handleCompanyBlur}
                placeholder="e.g. Stripe, Datadog"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Target Role Title *</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Backend Software Engineer"
                required
              />
            </div>
          </div>

          {resolvedPortal && (
            <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/20 text-xs text-primary flex items-center justify-between">
              <span className="font-medium truncate">Official Career Portal: {resolvedPortal}</span>
              <a href={resolvedPortal} target="_blank" rel="noopener noreferrer" className="shrink-0 p-1 hover:underline">
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Verification Status</label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Verified current">Verified current</SelectItem>
                <SelectItem value="Previously published">Previously published</SelectItem>
                <SelectItem value="General match">General match</SelectItem>
                <SelectItem value="Unverified">Unverified</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Specific Job URL (optional)</label>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://company.com/careers/job-123"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Notes & Team Details (optional)</label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Infrastructure team, mentions Kubernetes & Go"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add Opening"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
