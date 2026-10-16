"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { apiClient } from "@/lib/api";

export interface CapabilityItem {
  key: string;
  enabled: boolean;
  label: string;
  description: string;
  disabled_reason?: string | null;
  documentation_url?: string | null;
}

interface CapabilityContextType {
  capabilities: Record<string, CapabilityItem>;
  isLoading: boolean;
  error: string | null;
  isCapabilityEnabled: (key: string) => boolean;
  getDisabledReason: (key: string) => string | undefined;
  getCapability: (key: string) => CapabilityItem | undefined;
  refreshCapabilities: () => Promise<void>;
}

const CapabilityContext = createContext<CapabilityContextType | undefined>(undefined);

export function CapabilityProvider({ children }: { children: React.ReactNode }) {
  const [capabilities, setCapabilities] = useState<Record<string, CapabilityItem>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCapabilities = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await apiClient<{ capabilities: Record<string, CapabilityItem> }>("/api/integrations/capabilities");
      setCapabilities(res.capabilities || {});
    } catch (err: any) {
      console.error("Failed to load platform capability registry:", err);
      setError("Unable to connect to capability registry");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCapabilities();
  }, []);

  const isCapabilityEnabled = (key: string): boolean => {
    return !!capabilities[key]?.enabled;
  };

  const getDisabledReason = (key: string): string | undefined => {
    return capabilities[key]?.disabled_reason || undefined;
  };

  const getCapability = (key: string): CapabilityItem | undefined => {
    return capabilities[key];
  };

  return (
    <CapabilityContext.Provider
      value={{
        capabilities,
        isLoading,
        error,
        isCapabilityEnabled,
        getDisabledReason,
        getCapability,
        refreshCapabilities: fetchCapabilities,
      }}
    >
      {children}
    </CapabilityContext.Provider>
  );
}

export function useCapabilities() {
  const context = useContext(CapabilityContext);
  if (!context) {
    throw new Error("useCapabilities must be used within a CapabilityProvider");
  }
  return context;
}
