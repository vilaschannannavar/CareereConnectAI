import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";

export interface JobOpening {
  id: string;
  user_id: string;
  company: string;
  title: string;
  url?: string | null;
  career_page_url?: string | null;
  notes?: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export function useOpenings(statusFilter?: string) {
  const query = useQuery<JobOpening[], ApiError>({
    queryKey: ["openings", statusFilter],
    queryFn: () => {
      const endpoint = statusFilter && statusFilter !== "all"
        ? `/openings?status=${statusFilter}`
        : "/openings";
      return api.get(endpoint);
    },
  });

  return {
    openings: query.data || [],
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}

export function useCreateOpening() {
  const queryClient = useQueryClient();

  return useMutation<JobOpening, ApiError, { company: string; title: string; url?: string; notes?: string; status?: string }>({
    mutationFn: (payload) => api.post("/openings", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["openings"] });
    },
  });
}

export function useDeleteOpening() {
  const queryClient = useQueryClient();

  return useMutation<{ message: string }, ApiError, string>({
    mutationFn: (id) => api.delete(`/openings/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["openings"] });
    },
  });
}

export async function resolveCareerUrl(company: string) {
  return api.get<{ company: string; career_page_url: string | null }>(`/openings/career-url?company=${encodeURIComponent(company)}`);
}
