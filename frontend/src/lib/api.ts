/**
 * CareerConnect AI — Unified Typed API Client.
 * Handles base URL, credentials: "include", automatic CSRF header injection,
 * typed ApiError mapping, 401 redirect preservation, and 429 rate limit backoff messaging.
 */

let currentCsrfToken: string | null = null;

export function setCsrfToken(token: string | null) {
  currentCsrfToken = token;
}

export function getCsrfToken(): string | null {
  return currentCsrfToken;
}

export interface FetchOptions extends Omit<RequestInit, "body"> {
  data?: unknown;
  params?: Record<string, string | number | boolean | undefined | null>;
}

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(status: number, message: string, data?: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined" ? "" : "http://127.0.0.1:8000");

export async function apiClient<T = any>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const { data, params, headers = {}, ...customConfig } = options;

  const defaultHeaders: Record<string, string> = {
    Accept: "application/json",
  };

  // Only set Content-Type if sending JSON data (FormData sets its own boundary)
  if (data && !(data instanceof FormData)) {
    defaultHeaders["Content-Type"] = "application/json";
  }

  // Include CSRF token on state-changing methods
  const method = (customConfig.method || "GET").toUpperCase();
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method) && currentCsrfToken) {
    defaultHeaders["X-CSRF-Token"] = currentCsrfToken;
  }

  const config: RequestInit = {
    ...customConfig,
    method,
    headers: {
      ...defaultHeaders,
      ...(headers as Record<string, string>),
    },
    credentials: "include", // Send and receive secure httpOnly session cookies
  };

  if (data) {
    config.body = data instanceof FormData ? data : JSON.stringify(data);
  }

  // Build resolved URL with query parameters
  let cleanEndpoint = endpoint;
  if (!cleanEndpoint.startsWith("http")) {
    if (cleanEndpoint.startsWith("/api/v1/")) {
      // already prefixed
    } else if (cleanEndpoint.startsWith("/api/integrations")) {
      cleanEndpoint = cleanEndpoint.replace("/api/integrations", "/api/v1/integrations");
    } else if (cleanEndpoint.startsWith("/api/")) {
      cleanEndpoint = cleanEndpoint.replace("/api/", "/api/v1/");
    } else {
      cleanEndpoint = `/api/v1${cleanEndpoint.startsWith("/") ? "" : "/"}${cleanEndpoint}`;
    }
    cleanEndpoint = `${API_BASE_URL}${cleanEndpoint}`;
  }

  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== "") {
        searchParams.append(key, String(val));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      cleanEndpoint += (cleanEndpoint.includes("?") ? "&" : "?") + queryString;
    }
  }

  let response: Response;
  try {
    response = await fetch(cleanEndpoint, config);
  } catch (err: any) {
    throw new ApiError(
      0,
      "Network connection error. Please ensure the backend server is reachable.",
      err
    );
  }

  // 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  let responseData: any;
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    try {
      responseData = await response.json();
    } catch {
      responseData = null;
    }
  } else {
    try {
      responseData = await response.text();
    } catch {
      responseData = null;
    }
  }

  if (!response.ok) {
    // 401 Unauthorized handling - only redirect if on a protected route
    if (response.status === 401 && typeof window !== "undefined") {
      const currentPath = window.location.pathname;
      const isProtected =
        currentPath.startsWith("/overview") ||
        currentPath.startsWith("/connections") ||
        currentPath.startsWith("/shortlist") ||
        currentPath.startsWith("/messages") ||
        currentPath.startsWith("/tracker") ||
        currentPath.startsWith("/settings") ||
        currentPath.startsWith("/openings") ||
        currentPath.startsWith("/onboarding");
      if (isProtected) {
        window.location.href = `/login?next=${encodeURIComponent(currentPath)}`;
      }
    }

    // 429 Too Many Requests
    if (response.status === 429) {
      throw new ApiError(
        429,
        "Rate limit reached. Please wait a moment before trying again.",
        responseData
      );
    }

    const errorMsg =
      (responseData && typeof responseData === "object" && responseData.detail) ||
      (typeof responseData === "string" && responseData.length < 300
        ? responseData
        : `Server returned status ${response.status}`);

    throw new ApiError(response.status, errorMsg, responseData);
  }

  return responseData as T;
}

// Ergonomic typed helper methods
export const api = {
  get: <T = any>(endpoint: string, options?: FetchOptions) =>
    apiClient<T>(endpoint, { ...options, method: "GET" }),
  post: <T = any>(endpoint: string, data?: unknown, options?: FetchOptions) =>
    apiClient<T>(endpoint, { ...options, method: "POST", data }),
  put: <T = any>(endpoint: string, data?: unknown, options?: FetchOptions) =>
    apiClient<T>(endpoint, { ...options, method: "PUT", data }),
  patch: <T = any>(endpoint: string, data?: unknown, options?: FetchOptions) =>
    apiClient<T>(endpoint, { ...options, method: "PATCH", data }),
  delete: <T = any>(endpoint: string, options?: FetchOptions) =>
    apiClient<T>(endpoint, { ...options, method: "DELETE" }),
};
