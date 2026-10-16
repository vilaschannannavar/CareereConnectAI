import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { HonestButton } from "@/components/ui/honest-button";
import * as CapabilityContext from "@/context/CapabilityContext";

describe("HonestButton Component", () => {
  it("renders enabled button when capability is enabled in registry", () => {
    vi.spyOn(CapabilityContext, "useCapabilities").mockReturnValue({
      capabilities: {
        linkedin_csv_import: {
          key: "linkedin_csv_import",
          enabled: true,
          label: "LinkedIn Data Export (CSV)",
          description: "Import connections from CSV",
        },
      },
      isLoading: false,
      error: null,
      isCapabilityEnabled: (key: string) => key === "linkedin_csv_import",
      getDisabledReason: () => undefined,
      getCapability: () => undefined,
      refreshCapabilities: vi.fn(),
    });

    render(
      <HonestButton capabilityKey="linkedin_csv_import">
        Import CSV
      </HonestButton>
    );

    const button = screen.getByRole("button", { name: /import csv/i });
    expect(button).not.toBeDisabled();
  });

  it("renders disabled button with lock icon when capability is disabled", () => {
    vi.spyOn(CapabilityContext, "useCapabilities").mockReturnValue({
      capabilities: {
        direct_linkedin_messaging: {
          key: "direct_linkedin_messaging",
          enabled: false,
          label: "Direct LinkedIn Messaging",
          description: "Automated direct messages",
          disabled_reason: "Automated direct messaging requires LinkedIn Enterprise Partner API approval.",
        },
      },
      isLoading: false,
      error: null,
      isCapabilityEnabled: () => false,
      getDisabledReason: (key: string) =>
        key === "direct_linkedin_messaging"
          ? "Automated direct messaging requires LinkedIn Enterprise Partner API approval."
          : undefined,
      getCapability: () => undefined,
      refreshCapabilities: vi.fn(),
    });

    render(
      <HonestButton capabilityKey="direct_linkedin_messaging">
        Send Direct Message
      </HonestButton>
    );

    const button = screen.getByRole("button", { name: /send direct message/i });
    expect(button).toBeDisabled();

    // Hover on the wrapper reveals honest explanation tooltip
    const wrapper = screen.getByTestId("honest-button-wrapper");
    fireEvent.mouseEnter(wrapper);

    expect(
      screen.getByText(/automated direct messaging requires linkedin enterprise partner api approval/i)
    ).toBeInTheDocument();
  });
});
