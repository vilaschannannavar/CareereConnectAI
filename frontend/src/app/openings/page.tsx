"use client";

import React, { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { OpeningCard } from "@/features/openings/components/OpeningCard";
import { AddOpeningModal } from "@/features/openings/components/AddOpeningModal";
import { useOpenings, useCreateOpening, useDeleteOpening } from "@/features/openings/hooks/useOpenings";
import { Briefcase, Plus, Filter, Sparkles, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function TargetOpeningsPage() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [modalOpen, setModalOpen] = useState(false);

  const { openings, isLoading, refetch } = useOpenings(statusFilter);
  const createMutation = useCreateOpening();
  const deleteMutation = useDeleteOpening();

  const handleCreate = async (data: any) => {
    await createMutation.mutateAsync(data);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this tracked opening?")) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Job opening removed.");
    } catch {
      toast.error("Failed to delete opening.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Target Job Openings"
          description="Keep track of target company roles to anchor your referral outreach in real opportunities."
        />
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5 h-9">
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setModalOpen(true)} className="gap-1.5 h-9">
            <Plus className="h-4 w-4" /> Add Target Opening
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px] h-9 text-xs">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="Verified current">Verified current</SelectItem>
              <SelectItem value="Previously published">Previously published</SelectItem>
              <SelectItem value="General match">General match</SelectItem>
              <SelectItem value="Unverified">Unverified</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <span className="text-xs text-muted-foreground">
          {openings.length} opening{openings.length === 1 ? "" : "s"} tracked
        </span>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 rounded-xl bg-muted/40 animate-pulse border border-border/50" />
          ))}
        </div>
      ) : openings.length === 0 ? (
        <Card className="p-12 text-center space-y-4 border-dashed border-2 border-border bg-card">
          <div className="p-4 bg-primary/10 text-primary rounded-full w-fit mx-auto">
            <Briefcase className="h-8 w-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-foreground">No target openings tracked yet</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Add the roles you are targeting at companies where you have connections to align your messages.
            </p>
          </div>
          <Button onClick={() => setModalOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Add Your First Opening
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {openings.map((op) => (
            <OpeningCard key={op.id} opening={op} onDelete={handleDelete} />
          ))}
        </div>
      )}

      <AddOpeningModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSubmit={handleCreate}
      />
    </div>
  );
}
