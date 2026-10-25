import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import { MessageDraft, Contact } from "@/lib/schemas";

export function useMessageStudioData() {
  const contactsQuery = useQuery<{ items: Contact[]; total: number }, ApiError>({
    queryKey: ["contacts"],
    queryFn: () => api.get("/contacts?limit=200"),
  });

  const draftsQuery = useQuery<MessageDraft[], ApiError>({
    queryKey: ["drafts"],
    queryFn: () => api.get("/messages"),
  });

  const resumesQuery = useQuery<any[], ApiError>({
    queryKey: ["resumes"],
    queryFn: () => api.get("/resumes"),
  });

  return {
    contacts: contactsQuery.data?.items || [],
    drafts: draftsQuery.data || [],
    resumes: resumesQuery.data || [],
    isLoading: contactsQuery.isLoading || draftsQuery.isLoading || resumesQuery.isLoading,
  };
}

export interface GenerateDraftPayload {
  contact_id: string;
  template_code: string;
  tone: string;
  allow_referral_override?: boolean;
  resume_id?: string | null;
}

export function useGenerateDraft() {
  const queryClient = useQueryClient();

  return useMutation<MessageDraft, ApiError, GenerateDraftPayload>({
    mutationFn: (payload) => api.post("/messages/generate", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drafts"] });
      queryClient.invalidateQueries({ queryKey: ["overview"] });
    },
  });
}

export function useUpdateDraftStatus() {
  const queryClient = useQueryClient();

  return useMutation<MessageDraft, ApiError, { id: string; status: string; notes?: string }>({
    mutationFn: ({ id, status, notes }) =>
      api.put(`/messages/${id}/status`, { status, notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drafts"] });
      queryClient.invalidateQueries({ queryKey: ["tracker"] });
    },
  });
}
