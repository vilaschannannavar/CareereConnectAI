"use client";

import React, { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { KanbanBoard } from "@/features/tracker/components/KanbanBoard";
import { EventsTimeline } from "@/features/tracker/components/EventsTimeline";
import { RescheduleModal } from "@/features/tracker/components/RescheduleModal";
import { useTrackerData, useTransitionDraft, useScheduleFollowUp, useMarkReplied } from "@/features/tracker/hooks/useTracker";
import { MessageDraft } from "@/lib/schemas";
import { toast } from "sonner";
import { Sparkles, History, Filter, RefreshCw } from "lucide-react";

export default function OutreachTrackerPage() {
  const { pipeline, events, isLoading, refetch } = useTrackerData();
  const transitionMutation = useTransitionDraft();
  const scheduleMutation = useScheduleFollowUp();
  const markRepliedMutation = useMarkReplied();

  const [activeTab, setActiveTab] = useState<string>("pipeline");
  const [selectedColumn, setSelectedColumn] = useState<string>("all");
  const [rescheduleDraft, setRescheduleDraft] = useState<MessageDraft | null>(null);

  const handleTransition = async (draftId: string, targetState: string) => {
    try {
      await transitionMutation.mutateAsync({ draftId, targetState });
      toast.success(`Moved message to "${targetState}"`);
    } catch (err: any) {
      toast.error(err?.message || "Illegal state transition blocked.");
    }
  };

  const handleReschedule = async (days: number, notes: string) => {
    if (!rescheduleDraft) return;
    try {
      await scheduleMutation.mutateAsync({
        draftId: rescheduleDraft.id,
        followUpDays: days,
        notes,
      });
      toast.success(`Follow-up scheduled in ${days} days.`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to schedule follow-up.");
    }
  };

  const handleMarkReplied = async (contactId: string) => {
    try {
      await markRepliedMutation.mutateAsync({ contactId });
      toast.success("Contact conversation marked as replied!");
    } catch (err: any) {
      toast.error(err?.message || "Failed to update reply status.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Outreach Tracker & Pipeline"
          description="Track conversation lifecycles honestly. Only verified and user-confirmed actions progress."
        />
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5 h-9">
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
          <TabsList className="bg-muted/80">
            <TabsTrigger value="pipeline" className="gap-2">
              <Sparkles className="h-4 w-4" />
              Kanban Pipeline
            </TabsTrigger>
            <TabsTrigger value="timeline" className="gap-2">
              <History className="h-4 w-4" />
              Audit Log Timeline ({events.length})
            </TabsTrigger>
          </TabsList>

          {activeTab === "pipeline" && (
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={selectedColumn} onValueChange={setSelectedColumn}>
                <SelectTrigger className="w-[180px] h-9 text-xs">
                  <SelectValue placeholder="All Columns" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stages</SelectItem>
                  <SelectItem value="drafted">Drafted</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="awaiting_manual_send">Awaiting Send</SelectItem>
                  <SelectItem value="marked_sent">Marked Sent</SelectItem>
                  <SelectItem value="follow_up_suggested">Follow-up Due</SelectItem>
                  <SelectItem value="replied">Replied</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <TabsContent value="pipeline" className="m-0 focus-visible:outline-none">
          <KanbanBoard
            pipeline={pipeline}
            onTransition={handleTransition}
            onOpenReschedule={(draft) => setRescheduleDraft(draft)}
            onMarkReplied={handleMarkReplied}
            selectedColumn={selectedColumn}
          />
        </TabsContent>

        <TabsContent value="timeline" className="m-0 focus-visible:outline-none">
          <EventsTimeline events={events} loading={isLoading} />
        </TabsContent>
      </Tabs>

      <RescheduleModal
        draft={rescheduleDraft}
        open={!!rescheduleDraft}
        onOpenChange={(open) => !open && setRescheduleDraft(null)}
        onSubmit={handleReschedule}
      />
    </div>
  );
}
