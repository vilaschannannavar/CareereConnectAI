"use client";

import React from "react";
import { JobOpening } from "../hooks/useOpenings";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building, ExternalLink, Trash2, Calendar, FileText, CheckCircle2, AlertCircle } from "lucide-react";

interface OpeningCardProps {
  opening: JobOpening;
  onDelete: (id: string) => void;
}

export function OpeningCard({ opening, onDelete }: OpeningCardProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Verified current":
      case "active":
        return (
          <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
            <CheckCircle2 className="h-3 w-3 mr-1" /> Verified current
          </Badge>
        );
      case "Previously published":
        return (
          <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30">
            Previously published
          </Badge>
        );
      case "General match":
        return (
          <Badge variant="outline" className="text-xs bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30">
            General match
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-xs bg-muted text-muted-foreground border-border">
            Unverified
          </Badge>
        );
    }
  };

  return (
    <Card className="p-5 border-border bg-card shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-4">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-foreground truncate">{opening.title}</h3>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
              <Building className="h-3.5 w-3.5 shrink-0" />
              <span className="font-semibold text-foreground truncate">{opening.company}</span>
            </p>
          </div>
          {getStatusBadge(opening.status)}
        </div>

        {opening.notes && (
          <p className="text-xs text-muted-foreground line-clamp-2 bg-muted/30 p-2.5 rounded-lg border border-border/40">
            {opening.notes}
          </p>
        )}
      </div>

      <div className="pt-3 border-t border-border/50 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          {opening.career_page_url && (
            <a
              href={opening.career_page_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
            >
              <span>Official Careers</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
          {opening.url && (
            <a
              href={opening.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
            >
              <span>Job Posting</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(opening.id)}
          className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </Card>
  );
}
