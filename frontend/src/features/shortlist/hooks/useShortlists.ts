import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import { Contact } from "@/lib/schemas";

export interface FactorItem {
  sub_score: number;
  normalized_weight: number;
  original_weight: number;
  evidence: string;
  is_scorable: boolean;
}

export interface Analysis {
  id: string;
  contact_id: string;
  score: number;
  priority: string;
  confidence: number;
  categories: string[];
  reasons: string[];
  missing_info: string[];
  factor_breakdown: Record<string, FactorItem>;
  weights_used: Record<string, number>;
  analyzed_at: string;
}

export interface Shortlist {
  id: string;
  name: string;
  description?: string;
  is_default: boolean;
  created_at: string;
  items_count: number;
}

export interface ScoringWeights {
  role_relevance: number;
  ability_to_help: number;
  company_industry: number;
  technical_domain: number;
  recruitment_referral_evidence: number;
}

export function useScoringData() {
  const contactsQuery = useQuery<{ items: Contact[]; total: number }, ApiError>({
    queryKey: ["contacts"],
    queryFn: () => api.get("/contacts?limit=200"),
  });

  const analysesQuery = useQuery<Record<string, Analysis>, ApiError>({
    queryKey: ["analyses"],
    queryFn: async () => {
      const res = await api.get<{ analyses: Analysis[] }>("/scoring/analyses");
      const map: Record<string, Analysis> = {};
      (res.analyses || []).forEach((a) => {
        map[a.contact_id] = a;
      });
      return map;
    },
  });

  const shortlistsQuery = useQuery<Shortlist[], ApiError>({
    queryKey: ["shortlists"],
    queryFn: async () => {
      const res = await api.get<{ items: Shortlist[] }>("/shortlists");
      return res.items || [];
    },
  });

  return {
    contacts: contactsQuery.data?.items || [],
    analyses: analysesQuery.data || {},
    shortlists: shortlistsQuery.data || [],
    isLoading: contactsQuery.isLoading || analysesQuery.isLoading || shortlistsQuery.isLoading,
    refetchAll: () => {
      contactsQuery.refetch();
      analysesQuery.refetch();
      shortlistsQuery.refetch();
    },
  };
}

export function useBatchScore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (weights?: ScoringWeights) => {
      return await api.post("/scoring/batch-analyze", weights ? { weights } : {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["analyses"] });
      queryClient.invalidateQueries({ queryKey: ["overview"] });
    },
  });
}
