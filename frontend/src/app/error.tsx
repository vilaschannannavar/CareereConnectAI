"use client";

import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application route error caught:", error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center p-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive mb-4 shadow-sm">
        <AlertTriangle className="h-7 w-7" />
      </div>
      <h2 className="text-2xl font-bold tracking-tight text-foreground">
        Something went wrong
      </h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        {error.message || "An unexpected error occurred while processing your request. Your data remains secure."}
      </p>
      <div className="mt-6 flex items-center gap-3">
        <Button onClick={() => reset()} variant="default" className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          <span>Try Again</span>
        </Button>
        <Button asChild variant="outline">
          <Link href="/overview" className="flex items-center gap-2">
            <Home className="h-4 w-4" />
            <span>Overview</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}
