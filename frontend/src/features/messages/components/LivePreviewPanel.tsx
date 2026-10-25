import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageDraft, Contact } from "@/lib/schemas";
import { Eye, ShieldCheck, AlertTriangle, Info } from "lucide-react";

interface LivePreviewPanelProps {
  draft?: MessageDraft | null;
  contact?: Contact | null;
  bodyText: string;
}

export function LivePreviewPanel({ draft, contact, bodyText }: LivePreviewPanelProps) {
  const charCount = bodyText.length;
  const isOverLimit = charCount > 300;
  const isNearLimit = charCount >= 270 && charCount <= 300;

  return (
    <div className="space-y-4">
      {/* Live Preview Card */}
      <Card className="border-border">
        <CardHeader className="p-4 sm:p-5 pb-3 sm:pb-3 flex flex-row items-center justify-between border-b border-border/40">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-semibold">LinkedIn Invitation Note Preview</CardTitle>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-mono font-bold ${
                isOverLimit
                  ? "text-destructive"
                  : isNearLimit
                  ? "text-warning"
                  : "text-muted-foreground"
              }`}
            >
              {charCount} / 300 chars
            </span>
          </div>
        </CardHeader>

        <CardContent className="p-5 space-y-3">
          {/* Mock LinkedIn Invitation Note UI */}
          <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <span>To: {contact ? `${contact.first_name} ${contact.last_name}` : "Recipient"}</span>
              <span className="text-muted-foreground/60">&bull;</span>
              <span className="text-muted-foreground text-[11px]">Personalized Note</span>
            </div>
            <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed font-sans">
              {bodyText || "Draft message content will be displayed here in real time..."}
            </p>
          </div>

          {/* 300-Char Warning */}
          {isOverLimit && (
            <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                Draft exceeds LinkedIn's 300-character connection request note limit. It can only be sent as a standard direct message to an existing 1st-degree connection or InMail.
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details Used for Personalization (Zero Fabrication Guarantee) */}
      <Card className="border-border">
        <CardHeader className="p-4 pb-2 border-b border-border/40 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-success" />
            <span className="text-xs font-semibold text-foreground">
              Details Used for Personalization (Zero Fabrication Guarantee)
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-4 text-xs space-y-2">
          {draft && draft.details_used && Object.keys(draft.details_used).length > 0 ? (
            <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
              {Object.entries(draft.details_used).map(([key, val]) => (
                <div key={key} className="rounded-md bg-muted/40 p-2 border border-border/50">
                  <span className="block font-semibold text-foreground capitalize">
                    {key.replace(/_/g, " ")}:
                  </span>
                  <span className="truncate block">{String(val || "None")}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground italic text-xs">
              Generate a draft to inspect exactly which profile facts and contact details were referenced.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
