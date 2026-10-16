"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { HonestButton } from "@/components/ui/honest-button";
import { AlertCircle, Lock, Mail } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
      router.push("/");
    } catch (err: any) {
      setError(err.message || "Failed to sign in. Please verify your email and password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLinkedInSignIn = async () => {
    try {
      setError(null);
      const res = await fetch("/api/v1/auth/linkedin/authorize");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "LinkedIn sign-in is currently unavailable.");
      }
      const data = await res.json();
      if (data.authorization_url) {
        window.location.href = data.authorization_url;
      }
    } catch (err: any) {
      setError(err.message || "Failed to initiate LinkedIn sign-in.");
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md shadow-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">Sign In</CardTitle>
          <CardDescription>
            Enter your email and password to access CareerConnect AI.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700 border border-red-200 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="email">
                Email Address
              </label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  required
                  placeholder="student@example.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                />
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9"
                />
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Signing In..." : "Sign In with Email"}
            </Button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-slate-500">Other Sign-in Methods</span>
              </div>
            </div>

            <div className="mt-4 flex justify-center">
              {/* Honest button checking capability registry for linkedin oauth */}
              <HonestButton
                capabilityKey="linkedin_official_oauth"
                variant="outline"
                className="w-full"
                onClick={handleLinkedInSignIn}
                type="button"
              >
                Sign in with LinkedIn
              </HonestButton>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center border-t border-slate-100 pt-4 text-sm text-slate-600">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="ml-1 font-semibold text-blue-600 hover:underline">
            Register here
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
