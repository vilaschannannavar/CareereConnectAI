"use client";

import React from "react";
import { useCapabilities } from "@/context/CapabilityContext";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HonestButton } from "@/components/ui/honest-button";
import {
  Boxes,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  Lock,
  ExternalLink,
  Info,
  Cpu,
} from "lucide-react";

export default function IntegrationsPage() {
  const { capabilities, isLoading, refreshCapabilities } = useCapabilities();

  const handleConnectLinkedIn = async () => {
    try {
      const res = await fetch("/api/v1/auth/linkedin/authorize");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.detail || "LinkedIn sign-in is not configured or unavailable.");
        return;
      }
      const data = await res.json();
      if (data.authorization_url) {
        window.location.href = data.authorization_url;
      }
    } catch (err: any) {
      alert("Failed to initiate LinkedIn sign-in: " + (err.message || "Unknown error"));
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Integrations & Capability Registry</h1>
        <p className="mt-1 text-sm text-slate-500">
          Single source of truth from backend registry (<code className="bg-slate-100 px-1 py-0.5 rounded text-xs">/api/integrations/capabilities</code>).
          Features comply strictly with LinkedIn policies.
        </p>
      </div>

      {/* Primary Integration: Official LinkedIn */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-lg bg-[#0077B5]/10 text-[#0077B5] flex items-center justify-center font-bold text-lg">
                in
              </div>
              <div>
                <CardTitle className="text-lg">LinkedIn Integration</CardTitle>
                <CardDescription>
                  Official OpenID Connect authentication &amp; data export archive ingestion.
                </CardDescription>
              </div>
            </div>
            {capabilities.linkedin_official_oauth?.enabled ? (
              <Badge variant="success" className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> OAuth Configured
              </Badge>
            ) : (
              <Badge variant="secondary" className="flex items-center gap-1 text-slate-600">
                <Lock className="h-3 w-3" /> OAuth Not Configured
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
              <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                Data Export Ingestion (Primary)
              </h4>
              <p className="text-xs text-slate-600">
                Import your first-degree connections via official <code className="bg-white px-1 py-0.5 rounded border border-slate-200">Connections.csv</code>.
                No password required, completely safe.
              </p>
              <div className="pt-2">
                <Badge variant="success">Available Now</Badge>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
              <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Lock className="h-4 w-4 text-slate-500" />
                Sign In with LinkedIn (OIDC)
              </h4>
              <p className="text-xs text-slate-600">
                Optional authorization-code flow with state &amp; nonce validation.
                Requires developer client credentials in server environment.
              </p>
              <div className="pt-2 flex items-center justify-between">
                <HonestButton
                  capabilityKey="linkedin_official_oauth"
                  size="sm"
                  variant="outline"
                  onClick={handleConnectLinkedIn}
                  type="button"
                >
                  Connect LinkedIn
                </HonestButton>
                <span className="text-[11px] text-slate-500">Optional</span>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-amber-50 p-3.5 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
            <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-950">LinkedIn Compliance Guarantee</p>
              <p className="mt-0.5 text-amber-800">
                We never ask for your LinkedIn password. Automated web scraping and unauthorized bot messaging are strictly prohibited.
                Outreach messages are copied to your clipboard so that you review and send them yourself on LinkedIn.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Live Capability Matrix Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">System Capability Registry</CardTitle>
          <CardDescription>
            Live capability states as served by the backend API. Controls throughout the app strictly inherit these rules.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="p-8 text-center text-slate-500">Loading capability registry...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Capability Key</th>
                    <th className="py-3 px-4">Feature Name</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Operational Policy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {Object.entries(capabilities).map(([key, item]) => (
                    <tr key={key} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-mono text-xs text-slate-600">{item.key}</td>
                      <td className="py-3 px-4 font-medium text-slate-900">{item.label}</td>
                      <td className="py-3 px-4">
                        {item.enabled ? (
                          <Badge variant="success" className="text-[11px]">
                            Enabled
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[11px] text-slate-600">
                            Disabled
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-500">
                        {item.disabled_reason ? (
                          <span className="text-amber-700">{item.disabled_reason}</span>
                        ) : (
                          <span className="text-emerald-700">Active and compliant</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
