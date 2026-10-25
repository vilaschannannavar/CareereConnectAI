"use client";

import React, { useState } from "react";
import { MessageDraft } from "@/lib/schemas";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, Clock } from "lucide-react";

interface RescheduleModalProps {
  draft: MessageDraft | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (days: number, notes: string) => Promise<void>;
}

export function RescheduleModal({ draft, open, onOpenChange, onSubmit }: RescheduleModalProps) {
  const [days, setDays] = useState<number>(7);
  const [notes, setNotes] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  if (!draft) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(days, notes);
      onOpenChange(false);
      setNotes("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Reschedule Follow-up
          </DialogTitle>
          <DialogDescription>
            Choose how many days from today before CareerConnect AI prompts you to follow up.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Follow-up in (days):</label>
            <div className="grid grid-cols-4 gap-2">
              {[3, 5, 7, 14].map((d) => (
                <Button
                  key={d}
                  type="button"
                  variant={days === d ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDays(d)}
                >
                  {d} days
                </Button>
              ))}
            </div>
            <Input
              type="number"
              min="1"
              max="90"
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value) || 7)}
              className="mt-2"
              placeholder="Or custom days..."
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Follow-up Note (optional):</label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Inquire about the team sync after conference..."
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Schedule Follow-up"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
