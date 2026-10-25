import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Compass, ArrowLeft, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-[75vh] flex-col items-center justify-center px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-inner mb-6">
        <Compass className="h-8 w-8 animate-pulse-subtle" />
      </div>
      <span className="text-xs font-bold uppercase tracking-wider text-primary">
        404 — Page Not Found
      </span>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
        Lost in Networking Space?
      </h1>
      <p className="mt-3 max-w-md text-sm text-muted-foreground leading-relaxed">
        The destination you are looking for does not exist or may have moved. All your contacts, resumes, and drafted messages remain safe and encrypted.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button asChild variant="default" size="default">
          <Link href="/overview" className="flex items-center gap-2">
            <Home className="h-4 w-4" />
            <span>Return to Dashboard</span>
          </Link>
        </Button>
        <Button asChild variant="outline" size="default">
          <Link href="/" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            <span>Go to Home</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}
