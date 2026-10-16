"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Send,
  CheckCircle2,
  Clock,
  MessageSquare,
  ArrowRight,
  Sparkles,
  ExternalLink,
  Calendar,
  AlertCircle,
  AlertTriangle,
  History,
  RotateCcw,
  Check,
  ChevronRight,
  Search,
  Filter,
  User,
  Building,
  Mail,
  Copy
} from "lucide-react";

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  company: string;
  position: string;
  profile_url: string;
}

interface MessageDraft {
  id: string;
  contact_id: string;
  status: string;
  template_code: string;
  tone: string;
  subject: string;
  body: string;
  character_count: number;
  delivery_channel: string;
  sent_at?: string | null;
  follow_up_suggested_at?: string | null;
  contact?: Contact;
}

interface OutreachPipeline {
  drafted: MessageDraft[];
  approved: MessageDraft[];
  awaiting_manual_send: MessageDraft[];
  marked_sent: MessageDraft[];
  sent_verified: MessageDraft[];
  follow_up_suggested: MessageDraft[];
  replied: MessageDraft[];
}

interface OutreachEvent {
  id: string;
  user_id: string;
  contact_id: string;
  draft_id?: string | null;
  event_type: string;
  status: string;
  notes?: string | null;
  occurred_at: string;
}

export default function OutreachTrackerPage() {
  const [pipeline, setPipeline] = useState<OutreachPipeline>({
    drafted: [],
    approved: [],
    awaiting_manual_send: [],
    marked_sent: [],
    sent_verified: [],
    follow_up_suggested: [],
    replied: [],
  });
  const [events, setEvents] = useState<OutreachEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<"pipeline" | "timeline">("pipeline");
  const [selectedColumn, setSelectedColumn] = useState<string>("all");
  
  // Reschedule Follow-up Modal State
  const [rescheduleDraft, setRescheduleDraft] = useState<MessageDraft | null>(null);
  const [rescheduleDays, setRescheduleDays] = useState<number>(7);
  const [rescheduleNotes, setRescheduleNotes] = useState<string>("");
  const [submittingAction, setSubmittingAction] = useState<boolean>(false);

  // Status feedback
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadTrackerData = async () => {
    setLoading(true);
    try {
      const [pipeData, eventData] = await Promise.all([
        apiClient<OutreachPipeline>("/tracker").catch(() => ({
          drafted: [],
          approved: [],
          awaiting_manual_send: [],
          marked_sent: [],
          sent_verified: [],
          follow_up_suggested: [],
          replied: [],
        })),
        apiClient<OutreachEvent[]>("/tracker/events").catch(() => []),
      ]);

      setPipeline(pipeData);
      setEvents(eventData);
    } catch (err: any) {
      console.error("Failed loading tracker data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrackerData();
  }, []);

  const handleMarkReplied = async (contactId: string) => {
    setSubmittingAction(true);
    try {
      await apiClient(`/tracker/contact/${contactId}/mark-replied`, {
        method: "POST",
        data: { notes: "User marked contact as replied" },
      });
      setFeedback("Connection marked as replied! Conversation logged in Replied status.");
      await loadTrackerData();
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      alert("Failed to mark replied: " + err.message);
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleScheduleFollowUp = async () => {
    if (!rescheduleDraft) return;
    setSubmittingAction(true);
    try {
      await apiClient(`/tracker/${rescheduleDraft.id}/schedule-follow-up`, {
        method: "POST",
        data: {
          follow_up_days: rescheduleDays,
          notes: rescheduleNotes || undefined,
        },
      });
      setFeedback(`Follow-up rescheduled in ${rescheduleDays} days.`);
      setRescheduleDraft(null);
      await loadTrackerData();
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      alert("Failed to reschedule follow-up: " + err.message);
    } finally {
      setSubmittingAction(false);
    }
  };

  const totalTracked =
    pipeline.drafted.length +
    pipeline.approved.length +
    pipeline.awaiting_manual_send.length +
    pipeline.marked_sent.length +
    pipeline.sent_verified.length +
    pipeline.follow_up_suggested.length +
    pipeline.replied.length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Outreach Tracker</h1>
          <p className="text-sm text-slate-500">
            Monitor manual outreach stages, follow-up deadlines, and confirmed replies with full audit history.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 text-xs font-medium">
            <button
              onClick={() => setActiveTab("pipeline")}
              className={`px-3 py-1.5 rounded-md transition-all ${
                activeTab === "pipeline"
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Pipeline Board
            </button>
            <button
              onClick={() => setActiveTab("timeline")}
              className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                activeTab === "timeline"
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <History className="h-3.5 w-3.5" />
              <span>Event Audit Trail ({events.length})</span>
            </button>
          </div>
          <Link href="/messages">
            <Button size="sm" className="flex items-center gap-1.5">
              <Sparkles className="h-4 w-4" />
              <span>Open Studio</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Notification Toast */}
      {feedback && (
        <div className="p-3.5 rounded-lg border border-emerald-200 bg-emerald-50 text-sm text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="p-3 rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">In Progress</div>
          <div className="text-xl font-bold text-slate-900 mt-0.5">
            {pipeline.drafted.length + pipeline.approved.length + pipeline.awaiting_manual_send.length}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Drafts & Approvals</div>
        </div>

        <div className="p-3 rounded-lg border border-blue-200 bg-blue-50/40 shadow-sm">
          <div className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider">Marked Sent</div>
          <div className="text-xl font-bold text-blue-950 mt-0.5">{pipeline.marked_sent.length}</div>
          <div className="text-[10px] text-blue-700 mt-0.5">Manual LinkedIn sends</div>
        </div>

        <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/50 shadow-sm">
          <div className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">Follow-Up Due</div>
          <div className="text-xl font-bold text-amber-950 mt-0.5">{pipeline.follow_up_suggested.length}</div>
          <div className="text-[10px] text-amber-800 mt-0.5">&gt; 7 days without reply</div>
        </div>

        <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/50 shadow-sm">
          <div className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">Replied</div>
          <div className="text-xl font-bold text-emerald-950 mt-0.5">{pipeline.replied.length}</div>
          <div className="text-[10px] text-emerald-800 mt-0.5">Confirmed responses</div>
        </div>

        <div className="p-3 rounded-lg border border-purple-200 bg-purple-50/40 shadow-sm">
          <div className="text-[11px] font-semibold text-purple-700 uppercase tracking-wider">Sent (Verified)</div>
          <div className="text-xl font-bold text-purple-950 mt-0.5">{pipeline.sent_verified.length}</div>
          <div className="text-[10px] text-purple-800 mt-0.5">Enterprise API (0)</div>
        </div>

        <div className="p-3 rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Tracked</div>
          <div className="text-xl font-bold text-slate-900 mt-0.5">{totalTracked}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Across all stages</div>
        </div>
      </div>

      {/* Main Tab Content */}
      {activeTab === "pipeline" ? (
        totalTracked === 0 ? (
          <Card className="border-dashed border-2 border-slate-200 bg-white p-12 text-center shadow-none">
            <div className="max-w-md mx-auto space-y-3">
              <div className="h-12 w-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                <Send className="h-6 w-6" />
              </div>
              <h3 className="text-base font-semibold text-slate-900">No outreach pipeline active</h3>
              <p className="text-xs text-slate-500">
                You haven&apos;t generated any outreach messages yet. Use Message Studio to draft and review personalized messages.
              </p>
              <div className="pt-2">
                <Link href="/messages">
                  <Button size="sm">Create First Message Draft</Button>
                </Link>
              </div>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Column 1: Awaiting Send */}
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Ready to Send ({pipeline.awaiting_manual_send.length + pipeline.approved.length})
                </span>
                <Badge variant="secondary" className="text-[10px]">
                  Manual Action
                </Badge>
              </div>

              {[...pipeline.approved, ...pipeline.awaiting_manual_send].length === 0 ? (
                <div className="text-xs text-slate-400 p-4 border border-dashed rounded-lg text-center bg-slate-50/50">
                  No drafts awaiting manual send
                </div>
              ) : (
                [...pipeline.approved, ...pipeline.awaiting_manual_send].map((draft) => (
                  <Card key={draft.id} className="p-3 shadow-sm hover:border-blue-300 transition-colors">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-semibold text-xs text-slate-900">
                          {draft.contact ? `${draft.contact.first_name} ${draft.contact.last_name}` : "Contact"}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {draft.contact ? `${draft.contact.company}` : ""}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[9px] bg-amber-50 text-amber-700 border-amber-300">
                        {draft.status}
                      </Badge>
                    </div>

                    <p className="text-[11px] text-slate-600 line-clamp-2 mt-2 italic bg-slate-50 p-1.5 rounded">
                      &ldquo;{draft.body}&rdquo;
                    </p>

                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                      <Link href="/messages">
                        <Button variant="ghost" size="sm" className="h-6 text-[11px] px-1.5">
                          Open in Studio &rarr;
                        </Button>
                      </Link>
                      {draft.contact && (
                        <a
                          href={draft.contact.profile_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-blue-600 flex items-center gap-1 hover:underline"
                        >
                          <span>LinkedIn</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </Card>
                ))
              )}
            </div>

            {/* Column 2: Marked Sent (Waiting for reply) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-800">
                  Marked Sent ({pipeline.marked_sent.length})
                </span>
                <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">
                  7-Day Clock
                </Badge>
              </div>

              {pipeline.marked_sent.length === 0 ? (
                <div className="text-xs text-slate-400 p-4 border border-dashed rounded-lg text-center bg-slate-50/50">
                  No outreach currently in waiting window
                </div>
              ) : (
                pipeline.marked_sent.map((draft) => (
                  <Card key={draft.id} className="p-3 shadow-sm border-blue-100 bg-white">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-semibold text-xs text-slate-900">
                          {draft.contact ? `${draft.contact.first_name} ${draft.contact.last_name}` : "Contact"}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {draft.contact ? `${draft.contact.company}` : ""}
                        </div>
                      </div>
                      <Badge className="text-[9px] bg-blue-600 text-white">Sent by You</Badge>
                    </div>

                    {draft.follow_up_suggested_at && (
                      <div className="mt-2 text-[11px] text-slate-600 flex items-center gap-1.5 bg-slate-50 p-1.5 rounded">
                        <Clock className="h-3 w-3 text-slate-400" />
                        <span>Follow-up: {new Date(draft.follow_up_suggested_at).toLocaleDateString()}</span>
                      </div>
                    )}

                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleMarkReplied(draft.contact_id)}
                        disabled={submittingAction}
                        className="h-6 text-[11px] px-2 text-emerald-700 hover:bg-emerald-50"
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Mark Replied
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setRescheduleDraft(draft)}
                        className="h-6 text-[11px] px-1 text-slate-500"
                        title="Reschedule Follow-up"
                      >
                        <Calendar className="h-3 w-3" />
                      </Button>
                    </div>
                  </Card>
                ))
              )}
            </div>

            {/* Column 3: Follow-Up Due */}
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
                  Follow-Up Due ({pipeline.follow_up_suggested.length})
                </span>
                <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-800 border-amber-300">
                  Action Needed
                </Badge>
              </div>

              {pipeline.follow_up_suggested.length === 0 ? (
                <div className="text-xs text-slate-400 p-4 border border-dashed rounded-lg text-center bg-slate-50/50">
                  No overdue follow-ups
                </div>
              ) : (
                pipeline.follow_up_suggested.map((draft) => (
                  <Card key={draft.id} className="p-3 shadow-sm border-amber-200 bg-amber-50/20">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-semibold text-xs text-slate-900">
                          {draft.contact ? `${draft.contact.first_name} ${draft.contact.last_name}` : "Contact"}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {draft.contact ? `${draft.contact.company}` : ""}
                        </div>
                      </div>
                      <Badge className="text-[9px] bg-amber-500 text-white">&gt; 7 Days</Badge>
                    </div>

                    <div className="mt-2 text-[11px] text-amber-800 flex items-center gap-1.5 bg-amber-50 p-1.5 rounded border border-amber-200">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                      <span>7-day window passed without recorded reply. Send a polite check-in or reschedule.</span>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleMarkReplied(draft.contact_id)}
                        disabled={submittingAction}
                        className="h-6 text-[11px] px-2 text-emerald-700 hover:bg-emerald-50"
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Mark Replied
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setRescheduleDraft(draft)}
                        className="h-6 text-[11px] px-2 text-slate-600"
                      >
                        <Calendar className="h-3 w-3 mr-1" />
                        Reschedule
                      </Button>
                    </div>
                  </Card>
                ))
              )}
            </div>

            {/* Column 4: Replied */}
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                  Replied ({pipeline.replied.length})
                </span>
                <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                  Completed
                </Badge>
              </div>

              {pipeline.replied.length === 0 ? (
                <div className="text-xs text-slate-400 p-4 border border-dashed rounded-lg text-center bg-slate-50/50">
                  No replies recorded yet
                </div>
              ) : (
                pipeline.replied.map((draft) => (
                  <Card key={draft.id} className="p-3 shadow-sm border-emerald-100 bg-white">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-semibold text-xs text-slate-900">
                          {draft.contact ? `${draft.contact.first_name} ${draft.contact.last_name}` : "Contact"}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {draft.contact ? `${draft.contact.company}` : ""}
                        </div>
                      </div>
                      <Badge className="text-[9px] bg-emerald-600 text-white">Replied</Badge>
                    </div>

                    <div className="mt-2 text-[11px] text-emerald-800 flex items-center gap-1.5 bg-emerald-50 p-1.5 rounded">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      <span>User confirmed active dialogue on LinkedIn</span>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-end">
                      {draft.contact && (
                        <a
                          href={draft.contact.profile_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-blue-600 flex items-center gap-1 hover:underline"
                        >
                          <span>Open Profile</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        )
      ) : (
        /* Event Audit Trail View */
        <Card className="shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-base flex items-center gap-2">
              <History className="h-4 w-4 text-slate-500" />
              <span>Outreach Event History</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Every draft creation, edit, approval, copy, sent confirmation, and reply is permanently audit-logged.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-slate-100">
            {events.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">No events recorded yet.</div>
            ) : (
              events.map((evt) => (
                <div key={evt.id} className="p-3.5 hover:bg-slate-50 transition-colors flex items-start justify-between gap-4">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {evt.event_type}
                      </Badge>
                      <span className="text-xs font-semibold text-slate-900">
                        Status: {evt.status}
                      </span>
                    </div>
                    {evt.notes && <p className="text-xs text-slate-600 mt-1">{evt.notes}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[11px] text-slate-400 font-mono">
                      {new Date(evt.occurred_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {/* Reschedule Modal */}
      {rescheduleDraft && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="max-w-md w-full shadow-lg bg-white">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-600" />
                <span>Reschedule Follow-Up Date</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Update the reminder countdown for {rescheduleDraft.contact?.first_name || "this contact"}.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Follow-up in days from today:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[7, 14, 30].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setRescheduleDays(d)}
                      className={`p-2 rounded border text-xs text-center transition-all ${
                        rescheduleDays === d
                          ? "border-blue-500 bg-blue-50 font-bold text-blue-900"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      +{d} days
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Optional Reminder Note:
                </label>
                <Input
                  placeholder="e.g., Contact on PTO until Monday"
                  value={rescheduleNotes}
                  onChange={(e) => setRescheduleNotes(e.target.value)}
                  className="text-xs"
                />
              </div>
            </CardContent>
            <CardFooter className="border-t border-slate-100 flex items-center justify-end gap-2 pt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRescheduleDraft(null)}
                disabled={submittingAction}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleScheduleFollowUp}
                disabled={submittingAction}
              >
                Save Follow-Up
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}
