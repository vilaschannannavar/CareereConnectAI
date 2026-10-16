import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Sidebar, NAV_ITEMS } from "@/components/Sidebar";
import * as AuthContext from "@/context/AuthContext";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: () => "/overview",
}));

describe("Sidebar Navigation Component", () => {
  it("renders all 7 application navigation links with correct labels", () => {
    vi.spyOn(AuthContext, "useAuth").mockReturnValue({
      user: {
        id: "user-1",
        email: "student@example.edu",
        full_name: "Test Student",
        is_active: true,
        created_at: "2026-10-13T00:00:00Z",
      },
      isAuthenticated: true,
      isLoading: false,
      error: null,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      checkSession: vi.fn(),
    });

    render(<Sidebar />);

    expect(NAV_ITEMS).toHaveLength(7);

    // Verify all 7 links are present in DOM
    expect(screen.getByRole("link", { name: /overview/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /connections/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /shortlist/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /message studio/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /outreach tracker/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /integrations/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /settings & privacy/i })).toBeInTheDocument();

    // Verify Overview is active
    const overviewLink = screen.getByRole("link", { name: /overview/i });
    expect(overviewLink).toHaveAttribute("aria-current", "page");
  });
});
