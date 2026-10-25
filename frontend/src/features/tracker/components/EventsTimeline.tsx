"use client";

import React from "react";
import { OutreachEvent } from "../hooks/useTracker";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { History, Copy, Edit3, ArrowRight, MessageSquare, Clock, CheckCircle2 } from "lucide-react";

interface EventsTimelineProps {
  events: OutreachEvent[];
  loading?: boolean;
}

export function EventsTimeline({ events, loading }: EventsTimelineProps) {
  if (loading) {
    return (
      <div className="space-y-3 py-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 bg-muted/40 animate-pulse rounded-lg border border-border/40" />
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <Card className="p-8 text-center text-muted-foreground flex flex-col items-center justify-center">
        <History className="h-8 w-8 mb-2 opacity-40" />
        <p className="text-sm font-medium">No activity logged yet.</p>
        <p className="text-xs text-muted-foreground/70 mt-1">Actions taken in Message Studio and Tracker will appear here.</p>
      </Card>
    );
  }

  const getEventIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "copied":
        return <Copy className="h-4 w-4 text-primary" />;
      case "draft_edited":
        return <Edit3 className="h-4 w-4 text-amber-500" />;
      case "state_transition":
        return <ArrowRight className="h-4 w-4 text-indigo-500" />;
      case "replied":
        return <MessageSquare className="h-4 w-4 text-purple-500" />;
      case "follow_up_scheduled":
        return <Clock className="h-4 w-4 text-orange-500" />;
      default:
        return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    }
  };

  return (
    <div className="space-y-3">
      {events.map((evt) => (
        <Card key={evt.id} className="p-4 flex items-start gap-3 bg-card border-border shadow-xs hover:border-primary/30 transition-colors">
          <div className="p-2 rounded-lg bg-muted text-muted-foreground shrink-0 mt-0.5">
            {getEventIcon(evt.event_type)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-foreground capitalize">
                {evt.event_type.replace(/_/g, " ")}
              </span>
              <span className="text-xs text-muted-foreground shrink-0">
                {new Date(evt.occurred_at).toLocaleString()}
              </span>
            </div>
            {evt.notes && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {evt.notes}
              </p>
            )}
            <div className="mt-2 flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                Status: {evt.status}
              </Badge>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
