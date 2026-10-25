import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { CapabilityProvider } from "@/context/CapabilityContext";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/components/theme-provider";
import { QueryProvider } from "@/providers/QueryProvider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toast";
import { AppShell } from "@/components/AppShell";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "CareerConnect AI — Privacy-First LinkedIn Networking & Outreach",
    template: "%s | CareerConnect AI",
  },
  description:
    "Empowering job seekers to identify verified recruiters and alumni in their 1st-degree LinkedIn connections, calculate relevance scores, and draft personalized outreach with zero scraping.",
  keywords: [
    "career",
    "networking",
    "linkedin",
    "recruiters",
    "alumni",
    "referrals",
    "job search",
    "privacy-first",
  ],
  authors: [{ name: "CareerConnect AI Team" }],
  creator: "CareerConnect AI",
  metadataBase: new URL("http://localhost:3000"),
  openGraph: {
    title: "CareerConnect AI — Privacy-First LinkedIn Networking & Outreach",
    description:
      "Find recruiters and referrers safely among your own LinkedIn connections. Zero scraping, zero password sharing, user-confirmed delivery.",
    url: "http://localhost:3000",
    siteName: "CareerConnect AI",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "CareerConnect AI Preview",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body className="min-h-screen bg-background font-sans antialiased text-foreground">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <QueryProvider>
            <CapabilityProvider>
              <AuthProvider>
                <TooltipProvider delayDuration={200}>
                  <AppShell>{children}</AppShell>
                  <Toaster richColors position="bottom-right" />
                </TooltipProvider>
              </AuthProvider>
            </CapabilityProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
