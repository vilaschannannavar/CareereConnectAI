"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Sidebar } from "@/components/Sidebar";
import { CapabilityBanner } from "@/components/ui/capability-banner";
import { ShieldCheck, Briefcase } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  // Dedicated standalone shells for public marketing, auth, and privacy pages
  const isPublicMarketing = pathname === "/";
  const isAuthPage =
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password";
  const isPrivacyPage = pathname === "/privacy";

  if (isPublicMarketing || isAuthPage || isPrivacyPage) {
    return (
      <div className="min-h-screen bg-background flex flex-col selection:bg-primary/20 selection:text-primary">
        {children}
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-background text-foreground antialiased selection:bg-primary/20 selection:text-primary">
      {/* Sidebar with desktop collapsible state and mobile top/bottom bars */}
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto pb-16 lg:pb-0">
        {/* Top Persistent Context Bar */}
        <div className="border-b border-border/50 bg-card/60 backdrop-blur-sm px-4 py-2.5 sm:px-6 flex items-center justify-between text-xs text-muted-foreground sticky top-0 z-20">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="font-semibold text-foreground capitalize truncate">
              {pathname.replace("/", "").replace("-", " ") || "Overview"}
            </span>
            <span className="hidden sm:inline text-muted-foreground/40">&bull;</span>
            <span className="hidden sm:inline-flex items-center gap-1 text-success font-medium">
              <ShieldCheck className="h-3.5 w-3.5" /> Zero Scraping Guarantee
            </span>
          </div>

          <div className="flex items-center gap-3">
            <CapabilityBanner compact className="hidden md:flex py-1 px-2.5 text-[11px]" />
          </div>
        </div>

        {/* Page Container */}
        <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto animate-fade-in">
          {children}
        </div>

        {/* Compliant Footer */}
        <footer className="border-t border-border/60 bg-card py-4 px-6 text-center text-xs text-muted-foreground">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <p>
              CareerConnect AI &copy; 2026. Strictly compliant with LinkedIn Terms of Service. Zero scraping.
            </p>
            <div className="flex items-center space-x-4">
              <Link href="/privacy" className="hover:text-foreground transition-colors">
                Privacy Notice
              </Link>
              <Link href="/integrations" className="hover:text-foreground transition-colors">
                Capability Matrix
              </Link>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
