"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageDraft } from "@/lib/schemas";
import { api } from "@/lib/api";
import {
  Check,
  CheckCircle2,
  Copy,
  Send,
  Lock,
  Clock,
  Sparkles,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

interface ApprovalWorkflowBarProps {
  draft: MessageDraft | null;
  bodyText: string;
  onStatusChange: (newStatus: string) => void;
}

export function ApprovalWorkflowBar({
  draft,
  bodyText,
  onStatusChange,
}: ApprovalWorkflowBarProps) {
  const [isCopying, setIsCopying] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [copiedSuccess, setCopiedSuccess] = useState(false);

  if (!draft) return null;

  const handleCopyMessage = async () => {
    try {
      setIsCopying(true);
      await navigator.clipboard.writeText(bodyText);
      await api.post(`/messages/${draft.id}/copy`);
      setCopiedSuccess(true);
      setTimeout(() => setCopiedSuccess(false), 3000);
    } catch (err: any) {
      toast.error("Failed to copy message to clipboard.");
    } finally {
      setIsCopying(false);
    }
  };

  const handleAdvanceStatus = async (targetState: string) => {
    try {
      setIsUpdating(true);
      await api.post(`/messages/${draft.id}/transition`, { target_state: targetState });
      onStatusChange(targetState);
      toast.success(`Draft marked as ${targetState}.`);
    } catch (err: any) {
      toast.error(err.message || "Failed to update draft status.");
    } finally {
      setIsUpdating(false);
    }
  };

  const status = draft.status;

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Current Status:
          </span>
          <Badge
            variant={
              status === "User-confirmed sent"
                ? "success"
                : status === "Approved" || status === "Reviewed"
                ? "default"
                : "secondary"
            }
            className="text-xs font-bold"
          >
            {status === "User-confirmed sent"
              ? "Marked Sent By You"
              : status === "Awaiting manual send"
              ? "Awaiting Manual Send"
              : status}
          </Badge>
        </div>

        <div className="text-[11px] text-muted-foreground">
          Step: {status === "Draft" ? "1/5" : status === "Reviewed" ? "2/5" : status === "Approved" ? "3/5" : status === "Awaiting manual send" ? "4/5" : "5/5"}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        {status === "Draft" && (
          <Button
            size="sm"
            onClick={() => handleAdvanceStatus("Reviewed")}
            disabled={isUpdating}
            className="gap-1.5 shadow-xs"
          >
            <Check className="h-4 w-4" />
            <span>Mark Reviewed</span>
          </Button>
        )}

        {(status === "Draft" || status === "Reviewed") && (
          <Button
            size="sm"
            onClick={() => handleAdvanceStatus("Approved")}
            disabled={isUpdating}
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>Approve Draft</span>
          </Button>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={handleCopyMessage}
          disabled={isCopying}
          className="gap-1.5"
        >
          {copiedSuccess ? (
            <>
              <Check className="h-4 w-4 text-success" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy className="h-4 w-4 text-muted-foreground" />
              <span>Copy Message</span>
            </>
          )}
        </Button>

        {status === "Approved" && (
          <Button
            size="sm"
            onClick={() => handleAdvanceStatus("Awaiting manual send")}
            disabled={isUpdating}
            className="gap-1.5 shadow-xs"
          >
            <Clock className="h-4 w-4" />
            <span>Move to Awaiting Send</span>
          </Button>
        )}

        {status === "Awaiting manual send" && (
          <Button
            size="sm"
            onClick={() => handleAdvanceStatus("User-confirmed sent")}
            disabled={isUpdating}
            className="gap-1.5 bg-primary text-primary-foreground font-semibold shadow-xs"
          >
            <Send className="h-4 w-4" />
            <span>Mark Sent by You</span>
          </Button>
        )}

        <Button
          variant="ghost"
          size="sm"
          disabled
          className="text-xs opacity-50 cursor-not-allowed gap-1"
          title="Direct automated sending is unauthorized by LinkedIn policies."
        >
          <Lock className="h-3.5 w-3.5" />
          <span>Direct Send (Blocked)</span>
        </Button>
      </div>
    </div>
  );
}
