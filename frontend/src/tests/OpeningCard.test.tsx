import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { OpeningCard } from "@/features/openings/components/OpeningCard";

describe("OpeningCard UI Component", () => {
  const mockOpening = {
    id: "op-1",
    user_id: "u-1",
    company: "Google",
    title: "Site Reliability Engineer",
    career_page_url: "https://careers.google.com",
    url: "https://careers.google.com/jobs/123",
    notes: "Core networking team",
    status: "Verified current",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  };

  it("renders role title, company name, and Verified current badge", () => {
    const onDelete = vi.fn();
    render(<OpeningCard opening={mockOpening} onDelete={onDelete} />);

    expect(screen.getByText("Site Reliability Engineer")).toBeDefined();
    expect(screen.getByText("Google")).toBeDefined();
    expect(screen.getByText("Verified current")).toBeDefined();
    expect(screen.getByText("Official Careers")).toBeDefined();
    expect(screen.getByText("Job Posting")).toBeDefined();
  });
});
