"use client";

import React from "react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-3xl font-extrabold text-red-400">System Interruption</h1>
          <p className="text-sm text-slate-300">
            A critical application error occurred. We apologize for the inconvenience.
          </p>
          <button
            onClick={() => reset()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors"
          >
            Reload Application
          </button>
        </div>
      </body>
    </html>
  );
}
