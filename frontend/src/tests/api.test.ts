import { describe, it, expect, vi, beforeEach } from "vitest";
import { api, apiClient, ApiError, setCsrfToken, getCsrfToken } from "@/lib/api";

describe("Frontend Typed API Client", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setCsrfToken(null);
  });

  it("manages and injects CSRF token properly", () => {
    setCsrfToken("test-csrf-token-12345");
    expect(getCsrfToken()).toBe("test-csrf-token-12345");
  });

  it("handles ApiError class properties correctly", () => {
    const error = new ApiError(409, "Illegal transition", { detail: "Conflict" });
    expect(error.status).toBe(409);
    expect(error.message).toBe("Illegal transition");
    expect(error.data).toEqual({ detail: "Conflict" });
  });

  it("resolves JSON responses cleanly on 200 OK for get, post, put, patch, delete", async () => {
    const mockData = { id: "123", name: "Test Item" };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => mockData,
    });

    const getRes = await api.get<{ id: string; name: string }>("/test", { params: { active: true, page: 1 } });
    expect(getRes).toEqual(mockData);

    setCsrfToken("csrf-token-abc");
    const postRes = await api.post("/test", { title: "New" });
    expect(postRes).toEqual(mockData);

    const putRes = await api.put("/test/123", { title: "Updated" });
    expect(putRes).toEqual(mockData);

    const patchRes = await api.patch("/test/123", { title: "Patched" });
    expect(patchRes).toEqual(mockData);

    const delRes = await api.delete("/test/123");
    expect(delRes).toEqual(mockData);
  });

  it("handles FormData and 204 No Content responses", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      headers: new Headers(),
    });

    const formData = new FormData();
    formData.append("file", "dummy-content");

    const res = await api.post("/upload", formData);
    expect(res).toEqual({});
  });

  it("handles network errors gracefully", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Failed to fetch"));

    await expect(api.get("/network-fail")).rejects.toThrow(ApiError);
  });

  it("handles 429 Rate Limit responses", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({ detail: "Rate limit reached" }),
    });

    await expect(api.get("/throttled")).rejects.toThrow(/Rate limit reached/);
  });

  it("handles non-JSON error responses", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      headers: new Headers({ "content-type": "text/plain" }),
      text: async () => "Internal server error occurred",
    });

    await expect(api.get("/server-error")).rejects.toThrow(/Internal server error occurred/);
  });
});
