import type { Metadata } from "next";
import "./globals.css";
import { CapabilityProvider } from "@/context/CapabilityContext";
import { AuthProvider } from "@/context/AuthContext";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = {
  title: "CareerConnect AI - Safe & Honest LinkedIn Outreach",
  description: "Find recruiters and alumni in your 1st-degree LinkedIn connections, score them, and draft personalized outreach safely.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased font-sans">
        <CapabilityProvider>
          <AuthProvider>
            <AppShell>{children}</AppShell>
          </AuthProvider>
        </CapabilityProvider>
      </body>
    </html>
  );
}
