"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === "/login" || pathname === "/register";

  if (isAuthPage) {
    return <main className="flex-1 min-h-screen">{children}</main>;
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </div>
        <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
          CareerConnect AI &copy; 2026. Strictly compliant with LinkedIn Terms of Service. Zero scraping. User-confirmed outreach.
        </footer>
      </main>
    </div>
  );
}
