import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import { MessageDraft } from "@/lib/schemas";

export interface OutreachPipeline {
  drafted: MessageDraft[];
  approved: MessageDraft[];
  awaiting_manual_send: MessageDraft[];
  marked_sent: MessageDraft[];
  sent_verified: MessageDraft[];
  follow_up_suggested: MessageDraft[];
  replied: MessageDraft[];
}

export interface OutreachEvent {
  id: string;
  user_id: string;
  contact_id: string;
  draft_id?: string | null;
  event_type: string;
  status: string;
  occurred_at: string;
  notes?: string | null;
}

export function useTrackerData() {
  const pipelineQuery = useQuery<OutreachPipeline, ApiError>({
    queryKey: ["tracker", "pipeline"],
    queryFn: () => api.get("/tracker"),
  });

  const eventsQuery = useQuery<OutreachEvent[], ApiError>({
    queryKey: ["tracker", "events"],
    queryFn: () => api.get("/tracker/events"),
  });

  return {
    pipeline: pipelineQuery.data || {
      drafted: [],
      approved: [],
      awaiting_manual_send: [],
      marked_sent: [],
      sent_verified: [],
      follow_up_suggested: [],
      replied: [],
    },
    events: eventsQuery.data || [],
    isLoading: pipelineQuery.isLoading || eventsQuery.isLoading,
    refetch: () => {
      pipelineQuery.refetch();
      eventsQuery.refetch();
    },
  };
}

export function useTransitionDraft() {
  const queryClient = useQueryClient();

  return useMutation<MessageDraft, ApiError, { draftId: string; targetState: string }>({
    mutationFn: ({ draftId, targetState }) =>
      api.post(`/messages/${draftId}/transition`, { target_state: targetState }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tracker"] });
      queryClient.invalidateQueries({ queryKey: ["messages"] });
      queryClient.invalidateQueries({ queryKey: ["overview"] });
    },
  });
}

export function useScheduleFollowUp() {
  const queryClient = useQueryClient();

  return useMutation<MessageDraft, ApiError, { draftId: string; followUpDays: number; notes?: string }>({
    mutationFn: ({ draftId, followUpDays, notes }) =>
      api.post(`/tracker/${draftId}/schedule-follow-up`, { follow_up_days: followUpDays, notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tracker"] });
      queryClient.invalidateQueries({ queryKey: ["overview"] });
    },
  });
}

export function useMarkReplied() {
  const queryClient = useQueryClient();

  return useMutation<{ message: string }, ApiError, { contactId: string; notes?: string }>({
    mutationFn: ({ contactId, notes }) =>
      api.post(`/tracker/contact/${contactId}/mark-replied`, { notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tracker"] });
      queryClient.invalidateQueries({ queryKey: ["overview"] });
    },
  });
}
