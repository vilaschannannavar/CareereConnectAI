import React from "react";
import Link from "next/link";
import { Contact } from "@/lib/schemas";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building, Briefcase, ExternalLink, Calendar, Mail, BookmarkCheck } from "lucide-react";

interface ContactContextPanelProps {
  contact?: Contact | null;
  linkedOpening?: any | null;
}

export function ContactContextPanel({ contact, linkedOpening }: ContactContextPanelProps) {
  if (!contact) {
    return (
      <Card className="p-5 text-center text-xs text-muted-foreground">
        Select a contact to view organizational context and target history.
      </Card>
    );
  }

  return (
    <Card className="space-y-4 p-5">
      <div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
          Recipient Context
        </span>
        <div className="flex items-center justify-between mt-1">
          <h3 className="text-base font-bold text-foreground">
            {contact.first_name} {contact.last_name}
          </h3>
          {contact.profile_url && (
            <a
              href={contact.profile_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              <span>Profile</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>

      <div className="space-y-2 text-xs text-muted-foreground border-t border-border/40 pt-3">
        <div className="flex items-center gap-2">
          <Briefcase className="h-3.5 w-3.5 text-muted-foreground/70" />
          <span className="font-medium text-foreground">{contact.position || "Unknown Role"}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building className="h-3.5 w-3.5 text-muted-foreground/70" />
            <span className="font-medium text-foreground">{contact.company || "Unknown"}</span>
          </div>
          {contact.company && (
            <Link
              href={`/openings?company=${encodeURIComponent(contact.company)}`}
              className="text-[11px] text-primary hover:underline flex items-center gap-0.5"
            >
              <span>Jobs</span>
              <ExternalLink className="h-2.5 w-2.5" />
            </Link>
          )}
        </div>

        {contact.connected_on && (
          <div className="flex items-center gap-2 text-[11px]">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground/70" />
            <span>Connected: {contact.connected_on}</span>
          </div>
        )}
      </div>

      {linkedOpening && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs space-y-1">
          <div className="flex items-center gap-1 font-semibold text-primary">
            <BookmarkCheck className="h-3.5 w-3.5" />
            <span>Target Opening:</span>
          </div>
          <p className="font-medium text-foreground">{linkedOpening.title}</p>
          <Badge variant="outline" className="text-[10px]">
            {linkedOpening.status}
          </Badge>
        </div>
      )}
    </Card>
  );
}
