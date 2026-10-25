"use client";

import React from "react";
import { MessageDraft } from "@/lib/schemas";
import { OutreachPipeline } from "../hooks/useTracker";
import { KanbanCard } from "./KanbanCard";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Sparkles, CheckCircle2, Clock, MessageSquare, AlertCircle, Send } from "lucide-react";

interface KanbanBoardProps {
  pipeline: OutreachPipeline;
  onTransition: (draftId: string, targetState: string) => void;
  onOpenReschedule: (draft: MessageDraft) => void;
  onMarkReplied: (contactId: string) => void;
  selectedColumn?: string;
}

const COLUMNS = [
  { key: "drafted", title: "Drafted", icon: Sparkles, color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
  { key: "approved", title: "Approved", icon: CheckCircle2, color: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20" },
  { key: "awaiting_manual_send", title: "Awaiting Manual Send", icon: Send, color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
  { key: "marked_sent", title: "Marked Sent", icon: CheckCircle2, color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
  { key: "follow_up_suggested", title: "Follow-up Due", icon: Clock, color: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20" },
  { key: "replied", title: "Replied", icon: MessageSquare, color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" },
] as const;

export function KanbanBoard({
  pipeline,
  onTransition,
  onOpenReschedule,
  onMarkReplied,
  selectedColumn = "all",
}: KanbanBoardProps) {
  const visibleColumns = selectedColumn === "all"
    ? COLUMNS
    : COLUMNS.filter((c) => c.key === selectedColumn);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 items-start">
      {visibleColumns.map((col) => {
        const items: MessageDraft[] = (pipeline as any)[col.key] || [];
        const Icon = col.icon;

        return (
          <div key={col.key} className="flex flex-col bg-muted/40 rounded-xl p-3 border border-border/60 min-h-[450px]">
            <div className="flex items-center justify-between gap-2 mb-3 px-1">
              <div className="flex items-center gap-1.5 font-medium text-xs text-foreground truncate">
                <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate">{col.title}</span>
              </div>
              <Badge variant="outline" className={`text-[11px] px-1.5 py-0 h-5 font-bold ${col.color}`}>
                {items.length}
              </Badge>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto max-h-[calc(100vh-280px)] pr-0.5">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-36 text-center text-xs text-muted-foreground/70 p-4 border border-dashed border-border/50 rounded-lg">
                  <p>No messages</p>
                </div>
              ) : (
                items.map((draft) => (
                  <KanbanCard
                    key={draft.id}
                    draft={draft}
                    onTransition={onTransition}
                    onOpenReschedule={onOpenReschedule}
                    onMarkReplied={onMarkReplied}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
