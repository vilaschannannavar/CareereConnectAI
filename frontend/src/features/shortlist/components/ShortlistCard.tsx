import React from "react";
import Link from "next/link";
import { Contact } from "@/lib/schemas";
import { Analysis } from "../hooks/useShortlists";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building, Briefcase, ExternalLink, Sparkles, Send } from "lucide-react";

interface ShortlistCardProps {
  contact: Contact;
  analysis?: Analysis | null;
  onExplainScore: () => void;
}

export function ShortlistCard({
  contact,
  analysis,
  onExplainScore,
}: ShortlistCardProps) {
  const getPriorityBadgeVariant = (priority?: string) => {
    switch (priority) {
      case "High":
        return "success";
      case "Medium":
        return "warning";
      case "Low":
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <Card className="flex flex-col justify-between transition-all hover:shadow-md hover:border-border/80">
      <div>
        <CardHeader className="p-4 sm:p-5 pb-2 sm:pb-2 flex flex-row items-start justify-between space-y-0 gap-2">
          <div className="truncate">
            <CardTitle className="text-base font-semibold truncate">
              {contact.first_name} {contact.last_name}
            </CardTitle>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1 truncate">
              <Briefcase className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
              <span className="truncate">{contact.position || "Unknown Role"}</span>
            </p>
          </div>

          {contact.profile_url && (
            <a
              href={contact.profile_url}
              target="_blank"
              rel="noopener noreferrer"
              title="Open LinkedIn profile"
              className="p-1.5 text-muted-foreground hover:text-primary rounded-md hover:bg-accent transition-colors shrink-0"
              aria-label={`Open ${contact.first_name}'s profile`}
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
        </CardHeader>

        <CardContent className="p-4 sm:p-5 pt-2 sm:pt-2 space-y-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5 truncate">
              <Building className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
              <span className="font-medium text-foreground truncate">{contact.company || "Unknown"}</span>
            </div>

            <Link
              href={`/openings?company=${encodeURIComponent(contact.company || "")}`}
              className="text-[11px] text-primary hover:underline flex items-center gap-1 shrink-0"
            >
              <span>Careers</span>
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>

          {analysis ? (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <Badge variant={getPriorityBadgeVariant(analysis.priority)} className="font-bold">
                {analysis.priority} ({analysis.score})
              </Badge>
              {analysis.categories?.map((cat) => (
                <Badge key={cat} variant="outline" className="text-[10px] px-1.5">
                  {cat}
                </Badge>
              ))}
            </div>
          ) : (
            <div className="text-xs text-muted-foreground/70 italic pt-1">
              Not evaluated yet. Click "Score Connections" to analyze.
            </div>
          )}
        </CardContent>
      </div>

      <CardFooter className="p-4 sm:p-5 pt-3 border-t border-border/40 flex items-center justify-between gap-2 mt-auto">
        <Button
          variant="outline"
          size="sm"
          onClick={onExplainScore}
          disabled={!analysis}
          className="text-xs h-8"
        >
          Explain Score
        </Button>
        <Button asChild size="sm" className="text-xs h-8 font-semibold shadow-xs">
          <Link href={`/messages?contact_id=${contact.id}`}>
            Draft Outreach
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
