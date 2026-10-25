"use client";

import React from "react";
import Link from "next/link";
import { MessageDraft } from "@/lib/schemas";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Building,
  Briefcase,
  Calendar,
  MessageSquare,
  ExternalLink,
  CheckCircle2,
  Clock,
  ArrowRight,
  Send
} from "lucide-react";

interface KanbanCardProps {
  draft: MessageDraft;
  onTransition?: (draftId: string, targetState: string) => void;
  onOpenReschedule?: (draft: MessageDraft) => void;
  onMarkReplied?: (contactId: string) => void;
}

export function KanbanCard({
  draft,
  onTransition,
  onOpenReschedule,
  onMarkReplied,
}: KanbanCardProps) {
  const contact = (draft as any).contact;

  return (
    <Card className="p-4 space-y-3 bg-card border-border shadow-xs hover:shadow-md transition-all">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-semibold text-foreground truncate">
            {contact ? `${contact.first_name} ${contact.last_name}` : "Unknown Contact"}
          </h4>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
            <Briefcase className="h-3 w-3 shrink-0" />
            <span className="truncate">{contact?.position || "Role Unknown"}</span>
          </p>
        </div>

        {contact?.profile_url && (
          <a
            href={contact.profile_url}
            target="_blank"
            rel="noopener noreferrer"
            title="Open LinkedIn profile"
            className="p-1 text-muted-foreground hover:text-primary transition-colors shrink-0"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>

      <div className="text-xs text-muted-foreground space-y-1.5 border-t border-border/40 pt-2.5">
        <div className="flex items-center gap-1.5">
          <Building className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
          <span className="font-medium text-foreground truncate">
            {contact?.company || "Company Unknown"}
          </span>
        </div>

        {draft.sent_at && (
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
            <CheckCircle2 className="h-3 w-3 shrink-0" />
            <span>Sent: {new Date(draft.sent_at).toLocaleDateString()}</span>
          </div>
        )}

        {draft.follow_up_suggested_at && (
          <div className="flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
            <Calendar className="h-3 w-3 shrink-0" />
            <span>Follow-up: {new Date(draft.follow_up_suggested_at).toLocaleDateString()}</span>
          </div>
        )}
      </div>

      <div className="pt-2 border-t border-border/40 flex flex-wrap items-center justify-between gap-1.5">
        <Button asChild variant="ghost" size="sm" className="h-7 text-xs px-2">
          <Link href={`/messages?contact_id=${draft.contact_id}`}>
            Studio
          </Link>
        </Button>

        {draft.status === "Draft" && onTransition && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onTransition(draft.id, "Approved")}
            className="h-7 text-xs px-2 gap-1 text-primary hover:text-primary"
          >
            Approve <ArrowRight className="h-3 w-3" />
          </Button>
        )}

        {draft.status === "Approved" && onTransition && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onTransition(draft.id, "Awaiting manual send")}
            className="h-7 text-xs px-2 gap-1 text-primary"
          >
            Ready to Send <ArrowRight className="h-3 w-3" />
          </Button>
        )}

        {draft.status === "Awaiting manual send" && onTransition && (
          <Button
            size="sm"
            variant="default"
            onClick={() => onTransition(draft.id, "User-confirmed sent")}
            className="h-7 text-xs px-2 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <CheckCircle2 className="h-3 w-3" /> Mark Sent
          </Button>
        )}

        {draft.status === "User-confirmed sent" && (
          <div className="flex items-center gap-1">
            {onOpenReschedule && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onOpenReschedule(draft)}
                className="h-7 text-xs px-1.5"
                title="Reschedule follow-up"
              >
                <Clock className="h-3 w-3" />
              </Button>
            )}
            {onMarkReplied && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onMarkReplied(draft.contact_id)}
                className="h-7 text-xs px-2 gap-1 text-indigo-600 dark:text-indigo-400"
              >
                <MessageSquare className="h-3 w-3" /> Log Reply
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
