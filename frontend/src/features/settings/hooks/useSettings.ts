import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";

export interface ResumeItem {
  id: string;
  user_id: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  parsed_data: Record<string, any>;
  created_at: string;
}

export interface ProfileData {
  target_roles: string[];
  target_companies: string[];
  target_locations: string[];
  skills: string[];
  education: any[];
  experience_years: number;
  bio: string;
  preferences?: {
    preferred_tone?: string;
    retention_policy?: string;
    scoring_weights?: {
      role_relevance?: number;
      ability_to_help?: number;
      company_industry?: number;
      technical_domain?: number;
      recruitment_referral_evidence?: number;
    };
  };
}

export interface IntegrationItem {
  id: string;
  provider: string;
  account_email?: string;
  is_active: boolean;
  created_at: string;
}

export interface BudgetStatus {
  budget_cap_usd: number;
  total_spent_usd: number;
  remaining_usd: number;
  is_capped: boolean;
}

export function useSettingsData() {
  const resumesQuery = useQuery<ResumeItem[], ApiError>({
    queryKey: ["settings", "resumes"],
    queryFn: () => api.get("/resumes"),
  });

  const profileQuery = useQuery<ProfileData, ApiError>({
    queryKey: ["settings", "profile"],
    queryFn: () => api.get("/profile"),
  });

  const integrationsQuery = useQuery<IntegrationItem[], ApiError>({
    queryKey: ["settings", "integrations"],
    queryFn: () => api.get("/integrations"),
  });

  const budgetQuery = useQuery<BudgetStatus, ApiError>({
    queryKey: ["settings", "budget"],
    queryFn: () => api.get("/auth/budget"),
  });

  return {
    resumes: resumesQuery.data || [],
    profile: profileQuery.data,
    integrations: integrationsQuery.data || [],
    budget: budgetQuery.data,
    isLoading: resumesQuery.isLoading || profileQuery.isLoading,
    refetch: () => {
      resumesQuery.refetch();
      profileQuery.refetch();
      integrationsQuery.refetch();
      budgetQuery.refetch();
    },
  };
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation<ProfileData, ApiError, Partial<ProfileData>>({
    mutationFn: (payload) => api.put("/profile", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings", "profile"] });
      queryClient.invalidateQueries({ queryKey: ["shortlist"] });
    },
  });
}

export function useDeleteResume() {
  const queryClient = useQueryClient();

  return useMutation<{ message: string }, ApiError, string>({
    mutationFn: (resumeId) => api.delete(`/resumes/${resumeId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings", "resumes"] });
    },
  });
}
