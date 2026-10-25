"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/v1/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, new_password: password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Failed to reset password.");
      }

      setResetSuccess(true);
      toast.success("Password reset successfully! Please log in.");
      setTimeout(() => router.push("/login"), 3000);
    } catch (err: any) {
      toast.error(err.message || "Failed to reset password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!token) {
    return (
      <Card className="w-full max-w-md border-border shadow-lg p-6 text-center space-y-4">
        <p className="text-sm text-destructive font-medium">Invalid or missing reset token.</p>
        <Button asChild variant="outline">
          <Link href="/forgot-password">Request New Reset Link</Link>
        </Button>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md border-border shadow-lg">
      <CardHeader className="text-center space-y-2">
        <div className="p-3 bg-primary/10 text-primary rounded-full w-fit mx-auto">
          <Lock className="h-6 w-6" />
        </div>
        <CardTitle className="text-xl">Set New Password</CardTitle>
        <CardDescription>
          Choose a strong password with at least 8 characters.
        </CardDescription>
      </CardHeader>

      {resetSuccess ? (
        <CardContent className="space-y-4 text-center">
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-2 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-8 w-8 mx-auto" />
            <p className="text-sm font-semibold">Password Reset Complete</p>
            <p className="text-xs text-muted-foreground">
              Your password has been securely updated. Redirecting you to login...
            </p>
          </div>
          <Button asChild className="w-full">
            <Link href="/login">Go to Login</Link>
          </Button>
        </CardContent>
      ) : (
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">New Password</label>
              <Input
                id="newPassword"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Confirm New Password</label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                required
              />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-3 pt-2">
            <Button type="submit" disabled={isSubmitting} className="w-full gap-2">
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Updating Password...</span>
                </>
              ) : (
                <span>Confirm New Password</span>
              )}
            </Button>

            <Link
              href="/login"
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mx-auto"
            >
              <ArrowLeft className="h-3 w-3" /> Back to Login
            </Link>
          </CardFooter>
        </form>
      )}
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/20">
      <Suspense fallback={<div className="text-xs text-muted-foreground">Loading...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
