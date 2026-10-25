import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import { Contact } from "@/lib/schemas";

export interface ConnectionsQueryParams {
  query?: string;
  company?: string;
  role?: string;
  sort_by?: "name" | "company" | "connected_on";
  sort_order?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface ConnectionsResponse {
  items: Contact[];
  total: number;
}

export function useConnections(params: ConnectionsQueryParams = {}) {
  return useQuery<ConnectionsResponse, ApiError>({
    queryKey: ["contacts", params],
    queryFn: async () => {
      return await api.get<ConnectionsResponse>("/contacts", {
        params: {
          query: params.query || undefined,
          company: params.company || undefined,
          role: params.role || undefined,
          sort_by: params.sort_by || "name",
          sort_order: params.sort_order || "asc",
          skip: params.page ? (params.page - 1) * (params.limit || 50) : 0,
          limit: params.limit || 100,
        },
      });
    },
  });
}

export interface CSVPreviewResponse {
  preamble_lines_stripped: number;
  headers: string[];
  preview: Record<string, string>[];
  total_rows: number;
  mapping_suggestions: Record<string, string>;
}

export function useCsvPreview() {
  return useMutation<CSVPreviewResponse, ApiError, File>({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return await api.post<CSVPreviewResponse>("/contacts/preview-csv", formData);
    },
  });
}

export interface CSVImportResponse {
  total_processed: number;
  new_contacts_count: number;
  updated_contacts_count: number;
  errors_count?: number;
}

export function useCsvImport() {
  const queryClient = useQueryClient();

  return useMutation<CSVImportResponse, ApiError, File>({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return await api.post<CSVImportResponse>("/contacts/import-csv", formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["overview"] });
      queryClient.invalidateQueries({ queryKey: ["shortlists"] });
    },
  });
}
