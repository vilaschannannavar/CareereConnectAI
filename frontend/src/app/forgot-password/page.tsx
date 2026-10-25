"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KeyRound, ArrowLeft, Mail, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/v1/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();
      setSubmitted(true);
      toast.success(data.message || "Password reset instructions sent.");
    } catch {
      toast.error("Failed to request password reset.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/20">
      <Card className="w-full max-w-md border-border shadow-lg">
        <CardHeader className="text-center space-y-2">
          <div className="p-3 bg-primary/10 text-primary rounded-full w-fit mx-auto">
            <KeyRound className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl">Reset Your Password</CardTitle>
          <CardDescription>
            Enter your registered email address and we will send you a secure link to reset your credentials.
          </CardDescription>
        </CardHeader>

        {submitted ? (
          <CardContent className="space-y-4 text-center">
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-2 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-8 w-8 mx-auto" />
              <p className="text-sm font-semibold">Request Received</p>
              <p className="text-xs text-muted-foreground">
                If an account exists for <strong className="text-foreground">{email}</strong>, a reset link has been dispatched. Links expire in 1 hour.
              </p>
            </div>
            <Button asChild variant="outline" className="w-full">
              <Link href="/login">Return to Login</Link>
            </Button>
          </CardContent>
        ) : (
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  Email Address
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                />
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-3 pt-2">
              <Button type="submit" disabled={isSubmitting} className="w-full gap-2">
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Sending Reset Link...</span>
                  </>
                ) : (
                  <span>Send Reset Link</span>
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
    </div>
  );
}
