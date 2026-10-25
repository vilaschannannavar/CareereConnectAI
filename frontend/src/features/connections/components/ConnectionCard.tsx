import React from "react";
import Link from "next/link";
import { Contact } from "@/lib/schemas";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Building, Briefcase, Calendar, Mail, ExternalLink } from "lucide-react";

interface ConnectionCardProps {
  contact: Contact;
  isSelected?: boolean;
  onSelectChange?: (selected: boolean) => void;
}

export function ConnectionCard({
  contact,
  isSelected = false,
  onSelectChange,
}: ConnectionCardProps) {
  return (
    <Card className="relative transition-all hover:shadow-md hover:border-border/80">
      <CardHeader className="p-4 sm:p-5 pb-2 sm:pb-2 flex flex-row items-start justify-between space-y-0 gap-2">
        <div className="flex items-start gap-3 overflow-hidden">
          {onSelectChange && (
            <div className="pt-0.5">
              <Checkbox
                checked={isSelected}
                onCheckedChange={(checked) => onSelectChange(!!checked)}
                aria-label={`Select ${contact.full_name || `${contact.first_name} ${contact.last_name}`}`}
              />
            </div>
          )}
          <div className="truncate">
            <CardTitle className="text-base font-semibold truncate">
              {contact.first_name} {contact.last_name}
            </CardTitle>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1 truncate">
              <Briefcase className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
              <span className="truncate">{contact.position || "Unknown Role"}</span>
            </p>
          </div>
        </div>

        {contact.profile_url ? (
          <a
            href={contact.profile_url}
            target="_blank"
            rel="noopener noreferrer"
            title="Open LinkedIn profile in new tab"
            className="p-1.5 text-muted-foreground hover:text-primary rounded-md hover:bg-accent transition-colors shrink-0"
            aria-label={`Open ${contact.first_name}'s profile`}
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        ) : (
          <span className="text-[11px] text-muted-foreground/60 italic shrink-0">No URL</span>
        )}
      </CardHeader>

      <CardContent className="p-4 sm:p-5 pt-3 space-y-2 text-xs border-t border-border/40 mt-2">
        <div className="flex items-center justify-between text-muted-foreground">
          <div className="flex items-center gap-1.5 truncate">
            <Building className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
            <span className="font-medium text-foreground truncate">
              {contact.company || "Unknown Employer"}
            </span>
          </div>

          {contact.connected_on && (
            <div className="flex items-center gap-1 shrink-0 text-[11px] text-muted-foreground/70">
              <Calendar className="h-3 w-3" />
              <span>{contact.connected_on}</span>
            </div>
          )}
        </div>

        {contact.email && (
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground truncate pt-0.5">
            <Mail className="h-3 w-3 shrink-0" />
            <span className="truncate">{contact.email}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
